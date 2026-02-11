/**
 * performance-utils.test.ts
 * 
 * Unit tests for performance measurement utilities
 */

import {
  measurePerformance,
  measureAsyncPerformance,
  measurePerformanceAsync,
  measureBatchPerformance,
} from '../performance-utils';
import { performanceMonitor } from '../performance/monitor';

describe('performance-utils', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  describe('measurePerformance function', () => {
    it('should measure synchronous function execution', () => {
      const result = measurePerformance('func-test', () => {
        return 42;
      });

      expect(result).toBe(42);

      const stats = performanceMonitor.getMetric('func-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it('should handle errors', () => {
      expect(() => {
        measurePerformance('error-func', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const stats = performanceMonitor.getMetric('error-func');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('measurePerformanceAsync function', () => {
    it('should measure async function execution', async () => {
      const result = await measurePerformanceAsync('async-func', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'async-result';
      });

      expect(result).toBe('async-result');

      const stats = performanceMonitor.getMetric('async-func');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.avg).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors', async () => {
      await expect(
        measurePerformanceAsync('error-async-func', async () => {
          throw new Error('Async error');
        })
      ).rejects.toThrow('Async error');

      const stats = performanceMonitor.getMetric('error-async-func');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('measurePerformance decorator', () => {
    it('should work as a decorator with options', async () => {
      const decorator = measurePerformance('decorator-test', { threshold: 100 });

      class TestService {
        @decorator
        async testMethod(): Promise<string> {
          return 'decorated-result';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      expect(result).toBe('decorated-result');

      const stats = performanceMonitor.getMetric('decorator-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('measureAsyncPerformance decorator', () => {
    it('should work as a decorator', async () => {
      const decorator = measureAsyncPerformance('async-decorator-test', { threshold: 100 });

      class TestService {
        @decorator
        async asyncMethod(): Promise<string> {
          await new Promise(resolve => setTimeout(resolve, 5));
          return 'async-decorated-result';
        }
      }

      const service = new TestService();
      const result = await service.asyncMethod();

      expect(result).toBe('async-decorated-result');

      const stats = performanceMonitor.getMetric('async-decorator-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it('should handle errors in async methods', async () => {
      const decorator = measureAsyncPerformance('async-error-decorator');

      class TestService {
        @decorator
        async errorAsync(): Promise<string> {
          throw new Error('Async decorator error');
        }
      }

      const service = new TestService();

      await expect(service.errorAsync()).rejects.toThrow('Async decorator error');

      const stats = performanceMonitor.getMetric('async-error-decorator');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('measureBatchPerformance', () => {
    it('should measure multiple operations', async () => {
      await measureBatchPerformance('batch-test', [
        {
          name: 'op1',
          fn: async () => {
            await new Promise(resolve => setTimeout(resolve, 5));
            return 'result1';
          },
        },
        {
          name: 'op2',
          fn: async () => {
            await new Promise(resolve => setTimeout(resolve, 5));
            return 'result2';
          },
        },
      ]);

      const stats1 = performanceMonitor.getMetric('batch-test.op1');
      const stats2 = performanceMonitor.getMetric('batch-test.op2');

      expect(stats1).not.toBeNull();
      expect(stats1!.count).toBe(1);
      expect(stats2).not.toBeNull();
      expect(stats2!.count).toBe(1);
    });
  });

  describe('integration tests', () => {
    it('should track multiple measurements', () => {
      for (let i = 0; i < 10; i++) {
        measurePerformance('multi-test', () => {
          return Math.random();
        });
      }

      const stats = performanceMonitor.getMetric('multi-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(10);
      expect(stats!.avg).toBeGreaterThan(0);
      expect(stats!.min).toBeGreaterThanOrEqual(0);
      expect(stats!.max).toBeGreaterThanOrEqual(0);
    });

    it('should maintain separate metrics for different operations', () => {
      measurePerformance('operation-1', () => {});
      measurePerformance('operation-2', () => {});

      const stats1 = performanceMonitor.getMetric('operation-1');
      const stats2 = performanceMonitor.getMetric('operation-2');

      expect(stats1).not.toBeNull();
      expect(stats1!.count).toBe(1);
      expect(stats2).not.toBeNull();
      expect(stats2!.count).toBe(1);
    });

    it('should provide performance metrics', () => {
      measurePerformance('test-op', () => {});

      const metrics = performanceMonitor.getMetrics();
      expect(Object.keys(metrics).length).toBeGreaterThan(0);
      expect(metrics['test-op']).toBeDefined();
    });
  });
});
