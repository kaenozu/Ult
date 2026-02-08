/**
 * Service Registry
 * 
 * Centralized service registry for dependency injection.
 * Manages service lifecycle and provides singleton access to services.
 */

type Constructor<T> = new (...args: unknown[]) => T;

interface ServiceMetadata {
  name: string;
  instance?: unknown;
  factory?: () => unknown;
  singleton: boolean;
}

class ServiceRegistry {
  private services = new Map<string, ServiceMetadata>();
  private initialized = false;
  private lock = new Map<string, Promise<unknown>>();

  /**
   * Register a service class
   */
  register<T>(
    name: string,
    serviceClass: Constructor<T>,
    options?: { singleton?: boolean }
  ): void {
    if (this.services.has(name)) {
      console.warn(`Service '${name}' is already registered. Overwriting.`);
    }

    this.services.set(name, {
      name,
      factory: () => new serviceClass(),
      singleton: options?.singleton ?? true,
    });
  }

  /**
   * Register a service instance directly
   */
  registerInstance<T>(name: string, instance: T): void {
    if (this.services.has(name)) {
      console.warn(`Service '${name}' is already registered. Overwriting.`);
    }

    this.services.set(name, {
      name,
      instance,
      singleton: true,
    });
  }

  /**
   * Register a service factory function
   */
  registerFactory<T>(name: string, factory: () => T, options?: { singleton?: boolean }): void {
    if (this.services.has(name)) {
      console.warn(`Service '${name}' is already registered. Overwriting.`);
    }

    this.services.set(name, {
      name,
      factory,
      singleton: options?.singleton ?? true,
    });
  }

  /**
   * Get a service instance
   */
  get<T>(name: string): T {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service '${name}' is not registered.`);
    }

    // Return existing instance for singleton services
    if (service.singleton && service.instance) {
      return service.instance as T;
    }

    // Create new instance
    if (service.factory) {
      const instance = service.factory() as T;

      // Store instance for singleton services
      if (service.singleton) {
        service.instance = instance;
      }

      return instance;
    }

    throw new Error(`Service '${name}' has no factory or instance.`);
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Check if a service instance exists (for singleton services)
   */
  hasInstance(name: string): boolean {
    const service = this.services.get(name);
    return service?.singleton === true && service.instance !== undefined;
  }

  /**
   * Unregister a service
   */
  unregister(name: string): boolean {
    const service = this.services.get(name);
    if (!service) return false;

    // Call cleanup if available
    if (service.instance && typeof (service.instance as { destroy?: () => void }).destroy === 'function') {
      (service.instance as { destroy?: () => void }).destroy?.();
    }

    return this.services.delete(name);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.forEach((service) => {
      if (service.instance && typeof (service.instance as { destroy?: () => void }).destroy === 'function') {
        (service.instance as { destroy?: () => void }).destroy?.();
      }
    });
    this.services.clear();
    this.initialized = false;
  }

  /**
   * Get all registered service names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get all services (for debugging)
   */
  getAll(): Map<string, ServiceMetadata> {
    return new Map(this.services);
  }

  /**
   * Initialize all singleton services
   */
  initialize(): void {
    if (this.initialized) return;

    this.services.forEach((service) => {
      if (service.singleton && !service.instance && service.factory) {
        service.instance = service.factory();
      }
    });

    this.initialized = true;
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let registryInstance: ServiceRegistry | null = null;

export function getServiceRegistry(): ServiceRegistry {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry();
  }
  return registryInstance;
}

export const serviceRegistry = getServiceRegistry();
