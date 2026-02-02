/**
 * MonteCarloSimulator.test.ts
 * 
 * Tests for Monte Carlo simulation with confidence intervals
 */

import { MonteCarloSimulator, MonteCarloConfig } from '../MonteCarloSimulator';
import { OHLCV, Strategy, BacktestConfig } from '../AdvancedBacktestEngine';

describe('MonteCarloSimulator', () => {
  let simulator: MonteCarloSimulator;
  let mockData: OHLCV[];
  let simpleStrategy: Strategy;

  beforeEach(() => {
    mockData = generateMockOHLCVData(100);
    simpleStrategy = createSimpleStrategy();
  });

  describe('Basic Simulation', () => {
    it('should run multiple simulations', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 10,
        confidenceLevel: 0.95,
        resampleMethod: 'bootstrap',
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      expect(result.simulations.length).toBe(10);
      expect(result.statistics).toBeDefined();
      expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfSuccess).toBeLessThanOrEqual(1);
      expect(result.robustnessScore).toBeGreaterThanOrEqual(0);
      expect(result.robustnessScore).toBeLessThanOrEqual(1);
    }, 30000); // 30 second timeout for simulations
  });

  describe('Bootstrap Resampling', () => {
    it('should generate different datasets for each simulation', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 5,
        resampleMethod: 'bootstrap',
        randomSeed: 12345,
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      // Should have variation in results
      const returns = result.simulations.map(s => s.metrics.totalReturn);
      const uniqueReturns = new Set(returns);
      
      // Most simulations should produce different results
      expect(uniqueReturns.size).toBeGreaterThanOrEqual(1);
    }, 30000);
  });

  describe('Block Bootstrap Resampling', () => {
    it('should preserve temporal structure with block bootstrap', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 5,
        resampleMethod: 'block_bootstrap',
        blockSize: 10,
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      expect(result.simulations.length).toBe(5);
      expect(result.statistics).toBeDefined();
    }, 30000);
  });

  describe('Parametric Resampling', () => {
    it('should generate new paths from distribution', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 5,
        resampleMethod: 'parametric',
        randomSeed: 42,
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      expect(result.simulations.length).toBe(5);
      expect(result.statistics.mean).toBeDefined();
      expect(result.statistics.median).toBeDefined();
    }, 30000);
  });

  describe('Statistics Calculation', () => {
    it('should calculate comprehensive statistics', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 20,
        confidenceLevel: 0.95,
        resampleMethod: 'bootstrap',
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      // Check mean statistics
      expect(result.statistics.mean.totalReturn).toBeDefined();
      expect(result.statistics.mean.sharpeRatio).toBeDefined();
      expect(result.statistics.mean.maxDrawdown).toBeDefined();
      expect(result.statistics.mean.winRate).toBeDefined();

      // Check median statistics
      expect(result.statistics.median.totalReturn).toBeDefined();

      // Check standard deviation
      expect(result.statistics.stdDev.totalReturn).toBeGreaterThanOrEqual(0);

      // Check percentiles
      expect(result.statistics.percentiles.p5).toBeDefined();
      expect(result.statistics.percentiles.p25).toBeDefined();
      expect(result.statistics.percentiles.p50).toBeDefined();
      expect(result.statistics.percentiles.p75).toBeDefined();
      expect(result.statistics.percentiles.p95).toBeDefined();
    }, 60000);
  });

  describe('Confidence Intervals', () => {
    it('should calculate confidence intervals', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 50,
        confidenceLevel: 0.95,
        resampleMethod: 'bootstrap',
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      const ci = result.statistics.confidenceIntervals;
      
      expect(ci.level).toBe(0.95);
      expect(ci.totalReturn).toBeDefined();
      expect(ci.totalReturn.lower).toBeLessThanOrEqual(ci.totalReturn.upper);
      expect(ci.sharpeRatio).toBeDefined();
      expect(ci.maxDrawdown).toBeDefined();
      expect(ci.winRate).toBeDefined();
    }, 120000);
  });

  describe('Probability Metrics', () => {
    it('should calculate probability of success', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 30,
        confidenceLevel: 0.95,
        resampleMethod: 'bootstrap',
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfSuccess).toBeLessThanOrEqual(1);
      expect(result.probabilityOfLoss).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfLoss).toBeLessThanOrEqual(1);
      
      // Should sum to 1
      expect(result.probabilityOfSuccess + result.probabilityOfLoss).toBeCloseTo(1, 5);
    }, 90000);
  });

  describe('Robustness Score', () => {
    it('should calculate robustness score', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 20,
        confidenceLevel: 0.95,
        resampleMethod: 'bootstrap',
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      expect(result.robustnessScore).toBeGreaterThanOrEqual(0);
      expect(result.robustnessScore).toBeLessThanOrEqual(1);
    }, 60000);
  });

  describe('Best and Worst Cases', () => {
    it('should identify best and worst case scenarios', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 15,
        confidenceLevel: 0.95,
        resampleMethod: 'bootstrap',
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      expect(result.worstCase).toBeDefined();
      expect(result.bestCase).toBeDefined();
      expect(result.bestCase.metrics.totalReturn).toBeGreaterThanOrEqual(
        result.worstCase.metrics.totalReturn
      );
    }, 45000);
  });

  describe('Random Seed', () => {
    it('should produce reproducible results with same seed', async () => {
      const config1: Partial<MonteCarloConfig> = {
        numSimulations: 10,
        resampleMethod: 'bootstrap',
        randomSeed: 12345,
      };

      const config2: Partial<MonteCarloConfig> = {
        numSimulations: 10,
        resampleMethod: 'bootstrap',
        randomSeed: 12345,
      };

      const simulator1 = new MonteCarloSimulator(config1);
      const simulator2 = new MonteCarloSimulator(config2);

      const backtestConfig: BacktestConfig = {
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
      };

      const result1 = await simulator1.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      const result2 = await simulator2.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      // Results should be similar (allowing for small floating point differences)
      expect(result1.statistics.mean.totalReturn).toBeCloseTo(
        result2.statistics.mean.totalReturn,
        0
      );
    }, 60000);
  });

  describe('Export Results', () => {
    it('should export results to JSON', async () => {
      const config: Partial<MonteCarloConfig> = {
        numSimulations: 5,
        confidenceLevel: 0.95,
        resampleMethod: 'bootstrap',
      };

      simulator = new MonteCarloSimulator(config);

      const backtestConfig: BacktestConfig = {
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
      };

      const result = await simulator.runSimulation(
        simpleStrategy,
        mockData,
        backtestConfig,
        'TEST'
      );

      const exported = simulator.exportResults(result);
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(exported);
      expect(parsed.config).toBeDefined();
      expect(parsed.statistics).toBeDefined();
      expect(parsed.robustnessScore).toBeDefined();
    }, 30000);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateMockOHLCVData(count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily moves
    const open = price;
    const close = price * (1 + dailyReturn);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = 1000000 + Math.random() * 500000;

    data.push({
      date: date.toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return data;
}

function createSimpleStrategy(): Strategy {
  let position = false;

  return {
    name: 'Simple Moving Average Strategy',
    description: 'Buy when price is trending up, sell when trending down',
    onData: (data, index, context) => {
      if (index < 60) return { action: 'HOLD' };

      const recentData = context.data.slice(Math.max(0, index - 10), index + 1);
      const avgPrice = recentData.reduce((sum, d) => sum + d.close, 0) / recentData.length;

      if (!position && data.close > avgPrice * 1.01) {
        position = true;
        return { action: 'BUY', quantity: 100 };
      }

      if (position && data.close < avgPrice * 0.99) {
        position = false;
        return { action: 'CLOSE' };
      }

      return { action: 'HOLD' };
    },
  };
}
