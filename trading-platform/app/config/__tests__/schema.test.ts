/**
 * Tests for Configuration Schemas
 */

import {
  envSchema,
  featureFlagsSchema,
  tradingConfigSchema,
  marketDataConfigSchema,
  apiConfigSchema,
} from '../schema';

describe('Configuration Schema Validation', () => {
  describe('envSchema', () => {
    it('should accept valid env config with defaults', () => {
      const config = {};
      const result = envSchema.parse(config);
      expect(result.NODE_ENV).toBe('development');
      expect(result.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    });

    it('should accept valid env config with custom values', () => {
      const config = {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'https://example.com',
        MARKET_DATA_PROVIDER: 'alpha',
      };
      const result = envSchema.parse(config);
      expect(result.NODE_ENV).toBe('production');
      expect(result.MARKET_DATA_PROVIDER).toBe('alpha');
    });

    it('should reject invalid NODE_ENV', () => {
      const config = {
        NODE_ENV: 'invalid',
      };
      expect(() => envSchema.parse(config)).toThrow();
    });

    it('should reject invalid URL', () => {
      const config = {
        NEXT_PUBLIC_APP_URL: 'not-a-url',
      };
      expect(() => envSchema.parse(config)).toThrow();
    });
  });

  describe('featureFlagsSchema', () => {
    it('should accept valid feature flags', () => {
      const config = {
        enableRealtimeData: true,
        enableMLPredictions: true,
        enableBacktestCache: true,
      };
      const result = featureFlagsSchema.parse(config);
      expect(result.enableRealtimeData).toBe(true);
    });

    it('should apply defaults for missing flags', () => {
      const config = {};
      const result = featureFlagsSchema.parse(config);
      expect(result.enableRealtimeData).toBe(false);
      expect(result.enableMLPredictions).toBe(true);
    });
  });

  describe('tradingConfigSchema', () => {
    it('should accept valid trading config', () => {
      const config = {
        defaultRiskPercent: 2,
        maxPositions: 10,
        defaultStopLoss: 5,
        defaultTakeProfit: 10,
      };
      const result = tradingConfigSchema.parse(config);
      expect(result.defaultRiskPercent).toBe(2);
    });

    it('should reject excessive risk percent', () => {
      const config = {
        defaultRiskPercent: 150,
      };
      expect(() => tradingConfigSchema.parse(config)).toThrow();
    });

    it('should reject negative maxPositions', () => {
      const config = {
        maxPositions: -5,
      };
      expect(() => tradingConfigSchema.parse(config)).toThrow();
    });
  });

  describe('marketDataConfigSchema', () => {
    it('should accept valid market data config', () => {
      const config = {
        provider: 'yahoo',
        cacheDuration: 300,
        defaultInterval: '1d',
      };
      const result = marketDataConfigSchema.parse(config);
      expect(result.provider).toBe('yahoo');
    });

    it('should reject invalid provider', () => {
      const config = {
        provider: 'invalid',
      };
      expect(() => marketDataConfigSchema.parse(config)).toThrow();
    });

    it('should reject zero cache duration', () => {
      const config = {
        cacheDuration: 0,
      };
      expect(() => marketDataConfigSchema.parse(config)).toThrow();
    });
  });

  describe('apiConfigSchema', () => {
    it('should accept valid API config', () => {
      const config = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
      };
      const result = apiConfigSchema.parse(config);
      expect(result.timeout).toBe(5000);
    });

    it('should reject invalid baseURL', () => {
      const config = {
        baseURL: 'not-a-url',
      };
      expect(() => apiConfigSchema.parse(config)).toThrow();
    });

    it('should reject negative retries', () => {
      const config = {
        retries: -1,
      };
      expect(() => apiConfigSchema.parse(config)).toThrow();
    });
  });
});
