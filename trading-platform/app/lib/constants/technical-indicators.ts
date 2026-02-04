/**
 * Technical Indicator Configuration Constants
 */

/**
 * RSI (Relative Strength Index) configuration
 */
export const RSI_CONFIG = {
  DEFAULT_PERIOD: 14,
  OVERSOLD: 35, // Adjusted from 30 for better entry signals
  OVERBOUGHT: 65, // Adjusted from 70 for better exit signals
  EXTREME_OVERSOLD: 25, // Adjusted from 20 for more reliable signals
  EXTREME_OVERBOUGHT: 75, // Adjusted from 80 for more reliable signals
  PERIOD_OPTIONS: [10, 14, 20] as const,
} as const;

/**
 * SMA (Simple Moving Average) configuration
 */
export const SMA_CONFIG = {
  SHORT_PERIOD: 10,
  MEDIUM_PERIOD: 50,
  LONG_PERIOD: 200,
  PERIOD_OPTIONS: [10, 20, 50, 100] as const,
  COLOR: '#fbbf24',
  LINE_WIDTH: 2,
} as const;

/**
 * MACD (Moving Average Convergence Divergence) configuration
 */
export const MACD_CONFIG = {
  FAST_PERIOD: 12,
  SLOW_PERIOD: 26,
  SIGNAL_PERIOD: 9,
} as const;

/**
 * Bollinger Bands configuration
 */
export const BOLLINGER_BANDS = {
  STD_DEVIATION: 2,
  PERIOD: 20,
  UPPER_COLOR: 'rgba(59, 130, 246, 0.5)',
  UPPER_BACKGROUND: 'rgba(59, 130, 246, 0.1)',
  LOWER_COLOR: 'rgba(59, 130, 246, 0.5)',
} as const;

/**
 * Volatility and ATR configuration
 */
export const VOLATILITY = {
  DEFAULT_ATR_PERIOD: 14,
  CALCULATION_PERIOD: 20,
} as const;

/**
 * Comprehensive technical indicator parameters
 */
export const TECHNICAL_INDICATORS = {
  // RSI
  RSI_PERIOD: 14,
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70,
  RSI_EXTREME_OVERSOLD: 20,
  RSI_EXTREME_OVERBOUGHT: 80,

  // SMA
  SMA_PERIOD_SHORT: 10,
  SMA_PERIOD_MEDIUM: 20,
  SMA_PERIOD_LONG: 50,
  SMA_PERIOD_VERY_LONG: 200,

  // EMA
  EMA_PERIOD: 12,

  // Bollinger Bands
  BB_PERIOD: 20,
  BB_STD_DEV: 2,

  // ATR
  ATR_PERIOD: 14,
  ATR_MULTIPLIER_DEFAULT: 2,

  // MACD
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,

  // ADX
  ADX_PERIOD: 14,
  ADX_TRENDING_THRESHOLD: 25,
  ADX_RANGING_THRESHOLD: 20,

  // Stochastic
  STOCHASTIC_PERIOD: 14,

  // Williams %R
  WILLIAMS_R_PERIOD: 14,

  // Volume Profile
  VOLUME_PROFILE_BINS: 20,
  VOLUME_PROFILE_MIN_DAYS: 60,
} as const;
