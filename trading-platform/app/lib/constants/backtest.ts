/**
 * Backtest Configuration Constants
 * 
 * バックテスト設定に関する定数
 * Issue #522 - 定数一元化
 */

/**
 * Backtest configuration
 * 
 * @deprecated Use DATA_REQUIREMENTS.MIN_DATA_PERIOD instead of MIN_DATA_PERIOD
 * @deprecated Use SIGNAL_THRESHOLDS.MIN_SIGNAL_CONFIDENCE instead of MIN_SIGNAL_CONFIDENCE
 * @deprecated Use RISK_MANAGEMENT.*_PCT values instead of BULL_* and BEAR_* thresholds
 */
export const BACKTEST_CONFIG = {
  // Use DATA_REQUIREMENTS.MIN_DATA_PERIOD: 50
  MIN_DATA_PERIOD: 50,
  // Use SIGNAL_THRESHOLDS.MIN_SIGNAL_CONFIDENCE: 60
  MIN_SIGNAL_CONFIDENCE: 60,
  // Use RISK_MANAGEMENT.BULL_STOP_LOSS_PCT, etc.
  TAKE_PROFIT_THRESHOLD: 0.05,
  STOP_LOSS_THRESHOLD: 0.03,
  BULL_STOP_LOSS: 0.03, // Use RISK_MANAGEMENT.BULL_STOP_LOSS_PCT
  BULL_TAKE_PROFIT: 0.05, // Use RISK_MANAGEMENT.BULL_TAKE_PROFIT_PCT
  BEAR_STOP_LOSS: 0.05, // Use RISK_MANAGEMENT.BEAR_STOP_LOSS_PCT
  BEAR_TAKE_PROFIT: 0.03, // Use RISK_MANAGEMENT.BEAR_TAKE_PROFIT_PCT
} as const;

/**
 * Backtest metrics
 */
export const BACKTEST_METRICS = {
  GOOD_HIT_RATE: 60,
  EXCELLENT_HIT_RATE: 70,
  MIN_TRADES: 2,
} as const;

/**
 * Walk-forward analysis configuration
 */
export const WALK_FORWARD_ANALYSIS = {
  // Data length
  MIN_DATA_LENGTH: 60,

  // Window sizes
  OPTIMIZATION_WINDOW_SIZE: 150,
  REQUIRED_DATA_PERIOD: 100,

  // Optimization interval
  OPTIMIZATION_INTERVAL: 30,

  // Parameters
  WFA_TRAIN_RATIO: 0.7, // 70% for training, 30% for validation
  WFA_MIN_VALIDATION_PERIOD: 20,

  // Forecast cone
  FORECAST_CONE_STEPS: 60,
  FORECAST_CONE_LOOKBACK_DAYS: 60,
  FORECAST_CONE_ATR_MULTIPLIER: 2.0,

  // Performance
  PERFECT_OVERFIT_SCORE: 1.0,

  // Parameter stability
  PARAMETER_STABILITY_DIVISOR: 2,
} as const;
