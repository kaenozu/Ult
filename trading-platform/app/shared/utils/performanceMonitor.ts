/**
 * Performance Monitor
 * 
 * Utility for monitoring and measuring performance in the application.
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export interface PerformanceStats {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  private static warnings: Set<string> = new Set();

  /**
   * Measure execution time of a function
   */
  static measure(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Warning: 100ms threshold
    if (duration > 100) {
      console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
      this.warnings.add(name);
    }
  }

  /**
   * Measure execution time of an async function
   */
  static async measureAsync(name: string, fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Warning: 100ms threshold
    if (duration > 100) {
      console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
      this.warnings.add(name);
    }
  }

  /**
   * Get statistics for a specific metric
   */
  static getStats(name: string): PerformanceStats {
    const metrics = this.metrics.get(name) || [];

    if (metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    return {
      avg: metrics.reduce((a, b) => a + b, 0) / metrics.length,
      min: Math.min(...metrics),
      max: Math.max(...metrics),
      count: metrics.length
    };
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): Map<string, PerformanceStats> {
    const result = new Map<string, PerformanceStats>();

    for (const [name, values] of this.metrics.entries()) {
      result.set(name, this.getStats(name));
    }

    return result;
  }

  /**
   * Clear all metrics
   */
  static clear(): void {
    this.metrics.clear();
    this.warnings.clear();
  }

  /**
   * Get all warnings
   */
  static getWarnings(): string[] {
    return Array.from(this.warnings);
  }

  /**
   * Check if there are any warnings
   */
  static hasWarnings(): boolean {
    return this.warnings.size > 0;
  }
}

// Decorator for measuring function performance
export function measurePerformance(name: string) {
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

      if (!PerformanceMonitor['metrics'].has(name)) {
        PerformanceMonitor['metrics'].set(name, []);
      }
      PerformanceMonitor['metrics'].get(name)!.push(duration);

      // Warning: 100ms threshold
      if (duration > 100) {
        console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
        PerformanceMonitor['warnings'].add(name);
      }

      return result;
    };

    return descriptor;
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor;
