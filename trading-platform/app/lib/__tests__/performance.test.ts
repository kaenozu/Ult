/**
 * performance.test.ts
 * 
 * パフォーマンス計測ユーティリティのテスト
 */

import {
  measurePerformance,
  measurePerformanceAsync,
  withPerformanceTracking,
  withAsyncPerformanceTracking,
  getGlobalPerformanceMonitor,
} from '../performance';

describe('measurePerformance', () => {
  it('should measure synchronous function execution time', () => {
    const result = measurePerformance('test-sync', () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    });

    expect(result).toBe(499500);
  });

  it('should handle errors and still log performance', () => {
    expect(() => {
      measurePerformance('test-error', () => {
        throw new Error('Test error');
      });
    }).toThrow('Test error');
  });
});

describe('measurePerformanceAsync', () => {
  it('should measure asynchronous function execution time', async () => {
    const result = await measurePerformanceAsync('test-async', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'completed';
    });

    expect(result).toBe('completed');
  });

  it('should handle async errors and still log performance', async () => {
    await expect(
      measurePerformanceAsync('test-async-error', async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        throw new Error('Async error');
      })
    ).rejects.toThrow('Async error');
  });
});

describe('withPerformanceTracking', () => {
  it('should create a wrapped function that tracks performance', () => {
    const add = (a: number, b: number) => a + b;
    const trackedAdd = withPerformanceTracking(add, 'add-operation');

    const result = trackedAdd(5, 3);

    expect(result).toBe(8);
  });

  it('should use function name if no name provided', () => {
    function multiply(a: number, b: number) {
      return a * b;
    }
    const trackedMultiply = withPerformanceTracking(multiply);

    const result = trackedMultiply(4, 7);

    expect(result).toBe(28);
  });
});

describe('withAsyncPerformanceTracking', () => {
  it('should create a wrapped async function that tracks performance', async () => {
    const fetchData = async (id: number) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { id, data: 'test' };
    };
    const trackedFetch = withAsyncPerformanceTracking(fetchData, 'fetch-operation');

    const result = await trackedFetch(123);

    expect(result).toEqual({ id: 123, data: 'test' });
  });
});

describe('Global Performance Monitor', () => {
  it('should return monitor when available', () => {
    const monitor = getGlobalPerformanceMonitor();
    expect(monitor).not.toBeNull();
  });
});

describe('Performance calculation', () => {
  it('should measure operations that take different amounts of time', () => {
    const result1 = measurePerformance('fast-op', () => {
      return 1 + 1;
    });

    const result2 = measurePerformance('slow-op', () => {
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += i;
      }
      return sum;
    });

    expect(result1).toBe(2);
    expect(result2).toBe(4999950000);
  });
});

describe('Edge cases', () => {
  it('should handle functions that return undefined', () => {
    const result = measurePerformance('void-function', () => {
      // No return value
    });

    expect(result).toBeUndefined();
  });

  it('should handle functions that return null', () => {
    const result = measurePerformance('null-function', () => null);

    expect(result).toBeNull();
  });

  it('should handle async functions that return undefined', async () => {
    const result = await measurePerformanceAsync('async-void', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
    });

    expect(result).toBeUndefined();
  });
});
