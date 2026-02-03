/**
 * メモ化ユーティリティ
 * 
 * 計算コストの高い純粋関数をメモ化してパフォーマンスを向上させる。
 */

/**
 * メモ化キャッシュの設定
 */
export interface MemoizeOptions {
  /** キャッシュの最大サイズ（デフォルト: 100） */
  maxSize?: number;
  /** キャッシュのTTL（ミリ秒、デフォルト: なし） */
  ttl?: number;
}

/**
 * キャッシュエントリ
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * キャッシュキー生成戦略
 */
 
export type KeyGenerator<TArgs extends any[]> = (...args: TArgs) => string;

/**
 * デフォルトのキー生成関数（JSON.stringify）
 */
 
const defaultKeyGenerator: KeyGenerator<any[]> = (...args: any[]): string => {
  return JSON.stringify(args);
};

/**
 * 関数をメモ化する
 * 
 * @param fn - メモ化する関数
 * @param options - メモ化オプション
 * @param keyGenerator - カスタムキー生成関数
 * @returns メモ化された関数
 * 
 * @example
 * ```typescript
 * const expensiveCalculation = memoize(
 *   (a: number, b: number) => a * b,
 *   { maxSize: 50 }
 * );
 * ```
 */
 
export function memoize<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: MemoizeOptions = {},
  keyGenerator: KeyGenerator<TArgs> = defaultKeyGenerator
): (...args: TArgs) => TResult {
  const { maxSize = 100, ttl } = options;
  const cache = new Map<string, CacheEntry<TResult>>();

  return (...args: TArgs): TResult => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    // キャッシュヒット時の処理
    if (cached) {
      // TTLチェック
      if (ttl && Date.now() - cached.timestamp > ttl) {
        cache.delete(key);
      } else {
        return cached.value;
      }
    }

    // キャッシュミス時: 計算して保存
    const result = fn(...args);
    
    // キャッシュサイズの制限チェック
    if (cache.size >= maxSize) {
      // 最も古いエントリを削除（FIFO）
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, {
      value: result,
      timestamp: Date.now()
    });

    return result;
  };
}

/**
 * 数値パラメータ用の最適化されたキー生成関数
 * 
 * @param args - 数値引数の配列
 * @returns キー文字列
 */
export function numericKeyGenerator(...args: number[]): string {
  return args.join(',');
}

/**
 * RSI計算用のキー生成関数
 * RSIは小数点2桁で丸めてキャッシュヒット率を向上
 */
export function rsiKeyGenerator(rsi: number): string {
  return rsi.toFixed(2);
}

/**
 * モメンタム計算用のキー生成関数
 * モメンタムとしきい値を組み合わせ
 */
export function momentumKeyGenerator(momentum: number, threshold: number): string {
  return `${momentum.toFixed(2)}_${threshold}`;
}

/**
 * SMA計算用のキー生成関数
 */
export function smaKeyGenerator(sma5: number, sma20: number): string {
  return `${sma5.toFixed(2)}_${sma20.toFixed(2)}`;
}

/**
 * 信頼度計算用のキー生成関数
 */
export function confidenceKeyGenerator(
  rsi: number,
  momentum: number,
  prediction: number
): string {
  return `${rsi.toFixed(2)}_${momentum.toFixed(2)}_${prediction.toFixed(2)}`;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * 統計情報を追跡するメモ化関数を作成
 * 
 * @param fn - メモ化する関数
 * @param options - メモ化オプション
 * @param keyGenerator - カスタムキー生成関数
 * @returns メモ化された関数とstats取得関数
 */
 
export function memoizeWithStats<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: MemoizeOptions = {},
  keyGenerator: KeyGenerator<TArgs> = defaultKeyGenerator
): {
  memoized: (...args: TArgs) => TResult;
  getStats: () => CacheStats;
  clearCache: () => void;
} {
  const { maxSize = 100, ttl } = options;
  const cache = new Map<string, CacheEntry<TResult>>();
  let hits = 0;
  let misses = 0;

  const memoized = (...args: TArgs): TResult => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    if (cached) {
      if (ttl && Date.now() - cached.timestamp > ttl) {
        cache.delete(key);
        misses++;
      } else {
        hits++;
        return cached.value;
      }
    } else {
      misses++;
    }

    const result = fn(...args);
    
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, {
      value: result,
      timestamp: Date.now()
    });

    return result;
  };

  const getStats = (): CacheStats => {
    const total = hits + misses;
    return {
      hits,
      misses,
      size: cache.size,
      hitRate: total > 0 ? hits / total : 0
    };
  };

  const clearCache = (): void => {
    cache.clear();
    hits = 0;
    misses = 0;
  };

  return { memoized, getStats, clearCache };
}
