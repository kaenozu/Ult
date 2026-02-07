/**
 * Dependency Injection Container
 * 
 * サービスの依存性注入を管理するコンテナ
 * テスト時にモックに差し替え可能
 */

export type Constructor<T> = new (...args: unknown[]) => T;
export type Factory<T> = () => T;

export interface ServiceDefinition<T> {
  token: symbol;
  factory: Factory<T>;
  singleton?: boolean;
  instance?: T;
}

export class DIContainer {
  private services = new Map<symbol, ServiceDefinition<any>>();
  private singletons = new Map<symbol, any>();

  register<T>(token: symbol, factory: Factory<T>, singleton = false): void {
    this.services.set(token, { token, factory, singleton });
  }

  resolve<T>(token: symbol): T {
    const definition = this.services.get(token);
    if (!definition) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    if (definition.singleton) {
      if (!this.singletons.has(token)) {
        this.singletons.set(token, definition.factory());
      }
      return this.singletons.get(token);
    }

    return definition.factory();
  }

  registerSingleton<T>(token: symbol, factory: Factory<T>): void {
    this.register(token, factory, true);
  }

  reset(): void {
    this.singletons.clear();
  }

  has(token: symbol): boolean {
    return this.services.has(token);
  }
}

export const container = new DIContainer();

export function inject<T>(token: symbol): T {
  return container.resolve<T>(token);
}

/**
 * Initialize default services
 * Call this once at application startup
 */
export function initializeContainer(): void {
  // Register UnifiedTradingPlatform dependencies as singletons
  // Note: Imports and actual service implementations will be added when needed
  // This allows for lazy loading and easier testing with mocks
}

/**
 * Register a service
 * Helper function for registering services
 */
export function registerService<T>(
  token: symbol,
  factory: () => T,
  singleton = true
): void {
  container.register<T>(token, factory, singleton);
}
