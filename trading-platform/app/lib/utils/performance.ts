/**
 * パフォーマンス監視ユーティリティ
 */


import { devWarn } from '@/app/lib/utils/dev-logger';
interface PerformanceStat {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}

const statsMap = new Map<string, PerformanceStat>();

/**
 * 同期または非同期関数の実行時間を計測する
 */
export function measurePerformance<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
  const start = performance.now();

  const record = (duration: number) => {
    const current = statsMap.get(name) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: -Infinity,
      avgTime: 0,
    };

    current.count += 1;
    current.totalTime += duration;
    current.minTime = Math.min(current.minTime, duration);
    current.maxTime = Math.max(current.maxTime, duration);
    current.avgTime = current.totalTime / current.count;

    statsMap.set(name, current);
    
    // 開発環境では遅い処理（例: 100ms超）をログ出力
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      devWarn(`[Performance] Slow execution detected in "${name}": ${duration.toFixed(2)}ms`);
    }
  };

  const result = fn();

  if (result instanceof Promise) {
    return result.then((val) => {
      record(performance.now() - start);
      return val;
    });
  }

  record(performance.now() - start);
  return result;
}

/**
 * 特定の計測結果を取得する
 */
export function getPerformanceStats(name: string): PerformanceStat {
  return statsMap.get(name) || {
    count: 0,
    totalTime: 0,
    minTime: 0,
    maxTime: 0,
    avgTime: 0,
  };
}

/**
 * すべての計測結果を取得する
 */
export function getAllPerformanceStats(): Map<string, PerformanceStat> {
  return new Map(statsMap);
}

/**
 * 計測結果をリセットする
 */
export function resetPerformanceStats(): void {
  statsMap.clear();
}
