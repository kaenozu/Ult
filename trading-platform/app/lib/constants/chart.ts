/**
 * Chart Configuration Constants
 * 
 * チャート表示に関する定数
 * Issue #522 - 定数一元化
 */

/**
 * Volume profile visualization
 */
export const VOLUME_PROFILE = {
  MAX_BAR_WIDTH_RATIO: 0.15,
  HEIGHT_DIVISOR: 25,
  BASE_ALPHA: 0.4,
  STRENGTH_ALPHA_ADD: 0.2,
  RESISTANCE_RGB: '239, 68, 68',
  SUPPORT_RGB: '34, 197, 94',
} as const;

/**
 * Chart dimensions
 */
export const CHART_DIMENSIONS = {
  DEFAULT_HEIGHT: 500,
} as const;

/**
 * Chart colors
 */
export const CHART_COLORS = {
  INDEX_LINE: '#60a5fa',
  INDEX_FILL: 'rgba(96, 165, 250, 0.05)',
} as const;

/**
 * Candlestick configuration
 */
export const CANDLESTICK = {
  BULL_COLOR: 'rgba(16, 185, 129, 0.5)',
  BEAR_COLOR: 'rgba(239, 68, 68, 0.5)',
  MAIN_LINE_COLOR: '#67e8f9',
  LINE_WIDTH: 1,
  MAIN_LINE_WIDTH: 2,
  HOVER_RADIUS: 4,
} as const;

/**
 * Chart grid configuration
 */
export const CHART_GRID = {
  MAIN_COLOR: 'rgba(35, 54, 72, 0.5)',
  HOVER_COLOR: 'rgba(59, 130, 246, 0.8)',
  FUTURE_AREA_COLOR: 'rgba(59, 130, 246, 0.2)',
  CURRENT_PRICE_LINE_WIDTH: 3,
  HOVER_LINE_WIDTH: 2,
  LABEL_FONT_SIZE: 12,
} as const;

/**
 * Chart configuration
 * 
 * @deprecated MIN_DATA_POINTS is defined in DATA_REQUIREMENTS (common.ts).
 * Use DATA_REQUIREMENTS.MIN_DATA_POINTS instead.
 */
export const CHART_CONFIG = {
  TENSION: 0.1,
  MIN_DATA_POINTS: 20, // Use DATA_REQUIREMENTS.MIN_DATA_POINTS
} as const;

/**
 * Bollinger Bands configuration
 */
export const BOLLINGER_BANDS_CONFIG = {
  // Position thresholds
  POSITION_LOWER_THRESHOLD: 10,
  POSITION_UPPER_THRESHOLD: 90,
  POSITION_EXTREME_LOWER: 20,
  POSITION_EXTREME_UPPER: 80,

  // Bandwidth thresholds
  BANDWIDTH_SQUEEZE_MULTIPLIER: 0.7,
  BANDWIDTH_EXPANSION_MULTIPLIER: 1.3,
  BANDWIDTH_AVERAGE_PERIOD: 20,

  // Scoring
  POSITION_LOWER_SCORE: 0.6,
  POSITION_UPPER_SCORE: -0.6,
  POSITION_EXTREME_LOWER_SCORE: 0.3,
  POSITION_EXTREME_UPPER_SCORE: -0.3,
} as const;

/**
 * Chart analysis configuration
 */
export const CHART_ANALYSIS = {
  // Data length
  MIN_DATA_LENGTH: 60,

  // Lookback periods
  DIVERGENCE_LOOKBACK: 14,
  DIVERGENCE_PRICE_TREND_THRESHOLD: 0.02,
  DIVERGENCE_RSI_TREND_THRESHOLD: 0.05,

  // Scoring
  DIVERGENCE_STRENGTH_MULTIPLIER: 0.7,

  // Crossover strength
  CROSSOVER_STRENGTH_MULTIPLIER: 0.5,

  // Alignment
  ALIGNMENT_THRESHOLD: 0.7,

  // MACD histogram
  MACD_HISTOGRAM_MULTIPLIER: 10,
  MACD_HISTOGRAM_MAX_SCORE: 0.5,

  // Trend scores
  TREND_SHORT_TERM_WEIGHT: 0.3,
  TREND_MEDIUM_TERM_WEIGHT: 0.4,
  TREND_LONG_TERM_WEIGHT: 0.3,

  // Histogram trend
  HISTOGRAM_TREND_SCORE: 0.2,

  // MACD cross
  MACD_CROSS_STRENGTH_MULTIPLIER: 0.5,

  // Direction threshold
  DIRECTION_THRESHOLD: 0.2,

  // Confidence thresholds
  CONFIDENCE_HIGH_THRESHOLD: 0.75,
  CONFIDENCE_MEDIUM_THRESHOLD: 0.5,
  CONFIDENCE_LOW_THRESHOLD: 0.5,

  // Magnitude thresholds
  MAGNITUDE_STRONG_THRESHOLD: 0.6,
  MAGNITUDE_MODERATE_THRESHOLD: 0.4,

  // Agreement
  AGREEMENT_VARIANCE_MULTIPLIER: 2,
  AGREEMENT_CONSENSUS_WEIGHT: 0.5,
  AGREEMENT_INDICATOR_WEIGHT: 0.5,

  // Special signal
  SPECIAL_SIGNAL_BONUS: 0.1,
} as const;
