/**
 * 型ガード関数
 * 
 * any型の使用を回避するための型安全なユーティリティ関数群
 */

// ============================================================================
// 基本型ガード
// ============================================================================

/**
 * 値がnullまたはundefinedでないことを保証する
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * 値がstringであることを保証する
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 値がnumberであることを保証する
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 値がbooleanであることを保証する
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 値が配列であることを保証する
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 値がオブジェクトであることを保証する（nullと配列を除く）
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 値が関数であることを保証する
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

// ============================================================================
// 型アサーション（開発時のみ）
// ============================================================================

/**
 * 型アサーション関数（開発時のみ有効）
 * 実行時に型をチェックし、条件を満たさない場合エラーを投げる
 */
export function assertType<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  message?: string
): T {
  if (guard(value)) {
    return value;
  }
  throw new Error(message || `Type assertion failed: value does not match expected type`);
}

/**
 * 値がnullまたはundefinedでないことをアサートする
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message?: string
): T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value cannot be null or undefined');
  }
  return value;
}

// ============================================================================
// 型安全なプロパティアクセス
// ============================================================================

/**
 * オブジェクトから安全にプロパティを取得する
 * プロパティが存在しない場合はdefaultValueを返す
 */
export function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  defaultValue?: T[K]
): T[K] {
  if (key in obj) {
    return obj[key];
  }
  return defaultValue as T[K];
}

/**
 * オブジェクトから安全にネストしたプロパティを取得する
 */
export function getNestedProperty<T extends object>(
  obj: T,
  path: string[],
  defaultValue?: unknown
): unknown {
  let current: unknown = obj;
  
  for (const key of path) {
    if (isObject(current) && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }
  
  return current;
}
