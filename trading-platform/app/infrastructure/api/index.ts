/**
 * Unified API Utilities - Index
 * 
 * Centralized exports for all API-related utilities to simplify imports
 * and maintain consistency across the application.
 */

// Cache Management
export { CacheManager, createCacheManager } from './CacheManager';
export type { CacheEntry, CacheOptions } from './CacheManager';

// Validation
export {
  validateField,
  validateFields,
  validateSymbol,
  validateBatchSymbols,
  validateDate,
  validateInterval,
  validateMarket,
  validateQueryType,
  validatePositiveNumber,
  validateSide,
  validateNonEmptyString,
  VALID_INTERVALS,
  VALID_MARKETS,
  VALID_SIDES,
} from './ApiValidator';
export type {
  ValidationRule,
  ValidInterval,
  ValidMarket,
  ValidSide,
} from './ApiValidator';

// Unified API Client
export {
  createApiHandler,
  createGetHandler,
  createPostHandler,
  getQueryParams,
  getQueryParam,
  parseJsonBody,
  successResponse,
  generateCacheKey,
} from './UnifiedApiClient';
export type {
  ApiHandlerOptions,
  ApiResponse,
} from './UnifiedApiClient';
