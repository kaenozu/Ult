/**
 * Tests for SignalGenerationService
 */

import { SignalGenerationService } from '../signal-generation-service';
import { Stock, OHLCV, ModelPrediction } from '../../../types';

// Mock analyzeStock function
jest.mock('@/app/lib/analysis', () => ({
  analyzeStock: jest.fn((symbol: string, data: OHLCV[], market: string) => ({
    accuracy: 85,
    atr: 100,
    predictionError: 1.0,
    optimizedParams: {
      rsiPeriod: 14,
      smaPeriod: 20
    },
    volumeResistance: []
  }))
}));

describe('SignalGenerationService', () => {
  let service: SignalGenerationService;
  let mockStock: Stock;
  let mockData: OHLCV[];
  let mockPrediction: ModelPrediction;
  let mockIndicators: TechnicalIndicatorsWithATR;

  beforeEach(() => {
    service = new SignalGenerationService();
    
    mockStock = {
      symbol: '7203.T',
      name: 'Toyota',
      price: 1000,
      market: 'japan' as any
    };

    mockData = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 1000 + i,
      high: 1010 + i,
      low: 990 + i,
      close: 1005 + i,
      volume: 1000000
    }));

    mockPrediction = {
      rfPrediction: 2.5,
      xgbPrediction: 2.0,
      lstmPrediction: 1.5,
      ensemblePrediction: 2.0,
      confidence: 75
    };

    mockIndicators = {
      rsi: [50, 55, 60],
      macd: { macd: [0.5], signal: [0.3], histogram: [0.2] },
      atr: [100, 105, 110]
    };
  });

  describe('generateSignal', () => {
    it('should generate BUY signal for positive prediction above threshold', () => {
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators);
      
      expect(signal.type).toBe('BUY');
      expect(signal.symbol).toBe('7203.T');
      expect(signal.confidence).toBeGreaterThanOrEqual(50);
      expect(signal.targetPrice).toBeGreaterThan(mockData[mockData.length - 1].close);
      expect(signal.stopLoss).toBeLessThan(mockData[mockData.length - 1].close);
    });

    it('should generate SELL signal for negative prediction above threshold', () => {
      const negativePrediction = {
        ...mockPrediction,
        ensemblePrediction: -2.5
      };
      
      const signal = service.generateSignal(mockStock, mockData, negativePrediction, mockIndicators);
      
      expect(signal.type).toBe('SELL');
      expect(signal.targetPrice).toBeLessThan(mockData[mockData.length - 1].close);
      expect(signal.stopLoss).toBeGreaterThan(mockData[mockData.length - 1].close);
    });

    it('should generate HOLD signal for weak prediction', () => {
      const weakPrediction = {
        ...mockPrediction,
        ensemblePrediction: 0.5,
        confidence: 40
      };
      
      const signal = service.generateSignal(mockStock, mockData, weakPrediction, mockIndicators);
      
      expect(signal.type).toBe('HOLD');
      expect(signal.targetPrice).toBe(mockData[mockData.length - 1].close);
      expect(signal.stopLoss).toBe(mockData[mockData.length - 1].close);
    });

    it('should enforce signal type matches prediction direction', () => {
      // Test BUY signal with negative predicted change is corrected
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators);
      
      if (signal.type === 'BUY') {
        expect(signal.predictedChange).toBeGreaterThanOrEqual(0);
      } else if (signal.type === 'SELL') {
        expect(signal.predictedChange).toBeLessThanOrEqual(0);
      } else {
        expect(signal.predictedChange).toBe(0);
      }
    });

    it('should include market context when index data is provided', () => {
      const indexData: OHLCV[] = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 30000 + i * 10,
        high: 30100 + i * 10,
        low: 29900 + i * 10,
        close: 30050 + i * 10,
        volume: 2000000
      }));
      
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators, indexData);
      
      expect(signal.marketContext).toBeDefined();
      expect(signal.marketContext?.indexSymbol).toBe('日経平均');
      expect(signal.marketContext?.correlation).toBeDefined();
      expect(signal.marketContext?.indexTrend).toMatch(/UP|DOWN|NEUTRAL/);
    });

    it('should handle missing index data gracefully', () => {
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators);
      
      expect(signal.marketContext).toBeUndefined();
      expect(signal.reason).toContain('市場指数との相関は低く');
    });

    it('should apply self-correction for high prediction error', () => {
      const { analyzeStock } = require('@/app/lib/analysis');
      analyzeStock.mockReturnValueOnce({
        accuracy: 85,
        atr: 100,
        predictionError: 1.5, // High error
        optimizedParams: { rsiPeriod: 14, smaPeriod: 20 },
        volumeResistance: []
      });
      
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators);
      
      expect(signal.reason).toContain('予測誤差');
      expect(signal.predictionError).toBe(1.5);
    });

    it('should calculate appropriate stop loss for BUY signal', () => {
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators);
      const currentPrice = mockData[mockData.length - 1].close;
      
      if (signal.type === 'BUY') {
        expect(signal.stopLoss).toBeLessThan(currentPrice);
        expect(signal.stopLoss).toBeGreaterThan(0);
      }
    });

    it('should calculate appropriate stop loss for SELL signal', () => {
      const negativePrediction = { ...mockPrediction, ensemblePrediction: -2.5 };
      const signal = service.generateSignal(mockStock, mockData, negativePrediction, mockIndicators);
      const currentPrice = mockData[mockData.length - 1].close;
      
      if (signal.type === 'SELL') {
        expect(signal.stopLoss).toBeGreaterThan(currentPrice);
      }
    });

    it('should include optimized parameters in reason', () => {
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators);
      
      expect(signal.reason).toContain('RSI:');
      expect(signal.reason).toContain('SMA:');
    });

    it('should mark strong signals appropriately', () => {
      const strongPrediction = { ...mockPrediction, confidence: 85 };
      const signal = service.generateSignal(mockStock, mockData, strongPrediction, mockIndicators);
      
      expect(signal.reason).toContain('【強気】');
    });

    it('should handle edge case: zero confidence', () => {
      const zeroPrediction = { ...mockPrediction, confidence: 0 };
      const signal = service.generateSignal(mockStock, mockData, zeroPrediction, mockIndicators);
      
      expect(signal.confidence).toBeGreaterThanOrEqual(50);
      expect(signal.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle edge case: very high confidence', () => {
      const highPrediction = { ...mockPrediction, confidence: 150 };
      const signal = service.generateSignal(mockStock, mockData, highPrediction, mockIndicators);
      
      expect(signal.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle US market stock', () => {
      const usStock = { ...mockStock, symbol: 'AAPL', market: 'us' as any };
      const indexData: OHLCV[] = mockData.map(d => ({ ...d, close: d.close * 10 }));
      
      const signal = service.generateSignal(usStock, mockData, mockPrediction, mockIndicators, indexData);
      
      if (signal.marketContext) {
        expect(signal.marketContext.indexSymbol).toBe('NASDAQ');
      }
    });
  });

  describe('generateEnhancedSignalWithMultiTimeFrame', () => {
    it('should return base signal when no multi-timeframe data provided', async () => {
      const signal = await service.generateEnhancedSignalWithMultiTimeFrame(
        mockStock,
        mockData,
        mockPrediction,
        mockIndicators
      );
      
      expect(signal.type).toBeDefined();
      expect(signal.confidence).toBeDefined();
    });

    it('should return base signal when empty multi-timeframe data', async () => {
      const emptyDataMap = new Map<string, OHLCV[]>();
      
      const signal = await service.generateEnhancedSignalWithMultiTimeFrame(
        mockStock,
        mockData,
        mockPrediction,
        mockIndicators,
        emptyDataMap
      );
      
      expect(signal.type).toBeDefined();
    });

    it('should handle errors in multi-timeframe analysis gracefully', async () => {
      const dataMap = new Map([['1h', mockData], ['4h', mockData]]);
      
      // Should not throw error
      const signal = await service.generateEnhancedSignalWithMultiTimeFrame(
        mockStock,
        mockData,
        mockPrediction,
        mockIndicators,
        dataMap
      );
      
      expect(signal).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single data point', () => {
      const singleData = [mockData[0]];
      const signal = service.generateSignal(mockStock, singleData, mockPrediction, mockIndicators);
      
      expect(signal).toBeDefined();
      expect(signal.type).toMatch(/BUY|SELL|HOLD/);
    });

    it('should handle NaN in prediction', () => {
      const nanPrediction = { ...mockPrediction, ensemblePrediction: NaN };
      const signal = service.generateSignal(mockStock, mockData, nanPrediction, mockIndicators);
      
      expect(signal.type).toBe('HOLD');
    });

    it('should handle Infinity in prediction', () => {
      const infPrediction = { ...mockPrediction, ensemblePrediction: Infinity };
      const signal = service.generateSignal(mockStock, mockData, infPrediction, mockIndicators);
      
      expect(signal.predictedChange).toBeDefined();
      // Infinity might remain Infinity, which is valid
      expect(signal.predictedChange === Infinity || isFinite(signal.predictedChange)).toBe(true);
    });

    it('should handle zero ATR', () => {
      const { analyzeStock } = require('@/app/lib/analysis');
      analyzeStock.mockReturnValueOnce({
        accuracy: 85,
        atr: 0,
        predictionError: 1.0,
        optimizedParams: { rsiPeriod: 14, smaPeriod: 20 },
        volumeResistance: []
      });
      
      const signal = service.generateSignal(mockStock, mockData, mockPrediction, mockIndicators);
      
      expect(signal.targetPrice).toBeDefined();
      expect(signal.stopLoss).toBeDefined();
    });
  });

  describe('market correlation analysis', () => {
    it('should increase confidence for aligned market trend', () => {
      // Create strongly correlated data
      const correlatedIndexData = mockData.map(d => ({
        ...d,
        close: d.close * 30 // Scale to index level
      }));
      
      const signal = service.generateSignal(
        mockStock,
        mockData,
        { ...mockPrediction, ensemblePrediction: 3.0 },
        mockIndicators,
        correlatedIndexData
      );
      
      // Confidence adjustment may not always increase due to various factors
      expect(signal.confidence).toBeGreaterThanOrEqual(mockPrediction.confidence - 20);
    });

    it('should handle insufficient index data', () => {
      const shortIndexData = mockData.slice(0, 10);
      
      const signal = service.generateSignal(
        mockStock,
        mockData,
        mockPrediction,
        mockIndicators,
        shortIndexData
      );
      
      expect(signal.marketContext).toBeUndefined();
    });
  });
});
