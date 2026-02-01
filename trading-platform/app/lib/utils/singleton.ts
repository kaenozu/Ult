/**
 * Singleton Utility
 * 
 * Provides a reusable pattern for creating singleton instances.
 * This eliminates the need for duplicate singleton implementation code.
 */

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
      // Call stop/cleanup if available
      if (instance && typeof (instance as any).stop === 'function') {
        (instance as any).stop();
      }
      if (instance && typeof (instance as any).cleanup === 'function') {
        (instance as any).cleanup();
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
  private static instances = new Map<any, any>();

  protected constructor() {}

  public static getInstance<T>(this: new () => T): T {
    if (!Singleton.instances.has(this)) {
      Singleton.instances.set(this, new this());
    }
    return Singleton.instances.get(this);
  }

  public static resetInstance<T>(this: new () => T): void {
    const instance = Singleton.instances.get(this);
    if (instance && typeof (instance as any).cleanup === 'function') {
      (instance as any).cleanup();
    }
    Singleton.instances.delete(this);
  }

  public static hasInstance<T>(this: new () => T): boolean {
    return Singleton.instances.has(this);
  }
}
