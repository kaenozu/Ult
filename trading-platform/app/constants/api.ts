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
 * General API Configuration
 */
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
} as const;
