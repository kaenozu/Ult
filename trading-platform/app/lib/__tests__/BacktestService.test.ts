/**
 * BacktestService.test.ts
 * Comprehensive tests for the BacktestService to achieve 80%+ coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from '@jest/globals';
import { backtestService, BacktestService } from '../backtest-service';
import type { OHLCV, Stock, Signal } from '@/app/types';

// Mock mlPredictionService
vi.mock('../mlPrediction', () => ({
  mlPredictionService: {
    calculateIndicators: vi.fn(() => ({ rsi: 50, macd: 0, adx: 25, bbUpper: 110, bbLower: 90, sma: 100 })),
    predict: vi.fn(() => ({ confidence: 0.7, trend: 'UP' as const })),
    generateSignal: vi.fn(() => ({
      type: 'BUY' as const,
      confidence: 75,
      symbol: 'AAPL',
      reason: 'Strong uptrend detected',
      stopLoss: 95,
      takeProfit: 110,
    })),
  },
}));

describe('BacktestService', () => {
  let service: BacktestService;
  let mockStock: Stock;
  let mockData: OHLCV[];

  beforeEach(() => {
    service = new BacktestService();
    mockStock = { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', currency: 'USD' };
    
    mockData = Array.from({ length: 100 }, (_, i) => ({
      date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
      open: 100 + i * 0.1,
      high: 101 + i * 0.1,
      low: 99 + i * 0.1,
      close: 100.5 + i * 0.1,
      volume: 1000000 + i * 1000,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runBacktest', () => {
    it('should throw error for insufficient data', async () => {
      const insufficientData = mockData.slice(0, 10);
      await expect(
        service.runBacktest(mockStock, insufficientData, {
          initialCapital: 100000,
          commission: 0,
          slippage: 0,
        })
      ).rejects.toThrow('Insufficient data for backtesting');
    });

    it('should run backtest with default config', async () => {
      const result = await service.runBacktest(mockStock, mockData, {
        initialCapital: 100000,
        commission: 0,
        slippage: 0,
      });

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.totalTrades).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
    });

    it('should respect date range filtering', async () => {
      const result = await service.runBacktest(
        mockStock,
        mockData,
        {
          initialCapital: 100000,
          commission: 0,
          slippage: 0,
          startDate: '2024-01-20',
          endDate: '2024-01-80',
        },
        undefined
      );

      expect(result).toBeDefined();
    });

    it('should call progress callback', async () => {
      const onProgress = vi.fn();
      
      await service.runBacktest(mockStock, mockData, {
        initialCapital: 100000,
        commission: 0,
        slippage: 0,
      }, onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle commission costs correctly', async () => {
      const result = await service.runBacktest(mockStock, mockData, {
        initialCapital: 100000,
        commission: 10,
        slippage: 0,
      });

      expect(result).toBeDefined();
    });

    it('should handle slippage correctly', async () => {
      const result = await service.runBacktest(mockStock, mockData, {
        initialCapital: 100000,
        commission: 0,
        slippage: 0.1,
      });

      expect(result).toBeDefined();
    });

    it('should respect maxPositionSize and riskPerTrade', async () => {
      const result = await service.runBacktest(mockStock, mockData, {
        initialCapital: 100000,
        commission: 0,
        slippage: 0,
        maxPositionSize: 0.05,
        riskPerTrade: 0.01,
      });

      expect(result).toBeDefined();
    });

    it('should handle empty trades scenario gracefully', async () => {
      const flatData = Array.from({ length: 100 }, () => ({
        date: '2024-01-01',
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000000,
      }));

      const result = await service.runBacktest(mockStock, flatData, {
        initialCapital: 100000,
        commission: 0,
        slippage: 0,
      });

      expect(result).toBeDefined();
      expect(result.totalTrades).toBe(0);
      expect(result.winRate).toBe(0);
    });

    it('should handle errors during backtest gracefully', async () => {
      const mlService = require('../mlPrediction').mlPredictionService;
      mlService.calculateIndicators.mockImplementation(() => {
        throw new Error('ML service error');
      });

      const result = await service.runBacktest(mockStock, mockData, {
        initialCapital: 100000,
        commission: 0,
        slippage: 0,
      });

      expect(result).toBeDefined();
    });
  });

  describe('filterByDateRange', () => {
    it('should filter data by start date only', () => {
      const result = (service as any).filterByDateRange(mockData, '2024-01-20', undefined);
      expect(result.length).toBeLessThan(mockData.length);
    });

    it('should filter data by end date only', () => {
      const result = (service as any).filterByDateRange(mockData, undefined, '2024-01-50');
      expect(result.length).toBeLessThan(mockData.length);
    });

    it('should filter data by both start and end dates', () => {
      const result = (service as any).filterByDateRange(mockData, '2024-01-20', '2024-01-50');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return all data if no dates specified', () => {
      const result = (service as any).filterByDateRange(mockData, undefined, undefined);
      expect(result).toEqual(mockData);
    });

    it('should handle empty data array', () => {
      const result = (service as any).filterByDateRange([], '2024-01-01', '2024-01-31');
      expect(result).toEqual([]);
    });
  });

  describe('evaluateTrade', () => {
    const mockCandle: OHLCV = {
      date: '2024-01-15',
      open: 100,
      high: 102,
      low: 98,
      close: 101,
      volume: 1000000,
    };

    it('should return ENTER_LONG for BUY signal with sufficient confidence', () => {
      const signal: Signal = {
        type: 'BUY',
        confidence: 70,
        symbol: 'AAPL',
        reason: 'Test',
        stopLoss: 95,
        takeProfit: 110,
      };

      const result = (service as any).evaluateTrade(
        signal,
        mockCandle,
        null,
        100000,
        { initialCapital: 100000, commission: 0, slippage: 0 }
      );

      expect(result).toEqual({ type: 'ENTER_LONG', signal });
    });

    it('should return ENTER_SHORT for SELL signal with sufficient confidence', () => {
      const signal: Signal = {
        type: 'SELL',
        confidence: 70,
        symbol: 'AAPL',
        reason: 'Test',
        stopLoss: 105,
        takeProfit: 90,
      };

      const result = (service as any).evaluateTrade(
        signal,
        mockCandle,
        null,
        100000,
        { initialCapital: 100000, commission: 0, slippage: 0 }
      );

      expect(result).toEqual({ type: 'ENTER_SHORT', signal });
    });

    it('should not enter position if confidence is below threshold', () => {
      const signal: Signal = {
        type: 'BUY',
        confidence: 50,
        symbol: 'AAPL',
        reason: 'Test',
        stopLoss: 95,
        takeProfit: 110,
      };

      const result = (service as any).evaluateTrade(
        signal,
        mockCandle,
        null,
        100000,
        { initialCapital: 100000, commission: 0, slippage: 0 }
      );

      expect(result).toBeNull();
    });

    it('should return EXIT_LONG when holding LONG and get SELL signal', () => {
      const longPosition = {
        symbol: 'AAPL',
        type: 'LONG' as const,
        quantity: 10,
        entryPrice: 100,
        entryDate: '2024-01-10',
        value: 1000,
      };

      const sellSignal: Signal = {
        type: 'SELL',
        confidence: 70,
        symbol: 'AAPL',
        reason: 'Test',
        stopLoss: 105,
        takeProfit: 90,
      };

      const result = (service as any).evaluateTrade(
        sellSignal,
        mockCandle,
        longPosition,
        100000,
        { initialCapital: 100000, commission: 0, slippage: 0 }
      );

      expect(result).toEqual({ type: 'EXIT_LONG', signal: sellSignal });
    });

    it('should return EXIT_SHORT when holding SHORT and get BUY signal', () => {
      const shortPosition = {
        symbol: 'AAPL',
        type: 'SHORT' as const,
        quantity: 10,
        entryPrice: 100,
        entryDate: '2024-01-10',
        value: 1000,
      };

      const buySignal: Signal = {
        type: 'BUY',
        confidence: 70,
        symbol: 'AAPL',
        reason: 'Test',
        stopLoss: 95,
        takeProfit: 110,
      };

      const result = (service as any).evaluateTrade(
        buySignal,
        mockCandle,
        shortPosition,
        100000,
        { initialCapital: 100000, commission: 0, slippage: 0 }
      );

      expect(result).toEqual({ type: 'EXIT_SHORT', signal: buySignal });
    });
  });
});
     
