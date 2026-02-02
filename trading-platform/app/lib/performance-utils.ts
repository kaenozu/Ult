/**
 * performance-utils.ts
 * 
 * Standardized performance measurement utilities
 * Provides decorators and functions for consistent performance tracking
 */

import { PerformanceMonitor } from './utils/performanceMonitor';

// Re-export PerformanceMonitor for convenience
export { PerformanceMonitor };
export type { PerformanceMetric, PerformanceStats } from './utils/performanceMonitor';

export type PerformanceSeverity = 'ok' | 'warning' | 'error';

export interface MeasureOptions {
  threshold?: number;
  warningThreshold?: number;
  errorThreshold?: number;
  context?: Record<string, any>;
}

/**
 * Performance decorator for synchronous methods
 * Automatically measures and records method execution time
 * 
 * @param name - Metric name for tracking
 * @param options - Measurement options including thresholds
 * 
 * @example
 * class DataService {
 *   @measure('data-fetch', { threshold: 50 })
 *   fetchData() {
 *     // ...
 *   }
 * }
 */
export function measure(name: string, options: MeasureOptions = {}) {
  const { threshold = 100, warningThreshold, errorThreshold } = options;
  const warnThreshold = warningThreshold || threshold;
  const errThreshold = errorThreshold || threshold * 2;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const fullName = `${name}`;

      try {
        const result = originalMethod.apply(this, args);
        const duration = performance.now() - start;

        // Determine severity based on thresholds
        let severity: PerformanceSeverity = 'ok';
        if (duration > errThreshold) {
          severity = 'error';
          console.error(`[SLOW-CRITICAL] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${errThreshold}ms)`);
        } else if (duration > warnThreshold) {
          severity = 'warning';
          console.warn(`[SLOW] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${warnThreshold}ms)`);
        }

        // Record metric
        PerformanceMonitor.record(fullName, duration, severity);

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`[Performance] ${fullName} failed after ${duration.toFixed(2)}ms:`, error);
        PerformanceMonitor.record(fullName, duration, 'error');
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Performance decorator for asynchronous methods
 * Automatically measures and records async method execution time
 * 
 * @param name - Metric name for tracking
 * @param options - Measurement options including thresholds
 * 
 * @example
 * class APIService {
 *   @measureAsync('api-call', { threshold: 200 })
 *   async fetchFromAPI() {
 *     // ...
 *   }
 * }
 */
export function measureAsync(name: string, options: MeasureOptions = {}) {
  const { threshold = 100, warningThreshold, errorThreshold } = options;
  const warnThreshold = warningThreshold || threshold;
  const errThreshold = errorThreshold || threshold * 2;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const fullName = `${name}`;

      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;

        // Determine severity based on thresholds
        let severity: PerformanceSeverity = 'ok';
        if (duration > errThreshold) {
          severity = 'error';
          console.error(`[SLOW-CRITICAL] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${errThreshold}ms)`);
        } else if (duration > warnThreshold) {
          severity = 'warning';
          console.warn(`[SLOW] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${warnThreshold}ms)`);
        }

        // Record metric
        PerformanceMonitor.record(fullName, duration, severity);

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`[Performance] ${fullName} failed after ${duration.toFixed(2)}ms:`, error);
        PerformanceMonitor.record(fullName, duration, 'error');
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Functional wrapper for measuring synchronous operations
 * Use when decorators are not applicable
 * 
 * @param name - Metric name
 * @param fn - Function to measure
 * @param options - Measurement options
 * @returns Function result
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  options: MeasureOptions = {}
): T {
  const { threshold = 100 } = options;
  const start = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - start;

    const severity: PerformanceSeverity = duration > threshold * 2 ? 'error' 
      : duration > threshold ? 'warning' : 'ok';

    if (severity === 'error') {
      console.error(`[SLOW-CRITICAL] ${name}: ${duration.toFixed(2)}ms`);
    } else if (severity === 'warning') {
      console.warn(`[SLOW] ${name}: ${duration.toFixed(2)}ms`);
    }

    PerformanceMonitor.record(name, duration, severity);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    PerformanceMonitor.record(name, duration, 'error');
    throw error;
  }
}

/**
 * Functional wrapper for measuring asynchronous operations
 * Use when decorators are not applicable
 * 
 * @param name - Metric name
 * @param fn - Async function to measure
 * @param options - Measurement options
 * @returns Promise with function result
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  options: MeasureOptions = {}
): Promise<T> {
  const { threshold = 100 } = options;
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    const severity: PerformanceSeverity = duration > threshold * 2 ? 'error' 
      : duration > threshold ? 'warning' : 'ok';

    if (severity === 'error') {
      console.error(`[SLOW-CRITICAL] ${name}: ${duration.toFixed(2)}ms`);
    } else if (severity === 'warning') {
      console.warn(`[SLOW] ${name}: ${duration.toFixed(2)}ms`);
    }

    PerformanceMonitor.record(name, duration, severity);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    PerformanceMonitor.record(name, duration, 'error');
    throw error;
  }
}
