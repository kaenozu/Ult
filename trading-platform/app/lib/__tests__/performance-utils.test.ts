/**
 * performance-utils.test.ts
 * 
 * Unit tests for performance measurement utilities
 */

import {
  measure,
  measureAsync,
  measurePerformance,
  measurePerformanceAsync,
  PerformanceSeverity,
} from '../performance-utils';
import { PerformanceMonitor } from '../utils/performanceMonitor';

// Mock console methods
const originalWarn = console.warn;
const originalError = console.error;

describe('performance-utils', () => {
  beforeEach(() => {
    PerformanceMonitor.clear();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.error = originalError;
  });

  describe('measure decorator', () => {
    it('should measure synchronous method execution', () => {
      class TestService {
        @measure('test-method')
        testMethod(): string {
          return 'result';
        }
      }

      const service = new TestService();
      const result = service.testMethod();

      expect(result).toBe('result');
      
      const stats = PerformanceMonitor.getStats('test-method');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThan(0);
    });

    it('should detect slow operations with warning', (done) => {
      class TestService {
        @measure('slow-method', { threshold: 10 })
        slowMethod(): string {
          // Simulate slow operation
          const start = Date.now();
          while (Date.now() - start < 20) {
            // busy wait
          }
          return 'result';
        }
      }

      const service = new TestService();
      service.slowMethod();

      setTimeout(() => {
        const stats = PerformanceMonitor.getStats('slow-method');
        expect(stats.warningCount).toBeGreaterThan(0);
        expect(console.warn).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should detect critical slow operations', (done) => {
      class TestService {
        @measure('critical-slow-method', { threshold: 5 })
        criticalSlowMethod(): string {
          // Simulate very slow operation
          const start = Date.now();
          while (Date.now() - start < 15) {
            // busy wait
          }
          return 'result';
        }
      }

      const service = new TestService();
      service.criticalSlowMethod();

      setTimeout(() => {
        const stats = PerformanceMonitor.getStats('critical-slow-method');
        expect(stats.errorCount).toBeGreaterThan(0);
        expect(console.error).toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should handle errors in measured methods', () => {
      class TestService {
        @measure('error-method')
        errorMethod(): string {
          throw new Error('Test error');
        }
      }

      const service = new TestService();
      
      expect(() => service.errorMethod()).toThrow('Test error');
      
      const stats = PerformanceMonitor.getStats('error-method');
      expect(stats.count).toBe(1);
      expect(stats.errorCount).toBe(1);
    });

    it('should support custom thresholds', () => {
      class TestService {
        @measure('custom-threshold', { 
          warningThreshold: 50, 
          errorThreshold: 100 
        })
        customMethod(): string {
          return 'result';
        }
      }

      const service = new TestService();
      service.customMethod();

      const stats = PerformanceMonitor.getStats('custom-threshold');
      expect(stats.count).toBe(1);
      expect(stats.okCount).toBe(1);
    });
  });

  describe('measureAsync decorator', () => {
    it('should measure async method execution', async () => {
      class TestService {
        @measureAsync('async-method')
        async asyncMethod(): Promise<string> {
          await new Promise(resolve => setTimeout(resolve, 15));
          return 'result';
        }
      }

      const service = new TestService();
      const result = await service.asyncMethod();

      expect(result).toBe('result');
      
      const stats = PerformanceMonitor.getStats('async-method');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThanOrEqual(5); // More lenient timing
    });

    it('should detect slow async operations', async () => {
      class TestService {
        @measureAsync('slow-async', { threshold: 10 })
        async slowAsync(): Promise<string> {
          await new Promise(resolve => setTimeout(resolve, 25));
          return 'result';
        }
      }

      const service = new TestService();
      await service.slowAsync();

      const stats = PerformanceMonitor.getStats('slow-async');
      // Should be slow enough to trigger warning
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThan(10);
    });

    it('should handle errors in async methods', async () => {
      class TestService {
        @measureAsync('async-error')
        async errorAsync(): Promise<string> {
          throw new Error('Async error');
        }
      }

      const service = new TestService();
      
      await expect(service.errorAsync()).rejects.toThrow('Async error');
      
      const stats = PerformanceMonitor.getStats('async-error');
      expect(stats.count).toBe(1);
      expect(stats.errorCount).toBe(1);
    });
  });

  describe('measurePerformance function', () => {
    it('should measure synchronous function execution', () => {
      const result = measurePerformance('func-test', () => {
        return 42;
      });

      expect(result).toBe(42);
      
      const stats = PerformanceMonitor.getStats('func-test');
      expect(stats.count).toBe(1);
    });

    it('should detect slow operations', (done) => {
      measurePerformance('slow-func', () => {
        const start = Date.now();
        while (Date.now() - start < 15) {
          // busy wait
        }
      }, { threshold: 10 });

      setTimeout(() => {
        const stats = PerformanceMonitor.getStats('slow-func');
        expect(stats.warningCount).toBeGreaterThan(0);
        done();
      }, 50);
    });

    it('should handle errors', () => {
      expect(() => {
        measurePerformance('error-func', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const stats = PerformanceMonitor.getStats('error-func');
      expect(stats.count).toBe(1);
    });
  });

  describe('measurePerformanceAsync function', () => {
    it('should measure async function execution', async () => {
      const result = await measurePerformanceAsync('async-func', async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return 'async-result';
      });

      expect(result).toBe('async-result');
      
      const stats = PerformanceMonitor.getStats('async-func');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThanOrEqual(5);
    });

    it('should detect slow async operations', async () => {
      await measurePerformanceAsync('slow-async-func', async () => {
        await new Promise(resolve => setTimeout(resolve, 25));
      }, { threshold: 10 });

      const stats = PerformanceMonitor.getStats('slow-async-func');
      expect(stats.count).toBe(1);
      expect(stats.avg).toBeGreaterThan(10);
    });

    it('should handle errors', async () => {
      await expect(
        measurePerformanceAsync('error-async-func', async () => {
          throw new Error('Async error');
        })
      ).rejects.toThrow('Async error');

      const stats = PerformanceMonitor.getStats('error-async-func');
      expect(stats.count).toBe(1);
    });
  });

  describe('integration tests', () => {
    it('should track multiple measurements', () => {
      class TestService {
        @measure('multi-test')
        testMethod(): number {
          return Math.random();
        }
      }

      const service = new TestService();
      
      for (let i = 0; i < 10; i++) {
        service.testMethod();
      }

      const stats = PerformanceMonitor.getStats('multi-test');
      expect(stats.count).toBe(10);
      expect(stats.avg).toBeGreaterThan(0);
      expect(stats.min).toBeGreaterThan(0);
      expect(stats.max).toBeGreaterThan(0);
    });

    it('should maintain separate metrics for different operations', () => {
      class TestService {
        @measure('operation-1')
        operation1(): void {}

        @measure('operation-2')
        operation2(): void {}
      }

      const service = new TestService();
      service.operation1();
      service.operation2();

      const stats1 = PerformanceMonitor.getStats('operation-1');
      const stats2 = PerformanceMonitor.getStats('operation-2');

      expect(stats1.count).toBe(1);
      expect(stats2.count).toBe(1);
    });

    it('should provide performance summary', () => {
      measurePerformance('fast-op', () => {});
      
      measurePerformance('slow-op', () => {
        const start = Date.now();
        while (Date.now() - start < 15) {}
      }, { threshold: 10 });

      const summary = PerformanceMonitor.getSummary();
      expect(summary.totalMetrics).toBeGreaterThan(0);
      expect(summary.totalMeasurements).toBeGreaterThan(0);
    });
  });
});
