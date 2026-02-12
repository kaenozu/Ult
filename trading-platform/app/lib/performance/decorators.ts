/**
 * Performance Decorators
 * 
 * メソッドのパフォーマンス計測用デコレータ
 */

import { performanceMonitor } from './monitor';

export interface MeasureOptions {
  name?: string;
  context?: Record<string, unknown>;
  enabled?: boolean;
}

// Method decorator for synchronous functions
export function measure(options: MeasureOptions = {}) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const metricName = options.name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (this: object, ...args: unknown[]): ReturnType<T> {
      if (options.enabled === false) {
        return originalMethod.apply(this, args as Parameters<T>) as ReturnType<T>;
      }

      const context = {
        ...options.context,
        args: args.map(arg =>
          typeof arg === 'object' ? '[object]' : String(arg).slice(0, 50)
        ),
      };

      return performanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args as Parameters<T>),
        context
      ) as ReturnType<T>;
    } as T;

    return descriptor;
  };
}

// Method decorator for asynchronous functions
export function measureAsync(options: MeasureOptions = {}) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const metricName = options.name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (this: object, ...args: unknown[]): Promise<ReturnType<T>> {
      if (options.enabled === false) {
        return originalMethod.apply(this, args as Parameters<T>) as ReturnType<T>;
      }

      const context = {
        ...options.context,
        args: args.map(arg =>
          typeof arg === 'object' ? '[object]' : String(arg).slice(0, 50)
        ),
      };

      return performanceMonitor.measureAsync(
        metricName,
        () => originalMethod.apply(this, args as Parameters<T>),
        context
      ) as Promise<ReturnType<T>>;
    } as T;

    return descriptor;
  };
}

// Class decorator to measure all methods
 
export function measureAllClass(options: MeasureOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends { new (...args: any[]): any }>(constructor: T): T {
    const className = constructor.name;

    return class extends constructor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        super(...args);

        // Get all method names
        const prototype = constructor.prototype;
        const methodNames = Object.getOwnPropertyNames(prototype).filter(
          name => name !== 'constructor' && typeof (prototype as Record<string, unknown>)[name] === 'function'
        );

        // Wrap each method
        methodNames.forEach(methodName => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const originalMethod = (this as Record<string, any>)[methodName];
          const isAsync = originalMethod.constructor.name === 'AsyncFunction';
          const metricName = options.name || `${className}.${methodName}`;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this as Record<string, any>)[methodName] = isAsync
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? async (...methodArgs: any[]) => {
                if (options.enabled === false) {
                  return originalMethod.apply(this, methodArgs);
                }
                return performanceMonitor.measureAsync(
                  metricName,
                  () => originalMethod.apply(this, methodArgs),
                  options.context
                );
              }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : (...methodArgs: any[]) => {
                if (options.enabled === false) {
                  return originalMethod.apply(this, methodArgs);
                }
                return performanceMonitor.measure(
                  metricName,
                  () => originalMethod.apply(this, methodArgs),
                  options.context
                );
            };
        });
      }
    };
  };
}
