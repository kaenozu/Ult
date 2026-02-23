import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';

// Store original env
const originalEnv = process.env;

describe('Environment Security', () => {
  beforeEach(() => {
    jest.resetModules(); // Clear cache to reload env.ts
    process.env = { ...originalEnv }; // Reset env vars
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error in production if JWT_SECRET is default', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'demo-secret-must-be-at-least-32-chars-long'; // Default from source

    expect(() => {
      require('../env');
    }).toThrow('CRITICAL SECURITY ERROR: You are running in production with the default JWT_SECRET');
  });

  it('should NOT throw an error in production if JWT_SECRET is secure', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-very-secure-random-secret-that-is-long-enough';

    expect(() => {
      require('../env');
    }).not.toThrow();
  });

  it('should throw an error in production if ENABLE_DEFAULT_ADMIN is true and password is default', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-very-secure-random-secret-that-is-long-enough';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';

    expect(() => {
      require('../env');
    }).toThrow('CRITICAL SECURITY ERROR: You have enabled the default admin account with the default password in production');
  });

  it('should NOT throw an error in production if ENABLE_DEFAULT_ADMIN is true but password is secure', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-very-secure-random-secret-that-is-long-enough';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'NewSecurePassword123!';

    expect(() => {
      require('../env');
    }).not.toThrow();
  });

  it('should NOT throw an error in development with default admin password', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';

    expect(() => {
      require('../env');
    }).not.toThrow();
  });

  it('should NOT throw an error in development with default secret', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'demo-secret-must-be-at-least-32-chars-long';

    expect(() => {
      require('../env');
    }).not.toThrow();
  });
});
