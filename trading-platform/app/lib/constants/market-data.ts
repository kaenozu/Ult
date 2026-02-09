/**
 * Market Data Configuration Constants
 * 
 * 市場データの品質管理とキャッシュ設定
 * Issue #522 - 定数一元化
 */

/**
 * Data quality configuration
 */
export const DATA_QUALITY_CONFIG = {
  // Price validation
  MAX_PRICE_CHANGE_PERCENT: 20,
  MIN_PRICE_THRESHOLD: 0.0001,
  
  // Timestamp validation
  MAX_TIMESTAMP_DELAY_MS: 60000, // 1 minute
  
  // Gap detection
  MAX_GAP_DAYS: 7,
  MAX_GAP_SIZE: 10,
  
  // Data requirements
  MIN_DATA_QUALITY_SCORE: 0.8,
  MIN_DATA_POINTS_FOR_VALIDATION: 20,
} as const;

/**
 * Data source configuration
 */
export const DATA_SOURCE_CONFIG = {
  // Yahoo Finance (free)
  YAHOO_FINANCE: {
    requestsPerMinute: 5,
    requestsPerDay: 2000,
    intraday: false,
    delayMinutes: 15,
    japaneseStocks: true,
  },
  
  // Alpha Vantage (free tier)
  ALPHA_VANTAGE: {
    requestsPerMinute: 5,
    requestsPerDay: 500,
    intraday: true,
    delayMinutes: 15,
    japaneseStocks: true,
  },
  
  // Paid data sources
  BLOOMBERG: {
    requestsPerMinute: 100,
    requestsPerDay: 50000,
    intraday: true,
    delayMinutes: 0,
    japaneseStocks: true,
  },
  
  REFINITIV: {
    requestsPerMinute: 200,
    requestsPerDay: 100000,
    intraday: true,
    delayMinutes: 0,
    japaneseStocks: true,
  },
  
  POLYGON: {
    requestsPerMinute: 200,
    requestsPerDay: 200000,
    intraday: true,
    delayMinutes: 15,
    japaneseStocks: false,
  },
} as const;

/**
 * Cache configuration
 */
export const CACHE_DEFAULTS = {
  // Market data cache
  MARKET_DATA: {
    maxSize: 1000,
    defaultTTL: 300000, // 5 minutes
    enablePrefetch: true,
  },
  
  // Indicator cache
  INDICATOR: {
    maxSize: 500,
    defaultTTL: 600000, // 10 minutes
    enablePrefetch: true,
  },
  
  // API cache
  API: {
    maxSize: 200,
    defaultTTL: 180000, // 3 minutes
    enablePrefetch: false,
  },
  
  // Auto cleanup
  AUTO_CLEANUP_INTERVAL_MS: 60000, // 1 minute
  MAX_AGE_MS: 3600000, // 1 hour
} as const;

/**
 * Latency monitoring configuration
 */
export const LATENCY_CONFIG = {
  // Thresholds
  WARNING_THRESHOLD_MS: 5000,
  CRITICAL_THRESHOLD_MS: 10000,
  FRESHNESS_THRESHOLD_MS: 60000, // 1 minute
  
  // Measurement
  MEASUREMENT_WINDOW_MS: 300000, // 5 minutes
} as const;

/**
 * Microstructure analysis configuration
 */
export const MICROSTRUCTURE_CONFIG = {
  // Order book
  ORDER_BOOK_DEPTH: 10,
  MIN_TICK_VOLUME: 0,
  UPDATE_INTERVAL_MS: 1000, // 1 second
  
  // Analysis windows
  DEFAULT_WINDOW_MS: 60000, // 1 minute
  
  // Data retention
  RECENT_TICKS_LIMIT: 100,
  MAX_AGE_MS: 3600000, // 1 hour
} as const;

/**
 * Flash crash detection configuration
 */
export const FLASH_CRASH_CONFIG = {
  VOLUME_THRESHOLD: 2, // 2x normal volume
  SEVERE_DROP_PERCENT: 10, // 10% drop
  CHECK_INTERVAL_MS: 60000, // 1 minute
  MIN_DATA_POINTS: 3,
} as const;

/**
 * Data completion pipeline configuration
 */
export const DATA_COMPLETION_CONFIG = {
  MAX_GAP_SIZE: 10,
  MIN_DATA_QUALITY: 0.8,
} as const;

/**
 * Quality score thresholds
 */
export const QUALITY_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
  POOR: 0,
} as const;

/**
 * Volume analysis thresholds
 */
export const VOLUME_THRESHOLDS = {
  UNUSUAL_VOLUME_MULTIPLIER: 4, // 4x average
  MIN_AVERAGE_VOLUME: 50000,
  HIGH_VOLUME_THRESHOLD: 100000,
  VERY_HIGH_VOLUME_THRESHOLD: 500000,
  ULTRA_HIGH_VOLUME_THRESHOLD: 1000000,
} as const;

/**
 * Multi-source aggregator configuration
 */
export const MULTI_SOURCE_CONFIG = {
  MIN_SOURCE_COUNT: 2,
  MAX_SOURCE_AGE_MS: 10000,
  CONSISTENCY_THRESHOLD: 3,
} as const;
