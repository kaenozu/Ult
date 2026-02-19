/**
 * Result Type for Unified Error Handling
 * 
 * Issue #528 - エラーハンドリング統一
 * 
 * このモジュールは、関数の実行結果を型安全に表現するためのResult型を提供します。
 * 成功時はデータを、失敗時はエラーを含む構造体を返すことで、
 * エラーハンドリングを強制的に行うよう設計されています。
 */


/**
 * 成功結果を表す型
 */
import { devLog, devError } from '@/app/lib/utils/dev-logger';
export interface SuccessResult<T> {
  readonly success: true;
  readonly data: T;
  readonly error?: never;
}

/**
 * 失敗結果を表す型
 */
export interface FailureResult<E = Error> {
  readonly success: false;
  readonly data?: never;
  readonly error: E;
  readonly code?: string;
}

/**
 * Result型 - 成功または失敗のEitherを表現
 * 
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, DivisionError> {
 *   if (b === 0) {
 *     return fail(new DivisionError('Cannot divide by zero'));
 *   }
 *   return success(a / b);
 * }
 * 
 * const result = divide(10, 2);
 * if (result.success) {
 *   devLog(result.data); // 5
 * } else {
 *   devError(result.error.message);
 * }
 * ```
 */
export type Result<T, E = Error> = SuccessResult<T> | FailureResult<E>;

/**
 * 成功結果を生成するヘルパー関数
 */
export function success<T>(data: T): SuccessResult<T> {
  return { success: true, data };
}

/**
 * 失敗結果を生成するヘルパー関数
 */
export function fail<E = Error>(error: E, code?: string): FailureResult<E> {
  return { success: false, error, code };
}

/**
 * Result型のユーティリティ関数
 */
export const Result = {
  /**
   * 成功結果を生成
   */
  success,
  
  /**
   * 失敗結果を生成
   */
  fail,
  
  /**
   * Resultが成功かどうかを判定
   */
  isSuccess<T, E>(result: Result<T, E>): result is SuccessResult<T> {
    return result.success === true;
  },
  
  /**
   * Resultが失敗かどうかを判定
   */
  isFailure<T, E>(result: Result<T, E>): result is FailureResult<E> {
    return result.success === false;
  },
  
  /**
   * Resultをmap変換
   * 成功時は変換関数を適用、失敗時はそのまま返す
   */
  map<T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => U
  ): Result<U, E> {
    if (result.success) {
      return success(fn(result.data));
    }
    return result as Result<U, E>;
  },
  
  /**
   * ResultをflatMap変換
   * 成功時は変換関数（Result返却）を適用、失敗時はそのまま返す
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>
  ): Result<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result as Result<U, E>;
  },
  
  /**
   * Resultからデータを取得（失敗時はデフォルト値を返す）
   */
  getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.success ? result.data : defaultValue;
  },
  
  /**
   * ResultをPromiseに変換
   * 成功時はresolve、失敗時はreject
   */
  toPromise<T, E extends Error>(result: Result<T, E>): Promise<T> {
    return result.success 
      ? Promise.resolve(result.data)
      : Promise.reject(result.error);
  },
  
  /**
   * PromiseをResultに変換
   */
  async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const data = await promise;
      return success(data);
    } catch (error) {
      return fail(error instanceof Error ? error : new Error(String(error)));
    }
  },
};

/**
 * エラーコード定数
 */
export const ErrorCodes = {
  // バリデーションエラー
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // APIエラー
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  
  // データエラー
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_PARSE_ERROR: 'DATA_PARSE_ERROR',
  DATA_VALIDATION_ERROR: 'DATA_VALIDATION_ERROR',
  
  // 計算エラー
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  
  // システムエラー
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
} as const;

/**
 * エラーコード型
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * アプリケーション固有のエラー型
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly cause?: Error;
  
  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  
  constructor(message: string, field?: string) {
    super(message, ErrorCodes.VALIDATION_ERROR);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * APIエラー
 */
export class ApiError extends AppError {
  public readonly statusCode?: number;
  public readonly response?: Record<string, unknown>;
  
  constructor(
    message: string, 
    statusCode?: number,
    response?: Record<string, unknown>,
    code: ErrorCode = ErrorCodes.API_ERROR
  ) {
    super(message, code);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends ApiError {
  constructor(message: string = 'Network error occurred') {
    super(message, 0, undefined, ErrorCodes.NETWORK_ERROR);
    this.name = 'NetworkError';
  }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;
  
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, undefined, ErrorCodes.RATE_LIMIT_ERROR);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * データが見つからないエラー
 */
export class DataNotFoundError extends AppError {
  public readonly resource?: string;
  public readonly identifier?: string;
  
  constructor(message: string = 'Data not found', resource?: string, identifier?: string) {
    super(message, ErrorCodes.DATA_NOT_FOUND);
    this.name = 'DataNotFoundError';
    this.resource = resource;
    this.identifier = identifier;
  }
}
