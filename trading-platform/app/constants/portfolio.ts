/**
 * Portfolio Configuration Constants
 * 
 * ポートフォリオ最適化とリスク管理の設定
 * Issue #522 - 定数一元化
 */

/**
 * Portfolio optimization defaults
 */
export const PORTFOLIO_OPTIMIZATION_DEFAULTS = {
  // Risk-free rate (annual, as percentage)
  RISK_FREE_RATE: 2.0,
  
  // Trading days
  TRADING_DAYS_PER_YEAR: 252,
  
  // Optimization
  MAX_ITERATIONS: 1000,
  CONVERGENCE_THRESHOLD: 1e-8,
  CONVERGENCE_TOLERANCE: 1e-8,
  
  // Efficient frontier
  EFFICIENT_FRONTIER_POINTS: 50,
} as const;

/**
 * Covariance calculation methods
 */
export const COVARIANCE_METHODS = {
  SAMPLE: 'sample',
  HISTORICAL: 'historical',
  EXPONENTIALLY_WEIGHTED: 'exponentially_weighted',
  SHRINKAGE: 'shrinkage',
} as const;

/**
 * Gap risk configuration
 */
export const GAP_RISK_CONFIG = {
  MAX_GAP_ADJUSTMENT: 0.05,
  LOOKBACK_PERIOD: 252,
  GAP_STD_DEV_THRESHOLD: 2,
} as const;

/**
 * Risk parity configuration
 */
export const RISK_PARITY_DEFAULTS = {
  LOOKBACK_PERIOD: 252,
  REBALANCE_FREQUENCY: 20,
} as const;

/**
 * Black-Litterman model configuration
 */
export const BLACK_LITTERMAN_CONFIG = {
  TAU: 0.05, // Scaling factor for prior covariance
  RISK_AVERSION: 2.5, // Market risk aversion parameter
} as const;

/**
 * Portfolio constraints
 */
export const PORTFOLIO_CONSTRAINTS = {
  MIN_WEIGHT: 0, // 0%
  MAX_WEIGHT: 100, // 100%
  DEFAULT_MIN_WEIGHTS: 0, // No short selling by default
  DEFAULT_MAX_WEIGHTS: 100, // Full concentration allowed
} as const;

/**
 * Performance metrics thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Sharpe ratio
  GOOD_SHARPE: 1.0,
  EXCELLENT_SHARPE: 2.0,
  
  // Sortino ratio
  GOOD_SORTINO: 1.5,
  EXCELLENT_SORTINO: 3.0,
  
  // Max drawdown
  ACCEPTABLE_MAX_DRAWDOWN: 20, // 20%
  CONCERNING_MAX_DRAWDOWN: 30, // 30%
  
  // Win rate
  MIN_WIN_RATE: 50, // 50%
  GOOD_WIN_RATE: 60, // 60%
  EXCELLENT_WIN_RATE: 70, // 70%
} as const;

/**
 * Rebalancing configuration
 */
export const REBALANCING_CONFIG = {
  // Threshold-based rebalancing
  DRIFT_THRESHOLD: 0.05, // 5% drift triggers rebalance
  
  // Time-based rebalancing (days)
  DAILY: 1,
  WEEKLY: 5,
  MONTHLY: 21,
  QUARTERLY: 63,
  ANNUALLY: 252,
} as const;

/**
 * Asset allocation defaults
 */
export const ASSET_ALLOCATION_DEFAULTS = {
  // Default target weights for equal weight portfolio
  EQUAL_WEIGHT_DIVISOR: 100, // Used with maxPositions for equal weight
  
  // Concentration limits
  MAX_SINGLE_ASSET_WEIGHT: 20, // 20%
  MIN_DIVERSIFICATION: 5, // Minimum 5 assets
} as const;
