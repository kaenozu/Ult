/**
 * performance-utils.ts
 * 
 * Server-safe performance measurement utilities
 * Can be used in both client and server contexts
 */

/**
 * 同期処理のパフォーマンス計測（サーバー対応版）
 * @param name - 計測対象の名前
 * @param fn - 計測する関数
 * @returns 関数の実行結果
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now();
  
  // Create start mark before execution (only in browser)
  if (typeof window !== 'undefined' && window.performance) {
    try {
      performance.mark(`${name}-start`);
    } catch (e) {
      // Performance API may not be available in all contexts
    }
  }
  
  try {
    const result = fn();
    const duration = performance.now() - start;
    
    // Create end mark and measure after execution (only in browser)
    if (typeof window !== 'undefined' && window.performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (e) {
        // Performance API may not be available in all contexts
      }
    }
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    
    // Record to global monitor if available
    if (typeof window !== 'undefined' && (window as any).__performanceMonitor) {
      (window as any).__performanceMonitor.recordMetric(name, duration);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * 非同期処理のパフォーマンス計測（サーバー対応版）
 * @param name - 計測対象の名前
 * @param fn - 計測する非同期関数
 * @returns 関数の実行結果のPromise
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  // Create start mark before execution (only in browser)
  if (typeof window !== 'undefined' && window.performance) {
    try {
      performance.mark(`${name}-start`);
    } catch (e) {
      // Performance API may not be available in all contexts
    }
  }
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Create end mark and measure after execution (only in browser)
    if (typeof window !== 'undefined' && window.performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (e) {
        // Performance API may not be available in all contexts
      }
    }
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    
    // Record to global monitor if available
    if (typeof window !== 'undefined' && (window as any).__performanceMonitor) {
      (window as any).__performanceMonitor.recordMetric(name, duration);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}
