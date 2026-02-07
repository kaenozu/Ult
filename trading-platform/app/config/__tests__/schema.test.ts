/**
 * Tests for Configuration Schemas
 */

import {
  ForecastConeSchema,
  RSIConfigSchema,
  SMAConfigSchema,
  MACDConfigSchema,
  SignalThresholdsSchema,
  RiskManagementSchema,
  CacheConfigSchema,
  RateLimitSchema,
  EnsembleWeightsSchema,
  DataQualitySchema,
  validateConfig,
} from '../schema';

describe('Configuration Schema Validation', () => {
  describe('ForecastConeSchema', () => {
    it('should accept valid config', () => {
      const config = {
        STEPS: 5,
        LOOKBACK_DAYS: 60,
        ATR_MULTIPLIER: 2.0,
      };
      expect(() => validateConfig(ForecastConeSchema, config)).not.toThrow();
    });

    it('should reject negative values', () => {
      const config = {
        STEPS: -5,
        LOOKBACK_DAYS: 60,
        ATR_MULTIPLIER: 2.0,
      };
      expect(() => validateConfig(ForecastConeSchema, config)).toThrow();
    });

    it('should reject STEPS exceeding max', () => {
      const config = {
        STEPS: 150,
        LOOKBACK_DAYS: 60,
        ATR_MULTIPLIER: 2.0,
      };
      expect(() => validateConfig(ForecastConeSchema, config)).toThrow();
    });
  });

  describe('RSIConfigSchema', () => {
    it('should accept valid RSI config', () => {
      const config = {
        DEFAULT_PERIOD: 14,
        OVERSOLD: 35,
        OVERBOUGHT: 65,
        EXTREME_OVERSOLD: 25,
        EXTREME_OVERBOUGHT: 75,
        PERIOD_OPTIONS: [10, 14, 20],
      };
      expect(() => validateConfig(RSIConfigSchema, config)).not.toThrow();
    });

    it('should reject when EXTREME_OVERSOLD >= OVERSOLD', () => {
      const config = {
        DEFAULT_PERIOD: 14,
        OVERSOLD: 30,
        OVERBOUGHT: 70,
        EXTREME_OVERSOLD: 35, // Should be less than OVERSOLD
        EXTREME_OVERBOUGHT: 80,
        PERIOD_OPTIONS: [14],
      };
      expect(() => validateConfig(RSIConfigSchema, config)).toThrow();
    });

    it('should reject when OVERBOUGHT >= EXTREME_OVERBOUGHT', () => {
      const config = {
        DEFAULT_PERIOD: 14,
        OVERSOLD: 30,
        OVERBOUGHT: 85, // Should be less than EXTREME_OVERBOUGHT
        EXTREME_OVERSOLD: 20,
        EXTREME_OVERBOUGHT: 80,
        PERIOD_OPTIONS: [14],
      };
      expect(() => validateConfig(RSIConfigSchema, config)).toThrow();
    });

    it('should reject empty PERIOD_OPTIONS', () => {
      const config = {
        DEFAULT_PERIOD: 14,
        OVERSOLD: 30,
        OVERBOUGHT: 70,
        EXTREME_OVERSOLD: 20,
        EXTREME_OVERBOUGHT: 80,
        PERIOD_OPTIONS: [],
      };
      expect(() => validateConfig(RSIConfigSchema, config)).toThrow();
    });
  });

  describe('SMAConfigSchema', () => {
    it('should accept valid SMA config', () => {
      const config = {
        SHORT_PERIOD: 10,
        MEDIUM_PERIOD: 50,
        LONG_PERIOD: 200,
        PERIOD_OPTIONS: [10, 20, 50, 100],
        COLOR: '#fbbf24',
        LINE_WIDTH: 2,
      };
      expect(() => validateConfig(SMAConfigSchema, config)).not.toThrow();
    });

    it('should reject when periods are not in ascending order', () => {
      const config = {
        SHORT_PERIOD: 50, // Should be less than MEDIUM
        MEDIUM_PERIOD: 50,
        LONG_PERIOD: 200,
        PERIOD_OPTIONS: [10],
        COLOR: '#fbbf24',
        LINE_WIDTH: 2,
      };
      expect(() => validateConfig(SMAConfigSchema, config)).toThrow();
    });

    it('should reject invalid color format', () => {
      const config = {
        SHORT_PERIOD: 10,
        MEDIUM_PERIOD: 50,
        LONG_PERIOD: 200,
        PERIOD_OPTIONS: [10],
        COLOR: 'invalid-color',
        LINE_WIDTH: 2,
      };
      expect(() => validateConfig(SMAConfigSchema, config)).toThrow();
    });

    it('should reject excessive LINE_WIDTH', () => {
      const config = {
        SHORT_PERIOD: 10,
        MEDIUM_PERIOD: 50,
        LONG_PERIOD: 200,
        PERIOD_OPTIONS: [10],
        COLOR: '#fbbf24',
        LINE_WIDTH: 20, // Exceeds max of 10
      };
      expect(() => validateConfig(SMAConfigSchema, config)).toThrow();
    });
  });

  describe('MACDConfigSchema', () => {
    it('should accept valid MACD config', () => {
      const config = {
        FAST_PERIOD: 12,
        SLOW_PERIOD: 26,
        SIGNAL_PERIOD: 9,
      };
      expect(() => validateConfig(MACDConfigSchema, config)).not.toThrow();
    });

    it('should reject when FAST_PERIOD >= SLOW_PERIOD', () => {
      const config = {
        FAST_PERIOD: 26, // Should be less than SLOW_PERIOD
        SLOW_PERIOD: 26,
        SIGNAL_PERIOD: 9,
      };
      expect(() => validateConfig(MACDConfigSchema, config)).toThrow();
    });
  });

  describe('SignalThresholdsSchema', () => {
    it('should accept valid signal thresholds', () => {
      const config = {
        MIN_CONFIDENCE: 60,
        HIGH_CONFIDENCE: 85,
        STRONG_CORRELATION: 0.75,
        STRONG_MOMENTUM: 2.0,
        MEDIUM_CONFIDENCE: 70,
      };
      expect(() => validateConfig(SignalThresholdsSchema, config)).not.toThrow();
    });

    it('should reject when confidence thresholds are not in order', () => {
      const config = {
        MIN_CONFIDENCE: 70, // Should be less than MEDIUM
        HIGH_CONFIDENCE: 85,
        STRONG_CORRELATION: 0.75,
        STRONG_MOMENTUM: 2.0,
        MEDIUM_CONFIDENCE: 60,
      };
      expect(() => validateConfig(SignalThresholdsSchema, config)).toThrow();
    });

    it('should reject STRONG_CORRELATION outside 0-1 range', () => {
      const config = {
        MIN_CONFIDENCE: 60,
        HIGH_CONFIDENCE: 85,
        STRONG_CORRELATION: 1.5, // Should be <= 1
        STRONG_MOMENTUM: 2.0,
        MEDIUM_CONFIDENCE: 70,
      };
      expect(() => validateConfig(SignalThresholdsSchema, config)).toThrow();
    });
  });

  describe('RiskManagementSchema', () => {
    it('should accept valid risk management config', () => {
      const config = {
        BULL_TARGET_MULTIPLIER: 1.5,
        BEAR_TARGET_MULTIPLIER: 1.5,
        DEFAULT_STOP_LOSS_PERCENT: 2,
        DEFAULT_TAKE_PROFIT_PERCENT: 4,
        DEFAULT_KELLY_FRACTION: 0.25,
        DEFAULT_ATR_MULTIPLIER: 2,
        MAX_POSITION_PERCENT: 20,
        DEFAULT_DAILY_LOSS_LIMIT: 5,
        DEFAULT_MAX_POSITIONS: 10,
        STOP_LOSS_RATIO: 0.5,
        MIN_POSITION_PERCENT: 1.0,
        LOW_CONFIDENCE_REDUCTION: 0.5,
      };
      expect(() => validateConfig(RiskManagementSchema, config)).not.toThrow();
    });

    it('should reject excessive stop loss percent', () => {
      const config = {
        BULL_TARGET_MULTIPLIER: 1.5,
        BEAR_TARGET_MULTIPLIER: 1.5,
        DEFAULT_STOP_LOSS_PERCENT: 60, // Exceeds max of 50
        DEFAULT_TAKE_PROFIT_PERCENT: 4,
        DEFAULT_KELLY_FRACTION: 0.25,
        DEFAULT_ATR_MULTIPLIER: 2,
        MAX_POSITION_PERCENT: 20,
        DEFAULT_DAILY_LOSS_LIMIT: 5,
        DEFAULT_MAX_POSITIONS: 10,
        STOP_LOSS_RATIO: 0.5,
        MIN_POSITION_PERCENT: 1.0,
        LOW_CONFIDENCE_REDUCTION: 0.5,
      };
      expect(() => validateConfig(RiskManagementSchema, config)).toThrow();
    });

    it('should reject KELLY_FRACTION outside 0-1 range', () => {
      const config = {
        BULL_TARGET_MULTIPLIER: 1.5,
        BEAR_TARGET_MULTIPLIER: 1.5,
        DEFAULT_STOP_LOSS_PERCENT: 2,
        DEFAULT_TAKE_PROFIT_PERCENT: 4,
        DEFAULT_KELLY_FRACTION: 1.5, // Should be <= 1
        DEFAULT_ATR_MULTIPLIER: 2,
        MAX_POSITION_PERCENT: 20,
        DEFAULT_DAILY_LOSS_LIMIT: 5,
        DEFAULT_MAX_POSITIONS: 10,
        STOP_LOSS_RATIO: 0.5,
        MIN_POSITION_PERCENT: 1.0,
        LOW_CONFIDENCE_REDUCTION: 0.5,
      };
      expect(() => validateConfig(RiskManagementSchema, config)).toThrow();
    });
  });

  describe('CacheConfigSchema', () => {
    it('should accept valid cache config', () => {
      const config = {
        DEFAULT_DURATION_MS: 300000,
        STOCK_UPDATE_INTERVAL_MS: 86400000,
        CHUNK_SIZE: 50,
      };
      expect(() => validateConfig(CacheConfigSchema, config)).not.toThrow();
    });

    it('should reject zero or negative durations', () => {
      const config = {
        DEFAULT_DURATION_MS: 0,
        STOCK_UPDATE_INTERVAL_MS: 86400000,
        CHUNK_SIZE: 50,
      };
      expect(() => validateConfig(CacheConfigSchema, config)).toThrow();
    });

    it('should reject excessive CHUNK_SIZE', () => {
      const config = {
        DEFAULT_DURATION_MS: 300000,
        STOCK_UPDATE_INTERVAL_MS: 86400000,
        CHUNK_SIZE: 5000, // Exceeds max of 1000
      };
      expect(() => validateConfig(CacheConfigSchema, config)).toThrow();
    });
  });

  describe('RateLimitSchema', () => {
    it('should accept valid rate limit config', () => {
      const config = {
        REQUEST_INTERVAL_MS: 12000,
        MAX_RETRIES: 3,
        RETRY_DELAY_MS: 1000,
      };
      expect(() => validateConfig(RateLimitSchema, config)).not.toThrow();
    });

    it('should reject excessive MAX_RETRIES', () => {
      const config = {
        REQUEST_INTERVAL_MS: 12000,
        MAX_RETRIES: 15, // Exceeds max of 10
        RETRY_DELAY_MS: 1000,
      };
      expect(() => validateConfig(RateLimitSchema, config)).toThrow();
    });
  });

  describe('EnsembleWeightsSchema', () => {
    it('should accept valid weights that sum to 1', () => {
      const config = {
        RF: 0.35,
        XGB: 0.35,
        LSTM: 0.30,
      };
      expect(() => validateConfig(EnsembleWeightsSchema, config)).not.toThrow();
    });

    it('should reject weights that do not sum to 1', () => {
      const config = {
        RF: 0.35,
        XGB: 0.35,
        LSTM: 0.40, // Sum = 1.10
      };
      expect(() => validateConfig(EnsembleWeightsSchema, config)).toThrow();
    });

    it('should reject negative weights', () => {
      const config = {
        RF: 0.5,
        XGB: 0.6,
        LSTM: -0.1, // Negative
      };
      expect(() => validateConfig(EnsembleWeightsSchema, config)).toThrow();
    });

    it('should reject weights exceeding 1', () => {
      const config = {
        RF: 1.5, // Exceeds max of 1
        XGB: 0.0,
        LSTM: 0.0,
      };
      expect(() => validateConfig(EnsembleWeightsSchema, config)).toThrow();
    });
  });

  describe('DataQualitySchema', () => {
    it('should accept valid data quality config', () => {
      const config = {
        MIN_DATA_LENGTH: 20,
        MIN_PRICE_THRESHOLD: 0.0001,
        MAX_GAP_DAYS: 7,
      };
      expect(() => validateConfig(DataQualitySchema, config)).not.toThrow();
    });

    it('should reject zero MIN_DATA_LENGTH', () => {
      const config = {
        MIN_DATA_LENGTH: 0,
        MIN_PRICE_THRESHOLD: 0.0001,
        MAX_GAP_DAYS: 7,
      };
      expect(() => validateConfig(DataQualitySchema, config)).toThrow();
    });

    it('should reject zero MIN_PRICE_THRESHOLD', () => {
      const config = {
        MIN_DATA_LENGTH: 20,
        MIN_PRICE_THRESHOLD: 0,
        MAX_GAP_DAYS: 7,
      };
      expect(() => validateConfig(DataQualitySchema, config)).toThrow();
    });
  });
});
