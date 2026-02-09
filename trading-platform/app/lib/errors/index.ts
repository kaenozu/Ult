/**
 * 統一エラーハンドリング - ULT Trading Platform
 * 
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリングを提供します。
 * 
 * ## 使用方法
 * 
 * ### エラークラスの使用
 * ```typescript
 * import { AppError, NetworkError, ValidationError } from '@/app/lib/errors';
 * 
 * // カスタムエラーをスロー
 * throw new NetworkError('API接続に失敗しました', { endpoint: '/api/data' });
 * 
 * // バリデーションエラー
 * throw new ValidationError('email', '無効なメールアドレスです');
 * ```
 * 
 * ### エラーハンドリング
 * ```typescript
 * import { handleError, logError, getUserErrorMessage } from '@/app/lib/errors';
 * 
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const appError = handleError(error, 'fetchData');
 *   logError(appError, 'fetchData');
 *   const userMessage = getUserErrorMessage(appError);
 * }
 * ```
 * 
 * ### APIエラーレスポンス
 * ```typescript
 * import { handleApiError, validationError, notFoundError } from '@/app/lib/errors';
 * 
 * // APIルートで
 * try {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * } catch (error) {
 *   return handleApiError(error, 'fetchData');
 * }
 * 
 * // ショートカット関数
 * return validationError('入力値が無効です', 'field');
 * return notFoundError('データが見つかりません');
 * ```
 * 
 * ### Result型の使用
 * ```typescript
 * import { ok, err, tryCatchAsync, type Result } from '@/app/lib/errors';
 * 
 * async function fetchData(): Promise<Result<Data, AppError>> {
 *   try {
 *     const response = await fetch('/api/data');
 *     const data = await response.json();
 *     return ok(data);
 *   } catch (error) {
 *     return err(handleError(error));
 *   }
 * }
 * 
 * const result = await fetchData();
 * if (result.isOk) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 * 
 * @module lib/errors
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
  type ErrorSeverity,
  type ErrorCode,
  
  // Network
  NetworkError,
  ApiError,
  RateLimitError,
  TimeoutError,
  
  // Authentication
  AuthenticationError,
  AuthorizationError,
  
  // Validation
  ValidationError,
  InputError,
  
  // Data
  DataError,
  NotFoundError,
  DataNotAvailableError,
  
  // Trading
  OrderError,
  RiskManagementError,
  
  // System
  SystemError,
  ConfigurationError,
  
  // Type Guards
  isAppError,
  isNetworkError,
  isApiError,
  isValidationError,
  isNotFoundError,
  isAuthenticationError,
  isTradingError,
  isSystemError,
} from './AppError';

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
// Legacy Compatibility (from errors.ts)
// ============================================================================

/**
 * @deprecated Use AppError instead
 */
export { AppError as TradingError } from './AppError';

// Legacy error classes for backward compatibility
import { AppError as BaseAppError } from './AppError';

/**
 * @deprecated Use NetworkError instead
 */
export class ConnectionError extends BaseAppError {
  constructor(endpoint: string, message: string) {
    super(`Connection to ${endpoint} failed: ${message}`, 'NETWORK_ERROR', 'high');
    this.name = 'ConnectionError';
  }
}

/**
 * @deprecated Use TradingError instead
 */
export class StrategyError extends BaseAppError {
  constructor(strategyName: string, message: string) {
    super(`Strategy ${strategyName}: ${message}`, 'TRADING_ERROR', 'high');
    this.name = 'StrategyError';
  }
}

/**
 * @deprecated Use TradingError instead
 */
export class ExecutionError extends BaseAppError {
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
export class PositionLimitError extends BaseAppError {
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
export class DrawdownLimitError extends BaseAppError {
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
export class CapitalLimitError extends BaseAppError {
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
export class ResourceLimitError extends BaseAppError {
  constructor(resource: string) {
    super(`${resource} limit reached`, 'SYSTEM_ERROR', 'critical');
    this.name = 'ResourceLimitError';
  }
}

/**
 * @deprecated Use NotFoundError instead
 */
export class SymbolNotFoundError extends BaseAppError {
  constructor(symbol: string) {
    super(`銘柄「${symbol}」が見つかりません`, 'NOT_FOUND_ERROR', 'low', {
      context: { symbol },
    });
    this.name = 'SymbolNotFoundError';
  }
}
