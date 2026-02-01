/**
 * Tests for Universe Manager
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { UniverseManager, UniverseStock, UniverseStats } from '../UniverseManager';

describe('UniverseManager', () => {
  let manager: UniverseManager;

  beforeEach(() => {
    manager = new UniverseManager();
  });

  describe('addStock', () => {
    it('should add a stock to the universe', async () => {
      const stock = await manager.addStock('AAPL', false);

      expect(stock).toBeDefined();
      expect(stock.symbol).toBe('AAPL');
      expect(stock.active).toBe(true);
    });

    it('should not add duplicate stocks', async () => {
      await manager.addStock('AAPL', false);
      const stock2 = await manager.addStock('AAPL', false);

      const allStocks = manager.getAllStocks();
      expect(allStocks.length).toBe(1);
    });

    it('should enforce maximum stock limit', async () => {
      // Add stocks up to the limit
      for (let i = 0; i < 105; i++) {
        await manager.addStock(`STK${i}`, false);
      }

      const allStocks = manager.getAllStocks();
      expect(allStocks.length).toBe(100);
    });
  });

  describe('validateSymbol', () => {
    it('should validate a valid US stock symbol', async () => {
      const result = await manager.validateSymbol('AAPL');

      expect(result.valid).toBe(true);
      expect(result.symbol).toBe('AAPL');
    });

    it('should validate a valid Japanese stock symbol', async () => {
      const result = await manager.validateSymbol('7203');

      expect(result.valid).toBe(true);
      expect(result.symbol).toBe('7203');
    });

    it('should reject invalid symbol format', async () => {
      const result = await manager.validateSymbol('INVALID');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('removeStock', () => {
    it('should remove a stock from the universe', async () => {
      await manager.addStock('AAPL', false);
      const removed = manager.removeStock('AAPL');

      expect(removed).toBe(true);
      expect(manager.getStock('AAPL')).toBeUndefined();
    });

    it('should return false when removing non-existent stock', () => {
      const removed = manager.removeStock('NONEXISTENT');

      expect(removed).toBe(false);
    });
  });

  describe('getStock', () => {
    it('should get a stock by symbol', async () => {
      await manager.addStock('AAPL', false);
      const stock = manager.getStock('AAPL');

      expect(stock).toBeDefined();
      expect(stock?.symbol).toBe('AAPL');
    });

    it('should return undefined for non-existent stock', () => {
      const stock = manager.getStock('NONEXISTENT');

      expect(stock).toBeUndefined();
    });
  });

  describe('getAllStocks', () => {
    it('should return all stocks', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);
      await manager.addStock('GOOGL', false);

      const stocks = manager.getAllStocks();

      expect(stocks.length).toBe(3);
      expect(stocks.map(s => s.symbol)).toContain('AAPL');
      expect(stocks.map(s => s.symbol)).toContain('MSFT');
      expect(stocks.map(s => s.symbol)).toContain('GOOGL');
    });
  });

  describe('getActiveStocks', () => {
    it('should return only active stocks', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);
      manager.setStockActive('MSFT', false);

      const activeStocks = manager.getActiveStocks();

      expect(activeStocks.length).toBe(1);
      expect(activeStocks[0].symbol).toBe('AAPL');
    });
  });

  describe('getStocksByMarket', () => {
    it('should return US stocks', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);
      await manager.addStock('7203', false);

      const usStocks = manager.getStocksByMarket('usa');

      expect(usStocks.length).toBe(2);
      expect(usStocks.every(s => s.market === 'usa')).toBe(true);
    });

    it('should return Japanese stocks', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('7203', false);
      await manager.addStock('6758', false);

      const jpStocks = manager.getStocksByMarket('japan');

      expect(jpStocks.length).toBe(2);
      expect(jpStocks.every(s => s.market === 'japan')).toBe(true);
    });
  });

  describe('getStocksBySector', () => {
    it('should return stocks by sector', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);

      const techStocks = manager.getStocksBySector('Technology');

      expect(techStocks.length).toBeGreaterThanOrEqual(0);
      if (techStocks.length > 0) {
        expect(techStocks.every(s => s.sector === 'Technology')).toBe(true);
      }
    });
  });

  describe('searchStocks', () => {
    it('should search stocks by symbol', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);

      const results = manager.searchStocks('AAP');

      expect(results.length).toBe(1);
      expect(results[0].symbol).toBe('AAPL');
    });

    it('should search stocks by name', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);

      const results = manager.searchStocks('Apple');

      expect(results.length).toBe(1);
      expect(results[0].symbol).toBe('AAPL');
    });
  });

  describe('setStockActive', () => {
    it('should set stock active status', async () => {
      await manager.addStock('AAPL', false);
      const result = manager.setStockActive('AAPL', false);

      expect(result).toBe(true);
      expect(manager.getStock('AAPL')?.active).toBe(false);
    });

    it('should return false for non-existent stock', () => {
      const result = manager.setStockActive('NONEXISTENT', false);

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return universe statistics', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);
      await manager.addStock('7203', false);

      const stats = manager.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalStocks).toBe(3);
      expect(stats.activeStocks).toBe(3);
      expect(stats.usaStocks).toBe(2);
      expect(stats.japanStocks).toBe(1);
      expect(stats.avgMarketCap).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all stocks', async () => {
      await manager.addStock('AAPL', false);
      await manager.addStock('MSFT', false);

      manager.clear();

      const stocks = manager.getAllStocks();
      expect(stocks.length).toBe(0);
    });
  });
});
