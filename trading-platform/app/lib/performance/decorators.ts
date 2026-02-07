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
    target: { constructor: { name: string } },
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const metricName = options.name || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = function (this: unknown, ...args: unknown[]): unknown {
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
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: { constructor: { name: string } },
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const metricName = options.name || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
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
  return function <T extends { new (...args: any[]): object }>(constructor: T): T {
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
          const originalMethod = (this as Record<string, unknown>)[methodName] as (...args: unknown[]) => unknown;
          const isAsync = originalMethod.constructor.name === 'AsyncFunction';
          const metricName = options.name || `${className}.${methodName}`;
          
          (this as Record<string, unknown>)[methodName] = isAsync
            ? async (...methodArgs: unknown[]) => {
                if (options.enabled === false) {
                  return originalMethod.apply(this, methodArgs);
                }
                return performanceMonitor.measureAsync(
                  metricName,
                  () => originalMethod.apply(this, methodArgs) as Promise<unknown>,
                  options.context
                );
              }
            : (...methodArgs: unknown[]) => {
                if (options.enabled === false) {
                  return originalMethod.apply(this, methodArgs);
                }
                return performanceMonitor.measure(
                  metricName,
                  () => originalMethod.apply(this, methodArgs) as unknown,
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
