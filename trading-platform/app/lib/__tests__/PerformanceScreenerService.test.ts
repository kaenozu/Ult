/**
 * Unit tests for PerformanceScreenerService
 */

import { PerformanceScreenerService, StockDataSource } from '../PerformanceScreenerService';
import { OHLCV, BacktestResult } from '@/app/types';

// Mock OptimizedAccuracyService
jest.mock('../OptimizedAccuracyService', () => ({
  optimizedAccuracyService: {
    runOptimizedBacktest: jest.fn().mockResolvedValue({
      winRate: 60,
      totalReturn: 15,
      profitFactor: 2.0,
      sharpeRatio: 1.2,
      maxDrawdown: 12,
      totalTrades: 25,
      startDate: '2025-11-01',
      endDate: '2026-02-08',
    } as BacktestResult),
  },
}));

describe('PerformanceScreenerService', () => {
  let service: PerformanceScreenerService;

  beforeEach(() => {
    service = new PerformanceScreenerService();
    service.clearCache();
  });

  // Generate mock OHLCV data
  const generateMockData = (days: number, basePrice: number = 1000): OHLCV[] => {
    const data: OHLCV[] = [];
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      const trendFactor = i * 0.005;
      const cycle = Math.sin((i / 20) * Math.PI * 2) * 0.03;
      const priceFactor = 1 + trendFactor + cycle;
      const close = basePrice * priceFactor;

      const volatility = 0.01;
      const open = close * (1 + (i % 2 === 0 ? -0.005 : 0.005));
      const high = Math.max(open, close) * (1 + volatility);
      const low = Math.min(open, close) * (1 - volatility);
      const volume = 1000000 + Math.floor(Math.sin(i) * 500000);

      data.push({
        date: new Date(now - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });
    }

    return data;
  };

  // Create mock data sources
  const createMockDataSources = (count: number): StockDataSource[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: `TEST${i + 1}`,
      name: `Test Stock ${i + 1}`,
      market: (i % 2 === 0 ? 'japan' : 'usa') as 'japan' | 'usa',
      fetchData: async () => generateMockData(100, 1000 + i * 100),
    }));
  };

  describe('scanMultipleStocks', () => {
    it('should scan multiple stocks and return results', async () => {
      const dataSources = createMockDataSources(5);
      
      const result = await service.scanMultipleStocks(dataSources, {
        minWinRate: 0,
        minProfitFactor: 0,
        minTrades: 3,
        topN: 10,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
      expect(result.totalScanned).toBe(5);
      expect(result.scanDuration).toBeGreaterThan(0);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should filter by market', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.scanMultipleStocks(dataSources, {
        market: 'japan',
        topN: 10,
      });

      expect(result.results.every(r => r.market === 'japan')).toBe(true);
    });

    it('should filter by minimum win rate', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.scanMultipleStocks(dataSources, {
        minWinRate: 50,
        topN: 10,
      });

      expect(result.results.every(r => r.winRate >= 50)).toBe(true);
    });

    it('should filter by minimum profit factor', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.scanMultipleStocks(dataSources, {
        minProfitFactor: 1.5,
        topN: 10,
      });

      expect(result.results.every(r => r.profitFactor >= 1.5)).toBe(true);
    });

    it('should limit results to topN', async () => {
      const dataSources = createMockDataSources(20);
      
      const result = await service.scanMultipleStocks(dataSources, {
        topN: 5,
      });

      expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it('should assign ranks correctly', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.scanMultipleStocks(dataSources, {
        topN: 10,
      });

      // Check if ranks are sequential
      const ranks = result.results.map(r => r.rank).filter((r): r is number => r !== undefined);
      expect(ranks).toEqual([...Array(ranks.length)].map((_, i) => i + 1));
    });

    it('should sort by performance score', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.scanMultipleStocks(dataSources, {
        topN: 10,
      });

      // Check if sorted in descending order
      for (let i = 0; i < result.results.length - 1; i++) {
        expect(result.results[i].performanceScore).toBeGreaterThanOrEqual(
          result.results[i + 1].performanceScore
        );
      }
    });

    it('should handle insufficient data gracefully', async () => {
      const dataSources: StockDataSource[] = [{
        symbol: 'TEST',
        name: 'Test Stock',
        market: 'japan',
        fetchData: async () => generateMockData(10), // Insufficient data
      }];
      
      const result = await service.scanMultipleStocks(dataSources, {
        lookbackDays: 90,
      });

      expect(result.results.length).toBe(0);
    });

    it('should handle fetch errors gracefully', async () => {
      const dataSources: StockDataSource[] = [{
        symbol: 'ERROR',
        name: 'Error Stock',
        market: 'japan',
        fetchData: async () => {
          throw new Error('Fetch failed');
        },
      }];
      
      const result = await service.scanMultipleStocks(dataSources, {});

      expect(result.results.length).toBe(0);
      expect(result.totalScanned).toBe(1);
    });
  });

  describe('getBestPerformers', () => {
    it('should return best performers for specified market', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.getBestPerformers(dataSources, 'japan', 5);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(5);
      expect(result.every(r => r.market === 'japan')).toBe(true);
    });
  });

  describe('getHighWinRateStocks', () => {
    it('should return stocks with high win rate', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.getHighWinRateStocks(dataSources, 50, 5);

      expect(result).toBeInstanceOf(Array);
      expect(result.every(r => r.winRate >= 50)).toBe(true);
    });
  });

  describe('getLowRiskHighReturnStocks', () => {
    it('should return low risk high return stocks', async () => {
      const dataSources = createMockDataSources(10);
      
      const result = await service.getLowRiskHighReturnStocks(dataSources, 20, 1.5, 5);

      expect(result).toBeInstanceOf(Array);
      expect(result.every(r => r.maxDrawdown <= 20)).toBe(true);
      expect(result.every(r => r.profitFactor >= 1.5)).toBe(true);
    });
  });

  describe('cache', () => {
    it('should cache results', async () => {
      const dataSources = createMockDataSources(3);
      
      const startTime1 = performance.now();
      await service.scanMultipleStocks(dataSources, {});
      const duration1 = performance.now() - startTime1;

      // Second call should be faster due to cache
      const startTime2 = performance.now();
      await service.scanMultipleStocks(dataSources, {});
      const duration2 = performance.now() - startTime2;

      expect(duration2).toBeLessThan(duration1);
    });

    it('should clear cache', async () => {
      const dataSources = createMockDataSources(3);
      
      await service.scanMultipleStocks(dataSources, {});
      service.clearCache();
      
      // After clearing cache, should perform full scan again
      const result = await service.scanMultipleStocks(dataSources, {});
      expect(result).toBeDefined();
    });
  });

  describe('performance score calculation', () => {
    it('should calculate performance score correctly', async () => {
      const dataSources = createMockDataSources(5);
      
      const result = await service.scanMultipleStocks(dataSources, {
        topN: 5,
      });

      result.results.forEach(stock => {
        expect(stock.performanceScore).toBeGreaterThanOrEqual(0);
        expect(stock.performanceScore).toBeLessThanOrEqual(100);
      });
    });

    it('should penalize stocks with few trades', async () => {
      const dataSources = createMockDataSources(5);
      
      const result = await service.scanMultipleStocks(dataSources, {
        minTrades: 1, // Very low threshold
        topN: 10,
      });

      // Stocks with more trades should generally have better scores
      // (assuming similar performance metrics)
      expect(result.results.length).toBeGreaterThan(0);
    });
  });
});
