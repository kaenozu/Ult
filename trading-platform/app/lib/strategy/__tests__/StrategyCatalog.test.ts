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
  MLBasedAlphaStrategy,
  strategyCatalog,
  getStrategyByName,
  getStrategiesByCategory,
  createCompositeStrategy,
  calculateStrategyCorrelation,
} from '../StrategyCatalog';
import { OHLCV } from '@/app/types';
import { StrategyContext } from '../../backtest/AdvancedBacktestEngine';

describe('StrategyCatalog', () => {
  // モックデータ生成
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
      });
    }
    
    return data;
  };

  const mockContext: StrategyContext = {
    currentPosition: null,
    entryPrice: 0,
    equity: 100000,
    data: generateMockData(100),
    indicators: new Map(),
  };

  describe('Strategy Templates', () => {
    it('should have momentum strategy template', () => {
      expect(MomentumStrategy).toBeDefined();
      expect(MomentumStrategy.name).toBe('Momentum (Trend Following)');
      expect(MomentumStrategy.category).toBe('momentum');
      expect(MomentumStrategy.defaultParams).toBeDefined();
    });

    it('should have mean reversion strategy template', () => {
      expect(MeanReversionStrategy).toBeDefined();
      expect(MeanReversionStrategy.name).toBe('Mean Reversion');
      expect(MeanReversionStrategy.category).toBe('mean_reversion');
    });

    it('should have breakout strategy template', () => {
      expect(BreakoutStrategy).toBeDefined();
      expect(BreakoutStrategy.name).toBe('Breakout');
      expect(BreakoutStrategy.category).toBe('breakout');
    });

    it('should have stat arb strategy template', () => {
      expect(StatArbStrategy).toBeDefined();
      expect(StatArbStrategy.name).toBe('Statistical Arbitrage');
      expect(StatArbStrategy.category).toBe('stat_arb');
    });

    it('should have market making strategy template', () => {
      expect(MarketMakingStrategy).toBeDefined();
      expect(MarketMakingStrategy.name).toBe('Market Making');
      expect(MarketMakingStrategy.category).toBe('market_making');
    });

    it('should have ML-based alpha strategy template', () => {
      expect(MLBasedAlphaStrategy).toBeDefined();
      expect(MLBasedAlphaStrategy.name).toBe('ML-Based Alpha');
      expect(MLBasedAlphaStrategy.category).toBe('ml_based');
    });
  });

  describe('Strategy Creation', () => {
    it('should create momentum strategy with default params', () => {
      const strategy = MomentumStrategy.createStrategy(MomentumStrategy.defaultParams);
      
      expect(strategy).toBeDefined();
      expect(strategy.name).toBe('Momentum');
      expect(strategy.onData).toBeDefined();
    });

    it('should execute momentum strategy', () => {
      const strategy = MomentumStrategy.createStrategy(MomentumStrategy.defaultParams);
      const data = mockContext.data[50];
      
      const action = strategy.onData(data, 50, mockContext);
      
      expect(action).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD', 'CLOSE']).toContain(action.action);
    });

    it('should create mean reversion strategy', () => {
      const strategy = MeanReversionStrategy.createStrategy(MeanReversionStrategy.defaultParams);
      const data = mockContext.data[30];
      
      const action = strategy.onData(data, 30, mockContext);
      
      expect(action).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD', 'CLOSE']).toContain(action.action);
    });
  });

  describe('Strategy Catalog', () => {
    it('should contain all strategies', () => {
      expect(strategyCatalog.length).toBe(6);
    });

    it('should get strategy by name', () => {
      const strategy = getStrategyByName('Momentum (Trend Following)');
      
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe('Momentum (Trend Following)');
    });

    it('should return undefined for non-existent strategy', () => {
      const strategy = getStrategyByName('NonExistent');
      
      expect(strategy).toBeUndefined();
    });

    it('should get strategies by category', () => {
      const momentumStrategies = getStrategiesByCategory('momentum');
      
      expect(momentumStrategies.length).toBeGreaterThan(0);
      expect(momentumStrategies[0].category).toBe('momentum');
    });
  });

  describe('Composite Strategy', () => {
    it('should create composite strategy from multiple strategies', () => {
      const strategy1 = MomentumStrategy.createStrategy(MomentumStrategy.defaultParams);
      const strategy2 = MeanReversionStrategy.createStrategy(MeanReversionStrategy.defaultParams);
      
      const composite = createCompositeStrategy({
        strategies: [
          { strategy: strategy1, weight: 0.6 },
          { strategy: strategy2, weight: 0.4 },
        ],
        rebalanceFrequency: 30,
        correlationThreshold: 0.7,
      });
      
      expect(composite).toBeDefined();
      expect(composite.name).toBe('Composite Strategy');
    });

    it('should execute composite strategy', () => {
      const strategy1 = MomentumStrategy.createStrategy(MomentumStrategy.defaultParams);
      const strategy2 = MeanReversionStrategy.createStrategy(MeanReversionStrategy.defaultParams);
      
      const composite = createCompositeStrategy({
        strategies: [
          { strategy: strategy1, weight: 0.5 },
          { strategy: strategy2, weight: 0.5 },
        ],
        rebalanceFrequency: 30,
        correlationThreshold: 0.7,
      });
      
      const data = mockContext.data[50];
      const action = composite.onData(data, 50, mockContext);
      
      expect(action).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD', 'CLOSE']).toContain(action.action);
    });
  });

  describe('Strategy Correlation', () => {
    it('should calculate correlation between strategy returns', () => {
      const returns1 = [0.01, 0.02, -0.01, 0.03, -0.02];
      const returns2 = [0.015, 0.018, -0.012, 0.028, -0.018];
      
      const correlation = calculateStrategyCorrelation(returns1, returns2);
      
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should return 0 for empty arrays', () => {
      const correlation = calculateStrategyCorrelation([], []);
      
      expect(correlation).toBe(0);
    });

    it('should return 0 for mismatched array lengths', () => {
      const returns1 = [0.01, 0.02];
      const returns2 = [0.01];
      
      const correlation = calculateStrategyCorrelation(returns1, returns2);
      
      expect(correlation).toBe(0);
    });
  });
});
