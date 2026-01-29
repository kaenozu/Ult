/**
 * backtest.ts - 互換性維持のためのプロキシ
 * 最適化版 OptimizedAccuracyService を使用
 */

import { OHLCV, BacktestResult } from '@/app/types';
import { optimizedAccuracyService } from './OptimizedAccuracyService';

export type { BacktestResult, BacktestTrade } from '@/app/types';

/**
 * 最適化されたバックテスト実行
 * Web Worker 対応のため非同期処理も可能
 */
export function runBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): BacktestResult {
  return optimizedAccuracyService.runOptimizedBacktest(symbol, data, market);
}

/**
 * キャッシュクリア（メモリ管理用）
 */
export function clearBacktestCache(): void {
  optimizedAccuracyService.clearCache();
}
