/**
 * Unit tests for Singleton utility
 * Tests type safety improvements and cleanup functionality
 */

import { createSingleton, Singleton } from '../singleton';

describe('createSingleton', () => {
  // Test class with cleanup methods
  class TestService {
    public cleaned = false;
    public stopped = false;
    public disconnected = false;

    cleanup(): void {
      this.cleaned = true;
    }

    stop(): void {
      this.stopped = true;
    }

    disconnect(): void {
      this.disconnected = true;
    }
  }

  // Test class without cleanup methods
  class SimpleService {
    public value: number;

    constructor(value: number = 42) {
      this.value = value;
    }
  }

  describe('getInstance', () => {
    it('should create singleton instance on first call', () => {
      const { getInstance, resetInstance } = createSingleton(() => new SimpleService());

      const instance1 = getInstance();
      expect(instance1).toBeDefined();
      expect(instance1.value).toBe(42);

      resetInstance();
    });

    it('should return same instance on subsequent calls', () => {
      const { getInstance, resetInstance } = createSingleton(() => new SimpleService());

      const instance1 = getInstance();
      const instance2 = getInstance();

      expect(instance1).toBe(instance2);

      resetInstance();
    });

    it('should support configuration parameter', () => {
      const { getInstance, resetInstance } = createSingleton(
        (config?: number) => new SimpleService(config)
      );

      const instance = getInstance(100);
      expect(instance.value).toBe(100);

      resetInstance();
    });

    it('should ignore config on subsequent calls', () => {
      const { getInstance, resetInstance } = createSingleton(
        (config?: number) => new SimpleService(config)
      );

      const instance1 = getInstance(100);
      const instance2 = getInstance(200); // This should be ignored

      expect(instance1).toBe(instance2);
      expect(instance2.value).toBe(100);

      resetInstance();
    });
  });

  describe('resetInstance', () => {
    it('should reset instance to null', () => {
      const { getInstance, resetInstance, hasInstance } = createSingleton(
        () => new SimpleService()
      );

      getInstance();
      expect(hasInstance()).toBe(true);

      resetInstance();
      expect(hasInstance()).toBe(false);
    });

    it('should create new instance after reset', () => {
      const { getInstance, resetInstance } = createSingleton(() => new SimpleService());

      const instance1 = getInstance();
      resetInstance();
      const instance2 = getInstance();

      expect(instance1).not.toBe(instance2);

      resetInstance();
    });

    it('should call cleanup method if available', () => {
      const { getInstance, resetInstance } = createSingleton(() => new TestService());

      const instance = getInstance();
      expect(instance.cleaned).toBe(false);

      resetInstance();
      expect(instance.cleaned).toBe(true);
    });

    it('should call stop method if available', () => {
      const { getInstance, resetInstance } = createSingleton(() => new TestService());

      const instance = getInstance();
      expect(instance.stopped).toBe(false);

      resetInstance();
      expect(instance.stopped).toBe(true);
    });

    it('should call disconnect method if available', () => {
      const { getInstance, resetInstance } = createSingleton(() => new TestService());

      const instance = getInstance();
      expect(instance.disconnected).toBe(false);

      resetInstance();
      expect(instance.disconnected).toBe(true);
    });

    it('should handle instances without cleanup methods', () => {
      const { getInstance, resetInstance } = createSingleton(() => new SimpleService());

      getInstance();
      expect(() => resetInstance()).not.toThrow();
    });
  });

  describe('hasInstance', () => {
    it('should return false before instance creation', () => {
      const { hasInstance, resetInstance } = createSingleton(() => new SimpleService());

      expect(hasInstance()).toBe(false);

      resetInstance();
    });

    it('should return true after instance creation', () => {
      const { getInstance, hasInstance, resetInstance } = createSingleton(
        () => new SimpleService()
      );

      getInstance();
      expect(hasInstance()).toBe(true);

      resetInstance();
    });

    it('should return false after reset', () => {
      const { getInstance, resetInstance, hasInstance } = createSingleton(
        () => new SimpleService()
      );

      getInstance();
      resetInstance();
      expect(hasInstance()).toBe(false);
    });
  });

  describe('type safety', () => {
    it('should maintain type information', () => {
      const { getInstance, resetInstance } = createSingleton(() => new SimpleService(123));

      const instance = getInstance();
      // TypeScript should know that instance has a 'value' property
      expect(instance.value).toBe(123);

      resetInstance();
    });

    it('should work with generic types', () => {
      interface Config {
        timeout: number;
      }

      class ConfigurableService {
        constructor(public config: Config) {}
      }

      const { getInstance, resetInstance } = createSingleton<
        ConfigurableService,
        Config
      >((config?: Config) => new ConfigurableService(config || { timeout: 1000 }));

      const instance = getInstance({ timeout: 5000 });
      expect(instance.config.timeout).toBe(5000);

      resetInstance();
    });
  });
});
