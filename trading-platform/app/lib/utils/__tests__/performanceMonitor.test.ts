/**
 * performanceMonitor.test.ts
 * 
 * Unit tests for PerformanceMonitor class
 */

import { PerformanceMonitor, PerformanceSeverity } from '../performanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    PerformanceMonitor.clear();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('record', () => {
    it('should record a metric with severity', () => {
      PerformanceMonitor.record('test-metric', 50, 'ok');
      
      const stats = PerformanceMonitor.getStats('test-metric');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBe(50);
      expect(stats.okCount).toBe(1);
      expect(stats.warningCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });

    it('should track warnings', () => {
      PerformanceMonitor.record('warning-metric', 150, 'warning');
      
      const stats = PerformanceMonitor.getStats('warning-metric');
      expect(stats.warningCount).toBe(1);
      expect(PerformanceMonitor.hasWarnings()).toBe(true);
      expect(PerformanceMonitor.getWarnings()).toContain('warning-metric');
    });

    it('should track errors', () => {
      PerformanceMonitor.record('error-metric', 500, 'error');
      
      const stats = PerformanceMonitor.getStats('error-metric');
      expect(stats.errorCount).toBe(1);
      expect(PerformanceMonitor.hasErrors()).toBe(true);
      expect(PerformanceMonitor.getErrors()).toContain('error-metric');
    });

    it('should store multiple measurements', () => {
      PerformanceMonitor.record('multi-metric', 10, 'ok');
      PerformanceMonitor.record('multi-metric', 20, 'ok');
      PerformanceMonitor.record('multi-metric', 150, 'warning');
      PerformanceMonitor.record('multi-metric', 300, 'error');
      
      const stats = PerformanceMonitor.getStats('multi-metric');
      expect(stats.count).toBe(4);
      expect(stats.okCount).toBe(2);
      expect(stats.warningCount).toBe(1);
      expect(stats.errorCount).toBe(1);
      expect(stats.avg).toBe(120);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(300);
    });

    it('should limit stored metrics to 1000', () => {
      for (let i = 0; i < 1500; i++) {
        PerformanceMonitor.record('limited-metric', i, 'ok');
      }
      
      const rawMetrics = PerformanceMonitor.getRawMetrics('limited-metric');
      expect(rawMetrics.length).toBe(1000);
    });
  });

  describe('measure', () => {
    it('should measure synchronous execution', () => {
      PerformanceMonitor.measure('sync-measure', () => {
        // Do nothing
      });
      
      const stats = PerformanceMonitor.getStats('sync-measure');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThanOrEqual(0);
    });

    it('should detect slow operations', (done) => {
      PerformanceMonitor.measure('slow-measure', () => {
        const start = Date.now();
        while (Date.now() - start < 15) {
          // busy wait
        }
      }, 10);
      
      setTimeout(() => {
        const stats = PerformanceMonitor.getStats('slow-measure');
        expect(stats.warningCount).toBeGreaterThan(0);
        expect(console.warn).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should detect critical slow operations', (done) => {
      PerformanceMonitor.measure('critical-measure', () => {
        const start = Date.now();
        while (Date.now() - start < 25) {
          // busy wait
        }
      }, 10);
      
      setTimeout(() => {
        const stats = PerformanceMonitor.getStats('critical-measure');
        expect(stats.errorCount).toBeGreaterThan(0);
        expect(console.error).toHaveBeenCalled();
        done();
      }, 50);
    });
  });

  describe('measureAsync', () => {
    it('should measure async execution', async () => {
      await PerformanceMonitor.measureAsync('async-measure', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      const stats = PerformanceMonitor.getStats('async-measure');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThanOrEqual(10);
    });

    it('should detect slow async operations', async () => {
      await PerformanceMonitor.measureAsync('slow-async-measure', async () => {
        await new Promise(resolve => setTimeout(resolve, 25));
      }, 10);
      
      const stats = PerformanceMonitor.getStats('slow-async-measure');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThan(10);
    });
  });

  describe('getStats', () => {
    it('should return empty stats for non-existent metric', () => {
      const stats = PerformanceMonitor.getStats('non-existent');
      
      expect(stats.count).toBe(0);
      expect(stats.avg).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.okCount).toBe(0);
      expect(stats.warningCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });

    it('should calculate correct statistics', () => {
      PerformanceMonitor.record('stats-test', 10, 'ok');
      PerformanceMonitor.record('stats-test', 20, 'ok');
      PerformanceMonitor.record('stats-test', 30, 'ok');
      
      const stats = PerformanceMonitor.getStats('stats-test');
      
      expect(stats.count).toBe(3);
      expect(stats.avg).toBe(20);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
    });
  });

  describe('getAllMetrics', () => {
    it('should return all metrics', () => {
      PerformanceMonitor.record('metric-1', 10, 'ok');
      PerformanceMonitor.record('metric-2', 20, 'ok');
      PerformanceMonitor.record('metric-3', 30, 'ok');
      
      const allMetrics = PerformanceMonitor.getAllMetrics();
      
      expect(allMetrics.size).toBe(3);
      expect(allMetrics.has('metric-1')).toBe(true);
      expect(allMetrics.has('metric-2')).toBe(true);
      expect(allMetrics.has('metric-3')).toBe(true);
    });
  });

  describe('getRawMetrics', () => {
    it('should return raw metrics', () => {
      PerformanceMonitor.record('raw-test', 10, 'ok');
      PerformanceMonitor.record('raw-test', 20, 'warning');
      PerformanceMonitor.record('raw-test', 30, 'error');
      
      const rawMetrics = PerformanceMonitor.getRawMetrics('raw-test');
      
      expect(rawMetrics.length).toBe(3);
      expect(rawMetrics[0].duration).toBe(10);
      expect(rawMetrics[0].severity).toBe('ok');
      expect(rawMetrics[1].duration).toBe(20);
      expect(rawMetrics[1].severity).toBe('warning');
      expect(rawMetrics[2].duration).toBe(30);
      expect(rawMetrics[2].severity).toBe('error');
    });

    it('should limit returned raw metrics', () => {
      for (let i = 0; i < 100; i++) {
        PerformanceMonitor.record('limited-raw', i, 'ok');
      }
      
      const rawMetrics = PerformanceMonitor.getRawMetrics('limited-raw', 10);
      
      expect(rawMetrics.length).toBe(10);
      expect(rawMetrics[0].duration).toBe(90);
      expect(rawMetrics[9].duration).toBe(99);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      PerformanceMonitor.record('metric-1', 10, 'ok');
      PerformanceMonitor.record('metric-2', 150, 'warning');
      PerformanceMonitor.record('metric-3', 300, 'error');
      
      PerformanceMonitor.clear();
      
      const allMetrics = PerformanceMonitor.getAllMetrics();
      expect(allMetrics.size).toBe(0);
      expect(PerformanceMonitor.hasWarnings()).toBe(false);
      expect(PerformanceMonitor.hasErrors()).toBe(false);
    });
  });

  describe('clearMetric', () => {
    it('should clear specific metric', () => {
      PerformanceMonitor.record('metric-1', 10, 'ok');
      PerformanceMonitor.record('metric-2', 150, 'warning');
      
      PerformanceMonitor.clearMetric('metric-1');
      
      const stats1 = PerformanceMonitor.getStats('metric-1');
      const stats2 = PerformanceMonitor.getStats('metric-2');
      
      expect(stats1.count).toBe(0);
      expect(stats2.count).toBe(1);
    });
  });

  describe('getMetricsBySeverity', () => {
    it('should filter metrics by severity', () => {
      PerformanceMonitor.record('fast-op', 10, 'ok');
      PerformanceMonitor.record('slow-op', 150, 'warning');
      PerformanceMonitor.record('critical-op', 500, 'error');
      
      const warnings = PerformanceMonitor.getMetricsBySeverity('warning');
      const errors = PerformanceMonitor.getMetricsBySeverity('error');
      
      expect(warnings.size).toBe(1);
      expect(warnings.has('slow-op')).toBe(true);
      
      expect(errors.size).toBe(1);
      expect(errors.has('critical-op')).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('should provide performance summary', () => {
      PerformanceMonitor.record('op-1', 10, 'ok');
      PerformanceMonitor.record('op-2', 150, 'warning');
      PerformanceMonitor.record('op-3', 500, 'error');
      
      const summary = PerformanceMonitor.getSummary();
      
      expect(summary.totalMetrics).toBe(3);
      expect(summary.totalMeasurements).toBe(3);
      expect(summary.slowOperations.length).toBe(1);
      expect(summary.criticalOperations.length).toBe(1);
      expect(summary.healthScore).toBeGreaterThan(0);
      expect(summary.healthScore).toBeLessThan(100);
    });

    it('should calculate health score correctly', () => {
      // Perfect health
      PerformanceMonitor.clear();
      PerformanceMonitor.record('perfect', 10, 'ok');
      
      let summary = PerformanceMonitor.getSummary();
      expect(summary.healthScore).toBe(100);
      
      // With warnings
      PerformanceMonitor.clear();
      PerformanceMonitor.record('warning-1', 150, 'warning');
      PerformanceMonitor.record('warning-2', 160, 'warning');
      
      summary = PerformanceMonitor.getSummary();
      expect(summary.healthScore).toBe(90); // 100 - (2 * 5)
      
      // With errors
      PerformanceMonitor.clear();
      PerformanceMonitor.record('error-1', 500, 'error');
      
      summary = PerformanceMonitor.getSummary();
      expect(summary.healthScore).toBe(80); // 100 - (1 * 20)
    });
  });
});
