/**
 * backtest.ts - 互換性維持のためのプロキシ
 * 全心的なロジックは OptimizedAccuracyService に移行しました。
 * 
 * パフォーマンス最適化:
 * - Web Worker対応のOptimizedAccuracyServiceを使用
 * - メモ化パターンによるパラメータキャッシュ
 * - O(N² × 12) → O(N) の計算量改善
 */

import { OHLCV, BacktestResult } from '@/app/types';
import { optimizedAccuracyService } from './OptimizedAccuracyService';

export type { BacktestResult, BacktestTrade } from '@/app/types';

/**
 * バックテストを実行（最適化版）
 * 計算量: O(N) - 線形時間
 * 
 * @param symbol - 銘柄シンボル
 * @param data - OHLCVデータ
 * @param market - 市場（'japan' | 'usa'）
 * @returns バックテスト結果
 */
export function runBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): BacktestResult {
  return optimizedAccuracyService.runOptimizedBacktest(symbol, data, market);
}
