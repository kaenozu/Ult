/**
 * Trading Configuration Constants
 * 
 * トレード関連の設定定数
 * Issue #522 - 定数一元化
 */

/**
 * Trading days per year for calculations
 */
export const TRADING_DAYS = {
  PER_YEAR: 252,
  PER_MONTH: 21,
  PER_WEEK: 5,
} as const;

/**
 * Risk-free rate for Sharpe ratio calculation
 */
export const RISK_FREE_RATE = {
  ANNUAL: 0.02,  // 2%
  DAILY: 0.02 / 252,
} as const;

/**
 * Backtest defaults
 */
export const BACKTEST = {
  DEFAULT_INITIAL_CAPITAL: 100000,
  DEFAULT_COMMISSION: 0.001,     // 0.1%
  DEFAULT_SLIPPAGE: 0.0005,       // 0.05%
  DEFAULT_MAX_POSITION: 0.5,     // 50%
} as const;

/**
 * Signal generation thresholds
 * 
 * 信頼度しきい値は common.ts の CONFIDENCE_THRESHOLDS と統合
 */
export const SIGNAL_THRESHOLDS = {
  MIN_CONFIDENCE: 60,
  HIGH_CONFIDENCE: 85,
  MEDIUM_CONFIDENCE: 70,
  LOW_CONFIDENCE: 40,
  MIN_SIGNAL_CONFIDENCE: 60,
  MAX_CONFIDENCE: 100,
  STRONG_CORRELATION: 0.75,
  STRONG_MOMENTUM: 2.0,
} as const;

/**
 * Market correlation thresholds
 */
export const MARKET_CORRELATION = {
  STRONG_THRESHOLD: 0.5,
  MODERATE_THRESHOLD: 0.4,
  TREND_DEVIATION: 0.01,
} as const;

/**
 * AI trading configuration
 */
export const AI_TRADING = {
  INITIAL_VIRTUAL_BALANCE: 1000000,
  MIN_TRADE_AMOUNT: 1000,
} as const;

/**
 * Order configuration
 */
export const ORDER = {
  EXPIRY_MS: 24 * 60 * 60 * 1000,
} as const;
