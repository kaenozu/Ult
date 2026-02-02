/**
 * Performance Decorators
 * 
 * メソッドのパフォーマンス計測用デコレータ
 */

import { performanceMonitor } from './monitor';

export interface MeasureOptions {
  name?: string;
  context?: Record<string, any>;
  enabled?: boolean;
}

// Method decorator for synchronous functions
export function measure(options: MeasureOptions = {}) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const metricName = options.name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (this: any, ...args: any[]): ReturnType<T> {
      if (options.enabled === false) {
        return originalMethod.apply(this, args);
      }

      const context = {
        ...options.context,
        args: args.map(arg => 
          typeof arg === 'object' ? '[object]' : String(arg).slice(0, 50)
        ),
      };

      return performanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args),
        context
      );
    } as T;

    return descriptor;
  };
}

// Method decorator for asynchronous functions
export function measureAsync(options: MeasureOptions = {}) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const metricName = options.name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (this: any, ...args: any[]): Promise<ReturnType<T>> {
      if (options.enabled === false) {
        return originalMethod.apply(this, args);
      }

      const context = {
        ...options.context,
        args: args.map(arg => 
          typeof arg === 'object' ? '[object]' : String(arg).slice(0, 50)
        ),
      };

      return performanceMonitor.measureAsync(
        metricName,
        () => originalMethod.apply(this, args),
        context
      );
    } as T;

    return descriptor;
  };
}

// Class decorator to measure all methods
export function measureAllClass(options: MeasureOptions = {}) {
  return function <T extends { new (...args: any[]): any }>(constructor: T): T {
    const className = constructor.name;

    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);

        // Get all method names
        const prototype = constructor.prototype;
        const methodNames = Object.getOwnPropertyNames(prototype).filter(
          name => name !== 'constructor' && typeof prototype[name] === 'function'
        );

        // Wrap each method
        methodNames.forEach(methodName => {
          const originalMethod = (this as any)[methodName];
          const isAsync = originalMethod.constructor.name === 'AsyncFunction';
          const metricName = options.name || `${className}.${methodName}`;

          (this as any)[methodName] = isAsync
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

// Re-export performanceMonitor for convenience
export { performanceMonitor } from './monitor';
