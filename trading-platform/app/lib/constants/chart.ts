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
