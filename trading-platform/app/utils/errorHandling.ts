/**
 * Error Handling Utilities
 * 
 * Issue #528 - エラーハンドリング統一
 * 
 * このモジュールは、統一されたエラーハンドリング機能を提供します。
 * ログ記録、エラー変換、リカバリー処理などのユーティリティが含まれます。
 */

const isDev = process.env.NODE_ENV !== 'production';
const devLog = (...args: unknown[]) => { if (isDev) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (isDev) console.warn(...args); };
const devError = (...args: unknown[]) => { if (isDev) console.error(...args); };

import { 
  Result, 
  success, 
  fail, 
  ErrorCode,
  ErrorCodes,
  AppError,
  ApiError,
  NetworkError,
  ValidationError,
  DataNotFoundError,
  RateLimitError,
} from '../types/result';

/**
 * エラーログレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * エラーログエントリ
 */
export interface ErrorLogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  error?: Error;
  code?: ErrorCode;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * エラーロガーインターフェース
 */
export interface ErrorLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, error?: Error, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void;
}

/**
 * デフォルトのエラーロガー実装（コンソール出力）
 */
export class ConsoleErrorLogger implements ErrorLogger {
  private log(level: LogLevel, message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date(),
      level,
      message,
      error,
      context,
      stack: error?.stack,
    };

    const logMessage = `[${entry.timestamp.toISOString()}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'debug':
        devLog(logMessage, context || '');
        break;
      case 'info':
        devLog(logMessage, context || '');
        break;
      case 'warn':
        devWarn(logMessage, error?.message || '', context || '');
        break;
      case 'error':
      case 'fatal':
        devError(logMessage, error?.message || '', context || '', error?.stack || '');
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, undefined, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, undefined, context);
  }

  warn(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('warn', message, error, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, error, context);
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('fatal', message, error, context);
  }
}

/**
 * グローバルロガーインスタンス
 */
let globalLogger: ErrorLogger = new ConsoleErrorLogger();

/**
 * グローバルロガーを設定
 */
export function setGlobalLogger(logger: ErrorLogger): void {
  globalLogger = logger;
}

/**
 * グローバルロガーを取得
 */
export function getGlobalLogger(): ErrorLogger {
  return globalLogger;
}

/**
 * 未知のエラーをAppErrorに変換
 */
export function toAppError(error: unknown, defaultCode: ErrorCode = ErrorCodes.INTERNAL_ERROR): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, defaultCode, error);
  }
  
  return new AppError(String(error), defaultCode);
}

/**
 * エラーをResult型に変換
 */
export function errorToResult<T>(error: unknown, code?: ErrorCode): Result<T, AppError> {
  const appError = toAppError(error, code || ErrorCodes.INTERNAL_ERROR);
  return fail(appError, appError.code);
}

/**
 * Result型のエラーをログに記録
 */
export function logResultError<T, E extends Error>(
  result: Result<T, E>,
  context?: Record<string, unknown>,
  logger: ErrorLogger = globalLogger
): void {
  if (!result.success) {
    const error = result.error;
    const code = 'code' in result ? result.code : undefined;
    
    if (code === ErrorCodes.API_ERROR || code === ErrorCodes.NETWORK_ERROR) {
      logger.error(`API/Network Error: ${error.message}`, error, context);
    } else if (code === ErrorCodes.VALIDATION_ERROR) {
      logger.warn(`Validation Error: ${error.message}`, error, context);
    } else {
      logger.error(`Operation Failed: ${error.message}`, error, context);
    }
  }
}

/**
 * 関数をResult型でラップして実行
 */
export function tryCatch<T>(
  fn: () => T,
  errorCode?: ErrorCode,
  context?: Record<string, unknown>
): Result<T, AppError> {
  try {
    const result = fn();
    return success(result);
  } catch (error) {
    logResultError(errorToResult<T>(error, errorCode), context);
    return errorToResult<T>(error, errorCode);
  }
}

/**
 * 非同期関数をResult型でラップして実行
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  errorCode?: ErrorCode,
  context?: Record<string, unknown>
): Promise<Result<T, AppError>> {
  try {
    const result = await fn();
    return success(result);
  } catch (error) {
    logResultError(errorToResult<T>(error, errorCode), context);
    return errorToResult<T>(error, errorCode);
  }
}

/**
 * HTTPレスポンスからエラーを変換
 */
export function fromHttpResponse(response: Response, data?: Record<string, unknown>): ApiError {
  const status = response.status;
  
  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    return new RateLimitError(
      data?.message as string || 'Rate limit exceeded',
      retryAfter ? parseInt(retryAfter, 10) : undefined
    );
  }
  
  if (status >= 500) {
    return new ApiError(
      data?.message as string || `Server error: ${status}`,
      status,
      data,
      ErrorCodes.API_ERROR
    );
  }
  
  if (status >= 400) {
    return new ApiError(
      data?.message as string || `Client error: ${status}`,
      status,
      data,
      ErrorCodes.API_ERROR
    );
  }
  
  return new ApiError(`HTTP error: ${status}`, status, data, ErrorCodes.API_ERROR);
}

/**
 * フェッチエラーを処理
 */
export function handleFetchError(error: unknown, url?: string): AppError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError(`Failed to fetch ${url || 'resource'}: ${error.message}`);
  }
  
  return toAppError(error, ErrorCodes.NETWORK_ERROR);
}

/**
 * バリデーションエラーヘルパー
 */
export function validateNotNull<T>(
  value: T | null | undefined,
  fieldName: string,
  context?: Record<string, unknown>
): Result<T, ValidationError> {
  if (value === null || value === undefined) {
    const error = new ValidationError(`${fieldName} is required`, fieldName);
    globalLogger.warn(`Validation failed: ${fieldName} is null/undefined`, error, context);
    return fail(error, ErrorCodes.MISSING_REQUIRED_FIELD);
  }
  return success(value);
}

/**
 * 数値範囲バリデーション
 */
export function validateRange(
  value: number,
  fieldName: string,
  min: number,
  max: number,
  context?: Record<string, unknown>
): Result<number, ValidationError> {
  if (value < min || value > max) {
    const error = new ValidationError(
      `${fieldName} must be between ${min} and ${max}, got ${value}`,
      fieldName
    );
    globalLogger.warn(`Validation failed: ${fieldName} out of range`, error, context);
    return fail(error, ErrorCodes.VALIDATION_ERROR);
  }
  return success(value);
}

/**
 * 配列要素数バリデーション
 */
export function validateMinLength<T>(
  array: T[],
  fieldName: string,
  minLength: number,
  context?: Record<string, unknown>
): Result<T[], ValidationError> {
  if (array.length < minLength) {
    const error = new ValidationError(
      `${fieldName} must have at least ${minLength} elements, got ${array.length}`,
      fieldName
    );
    globalLogger.warn(`Validation failed: ${fieldName} insufficient length`, error, context);
    return fail(error, ErrorCodes.VALIDATION_ERROR);
  }
  return success(array);
}

/**
 * データ存在チェック
 */
export function ensureDataExists<T>(
  data: T | null | undefined,
  resource: string,
  identifier?: string,
  context?: Record<string, unknown>
): Result<T, DataNotFoundError> {
  if (data === null || data === undefined) {
    const error = new DataNotFoundError(
      `${resource} not found${identifier ? ` (id: ${identifier})` : ''}`,
      resource,
      identifier
    );
    globalLogger.warn(`Data not found: ${resource}`, error, context);
    return fail(error, ErrorCodes.DATA_NOT_FOUND);
  }
  return success(data);
}

/**
 * Result型の配列を単一Resultに集約
 * 全て成功の場合は成功結果（配列）、一つでも失敗なら最初の失敗を返す
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];
  
  for (const result of results) {
    if (!result.success) {
      return fail(result.error as E);
    }
    data.push(result.data);
  }
  
  return success(data);
}

/**
 * Result型の配列を単一Resultに集約（非同期版）
 */
export async function combineResultsAsync<T, E>(
  results: Promise<Result<T, E>>[]
): Promise<Result<T[], E>> {
  const data: T[] = [];
  
  for (const resultPromise of results) {
    const result = await resultPromise;
    if (!result.success) {
      return fail(result.error as E);
    }
    data.push(result.data);
  }
  
  return success(data);
}

/**
 * エラーハンドラーレジストリ
 */
export class ErrorHandlerRegistry {
  private handlers = new Map<ErrorCode, Array<(error: AppError) => void>>();
  
  /**
   * エラーハンドラーを登録
   */
  register(code: ErrorCode, handler: (error: AppError) => void): void {
    const existing = this.handlers.get(code) || [];
    existing.push(handler);
    this.handlers.set(code, existing);
  }
  
  /**
   * エラーを処理
   */
  handle(error: AppError): void {
    const handlers = this.handlers.get(error.code) || [];
    
    // コード固有のハンドラーを実行
    for (const handler of handlers) {
      try {
        handler(error);
      } catch (e) {
        globalLogger.error('Error handler failed', e instanceof Error ? e : new Error(String(e)));
      }
    }
    
    // 汎用ハンドラーも実行
    const genericHandlers = this.handlers.get(ErrorCodes.INTERNAL_ERROR) || [];
    for (const handler of genericHandlers) {
      try {
        handler(error);
      } catch (e) {
        globalLogger.error('Generic error handler failed', e instanceof Error ? e : new Error(String(e)));
      }
    }
  }
}

/**
 * グローバルエラーハンドラーレジストリ
 */
export const globalErrorHandler = new ErrorHandlerRegistry();
