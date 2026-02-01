/**
 * DataLatencyMonitor.test.ts
 * 
 * Tests for data latency monitoring service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataLatencyMonitor } from '../latency/DataLatencyMonitor';

describe('DataLatencyMonitor', () => {
  let monitor: DataLatencyMonitor;

  beforeEach(() => {
    monitor = new DataLatencyMonitor();
  });

  describe('Latency Recording', () => {
    it('should record latency measurements', () => {
      const now = Date.now();
      const dataTime = now - 1000; // 1 second ago

      monitor.recordLatency('AAPL', dataTime, now, 'test-source');

      const stats = monitor.getStats('AAPL');
      expect(stats).toBeDefined();
      expect(stats?.avgLatencyMs).toBeCloseTo(1000, 0);
    });

    it('should calculate average latency', () => {
      const now = Date.now();
      
      monitor.recordLatency('AAPL', now - 1000, now);
      monitor.recordLatency('AAPL', now - 2000, now);
      monitor.recordLatency('AAPL', now - 3000, now);

      const stats = monitor.getStats('AAPL');
      expect(stats?.avgLatencyMs).toBeCloseTo(2000, 0);
    });
  });

  describe('Alert Generation', () => {
    it('should generate warning alert for high latency', () => {
      const testMonitor = new DataLatencyMonitor({
        warningThresholdMs: 5000,
        criticalThresholdMs: 10000
      });

      const now = Date.now();
      testMonitor.recordLatency('AAPL', now - 6000, now); // 6 seconds

      const alerts = testMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('warning');
    });

    it('should generate critical alert for very high latency', () => {
      const testMonitor = new DataLatencyMonitor({
        warningThresholdMs: 5000,
        criticalThresholdMs: 10000
      });

      const now = Date.now();
      testMonitor.recordLatency('AAPL', now - 15000, now); // 15 seconds

      const alerts = testMonitor.getAlerts('critical');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('critical');
    });

    it('should not generate alerts for normal latency', () => {
      const testMonitor = new DataLatencyMonitor({
        warningThresholdMs: 5000
      });

      const now = Date.now();
      testMonitor.recordLatency('AAPL', now - 1000, now); // 1 second

      const alerts = testMonitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Freshness Checking', () => {
    it('should report fresh data', () => {
      const now = Date.now();
      monitor.recordLatency('AAPL', now - 1000, now);

      const freshness = monitor.checkFreshness('AAPL');
      expect(freshness.isFresh).toBe(true);
      expect(freshness.staleness).toBe('fresh');
    });

    it('should report stale data', () => {
      const testMonitor = new DataLatencyMonitor({
        freshnessThresholdMs: 10000 // 10 seconds
      });

      const now = Date.now();
      testMonitor.recordLatency('AAPL', now - 1000, now);

      // Wait for data to become stale (simulate)
      const pastTime = now - 15000; // 15 seconds ago
      testMonitor['lastUpdate'].set('AAPL', pastTime);

      const freshness = testMonitor.checkFreshness('AAPL');
      expect(freshness.isFresh).toBe(false);
      expect(freshness.staleness).toBe('stale');
    });

    it('should handle unknown symbol', () => {
      const freshness = monitor.checkFreshness('UNKNOWN');
      expect(freshness.isFresh).toBe(false);
      expect(freshness.staleness).toBe('very-stale');
      expect(freshness.lastUpdate).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate percentiles', () => {
      const now = Date.now();
      
      // Record various latencies
      for (let i = 1; i <= 100; i++) {
        monitor.recordLatency('AAPL', now - i * 100, now);
      }

      const stats = monitor.getStats('AAPL');
      expect(stats).toBeDefined();
      expect(stats?.p50LatencyMs).toBeDefined();
      expect(stats?.p95LatencyMs).toBeDefined();
      expect(stats?.p99LatencyMs).toBeDefined();
      expect(stats?.p95LatencyMs).toBeGreaterThan(stats?.p50LatencyMs || 0);
    });

    it('should return null for symbol with no measurements', () => {
      const stats = monitor.getStats('UNKNOWN');
      expect(stats).toBeNull();
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', () => {
      const now = Date.now();
      
      monitor.recordLatency('AAPL', now - 1000, now);
      monitor.recordLatency('GOOGL', now - 2000, now);

      const report = monitor.generateReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.stats.length).toBe(2);
      expect(report.freshness).toBeDefined();
      expect(report.summary.totalSymbols).toBe(2);
    });

    it('should include summary statistics in report', () => {
      const now = Date.now();
      
      monitor.recordLatency('AAPL', now - 1000, now);
      monitor.recordLatency('GOOGL', now - 2000, now);

      const report = monitor.generateReport();
      
      expect(report.summary.avgLatencyMs).toBeGreaterThan(0);
      expect(report.summary.freshSymbols).toBeGreaterThan(0);
    });
  });

  describe('High Latency Detection', () => {
    it('should identify symbols with high latency', () => {
      const now = Date.now();
      
      monitor.recordLatency('AAPL', now - 1000, now);
      monitor.recordLatency('GOOGL', now - 10000, now);

      const highLatencySymbols = monitor.getHighLatencySymbols(5000);
      expect(highLatencySymbols).toContain('GOOGL');
      expect(highLatencySymbols).not.toContain('AAPL');
    });
  });

  describe('Alert Management', () => {
    it('should clear alerts for specific symbol', () => {
      const testMonitor = new DataLatencyMonitor({
        warningThresholdMs: 1000
      });

      const now = Date.now();
      testMonitor.recordLatency('AAPL', now - 2000, now);
      testMonitor.recordLatency('GOOGL', now - 2000, now);

      expect(testMonitor.getAlerts().length).toBeGreaterThan(0);
      
      testMonitor.clearAlerts('AAPL');
      
      const remainingAlerts = testMonitor.getAlerts();
      expect(remainingAlerts.every(a => a.symbol !== 'AAPL')).toBe(true);
    });

    it('should clear all alerts', () => {
      const testMonitor = new DataLatencyMonitor({
        warningThresholdMs: 1000
      });

      const now = Date.now();
      testMonitor.recordLatency('AAPL', now - 2000, now);
      testMonitor.recordLatency('GOOGL', now - 2000, now);

      expect(testMonitor.getAlerts().length).toBeGreaterThan(0);
      
      testMonitor.clearAlerts();
      expect(testMonitor.getAlerts()).toHaveLength(0);
    });
  });

  describe('Configuration', () => {
    it('should allow updating configuration', () => {
      monitor.updateConfig({
        warningThresholdMs: 3000,
        criticalThresholdMs: 6000
      });

      const now = Date.now();
      monitor.recordLatency('AAPL', now - 4000, now);

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].threshold).toBe(3000);
    });
  });

  describe('Reset', () => {
    it('should reset all monitoring data', () => {
      const now = Date.now();
      monitor.recordLatency('AAPL', now - 1000, now);

      expect(monitor.getStats('AAPL')).toBeDefined();
      
      monitor.reset();
      
      expect(monitor.getStats('AAPL')).toBeNull();
      expect(monitor.getAlerts()).toHaveLength(0);
    });
  });
});
