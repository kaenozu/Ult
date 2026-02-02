/**
 * Validated Configuration with Branded Types
 * 
 * This file provides type-safe, validated configuration values
 * using Zod schemas and branded types for units.
 */

import { 
  milliseconds,
  count,
  type Milliseconds,
  type Percentage,
  type Ratio,
  type Currency,
  type Count,
  type Days,
} from '../types/branded';

import {
  ForecastConeSchema,
  RSIConfigSchema,
  SMAConfigSchema,
  MACDConfigSchema,
  OptimizationSchema,
  SignalThresholdsSchema,
  RiskManagementSchema,
  CacheConfigSchema,
  RateLimitSchema,
  EnsembleWeightsSchema,
  DataQualitySchema,
  BacktestConfigSchema,
  TechnicalIndicatorsSchema,
  validateConfig,
  type ForecastConeConfig,
  type RSIConfig,
  type SMAConfig,
  type MACDConfig,
  type OptimizationConfig,
  type SignalThresholds,
  type RiskManagementConfig,
  type CacheConfig,
  type RateLimitConfig,
  type EnsembleWeights,
  type DataQualityConfig,
  type BacktestConfig,
  type TechnicalIndicatorsConfig,
} from './schema';

/**
 * Forecast Configuration with Validation
 */
export const FORECAST_CONE: ForecastConeConfig = validateConfig(ForecastConeSchema, {
  STEPS: 5,
  LOOKBACK_DAYS: 60,
  ATR_MULTIPLIER: 2.0,
});

/**
 * RSI Configuration with Validation
 */
export const RSI_CONFIG: RSIConfig = validateConfig(RSIConfigSchema, {
  DEFAULT_PERIOD: 14,
  OVERSOLD: 35,
  OVERBOUGHT: 65,
  EXTREME_OVERSOLD: 25,
  EXTREME_OVERBOUGHT: 75,
  PERIOD_OPTIONS: [10, 14, 20],
});

/**
 * SMA Configuration with Validation
 */
export const SMA_CONFIG: SMAConfig = validateConfig(SMAConfigSchema, {
  SHORT_PERIOD: 10,
  MEDIUM_PERIOD: 50,
  LONG_PERIOD: 200,
  PERIOD_OPTIONS: [10, 20, 50, 100],
  COLOR: '#fbbf24',
  LINE_WIDTH: 2,
});

/**
 * MACD Configuration with Validation
 */
export const MACD_CONFIG: MACDConfig = validateConfig(MACDConfigSchema, {
  FAST_PERIOD: 12,
  SLOW_PERIOD: 26,
  SIGNAL_PERIOD: 9,
});

/**
 * Optimization Configuration with Validation
 */
export const OPTIMIZATION: OptimizationConfig = validateConfig(OptimizationSchema, {
  REQUIRED_DATA_PERIOD: 100,
  MIN_DATA_PERIOD: 60,
  VOLUME_PROFILE_BINS: 20,
});

/**
 * Signal Thresholds with Validation
 */
export const SIGNAL_THRESHOLDS: SignalThresholds = validateConfig(SignalThresholdsSchema, {
  MIN_CONFIDENCE: 60,
  HIGH_CONFIDENCE: 85,
  STRONG_CORRELATION: 0.75,
  STRONG_MOMENTUM: 2.0,
  MEDIUM_CONFIDENCE: 70,
});

/**
 * Risk Management Configuration with Validation and Branded Types
 */
export const RISK_MANAGEMENT: RiskManagementConfig = validateConfig(RiskManagementSchema, {
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
});

/**
 * Cache Configuration with Branded Types (Milliseconds)
 */
export const CACHE_CONFIG = {
  DEFAULT_DURATION_MS: milliseconds(5 * 60 * 1000), // 5 minutes
  STOCK_UPDATE_INTERVAL_MS: milliseconds(24 * 60 * 60 * 1000), // 24 hours
  CHUNK_SIZE: count.create(50),
} as const;

// Validate cache config (without branded types for validation)
validateConfig(CacheConfigSchema, {
  DEFAULT_DURATION_MS: 5 * 60 * 1000,
  STOCK_UPDATE_INTERVAL_MS: 24 * 60 * 60 * 1000,
  CHUNK_SIZE: 50,
});

/**
 * Rate Limit Configuration with Branded Types (Milliseconds)
 */
export const RATE_LIMIT = {
  REQUEST_INTERVAL_MS: milliseconds(12000), // 12 seconds
  MAX_RETRIES: count.create(3),
  RETRY_DELAY_MS: milliseconds(1000), // 1 second
} as const;

// Validate rate limit config
validateConfig(RateLimitSchema, {
  REQUEST_INTERVAL_MS: 12000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
});

/**
 * Ensemble Weights with Validation
 */
export const ENSEMBLE_WEIGHTS: EnsembleWeights = validateConfig(EnsembleWeightsSchema, {
  RF: 0.35,
  XGB: 0.35,
  LSTM: 0.30,
});

/**
 * Data Quality Configuration with Validation
 */
export const DATA_QUALITY: DataQualityConfig = validateConfig(DataQualitySchema, {
  MIN_DATA_LENGTH: 20,
  MIN_PRICE_THRESHOLD: 0.0001,
  MAX_GAP_DAYS: 7,
});

/**
 * Backtest Configuration with Validation
 */
export const BACKTEST_CONFIG: BacktestConfig = validateConfig(BacktestConfigSchema, {
  MIN_DATA_PERIOD: 50,
  MIN_SIGNAL_CONFIDENCE: 60,
  TAKE_PROFIT_THRESHOLD: 0.05,
  STOP_LOSS_THRESHOLD: 0.03,
  BULL_STOP_LOSS: 0.03,
  BULL_TAKE_PROFIT: 0.05,
  BEAR_STOP_LOSS: 0.05,
  BEAR_TAKE_PROFIT: 0.03,
});

/**
 * Technical Indicators Configuration with Validation
 */
export const TECHNICAL_INDICATORS: TechnicalIndicatorsConfig = validateConfig(TechnicalIndicatorsSchema, {
  // RSI
  RSI_PERIOD: 14,
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70,
  RSI_EXTREME_OVERSOLD: 20,
  RSI_EXTREME_OVERBOUGHT: 80,

  // SMA
  SMA_PERIOD_SHORT: 10,
  SMA_PERIOD_MEDIUM: 20,
  SMA_PERIOD_LONG: 50,
  SMA_PERIOD_VERY_LONG: 200,

  // EMA
  EMA_PERIOD: 12,

  // Bollinger Bands
  BB_PERIOD: 20,
  BB_STD_DEV: 2,

  // ATR
  ATR_PERIOD: 14,
  ATR_MULTIPLIER_DEFAULT: 2,

  // MACD
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,

  // ADX
  ADX_PERIOD: 14,
  ADX_TRENDING_THRESHOLD: 25,
  ADX_RANGING_THRESHOLD: 20,

  // Stochastic
  STOCHASTIC_PERIOD: 14,

  // Williams %R
  WILLIAMS_R_PERIOD: 14,

  // Volume Profile
  VOLUME_PROFILE_BINS: 20,
  VOLUME_PROFILE_MIN_DAYS: 60,
});

/**
 * Order Configuration with Branded Types
 */
export const ORDER = {
  EXPIRY_MS: milliseconds(24 * 60 * 60 * 1000), // 24 hours
} as const;

/**
 * Export types for external use
 */
export type {
  ForecastConeConfig,
  RSIConfig,
  SMAConfig,
  MACDConfig,
  OptimizationConfig,
  SignalThresholds,
  RiskManagementConfig,
  CacheConfig,
  RateLimitConfig,
  EnsembleWeights,
  DataQualityConfig,
  BacktestConfig,
  TechnicalIndicatorsConfig,
};

export type {
  Milliseconds,
  Percentage,
  Ratio,
  Currency,
  Count,
  Days,
};
