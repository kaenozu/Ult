/**
 * PartialFillSimulator.test.ts
 *
 * Unit tests for PartialFillSimulator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PartialFillSimulator,
  DEFAULT_PARTIAL_FILL_CONFIG,
  simulateMultiBarFill,
  adjustConfigForLiquidity,
} from '../PartialFillSimulator';
import { OHLCV } from '@/app/types';

describe('PartialFillSimulator', () => {
  let simulator: PartialFillSimulator;
  let mockBar: OHLCV;

  beforeEach(() => {
    simulator = new PartialFillSimulator();
    mockBar = {
      date: '2024-01-01T10:00:00Z',
      open: 100,
      high: 102,
      low: 99,
      close: 101,
      volume: 1000000,
    };
  });

  describe('Basic Fill Simulation', () => {
    it('should fully fill small orders', () => {
      const result = simulator.simulateFill(100, 1000, 'BUY', mockBar, 0);

      // Order is 0.1% of volume, should be fully filled
      expect(result.fillRate).toBe(1.0);
      expect(result.filledQuantity).toBe(1000);
      expect(result.remainingQuantity).toBe(0);
    });

    it('should partially fill large orders', () => {
      const result = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);

      // Order is 20% of volume, should be partially filled
      expect(result.fillRate).toBeLessThan(1.0);
      expect(result.filledQuantity).toBeLessThan(200000);
      expect(result.remainingQuantity).toBeGreaterThan(0);
    });

    it('should calculate market impact for large orders', () => {
      const smallOrder = simulator.simulateFill(100, 1000, 'BUY', mockBar, 0);
      const largeOrder = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);

      expect(largeOrder.marketImpact).toBeGreaterThan(smallOrder.marketImpact);
    });

    it('should apply market impact to price', () => {
      const price = 100;
      const result = simulator.simulateFill(price, 200000, 'BUY', mockBar, 0);

      // Buy orders should have higher fill price due to impact
      expect(result.fillPrice).toBeGreaterThan(price);
    });
  });

  describe('Fill Rate Models', () => {
    it('should use linear fill rate model', () => {
      simulator.updateConfig({ fillRateModel: 'linear' });
      const result = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);

      expect(result.fillRate).toBeGreaterThan(0);
      expect(result.fillRate).toBeLessThanOrEqual(1);
    });

    it('should use exponential fill rate model', () => {
      simulator.updateConfig({ fillRateModel: 'exponential' });
      const result = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);

      expect(result.fillRate).toBeGreaterThan(0);
      expect(result.fillRate).toBeLessThanOrEqual(1);
    });

    it('should use custom fill rate function', () => {
      const customFunction = (ratio: number) => Math.max(0.1, 1 - ratio);
      simulator.updateConfig({
        fillRateModel: 'custom',
        customFillRateFunction: customFunction,
      });

      const result = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);
      expect(result.fillRate).toBeGreaterThan(0);
    });
  });

  describe('Order Queueing', () => {
    it('should create carryover order for unfilled quantity', () => {
      const result = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);

      if (result.remainingQuantity > 0) {
        expect(result.carryoverOrder).toBeDefined();
        expect(result.carryoverOrder?.quantity).toBe(result.remainingQuantity);
      }
    });

    it('should process queued orders in subsequent bars', () => {
      // First bar: partial fill
      const firstResult = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);
      expect(firstResult.remainingQuantity).toBeGreaterThan(0);

      // Second bar: process queue
      const queueResults = simulator.processQueuedOrders(mockBar, 1);
      expect(queueResults.length).toBeGreaterThan(0);
    });

    it('should cancel orders after max queue duration', () => {
      simulator.updateConfig({ maxQueueDuration: 2 });

      // Create order at bar 0
      simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);

      // Process at bar 3 (exceeds max duration)
      const queueResults = simulator.processQueuedOrders(mockBar, 3);
      
      const status = simulator.getQueueStatus();
      expect(status.totalOrders).toBe(0); // Should be cancelled
    });

    it('should track bars in queue', () => {
      simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);
      simulator.processQueuedOrders(mockBar, 1);

      const status = simulator.getQueueStatus();
      if (status.totalOrders > 0) {
        expect(status.orders[0].barsInQueue).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Queue Management', () => {
    it('should clear queue', () => {
      simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);
      
      let status = simulator.getQueueStatus();
      expect(status.totalOrders).toBeGreaterThan(0);

      simulator.clearQueue();
      
      status = simulator.getQueueStatus();
      expect(status.totalOrders).toBe(0);
    });

    it('should get queue status', () => {
      simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);
      simulator.simulateFill(100, 150000, 'SELL', mockBar, 0);

      const status = simulator.getQueueStatus();
      expect(status.totalOrders).toBeGreaterThan(0);
      expect(status.totalQuantity).toBeGreaterThan(0);
      expect(status.orders.length).toBe(status.totalOrders);
    });
  });

  describe('Multi-Bar Simulation', () => {
    it('should simulate fills across multiple bars', () => {
      const bars: OHLCV[] = Array(5).fill(null).map((_, i) => ({
        date: `2024-01-0${i + 1}T10:00:00Z`,
        open: 100,
        high: 102,
        low: 99,
        close: 101,
        volume: 1000000,
      }));

      const result = simulateMultiBarFill(100, 500000, 'BUY', bars, 0, simulator);

      expect(result.totalFilled).toBeGreaterThan(0);
      expect(result.fills.length).toBeGreaterThan(0);
      expect(result.averagePrice).toBeGreaterThan(0);
    });

    it('should use multiple bars for very large orders', () => {
      const bars: OHLCV[] = Array(10).fill(null).map((_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        open: 100,
        high: 102,
        low: 99,
        close: 101,
        volume: 1000000,
      }));

      const result = simulateMultiBarFill(100, 1000000, 'BUY', bars, 0, simulator);

      expect(result.barsUsed).toBeGreaterThan(1);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      simulator.updateConfig({
        liquidityThreshold: 0.2,
        minImmediateFillRate: 0.3,
      });

      const config = simulator.getConfig();
      expect(config.liquidityThreshold).toBe(0.2);
      expect(config.minImmediateFillRate).toBe(0.3);
    });

    it('should get current configuration', () => {
      const config = simulator.getConfig();
      expect(config.liquidityThreshold).toBeDefined();
      expect(config.fillRateModel).toBeDefined();
    });
  });

  describe('Liquidity Adjustment', () => {
    it('should adjust config for high liquidity', () => {
      const config = adjustConfigForLiquidity(0.9);

      expect(config.liquidityThreshold).toBeGreaterThan(DEFAULT_PARTIAL_FILL_CONFIG.liquidityThreshold);
      expect(config.minImmediateFillRate).toBeGreaterThan(DEFAULT_PARTIAL_FILL_CONFIG.minImmediateFillRate);
    });

    it('should adjust config for low liquidity', () => {
      const config = adjustConfigForLiquidity(0.2);

      expect(config.liquidityThreshold).toBeLessThan(DEFAULT_PARTIAL_FILL_CONFIG.liquidityThreshold);
      expect(config.maxQueueDuration).toBeGreaterThan(DEFAULT_PARTIAL_FILL_CONFIG.maxQueueDuration);
    });

    it('should adjust config for medium liquidity', () => {
      const config = adjustConfigForLiquidity(0.5);

      expect(config.liquidityThreshold).toBe(0.1);
      expect(config.minImmediateFillRate).toBe(0.2);
    });
  });

  describe('Side-Specific Behavior', () => {
    it('should handle buy orders', () => {
      const result = simulator.simulateFill(100, 200000, 'BUY', mockBar, 0);

      expect(result.filledQuantity).toBeGreaterThan(0);
      // Buy orders push price up
      if (result.marketImpact > 0) {
        expect(result.fillPrice).toBeGreaterThan(100);
      }
    });

    it('should handle sell orders', () => {
      const result = simulator.simulateFill(100, 200000, 'SELL', mockBar, 0);

      expect(result.filledQuantity).toBeGreaterThan(0);
      // Sell orders push price down
      if (result.marketImpact > 0) {
        expect(result.fillPrice).toBeLessThan(100);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero volume', () => {
      const zeroVolumeBar = { ...mockBar, volume: 0 };
      const result = simulator.simulateFill(100, 1000, 'BUY', zeroVolumeBar, 0);

      // Should still attempt to fill with default behavior
      expect(result.filledQuantity).toBeGreaterThanOrEqual(0);
    });

    it('should handle very small orders', () => {
      const result = simulator.simulateFill(100, 1, 'BUY', mockBar, 0);

      expect(result.fillRate).toBe(1.0);
      expect(result.filledQuantity).toBe(1);
    });

    it('should handle orders equal to threshold', () => {
      const thresholdQuantity = mockBar.volume * DEFAULT_PARTIAL_FILL_CONFIG.liquidityThreshold;
      const result = simulator.simulateFill(100, thresholdQuantity, 'BUY', mockBar, 0);

      expect(result.filledQuantity).toBeGreaterThan(0);
    });
  });
});
