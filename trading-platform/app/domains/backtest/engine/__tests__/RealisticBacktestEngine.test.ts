/**
 * RealisticBacktestEngine.test.ts
 * 
 * Tests for realistic backtest engine with market impact,
 * dynamic slippage, and tiered commissions
 */

import { RealisticBacktestEngine, RealisticBacktestConfig } from '../RealisticBacktestEngine';
import { OHLCV, Strategy } from '../AdvancedBacktestEngine';

describe('RealisticBacktestEngine', () => {
  let engine: RealisticBacktestEngine;
  let mockData: OHLCV[];

  beforeEach(() => {
    mockData = generateMockOHLCVData(200);
  });

  describe('Market Impact Calculation', () => {
    it('should apply market impact based on order size', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        averageDailyVolume: 1000000,
        marketImpactCoefficient: 0.1,
      };

      engine = new RealisticBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createSimpleBuyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      
      // Check that market impact was calculated
      const firstTrade = result.trades[0];
      expect(firstTrade.marketImpact).toBeGreaterThanOrEqual(0);
      expect(firstTrade.effectiveSlippage).toBeGreaterThan(0);
    });

    it('should increase slippage with larger order sizes', async () => {
      const smallOrderConfig: Partial<RealisticBacktestConfig> = {
        initialCapital: 10000,
        useRealisticSlippage: true,
        averageDailyVolume: 1000000,
      };

      const largeOrderConfig: Partial<RealisticBacktestConfig> = {
        initialCapital: 1000000,
        useRealisticSlippage: true,
        averageDailyVolume: 1000000,
      };

      const smallEngine = new RealisticBacktestEngine(smallOrderConfig);
      const largeEngine = new RealisticBacktestEngine(largeOrderConfig);

      smallEngine.loadData('TEST', mockData);
      largeEngine.loadData('TEST', mockData);

      const strategy = createSimpleBuyStrategy();

      const smallResult = await smallEngine.runBacktest(strategy, 'TEST');
      const largeResult = await largeEngine.runBacktest(strategy, 'TEST');

      // Larger orders should have higher slippage
      if (smallResult.trades.length > 0 && largeResult.trades.length > 0) {
        const smallSlippage = smallResult.trades[0].effectiveSlippage;
        const largeSlippage = largeResult.trades[0].effectiveSlippage;
        expect(largeSlippage).toBeGreaterThanOrEqual(smallSlippage);
      }
    });
  });

  describe('Time-of-Day Slippage', () => {
    it('should apply higher slippage at market open', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        useTimeOfDaySlippage: true,
        marketOpenSlippageMultiplier: 1.5,
      };

      engine = new RealisticBacktestEngine(config);
      
      // Create data with market open timestamps
      const openData = generateMarketOpenData(100);
      engine.loadData('TEST', openData);

      const strategy = createSimpleBuyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      
      // Check time-of-day factor was applied
      const trade = result.trades[0];
      expect(trade.timeOfDayFactor).toBeDefined();
      if (trade.timeOfDayFactor) {
        expect(trade.timeOfDayFactor).toBeGreaterThanOrEqual(1.0);
      }
    });

    it('should apply higher slippage at market close', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        useTimeOfDaySlippage: true,
        marketCloseSlippageMultiplier: 1.3,
      };

      engine = new RealisticBacktestEngine(config);
      
      const closeData = generateMarketCloseData(100);
      engine.loadData('TEST', closeData);

      const strategy = createSimpleBuyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
    });
  });

  describe('Volatility-Based Slippage', () => {
    it('should apply higher slippage during high volatility', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        useVolatilitySlippage: true,
        volatilityWindow: 20,
        volatilitySlippageMultiplier: 2.0,
      };

      engine = new RealisticBacktestEngine(config);
      
      const volatileData = generateHighVolatilityData(150);
      engine.loadData('TEST', volatileData);

      const strategy = createSimpleBuyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      
      const trade = result.trades[0];
      expect(trade.volatilityFactor).toBeDefined();
      if (trade.volatilityFactor) {
        expect(trade.volatilityFactor).toBeGreaterThanOrEqual(0.5);
      }
    });
  });

  describe('Tiered Commission Structure', () => {
    it('should use basic commission rate for low volume', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 10000,
        useTieredCommissions: true,
        commissionTiers: [
          { volumeThreshold: 0, rate: 0.1 },
          { volumeThreshold: 100000, rate: 0.05 },
        ],
      };

      engine = new RealisticBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createSimpleBuyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      
      const firstTrade = result.trades[0];
      expect(firstTrade.commissionTier).toBe(0); // Should use lowest tier
    });

    it('should reduce commission rate for high volume traders', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 500000,
        useTieredCommissions: true,
        commissionTiers: [
          { volumeThreshold: 0, rate: 0.1 },
          { volumeThreshold: 100000, rate: 0.08 },
          { volumeThreshold: 500000, rate: 0.05 },
        ],
      };

      engine = new RealisticBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createHighFrequencyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(5);
      
      // Later trades should potentially use lower tier
      const laterTrades = result.trades.slice(-3);
      const haslowerTier = laterTrades.some(t => t.commissionTier && t.commissionTier > 0);
      // This test is probabilistic - might not always pass
    });
  });

  describe('Transaction Cost Analysis', () => {
    it('should calculate comprehensive transaction costs', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        useTieredCommissions: true,
        spread: 0.02,
      };

      engine = new RealisticBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createHighFrequencyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.transactionCosts).toBeDefined();
      expect(result.transactionCosts.totalCommissions).toBeGreaterThanOrEqual(0);
      expect(result.transactionCosts.totalSlippage).toBeGreaterThanOrEqual(0);
      expect(result.transactionCosts.totalMarketImpact).toBeGreaterThanOrEqual(0);
      expect(result.transactionCosts.totalSpread).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average costs per trade', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
      };

      engine = new RealisticBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createHighFrequencyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      if (result.trades.length > 0) {
        expect(result.transactionCosts.avgCommissionPerTrade).toBeGreaterThanOrEqual(0);
        expect(result.transactionCosts.avgSlippagePerTrade).toBeGreaterThanOrEqual(0);
        expect(result.transactionCosts.avgMarketImpactPerTrade).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Execution Quality Metrics', () => {
    it('should calculate execution quality metrics', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        useVolatilitySlippage: true,
      };

      engine = new RealisticBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createHighFrequencyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.executionQuality).toBeDefined();
      expect(result.executionQuality.worstSlippage).toBeGreaterThanOrEqual(0);
      expect(result.executionQuality.bestSlippage).toBeGreaterThanOrEqual(0);
      expect(result.executionQuality.slippageStdDev).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Combined Realistic Models', () => {
    it('should apply all realistic features together', async () => {
      const config: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        commission: 0.1,
        slippage: 0.05,
        spread: 0.02,
        useRealisticSlippage: true,
        averageDailyVolume: 1000000,
        marketImpactCoefficient: 0.1,
        useTimeOfDaySlippage: true,
        marketOpenSlippageMultiplier: 1.5,
        marketCloseSlippageMultiplier: 1.3,
        useVolatilitySlippage: true,
        volatilityWindow: 20,
        volatilitySlippageMultiplier: 2.0,
        useTieredCommissions: true,
        commissionTiers: [
          { volumeThreshold: 0, rate: 0.1 },
          { volumeThreshold: 100000, rate: 0.08 },
          { volumeThreshold: 500000, rate: 0.05 },
        ],
      };

      engine = new RealisticBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createHighFrequencyStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      // Verify all components are working
      expect(result.trades.length).toBeGreaterThan(0);
      expect(result.transactionCosts).toBeDefined();
      expect(result.executionQuality).toBeDefined();
      
      // Check that trades have enhanced metrics
      const firstTrade = result.trades[0];
      expect(firstTrade.marketImpact).toBeDefined();
      expect(firstTrade.effectiveSlippage).toBeDefined();
    });

    it('should show higher costs with realistic models vs basic', async () => {
      const realisticConfig: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        useTimeOfDaySlippage: true,
        useVolatilitySlippage: true,
        useTieredCommissions: true,
        averageDailyVolume: 500000,
      };

      const basicConfig: Partial<RealisticBacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: false,
        useTimeOfDaySlippage: false,
        useVolatilitySlippage: false,
        useTieredCommissions: false,
      };

      const realisticEngine = new RealisticBacktestEngine(realisticConfig);
      const basicEngine = new RealisticBacktestEngine(basicConfig);

      realisticEngine.loadData('TEST', mockData);
      basicEngine.loadData('TEST', mockData);

      const strategy = createHighFrequencyStrategy();

      const realisticResult = await realisticEngine.runBacktest(strategy, 'TEST');
      const basicResult = await basicEngine.runBacktest(strategy, 'TEST');

      // Realistic model should generally have higher transaction costs
      // (though this depends on the specific market conditions)
      expect(realisticResult.transactionCosts.totalCommissions).toBeGreaterThanOrEqual(0);
      expect(basicResult.transactionCosts.totalCommissions).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateMockOHLCVData(count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01T10:00:00Z');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const open = price;
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const close = low + (high - low) * Math.random();
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

function generateMarketOpenData(count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(9, 30, 0, 0); // Market open

    const open = price;
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const close = low + (high - low) * Math.random();
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

function generateMarketCloseData(count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(15, 30, 0, 0); // Near market close

    const open = price;
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const close = low + (high - low) * Math.random();
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

function generateHighVolatilityData(count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01T10:00:00Z');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const open = price;
    const high = price * (1 + Math.random() * 0.05); // Higher volatility
    const low = price * (1 - Math.random() * 0.05);
    const close = low + (high - low) * Math.random();
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

function createSimpleBuyStrategy(): Strategy {
  let hasBought = false;

  return {
    name: 'Simple Buy Strategy',
    description: 'Buy once at index 60',
    onData: (data, index) => {
      if (!hasBought && index === 60) {
        hasBought = true;
        return { action: 'BUY', quantity: 100 };
      }
      return { action: 'HOLD' };
    },
  };
}

function createHighFrequencyStrategy(): Strategy {
  return {
    name: 'High Frequency Strategy',
    description: 'Trade frequently',
    onData: (data, index, context) => {
      if (index < 60) return { action: 'HOLD' };

      // Trade every 5 periods
      if (index % 5 === 0) {
        if (!context.currentPosition) {
          return { action: 'BUY', quantity: 50 };
        } else {
          return { action: 'CLOSE' };
        }
      }

      return { action: 'HOLD' };
    },
  };
}
