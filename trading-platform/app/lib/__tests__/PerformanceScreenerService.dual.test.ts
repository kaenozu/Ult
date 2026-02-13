
import { PerformanceScreenerService } from '../PerformanceScreenerService';
import { consensusSignalService } from '../ConsensusSignalService';
import { mlPredictionService } from '../mlPrediction';
import { optimizedAccuracyService } from '../OptimizedAccuracyService';

// Mock dependencies
jest.mock('../ConsensusSignalService');
jest.mock('../mlPrediction');
jest.mock('../OptimizedAccuracyService');

describe('PerformanceScreenerService - Dual Match Signal Logic', () => {
    let service: PerformanceScreenerService;

    beforeEach(() => {
        service = new PerformanceScreenerService();
        jest.clearAllMocks();
    });

    const mockDataSource = {
        symbol: '7013',
        name: 'IHI',
        market: 'japan' as const,
        fetchData: jest.fn().mockResolvedValue(Array(100).fill({ close: 1000, volume: 1000 })),
    };

    const mockBacktestResult = {
        winRate: 60,
        profitFactor: 2.0,
        totalTrades: 10,
        sharpeRatio: 1.5,
        maxDrawdown: 10,
        totalReturn: 20,
        startDate: '2023-01-01',
        endDate: '2023-12-31'
    };

    it('should override Weak Consensus SELL with High Confidence ML BUY', async () => {
        // 1. Mock Backtest to pass performance filter
        (optimizedAccuracyService.runOptimizedBacktest as jest.Mock).mockResolvedValue(mockBacktestResult);

        // 2. Mock Consensus as Weak SELL (e.g. 45% confidence)
        (consensusSignalService.generateEnhancedConsensus as jest.Mock).mockResolvedValue({
            type: 'SELL',
            confidence: 45,
            reason: 'Technical Bearish'
        });

        // 3. Mock ML as Strong BUY (e.g. 65% confidence)
        (mlPredictionService.predictAsync as jest.Mock).mockResolvedValue(0.05); // +5% predicted change
        (mlPredictionService.calculateIndicators as jest.Mock).mockReturnValue({});
        (mlPredictionService.generateSignal as jest.Mock).mockReturnValue({
            type: 'BUY',
            confidence: 65,
            predictedChange: 5.0,
            targetPrice: 1050,
            forecastCone: {}
        });

        // 4. Run scanDual
        const result = await service.scanDual([mockDataSource]);

        // 5. Verification
        expect(result.aiSignals.results.length).toBeGreaterThan(0);
        const signal = result.aiSignals.results[0];

        // Expect BUY signal due to override
        expect(signal.signalType).toBe('BUY');
        // Expect confidence to be penalized (65 * 0.85 = 55.25)
        expect(signal.confidence).toBeCloseTo(55.25, 1);
        expect(signal.reason).toContain('AI逆張り');
    });

    it('should apply tiered penalty for low trade counts', async () => {
        // 5 trades: Score * 0.7
        (optimizedAccuracyService.runOptimizedBacktest as jest.Mock).mockResolvedValue({
            ...mockBacktestResult,
            totalTrades: 5,
            winRate: 100, // Perfect score base
            profitFactor: 2.0,
            sharpeRatio: 2.0,
            maxDrawdown: 0
        });

        (consensusSignalService.generateEnhancedConsensus as jest.Mock).mockResolvedValue({
            type: 'BUY',
            confidence: 60,
            reason: 'Technical'
        });

        (mlPredictionService.generateSignal as jest.Mock).mockReturnValue({
            type: 'BUY',
            confidence: 60,
            predictedChange: 5.0
        });

        const result = await service.scanDual([mockDataSource]);
        const performance = result.performance.results[0];

        // Base score would be 100. Reduced by 30% -> 70.
        expect(performance.performanceScore).toBeCloseTo(70, 1);
    });

    it('should use ATR for targetPrice when ML signal is omitted or different', async () => {
        (optimizedAccuracyService.runOptimizedBacktest as jest.Mock).mockResolvedValue(mockBacktestResult);
        (consensusSignalService.generateEnhancedConsensus as jest.Mock).mockResolvedValue({
            type: 'BUY',
            confidence: 60,
            reason: 'Technical'
        });

        // ML is SELL, so override doesn't trigger, final is BUY from Consensus
        (mlPredictionService.generateSignal as jest.Mock).mockReturnValue({
            type: 'SELL',
            confidence: 40,
            predictedChange: -2.0
        });

        // Mock technicalIndicatorService.calculateATR
        const { technicalIndicatorService } = require('../TechnicalIndicatorService');
        jest.spyOn(technicalIndicatorService, 'calculateATR').mockReturnValue([10, 10, 10]);

        const result = await service.scanDual([mockDataSource]);
        const aiResult = result.aiSignals.results[0];

        // finalType is BUY (from Consensus), ML predicted SELL.
        // So targetPrice should be currentPrice (1000) + (ATR (10) * 2) = 1020
        expect(aiResult.targetPrice).toBe(1020);
    });

    it('should restrict dualMatches to BUY signals only', async () => {
        (optimizedAccuracyService.runOptimizedBacktest as jest.Mock).mockResolvedValue(mockBacktestResult);

        // Both are SELL -> Should NOT be in dualMatches despite high confidence
        (consensusSignalService.generateEnhancedConsensus as jest.Mock).mockResolvedValue({
            type: 'SELL',
            confidence: 80,
            reason: 'Technical'
        });
        (mlPredictionService.generateSignal as jest.Mock).mockReturnValue({
            type: 'SELL',
            confidence: 80,
            predictedChange: -5.0
        });

        const result = await service.scanDual([mockDataSource]);
        expect(result.dualMatches.length).toBe(0);
    });

    it('should NOT override Strong Consensus SELL', async () => {
        (optimizedAccuracyService.runOptimizedBacktest as jest.Mock).mockResolvedValue(mockBacktestResult);

        // Strong SELL
        (consensusSignalService.generateEnhancedConsensus as jest.Mock).mockResolvedValue({
            type: 'SELL',
            confidence: 80,
            reason: 'Strong Bearish'
        });

        // Strong ML BUY
        (mlPredictionService.predictAsync as jest.Mock).mockResolvedValue(0.05);
        (mlPredictionService.calculateIndicators as jest.Mock).mockReturnValue({});
        (mlPredictionService.generateSignal as jest.Mock).mockReturnValue({
            type: 'BUY',
            confidence: 65,
            predictedChange: 5.0
        });

        const result = await service.scanDual([mockDataSource]);

        // Expect SELL to persist (no override)
        // AI Screener might filter it out if minConfidence is high, or return SELL
        // Let's check what it returns. If minConfidence=30 (default), it returns SELL.
        if (result.aiSignals.results.length > 0) {
            expect(result.aiSignals.results[0].signalType).toBe('SELL');
        }
    });
});
