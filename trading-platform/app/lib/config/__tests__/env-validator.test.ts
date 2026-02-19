/**
 * Tests for Environment Variable Validation
 */

import { 
  validateEnvironment, 
  getConfig, 
  resetConfig,
  EnvironmentValidationError,
  type EnvironmentConfig 
} from '../env-validator';

describe('Environment Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    resetConfig();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should validate successfully in development with minimal config', () => {
      process.env.NODE_ENV = 'development';
      
      const config = validateEnvironment();
      
      expect(config.nodeEnv).toBe('development');
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
      // JWT secret should be set from .env or fallback
      expect(config.jwt.secret).toBeTruthy();
      expect(config.jwt.secret.length).toBeGreaterThan(20);
    });

    it('should validate successfully in test environment', () => {
      process.env.NODE_ENV = 'test';
      
      const config = validateEnvironment();
      
      expect(config.nodeEnv).toBe('test');
      expect(config.isTest).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should warn and fallback for missing JWT_SECRET in production (build safety)', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      // Ensure strict validation logic runs by unsetting build/CI flags
      delete process.env.CI;
      delete process.env.NEXT_PHASE;
      delete process.env.GITHUB_ACTIONS;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const config = validateEnvironment();
      expect(config.jwt.secret).toBe('build-fallback-secret-do-not-use-in-runtime');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET missing in production'));

      consoleSpy.mockRestore();
    });

    it('should reject default JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'default-secret-change-in-production';
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      // Ensure strict validation logic runs by unsetting build/CI flags
      delete process.env.CI;
      delete process.env.NEXT_PHASE;
      delete process.env.GITHUB_ACTIONS;
      
      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
      expect(() => validateEnvironment()).toThrow('must be changed from default value');
    });

    it('should warn and fallback for missing DATABASE_URL in production (build safety)', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'secure-production-secret-key-32-characters!';
      delete process.env.DATABASE_URL;
      // Ensure strict validation logic runs by unsetting build/CI flags
      delete process.env.CI;
      delete process.env.NEXT_PHASE;
      delete process.env.GITHUB_ACTIONS;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const config = validateEnvironment();
      expect(config.database.url).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL missing in production'));

      consoleSpy.mockRestore();
    });

    it('should use custom JWT_SECRET when provided', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'my-custom-secret';
      
      const config = validateEnvironment();
      
      expect(config.jwt.secret).toBe('my-custom-secret');
    });

    it('should use custom JWT_EXPIRATION when provided', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_EXPIRATION = '48h';
      
      const config = validateEnvironment();
      
      expect(config.jwt.expiration).toBe('48h');
    });

    it('should default JWT_EXPIRATION to 24h', () => {
      process.env.NODE_ENV = 'development';
      
      const config = validateEnvironment();
      
      expect(config.jwt.expiration).toBe('24h');
    });

    it('should handle DATABASE_URL correctly', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/mydb';
      
      const config = validateEnvironment();
      
      expect(config.database.url).toBe('postgresql://localhost:5432/mydb');
    });

    it('should default DATABASE_URL in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;
      
      const config = validateEnvironment();
      
      expect(config.database.url).toBe('');
    });


    it('should handle LOG_LEVEL correctly', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'warn';
      
      const config = validateEnvironment();
      
      expect(config.logging.level).toBe('warn');
    });

    it('should default LOG_LEVEL to debug in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      
      const config = validateEnvironment();
      
      expect(config.logging.level).toBe('debug');
    });

    it('should default LOG_LEVEL to info in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'secure-production-secret-key-32-characters!';
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      delete process.env.LOG_LEVEL;
      
      const config = validateEnvironment();
      
      expect(config.logging.level).toBe('info');
    });

    it('should handle ENABLE_LOGGING as boolean', () => {
      process.env.NODE_ENV = 'development';
      process.env.ENABLE_LOGGING = 'false';
      
      const config = validateEnvironment();
      
      expect(config.logging.enabled).toBe(false);
    });

    it('should default ENABLE_LOGGING to true', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ENABLE_LOGGING;
      
      const config = validateEnvironment();
      
      expect(config.logging.enabled).toBe(true);
    });

    it('should handle ENABLE_ANALYTICS as boolean', () => {
      process.env.NODE_ENV = 'development';
      process.env.ENABLE_ANALYTICS = 'true';
      
      const config = validateEnvironment();
      
      expect(config.analytics.enabled).toBe(true);
    });

    it('should default ENABLE_ANALYTICS to false in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ENABLE_ANALYTICS;
      
      const config = validateEnvironment();
      
      expect(config.analytics.enabled).toBe(false);
    });

    it('should default ENABLE_ANALYTICS to true in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'secure-production-secret-key-32-characters!';
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      delete process.env.ENABLE_ANALYTICS;
      
      const config = validateEnvironment();
      
      expect(config.analytics.enabled).toBe(true);
    });

    it('should handle RATE_LIMIT_MAX as number', () => {
      process.env.NODE_ENV = 'development';
      process.env.RATE_LIMIT_MAX = '200';
      
      const config = validateEnvironment();
      
      expect(config.rateLimit.max).toBe(200);
    });

    it('should default RATE_LIMIT_MAX to 100', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RATE_LIMIT_MAX;
      
      const config = validateEnvironment();
      
      expect(config.rateLimit.max).toBe(100);
    });

    it('should throw error for invalid RATE_LIMIT_MAX', () => {
      process.env.NODE_ENV = 'development';
      process.env.RATE_LIMIT_MAX = 'invalid';
      
      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
      expect(() => validateEnvironment()).toThrow('Invalid number for RATE_LIMIT_MAX');
    });

    it('should throw error for invalid LOG_LEVEL', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'trace';
      
      expect(() => validateEnvironment()).toThrow(EnvironmentValidationError);
      expect(() => validateEnvironment()).toThrow('Invalid LOG_LEVEL: trace');
    });
  });

  describe('getConfig', () => {
    it('should return cached config on subsequent calls', () => {
      process.env.NODE_ENV = 'development';
      
      const config1 = getConfig();
      const config2 = getConfig();
      
      expect(config1).toBe(config2);
    });

    it('should validate environment on first call (with build safety)', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      // Ensure strict validation logic runs by unsetting build/CI flags
      delete process.env.CI;
      delete process.env.NEXT_PHASE;
      delete process.env.GITHUB_ACTIONS;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const config = getConfig();
      expect(config.jwt.secret).toBe('build-fallback-secret-do-not-use-in-runtime');
      
      consoleSpy.mockRestore();
    });
  });

  describe('resetConfig', () => {
    it('should clear cached config', () => {
      process.env.NODE_ENV = 'development';
      
      const config1 = getConfig();
      resetConfig();
      const config2 = getConfig();
      
      // They should be equal but not the same instance
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('Production validation', () => {
    it('should validate complete production config', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'secure-production-secret-key-12345';
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/dbname';
      process.env.LOG_LEVEL = 'info';
      process.env.ENABLE_ANALYTICS = 'true';
      process.env.RATE_LIMIT_MAX = '500';
      
      const config = validateEnvironment();
      
      expect(config.nodeEnv).toBe('production');
      expect(config.isProduction).toBe(true);
      expect(config.jwt.secret).toBe('secure-production-secret-key-12345');
      expect(config.database.url).toBe('postgresql://user:pass@host:5432/dbname');
      expect(config.logging.level).toBe('info');
      expect(config.analytics.enabled).toBe(true);
      expect(config.rateLimit.max).toBe(500);
    });
  });
});
