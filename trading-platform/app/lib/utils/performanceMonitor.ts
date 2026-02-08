import { logger } from '@/app/core/logger';
/**
 * Performance Monitor
 * 
 * Unified performance monitoring system with threshold-based severity tracking
 */

export type PerformanceSeverity = 'ok' | 'warning' | 'error';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  severity: PerformanceSeverity;
}

export interface PerformanceStats {
  avg: number;
  min: number;
  max: number;
  count: number;
  okCount: number;
  warningCount: number;
  errorCount: number;
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric[]> = new Map();
  private static warnings: Set<string> = new Set();
  private static errors: Set<string> = new Set();

  /**
   * Record a performance metric with severity
   */
  static record(name: string, duration: number, severity: PerformanceSeverity = 'ok'): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      severity,
    };

    this.metrics.get(name)!.push(metric);

    // Track warnings and errors
    if (severity === 'warning') {
      this.warnings.add(name);
    } else if (severity === 'error') {
      this.errors.add(name);
    }

    // Limit stored metrics per name (keep last 1000)
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Measure execution time of a function
   */
  static measure(name: string, fn: () => unknown, threshold: number = 100): void {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    const severity: PerformanceSeverity = duration > threshold * 2 ? 'error'
      : duration > threshold ? 'warning' : 'ok';

    this.record(name, duration, severity);

    if (severity === 'error') {
      logger.error(`[SLOW-CRITICAL] ${name}: ${duration.toFixed(2)}ms`);
    } else if (severity === 'warning') {
      logger.warn(`[SLOW] ${name}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Measure execution time of an async function
   */
  static async measureAsync(name: string, fn: () => Promise<unknown>, threshold: number = 100): Promise<void> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    const severity: PerformanceSeverity = duration > threshold * 2 ? 'error'
      : duration > threshold ? 'warning' : 'ok';

    this.record(name, duration, severity);

    if (severity === 'error') {
      logger.error(`[SLOW-CRITICAL] ${name}: ${duration.toFixed(2)}ms`);
    } else if (severity === 'warning') {
      logger.warn(`[SLOW] ${name}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get statistics for a specific metric
   */
  static getStats(name: string): PerformanceStats {
    const metrics = this.metrics.get(name) || [];

    if (metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0, okCount: 0, warningCount: 0, errorCount: 0 };
    }

    const durations = metrics.map(m => m.duration);
    const okCount = metrics.filter(m => m.severity === 'ok').length;
    const warningCount = metrics.filter(m => m.severity === 'warning').length;
    const errorCount = metrics.filter(m => m.severity === 'error').length;

    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: metrics.length,
      okCount,
      warningCount,
      errorCount,
    };
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): Map<string, PerformanceStats> {
    const result = new Map<string, PerformanceStats>();

    // Use Array.from to avoid downlevelIteration issues
    const entries = Array.from(this.metrics.keys());
    for (const name of entries) {
      result.set(name, this.getStats(name));
    }

    return result;
  }

  /**
   * Get raw metrics for a specific name
   */
  static getRawMetrics(name: string, limit?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    if (limit) {
      return metrics.slice(-limit);
    }
    return [...metrics];
  }

  /**
   * Clear all metrics
   */
  static clear(): void {
    this.metrics.clear();
    this.warnings.clear();
    this.errors.clear();
  }

  /**
   * Clear metrics for a specific name
   */
  static clearMetric(name: string): void {
    this.metrics.delete(name);
    this.warnings.delete(name);
    this.errors.delete(name);
  }

  /**
   * Get all warnings
   */
  static getWarnings(): string[] {
    return Array.from(this.warnings);
  }

  /**
   * Get all errors
   */
  static getErrors(): string[] {
    return Array.from(this.errors);
  }

  /**
   * Check if there are any warnings
   */
  static hasWarnings(): boolean {
    return this.warnings.size > 0;
  }

  /**
   * Check if there are any errors
   */
  static hasErrors(): boolean {
    return this.errors.size > 0;
  }

  /**
   * Get metrics filtered by severity
   */
  static getMetricsBySeverity(severity: PerformanceSeverity): Map<string, PerformanceMetric[]> {
    const result = new Map<string, PerformanceMetric[]>();

    // Use Array.from to avoid downlevelIteration issues
    const entries = Array.from(this.metrics.entries());
    for (const [name, metrics] of entries) {
      const filtered = metrics.filter(m => m.severity === severity);
      if (filtered.length > 0) {
        result.set(name, filtered);
      }
    }

    return result;
  }

  /**
   * Get performance summary report
   */
  static getSummary(): {
    totalMetrics: number;
    totalMeasurements: number;
    slowOperations: string[];
    criticalOperations: string[];
    healthScore: number;
  } {
    let totalMeasurements = 0;
    const slowOperations: string[] = [];
    const criticalOperations: string[] = [];

    // Use Array.from to avoid downlevelIteration issues
    const entries = Array.from(this.metrics.entries());
    for (const [name, metrics] of entries) {
      totalMeasurements += metrics.length;
      
      const warningCount = metrics.filter(m => m.severity === 'warning').length;
      const errorCount = metrics.filter(m => m.severity === 'error').length;

      if (errorCount > 0) {
        criticalOperations.push(`${name} (${errorCount} critical)`);
      } else if (warningCount > 0) {
        slowOperations.push(`${name} (${warningCount} slow)`);
      }
    }

    // Calculate health score (0-100)
    const totalWarnings = this.warnings.size;
    const totalErrors = this.errors.size;
    const healthScore = Math.max(0, 100 - (totalWarnings * 5) - (totalErrors * 20));

    return {
      totalMetrics: this.metrics.size,
      totalMeasurements,
      slowOperations,
      criticalOperations,
      healthScore,
    };
  }
}

// Decorator for measuring function performance (deprecated, use decorators from performance-utils.ts)
export function measurePerformance(name: string, threshold: number = 100) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const duration = performance.now() - start;

      const severity: PerformanceSeverity = duration > threshold * 2 ? 'error'
        : duration > threshold ? 'warning' : 'ok';

      PerformanceMonitor.record(name, duration, severity);

      if (severity === 'error') {
        logger.error(`[SLOW-CRITICAL] ${name}: ${duration.toFixed(2)}ms`);
      } else if (severity === 'warning') {
        logger.warn(`[SLOW] ${name}: ${duration.toFixed(2)}ms`);
      }

      return result;
    };

    return descriptor;
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor;
