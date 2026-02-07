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
  private services = new Map<symbol, ServiceDefinition<unknown>>();
  private singletons = new Map<symbol, unknown>();

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
      return this.singletons.get(token) as T;
    }

    return definition.factory() as T;
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
