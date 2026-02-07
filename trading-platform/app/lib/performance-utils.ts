import { logger } from '@/app/core/logger';
import { PerformanceMonitor } from './performance/monitor';
import type { PerformanceSeverity } from './performance/monitor';

export interface MeasureOptions {
  threshold?: number;
  warningThreshold?: number;
  errorThreshold?: number;
}

/**
 * Decorator for measuring synchronous method performance
 * Automatically logs slow operations and records metrics
 *
 * @param name - Metric name
 * @param options - Measurement options
 *
 * @example
 * ```typescript
 * class MyService {
 *   @measurePerformance('calculate_metrics', { threshold: 100 })
 *   calculateMetrics(data: any) {
 *     // This method will be measured
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // As a function wrapper
 * const result = measurePerformance('my_operation', () => {
 *   // Code to measure
 * });
 * ```
 */
export function measurePerformance(name: string, arg1: any, arg2?: any) {
  // Check if this is a decorator use case (target, propertyKey, descriptor) or functional use case
  if (typeof arg1 === 'function') {
    // Functional use case: measurePerformance(name, fn, options)
    const fn = arg1;
    const options: MeasureOptions = arg2 || {};
    const { threshold = 100 } = options;
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      const severity: PerformanceSeverity = duration > threshold * 2 ? 'error'
        : duration > threshold ? 'warning' : 'ok';

      if (severity === 'error') {
        logger.error(`[SLOW-CRITICAL] ${name}: ${duration.toFixed(2)}ms`);
      } else if (severity === 'warning') {
        logger.warn(`[SLOW] ${name}: ${duration.toFixed(2)}ms`);
      }

      PerformanceMonitor.record(name, duration, severity);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, errorObj);
      PerformanceMonitor.record(name, duration, 'error');
      throw error;
    }
  } else if (typeof arg1 === 'object') {
    // Decorator use case: @measurePerformance(name, options)
    const options: MeasureOptions = arg1;
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
            logger.error(`[SLOW-CRITICAL] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${errThreshold}ms)`);
          } else if (duration > warnThreshold) {
            severity = 'warning';
            logger.warn(`[SLOW] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${warnThreshold}ms)`);
          }

          // Record metric
          PerformanceMonitor.record(fullName, duration, severity);

          return result;
        } catch (error) {
          const duration = performance.now() - start;
          const errorObj = error instanceof Error ? error : new Error(String(error));
          logger.error(`[Performance] ${fullName} failed after ${duration.toFixed(2)}ms:`, errorObj);
          PerformanceMonitor.record(fullName, duration, 'error');
          throw error;
        }
      };

      return descriptor;
    };
  }
  
  throw new Error('Invalid usage of measurePerformance. Use either @measurePerformance(name, options) as decorator or measurePerformance(name, fn, options) as function');
}

/**
 * Decorator for measuring asynchronous method performance
 * Automatically logs slow operations and records metrics
 *
 * @param name - Metric name
 * @param options - Measurement options
 *
 * @example
 * ```typescript
 * class MyService {
 *   @measureAsyncPerformance('fetch_data', { threshold: 1000 })
 *   async fetchData(id: string) {
 *     // This async method will be measured
 *   }
 * }
 * ```
 */
export function measureAsyncPerformance(name: string, options: MeasureOptions = {}) {
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
          logger.error(`[SLOW-CRITICAL] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${errThreshold}ms)`);
        } else if (duration > warnThreshold) {
          severity = 'warning';
          logger.warn(`[SLOW] ${fullName}: ${duration.toFixed(2)}ms (threshold: ${warnThreshold}ms)`);
        }

        // Record metric
        PerformanceMonitor.record(fullName, duration, severity);

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error(`[Performance] ${fullName} failed after ${duration.toFixed(2)}ms:`, errorObj);
        PerformanceMonitor.record(fullName, duration, 'error');
        throw error;
      }
    };

    return descriptor;
  };
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
      logger.error(`[SLOW-CRITICAL] ${name}: ${duration.toFixed(2)}ms`);
    } else if (severity === 'warning') {
      logger.warn(`[SLOW] ${name}: ${duration.toFixed(2)}ms`);
    }

    PerformanceMonitor.record(name, duration, severity);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, errorObj);
    PerformanceMonitor.record(name, duration, 'error');
    throw error;
  }
}

/**
 * Batch measurement for multiple operations
 * Useful for measuring complete workflows
 *
 * @param name - Batch name
 * @param operations - Array of operations with names and functions
 */
export async function measureBatchPerformance(
  name: string,
  operations: Array<{ name: string; fn: () => Promise<any> }>
): Promise<void> {
  const batchStart = performance.now();

  try {
    for (const op of operations) {
      const opStart = performance.now();
      try {
        await op.fn();
        const opDuration = performance.now() - opStart;
        PerformanceMonitor.record(`${name}.${op.name}`, opDuration, 'ok');
      } catch (error) {
        const opDuration = performance.now() - opStart;
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error(`[Batch] ${name}.${op.name} failed after ${opDuration.toFixed(2)}ms:`, errorObj);
        PerformanceMonitor.record(`${name}.${op.name}`, opDuration, 'error');
      }
    }

    const totalDuration = performance.now() - batchStart;
    logger.info(`[Batch] ${name} completed in ${totalDuration.toFixed(2)}ms`);
  } catch (error) {
    const totalDuration = performance.now() - batchStart;
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error(`[Batch] ${name} failed after ${totalDuration.toFixed(2)}ms:`, errorObj);
    throw error;
  }
}
