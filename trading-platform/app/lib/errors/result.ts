/**
 * Result型 - ULT Trading Platform
 * 
 * エラーハンドリングを型安全に行うためのResult型パターン実装。
 * throw/catchの代わりにResult型を使うことで、エラー処理を明示的にする。
 * 
 * @module lib/errors/result
 */

import { AppError, ErrorCodes } from './AppError';
import { handleError } from './handlers';

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result型 - 成功 (Ok) または失敗 (Err) を表現する型
 * 
 * @template T 成功時の値の型
 * @template E エラーの型（デフォルト: AppError）
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
export type Result<T, E = AppError> = Ok<T, E> | Err<T, E>;

/**
 * 成功結果を表すクラス
 */
export class Ok<T, E = AppError> {
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
    return ok<T, F>(this.value);
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
  
  /**
   * 結果をパターンマッチングで処理
   */
  match<U>(options: { ok: (value: T) => U; err: (error: E) => U }): U {
    return options.ok(this.value);
  }
}

/**
 * 失敗結果を表すクラス
 */
export class Err<T, E = AppError> {
  readonly isOk = false as const;
  readonly isErr = true as const;
  
  constructor(readonly error: E) {}
  
  /**
   * 値をマップする（失敗時は何もしない）
   */
  map<U>(_fn: (value: T) => U): Result<U, E> {
    return err<U, E>(this.error);
  }
  
  /**
   * 値をマップして新しいResultを返す（失敗時は何もしない）
   */
  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return err<U, E>(this.error);
  }
  
  /**
   * エラーをマップする
   */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return err<T, F>(fn(this.error));
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
  
  /**
   * 結果をパターンマッチングで処理
   */
  match<U>(options: { ok: (value: T) => U; err: (error: E) => U }): U {
    return options.err(this.error);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 成功結果を作成する
 */
export function ok<T, E = AppError>(value: T): Result<T, E> {
  return new Ok(value);
}

/**
 * 失敗結果を作成する
 */
export function err<T, E = AppError>(error: E): Result<T, E> {
  return new Err(error);
}

// ============================================================================
// Type Guards
// ============================================================================

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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 複数のResultをまとめる
 * すべて成功していれば配列を返し、1つでも失敗していれば最初のエラーを返す
 */
export function combineResults<T, E = AppError>(
  results: Result<T, E>[]
): Result<T[], E> {
  const values: T[] = [];
  
  for (const result of results) {
    if (result.isErr) {
      return err<T[], E>(result.error);
    }
    values.push(result.value);
  }
  
  return ok(values);
}

/**
 * try-catchをResultに変換する
 */
export function tryCatch<T, E = AppError>(
  fn: () => T,
  onError?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    if (onError) {
      return err(onError(error));
    }
    // デフォルトではAppErrorに変換
    return err(handleError(error) as unknown as E);
  }
}

/**
 * 非同期のtry-catchをResultに変換する
 */
export async function tryCatchAsync<T, E = AppError>(
  fn: () => Promise<T>,
  onError?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    if (onError) {
      return err(onError(error));
    }
    // デフォルトではAppErrorに変換
    return err(handleError(error) as unknown as E);
  }
}

/**
 * ResultをPromiseに変換する
 */
export function resultToPromise<T, E>(result: Result<T, E>): Promise<T> {
  if (result.isOk) {
    return Promise.resolve(result.value);
  }
  return Promise.reject(result.error);
}

/**
 * PromiseをResultに変換する
 */
export async function promiseToResult<T>(promise: Promise<T>): Promise<Result<T, AppError>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(handleError(error));
  }
}

// ============================================================================
// WithErrorHandling Types
// ============================================================================

/**
 * エラーハンドリング付き実行結果
 */
export interface WithErrorHandlingResult<T> {
  data: T | null;
  error: AppError | null;
  success: boolean;
}

/**
 * 関数実行をエラーハンドリングでラップする（非同期版）
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
    return { data: null, error, success: false };
  }
}

/**
 * 関数実行をエラーハンドリングでラップする（同期版）
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
    return { data: null, error, success: false };
  }
}

/**
 * リトライ付き実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delay?: number;
    backoff?: 'fixed' | 'exponential';
    context?: string;
  }
): Promise<WithErrorHandlingResult<T>> {
  const maxRetries = options?.maxRetries ?? 3;
  const delay = options?.delay ?? 1000;
  const backoff = options?.backoff ?? 'exponential';
  
  let lastError: AppError | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await fn();
      return { data, error: null, success: true };
    } catch (err) {
      lastError = handleError(err, options?.context);
      
      // 最後の試行でなければ待機
      if (attempt < maxRetries - 1) {
        const waitTime = backoff === 'exponential' 
          ? delay * Math.pow(2, attempt) 
          : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  return { data: null, error: lastError, success: false };
}
