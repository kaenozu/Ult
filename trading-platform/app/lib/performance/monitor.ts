/**
 * Performance Monitor
 * 
 * Provides performance tracking and metrics collection for ULT Trading Platform.
 * Tracks render times, API calls, and other performance-critical operations.
 */

export interface PerformanceMetric {
  avg: number;
  min: number;
  max: number;
  count: number;
}

// Alias for backward compatibility
export type PerformanceStats = PerformanceMetric;

export interface PerformanceSnapshot {
  name: string;
  duration: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private snapshots: PerformanceSnapshot[] = [];
  private readonly MAX_MEASUREMENTS = 100;
  private readonly MAX_SNAPSHOTS = 1000;
  private readonly WARNING_THRESHOLD_MULTIPLIER = 2;

  /**
   * Measure component render time
   */
  measureRender(componentName: string, callback: () => void): void {
    const start = performance.now();
    callback();
    const duration = performance.now() - start;
    
    this.recordMetric(`render.${componentName}`, duration);
    
    // Log slow renders
    this.checkForSlowOperation(`render.${componentName}`, duration);
  }

  /**
   * Measure API call duration
   */
  async measureApiCall<T>(
    endpoint: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await callback();
      const duration = performance.now() - start;
      
      this.recordMetric(`api.${endpoint}`, duration);
      this.checkForSlowOperation(`api.${endpoint}`, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`api.${endpoint}.error`, duration);
      throw error;
    }
  }

  /**
   * Measure any operation
   */
  measure<T>(name: string, callback: () => T, _context?: Record<string, unknown>): T {
    const start = performance.now();
    const result = callback();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    this.checkForSlowOperation(name, duration);
    return result;
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(name: string, callback: () => Promise<T>, _context?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    const result = await callback();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    this.checkForSlowOperation(name, duration);
    return result;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const measurements = this.metrics.get(name)!;
    measurements.push(value);
    
    // Keep only last N measurements
    if (measurements.length > this.MAX_MEASUREMENTS) {
      measurements.shift();
    }
    
    // Store snapshot for detailed analysis
    this.snapshots.push({
      name,
      duration: value,
      timestamp: Date.now(),
    });
    
    // Limit snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
  }

  /**
   * Check if operation is slower than average and log warning
   */
  private checkForSlowOperation(name: string, duration: number): void {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length < 5) {
      return; // Not enough data to establish baseline
    }
    
    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const threshold = avg * this.WARNING_THRESHOLD_MULTIPLIER;
    
    if (duration > threshold) {
      console.warn(
        `[Performance] ${name} took ${duration.toFixed(2)}ms ` +
        `(avg: ${avg.toFixed(2)}ms, threshold: ${threshold.toFixed(2)}ms)`
      );
    }
  }

  /**
   * Get all metrics as a summary
   */
  getMetrics(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {};
    
    for (const [name, measurements] of this.metrics) {
      if (measurements.length === 0) continue;
      
      const sum = measurements.reduce((a, b) => a + b, 0);
      const avg = sum / measurements.length;
      const min = Math.min(...measurements);
      const max = Math.max(...measurements);
      
      result[name] = {
        avg,
        min,
        max,
        count: measurements.length,
      };
    }
    
    return result;
  }

  /**
   * Get metrics for a specific name
   */
  getMetric(name: string): PerformanceMetric | null {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }
    
    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    return {
      avg,
      min,
      max,
      count: measurements.length,
    };
  }

  /**
   * Get recent performance snapshots
   */
  getSnapshots(limit?: number): PerformanceSnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  /**
   * Get snapshots for a specific operation
   */
  getSnapshotsByName(name: string, limit?: number): PerformanceSnapshot[] {
    const filtered = this.snapshots.filter(s => s.name === name);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.snapshots = [];
  }

  /**
   * Clear metrics for a specific name
   */
  clearMetric(name: string): void {
    this.metrics.delete(name);
    this.snapshots = this.snapshots.filter(s => s.name !== name);
  }

  /**
   * Get performance report as a formatted string
   */
  getReport(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];
    
    lines.push('=== Performance Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    // Group metrics by type
    const renderMetrics = Object.entries(metrics)
      .filter(([name]) => name.startsWith('render.'));
    const apiMetrics = Object.entries(metrics)
      .filter(([name]) => name.startsWith('api.'));
    const otherMetrics = Object.entries(metrics)
      .filter(([name]) => !name.startsWith('render.') && !name.startsWith('api.'));
    
    // Render metrics
    if (renderMetrics.length > 0) {
      lines.push('--- Render Times ---');
      for (const [name, metric] of renderMetrics) {
        lines.push(
          `${name}: avg=${metric.avg.toFixed(2)}ms, ` +
          `min=${metric.min.toFixed(2)}ms, ` +
          `max=${metric.max.toFixed(2)}ms, ` +
          `count=${metric.count}`
        );
      }
      lines.push('');
    }
    
    // API metrics
    if (apiMetrics.length > 0) {
      lines.push('--- API Call Times ---');
      for (const [name, metric] of apiMetrics) {
        lines.push(
          `${name}: avg=${metric.avg.toFixed(2)}ms, ` +
          `min=${metric.min.toFixed(2)}ms, ` +
          `max=${metric.max.toFixed(2)}ms, ` +
          `count=${metric.count}`
        );
      }
      lines.push('');
    }
    
    // Other metrics
    if (otherMetrics.length > 0) {
      lines.push('--- Other Metrics ---');
      for (const [name, metric] of otherMetrics) {
        lines.push(
          `${name}: avg=${metric.avg.toFixed(2)}ms, ` +
          `min=${metric.min.toFixed(2)}ms, ` +
          `max=${metric.max.toFixed(2)}ms, ` +
          `count=${metric.count}`
        );
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      snapshots: this.snapshots.slice(-100), // Last 100 snapshots
    }, null, 2);
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// Export hook for React components
export function usePerformanceMonitor(componentName: string) {
  return {
    measure: (callback: () => void) => {
      performanceMonitor.measureRender(componentName, callback);
    },
    measureApi: <T>(endpoint: string, callback: () => Promise<T>) => {
      return performanceMonitor.measureApiCall(`${componentName}.${endpoint}`, callback);
    },
  };
}

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Track Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          performanceMonitor.recordMetric(
            'web-vitals.LCP',
            entry.startTime
          );
        }
        if (entry.entryType === 'first-input') {
          const fid = (entry as any).processingStart - entry.startTime;
          performanceMonitor.recordMetric('web-vitals.FID', fid);
        }
        if (entry.entryType === 'layout-shift') {
          const cls = (entry as any).value;
          if (!cls.hadRecentInput) {
            performanceMonitor.recordMetric('web-vitals.CLS', cls);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  }
}

// Initialize Web Vitals tracking on mount
if (typeof window !== 'undefined') {
  trackWebVitals();
}
