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

/**
 * Analysis configuration
 */
export const ANALYSIS = {
  // Data length thresholds
  MIN_DATA_LENGTH: 60,
  MIN_RSI_DATA_LENGTH: 60,

  // Window sizes
  ACCURACY_WINDOW_SIZE: 20,
  ACCURACY_STEP: 3,
  ACCURACY_START_INDEX: 10,

  // Error bounds
  ERROR_MIN_BOUND: 0.75,
  ERROR_MAX_BOUND: 2.0,

  // Target move
  TARGET_MOVE_MULTIPLIER: 0.012,

  // Optimization
  OPTIMIZATION_WINDOW_SIZE: 150,
  LAST_OPTIMIZATION_INDEX: -999,

  // Days held threshold
  DAYS_HELD_THRESHOLD: 20,

  // Forecast cone steps
  FORECAST_CONE_STEPS: 60,
  FORECAST_CONE_LOOKBACK_DAYS: 60,
  FORECAST_CONE_ATR_MULTIPLIER: 2.0,

  // Prediction error
  PREDICTION_ERROR_THRESHOLD: 0.1,
  PREDICTION_ERROR_MULTIPLIER: 0.9,

  // Hit rate calculation
  HIT_RATE_STEP: 3,
  HIT_RATE_START_INDEX: 10,
  HIT_RATE_END_INDEX: 10,

  // Score thresholds
  PERFECT_OVERFIT_SCORE: 1.0,

  // Parameter stability
  PARAMETER_STABILITY_DIVISOR: 2,

  // Equities
  INITIAL_EQUITY: 100,
} as const;
