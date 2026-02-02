/**
 * Risk Management Configuration Constants
 */

/**
 * Risk management parameters
 */
export const RISK_MANAGEMENT = {
  BULL_TARGET_MULTIPLIER: 1.5,
  BEAR_TARGET_MULTIPLIER: 1.5,
  DEFAULT_STOP_LOSS_PERCENT: 2,
  DEFAULT_TAKE_PROFIT_PERCENT: 4,
  DEFAULT_KELLY_FRACTION: 0.25,
  DEFAULT_ATR_MULTIPLIER: 2,
  MAX_POSITION_PERCENT: 20,
  DEFAULT_DAILY_LOSS_LIMIT: 5,
  DEFAULT_MAX_POSITIONS: 10,
  STOP_LOSS_RATIO: 0.5, // Stop loss is 50% of target distance
  MIN_POSITION_PERCENT: 1.0, // Minimum position size as % of account
  LOW_CONFIDENCE_REDUCTION: 0.5, // Additional reduction for low confidence (<60%)
} as const;

/**
 * Comprehensive risk parameters
 */
export const RISK_PARAMS = {
  // Stop Loss / Take Profit
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
  FIXED_RATIO_DEFAULT: 0.1,

  // ATR Multipliers
  ATR_STOP_LOSS_MULTIPLIER: 2,
  ATR_TAKE_PROFIT_MULTIPLIER: 3,

  // Volatility Thresholds
  HIGH_VOLATILITY_THRESHOLD: 0.02,
  TREND_STRENGTH_THRESHOLD: 0.5,
} as const;

/**
 * Position sizing configuration
 */
export const POSITION_SIZING = {
  DEFAULT_RATIO: 0.1,
  MIN_SIZE: 100,
  SLIPPAGE_PERCENTAGE: 0.001,
} as const;
