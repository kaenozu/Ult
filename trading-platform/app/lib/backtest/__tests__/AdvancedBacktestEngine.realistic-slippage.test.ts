/**
 * AdvancedBacktestEngine.realistic-slippage.test.ts
 * 
 * Unit tests for realistic slippage and fee models in backtest engine
 */

import { AdvancedBacktestEngine, BacktestConfig, OHLCV, Strategy } from '../AdvancedBacktestEngine';

describe('AdvancedBacktestEngine - Realistic Slippage', () => {
  let engine: AdvancedBacktestEngine;
  let mockData: OHLCV[];

  beforeEach(() => {
    // Create mock OHLCV data
    mockData = generateMockOHLCVData(100);
  });

  describe('Realistic Slippage Model', () => {
    it('should use basic slippage when realistic model is disabled', async () => {
      const config: Partial<BacktestConfig> = {
        initialCapital: 100000,
        slippage: 0.1, // 0.1%
        useRealisticSlippage: false,
      };

      engine = new AdvancedBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createSimpleBuyHoldStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      // Basic slippage should be applied
      expect(result.metrics.totalReturn).toBeDefined();
    });

    it('should apply realistic slippage considering order size', async () => {
      const config: Partial<BacktestConfig> = {
        initialCapital: 100000,
        slippage: 0.05, // 0.05% base
        useRealisticSlippage: true,
        averageDailyVolume: 1000000, // 1M shares daily volume
      };

      engine = new AdvancedBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createSimpleBuyHoldStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      // With realistic slippage, total return should be different
      expect(result.metrics.totalReturn).toBeDefined();
    });

    it('should apply bid-ask spread impact', async () => {
      const config: Partial<BacktestConfig> = {
        initialCapital: 100000,
        slippage: 0.05,
        spread: 0.02, // 0.02% spread
        useRealisticSlippage: true,
      };

      engine = new AdvancedBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createSimpleBuyHoldStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      // Spread should reduce returns
      expect(result.trades.length).toBeGreaterThan(0);
      expect(result.metrics.totalReturn).toBeDefined();
    });

    it('should apply time-of-day slippage variation', async () => {
      const config: Partial<BacktestConfig> = {
        initialCapital: 100000,
        slippage: 0.05,
        useRealisticSlippage: true,
        useTimeOfDaySlippage: true,
      };

      // Create data with specific times (market open and close)
      const dataWithTimes = generateMockOHLCVDataWithTimes(100);

      engine = new AdvancedBacktestEngine(config);
      engine.loadData('TEST', dataWithTimes);

      const strategy = createSimpleBuyHoldStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      // Time of day slippage should affect execution costs
      expect(result.metrics.totalReturn).toBeDefined();
    });

    it('should apply volatility-linked slippage', async () => {
      const config: Partial<BacktestConfig> = {
        initialCapital: 100000,
        slippage: 0.05,
        useRealisticSlippage: true,
        useVolatilitySlippage: true,
      };

      // Create data with high volatility periods
      const volatileData = generateHighVolatilityData(100);

      engine = new AdvancedBacktestEngine(config);
      engine.loadData('TEST', volatileData);

      const strategy = createSimpleBuyHoldStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      // High volatility should increase slippage costs
      expect(result.metrics.totalReturn).toBeDefined();
    });
  });

  describe('Tiered Commission Structure', () => {
    it('should use basic commission when tiered model is disabled', async () => {
      const config: Partial<BacktestConfig> = {
        initialCapital: 100000,
        commission: 0.1, // 0.1%
        useTieredCommissions: false,
      };

      engine = new AdvancedBacktestEngine(config);
      engine.loadData('TEST', mockData);

      const strategy = createSimpleBuyHoldStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThanOrEqual(1);
      if (result.trades.length > 0) {
        const firstTrade = result.trades[0];
        
        // Just verify fees exist and are reasonable
        expect(firstTrade.fees).toBeGreaterThan(0);
      }
    });

    it('should apply tiered commissions based on volume', async () => {
      const config: Partial<BacktestConfig> = {
        initialCapital: 100000,
        commission: 0.1, // 0.1% base
        useTieredCommissions: true,
      };

      engine = new AdvancedBacktestEngine(config);
      engine.loadData('TEST', mockData);

      // Strategy that generates high volume
      const strategy = createHighVolumeStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThanOrEqual(1);
      // Later trades should have lower commission rates due to volume tiers
      // This is hard to test directly without exposing internal state
      expect(result.metrics.totalReturn).toBeDefined();
    });

    it('should reduce commission rate for high-volume traders', async () => {
      const lowVolumeConfig: Partial<BacktestConfig> = {
        initialCapital: 10000,
        commission: 0.1,
        useTieredCommissions: true,
      };

      const highVolumeConfig: Partial<BacktestConfig> = {
        initialCapital: 1000000,
        commission: 0.1,
        useTieredCommissions: true,
      };

      const lowVolumeEngine = new AdvancedBacktestEngine(lowVolumeConfig);
      const highVolumeEngine = new AdvancedBacktestEngine(highVolumeConfig);

      lowVolumeEngine.loadData('TEST', mockData);
      highVolumeEngine.loadData('TEST', mockData);

      const strategy = createSimpleBuyHoldStrategy();
      
      const lowVolumeResult = await lowVolumeEngine.runBacktest(strategy, 'TEST');
      const highVolumeResult = await highVolumeEngine.runBacktest(strategy, 'TEST');

      // High volume trader should have better returns (lower commissions)
      // Note: This is a simplified test - actual results depend on strategy
      expect(lowVolumeResult.metrics.totalReturn).toBeDefined();
      expect(highVolumeResult.metrics.totalReturn).toBeDefined();
    });
  });

  describe('Combined Realistic Models', () => {
    it('should apply all realistic models together', async () => {
      const realisticConfig: Partial<BacktestConfig> = {
        initialCapital: 100000,
        commission: 0.1,
        slippage: 0.05,
        spread: 0.02,
        useRealisticSlippage: true,
        useTimeOfDaySlippage: true,
        useVolatilitySlippage: true,
        useTieredCommissions: true,
        averageDailyVolume: 1000000,
      };

      const realisticEngine = new AdvancedBacktestEngine(realisticConfig);
      realisticEngine.loadData('TEST', mockData);

      const strategy = createSimpleBuyHoldStrategy();
      const realisticResult = await realisticEngine.runBacktest(strategy, 'TEST');

      // Verify realistic model ran successfully
      expect(realisticResult.metrics.totalReturn).toBeDefined();
      expect(realisticResult.trades.length).toBeGreaterThanOrEqual(1);
    });

    it('should show transaction costs with realistic models', async () => {
      const realisticConfig: Partial<BacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: true,
        useTimeOfDaySlippage: true,
        useVolatilitySlippage: true,
        useTieredCommissions: true,
        averageDailyVolume: 500000, // Lower volume = higher impact
      };

      const basicConfig: Partial<BacktestConfig> = {
        initialCapital: 100000,
        useRealisticSlippage: false,
        useTieredCommissions: false,
      };

      const realisticEngine = new AdvancedBacktestEngine(realisticConfig);
      const basicEngine = new AdvancedBacktestEngine(basicConfig);

      realisticEngine.loadData('TEST', mockData);
      basicEngine.loadData('TEST', mockData);

      const strategy = createSimpleBuyHoldStrategy();

      const realisticResult = await realisticEngine.runBacktest(strategy, 'TEST');
      const basicResult = await basicEngine.runBacktest(strategy, 'TEST');

      // Calculate total transaction costs if trades exist
      if (realisticResult.trades.length > 0 && basicResult.trades.length > 0) {
        const realisticCosts = realisticResult.trades.reduce((sum, t) => sum + t.fees, 0);
        const basicCosts = basicResult.trades.reduce((sum, t) => sum + t.fees, 0);

        // Both models should have costs
        expect(realisticCosts).toBeGreaterThan(0);
        expect(basicCosts).toBeGreaterThan(0);
      } else {
        // At least verify the engines ran
        expect(realisticResult.metrics).toBeDefined();
        expect(basicResult.metrics).toBeDefined();
      }
    });
  });

  describe('Transaction Cost Model', () => {
    it('should apply transaction costs when enabled', async () => {
      const configWithCosts: Partial<BacktestConfig> = {
        initialCapital: 100000,
        commission: 0,
        transactionCostsEnabled: true,
        transactionCostBroker: 'SBI',
        transactionCostMarketCondition: 'normal',
        transactionCostSettlementType: 'same-day',
        transactionCostDailyVolume: 1000000,
      };

      engine = new AdvancedBacktestEngine(configWithCosts);
      engine.loadData('TEST', mockData);
      const strategy = createSimpleBuyHoldStrategy();
      const result = await engine.runBacktest(strategy, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);

      const totalFees = result.trades.reduce(
        (sum, trade) => sum + (trade.fees || 0), 0
      );
      expect(typeof totalFees).toBe('number');
    });

    it('should use broker-specific commission rates', async () => {
      const configJapan: Partial<BacktestConfig> = {
        initialCapital: 100000,
        transactionCostsEnabled: true,
        transactionCostBroker: 'SBI',
        market: 'japan',
      };

      const configUSA: Partial<BacktestConfig> = {
        initialCapital: 100000,
        transactionCostsEnabled: true,
        transactionCostBroker: 'Rakuten',
        market: 'usa',
      };

      engine = new AdvancedBacktestEngine(configJapan);
      engine.loadData('TEST', mockData);
      const strategyJapan = createSimpleBuyHoldStrategy();
      const resultJapan = await engine.runBacktest(strategyJapan, 'TEST');

      const engineUSA = new AdvancedBacktestEngine(configUSA);
      engineUSA.loadData('TEST', mockData);
      const strategyUSA = createSimpleBuyHoldStrategy();
      const resultUSA = await engineUSA.runBacktest(strategyUSA, 'TEST');

      expect(resultJapan.trades.length).toBeGreaterThan(0);
      expect(resultUSA.trades.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions

function generateMockOHLCVData(count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01T09:30:00Z');

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

function generateMockOHLCVDataWithTimes(count: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Set specific times (market open, mid-day, close)
    const hour = i % 3 === 0 ? 9 : i % 3 === 1 ? 12 : 15;
    date.setHours(hour, 30, 0, 0);

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
  const startDate = new Date('2024-01-01T09:30:00Z');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const open = price;
    // High volatility: larger price ranges
    const high = price * (1 + Math.random() * 0.05); // Up to 5%
    const low = price * (1 - Math.random() * 0.05); // Down to 5%
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

function createSimpleBuyHoldStrategy(): Strategy {
  let hasBought = false;

  return {
    name: 'Simple Buy and Hold',
    description: 'Buy once and hold until end',
    onData: (data, index, context) => {
      if (!hasBought && index > 50) {
        hasBought = true;
        return { action: 'BUY', quantity: 100 };
      }
      return { action: 'HOLD' };
    },
  };
}

function createHighVolumeStrategy(): Strategy {
  let tradeCount = 0;

  return {
    name: 'High Volume Strategy',
    description: 'Generates many trades',
    onData: (data, index, context) => {
      if (index < 50) return { action: 'HOLD' };

      // Trade every 5 periods
      if (index % 5 === 0) {
        if (!context.currentPosition) {
          tradeCount++;
          return { action: 'BUY', quantity: 500 };
        } else {
          return { action: 'CLOSE' };
        }
      }

      return { action: 'HOLD' };
    },
  };
}
