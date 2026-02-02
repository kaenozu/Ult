/**
 * OverfittingDetector.test.ts
 * 
 * Tests for overfitting detection functionality
 */

import { OverfittingDetector, ComplexityMetrics } from '../OverfittingDetector';
import { BacktestResult, BacktestConfig } from '../AdvancedBacktestEngine';
import { WalkForwardResult } from '../../optimization/types';

describe('OverfittingDetector', () => {
  let detector: OverfittingDetector;

  beforeEach(() => {
    detector = new OverfittingDetector();
  });

  describe('Performance Degradation Detection', () => {
    it('should detect severe degradation when out-of-sample is negative', () => {
      const inSample = createMockResult(50, 2.0); // 50% return, 2.0 Sharpe
      const outOfSample = createMockResult(-10, -0.5); // -10% return, negative Sharpe

      const analysis = detector.analyze(inSample, outOfSample);

      expect(analysis.overfit).toBe(true);
      expect(analysis.overfittingScore).toBeGreaterThan(0.5);
      expect(analysis.indicators.performanceDegradation).toBeGreaterThan(0.7);
    });

    it('should detect moderate degradation with positive but reduced performance', () => {
      const inSample = createMockResult(40, 2.5);
      const outOfSample = createMockResult(10, 1.0); // 75% reduction

      const analysis = detector.analyze(inSample, outOfSample);

      expect(analysis.indicators.performanceDegradation).toBeGreaterThan(0);
      expect(analysis.indicators.performanceDegradation).toBeLessThanOrEqual(1);
    });

    it('should not flag as overfitting when performance is consistent', () => {
      const inSample = createMockResult(25, 1.8);
      const outOfSample = createMockResult(22, 1.7); // Similar performance

      const analysis = detector.analyze(inSample, outOfSample);

      expect(analysis.overfit).toBe(false);
      expect(analysis.overfittingScore).toBeLessThan(0.5);
      expect(analysis.indicators.performanceDegradation).toBeLessThan(0.3);
    });
  });

  describe('Sharpe Ratio Drop Detection', () => {
    it('should detect significant Sharpe ratio drop', () => {
      const inSample = createMockResult(30, 3.0);
      const outOfSample = createMockResult(15, 0.5); // Sharpe drops from 3.0 to 0.5

      const analysis = detector.analyze(inSample, outOfSample);

      expect(analysis.indicators.sharpeRatioDrop).toBeGreaterThan(0.5);
    });

    it('should handle negative in-sample Sharpe gracefully', () => {
      const inSample = createMockResult(-5, -0.5);
      const outOfSample = createMockResult(-8, -1.0);

      const analysis = detector.analyze(inSample, outOfSample);

      // Should not flag Sharpe drop if already negative
      expect(analysis.indicators.sharpeRatioDrop).toBe(0);
    });
  });

  describe('Parameter Stability Assessment', () => {
    it('should penalize high parameter count with poor performance', () => {
      const inSample = createMockResult(50, 2.5);
      const outOfSample = createMockResult(5, 0.3);
      
      const manyParameters: Record<string, number | string> = {};
      for (let i = 0; i < 15; i++) {
        manyParameters[`param${i}`] = i;
      }

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        undefined,
        manyParameters
      );

      expect(analysis.indicators.parameterInstability).toBeGreaterThan(0.5);
    });

    it('should not heavily penalize few parameters', () => {
      const inSample = createMockResult(30, 2.0);
      const outOfSample = createMockResult(25, 1.8);
      
      const fewParameters = {
        param1: 10,
        param2: 20,
      };

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        undefined,
        fewParameters
      );

      expect(analysis.indicators.parameterInstability).toBeLessThan(0.3);
    });
  });

  describe('Complexity Penalty', () => {
    it('should penalize excessive trading', () => {
      const inSample = createMockResult(30, 2.0);
      const outOfSample = createMockResult(10, 0.8);
      
      const complexity: ComplexityMetrics = {
        numParameters: 12,
        numTrades: 500,
        avgHoldingPeriod: 1.5,
        turnoverRatio: 6.0, // Very high turnover
        complexityScore: 0.8,
      };

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        undefined,
        undefined,
        complexity
      );

      expect(analysis.indicators.complexityPenalty).toBeGreaterThan(0.5);
    });

    it('should not penalize reasonable complexity', () => {
      const inSample = createMockResult(25, 1.8);
      const outOfSample = createMockResult(22, 1.6);
      
      const complexity: ComplexityMetrics = {
        numParameters: 5,
        numTrades: 50,
        avgHoldingPeriod: 10,
        turnoverRatio: 1.5,
        complexityScore: 0.3,
      };

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        undefined,
        undefined,
        complexity
      );

      expect(analysis.indicators.complexityPenalty).toBeLessThan(0.3);
    });
  });

  describe('Walk-Forward Consistency', () => {
    it('should detect good consistency across periods', () => {
      const inSample = createMockResult(25, 1.8);
      const outOfSample = createMockResult(22, 1.7);
      
      const walkForward: WalkForwardResult[] = [
        { period: 0, trainStart: '2020-01-01', trainEnd: '2020-06-30', testStart: '2020-07-01', testEnd: '2020-12-31', trainScore: 1.8, testScore: 1.7, parameters: {}, degradation: 0.056 },
        { period: 1, trainStart: '2020-07-01', trainEnd: '2020-12-31', testStart: '2021-01-01', testEnd: '2021-06-30', trainScore: 2.0, testScore: 1.9, parameters: {}, degradation: 0.05 },
        { period: 2, trainStart: '2021-01-01', trainEnd: '2021-06-30', testStart: '2021-07-01', testEnd: '2021-12-31', trainScore: 1.9, testScore: 1.8, parameters: {}, degradation: 0.053 },
        { period: 3, trainStart: '2021-07-01', trainEnd: '2021-12-31', testStart: '2022-01-01', testEnd: '2022-06-30', trainScore: 2.1, testScore: 2.0, parameters: {}, degradation: 0.048 },
        { period: 4, trainStart: '2022-01-01', trainEnd: '2022-06-30', testStart: '2022-07-01', testEnd: '2022-12-31', trainScore: 1.8, testScore: 1.7, parameters: {}, degradation: 0.056 },
      ];

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        walkForward
      );

      expect(analysis.indicators.walkForwardConsistency).toBeGreaterThan(0.7);
    });

    it('should detect poor consistency with mixed results', () => {
      const inSample = createMockResult(40, 2.5);
      const outOfSample = createMockResult(10, 0.8);
      
      const walkForward: WalkForwardResult[] = [
        { period: 0, trainStart: '2020-01-01', trainEnd: '2020-06-30', testStart: '2020-07-01', testEnd: '2020-12-31', trainScore: 2.5, testScore: 2.0, parameters: {}, degradation: 0.2 },
        { period: 1, trainStart: '2020-07-01', trainEnd: '2020-12-31', testStart: '2021-01-01', testEnd: '2021-06-30', trainScore: 2.3, testScore: -0.5, parameters: {}, degradation: 1.2 },
        { period: 2, trainStart: '2021-01-01', trainEnd: '2021-06-30', testStart: '2021-07-01', testEnd: '2021-12-31', trainScore: 2.8, testScore: 1.5, parameters: {}, degradation: 0.46 },
        { period: 3, trainStart: '2021-07-01', trainEnd: '2021-12-31', testStart: '2022-01-01', testEnd: '2022-06-30', trainScore: 2.0, testScore: -1.0, parameters: {}, degradation: 1.5 },
      ];

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        walkForward
      );

      expect(analysis.indicators.walkForwardConsistency).toBeLessThan(0.5);
    });
  });

  describe('Comprehensive Analysis', () => {
    it('should provide recommendations for overfitted strategy', () => {
      const inSample = createMockResult(60, 3.5);
      const outOfSample = createMockResult(-5, -0.3);
      
      const parameters: Record<string, number> = {};
      for (let i = 0; i < 20; i++) {
        parameters[`param${i}`] = i;
      }

      const complexity: ComplexityMetrics = {
        numParameters: 20,
        numTrades: 800,
        avgHoldingPeriod: 1,
        turnoverRatio: 8.0,
        complexityScore: 0.9,
      };

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        undefined,
        parameters,
        complexity
      );

      expect(analysis.overfit).toBe(true);
      expect(analysis.warnings.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations.some(r => r.includes('Simplify'))).toBe(true);
    });

    it('should provide positive feedback for robust strategy', () => {
      const inSample = createMockResult(20, 1.5);
      const outOfSample = createMockResult(18, 1.4);
      
      const parameters = {
        param1: 10,
        param2: 20,
      };

      const complexity: ComplexityMetrics = {
        numParameters: 2,
        numTrades: 30,
        avgHoldingPeriod: 12,
        turnoverRatio: 0.8,
        complexityScore: 0.2,
      };

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        undefined,
        parameters,
        complexity
      );

      expect(analysis.overfit).toBe(false);
      expect(analysis.recommendations.some(r => r.includes('good generalization'))).toBe(true);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have higher confidence with more data', () => {
      const inSample = createMockResult(25, 1.8);
      const outOfSample = createMockResult(22, 1.7);
      
      const walkForward: WalkForwardResult[] = Array(5).fill(null).map((_, i) => ({
        period: i,
        trainStart: '2020-01-01',
        trainEnd: '2020-06-30',
        testStart: '2020-07-01',
        testEnd: '2020-12-31',
        trainScore: 1.8,
        testScore: 1.7,
        parameters: {},
        degradation: 0.056
      }));

      const parameters = { param1: 10 };
      const complexity: ComplexityMetrics = {
        numParameters: 1,
        numTrades: 100,
        avgHoldingPeriod: 5,
        turnoverRatio: 2.0,
        complexityScore: 0.3,
      };

      const analysis = detector.analyze(
        inSample,
        outOfSample,
        walkForward,
        parameters,
        complexity
      );

      expect(analysis.confidence).toBeGreaterThan(0.7);
    });

    it('should have lower confidence with minimal data', () => {
      const inSample = createMockResult(25, 1.8, 10); // Only 10 trades
      const outOfSample = createMockResult(22, 1.7, 8);

      const analysis = detector.analyze(inSample, outOfSample);

      expect(analysis.confidence).toBeLessThan(0.5);
    });
  });

  describe('Early Stopping', () => {
    it('should suggest stopping after many iterations without improvement', () => {
      const results: BacktestResult[] = [];
      
      const decision = detector.shouldStopOptimization(results, 2.0, 51);

      expect(decision.shouldStop).toBe(true);
      expect(decision.reason).toContain('No improvement');
    });

    it('should suggest stopping when results are suspiciously good', () => {
      const results: BacktestResult[] = [];
      
      const decision = detector.shouldStopOptimization(results, 6.0, 10);

      expect(decision.shouldStop).toBe(true);
      expect(decision.reason).toContain('suspiciously good');
    });

    it('should not stop when optimization is progressing well', () => {
      const results: BacktestResult[] = [];
      
      const decision = detector.shouldStopOptimization(results, 2.5, 10);

      expect(decision.shouldStop).toBe(false);
    });
  });

  describe('Strategy Comparison', () => {
    it('should rank strategies by robustness and performance', () => {
      const strategies = [
        {
          name: 'Strategy A',
          inSample: createMockResult(50, 3.0),
          outOfSample: createMockResult(5, 0.5), // Overfitted
        },
        {
          name: 'Strategy B',
          inSample: createMockResult(25, 1.8),
          outOfSample: createMockResult(22, 1.7), // Robust
        },
        {
          name: 'Strategy C',
          inSample: createMockResult(30, 2.0),
          outOfSample: createMockResult(28, 1.9), // Also robust
        },
      ];

      const comparison = detector.compareStrategies(strategies);

      expect(comparison.length).toBe(3);
      expect(comparison[0].rank).toBe(1);
      
      // Strategy B or C should be ranked higher than A
      const strategyARank = comparison.find(c => c.name === 'Strategy A')?.rank;
      expect(strategyARank).toBeGreaterThan(1);
    });
  });

  describe('Complexity Metrics Calculation', () => {
    it('should calculate complexity metrics from backtest result', () => {
      const result = createMockResult(25, 1.8, 100);
      
      const complexity = OverfittingDetector.calculateComplexity(result, 8);

      expect(complexity.numParameters).toBe(8);
      expect(complexity.numTrades).toBe(100);
      expect(complexity.avgHoldingPeriod).toBeGreaterThanOrEqual(0);
      expect(complexity.turnoverRatio).toBeGreaterThanOrEqual(0);
      expect(complexity.complexityScore).toBeGreaterThanOrEqual(0);
      expect(complexity.complexityScore).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockResult(
  totalReturn: number,
  sharpeRatio: number,
  numTrades: number = 50
): BacktestResult {
  const trades = Array(numTrades).fill(null).map((_, i) => ({
    id: `trade_${i}`,
    entryDate: `2024-01-${(i % 30) + 1}`,
    exitDate: `2024-01-${((i + 1) % 30) + 1}`,
    symbol: 'TEST',
    side: 'LONG' as const,
    entryPrice: 100 + Math.random() * 10,
    exitPrice: 100 + Math.random() * 10,
    quantity: 100,
    pnl: (Math.random() - 0.5) * 1000,
    pnlPercent: (Math.random() - 0.5) * 10,
    fees: 10,
    exitReason: 'signal' as const,
  }));

  const winningTrades = trades.filter(t => t.pnl > 0).length;

  return {
    trades,
    equityCurve: Array(100).fill(100000).map((v, i) => v * (1 + (totalReturn / 100) * (i / 100))),
    metrics: {
      totalReturn,
      annualizedReturn: totalReturn * 2,
      volatility: 15,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 1.2,
      maxDrawdown: 10,
      maxDrawdownDuration: 30,
      winRate: (winningTrades / numTrades) * 100,
      profitFactor: 1.5,
      averageWin: 500,
      averageLoss: -300,
      largestWin: 2000,
      largestLoss: -1500,
      averageTrade: 100,
      totalTrades: numTrades,
      winningTrades,
      losingTrades: numTrades - winningTrades,
      calmarRatio: totalReturn / 10,
      omegaRatio: 1.8,
    },
    config: {
      initialCapital: 100000,
      commission: 0.1,
      slippage: 0.05,
      spread: 0.01,
      maxPositionSize: 20,
      maxDrawdown: 50,
      allowShort: false,
      useStopLoss: true,
      useTakeProfit: true,
      riskPerTrade: 2,
    },
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    duration: 365,
  };
}
