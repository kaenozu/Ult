/**
 * UI and Styling Constants
 */

/**
 * Signal colors for UI
 */
export const SIGNAL_COLORS = {
  BUY_BACKGROUND: 'bg-green-500/20',
  BUY_TEXT: 'text-green-400',
  BUY_BORDER: 'border-green-500',
  SELL_BACKGROUND: 'bg-red-500/20',
  SELL_TEXT: 'text-red-400',
  SELL_BORDER: 'border-red-500',
  HOLD_BACKGROUND: 'bg-gray-500/20',
  HOLD_TEXT: 'text-gray-400',
} as const;

/**
 * Confidence level colors
 */
export const CONFIDENCE_COLORS = {
  HIGH_THRESHOLD: 60,
  HIGH: 'text-yellow-500',
  MEDIUM_THRESHOLD: 40,
  MEDIUM: 'text-blue-400',
  LOW: 'text-gray-400',
} as const;

/**
 * Market-specific colors
 */
export const MARKET_COLORS = {
  JAPAN_BACKGROUND: 'bg-blue-500/20',
  JAPAN_TEXT: 'text-blue-400',
  JAPAN_BORDER: 'border-blue-500',
  US_BACKGROUND: 'bg-red-500/20',
  US_TEXT: 'text-red-400',
  US_BORDER: 'border-red-500',
} as const;

/**
 * Heatmap colors
 */
export const HEATMAP_COLORS = {
  BULL_BASE: [34, 197, 94] as const,
  BEAR_BASE: [239, 68, 68] as const,
  MIN_ALPHA: 0.1,
  MAX_ALPHA: 0.9,
} as const;

/**
 * Button styles
 */
export const BUTTON_STYLES = {
  SMALL_PADDING: 'px-1.5 py-0.5',
  SMALL_TEXT: 'text-[10px]',
  ROUNDED: 'rounded',
  ROUNDED_MD: 'rounded-md',
  ROUNDED_LG: 'rounded-lg',
} as const;

/**
 * Text sizes
 */
export const TEXT_SIZES = {
  XS: 'text-[9px]',
  SMALL: 'text-[10px]',
  BASE: 'text-xs',
} as const;

/**
 * Grid padding
 */
export const GRID_PADDING = {
  SMALL: 'p-0.5',
  MEDIUM: 'p-1',
} as const;

/**
 * Animation styles
 */
export const ANIMATION = {
  SPINNER_BORDER_WIDTH: 'border-t-2 border-b-2',
  SPINNER_SIZE: 'h-12 w-12',
} as const;

/**
 * Chart UI Theme Colors
 */
export const CHART_THEME = {
  LOADING: {
    BACKGROUND: 'bg-[#131b23]',
    BORDER: 'border-[#233648]',
    TEXT: 'text-[#92adc9]',
    SPINNER_BORDER: 'border-[#3b82f6]',
  },
  ERROR: {
    BACKGROUND: 'bg-red-500/10',
    BORDER: 'border-red-500/50',
    TEXT_TITLE: 'text-red-400',
    TEXT_DESC: 'text-red-300',
  },
  TOOLTIP: {
    BACKGROUND: 'bg-[#1a2632]/90',
    BORDER: 'border-[#233648]',
    TEXT_TITLE: 'text-primary',
    TEXT_VALUE: 'text-white',
  }
} as const;

/**
* Alert system UI configuration
*/
export const ALERT_UI = {
// Severity colors
SEVERITY_HIGH_COLOR: 'text-red-400',
SEVERITY_MEDIUM_COLOR: 'text-yellow-400',
SEVERITY_LOW_COLOR: 'text-green-400',

// Confidence thresholds
CONFIDENCE_HIGH_THRESHOLD: 60,
CONFIDENCE_MEDIUM_THRESHOLD: 40,

// Actionable confidence
ACTIONABLE_CONFIDENCE: 50,

// Target price multiplier
TARGET_PRICE_MULTIPLIER: 1.03,

// Alert history limit
MAX_ALERT_HISTORY: 50,
} as const;
