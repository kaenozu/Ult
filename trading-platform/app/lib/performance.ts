/**
 * performance.ts
 * 
 * パフォーマンス計測ユーティリティ
 * ボトルネック可視化、パフォーマンス回帰防止、最適化優先順位の判断に使用
 */

import { useEffect, useRef, useCallback } from 'react';

// =============================================================================
// 型定義
// =============================================================================

export interface PerformanceMetric {
  avg: number;
  min: number;
  max: number;
  count: number;
  p50: number;  // Median
  p95: number;  // 95th percentile
  p99: number;  // 99th percentile
}

export interface PerformanceSnapshot {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
}

// =============================================================================
// 汎用計測関数
// =============================================================================

/**
 * 同期処理のパフォーマンス計測
 * @param name - 計測対象の名前
 * @param fn - 計測する関数
 * @returns 関数の実行結果
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now();
  
  // Create start mark before execution
  if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
    try {
      performance.mark(`${name}-start`);
    } catch (e) {
      // Performance API may not be available in all contexts
    }
  }
  
  try {
    const result = fn();
    const duration = performance.now() - start;
    
    // Create end mark and measure after execution
    if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
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
 * 非同期処理のパフォーマンス計測
 * @param name - 計測対象の名前
 * @param fn - 計測する非同期関数
 * @returns 関数の実行結果のPromise
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
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
 * パフォーマンス計測のためのデコレーター（関数ラッパー）
 */
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  const functionName = name || fn.name || 'anonymous';
  
  return ((...args: Parameters<T>) => {
    return measurePerformance(functionName, () => fn(...args));
  }) as T;
}

/**
 * 非同期関数用のパフォーマンス計測デコレーター
 */
export function withAsyncPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name?: string
): T {
  const functionName = name || fn.name || 'anonymous';
  
  return async (...args: Parameters<T>) => {
    return await measurePerformanceAsync(functionName, () => fn(...args));
  } as T;
}

// =============================================================================
// React フック
// =============================================================================

/**
 * React コンポーネントのパフォーマンス監視フック
 * @param componentName - コンポーネント名
 * @param options - オプション設定
 * @returns 計測ヘルパー関数
 */
export function usePerformanceMonitor(
  componentName: string,
  options: {
    trackMount?: boolean;
    trackRender?: boolean;
    trackUnmount?: boolean;
  } = {}
) {
  const {
    trackMount = true,
    trackRender = true,
    trackUnmount = true,
  } = options;

  const mountTimeRef = useRef<number>();
  const renderCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>();

  // マウント時の計測
  useEffect(() => {
    if (trackMount) {
      mountTimeRef.current = performance.now();
      console.log(`[Lifecycle] ${componentName} mounted`);
    }

    return () => {
      if (trackUnmount && mountTimeRef.current) {
        const lifeTime = performance.now() - mountTimeRef.current;
        console.log(
          `[Lifecycle] ${componentName} unmounted after ${lifeTime.toFixed(2)}ms ` +
          `(${renderCountRef.current} renders)`
        );
      }
    };
  }, [componentName, trackMount, trackUnmount]);

  // レンダリング時の計測
  useEffect(() => {
    if (trackRender) {
      renderCountRef.current++;
      const now = performance.now();
      
      if (lastRenderTimeRef.current) {
        const timeSinceLastRender = now - lastRenderTimeRef.current;
        console.log(
          `[Render] ${componentName} #${renderCountRef.current} ` +
          `(${timeSinceLastRender.toFixed(2)}ms since last render)`
        );
      } else {
        console.log(`[Render] ${componentName} #${renderCountRef.current} (initial)`);
      }
      
      lastRenderTimeRef.current = now;
    }
  });

  // 計測用のヘルパー関数
  const measure = useCallback(<T,>(operationName: string, fn: () => T): T => {
    return measurePerformance(`${componentName}.${operationName}`, fn);
  }, [componentName]);

  const measureAsync = useCallback(
    async <T,>(operationName: string, fn: () => Promise<T>): Promise<T> => {
      return measurePerformanceAsync(`${componentName}.${operationName}`, fn);
    },
    [componentName]
  );

  return {
    measure,
    measureAsync,
    renderCount: renderCountRef.current,
  };
}

/**
 * 複数の処理時間を比較するためのベンチマークフック
 * @param name - ベンチマーク名
 * @returns ベンチマーク関数
 */
export function usePerformanceBenchmark(name: string) {
  const resultsRef = useRef<Map<string, number[]>>(new Map());

  const benchmark = useCallback(<T,>(label: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    if (!resultsRef.current.has(label)) {
      resultsRef.current.set(label, []);
    }
    resultsRef.current.get(label)!.push(duration);

    console.log(`[Benchmark:${name}] ${label}: ${duration.toFixed(2)}ms`);
    return result;
  }, [name]);

  const getResults = useCallback(() => {
    const results: Record<string, PerformanceMetric> = {};
    
    for (const [label, durations] of resultsRef.current.entries()) {
      if (durations.length === 0) continue;
      
      const sorted = [...durations].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      
      results[label] = {
        avg: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: sorted.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
    
    return results;
  }, []);

  const reset = useCallback(() => {
    resultsRef.current.clear();
  }, []);

  return { benchmark, getResults, reset };
}

// =============================================================================
// グローバルパフォーマンスモニター
// =============================================================================

class GlobalPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private snapshots: PerformanceSnapshot[] = [];
  private readonly MAX_MEASUREMENTS = 100;
  private readonly MAX_SNAPSHOTS = 1000;

  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const measurements = this.metrics.get(name)!;
    measurements.push(value);

    if (measurements.length > this.MAX_MEASUREMENTS) {
      measurements.shift();
    }

    this.snapshots.push({
      name,
      duration: value,
      timestamp: Date.now(),
      metadata,
    });

    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
  }

  getMetrics(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {};

    for (const [name, measurements] of this.metrics) {
      if (measurements.length === 0) continue;

      const sorted = [...measurements].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);

      result[name] = {
        avg: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: sorted.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }

    return result;
  }

  getSnapshots(limit?: number): PerformanceSnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  clear(): void {
    this.metrics.clear();
    this.snapshots = [];
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    lines.push('=== Performance Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Group metrics by category
    const categories = new Map<string, [string, PerformanceMetric][]>();
    
    for (const [name, metric] of Object.entries(metrics)) {
      const category = name.split('.')[0] || 'other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push([name, metric]);
    }

    // Sort and display by category
    for (const [category, items] of categories) {
      lines.push(`--- ${category} ---`);
      for (const [name, metric] of items) {
        lines.push(
          `${name}: avg=${metric.avg.toFixed(2)}ms, ` +
          `p50=${metric.p50.toFixed(2)}ms, ` +
          `p95=${metric.p95.toFixed(2)}ms, ` +
          `min=${metric.min.toFixed(2)}ms, ` +
          `max=${metric.max.toFixed(2)}ms, ` +
          `count=${metric.count}`
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// グローバルインスタンスの初期化
if (typeof window !== 'undefined') {
  (window as any).__performanceMonitor = new GlobalPerformanceMonitor();
}

// ヘルパー関数でグローバルモニターにアクセス
export function getGlobalPerformanceMonitor(): GlobalPerformanceMonitor | null {
  if (typeof window !== 'undefined' && (window as any).__performanceMonitor) {
    return (window as any).__performanceMonitor;
  }
  return null;
}

/**
 * パフォーマンスレポートをコンソールに出力
 */
export function printPerformanceReport(): void {
  const monitor = getGlobalPerformanceMonitor();
  if (monitor) {
    console.log(monitor.getReport());
  } else {
    console.log('Performance monitor not available');
  }
}

/**
 * パフォーマンスメトリクスをJSON形式でエクスポート
 */
export function exportPerformanceMetrics(): string {
  const monitor = getGlobalPerformanceMonitor();
  if (!monitor) {
    return JSON.stringify({ error: 'Performance monitor not available' });
  }

  return JSON.stringify({
    timestamp: Date.now(),
    metrics: monitor.getMetrics(),
    snapshots: monitor.getSnapshots(100),
  }, null, 2);
}

// =============================================================================
// デバッグ用ヘルパー
// =============================================================================

/**
 * コンソールからパフォーマンスレポートを確認できるようにグローバルに公開
 */
if (typeof window !== 'undefined') {
  (window as any).performanceUtils = {
    printReport: printPerformanceReport,
    exportMetrics: exportPerformanceMetrics,
    getMonitor: getGlobalPerformanceMonitor,
  };
}
