/**
 * Performance Utilities
 * 
 * パフォーマンス計測関連のユーティリティ関数
 */

import { performanceMonitor, PerformanceStats } from './monitor';

export interface PerformanceReport {
  generatedAt: string;
  summary: {
    totalMeasurements: number;
    uniqueOperations: number;
    slowestOperation: { name: string; avgDuration: number };
    fastestOperation: { name: string; avgDuration: number };
  };
  operations: Array<{
    name: string;
    stats: PerformanceStats;
  }>;
}

export function generatePerformanceReport(): PerformanceReport {
  const stats = performanceMonitor.getStats();
  const operations = Array.from(stats.entries()).map(([name, stat]) => ({
    name,
    stats: stat,
  }));

  const sortedByAvg = [...operations].sort((a, b) => b.stats.average - a.stats.average);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalMeasurements: operations.reduce((sum, op) => sum + op.stats.count, 0),
      uniqueOperations: operations.length,
      slowestOperation: sortedByAvg[0] 
        ? { name: sortedByAvg[0].name, avgDuration: sortedByAvg[0].stats.average }
        : { name: 'N/A', avgDuration: 0 },
      fastestOperation: sortedByAvg[sortedByAvg.length - 1]
        ? { name: sortedByAvg[sortedByAvg.length - 1].name, avgDuration: sortedByAvg[sortedByAvg.length - 1].stats.average }
        : { name: 'N/A', avgDuration: 0 },
    },
    operations,
  };
}

export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function logPerformanceReport(): void {
  const report = generatePerformanceReport();
  
  
  report.operations
    .sort((a, b) => b.stats.average - a.stats.average)
    .slice(0, 10)
    .forEach(op => {
        `${op.name}: avg=${formatDuration(op.stats.average)}, ` +
        `count=${op.stats.count}, p95=${formatDuration(op.stats.p95)}`
      );
    });
  
}

// Web Vitals integration
export function observeWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    performanceMonitor.record('web-vitals-lcp', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach(entry => {
      const fid = (entry as any).processingStart - entry.startTime;
      performanceMonitor.record('web-vitals-fid', fid);
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach(entry => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    });
    performanceMonitor.record('web-vitals-cls', clsValue);
  }).observe({ entryTypes: ['layout-shift'] });
}

// Re-export
export { performanceMonitor } from './monitor';
export type { PerformanceStats, PerformanceMetric } from './monitor';
