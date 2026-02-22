import { describe, expect, test, afterEach, jest } from '@jest/globals';

describe('AuthStore Security', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  test('should NOT create default admin user when ENABLE_DEFAULT_ADMIN is false (default)', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      ENABLE_DEFAULT_ADMIN: 'false',
      JWT_SECRET: 'secure-secret-that-is-at-least-32-chars-long-12345',
    };

    const { authStore } = await import('../auth-store');

    const adminUser = authStore.getUser('admin@example.com');
    expect(adminUser).toBeUndefined();
  });

  test('should create default admin user when ENABLE_DEFAULT_ADMIN is true', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      ENABLE_DEFAULT_ADMIN: 'true',
      DEFAULT_ADMIN_EMAIL: 'testadmin@example.com',
      DEFAULT_ADMIN_PASSWORD: 'testpassword123',
    };

    const { authStore } = await import('../auth-store');

    const adminUser = authStore.getUser('testadmin@example.com');
    expect(adminUser).toBeDefined();
    expect(adminUser?.role).toBe('admin');
    expect(adminUser?.email).toBe('testadmin@example.com');
  });

  test('should NOT create default admin even in production if ENABLE_DEFAULT_ADMIN is false', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      ENABLE_DEFAULT_ADMIN: 'false',
      JWT_SECRET: 'secure-secret-that-is-at-least-32-chars-long-12345',
    };

    const { authStore } = await import('../auth-store');

    const adminUser = authStore.getUser('admin@example.com');
    expect(adminUser).toBeUndefined();
  });
});
