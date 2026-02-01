/**
 * SlippagePredictionService.test.ts
 * 
 * Unit tests for Slippage Prediction Service
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  SlippagePredictionService,
  resetGlobalSlippagePredictionService,
} from '../SlippagePredictionService';
import type { OrderBook } from '../SlippagePredictionService';

describe('SlippagePredictionService', () => {
  let service: SlippagePredictionService;

  beforeEach(() => {
    service = new SlippagePredictionService();
  });

  afterEach(() => {
    resetGlobalSlippagePredictionService();
  });

  const createMockOrderBook = (symbol: string): OrderBook => ({
    symbol,
    bids: [
      { price: 1995, size: 1000 },
      { price: 1990, size: 1500 },
      { price: 1985, size: 2000 },
    ],
    asks: [
      { price: 2000, size: 1000 },
      { price: 2005, size: 1500 },
      { price: 2010, size: 2000 },
    ],
    timestamp: Date.now(),
    spread: 5,
    midPrice: 1997.5,
  });

  describe('Order Book Management', () => {
    it('should update and retrieve order book', () => {
      const orderBook = createMockOrderBook('7203');
      service.updateOrderBook(orderBook);

      const retrieved = service.getOrderBook('7203');
      expect(retrieved).toBeDefined();
      expect(retrieved?.symbol).toBe('7203');
    });
  });

  describe('Slippage Estimation', () => {
    beforeEach(() => {
      service.updateOrderBook(createMockOrderBook('7203'));
    });

    it('should estimate slippage for small buy order', () => {
      const estimate = service.estimateSlippage('7203', 'BUY', 500);

      expect(estimate).toBeDefined();
      expect(estimate.expectedSlippage).toBeGreaterThanOrEqual(0);
      expect(estimate.expectedPrice).toBeGreaterThan(0);
      expect(estimate.confidence).toBeGreaterThan(0);
    });

    it('should estimate slippage for small sell order', () => {
      const estimate = service.estimateSlippage('7203', 'SELL', 500);

      expect(estimate).toBeDefined();
      expect(estimate.expectedSlippage).toBeGreaterThanOrEqual(0);
    });

    it('should recommend EXECUTE for small orders', () => {
      const estimate = service.estimateSlippage('7203', 'BUY', 500);

      expect(['EXECUTE', 'SPLIT']).toContain(estimate.recommendation);
    });

    it('should recommend SPLIT for large orders', () => {
      const estimate = service.estimateSlippage('7203', 'BUY', 5000);

      expect(['SPLIT', 'WAIT']).toContain(estimate.recommendation);
    });

    it('should return CANCEL for unknown symbol', () => {
      const estimate = service.estimateSlippage('UNKNOWN', 'BUY', 100);

      expect(estimate.recommendation).toBe('CANCEL');
      expect(estimate.confidence).toBe(0);
    });
  });

  describe('Large Order Slippage', () => {
    beforeEach(() => {
      service.updateOrderBook(createMockOrderBook('7203'));
    });

    it('should estimate higher slippage for large orders', () => {
      const smallOrder = service.estimateSlippage('7203', 'BUY', 100);
      const largeOrder = service.estimateLargeOrderSlippage('7203', 'BUY', 10000);

      expect(largeOrder.expectedSlippage).toBeGreaterThan(smallOrder.expectedSlippage);
    });

    it('should calculate market impact for large orders', () => {
      const estimate = service.estimateLargeOrderSlippage('7203', 'BUY', 10000);

      expect(estimate.marketImpact).toBeGreaterThan(0);
    });
  });

  describe('Market Depth Analysis', () => {
    beforeEach(() => {
      service.updateOrderBook(createMockOrderBook('7203'));
    });

    it('should analyze market depth', () => {
      const analysis = service.analyzeMarketDepth('7203');

      expect(analysis).toBeDefined();
      expect(analysis?.symbol).toBe('7203');
      expect(analysis?.totalBidVolume).toBeGreaterThan(0);
      expect(analysis?.totalAskVolume).toBeGreaterThan(0);
      expect(analysis?.liquidityScore).toBeGreaterThanOrEqual(0);
      expect(analysis?.liquidityScore).toBeLessThanOrEqual(1);
    });

    it('should return undefined for unknown symbol', () => {
      const analysis = service.analyzeMarketDepth('UNKNOWN');
      expect(analysis).toBeUndefined();
    });
  });

  describe('Optimal Order Size', () => {
    beforeEach(() => {
      service.updateOrderBook(createMockOrderBook('7203'));
    });

    it('should calculate optimal order size', () => {
      const optimalSize = service.calculateOptimalOrderSize('7203', 0.5);

      expect(optimalSize).toBeGreaterThan(0);
    });

    it('should return 0 for unknown symbol', () => {
      const optimalSize = service.calculateOptimalOrderSize('UNKNOWN', 0.5);
      expect(optimalSize).toBe(0);
    });
  });

  describe('Best Execution Time', () => {
    it('should return default time when no historical data', () => {
      const bestTime = service.getBestExecutionTime('7203');

      expect(bestTime).toBeDefined();
      expect(bestTime.hour).toBeGreaterThanOrEqual(0);
      expect(bestTime.hour).toBeLessThan(24);
      expect(bestTime.reason).toBeDefined();
    });

    it('should analyze historical patterns', () => {
      // Record some historical slippage
      service.recordSlippage('7203', 'BUY', 100, 2000, 2002);
      service.recordSlippage('7203', 'BUY', 100, 2000, 2001);

      const bestTime = service.getBestExecutionTime('7203');
      expect(bestTime.confidence).toBeGreaterThan(0);
    });
  });

  describe('Historical Data Management', () => {
    it('should record slippage data', () => {
      service.recordSlippage('7203', 'BUY', 100, 2000, 2002);

      const stats = service.getHistoricalStatistics('7203');
      expect(stats.sampleSize).toBe(1);
    });

    it('should calculate historical statistics', () => {
      service.recordSlippage('7203', 'BUY', 100, 2000, 2002);
      service.recordSlippage('7203', 'BUY', 100, 2000, 2001);
      service.recordSlippage('7203', 'BUY', 100, 2000, 2003);

      const stats = service.getHistoricalStatistics('7203');
      
      expect(stats.sampleSize).toBe(3);
      expect(stats.avgSlippage).toBeGreaterThanOrEqual(0);
      expect(stats.maxSlippage).toBeGreaterThanOrEqual(stats.avgSlippage);
      expect(stats.minSlippage).toBeLessThanOrEqual(stats.avgSlippage);
      expect(stats.stdDev).toBeGreaterThanOrEqual(0);
    });

    it('should maintain limited history window', () => {
      const service = new SlippagePredictionService({ historicalWindowSize: 5 });

      for (let i = 0; i < 10; i++) {
        service.recordSlippage('7203', 'BUY', 100, 2000, 2000 + i);
      }

      const stats = service.getHistoricalStatistics('7203');
      expect(stats.sampleSize).toBe(5);
    });

    it('should return empty stats for symbol without history', () => {
      const stats = service.getHistoricalStatistics('UNKNOWN');

      expect(stats.sampleSize).toBe(0);
      expect(stats.avgSlippage).toBe(0);
    });
  });
});
