/**
 * Singleton Utility
 * 
 * Provides a reusable pattern for creating singleton instances.
 * This eliminates the need for duplicate singleton implementation code.
 */

/**
 * Type for classes that may have cleanup methods
 */
interface MaybeCleanable {
  cleanup?: () => void;
  stop?: () => void;
  disconnect?: () => void;
}

/**
 * Creates a singleton factory for a given class or constructor
 * 
 * @example
 * ```typescript
 * // Instead of:
 * let globalEngine: MyEngine | null = null;
 * export function getGlobalEngine() {
 *   if (!globalEngine) {
 *     globalEngine = new MyEngine();
 *   }
 *   return globalEngine;
 * }
 * 
 * // Use:
 * const { getInstance, resetInstance } = createSingleton(() => new MyEngine());
 * export const getGlobalEngine = getInstance;
 * export const resetGlobalEngine = resetInstance;
 * ```
 */
export function createSingleton<T, TConfig = undefined>(
  creator: (config?: TConfig) => T
): {
  getInstance: (config?: TConfig) => T;
  resetInstance: () => void;
  hasInstance: () => boolean;
} {
  let instance: T | null = null;

  return {
    /**
     * Get the singleton instance, creating it if necessary
     */
    getInstance: (config?: TConfig): T => {
      if (!instance) {
        instance = creator(config);
      }
      return instance;
    },

    /**
     * Reset the singleton instance (useful for testing)
     */
    resetInstance: (): void => {
      // Call cleanup methods if available
      const cleanable = instance as MaybeCleanable | null;
      if (cleanable && typeof cleanable.stop === 'function') {
        cleanable.stop();
      }
      if (cleanable && typeof cleanable.cleanup === 'function') {
        cleanable.cleanup();
      }
      if (cleanable && typeof cleanable.disconnect === 'function') {
        cleanable.disconnect();
      }
      instance = null;
    },

    /**
     * Check if instance exists
     */
    hasInstance: (): boolean => {
      return instance !== null;
    },
  };
}

/**
 * Base class for singleton patterns using class-based approach
 * 
 * @example
 * ```typescript
 * class MyService extends Singleton<MyService> {
 *   private constructor() {
 *     super();
 *   }
 * }
 * 
 * // Usage:
 * const instance = MyService.getInstance();
 * ```
 */
export abstract class Singleton<T> {
   
  private static instances = new Map<new () => unknown, unknown>();

  protected constructor() {}

  public static getInstance<T>(this: { new (): T }): T {
    if (!Singleton.instances.has(this)) {
      Singleton.instances.set(this, new this());
    }
    return Singleton.instances.get(this) as T;
  }

  public static resetInstance<T>(this: { new (): T }): void {
    const instance = Singleton.instances.get(this) as T | null;
    if (instance) {
      // Call cleanup methods if available
      const cleanable = instance as unknown as MaybeCleanable;
      if (typeof cleanable.cleanup === 'function') {
        cleanable.cleanup();
      }
      if (typeof cleanable.stop === 'function') {
        cleanable.stop();
      }
      if (typeof cleanable.disconnect === 'function') {
        cleanable.disconnect();
      }
    }
    Singleton.instances.delete(this);
  }

  public static hasInstance<T>(this: { new (): T }): boolean {
    return Singleton.instances.has(this);
  }
}
