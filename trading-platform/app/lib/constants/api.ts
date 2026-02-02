/**
 * API Configuration Constants
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
 * Data quality requirements
 */
export const DATA_QUALITY = {
  MIN_DATA_LENGTH: 20,
  MIN_PRICE_THRESHOLD: 0.0001,
  MAX_GAP_DAYS: 7,
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
} as const;
