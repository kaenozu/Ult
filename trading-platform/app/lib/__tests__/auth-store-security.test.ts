
import { describe, expect, test, afterEach, jest } from '@jest/globals';

describe('AuthStore Security', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  test('should NOT create default admin user in production', async () => {
    // Set production env
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      JWT_SECRET: 'secure-secret-that-is-at-least-32-chars-long-12345',
    };

    // Dynamic import to pick up new env
    // Note: We need to use require or import() after resetting modules
    const { authStore } = await import('../auth-store');

    const adminUser = authStore.getUser('admin@example.com');
    expect(adminUser).toBeUndefined();
  });

  test('should create default admin user in development', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'development',
    };

    const { authStore } = await import('../auth-store');

    const adminUser = authStore.getUser('admin@example.com');
    expect(adminUser).toBeDefined();
    expect(adminUser?.role).toBe('admin');
  });
});
