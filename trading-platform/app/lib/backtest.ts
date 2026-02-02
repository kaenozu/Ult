/**
 * backtest.ts - 互換性維持のためのプロキシ
 * 全心的なロジックは AccuracyService に移行しました。
 */

import { OHLCV, BacktestResult } from '@/app/types';
import { accuracyService } from './AccuracyService';

export type { BacktestResult, BacktestTrade } from '@/app/types';

export function runBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): BacktestResult {
  return accuracyService.runBacktest(symbol, data, market);
}
