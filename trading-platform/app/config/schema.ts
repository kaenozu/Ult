/**
 * Configuration Schema with Zod Validation
 * 
 * Provides runtime validation for all configuration values
 * with type inference for compile-time safety.
 */

import { z } from 'zod';

/**
 * Helper function to create schemas for weight objects that must sum to 1
 */
const createWeightSchema = <T extends Record<string, unknown>>(
  keys: Record<keyof T, z.ZodNumber>
) => {
  return z
    .object(keys)
    .refine(
      (weights) => {
        const values = Object.values(weights) as number[];
        const sum = values.reduce((a, b) => a + b, 0);
        return Math.abs(sum - 1.0) < 0.0001; // Allow small floating point errors
      },
      { message: 'Weights must sum to 1.0' }
    );
};

/**
 * Forecast Configuration Schema
 */
export const ForecastConeSchema = z.object({
  STEPS: z.number().int().min(1).max(100),
  LOOKBACK_DAYS: z.number().int().min(1).max(365),
  ATR_MULTIPLIER: z.number().positive().max(10),
});

/**
 * RSI Configuration Schema
 */
export const RSIConfigSchema = z.object({
  DEFAULT_PERIOD: z.number().int().min(5).max(50),
  OVERSOLD: z.number().min(0).max(100),
  OVERBOUGHT: z.number().min(0).max(100),
  EXTREME_OVERSOLD: z.number().min(0).max(100),
  EXTREME_OVERBOUGHT: z.number().min(0).max(100),
  PERIOD_OPTIONS: z.array(z.number().int().positive()).min(1),
}).refine(
  (config) => config.EXTREME_OVERSOLD < config.OVERSOLD,
  { message: 'EXTREME_OVERSOLD must be less than OVERSOLD' }
).refine(
  (config) => config.OVERBOUGHT < config.EXTREME_OVERBOUGHT,
  { message: 'OVERBOUGHT must be less than EXTREME_OVERBOUGHT' }
);

/**
 * SMA Configuration Schema
 */
export const SMAConfigSchema = z.object({
  SHORT_PERIOD: z.number().int().positive(),
  MEDIUM_PERIOD: z.number().int().positive(),
  LONG_PERIOD: z.number().int().positive(),
  PERIOD_OPTIONS: z.array(z.number().int().positive()).min(1),
  COLOR: z.string().regex(/^#[0-9a-f]{6}$/i),
  LINE_WIDTH: z.number().positive().max(10),
}).refine(
  (config) => config.SHORT_PERIOD < config.MEDIUM_PERIOD && config.MEDIUM_PERIOD < config.LONG_PERIOD,
  { message: 'Periods must be in ascending order: SHORT < MEDIUM < LONG' }
);

/**
 * MACD Configuration Schema
 */
export const MACDConfigSchema = z.object({
  FAST_PERIOD: z.number().int().positive(),
  SLOW_PERIOD: z.number().int().positive(),
  SIGNAL_PERIOD: z.number().int().positive(),
}).refine(
  (config) => config.FAST_PERIOD < config.SLOW_PERIOD,
  { message: 'FAST_PERIOD must be less than SLOW_PERIOD' }
);

/**
 * Optimization Configuration Schema
 */
export const OptimizationSchema = z.object({
  REQUIRED_DATA_PERIOD: z.number().int().positive(),
  MIN_DATA_PERIOD: z.number().int().positive(),
  VOLUME_PROFILE_BINS: z.number().int().min(5).max(100),
}).refine(
  (config) => config.MIN_DATA_PERIOD <= config.REQUIRED_DATA_PERIOD,
  { message: 'MIN_DATA_PERIOD must be less than or equal to REQUIRED_DATA_PERIOD' }
);

/**
 * Signal Thresholds Schema
 */
export const SignalThresholdsSchema = z.object({
  MIN_CONFIDENCE: z.number().min(0).max(100),
  HIGH_CONFIDENCE: z.number().min(0).max(100),
  STRONG_CORRELATION: z.number().min(0).max(1),
  STRONG_MOMENTUM: z.number().positive(),
  MEDIUM_CONFIDENCE: z.number().min(0).max(100),
}).refine(
  (config) => config.MIN_CONFIDENCE < config.MEDIUM_CONFIDENCE && config.MEDIUM_CONFIDENCE < config.HIGH_CONFIDENCE,
  { message: 'Confidence thresholds must be in ascending order: MIN < MEDIUM < HIGH' }
);

/**
 * Risk Management Schema
 */
export const RiskManagementSchema = z.object({
  BULL_TARGET_MULTIPLIER: z.number().positive().max(10),
  BEAR_TARGET_MULTIPLIER: z.number().positive().max(10),
  DEFAULT_STOP_LOSS_PERCENT: z.number().positive().max(50),
  DEFAULT_TAKE_PROFIT_PERCENT: z.number().positive().max(100),
  DEFAULT_KELLY_FRACTION: z.number().min(0).max(1),
  DEFAULT_ATR_MULTIPLIER: z.number().positive().max(10),
  MAX_POSITION_PERCENT: z.number().positive().max(100),
  DEFAULT_DAILY_LOSS_LIMIT: z.number().positive().max(50),
  DEFAULT_MAX_POSITIONS: z.number().int().positive().max(100),
  STOP_LOSS_RATIO: z.number().min(0).max(1),
  MIN_POSITION_PERCENT: z.number().positive().max(100),
  LOW_CONFIDENCE_REDUCTION: z.number().min(0).max(1),
});

/**
 * Cache Configuration Schema
 */
export const CacheConfigSchema = z.object({
  DEFAULT_DURATION_MS: z.number().int().positive(),
  STOCK_UPDATE_INTERVAL_MS: z.number().int().positive(),
  CHUNK_SIZE: z.number().int().positive().max(1000),
});

/**
 * Rate Limit Schema
 */
export const RateLimitSchema = z.object({
  REQUEST_INTERVAL_MS: z.number().int().positive(),
  MAX_RETRIES: z.number().int().min(0).max(10),
  RETRY_DELAY_MS: z.number().int().positive(),
});

/**
 * Ensemble Weights Schema
 */
export const EnsembleWeightsSchema = createWeightSchema({
  RF: z.number().min(0).max(1),
  XGB: z.number().min(0).max(1),
  LSTM: z.number().min(0).max(1),
});

/**
 * Data Quality Schema
 */
export const DataQualitySchema = z.object({
  MIN_DATA_LENGTH: z.number().int().positive(),
  MIN_PRICE_THRESHOLD: z.number().positive(),
  MAX_GAP_DAYS: z.number().int().positive(),
});

/**
 * Backtest Configuration Schema
 */
export const BacktestConfigSchema = z.object({
  MIN_DATA_PERIOD: z.number().int().positive(),
  MIN_SIGNAL_CONFIDENCE: z.number().min(0).max(100),
  TAKE_PROFIT_THRESHOLD: z.number().positive().max(1),
  STOP_LOSS_THRESHOLD: z.number().positive().max(1),
  BULL_STOP_LOSS: z.number().positive().max(1),
  BULL_TAKE_PROFIT: z.number().positive().max(1),
  BEAR_STOP_LOSS: z.number().positive().max(1),
  BEAR_TAKE_PROFIT: z.number().positive().max(1),
});

/**
 * Technical Indicators Schema
 */
export const TechnicalIndicatorsSchema = z.object({
  // RSI
  RSI_PERIOD: z.number().int().min(5).max(50),
  RSI_OVERSOLD: z.number().min(0).max(100),
  RSI_OVERBOUGHT: z.number().min(0).max(100),
  RSI_EXTREME_OVERSOLD: z.number().min(0).max(100),
  RSI_EXTREME_OVERBOUGHT: z.number().min(0).max(100),

  // SMA
  SMA_PERIOD_SHORT: z.number().int().positive(),
  SMA_PERIOD_MEDIUM: z.number().int().positive(),
  SMA_PERIOD_LONG: z.number().int().positive(),
  SMA_PERIOD_VERY_LONG: z.number().int().positive(),

  // EMA
  EMA_PERIOD: z.number().int().positive(),

  // Bollinger Bands
  BB_PERIOD: z.number().int().positive(),
  BB_STD_DEV: z.number().positive(),

  // ATR
  ATR_PERIOD: z.number().int().positive(),
  ATR_MULTIPLIER_DEFAULT: z.number().positive(),

  // MACD
  MACD_FAST: z.number().int().positive(),
  MACD_SLOW: z.number().int().positive(),
  MACD_SIGNAL: z.number().int().positive(),

  // ADX
  ADX_PERIOD: z.number().int().positive(),
  ADX_TRENDING_THRESHOLD: z.number().positive(),
  ADX_RANGING_THRESHOLD: z.number().positive(),

  // Stochastic
  STOCHASTIC_PERIOD: z.number().int().positive(),

  // Williams %R
  WILLIAMS_R_PERIOD: z.number().int().positive(),

  // Volume Profile
  VOLUME_PROFILE_BINS: z.number().int().min(5).max(100),
  VOLUME_PROFILE_MIN_DAYS: z.number().int().positive(),
});

/**
 * Inferred TypeScript types from Zod schemas
 */
export type ForecastConeConfig = z.infer<typeof ForecastConeSchema>;
export type RSIConfig = z.infer<typeof RSIConfigSchema>;
export type SMAConfig = z.infer<typeof SMAConfigSchema>;
export type MACDConfig = z.infer<typeof MACDConfigSchema>;
export type OptimizationConfig = z.infer<typeof OptimizationSchema>;
export type SignalThresholds = z.infer<typeof SignalThresholdsSchema>;
export type RiskManagementConfig = z.infer<typeof RiskManagementSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitSchema>;
export type EnsembleWeights = z.infer<typeof EnsembleWeightsSchema>;
export type DataQualityConfig = z.infer<typeof DataQualitySchema>;
export type BacktestConfig = z.infer<typeof BacktestConfigSchema>;
export type TechnicalIndicatorsConfig = z.infer<typeof TechnicalIndicatorsSchema>;

/**
 * Validation helper function
 */
export const validateConfig = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation error:', error.issues);
      throw new Error(
        `Invalid configuration: ${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
};
