/**
 * Data Requirements and Optimization Constants
 * 
 * 共通のデータ要件と最適化パラメータ
 * Issue #522 - 定数一元化
 */

/**
 * Time intervals in milliseconds
 */
export const TIME_INTERVALS = {
  // Milliseconds
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  
  // Common intervals
  UPDATE_5_SEC: 5 * 1000,
  UPDATE_30_SEC: 30 * 1000,
  UPDATE_1_MIN: 60 * 1000,
  UPDATE_5_MIN: 5 * 60 * 1000,
  UPDATE_10_MIN: 10 * 60 * 1000,
  UPDATE_15_MIN: 15 * 60 * 1000,
  UPDATE_30_MIN: 30 * 60 * 1000,
  UPDATE_1_HOUR: 60 * 60 * 1000,
  
  // Cache durations
  CACHE_1_MIN: 60 * 1000,
  CACHE_5_MIN: 5 * 60 * 1000,
  CACHE_15_MIN: 15 * 60 * 1000,
  CACHE_30_MIN: 30 * 60 * 1000,
  CACHE_1_HOUR: 60 * 60 * 1000,
  
  // API rate limits
  RATE_LIMIT_WINDOW: 60 * 1000,
} as const;

/**
 * Buffer and limit sizes
 */
export const LIMITS = {
  // Data limits
  MAX_DATA_POINTS: 1000,
  MAX_PREDICTIONS: 1000,
  MAX_HISTORY: 10000,
  
  // Buffer sizes
  DEFAULT_BUFFER_SIZE: 10000,
  MAX_BUFFER_SIZE: 50000,
  
  // Iteration limits
  MAX_ITERATIONS: 1000,
  MAX_OPTIMIZER_ITERATIONS: 1000,
  
  // UI limits
  MAX_DISPLAY_ITEMS: 100,
  MAX_TABLE_ROWS: 500,
} as const;

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
  LOOKBACK_PERIOD_DAYS: 60, // 60 days lookback for accuracy calculation (realistic requirement)
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
  STOP_LOSS_MULTIPLIER: 2.0,
  TAKE_PROFIT_MULTIPLIER: 3.0,
  VOLATILITY_MULTIPLIER: 2.0,
} as const;

/**
 * Percentages (0-100 scale)
 */
export const PERCENTAGES = {
  FULL: 100,
  HALF: 50,
  QUARTER: 25,
  TENTH: 10,
  DEFAULT_RISK: 2,
  DEFAULT_COMMISSION: 0.1,
  DEFAULT_SLIPPAGE: 0.05,
} as const;

/**
 * Numeric precision constants
 */
export const NUMERIC_PRECISION = {
  EPSILON: 0.0001,
  PRICE_COMPARISON_EPSILON: 0.001,
  VOLUME_COMPARISON_EPSILON: 0.01,
} as const;