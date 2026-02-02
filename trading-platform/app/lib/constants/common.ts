/**
 * Data Requirements and Optimization Constants
 */

/**
 * Optimization parameters
 */
export const OPTIMIZATION = {
  REQUIRED_DATA_PERIOD: 100,
  MIN_DATA_PERIOD: 60,
  VOLUME_PROFILE_BINS: 20,
  REOPTIMIZATION_INTERVAL: 30, // Re-optimize every 30 days in walk-forward optimization
} as const;

/**
 * Data requirements for various calculations
 */
export const DATA_REQUIREMENTS = {
  MIN_DATA_POINTS: 20,
  MIN_DATA_PERIOD: 50,
  OPTIMIZATION_MIN_PERIOD: 60,
  OPTIMIZATION_REQUIRED_PERIOD: 100,
  CORRELATION_MIN_PERIOD: 50,
  CORRELATION_CALCULATION_PERIOD: 30,
  TREND_CALCULATION_PERIOD: 20,
  MIN_OHLCV_LENGTH: 20,
  ANNUAL_TRADING_DAYS: 252, // Trading days in a year
  LOOKBACK_PERIOD_DAYS: 252, // 1 year lookback for accuracy calculation
} as const;

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  MIN_CONFIDENCE: 50,
  HIGH_CONFIDENCE: 80,
  MEDIUM_CONFIDENCE: 60,
  LOW_CONFIDENCE: 40,
  MAX_CONFIDENCE: 100,
  MIN_SIGNAL_CONFIDENCE: 60,
} as const;

/**
 * Common percentage values
 * @deprecated These constants don't add semantic meaning. Use literal values or more specific constant names based on context.
 */
export const PERCENTAGE_VALUES = {
  PERCENT_50: 50,
  PERCENT_60: 60,
  PERCENT_70: 70,
  PERCENT_80: 80,
  PERCENT_90: 90,
  PERCENT_95: 95,
  PERCENT_100: 100,
} as const;

/**
 * Common multipliers
 */
export const MULTIPLIERS = {
  TARGET_MULTIPLIER: 1.5,
  VOLUME_MULTIPLIER_DEFAULT: 1.2,
  SLIPPAGE_FACTOR_HIGH: 0.5,
  SLIPPAGE_FACTOR_MEDIUM: 0.8,
} as const;

/**
 * Common index values
 * @deprecated These constants are simple number aliases that don't provide meaningful context. Use literal values directly.
 */
export const INDEX_VALUES = {
  INDEX_0: 0,
  INDEX_1: 1,
  INDEX_2: 2,
  INDEX_3: 3,
  INDEX_4: 4,
  INDEX_5: 5,
  INDEX_10: 10,
  INDEX_14: 14,
  INDEX_20: 20,
  INDEX_30: 30,
  INDEX_50: 50,
  INDEX_100: 100,
} as const;
