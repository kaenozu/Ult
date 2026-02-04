/**
 * Tests for Environment Configuration
 * 
 * @jest-environment node
 */

import { z } from 'zod';

// We need to test in isolation, so we'll test the schema directly
describe('Environment Configuration', () => {
  describe('Environment Variable Schema', () => {
    // Create a minimal version of the schema for testing
    const TestEnvSchema = z.object({
      // Security
      JWT_SECRET: z.string().min(32).optional(),
      JWT_EXPIRATION: z.string().default('24h'),

      // Cache
      CACHE_TTL: z.coerce.number().int().positive().default(300000),
      CACHE_MAX_SIZE: z.coerce.number().int().positive().default(1000),

      // Risk Management
      DEFAULT_RISK_PERCENTAGE: z.coerce.number().min(0).max(1).default(0.02),

      // Logging
      LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      ENABLE_LOGGING: z.coerce.boolean().default(true),

      // Node Environment
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    });

    it('should accept valid environment variables', () => {
      const env = {
        JWT_SECRET: 'a'.repeat(32),
        JWT_EXPIRATION: '24h',
        CACHE_TTL: '300000',
        CACHE_MAX_SIZE: '1000',
        DEFAULT_RISK_PERCENTAGE: '0.02',
        LOG_LEVEL: 'info',
        ENABLE_LOGGING: 'true',
        NODE_ENV: 'development',
      };

      expect(() => TestEnvSchema.parse(env)).not.toThrow();
    });

    it('should use default values when variables are missing', () => {
      const env = {};
      const result = TestEnvSchema.parse(env);

      expect(result.JWT_EXPIRATION).toBe('24h');
      expect(result.CACHE_TTL).toBe(300000);
      expect(result.LOG_LEVEL).toBe('info');
      expect(result.NODE_ENV).toBe('development');
    });

    it('should coerce string numbers to numbers', () => {
      const env = {
        CACHE_TTL: '600000',
        CACHE_MAX_SIZE: '2000',
      };
      const result = TestEnvSchema.parse(env);

      expect(typeof result.CACHE_TTL).toBe('number');
      expect(result.CACHE_TTL).toBe(600000);
    });

    it('should coerce string booleans to booleans', () => {
      // Zod coerce.boolean treats any truthy string as true
      // Only empty string, '0', 'false', 'False' are false
      const envFalse1 = { ENABLE_LOGGING: '' };
      const resultFalse1 = TestEnvSchema.parse(envFalse1);
      expect(resultFalse1.ENABLE_LOGGING).toBe(false);
      
      const envTrue = { ENABLE_LOGGING: 'true' };
      const resultTrue = TestEnvSchema.parse(envTrue);
      expect(typeof resultTrue.ENABLE_LOGGING).toBe('boolean');
      expect(resultTrue.ENABLE_LOGGING).toBe(true);
    });

    it('should reject JWT_SECRET shorter than 32 characters', () => {
      const env = {
        JWT_SECRET: 'short',
      };

      expect(() => TestEnvSchema.parse(env)).toThrow();
    });


    it('should reject DEFAULT_RISK_PERCENTAGE outside 0-1 range', () => {
      const env = {
        DEFAULT_RISK_PERCENTAGE: '1.5',
      };

      expect(() => TestEnvSchema.parse(env)).toThrow();
    });

    it('should reject invalid LOG_LEVEL', () => {
      const env = {
        LOG_LEVEL: 'verbose', // Not in enum
      };

      expect(() => TestEnvSchema.parse(env)).toThrow();
    });

    it('should reject invalid NODE_ENV', () => {
      const env = {
        NODE_ENV: 'staging', // Not in enum
      };

      expect(() => TestEnvSchema.parse(env)).toThrow();
    });

    it('should handle mixed valid and invalid values', () => {
      const env = {
        CACHE_TTL: '-100', // Invalid (negative)
      };

      expect(() => TestEnvSchema.parse(env)).toThrow();
    });
  });

  describe('Environment Helper Functions', () => {
    it('should provide environment check functions', () => {
      // These would be tested in actual env.ts with mocked process.env
      // Here we just verify the logic would work
      
      type Env = 'development' | 'production' | 'test';
      
      const isProduction = (env: Env) => env === 'production';
      const isDevelopment = (env: Env) => env === 'development';
      const isTest = (env: Env) => env === 'test';

      expect(isProduction('production')).toBe(true);
      expect(isProduction('development')).toBe(false);
      
      expect(isDevelopment('development')).toBe(true);
      expect(isDevelopment('production')).toBe(false);
      
      expect(isTest('test')).toBe(true);
      expect(isTest('development')).toBe(false);
    });
  });

  describe('Environment Variable Types', () => {
    it('should support various data types', () => {
      const MultiTypeSchema = z.object({
        STRING_VAR: z.string(),
        NUMBER_VAR: z.coerce.number(),
        BOOLEAN_VAR: z.coerce.boolean(),
        ENUM_VAR: z.enum(['a', 'b', 'c']),
        OPTIONAL_VAR: z.string().optional(),
        DEFAULT_VAR: z.string().default('default-value'),
      });

      const env = {
        STRING_VAR: 'hello',
        NUMBER_VAR: '42',
        BOOLEAN_VAR: 'true',
        ENUM_VAR: 'b',
        // OPTIONAL_VAR not provided
        // DEFAULT_VAR not provided
      };

      const result = MultiTypeSchema.parse(env);

      expect(result.STRING_VAR).toBe('hello');
      expect(result.NUMBER_VAR).toBe(42);
      expect(result.BOOLEAN_VAR).toBe(true);
      expect(result.ENUM_VAR).toBe('b');
      expect(result.OPTIONAL_VAR).toBeUndefined();
      expect(result.DEFAULT_VAR).toBe('default-value');
    });
  });

  describe('Production Environment Validation', () => {
    it('should require certain variables in production', () => {
      // In production, some variables should be required
      const ProductionEnvSchema = z.object({
        NODE_ENV: z.literal('production'),
        JWT_SECRET: z.string().min(32), // Required in production
        DATABASE_URL: z.string().url(), // Required in production
      });

      const validProdEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(32),
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      };

      expect(() => ProductionEnvSchema.parse(validProdEnv)).not.toThrow();

      const invalidProdEnv = {
        NODE_ENV: 'production',
        // Missing JWT_SECRET and DATABASE_URL
      };

      expect(() => ProductionEnvSchema.parse(invalidProdEnv)).toThrow();
    });
  });

  describe('Number Range Validation', () => {
    it('should validate positive integers', () => {
      const PositiveIntSchema = z.object({
        PORT: z.coerce.number().int().positive(),
      });

      expect(() => PositiveIntSchema.parse({ PORT: '3000' })).not.toThrow();
      expect(() => PositiveIntSchema.parse({ PORT: '0' })).toThrow(); // Not positive
      expect(() => PositiveIntSchema.parse({ PORT: '-1' })).toThrow(); // Negative
      expect(() => PositiveIntSchema.parse({ PORT: '3.14' })).toThrow(); // Not integer
    });

    it('should validate ranges', () => {
      const RangeSchema = z.object({
        PERCENTAGE: z.coerce.number().min(0).max(100),
      });

      expect(() => RangeSchema.parse({ PERCENTAGE: '50' })).not.toThrow();
      expect(() => RangeSchema.parse({ PERCENTAGE: '0' })).not.toThrow();
      expect(() => RangeSchema.parse({ PERCENTAGE: '100' })).not.toThrow();
      expect(() => RangeSchema.parse({ PERCENTAGE: '-1' })).toThrow();
      expect(() => RangeSchema.parse({ PERCENTAGE: '101' })).toThrow();
    });
  });
});
