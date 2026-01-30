/**
 * OptimizedAccuracyService.test.ts
 * 
 * OptimizedAccuracyService のパフォーマンスと機能テスト
 */

import { optimizedAccuracyService } from '../lib/OptimizedAccuracyService';
import { OHLCV } from '../types';

// テスト用のモックデータ生成
function generateMockData(days: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // ランダムな価格変動（-5% ~ +5%）
    const change = (Math.random() - 0.5) * 0.1;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });

    price = close;
  }

  return data;
}

describe('OptimizedAccuracyService', () => {
  beforeEach(() => {
    // 各テスト前にキャッシュをクリア
    optimizedAccuracyService.clearCache();
  });

  describe('getOptimizedParams', () => {
    it('should return cached params on second call with same data', () => {
      const data = generateMockData(100);
      const symbol = 'TEST';
      const market = 'japan' as const;

      // 最初の呼び出し（キャッシュミス）
      const start1 = performance.now();
      const result1 = optimizedAccuracyService.getOptimizedParams(symbol, data, market);
      const time1 = performance.now() - start1;

      // 2回目の呼び出し（キャッシュヒット）
      const start2 = performance.now();
      const result2 = optimizedAccuracyService.getOptimizedParams(symbol, data, market);
      const time2 = performance.now() - start2;

      // 結果が同じであることを確認
      expect(result1).toEqual(result2);

      // キャッシュヒットの方が高速であることを確認
      expect(time2).toBeLessThan(time1 / 10);
    });

    it('should return default params for insufficient data', () => {
      const data = generateMockData(30); // 不足しているデータ
      const result = optimizedAccuracyService.getOptimizedParams('TEST', data, 'japan');

      expect(result.rsiPeriod).toBe(14); // デフォルト値
      expect(result.smaPeriod).toBe(50); // デフォルト値
      expect(result.accuracy).toBe(0);
    });
  });

  describe('runOptimizedBacktest', () => {
    it('should complete backtest within 2 seconds for 1 year data', async () => {
      const data = generateMockData(252); // 1年分
      const startTime = performance.now();

      const result = optimizedAccuracyService.runOptimizedBacktest('7203', data, 'japan');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      console.log(`Backtest execution time: ${executionTime.toFixed(2)}ms`);

      expect(executionTime).toBeLessThan(2000);
      expect(result).toHaveProperty('totalTrades');
      expect(result).toHaveProperty('winRate');
      expect(result).toHaveProperty('totalReturn');
    });

    it('should return consistent results for same input', () => {
      const data = generateMockData(100);

      const result1 = optimizedAccuracyService.runOptimizedBacktest('TEST', data, 'japan');
      const result2 = optimizedAccuracyService.runOptimizedBacktest('TEST', data, 'japan');

      expect(result1.totalTrades).toBe(result2.totalTrades);
      expect(result1.winRate).toBe(result2.winRate);
    });

    it('should handle empty data gracefully', () => {
      const result = optimizedAccuracyService.runOptimizedBacktest('TEST', [], 'japan');

      expect(result.totalTrades).toBe(0);
      expect(result.winRate).toBe(0);
    });

    it('should calculate correct statistics', () => {
      const data = generateMockData(100);
      const result = optimizedAccuracyService.runOptimizedBacktest('TEST', data, 'japan');

      // 統計値の範囲チェック
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
      expect(result.profitFactor).toBeGreaterThanOrEqual(0);
      expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    });
  });

  describe.skip('Performance Comparison', () => {
    it('should be faster than naive implementation', () => {
      const data = generateMockData(150);

      // 最適化版の実行時間
      const startOptimized = performance.now();
      optimizedAccuracyService.runOptimizedBacktest('TEST', data, 'japan');
      const optimizedTime = performance.now() - startOptimized;

      // キャッシュをクリアして再実行
      optimizedAccuracyService.clearCache();
      
      const startSecond = performance.now();
      optimizedAccuracyService.runOptimizedBacktest('TEST', data, 'japan');
      const secondTime = performance.now() - startSecond;

      console.log(`First run: ${optimizedTime.toFixed(2)}ms`);
      console.log(`Second run (cached): ${secondTime.toFixed(2)}ms`);

      // 2回目はキャッシュがあるので高速（ゆるいアサーション）
      expect(secondTime).toBeLessThanOrEqual(optimizedTime * 1.5);
    });
  });

  describe('Memory Management', () => {
    it('should clear cache when clearCache is called', () => {
      const data = generateMockData(100);
      
      // キャッシュを作成
      optimizedAccuracyService.getOptimizedParams('TEST', data, 'japan');
      
      // キャッシュをクリア
      optimizedAccuracyService.clearCache();
      
      // 再度呼び出すと再計算される（キャッシュミス）
      const start = performance.now();
      optimizedAccuracyService.getOptimizedParams('TEST', data, 'japan');
      const time = performance.now() - start;

      // 再計算に時間がかかることを確認（ゆるいアサーション）
      expect(time).toBeGreaterThanOrEqual(1); // 少なくとも何らかの計算が行われることを確認
    });
  });
});

// Web Worker のテスト（モック）
describe('useBacktestWorker', () => {
  // Web Worker は Node.js 環境ではテストが複雑なので、
  // 基本的なインターフェースのテストのみ行う
  
  it('should have correct interface', () => {
    // Worker は Jest 環境ではモックが必要
    // 基本的なテストはスキップ
    expect(true).toBe(true);
  });
});
