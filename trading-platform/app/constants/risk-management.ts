/**
 * Risk Management Configuration Constants
 * 
 * リスク管理に関する全定数を一元化
 * Issue #522 - 定数一元化
 */

/**
 * VaR (Value at Risk) confidence levels and z-scores
 */
export const VaR = {
  CONFIDENCE_95: 0.95,
  CONFIDENCE_99: 0.99,
  Z_SCORE_95: 1.645,
  Z_SCORE_99: 2.326,
} as const;

/**
 * Comprehensive risk management parameters
 */
export const RISK_MANAGEMENT = {
  // Stop Loss / Take Profit (percentage)
  DEFAULT_STOP_LOSS_PCT: 2,
  DEFAULT_TAKE_PROFIT_PCT: 4,
  BULL_STOP_LOSS_PCT: 3,
  BULL_TAKE_PROFIT_PCT: 5,
  BEAR_STOP_LOSS_PCT: 5,
  BEAR_TAKE_PROFIT_PCT: 3,

  // Position Sizing
  DEFAULT_KELLY_FRACTION: 0.25,
  DEFAULT_RISK_PERCENT: 2,
  DEFAULT_MAX_POSITION_PERCENT: 20,
  DEFAULT_DAILY_LOSS_LIMIT: 5,
  DEFAULT_MAX_POSITIONS: 10,
  MIN_POSITION_PERCENT: 1.0,
  FIXED_RATIO_DEFAULT: 0.1,
  DEFAULT_RATIO: 0.1, // Alias for FIXED_RATIO_DEFAULT

  // ATR Multipliers
  ATR_STOP_LOSS_MULTIPLIER: 2,
  ATR_TAKE_PROFIT_MULTIPLIER: 3,
  DEFAULT_ATR_MULTIPLIER: 2, // Alias for ATR_STOP_LOSS_MULTIPLIER

  // Target Multipliers
  BULL_TARGET_MULTIPLIER: 1.5,
  BEAR_TARGET_MULTIPLIER: 1.5,

  // Risk Ratios
  STOP_LOSS_RATIO: 0.5, // Stop loss is 50% of target distance
  LOW_CONFIDENCE_REDUCTION: 0.5, // Additional reduction for low confidence (<60%)

  // Volatility Thresholds
  HIGH_VOLATILITY_THRESHOLD: 0.02,
  TREND_STRENGTH_THRESHOLD: 0.5,

  // Order Execution
  SLIPPAGE_PERCENTAGE: 0.001,
  MIN_SIZE: 100,
} as const;
