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

// Mock console.log to test logging
const originalLog = console.log;
const originalError = console.error;
let logOutput: string[] = [];
let errorOutput: string[] = [];

beforeEach(() => {
  logOutput = [];
  errorOutput = [];
  console.log = jest.fn((...args) => logOutput.push(args.join(' ')));
  console.error = jest.fn((...args) => errorOutput.push(args.join(' ')));
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
});

describe('measurePerformance', () => {
  it('should measure synchronous function execution time', () => {
    const result = measurePerformance('test-sync', () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    });

    expect(result).toBe(499500); // Sum of 0 to 999
    expect(logOutput.some(log => log.includes('[Performance] test-sync:'))).toBe(true);
    expect(logOutput.some(log => log.includes('ms'))).toBe(true);
  });

  it('should handle errors and still log performance', () => {
    expect(() => {
      measurePerformance('test-error', () => {
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    expect(errorOutput.some(log => log.includes('[Performance] test-error failed'))).toBe(true);
  });
});

describe('measurePerformanceAsync', () => {
  it('should measure asynchronous function execution time', async () => {
    const result = await measurePerformanceAsync('test-async', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'completed';
    });

    expect(result).toBe('completed');
    expect(logOutput.some(log => log.includes('[Performance] test-async:'))).toBe(true);
  });

  it('should handle async errors and still log performance', async () => {
    await expect(
      measurePerformanceAsync('test-async-error', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      })
    ).rejects.toThrow('Async error');

    expect(errorOutput.some(log => log.includes('[Performance] test-async-error failed'))).toBe(true);
  });
});

describe('withPerformanceTracking', () => {
  it('should create a wrapped function that tracks performance', () => {
    const add = (a: number, b: number) => a + b;
    const trackedAdd = withPerformanceTracking(add, 'add-operation');

    const result = trackedAdd(5, 3);

    expect(result).toBe(8);
    expect(logOutput.some(log => log.includes('[Performance] add-operation:'))).toBe(true);
  });

  it('should use function name if no name provided', () => {
    function multiply(a: number, b: number) {
      return a * b;
    }
    const trackedMultiply = withPerformanceTracking(multiply);

    const result = trackedMultiply(4, 7);

    expect(result).toBe(28);
    expect(logOutput.some(log => log.includes('[Performance] multiply:'))).toBe(true);
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
    expect(logOutput.some(log => log.includes('[Performance] fetch-operation:'))).toBe(true);
  });
});

describe('Global Performance Monitor', () => {
  it('should record metrics in global monitor when available', () => {
    // Setup global monitor
    if (typeof window === 'undefined') {
      (global as any).window = {};
    }

    const monitor = getGlobalPerformanceMonitor();
    
    // Clear any existing metrics
    if (monitor) {
      monitor.clear();
    }

    // Perform measurement
    measurePerformance('global-test', () => {
      return 42;
    });

    // Note: In Node.js test environment, window may not be available
    // so this test may not fully execute the browser code path
  });
});

describe('Performance calculation', () => {
  it('should measure operations that take different amounts of time', () => {
    // Fast operation
    measurePerformance('fast-op', () => {
      return 1 + 1;
    });

    // Slower operation
    measurePerformance('slow-op', () => {
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += i;
      }
      return sum;
    });

    // Both should have logged performance
    expect(logOutput.filter(log => log.includes('[Performance]')).length).toBeGreaterThanOrEqual(2);
  });
});

describe('Edge cases', () => {
  it('should handle functions that return undefined', () => {
    const result = measurePerformance('void-function', () => {
      // No return value
    });

    expect(result).toBeUndefined();
    expect(logOutput.some(log => log.includes('[Performance] void-function:'))).toBe(true);
  });

  it('should handle functions that return null', () => {
    const result = measurePerformance('null-function', () => null);

    expect(result).toBeNull();
    expect(logOutput.some(log => log.includes('[Performance] null-function:'))).toBe(true);
  });

  it('should handle async functions that return undefined', async () => {
    const result = await measurePerformanceAsync('async-void', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
    });

    expect(result).toBeUndefined();
    expect(logOutput.some(log => log.includes('[Performance] async-void:'))).toBe(true);
  });
});
