import { describe, expect, test, afterEach, jest } from '@jest/globals';

describe('Environment Security Checks', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  test('should throw critical error in production if ENABLE_DEFAULT_ADMIN is true and password is default', () => {
    // Simulate production environment
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      JWT_SECRET: 'secure-secret-that-is-at-least-32-chars-long-12345',
      ENABLE_DEFAULT_ADMIN: 'true',
      DEFAULT_ADMIN_PASSWORD: 'admin123', // Default password
    };

    // We expect importing env.ts to throw an error
    expect(() => {
      require('../env');
    }).toThrow(/CRITICAL SECURITY ERROR: You have enabled default admin in production with the default password/);
  });

  test('should NOT throw error in production if ENABLE_DEFAULT_ADMIN is true but password is CHANGED', () => {
    // Simulate production environment with changed password
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      JWT_SECRET: 'secure-secret-that-is-at-least-32-chars-long-12345',
      ENABLE_DEFAULT_ADMIN: 'true',
      DEFAULT_ADMIN_PASSWORD: 'secure-password-changed-123',
    };

    expect(() => {
      require('../env');
    }).not.toThrow();
  });

  test('should NOT throw error in development if ENABLE_DEFAULT_ADMIN is true and password is default', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'development',
      JWT_SECRET: 'demo-secret-must-be-at-least-32-chars-long', // Default JWT secret allowed in dev
      ENABLE_DEFAULT_ADMIN: 'true',
      DEFAULT_ADMIN_PASSWORD: 'admin123',
    };

    expect(() => {
      require('../env');
    }).not.toThrow();
  });

  test('should throw critical error in production if JWT_SECRET is default', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      JWT_SECRET: 'demo-secret-must-be-at-least-32-chars-long', // Default secret
      ENABLE_DEFAULT_ADMIN: 'false',
    };

    expect(() => {
      require('../env');
    }).toThrow(/CRITICAL SECURITY ERROR: You are running in production with the default JWT_SECRET/);
  });
});
