/**
 * Backtest Engine Configuration Constants
 * 
 * バックテストエンジンのデフォルト設定
 * Issue #522 - 定数一元化
 */

/**
 * Default backtest configuration
 */
export const BACKTEST_DEFAULTS = {
  // Capital
  INITIAL_CAPITAL: 100000,
  LARGE_INITIAL_CAPITAL: 1000000,
  SMALL_INITIAL_CAPITAL: 10000,
  
  // Fees
  DEFAULT_COMMISSION: 0.1, // 0.1%
  DEFAULT_SPREAD: 0.01, // 0.01%
  
  // Position limits
  MAX_POSITION_SIZE: 20, // 20%
  MIN_POSITION_SIZE: 5, // 5%
  MAX_DRAWDOWN: 50, // 50%
  CONSERVATIVE_MAX_DRAWDOWN: 20, // 20%
  
  // Order defaults
  DEFAULT_ORDER_QUANTITY: 100,
  SMALL_ORDER_QUANTITY: 50,
  LARGE_ORDER_QUANTITY: 500,
  
  // Trading
  ALLOW_SHORT: false,
  ALLOW_SHORT_AGGRESSIVE: true,
} as const;

/**
 * Realistic backtest configuration
 */
export const REALISTIC_BACKTEST_DEFAULTS = {
  // Slippage
  USE_REALISTIC_SLIPPAGE: true,
  AVERAGE_DAILY_VOLUME: 1000000,
  MARKET_IMPACT_COEFFICIENT: 0.1,
  
  // Volatility slippage
  USE_VOLATILITY_SLIPPAGE: true,
  VOLATILITY_WINDOW: 20,
  VOLATILITY_SLIPPAGE_MULTIPLIER: 2.0,
  
  // Market hours (in minutes from midnight)
  MARKET_OPEN_MINUTES: 570, // 9:30 AM
  MARKET_CLOSE_MINUTES: 960, // 4:00 PM
  
  // Order book simulation
  ORDER_BOOK_LEVELS: 10,
  ORDER_BOOK_PRICE_INCREMENT: 0.001,
  ORDER_BOOK_SIZE_BASE: 100,
  ORDER_BOOK_SIZE_DECAY: 0.3,
} as const;

/**
 * Tiered commission configuration
 */
export const TIERED_COMMISSIONS = {
  TIERS: [
    { volumeThreshold: 0, rate: 0.1 },       // 0.1% for low volume
    { volumeThreshold: 100000, rate: 0.08 }, // 0.08% for medium volume
    { volumeThreshold: 500000, rate: 0.05 }, // 0.05% for high volume
    { volumeThreshold: 1000000, rate: 0.03 }, // 0.03% for very high volume
  ],
} as const;

/**
 * Walk-forward analysis configuration
 */
export const WALK_FORWARD_DEFAULTS = {
  // Window sizes (in trading days)
  TRAINING_SIZE: 252, // 1 year
  TEST_SIZE: 63, // 3 months
  MIN_DATA_POINTS: 500,
  
  // Window types
  WINDOW_TYPE_ROLLING: 'rolling',
  WINDOW_TYPE_ANCHORED: 'anchored',
  
  // Optimization
  OPTIMIZE_PARAMETERS: true,
} as const;

/**
 * Monte Carlo simulation configuration
 */
export const MONTE_CARLO_DEFAULTS = {
  NUM_SIMULATIONS: 1000,
  METHOD_TRADE_SHUFFLING: 'trade_shuffling',
  METHOD_BOOTSTRAP: 'bootstrap',
  METHOD_PARAMETRIC: 'parametric',
} as const;

/**
 * Portfolio configuration for multi-asset backtest
 */
export const PORTFOLIO_DEFAULTS = {
  INITIAL_CAPITAL: 100000,
  MAX_POSITIONS: 10,
  MAX_POSITION_SIZE: 20, // 20%
  MIN_POSITION_SIZE: 5, // 5%
} as const;

/**
 * Overfitting detection thresholds
 */
export const OVERFITTING_THRESHOLDS = {
  // Parameter complexity
  HIGH_PARAMETER_COUNT: 10,
  VERY_HIGH_PARAMETER_COUNT: 20,
  
  // Trade count
  MIN_TRADES_FOR_RELIABILITY: 30,
  GOOD_TRADE_COUNT: 100,
  
  // Holding period
  SHORT_HOLDING_THRESHOLD: 2, // days
  HIGH_TURNOVER_RATIO: 2.0,
  
  // Performance degradation
  SEVERE_DEGRADATION_THRESHOLD: 0.5, // 50% degradation
  MODERATE_DEGRADATION_THRESHOLD: 0.3, // 30% degradation
} as const;

/**
 * Risk score categories
 */
export const RISK_CATEGORIES = {
  VERY_LOW_THRESHOLD: 80,
  LOW_THRESHOLD: 60,
  MEDIUM_THRESHOLD: 40,
  HIGH_THRESHOLD: 20,
  // Category labels
  VERY_LOW: 'very_low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
} as const;

/**
 * Grade thresholds for overall assessment
 */
export const GRADE_THRESHOLDS = {
  A_PLUS: 95,
  A: 85,
  B: 70,
  C: 55,
  D: 40,
  F: 0,
} as const;

/**
 * Confidence level thresholds
 */
export const CONFIDENCE_LEVELS = {
  VERY_HIGH: 80,
  HIGH: 60,
  MEDIUM: 40,
  LOW: 20,
  // Labels
  VERY_HIGH_LABEL: 'very_high',
  HIGH_LABEL: 'high',
  MEDIUM_LABEL: 'medium',
  LOW_LABEL: 'low',
  VERY_LOW_LABEL: 'very_low',
} as const;

/**
 * Robustness score recommendations
 */
export const ROBUSTNESS_RECOMMENDATIONS = {
  EXCELLENT_THRESHOLD: 80,
  GOOD_THRESHOLD: 60,
  FAIR_THRESHOLD: 40,
} as const;
