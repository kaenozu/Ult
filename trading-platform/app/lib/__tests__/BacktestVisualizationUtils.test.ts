/**
 * BacktestVisualizationUtils.test.ts
 * 
 * Comprehensive unit tests for BacktestVisualizationUtils
 * Tests cumulative returns, trade distribution, monthly performance, and visualization data
 */

import { describe, it, expect } from '@jest/globals';
import { BacktestVisualizationUtils } from '../BacktestVisualizationUtils';
import type { BacktestResult, BacktestTrade } from '@/app/types';

describe('BacktestVisualizationUtils', () => {
  const createMockTrade = (overrides?: Partial<BacktestTrade>): BacktestTrade => ({
    symbol: '^N225',
    entryDate: '2024-01-01',
    exitDate: '2024-01-02',
    entryPrice: 30000,
    exitPrice: 30300,
    quantity: 100,
    profitPercent: 1.0,
    profit: 300,
    type: 'BUY',
    ...overrides,
  });

  const createMockBacktestResult = (trades: BacktestTrade[]): BacktestResult => ({
    trades,
    metrics: {
      totalTrades: trades.length,
      winRate: 50,
      profitFactor: 1.5,
      sharpeRatio: 1.2,
      maxDrawdown: 10,
      totalReturn: 10,
      averageProfit: 100,
      averageLoss: -50,
    },
    equityCurve: [],
  });

  describe('calculateCumulativeReturns', () => {
    it('should calculate cumulative returns for winning trades', () => {
      const trades = [
        createMockTrade({ profitPercent: 5 }),
        createMockTrade({ profitPercent: 3 }),
        createMockTrade({ profitPercent: 2 }),
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns).toHaveLength(3);
      expect(returns[0].returnPercent).toBeGreaterThan(0);
      expect(returns[1].returnPercent).toBeGreaterThan(returns[0].returnPercent);
      expect(returns[2].returnPercent).toBeGreaterThan(returns[1].returnPercent);
    });

    it('should calculate drawdown correctly', () => {
      const trades = [
        createMockTrade({ profitPercent: 10, exitDate: '2024-01-01' }), // Peak
        createMockTrade({ profitPercent: -5, exitDate: '2024-01-02' }), // Drawdown
        createMockTrade({ profitPercent: -3, exitDate: '2024-01-03' }), // More drawdown
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns[0].drawdown).toBe(0); // At peak
      expect(returns[1].drawdown).toBeGreaterThan(0); // In drawdown
      expect(returns[2].drawdown).toBeGreaterThan(returns[1].drawdown); // Deeper drawdown
    });

    it('should handle zero profit trades', () => {
      const trades = [
        createMockTrade({ profitPercent: 0 }),
        createMockTrade({ profitPercent: 0 }),
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns).toHaveLength(2);
      expect(returns[0].returnPercent).toBe(0);
      expect(returns[1].returnPercent).toBe(0);
    });

    it('should handle negative profit trades', () => {
      const trades = [
        createMockTrade({ profitPercent: -5 }),
        createMockTrade({ profitPercent: -3 }),
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns).toHaveLength(2);
      expect(returns[0].returnPercent).toBeLessThan(0);
      expect(returns[1].returnPercent).toBeLessThan(returns[0].returnPercent);
    });

    it('should start equity at 100', () => {
      const trades = [createMockTrade({ profitPercent: 5 })];
      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns[0].equity).toBeCloseTo(105, 1);
    });

    it('should include date and index information', () => {
      const trades = [
        createMockTrade({ exitDate: '2024-01-05' }),
        createMockTrade({ exitDate: '2024-01-10' }),
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns[0]).toHaveProperty('date');
      expect(returns[0]).toHaveProperty('index');
      expect(returns[0].index).toBe(0);
      expect(returns[1].index).toBe(1);
    });

    it('should handle missing exitDate gracefully', () => {
      const trades = [
        createMockTrade({ exitDate: undefined, entryDate: '2024-01-01' }),
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns[0].date).toBe('2024-01-01');
    });
  });

  describe('calculateTradeDistribution', () => {
    it('should create histogram bins for trade profits', () => {
      const trades = Array.from({ length: 100 }, (_, i) =>
        createMockTrade({ profitPercent: (i - 50) * 0.1 }) // -5% to +5%
      );

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result, 10);

      expect(distribution.bins).toHaveLength(10);
      expect(distribution.bins.every(b => b.count >= 0)).toBe(true);
      
      const totalCount = distribution.bins.reduce((sum, b) => sum + b.count, 0);
      expect(totalCount).toBe(100);
    });

    it('should calculate average profit', () => {
      const trades = [
        createMockTrade({ profitPercent: 5 }),
        createMockTrade({ profitPercent: 3 }),
        createMockTrade({ profitPercent: 2 }),
      ];

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);

      expect(distribution.avg).toBeCloseTo(3.33, 1);
    });

    it('should calculate median profit', () => {
      const trades = [
        createMockTrade({ profitPercent: 1 }),
        createMockTrade({ profitPercent: 2 }),
        createMockTrade({ profitPercent: 3 }),
        createMockTrade({ profitPercent: 4 }),
        createMockTrade({ profitPercent: 5 }),
      ];

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);

      expect(distribution.median).toBe(3);
    });

    it('should calculate median for even number of trades', () => {
      const trades = [
        createMockTrade({ profitPercent: 1 }),
        createMockTrade({ profitPercent: 2 }),
        createMockTrade({ profitPercent: 3 }),
        createMockTrade({ profitPercent: 4 }),
      ];

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);

      expect(distribution.median).toBe(2.5);
    });

    it('should calculate standard deviation', () => {
      const trades = [
        createMockTrade({ profitPercent: 1 }),
        createMockTrade({ profitPercent: 2 }),
        createMockTrade({ profitPercent: 3 }),
      ];

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);

      expect(distribution.stdDev).toBeGreaterThan(0);
    });

    it('should handle empty trades', () => {
      const result = createMockBacktestResult([]);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);

      expect(distribution.bins).toEqual([]);
      expect(distribution.avg).toBe(0);
      expect(distribution.median).toBe(0);
      expect(distribution.stdDev).toBe(0);
    });

    it('should handle custom bin count', () => {
      const trades = Array.from({ length: 50 }, (_, i) =>
        createMockTrade({ profitPercent: i })
      );

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result, 5);

      expect(distribution.bins).toHaveLength(5);
    });

    it('should include edge values in bins correctly', () => {
      const trades = [
        createMockTrade({ profitPercent: -10 }),
        createMockTrade({ profitPercent: 0 }),
        createMockTrade({ profitPercent: 10 }),
      ];

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result, 3);

      const totalCount = distribution.bins.reduce((sum, b) => sum + b.count, 0);
      expect(totalCount).toBe(3);
    });
  });

  describe('calculateMonthlyPerformance', () => {
    it('should group trades by month', () => {
      const trades = [
        createMockTrade({ exitDate: '2024-01-05', profitPercent: 5 }),
        createMockTrade({ exitDate: '2024-01-15', profitPercent: 3 }),
        createMockTrade({ exitDate: '2024-02-05', profitPercent: 2 }),
      ];

      const result = createMockBacktestResult(trades);
      const monthly = BacktestVisualizationUtils.calculateMonthlyPerformance(result);

      expect(monthly).toHaveLength(2); // January and February
      expect(monthly[0].trades).toBe(2); // 2 trades in January
      expect(monthly[1].trades).toBe(1); // 1 trade in February
    });

    it('should calculate monthly return percentage', () => {
      const trades = [
        createMockTrade({ exitDate: '2024-01-05', profitPercent: 5 }),
        createMockTrade({ exitDate: '2024-01-15', profitPercent: 5 }),
      ];

      const result = createMockBacktestResult(trades);
      const monthly = BacktestVisualizationUtils.calculateMonthlyPerformance(result);

      expect(monthly[0].returnPercent).toBeGreaterThan(0);
    });

    it('should calculate monthly win rate', () => {
      const trades = [
        createMockTrade({ exitDate: '2024-01-05', profitPercent: 5 }),
        createMockTrade({ exitDate: '2024-01-15', profitPercent: -3 }),
        createMockTrade({ exitDate: '2024-01-25', profitPercent: 2 }),
      ];

      const result = createMockBacktestResult(trades);
      const monthly = BacktestVisualizationUtils.calculateMonthlyPerformance(result);

      expect(monthly[0].winRate).toBeCloseTo(66.67, 1); // 2 wins out of 3
    });

    it('should handle trades across multiple months', () => {
      const trades = [
        createMockTrade({ exitDate: '2024-01-01', profitPercent: 1 }),
        createMockTrade({ exitDate: '2024-02-01', profitPercent: 2 }),
        createMockTrade({ exitDate: '2024-03-01', profitPercent: 3 }),
      ];

      const result = createMockBacktestResult(trades);
      const monthly = BacktestVisualizationUtils.calculateMonthlyPerformance(result);

      expect(monthly).toHaveLength(3);
      expect(monthly.map(m => m.trades)).toEqual([1, 1, 1]);
    });

    it('should handle empty trades', () => {
      const result = createMockBacktestResult([]);
      const monthly = BacktestVisualizationUtils.calculateMonthlyPerformance(result);

      expect(monthly).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing profitPercent in trades', () => {
      const trades = [
        createMockTrade({ profitPercent: undefined }),
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns).toHaveLength(1);
      expect(returns[0].returnPercent).toBe(0);
    });

    it('should handle invalid dates', () => {
      const trades = [
        createMockTrade({ exitDate: 'invalid-date' }),
      ];

      const result = createMockBacktestResult(trades);
      const monthly = BacktestVisualizationUtils.calculateMonthlyPerformance(result);

      // Should handle gracefully
      expect(Array.isArray(monthly)).toBe(true);
    });

    it('should handle very large profit percentages', () => {
      const trades = [
        createMockTrade({ profitPercent: 1000 }),
        createMockTrade({ profitPercent: 2000 }),
      ];

      const result = createMockBacktestResult(trades);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);

      expect(distribution.avg).toBeGreaterThan(0);
      expect(Number.isFinite(distribution.stdDev)).toBe(true);
    });

    it('should handle negative profit percentages', () => {
      const trades = [
        createMockTrade({ profitPercent: -50 }),
        createMockTrade({ profitPercent: -30 }),
      ];

      const result = createMockBacktestResult(trades);
      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);

      expect(returns[0].equity).toBeLessThan(100);
      expect(returns[1].equity).toBeLessThan(returns[0].equity);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete backtest lifecycle', () => {
      const trades = Array.from({ length: 100 }, (_, i) => {
        const date = new Date(2024, 0, 1 + i);
        return createMockTrade({
          exitDate: date.toISOString().split('T')[0],
          profitPercent: (Math.random() - 0.5) * 10, // -5% to +5%
        });
      });

      const result = createMockBacktestResult(trades);

      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);
      const monthly = BacktestVisualizationUtils.calculateMonthlyPerformance(result);

      expect(returns).toHaveLength(100);
      expect(distribution.bins.length).toBeGreaterThan(0);
      expect(monthly.length).toBeGreaterThan(0);
    });

    it('should maintain consistency across calculations', () => {
      const trades = [
        createMockTrade({ exitDate: '2024-01-05', profitPercent: 10 }),
        createMockTrade({ exitDate: '2024-01-10', profitPercent: -5 }),
        createMockTrade({ exitDate: '2024-01-15', profitPercent: 3 }),
      ];

      const result = createMockBacktestResult(trades);

      const returns = BacktestVisualizationUtils.calculateCumulativeReturns(result);
      const distribution = BacktestVisualizationUtils.calculateTradeDistribution(result);

      // Total trades should be consistent
      expect(returns).toHaveLength(trades.length);
      
      const totalDistCount = distribution.bins.reduce((sum, b) => sum + b.count, 0);
      expect(totalDistCount).toBe(trades.length);
    });
  });
});
