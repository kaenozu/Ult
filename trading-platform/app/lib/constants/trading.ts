/**
 * Trading Configuration Constants
 */

/**
 * Signal generation thresholds
 */
export const SIGNAL_THRESHOLDS = {
  MIN_CONFIDENCE: 60, // Increased from 50 to improve signal quality
  HIGH_CONFIDENCE: 85, // Increased from 80 for stronger signals
  STRONG_CORRELATION: 0.75, // Increased from 0.7 for better market sync
  STRONG_MOMENTUM: 2.0,
  MEDIUM_CONFIDENCE: 70, // New threshold for medium confidence signals
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
