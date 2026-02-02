/**
 * Backtest Configuration Constants
 */

/**
 * Backtest configuration
 */
export const BACKTEST_CONFIG = {
  MIN_DATA_PERIOD: 50,
  MIN_SIGNAL_CONFIDENCE: 60,
  TAKE_PROFIT_THRESHOLD: 0.05,
  STOP_LOSS_THRESHOLD: 0.03,
  BULL_STOP_LOSS: 0.03,
  BULL_TAKE_PROFIT: 0.05,
  BEAR_STOP_LOSS: 0.05,
  BEAR_TAKE_PROFIT: 0.03,
} as const;

/**
 * Backtest metrics
 */
export const BACKTEST_METRICS = {
  GOOD_HIT_RATE: 60,
  EXCELLENT_HIT_RATE: 70,
  MIN_TRADES: 2,
} as const;
