/**
 * API Configuration Constants
 * 
 * API設定とキャッシュ、レート制限に関する定数
 * Issue #522 - 定数一元化
 */

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  DEFAULT_DURATION_MS: 5 * 60 * 1000,
  STOCK_UPDATE_INTERVAL_MS: 24 * 60 * 60 * 1000,
  CHUNK_SIZE: 50,
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  REQUEST_INTERVAL_MS: 12000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Data quality requirements for API responses
 * 
 * @deprecated MIN_DATA_LENGTH is defined in DATA_REQUIREMENTS (common.ts).
 * Use DATA_REQUIREMENTS.MIN_DATA_POINTS instead.
 */
export const DATA_QUALITY = {
  MIN_DATA_LENGTH: 20, // Use DATA_REQUIREMENTS.MIN_DATA_POINTS
  MIN_PRICE_THRESHOLD: 0.0001,
  MAX_GAP_DAYS: 7,
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
} as const;

/**
 * Alert system configuration
 */
export const ALERT_SYSTEM = {
  // Monitoring
  DEFAULT_MONITORING_INTERVAL_MS: 5000,

  // Alert limits
  MAX_ALERT_HISTORY: 50,
  MAX_INDICATOR_HISTORY: 100,

  // Condition defaults
  DEFAULT_COOLDOWN_MS: 300000, // 5 minutes

  // Severity scores
  SEVERITY_SCORES: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  },

  // Severity thresholds
  SEVERITY_HIGH_THRESHOLD: 70,
  SEVERITY_MEDIUM_THRESHOLD: 40,

  // Correlation thresholds
  CORRELATION_STRONG_THRESHOLD: 0.5,
  CORRELATION_MODERATE_THRESHOLD: 0.4,
  CORRELATION_WEAK_THRESHOLD: 0.7,

  // Price change thresholds
  PRICE_CHANGE_HIGH_THRESHOLD: 3,
  PRICE_CHANGE_LOW_THRESHOLD: 5,

  // Accuracy thresholds
  ACCURACY_HIGH_THRESHOLD: 40,
  ACCURACY_MEDIUM_THRESHOLD: 60,

  // Confidence change thresholds
  CONFIDENCE_CHANGE_HIGH_THRESHOLD: 0.2,
  CONFIDENCE_CHANGE_MEDIUM_THRESHOLD: 0.1,

  // Volume thresholds
  VOLUME_AVERAGE_PERIOD: 20,
  VOLUME_SPIKE_MULTIPLIER: 2,

  // Price comparison
  PRICE_EQUALS_TOLERANCE: 0.0001,

  // Alert history limits
  ALERT_HISTORY_DEFAULT_LIMIT: 100,
} as const;

/**
 * Alert manager configuration
 */
export const ALERT_MANAGER = {
  // Time windows
  DUPLICATE_WINDOW_MS: 300000, // 5 minutes
  AGGREGATE_TIME_WINDOW_MS: 300000, // 5 minutes
  ANALYSIS_PERIOD_MS: 86400000, // 24 hours

  // History limits
  MAX_HISTORY_SIZE: 1000,
  MAX_ALERT_HISTORY: 1000,

  // Severity mapping
  SEVERITY_SCORES: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  },
} as const;
