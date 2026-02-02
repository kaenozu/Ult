/**
 * Trading Platform Unified Error Handling
 * 
 * このモジュールは、アプリケーション全体で統一されたエラーハンドリングを提供します。
 * - 標準化されたエラークラス
 * - エラーロギングユーティリティ
 * - ユーザー向けエラーメッセージ生成
 * - エラーハンドリングラッパー
 */

// ============================================================================
// Error Severity Levels
// ============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * 全てのカスタムエラーの基底クラス
 */
export class TradingError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  
  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    severity: ErrorSeverity = 'medium'
  ) {
    super(message);
    this.code = code;
    this.severity = severity;
    this.name = 'TradingError';
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, TradingError.prototype);
  }
}

/**
 * アプリケーション汎用エラー
 */
export class AppError extends TradingError {
  constructor(
    message: string,
    code: string = 'APP_ERROR',
    severity: ErrorSeverity = 'medium'
  ) {
    super(message, code, severity);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ============================================================================
// API Errors
// ============================================================================

/**
 * API関連エラー
 */
export class ApiError extends TradingError {
  readonly endpoint?: string;
  readonly statusCode?: number;
  readonly response?: unknown;
  
  constructor(
    message: string,
    endpoint?: string,
    statusCode?: number,
    response?: unknown
  ) {
    const code = statusCode === 404 ? 'NOT_FOUND_ERROR' :
      statusCode === 429 ? 'RATE_LIMIT_ERROR' :
      statusCode === 401 || statusCode === 403 ? 'AUTHENTICATION_ERROR' :
      'API_ERROR';
    const severity: ErrorSeverity = statusCode && statusCode >= 500 ? 'high' : 'medium';
    
    super(message, code, severity);
    this.endpoint = endpoint;
    this.statusCode = statusCode;
    this.response = response;
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends TradingError {
  readonly endpoint?: string;
  readonly statusCode?: number;
  readonly response?: unknown;
  readonly originalError?: unknown;
  
  constructor(
    message: string = 'ネットワークエラーが発生しました',
    originalError?: unknown
  ) {
    super(message, 'NETWORK_ERROR', 'high');
    this.originalError = originalError;
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends TradingError {
  readonly endpoint?: string;
  readonly statusCode: number;
  readonly response?: unknown;
  readonly retryAfter?: number;
  
  constructor(
    message: string = 'リクエスト回数の上限を超えました',
    retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', 'medium');
    this.statusCode = 429;
    this.retryAfter = retryAfter;
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends TradingError {
  constructor(
    message: string = '認証に失敗しました'
  ) {
    super(message, 'AUTHENTICATION_ERROR', 'high');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * バリデーションエラー
 */
export class ValidationError extends TradingError {
  readonly field: string;
  
  constructor(
    field: string,
    message: string,
    severity: ErrorSeverity = 'low'
  ) {
    super(`Validation error for ${field}: ${message}`, 'VALIDATION_ERROR', severity);
    this.field = field;
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 入力値エラー
 */
export class InputError extends TradingError {
  readonly field: string;
  
  constructor(
    field: string,
    message: string
  ) {
    super(`Validation error for ${field}: ${message}`, 'INPUT_ERROR', 'low');
    this.field = field;
    this.name = 'InputError';
    Object.setPrototypeOf(this, InputError.prototype);
  }
}

// ============================================================================
// Data Errors
// ============================================================================

/**
 * データ関連エラー
 */
export class DataError extends TradingError {
  readonly symbol?: string;
  readonly dataType?: string;
  
  constructor(
    message: string,
    symbol?: string,
    dataType?: string
  ) {
    super(message, 'DATA_ERROR', 'medium');
    this.symbol = symbol;
    this.dataType = dataType;
    this.name = 'DataError';
    Object.setPrototypeOf(this, DataError.prototype);
  }
}

/**
 * シンボル未検出エラー
 */
export class NotFoundError extends TradingError {
  readonly symbol?: string;
  readonly dataType?: string;
  readonly resourceType: string;
  
  constructor(
    resource: string,
    resourceType: string = 'symbol'
  ) {
    super(
      `${resourceType === 'symbol' ? '銘柄' : 'リソース'}「${resource}」が見つかりません`,
      'NOT_FOUND_ERROR',
      'low'
    );
    this.symbol = resource;
    this.dataType = resourceType;
    this.resourceType = resourceType;
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * データ利用不可エラー
 */
export class DataNotAvailableError extends TradingError {
  readonly symbol?: string;
  readonly dataType?: string;
  
  constructor(
    symbol?: string,
    dataType?: string
  ) {
    super(
      symbol 
        ? `${symbol}のデータが利用できません`
        : 'データが利用できません',
      'DATA_NOT_AVAILABLE',
      'medium'
    );
    this.symbol = symbol;
    this.dataType = dataType;
    this.name = 'DataNotAvailableError';
    Object.setPrototypeOf(this, DataNotAvailableError.prototype);
  }
}

// ============================================================================
// Trading Errors
// ============================================================================

/**
 * 取引関連エラー
 */
export class TradingOperationError extends TradingError {
  readonly symbol?: string;
  readonly orderId?: string;
  
  constructor(
    message: string,
    symbol?: string,
    orderId?: string
  ) {
    super(message, 'TRADING_ERROR', 'high');
    this.symbol = symbol;
    this.orderId = orderId;
    this.name = 'TradingOperationError';
    Object.setPrototypeOf(this, TradingOperationError.prototype);
  }
}

/**
 * 注文エラー
 */
export class OrderError extends TradingError {
  readonly symbol?: string;
  readonly orderId?: string;
  readonly reason?: string;
  
  constructor(
    message: string,
    symbol?: string,
    orderId?: string,
    reason?: string
  ) {
    super(`Order error: ${message}`, 'ORDER_ERROR', 'high');
    this.symbol = symbol;
    this.orderId = orderId;
    this.reason = reason;
    this.name = 'OrderError';
    Object.setPrototypeOf(this, OrderError.prototype);
  }
}

/**
 * リスク管理エラー
 */
export class RiskManagementError extends TradingError {
  readonly symbol?: string;
  readonly reason?: string;
  
  constructor(
    message: string,
    symbol?: string,
    reason?: string
  ) {
    super(`Risk management: ${message}`, 'RISK_MANAGEMENT_ERROR', 'critical');
    this.symbol = symbol;
    this.reason = reason;
    this.name = 'RiskManagementError';
    Object.setPrototypeOf(this, RiskManagementError.prototype);
  }
}

// ============================================================================
// System Errors
// ============================================================================

/**
 * システムエラー
 */
export class SystemError extends TradingError {
  readonly operation?: string;
  
  constructor(
    message: string,
    operation?: string
  ) {
    super(message, 'SYSTEM_ERROR', 'critical');
    this.operation = operation;
    this.name = 'SystemError';
    Object.setPrototypeOf(this, SystemError.prototype);
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends TradingError {
  readonly operation?: string;
  readonly timeoutMs: number;
  
  constructor(
    operation: string,
    timeoutMs: number
  ) {
    super(`${operation}がタイムアウトしました（${timeoutMs}ms）`, 'TIMEOUT_ERROR', 'high');
    this.operation = operation;
    this.timeoutMs = timeoutMs;
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * 設定エラー
 */
export class ConfigurationError extends TradingError {
  readonly configKey: string;
  
  constructor(
    configKey: string,
    message: string
  ) {
    super(`Configuration error [${configKey}]: ${message}`, 'CONFIGURATION_ERROR', 'high');
    this.configKey = configKey;
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

// ============================================================================
// Legacy Compatibility Exports
// ============================================================================

/** @deprecated Use ApiError instead */
export { ApiError as APIError };

/** @deprecated Use NetworkError instead */
export class ConnectionError extends NetworkError {
  constructor(endpoint: string, message: string) {
    super(`Connection to ${endpoint} failed: ${message}`);
    this.name = 'ConnectionError';
  }
}

/** @deprecated Use TradingOperationError instead */
export class StrategyError extends TradingOperationError {
  constructor(strategyName: string, message: string) {
    super(`Strategy ${strategyName}: ${message}`);
    this.name = 'StrategyError';
  }
}

/** @deprecated Use TradingOperationError instead */
export class ExecutionError extends TradingError {
  readonly symbol?: string;
  readonly orderId?: string;
  readonly reason?: string;
  
  constructor(orderId?: string, symbol?: string, reason?: string) {
    super(`Execution ${orderId}: ${reason || 'Unknown error'}`, 'EXECUTION_ERROR', 'high');
    this.orderId = orderId;
    this.symbol = symbol;
    this.reason = reason;
    this.name = 'ExecutionError';
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
}

/** @deprecated Use RiskManagementError instead */
export class PositionLimitError extends RiskManagementError {
  constructor(symbol: string, currentSize: number, limit: number) {
    super(`Position size ${currentSize} exceeds limit ${limit}`, symbol);
    this.name = 'PositionLimitError';
  }
}

/** @deprecated Use RiskManagementError instead */
export class DrawdownLimitError extends RiskManagementError {
  constructor(currentDrawdown: number, limit: number) {
    super(`Drawdown ${currentDrawdown} exceeds limit ${limit}`);
    this.name = 'DrawdownLimitError';
  }
}

/** @deprecated Use RiskManagementError instead */
export class CapitalLimitError extends RiskManagementError {
  constructor(availableCapital: number, requiredCapital: number) {
    super(`Available capital ${availableCapital} < required ${requiredCapital}`);
    this.name = 'CapitalLimitError';
  }
}

/** @deprecated Use SystemError instead */
export class ResourceLimitError extends SystemError {
  constructor(resource: string) {
    super(`${resource} limit reached`);
    this.name = 'ResourceLimitError';
  }
}

/** @deprecated Use NotFoundError instead */
export class SymbolNotFoundError extends NotFoundError {
  constructor(symbol: string) {
    super(symbol, 'symbol');
    this.name = 'SymbolNotFoundError';
  }
}

// ============================================================================
// Error Context Types
// ============================================================================

export type ErrorContext = {
  timestamp: number;
  operation: string;
  symbol?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

export type ErrorRecovery = {
  canRecover: boolean;
  recoveryAction: string;
  retryDelay?: number;
  retryCount?: number;
  fatal: boolean;
};

export type ErrorHandler = {
  handleError: (error: TradingError, context?: ErrorContext) => ErrorRecovery;
  reportError: (error: TradingError, context?: ErrorContext) => Promise<void>;
  canRecover: (error: TradingError) => boolean;
};

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * エラーをTradingErrorにラップする
 */
export function handleError(error: unknown, context?: string): TradingError {
  if (error instanceof TradingError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      context ? `[${context}] ${error.message}` : error.message,
      'UNKNOWN_ERROR',
      'medium'
    );
  }
  
  if (typeof error === 'string') {
    return new AppError(
      context ? `[${context}] ${error}` : error,
      'UNKNOWN_ERROR',
      'medium'
    );
  }
  
  return new AppError(
    context ? `[${context}] Unknown error occurred` : 'Unknown error occurred',
    'UNKNOWN_ERROR',
    'medium'
  );
}

/**
 * エラーをログに出力する
 */
export function logError(error: unknown, context: string): void {
  const timestamp = new Date().toISOString();
  
  if (error instanceof TradingError) {
    console.error(`[${timestamp}] [${context}] ${error.name}:`, {
      code: error.code,
      severity: error.severity,
      message: error.message,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] [${context}] ${error.name}:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(`[${timestamp}] [${context}] Unknown error:`, error);
  }
}

/**
 * ユーザー向けエラーメッセージを取得する
 */
export function getUserErrorMessage(error: unknown): string {
  // 既にTradingErrorの場合
  if (error instanceof TradingError) {
    // バリデーションエラーはそのまま表示
    if (error instanceof ValidationError) {
      return error.message;
    }
    
    // APIエラーはステータスコードに応じたメッセージ
    if (error instanceof ApiError) {
      if (error.statusCode === 404) {
        return 'データが見つかりませんでした';
      }
      if (error.statusCode === 429) {
        return 'リクエストが多すぎます。しばらく待ってからお試しください';
      }
      if (error.statusCode === 401 || error.statusCode === 403) {
        return '認証に失敗しました。再度ログインしてください';
      }
      if (error.statusCode && error.statusCode >= 500) {
        return 'サーバーエラーが発生しました。しばらく待ってからお試しください';
      }
    }
    
    // ネットワークエラー
    if (error instanceof NetworkError) {
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください';
    }
    
    // データエラー
    if (error instanceof DataError) {
      if (error instanceof NotFoundError) {
        return error.message;
      }
      return 'データの取得に失敗しました';
    }
    
    // 認証エラー
    if (error instanceof AuthenticationError) {
      return error.message;
    }
    
    // レート制限
    if (error instanceof RateLimitError) {
      return 'リクエストが多すぎます。しばらく待ってからお試しください';
    }
    
    // タイムアウト
    if (error instanceof TimeoutError) {
      return '処理がタイムアウトしました。もう一度お試しください';
    }
    
    // その他のエラーは汎用メッセージ
    return 'エラーが発生しました。もう一度お試しください';
  }
  
  // 標準Errorの場合
  if (error instanceof Error) {
    // ネットワーク関連のエラーを検出
    if (error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('connection')) {
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください';
    }
    
    // タイムアウト関連
    if (error.message.toLowerCase().includes('timeout')) {
      return '処理がタイムアウトしました。もう一度お試しください';
    }
    
    return 'エラーが発生しました。もう一度お試しください';
  }
  
  return 'エラーが発生しました。もう一度お試しください';
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result型 - 成功 (Ok) または失敗 (Err) を表現する型
 * 
 * エラーハンドリングを型安全に行うためのパターン実装。
 * throw/catchの代わりにResult型を使うことで、エラー処理を明示的にする。
 * 
 * @template T 成功時の値の型
 * @template E エラーの型（デフォルト: TradingError）
 * 
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, Error> {
 *   if (b === 0) {
 *     return err(new Error('Division by zero'));
 *   }
 *   return ok(a / b);
 * }
 * 
 * const result = divide(10, 2);
 * if (result.isOk) {
 *   console.log('Result:', result.value);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export type Result<T, E = TradingError> = Ok<T, E> | Err<T, E>;

/**
 * 成功結果を表すクラス
 */
export class Ok<T, E = TradingError> {
  readonly isOk = true as const;
  readonly isErr = false as const;
  
  constructor(readonly value: T) {}
  
  /**
   * 値をマップする
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return ok(fn(this.value));
  }
  
  /**
   * 値をマップして新しいResultを返す
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }
  
  /**
   * エラーをマップする（成功時は何もしない）
   */
  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return ok(this.value);
  }
  
  /**
   * 値を取得する（成功時のみ）
   */
  unwrap(): T {
    return this.value;
  }
  
  /**
   * 値を取得する、失敗時はデフォルト値を返す
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }
  
  /**
   * 値を取得する、失敗時はエラーをthrowする
   */
  unwrapOrThrow(): T {
    return this.value;
  }
}

/**
 * 失敗結果を表すクラス
 */
export class Err<T, E = TradingError> {
  readonly isOk = false as const;
  readonly isErr = true as const;
  
  constructor(readonly error: E) {}
  
  /**
   * 値をマップする（失敗時は何もしない）
   */
  map<U>(_fn: (value: T) => U): Result<U, E> {
    return err(this.error);
  }
  
  /**
   * 値をマップして新しいResultを返す（失敗時は何もしない）
   */
  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return err(this.error);
  }
  
  /**
   * エラーをマップする
   */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return err(fn(this.error));
  }
  
  /**
   * 値を取得する（失敗時はエラーをthrowする）
   */
  unwrap(): T {
    throw this.error;
  }
  
  /**
   * 値を取得する、失敗時はデフォルト値を返す
   */
  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }
  
  /**
   * 値を取得する、失敗時はエラーをthrowする
   */
  unwrapOrThrow(): never {
    throw this.error;
  }
}

/**
 * 成功結果を作成する
 */
export function ok<T, E = TradingError>(value: T): Result<T, E> {
  return new Ok(value);
}

/**
 * 失敗結果を作成する
 */
export function err<T, E = TradingError>(error: E): Result<T, E> {
  return new Err(error);
}

/**
 * 結果が成功かどうかを判定する型ガード
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T, E> {
  return result.isOk;
}

/**
 * 結果が失敗かどうかを判定する型ガード
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<T, E> {
  return result.isErr;
}

/**
 * 複数のResultをまとめる
 * すべて成功していれば配列を返し、1つでも失敗していれば最初のエラーを返す
 */
export function combineResults<T, E = TradingError>(
  results: Result<T, E>[]
): Result<T[], E> {
  const values: T[] = [];
  
  for (const result of results) {
    if (result.isErr) {
      return result;
    }
    values.push(result.value);
  }
  
  return ok(values);
}

/**
 * try-catchをResultに変換する
 */
export function tryCatch<T, E = TradingError>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
}

/**
 * 非同期のtry-catchをResultに変換する
 */
export async function tryCatchAsync<T, E = TradingError>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(onError(error));
  }
}

export interface WithErrorHandlingResult<T> {
  data: T | null;
  error: TradingError | null;
  success: boolean;
}

/**
 * 関数実行をエラーハンドリングでラップする
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<WithErrorHandlingResult<T>> {
  try {
    const data = await fn();
    return { data, error: null, success: true };
  } catch (err) {
    const error = handleError(err, context);
    logError(error, context || 'withErrorHandling');
    return { data: null, error, success: false };
  }
}

/**
 * 同期関数実行をエラーハンドリングでラップする
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context?: string
): WithErrorHandlingResult<T> {
  try {
    const data = fn();
    return { data, error: null, success: true };
  } catch (err) {
    const error = handleError(err, context);
    logError(error, context || 'withErrorHandlingSync');
    return { data: null, error, success: false };
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * TradingErrorの型ガード
 */
export function isTradingError(error: unknown): error is TradingError {
  return error instanceof TradingError;
}

/**
 * ApiErrorの型ガード
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * NetworkErrorの型ガード
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * ValidationErrorの型ガード
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * NotFoundErrorの型ガード
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}
