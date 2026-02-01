
/**
 * Performance measurement utilities
 */

export async function measurePerformanceAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    if (duration > 100) {
      console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
    }
  }
}

export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  functionName: string
): T {
  return (async (...args: Parameters<T>) => {
    return measurePerformanceAsync(functionName, () => fn(...args));
  }) as T;
}
