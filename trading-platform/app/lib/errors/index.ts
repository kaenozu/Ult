/**
 * 統一エラーハンドリング - ULT Trading Platform
 * 
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリングを提供します。
 */

// ============================================================================
// Error Classes
// ============================================================================

export {
  // Base
  AppError,
  ErrorCodes,
  ErrorType,
  SEVERITY_LEVELS,
  isAppError,
  type ErrorSeverity,
  type ErrorCode,
} from './AppError';

export {
  // Network / API
  NetworkError,
  ApiError,
  RateLimitError,
  TimeoutError,
  isApiError,
  isNetworkError,
} from './ApiError';

export {
  // Authentication
  AuthenticationError,
  AuthorizationError,
  isAuthenticationError,
} from './AuthError';

export {
  // Validation
  ValidationError,
  InputError,
  isValidationError,
} from './ValidationError';

export {
  // Data
  DataError,
  NotFoundError,
  DataNotAvailableError,
  isNotFoundError,
} from './DataError';

export {
  // Trading
  TradingError,
  OrderError,
  RiskManagementError,
  isTradingError,
} from './TradingError';

export {
  // System
  SystemError,
  ConfigurationError,
  isSystemError,
} from './SystemError';

// ============================================================================
// Error Handlers
// ============================================================================

export {
  // Types
  type ErrorResponse,
  type ErrorContext,
  type ErrorRecovery,
  type ErrorHandlerConfig,
  
  // Error Messages
  USER_ERROR_MESSAGES,
  
  // Core Functions
  handleError,
  logError,
  reportError,
  
  // User Message Functions
  getUserErrorMessage,
  getUserErrorDetails,
  
  // Recovery Functions
  canRecover,
  getRecoveryInfo,
  
  // API Response Functions
  getHttpStatusCode,
  getErrorType,
  handleApiError,
  validationError,
  notFoundError,
  rateLimitError,
  authenticationError,
  internalError,
  
  // Utility Functions
  stringifyError,
  extractErrorInfo,
} from './handlers';

// ============================================================================
// Result Types
// ============================================================================

export {
  // Types
  type Result,
  type WithErrorHandlingResult,
  Ok,
  Err,
  
  // Factory Functions
  ok,
  err,
  
  // Type Guards
  isOk,
  isErr,
  
  // Utility Functions
  combineResults,
  tryCatch,
  tryCatchAsync,
  resultToPromise,
  promiseToResult,
  withErrorHandling,
  withErrorHandlingSync,
  withRetry,
} from './result';

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * @deprecated Use AppError instead
 */
export { AppError as TradingErrorBase } from './AppError';

import { AppError } from './AppError';

/**
 * @deprecated Use NetworkError instead
 */
export class ConnectionError extends AppError {
  constructor(endpoint: string, message: string) {
    super(`Connection to ${endpoint} failed: ${message}`, 'NETWORK_ERROR', 'high');
    this.name = 'ConnectionError';
  }
}

/**
 * @deprecated Use TradingError instead
 */
export class StrategyError extends AppError {
  constructor(strategyName: string, message: string) {
    super(`Strategy ${strategyName}: ${message}`, 'TRADING_ERROR', 'high');
    this.name = 'StrategyError';
  }
}

/**
 * @deprecated Use TradingError instead
 */
export class ExecutionError extends AppError {
  readonly orderId?: string;
  readonly symbol?: string;
  readonly reason?: string;
  
  constructor(orderId?: string, symbol?: string, reason?: string) {
    super(`Execution ${orderId}: ${reason || 'Unknown error'}`, 'TRADING_ERROR', 'high', {
      context: { orderId, symbol, reason },
    });
    this.orderId = orderId;
    this.symbol = symbol;
    this.reason = reason;
    this.name = 'ExecutionError';
  }
}

/**
 * @deprecated Use RiskManagementError instead
 */
export class PositionLimitError extends AppError {
  constructor(symbol: string, currentSize: number, limit: number) {
    super(`Position size ${currentSize} exceeds limit ${limit}`, 'RISK_MANAGEMENT_ERROR', 'critical', {
      context: { symbol, currentSize, limit },
    });
    this.name = 'PositionLimitError';
  }
}

/**
 * @deprecated Use RiskManagementError instead
 */
export class DrawdownLimitError extends AppError {
  constructor(currentDrawdown: number, limit: number) {
    super(`Drawdown ${currentDrawdown} exceeds limit ${limit}`, 'RISK_MANAGEMENT_ERROR', 'critical', {
      context: { currentDrawdown, limit },
    });
    this.name = 'DrawdownLimitError';
  }
}

/**
 * @deprecated Use RiskManagementError instead
 */
export class CapitalLimitError extends AppError {
  constructor(availableCapital: number, requiredCapital: number) {
    super(`Available capital ${availableCapital} < required ${requiredCapital}`, 'RISK_MANAGEMENT_ERROR', 'critical', {
      context: { availableCapital, requiredCapital },
    });
    this.name = 'CapitalLimitError';
  }
}

/**
 * @deprecated Use SystemError instead
 */
export class ResourceLimitError extends AppError {
  constructor(resource: string) {
    super(`${resource} limit reached`, 'SYSTEM_ERROR', 'critical');
    this.name = 'ResourceLimitError';
  }
}

/**
 * @deprecated Use NotFoundError instead
 */
export class SymbolNotFoundError extends AppError {
  constructor(symbol: string) {
    super(`銘柄「${symbol}」が見つかりません`, 'NOT_FOUND_ERROR', 'low', {
      context: { symbol },
    });
    this.name = 'SymbolNotFoundError';
  }
}
