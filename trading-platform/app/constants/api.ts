/**
 * API related constants
 */
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
} as const;
