/**
 * API Middleware Index - Centralized exports
 * 
 * This file provides centralized access to all API middleware
 * and utilities to reduce import complexity.
 */

/**
 * API Middleware Index - Centralized exports
 * 
 * This file provides centralized access to all API middleware
 * and utilities to reduce import complexity.
 */

// Core middleware functions
export { checkRateLimit, withApiMiddleware, createApiHandler, ApiHandlerBuilder } from '../api-middleware';
export type { ApiHandler } from '../api-middleware';

// Authentication middleware
export { requireAuth } from '../auth';

// CSRF protection
export { 
  csrfTokenMiddleware, 
  requireCSRF, 
  generateCSRFToken, 
  validateCSRFToken 
} from '../csrf/csrf-protection';

// Error handling
export { 
  handleApiError, 
  validationError,
  rateLimitError 
} from '../error-handler';

// Validation utilities
export {
  // Basic validation
  validateRequiredString,
  validateNumber,
  validateBoolean,
  validateArray,
  validateObject,
  
  // Trading-specific validation
  validateSymbol,
  validateOrderSide,
  validateOrderType,
  validateMarketType,
  validateTradingAction,
  validateDataType,
  validateInterval,
  validateDate,
  validateOperator,
  
  // Configuration validation
  validateMode,
  validateRiskLimits,
  buildCleanConfig,
} from '../validation';

// IP-based rate limiting
export { ipRateLimiter, getClientIp } from '../ip-rate-limit';

// Re-export error types for backward compatibility
export {
  ApiError,
  NetworkError,
  RateLimitError,
} from '../errors';