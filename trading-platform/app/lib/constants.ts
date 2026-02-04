/**
 * Centralized Configuration Constants
 * 
 * @deprecated This file is maintained for backward compatibility.
 * New code should import from specific constant files:
 * - @/app/lib/constants/prediction
 * - @/app/lib/constants/technical-indicators
 * - @/app/lib/constants/risk-management
 * - etc.
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
    ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
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

// --- Time-Related Constants ---

/**
 * Time duration constants in milliseconds
 */
export const TIME_DURATION_MS = {
    SECOND: 1000,
    MINUTE: 60000,
    HOUR: 3600000,
    DAY: 86400000,
    YEAR: 31536000000,
} as const;

/**
 * Polling intervals for data updates (in milliseconds)
 */
export const POLLING_INTERVALS = {
    /** Default polling interval for stock data */
    DEFAULT: 60000,
    /** High volatility polling interval */
    HIGH_VOLATILITY: 30000,
    /** Medium volatility polling interval */
    MEDIUM_VOLATILITY: 45000,
    /** Low volatility polling interval */
    LOW_VOLATILITY: 60000,
} as const;

// --- Performance Monitoring ---

/**
 * Performance monitoring thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
    /** Render time alert threshold (ms) */
    RENDER_TIME_ALERT: 100,
    /** API call time alert threshold (ms) */
    API_CALL_TIME_ALERT: 500,
    /** Cache hit rate warning threshold (percentage) */
    CACHE_HIT_RATE_WARNING: 70,
    /** Data staleness threshold (ms) */
    DATA_STALENESS: 5000,
} as const;

// --- Risk Management Thresholds ---

/**
 * Drawdown thresholds for risk management
 */
export const DRAWDOWN_THRESHOLDS = {
    /** Critical drawdown level (percentage) */
    CRITICAL: 10,
    /** Warning drawdown level (percentage) */
    WARNING: 5,
    /** Alert threshold for max drawdown */
    MAX_ALERT: 15,
    /** Severe risk threshold */
    SEVERE: 20,
} as const;

/**
 * Volatility thresholds for market analysis
 */
export const VOLATILITY_THRESHOLDS = {
    /** High volatility threshold */
    HIGH: 2,
    /** Medium-high volatility threshold */
    MEDIUM_HIGH: 1,
    /** Market high volatility (percentage) */
    MARKET_HIGH: 0.02,
    /** Critical volatility for position sizing */
    CRITICAL: 0.025,
    /** Very high volatility level */
    VERY_HIGH: 0.03,
} as const;

// --- Buffer and History Limits ---

/**
 * Maximum buffer sizes for data history
 */
export const BUFFER_LIMITS = {
    /** Maximum alerts to keep in memory */
    MAX_ALERTS: 50,
    /** Maximum alerts for enhanced system */
    MAX_ALERTS_ENHANCED: 100,
    /** Maximum state history entries */
    STATE_HISTORY: 100,
    /** Maximum message queue size */
    MESSAGE_QUEUE: 1000,
    /** Maximum value history entries */
    VALUE_HISTORY: 100,
    /** Data buffer limit for trading platform */
    DATA_BUFFER: 500,
    /** Maximum cache entries */
    CACHE_MAX_SIZE: 1000,
    /** Maximum latency metrics entries */
    LATENCY_METRICS: 1000,
} as const;

// --- Technical Analysis Thresholds ---

/**
 * RSI thresholds for technical analysis
 */
export const RSI_THRESHOLDS = {
    /** RSI midline (neutral) */
    MIDLINE: 50,
    /** RSI buffer added to oversold level */
    OVERSOLD_BUFFER: 10,
    /** Extreme RSI level for signals */
    EXTREME_LOW: 15,
    /** Extreme RSI level for signals */
    EXTREME_HIGH: 85,
} as const;

/**
 * ADX thresholds for trend strength
 */
export const ADX_THRESHOLDS = {
    /** Ranging market threshold */
    RANGING: 20,
    /** Trending market threshold */
    TRENDING: 25,
    /** Strong trend threshold */
    STRONG_TREND: 40,
} as const;

/**
 * General momentum and trend thresholds
 */
export const MOMENTUM_THRESHOLDS = {
    /** Price momentum threshold for signals */
    PRICE_MOMENTUM: 0.02,
    /** Price momentum for strategy evaluation */
    PRICE_MOMENTUM_STRONG: 0.05,
    /** Trend strength threshold */
    TREND_STRENGTH: 0.5,
    /** MACD strength relative to ATR */
    MACD_STRENGTH: 0.5,
    /** Bollinger band position threshold */
    BOLLINGER_POSITION_HIGH: 90,
    /** Sentiment score threshold */
    SENTIMENT_THRESHOLD: 0.7,
} as const;

/**
 * Volume analysis thresholds
 */
export const VOLUME_THRESHOLDS = {
    /** Volume to price ratio alert threshold */
    VOLUME_PRICE_RATIO_ALERT: 5,
    /** Critical volume ratio */
    CRITICAL_RATIO: 5,
    /** Standard volume ratio */
    STANDARD_RATIO: 2,
    /** High volume daily threshold */
    HIGH_DAILY_VOLUME: 100000000,
} as const;

// --- Alert Severity Thresholds ---

/**
 * Thresholds for alert severity levels
 */
export const ALERT_SEVERITY_THRESHOLDS = {
    /** High severity threshold (percentage) */
    HIGH: 70,
    /** Medium severity threshold (percentage) */
    MEDIUM: 40,
    /** Low severity threshold (percentage) */
    LOW: 30,
    /** Minimum hold confidence */
    MIN_HOLD_CONFIDENCE: 30,
    /** Minimum standard confidence */
    MIN_STANDARD_CONFIDENCE: 50,
} as const;

// --- Data Quality and Minimums ---

/**
 * Minimum data requirements for analysis
 */
export const DATA_MIN_REQUIREMENTS = {
    /** Minimum history length for price analysis */
    MIN_HISTORY_PRICE: 10,
    /** Minimum history length for volume analysis */
    MIN_HISTORY_VOLUME: 10,
    /** Minimum data points for correlation */
    MIN_CORRELATION: 50,
    /** Minimum data for quality check */
    MIN_DATA_QUALITY: 20,
    /** Minimum for advanced metrics */
    MIN_ADVANCED_ANALYSIS: 60,
    /** Trading days in a year */
    TRADING_DAYS_YEAR: 252,
    /** Trading days in half year */
    TRADING_DAYS_HALF_YEAR: 126,
    /** Days for holding period calculation */
    MIN_HOLDING_DAYS: 1,
} as const;

// --- Index and Offset Constants ---

/**
 * Common index offsets used in calculations
 */
export const INDEX_OFFSETS = {
    /** Warmup buffer for indicator calculation */
    WARMUP_BUFFER: 10,
    /** Window calculation offset */
    WINDOW_OFFSET: 10,
    /** Last few items for trend analysis */
    TREND_ANALYSIS_WINDOW: 5,
} as const;

// --- Price and Percentage Thresholds ---

/**
 * Price movement and percentage thresholds
 */
export const PRICE_THRESHOLDS = {
    /** Target move calculation factor */
    TARGET_MOVE_FACTOR: 0.012,
    /** Stop loss factor */
    STOP_LOSS_FACTOR: 0.97,
    /** Bollinger breakout factor */
    BOLLINGER_BREAKOUT: 1.05,
    /** Take profit minimum factor */
    TAKE_PROFIT_MIN_FACTOR: 0.95,
    /** Gap risk high threshold multiplier */
    GAP_RISK_MULTIPLIER: 0.75,
    /** Error calculation factor */
    ERROR_FACTOR: 0.9,
    /** Trend deviation minimum */
    TREND_DEVIATION_MIN: 0.01,
} as const;

/**
 * Win rate and quality metrics
 */
export const WIN_RATE_THRESHOLDS = {
    /** Minimum win rate threshold (percentage) */
    MIN_WIN_RATE: 50,
    /** Sharpe ratio - excellent level */
    SHARPE_EXCELLENT: 2,
    /** Sharpe ratio - good level */
    SHARPE_GOOD: 1,
    /** Sharpe ratio - neutral level */
    SHARPE_NEUTRAL: 0.5,
} as const;

// --- Wait Time Thresholds ---

/**
 * Wait time thresholds for rate limiting and retries
 */
export const WAIT_TIME_THRESHOLDS = {
    /** Long wait time threshold (ms) */
    LONG_WAIT: 60000,
    /** Minimum retry delay (ms) */
    MIN_RETRY_DELAY: 1000,
} as const;

// --- Numeric Display Thresholds ---

/**
 * Thresholds for numeric value display formatting
 */
export const DISPLAY_THRESHOLDS = {
    /** Million threshold for display */
    MILLION: 1000000,
    /** Thousand threshold for display */
    THOUSAND: 1000,
    /** Default large tick size */
    LARGE_TICK_SIZE: 500000,
} as const;

// --- HTTP Status Codes ---

/**
 * HTTP status code ranges
 */
export const HTTP_STATUS = {
    /** Server error threshold */
    SERVER_ERROR: 500,
} as const;

// --- Slippage and Transaction Constants ---

/**
 * Slippage rate ranges for transaction cost modeling
 */
export const SLIPPAGE_RATES = {
    /** Minimum slippage rate for high volume */
    MIN_HIGH_VOLUME: 0.001,
    /** Maximum slippage rate for high volume */
    MAX_HIGH_VOLUME: 0.003,
    /** Minimum slippage rate for low volume */
    MIN_LOW_VOLUME: 0.005,
    /** Maximum slippage rate for low volume */
    MAX_LOW_VOLUME: 0.01,
} as const;
