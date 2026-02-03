/**
 * LatencySimulator.test.ts
 *
 * Unit tests for LatencySimulator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  LatencySimulator,
  DEFAULT_LATENCY_CONFIG,
  getLatencyPreset,
  calculateLatencyStatistics,
  calculateBacktestLatency,
} from '../LatencySimulator';

describe('LatencySimulator', () => {
  let simulator: LatencySimulator;

  beforeEach(() => {
    simulator = new LatencySimulator();
  });

  describe('Basic Latency Calculation', () => {
    it('should calculate total latency', () => {
      const result = simulator.calculateLatency();

      expect(result.totalLatency).toBeGreaterThan(0);
      expect(result.breakdown.api).toBeGreaterThan(0);
      expect(result.breakdown.execution).toBeGreaterThan(0);
      expect(result.breakdown.network).toBeGreaterThan(0);
    });

    it('should include market data latency', () => {
      const result = simulator.calculateLatency();

      expect(result.breakdown.marketData).toBeGreaterThanOrEqual(0);
    });

    it('should calculate latency slippage impact', () => {
      const result = simulator.calculateLatency();

      expect(result.latencySlippage).toBeGreaterThanOrEqual(0);
      // Should be proportional to total latency
      const expectedSlippage = (result.totalLatency / 1000) * DEFAULT_LATENCY_CONFIG.latencySlippageImpact;
      expect(result.latencySlippage).toBeCloseTo(expectedSlippage, 5);
    });

    it('should set simulated execution time', () => {
      const currentTime = Date.now();
      const result = simulator.calculateLatency(currentTime);

      expect(result.simulatedExecutionTime).toBeGreaterThan(currentTime);
      expect(result.simulatedExecutionTime).toBe(currentTime + result.totalLatency);
    });
  });

  describe('Order Submission and Execution', () => {
    it('should submit order and return latency', () => {
      const submission = simulator.submitOrder(100, 10, 'BUY');

      expect(submission.orderId).toBeDefined();
      expect(submission.latency.totalLatency).toBeGreaterThan(0);
    });

    it('should queue delayed orders', () => {
      simulator.submitOrder(100, 10, 'BUY');
      simulator.submitOrder(110, 20, 'SELL');

      const status = simulator.getPendingOrdersStatus();
      expect(status.totalOrders).toBe(2);
    });

    it('should retrieve executable orders at specified time', () => {
      const currentTime = Date.now();
      simulator.submitOrder(100, 10, 'BUY', currentTime);

      // Check immediately - should be empty
      const immediate = simulator.getExecutableOrders(currentTime);
      expect(immediate.length).toBe(0);

      // Check after latency period
      const future = currentTime + 5000; // 5 seconds later
      const executable = simulator.getExecutableOrders(future);
      expect(executable.length).toBeGreaterThan(0);
    });

    it('should remove executed orders from queue', () => {
      const currentTime = Date.now();
      simulator.submitOrder(100, 10, 'BUY', currentTime);

      let status = simulator.getPendingOrdersStatus();
      expect(status.totalOrders).toBe(1);

      // Execute orders
      simulator.getExecutableOrders(currentTime + 5000);

      status = simulator.getPendingOrdersStatus();
      expect(status.totalOrders).toBe(0);
    });

    it('should cancel specific orders', () => {
      const submission = simulator.submitOrder(100, 10, 'BUY');
      
      let status = simulator.getPendingOrdersStatus();
      expect(status.totalOrders).toBe(1);

      const cancelled = simulator.cancelOrder(submission.orderId);
      expect(cancelled).toBe(true);

      status = simulator.getPendingOrdersStatus();
      expect(status.totalOrders).toBe(0);
    });

    it('should clear all orders', () => {
      simulator.submitOrder(100, 10, 'BUY');
      simulator.submitOrder(110, 20, 'SELL');

      simulator.clearOrders();

      const status = simulator.getPendingOrdersStatus();
      expect(status.totalOrders).toBe(0);
    });
  });

  describe('Latency Distribution Models', () => {
    it('should sample from uniform distribution', () => {
      simulator.updateConfig({
        apiLatency: { min: 100, max: 200, distribution: 'uniform' },
      });

      const samples = Array(100).fill(null).map(() => 
        simulator.calculateLatency().breakdown.api
      );

      // All samples should be within range
      samples.forEach(sample => {
        expect(sample).toBeGreaterThanOrEqual(100);
        expect(sample).toBeLessThanOrEqual(200);
      });
    });

    it('should sample from normal distribution', () => {
      simulator.updateConfig({
        apiLatency: { min: 100, max: 500, distribution: 'normal' },
      });

      const samples = Array(100).fill(null).map(() => 
        simulator.calculateLatency().breakdown.api
      );

      // Most samples should be near the mean
      const mean = (100 + 500) / 2;
      const nearMean = samples.filter(s => Math.abs(s - mean) < 100).length;
      expect(nearMean).toBeGreaterThan(20); // At least 20% near mean
    });

    it('should sample from exponential distribution', () => {
      simulator.updateConfig({
        apiLatency: { min: 100, max: 500, distribution: 'exponential' },
      });

      const samples = Array(100).fill(null).map(() => 
        simulator.calculateLatency().breakdown.api
      );

      // All samples should be above minimum
      samples.forEach(sample => {
        expect(sample).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Network Latency with Jitter', () => {
    it('should apply jitter to network latency', () => {
      simulator.updateConfig({
        networkLatency: { min: 50, max: 100, jitter: 20 },
      });

      const samples = Array(100).fill(null).map(() => 
        simulator.calculateLatency().breakdown.network
      );

      // Should have variation due to jitter
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      expect(max - min).toBeGreaterThan(0);
    });
  });

  describe('Realtime vs Delayed Data', () => {
    it('should use realtime latency when enabled', () => {
      simulator.enableRealtimeData(true);
      const result = simulator.calculateLatency();

      expect(result.breakdown.marketData).toBe(0);
    });

    it('should use delayed latency when disabled', () => {
      simulator.enableRealtimeData(false);
      const result = simulator.calculateLatency();

      expect(result.breakdown.marketData).toBe(DEFAULT_LATENCY_CONFIG.marketDataLatency.delayed);
    });
  });

  describe('Latency Presets', () => {
    it('should apply low latency preset', () => {
      const preset = getLatencyPreset('low');
      simulator.updateConfig(preset);

      const result = simulator.calculateLatency();
      expect(result.totalLatency).toBeLessThan(1000); // Less than 1 second
    });

    it('should apply medium latency preset', () => {
      const preset = getLatencyPreset('medium');
      simulator.updateConfig(preset);

      const result = simulator.calculateLatency();
      expect(result.totalLatency).toBeGreaterThan(0);
    });

    it('should apply high latency preset', () => {
      const preset = getLatencyPreset('high');
      simulator.updateConfig(preset);

      const result = simulator.calculateLatency();
      expect(result.totalLatency).toBeGreaterThan(1000); // More than 1 second
    });

    it('should apply retail preset with delayed data', () => {
      const preset = getLatencyPreset('retail');
      simulator.updateConfig(preset);

      const config = simulator.getConfig();
      expect(config.marketDataLatency.isRealtime).toBe(false);
    });

    it('should apply institutional preset with realtime data', () => {
      const preset = getLatencyPreset('institutional');
      simulator.updateConfig(preset);

      const config = simulator.getConfig();
      expect(config.marketDataLatency.isRealtime).toBe(true);
    });
  });

  describe('Pending Orders Status', () => {
    it('should calculate total value of pending orders', () => {
      simulator.submitOrder(100, 10, 'BUY');
      simulator.submitOrder(200, 5, 'SELL');

      const status = simulator.getPendingOrdersStatus();
      expect(status.totalValue).toBe(100 * 10 + 200 * 5);
    });

    it('should calculate average wait time', () => {
      const currentTime = Date.now();
      simulator.submitOrder(100, 10, 'BUY', currentTime - 1000);
      simulator.submitOrder(100, 10, 'BUY', currentTime - 2000);

      const status = simulator.getPendingOrdersStatus();
      expect(status.avgWaitTime).toBeGreaterThan(1000);
    });

    it('should list all pending orders', () => {
      simulator.submitOrder(100, 10, 'BUY');
      simulator.submitOrder(110, 20, 'SELL');

      const status = simulator.getPendingOrdersStatus();
      expect(status.orders.length).toBe(2);
      expect(status.orders[0].price).toBeDefined();
      expect(status.orders[0].quantity).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      simulator.updateConfig({
        apiLatency: { min: 50, max: 150, distribution: 'uniform' },
      });

      const config = simulator.getConfig();
      expect(config.apiLatency.min).toBe(50);
      expect(config.apiLatency.max).toBe(150);
    });

    it('should get current configuration', () => {
      const config = simulator.getConfig();
      expect(config.apiLatency).toBeDefined();
      expect(config.marketDataLatency).toBeDefined();
      expect(config.executionLatency).toBeDefined();
    });

    it('should support partial config updates', () => {
      const originalMax = simulator.getConfig().apiLatency.max;
      
      simulator.updateConfig({
        apiLatency: { min: 50 } as any,
      });

      const config = simulator.getConfig();
      expect(config.apiLatency.min).toBe(50);
      expect(config.apiLatency.max).toBe(originalMax); // Should preserve
    });
  });

  describe('Utility Functions', () => {
    it('should calculate latency statistics', () => {
      const stats = calculateLatencyStatistics(simulator, 100);

      expect(stats.mean).toBeGreaterThan(0);
      expect(stats.median).toBeGreaterThan(0);
      expect(stats.p95).toBeGreaterThanOrEqual(stats.median);
      expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
      expect(stats.min).toBeLessThanOrEqual(stats.median);
      expect(stats.max).toBeGreaterThanOrEqual(stats.median);
    });

    it('should convert latency to backtest bars', () => {
      const barInterval = 60000; // 1 minute
      const latency = 150000; // 2.5 minutes

      const barsDelay = calculateBacktestLatency(barInterval, latency);
      expect(barsDelay).toBe(3); // Should round up to 3 bars
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero latency config', () => {
      simulator.updateConfig({
        apiLatency: { min: 0, max: 0, distribution: 'uniform' },
        executionLatency: { min: 0, max: 0, distribution: 'uniform' },
        networkLatency: { min: 0, max: 0, jitter: 0 },
      });
      simulator.enableRealtimeData(true);

      const result = simulator.calculateLatency();
      expect(result.totalLatency).toBe(0);
    });

    it('should handle very high latency', () => {
      simulator.updateConfig({
        apiLatency: { min: 10000, max: 20000, distribution: 'uniform' },
      });

      const result = simulator.calculateLatency();
      expect(result.totalLatency).toBeGreaterThan(10000);
    });

    it('should handle negative jitter correctly', () => {
      simulator.updateConfig({
        networkLatency: { min: 100, max: 100, jitter: 50 },
      });

      const samples = Array(50).fill(null).map(() => 
        simulator.calculateLatency().breakdown.network
      );

      // All should be non-negative
      samples.forEach(sample => {
        expect(sample).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
