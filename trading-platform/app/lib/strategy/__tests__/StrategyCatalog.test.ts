/**
 * StrategyCatalog.test.ts
 * 
 * 戦略カタログのテスト
 */

import {
  MomentumStrategy,
  MeanReversionStrategy,
  BreakoutStrategy,
  StatArbStrategy,
  MarketMakingStrategy,
  MLAlphaStrategy,
  StrategyCatalog,
} from '../StrategyCatalog';
import { OHLCV } from '@/app/types';

describe('StrategyCatalog', () => {
  const generateMockData = (days: number): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    
    for (let i = 0; i < days; i++) {
      const change = (Math.random() - 0.5) * 2;
      price += change;
      
      data.push({
        timestamp: new Date(2023, 0, i + 1).toISOString(),
        open: price,
        high: price + Math.random() * 2,
        low: price - Math.random() * 2,
        close: price,
        volume: Math.floor(Math.random() * 1000000),
        date: new Date(2023, 0, i + 1).toISOString(),
      });
    }
    
    return data;
  };

  describe('Strategy Classes', () => {
    it('should have MomentumStrategy class', () => {
      expect(MomentumStrategy).toBeDefined();
      const strategy = new MomentumStrategy();
      expect(strategy.config.name).toBe('Momentum Strategy');
      expect(strategy.config.type).toBe('momentum');
    });

    it('should have MeanReversionStrategy class', () => {
      expect(MeanReversionStrategy).toBeDefined();
      const strategy = new MeanReversionStrategy();
      expect(strategy.config.name).toBe('Mean Reversion Strategy');
      expect(strategy.config.type).toBe('mean_reversion');
    });

    it('should have BreakoutStrategy class', () => {
      expect(BreakoutStrategy).toBeDefined();
      const strategy = new BreakoutStrategy();
      expect(strategy.config.name).toBe('Breakout Strategy');
      expect(strategy.config.type).toBe('breakout');
    });

    it('should have StatArbStrategy class', () => {
      expect(StatArbStrategy).toBeDefined();
      const strategy = new StatArbStrategy();
      expect(strategy.config.name).toBe('Statistical Arbitrage Strategy');
      expect(strategy.config.type).toBe('stat_arb');
    });

    it('should have MarketMakingStrategy class', () => {
      expect(MarketMakingStrategy).toBeDefined();
      const strategy = new MarketMakingStrategy();
      expect(strategy.config.name).toBe('Market Making Strategy');
      expect(strategy.config.type).toBe('market_making');
    });

    it('should have MLAlphaStrategy class', () => {
      expect(MLAlphaStrategy).toBeDefined();
      const strategy = new MLAlphaStrategy();
      expect(strategy.config.name).toBe('ML-Based Alpha Strategy');
      expect(strategy.config.type).toBe('ml_alpha');
    });
  });

  describe('Strategy Creation', () => {
    it('should create momentum strategy with default params', async () => {
      const strategy = new MomentumStrategy();
      const data = generateMockData(100);
      
      await strategy.initialize(data);
      expect(strategy.config).toBeDefined();
      expect(strategy.config.name).toBe('Momentum Strategy');
    });

    it('should generate signal from momentum strategy', async () => {
      const strategy = new MomentumStrategy();
      const data = generateMockData(100);
      
      await strategy.initialize(data);
      const signal = await strategy.generateSignal(data[99], data);
      
      expect(signal).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.signal);
    });

    it('should create mean reversion strategy', async () => {
      const strategy = new MeanReversionStrategy();
      const data = generateMockData(100);
      
      await strategy.initialize(data);
      const signal = await strategy.generateSignal(data[99], data);
      
      expect(signal).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.signal);
    });
  });

  describe('Strategy Catalog', () => {
    it('should contain all strategies', () => {
      expect(StrategyCatalog.momentum).toBe(MomentumStrategy);
      expect(StrategyCatalog.meanReversion).toBe(MeanReversionStrategy);
      expect(StrategyCatalog.breakout).toBe(BreakoutStrategy);
      expect(StrategyCatalog.statArb).toBe(StatArbStrategy);
      expect(StrategyCatalog.marketMaking).toBe(MarketMakingStrategy);
      expect(StrategyCatalog.mlAlpha).toBe(MLAlphaStrategy);
    });

    it('should have 6 strategies in catalog', () => {
      expect(Object.keys(StrategyCatalog).length).toBe(6);
    });
  });

  describe('Strategy Backtest', () => {
    it('should run backtest on momentum strategy', async () => {
      const strategy = new MomentumStrategy();
      const data = generateMockData(200);
      
      const performance = await strategy.backtest(data, {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        maxPositionSize: 0.5
      });
      
      expect(performance).toBeDefined();
      expect(performance.strategyName).toBe('Momentum Strategy');
      expect(performance.totalReturn).toBeDefined();
    });
  });
});
