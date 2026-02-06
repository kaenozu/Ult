/**
 * Data Requirements and Optimization Constants
 * 
 * 共通のデータ要件と最適化パラメータ
 * Issue #522 - 定数一元化
 */

/**
 * Optimization parameters
 */
export const OPTIMIZATION = {
  REQUIRED_DATA_PERIOD: 100,
  MIN_DATA_PERIOD: 60,
  VOLUME_PROFILE_BINS: 20,
  REOPTIMIZATION_INTERVAL: 30, // Re-optimize every 30 days in walk-forward optimization
  // Walk-Forward Analysis parameters
  WFA_TRAIN_RATIO: 0.7, // 70% for training, 30% for validation within optimization window
  WFA_MIN_VALIDATION_PERIOD: 20, // Minimum validation period size
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
  LOOKBACK_PERIOD_DAYS: 30, // 30 days lookback for accuracy calculation (realistic requirement)
} as const;

/**
 * Confidence thresholds
 * 
 * @deprecated Use SIGNAL_THRESHOLDS from trading.ts instead.
 * This constant is kept for backward compatibility only.
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
 * Common multipliers
 */
export const MULTIPLIERS = {
  TARGET_MULTIPLIER: 1.5,
  VOLUME_MULTIPLIER_DEFAULT: 1.2,
  SLIPPAGE_FACTOR_HIGH: 0.5,
  SLIPPAGE_FACTOR_MEDIUM: 0.8,
} as const;
