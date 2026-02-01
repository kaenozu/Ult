/**
 * Centralized Configuration Constants
 */

export const FORECAST_CONE = {
    STEPS: 5,
    LOOKBACK_DAYS: 60,
    ATR_MULTIPLIER: 2.0,
};

export const RSI_CONFIG = {
    DEFAULT_PERIOD: 14,
    OVERSOLD: 30,
    OVERBOUGHT: 70,
    EXTREME_OVERSOLD: 20,
    EXTREME_OVERBOUGHT: 80,
    PERIOD_OPTIONS: [10, 14, 20],
};

export const SMA_CONFIG = {
    SHORT_PERIOD: 10,
    MEDIUM_PERIOD: 50,
    LONG_PERIOD: 200,
    PERIOD_OPTIONS: [10, 20, 50, 100],
    COLOR: '#fbbf24',
    LINE_WIDTH: 2,
};

export const MACD_CONFIG = {
    FAST_PERIOD: 12,
    SLOW_PERIOD: 26,
    SIGNAL_PERIOD: 9,
};

export const OPTIMIZATION = {
    REQUIRED_DATA_PERIOD: 100,
    MIN_DATA_PERIOD: 60,
    VOLUME_PROFILE_BINS: 20,
};

export const SIGNAL_THRESHOLDS = {
    MIN_CONFIDENCE: 50,
    HIGH_CONFIDENCE: 80,
    STRONG_CORRELATION: 0.7,
    STRONG_MOMENTUM: 2.0,
};

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
};

export const PRICE_CALCULATION = {
    DEFAULT_ERROR_MULTIPLIER: 100,
    DEFAULT_ATR_RATIO: 0.02,
    MIN_CONFIDENCE: 50,
    MAX_CONFIDENCE: 100,
};

export const VOLATILITY = {
    DEFAULT_ATR_PERIOD: 14,
    CALCULATION_PERIOD: 30,
};

// --- From chart.ts ---

export const VOLUME_PROFILE = {
    MAX_BAR_WIDTH_RATIO: 0.15,
    HEIGHT_DIVISOR: 25,
    BASE_ALPHA: 0.4,
    STRENGTH_ALPHA_ADD: 0.2,
    RESISTANCE_RGB: '239, 68, 68',
    SUPPORT_RGB: '34, 197, 94',
};

export const CHART_DIMENSIONS = {
    DEFAULT_HEIGHT: 500,
};

export const CHART_COLORS = {
    INDEX_LINE: '#60a5fa',
    INDEX_FILL: 'rgba(96, 165, 250, 0.05)',
};

export const BOLLINGER_BANDS = {
    STD_DEVIATION: 2,
    PERIOD: 20,
    UPPER_COLOR: 'rgba(59, 130, 246, 0.5)',
    UPPER_BACKGROUND: 'rgba(59, 130, 246, 0.1)',
    LOWER_COLOR: 'rgba(59, 130, 246, 0.5)',
};

export const GHOST_FORECAST = {
    DEFAULT_ATR_RATIO: 0.02,
    TARGET_ALPHA: 0.3,
    STOP_ALPHA: 0.1,
    TARGET_FILL_ALPHA: 0.08,
    DASH_PATTERN: [3, 3],
};

export const CANDLESTICK = {
    BULL_COLOR: 'rgba(16, 185, 129, 0.5)',
    BEAR_COLOR: 'rgba(239, 68, 68, 0.5)',
    MAIN_LINE_COLOR: '#67e8f9',
    LINE_WIDTH: 1,
    MAIN_LINE_WIDTH: 2,
    HOVER_RADIUS: 4,
};

export const CHART_GRID = {
    MAIN_COLOR: 'rgba(35, 54, 72, 0.5)',
    HOVER_COLOR: 'rgba(59, 130, 246, 0.8)',
    FUTURE_AREA_COLOR: 'rgba(59, 130, 246, 0.2)',
    CURRENT_PRICE_LINE_WIDTH: 3,
    HOVER_LINE_WIDTH: 2,
    LABEL_FONT_SIZE: 12,
};

export const CHART_CONFIG = {
    TENSION: 0.1,
    MIN_DATA_POINTS: 20,
};

// --- From trading.ts ---

export const POSITION_SIZING = {
    DEFAULT_RATIO: 0.1,
    MIN_SIZE: 100,
    SLIPPAGE_PERCENTAGE: 0.001,
};

export const AI_TRADING = {
    INITIAL_VIRTUAL_BALANCE: 1000000,
    MIN_TRADE_AMOUNT: 1000,
};

export const MARKET_CORRELATION = {
    STRONG_THRESHOLD: 0.5,
    MODERATE_THRESHOLD: 0.4,
    TREND_DEVIATION: 0.01,
};

export const ENSEMBLE_WEIGHTS = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
};

export const ORDER = {
    EXPIRY_MS: 24 * 60 * 60 * 1000,
};

// --- From api.ts ---

export const CACHE_CONFIG = {
    DEFAULT_DURATION_MS: 5 * 60 * 1000,
    STOCK_UPDATE_INTERVAL_MS: 24 * 60 * 60 * 1000,
    CHUNK_SIZE: 50,
};

export const RATE_LIMIT = {
    REQUEST_INTERVAL_MS: 12000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
};

export const DATA_QUALITY = {
    MIN_DATA_LENGTH: 20,
    MIN_PRICE_THRESHOLD: 0.0001,
    MAX_GAP_DAYS: 7,
};

export const API_ENDPOINTS = {
    // Data is fetched from Yahoo Finance via /api/market
};

// --- From ui.ts ---

export const SIGNAL_COLORS = {
    BUY_BACKGROUND: 'bg-green-500/20',
    BUY_TEXT: 'text-green-400',
    BUY_BORDER: 'border-green-500',
    SELL_BACKGROUND: 'bg-red-500/20',
    SELL_TEXT: 'text-red-400',
    SELL_BORDER: 'border-red-500',
    HOLD_BACKGROUND: 'bg-gray-500/20',
    HOLD_TEXT: 'text-gray-400',
};

export const CONFIDENCE_COLORS = {
    HIGH_THRESHOLD: 60,
    HIGH: 'text-yellow-500',
    MEDIUM_THRESHOLD: 40,
    MEDIUM: 'text-blue-400',
    LOW: 'text-gray-400',
};

export const MARKET_COLORS = {
    JAPAN_BACKGROUND: 'bg-blue-500/20',
    JAPAN_TEXT: 'text-blue-400',
    JAPAN_BORDER: 'border-blue-500',
    US_BACKGROUND: 'bg-red-500/20',
    US_TEXT: 'text-red-400',
    US_BORDER: 'border-red-500',
};

export const HEATMAP_COLORS = {
    BULL_BASE: [34, 197, 94] as const,
    BEAR_BASE: [239, 68, 68] as const,
    MIN_ALPHA: 0.1,
    MAX_ALPHA: 0.9,
};

export const BUTTON_STYLES = {
    SMALL_PADDING: 'px-1.5 py-0.5',
    SMALL_TEXT: 'text-[10px]',
    ROUNDED: 'rounded',
    ROUNDED_MD: 'rounded-md',
    ROUNDED_LG: 'rounded-lg',
};

export const TEXT_SIZES = {
    XS: 'text-[9px]',
    SMALL: 'text-[10px]',
    BASE: 'text-xs',
};

export const GRID_PADDING = {
    SMALL: 'p-0.5',
    MEDIUM: 'p-1',
};

export const ANIMATION = {
    SPINNER_BORDER_WIDTH: 'border-t-2 border-b-2',
    SPINNER_SIZE: 'h-12 w-12',
};

// --- From backtest.ts ---

export const BACKTEST_CONFIG = {
    MIN_DATA_PERIOD: 50,
    MIN_SIGNAL_CONFIDENCE: 60,
    TAKE_PROFIT_THRESHOLD: 0.05,
    STOP_LOSS_THRESHOLD: 0.03,
    BULL_STOP_LOSS: 0.03,
    BULL_TAKE_PROFIT: 0.05,
    BEAR_STOP_LOSS: 0.05,
    BEAR_TAKE_PROFIT: 0.03,
};

export const BACKTEST_METRICS = {
    GOOD_HIT_RATE: 60,
    EXCELLENT_HIT_RATE: 70,
    MIN_TRADES: 2,
};

// --- Additional Constants for Magic Numbers ---

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
};

export const DATA_REQUIREMENTS = {
    MIN_DATA_POINTS: 20,
    MIN_DATA_PERIOD: 50,
    OPTIMIZATION_MIN_PERIOD: 60,
    OPTIMIZATION_REQUIRED_PERIOD: 100,
    CORRELATION_MIN_PERIOD: 50,
    CORRELATION_CALCULATION_PERIOD: 30,
    TREND_CALCULATION_PERIOD: 20,
    MIN_OHLCV_LENGTH: 20,
};

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
};

export const CONFIDENCE_THRESHOLDS = {
    MIN_CONFIDENCE: 50,
    HIGH_CONFIDENCE: 80,
    MEDIUM_CONFIDENCE: 60,
    LOW_CONFIDENCE: 40,
    MAX_CONFIDENCE: 100,
    MIN_SIGNAL_CONFIDENCE: 60,
};

export const PERCENTAGE_VALUES = {
    PERCENT_50: 50,
    PERCENT_60: 60,
    PERCENT_70: 70,
    PERCENT_80: 80,
    PERCENT_90: 90,
    PERCENT_95: 95,
    PERCENT_100: 100,
};

export const MULTIPLIERS = {
    TARGET_MULTIPLIER: 1.5,
    VOLUME_MULTIPLIER_DEFAULT: 1.2,
    SLIPPAGE_FACTOR_HIGH: 0.5,
    SLIPPAGE_FACTOR_MEDIUM: 0.8,
};

export const INDEX_VALUES = {
    INDEX_0: 0,
    INDEX_1: 1,
    INDEX_2: 2,
    INDEX_3: 3,
    INDEX_4: 4,
    INDEX_5: 5,
    INDEX_10: 10,
    INDEX_14: 14,
    INDEX_20: 20,
    INDEX_30: 30,
    INDEX_50: 50,
    INDEX_100: 100,
};
