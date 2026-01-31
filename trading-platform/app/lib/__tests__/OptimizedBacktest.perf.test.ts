/**
 * OptimizedBacktest.perf.test.ts
 * 
 * バックテスト計算のパフォーマンステスト
 * O(N² × 12) → O(N) の計算量改善を検証
 */

import { optimizedAccuracyService } from '../OptimizedAccuracyService';
import { accuracyService } from '../AccuracyService';
import { OHLCV } from '@/app/types';

// テスト用のダミーデータを生成
function generateTestData(days: number): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 1000;
  const startDate = new Date('2023-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // ランダムな価格変動（-2% ~ +2%）
    const change = (Math.random() - 0.5) * 0.04;
    price = price * (1 + change);

    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);

    data.push({
      date: date.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
  }

  return data;
}

describe('バックテスト計算のパフォーマンステスト', () => {
  const testCases = [
    { days: 30, label: '1ヶ月分' },
    { days: 90, label: '3ヶ月分' },
    { days: 252, label: '1年分（営業日）' }
  ];

  beforeEach(() => {
    // キャッシュをクリア
    optimizedAccuracyService.clearCache();
  });

  testCases.forEach(({ days, label }) => {
    describe(`${label}のデータ（${days}日）`, () => {
      const data = generateTestData(days);

      it(`OptimizedAccuracyService: ${label}の計算が完了する`, () => {
        const startTime = performance.now();
        
        const result = optimizedAccuracyService.runOptimizedBacktest(
          'TEST',
          data,
          'japan'
        );
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        console.log(`[${label}] OptimizedAccuracyService: ${executionTime.toFixed(2)}ms`);
        
        // 結果の検証
        expect(result).toBeDefined();
        expect(result.symbol).toBe('TEST');
        expect(typeof result.totalTrades).toBe('number');
        expect(typeof result.winRate).toBe('number');
        
        // パフォーマンス要件: 1年分のデータでも500ms以内
        expect(executionTime).toBeLessThan(500);
      });

      it(`AccuracyService（旧実装）: ${label}の計算が完了する`, () => {
        const startTime = performance.now();
        
        const result = accuracyService.runBacktest(
          'TEST',
          data,
          'japan'
        );
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        console.log(`[${label}] AccuracyService（旧）: ${executionTime.toFixed(2)}ms`);
        
        // 結果の検証
        expect(result).toBeDefined();
        expect(result.symbol).toBe('TEST');
      });

      it(`両実装の結果が一致する`, () => {
        const optimizedResult = optimizedAccuracyService.runOptimizedBacktest(
          'TEST',
          data,
          'japan'
        );

        const originalResult = accuracyService.runBacktest(
          'TEST',
          data,
          'japan'
        );

        // 主要な指標が一致することを確認
        expect(optimizedResult.totalTrades).toBe(originalResult.totalTrades);
        expect(optimizedResult.winningTrades).toBe(originalResult.winningTrades);
        expect(optimizedResult.losingTrades).toBe(originalResult.losingTrades);
        expect(optimizedResult.winRate).toBeCloseTo(originalResult.winRate, 1);
        expect(optimizedResult.totalReturn).toBeCloseTo(originalResult.totalReturn, 1);
      });
    });
  });

  describe('キャッシュ機能のテスト', () => {
    const data = generateTestData(252);

    it('同じデータの2回目の計算はキャッシュから取得される', () => {
      // 1回目の計算
      const startTime1 = performance.now();
      const result1 = optimizedAccuracyService.runOptimizedBacktest(
        'TEST',
        data,
        'japan'
      );
      const executionTime1 = performance.now() - startTime1;

      // 2回目の計算（キャッシュヒット）
      const startTime2 = performance.now();
      const result2 = optimizedAccuracyService.runOptimizedBacktest(
        'TEST',
        data,
        'japan'
      );
      const executionTime2 = performance.now() - startTime2;

      console.log(`[キャッシュテスト] 1回目: ${executionTime1.toFixed(2)}ms, 2回目: ${executionTime2.toFixed(2)}ms`);

      // 結果が同じ
      expect(result1).toEqual(result2);

      // 2回目は大幅に高速（キャッシュヒット）
      expect(executionTime2).toBeLessThan(executionTime1 * 0.5);
    });
  });

  describe('Web Worker互換性のテスト', () => {
    it('OptimizedAccuracyServiceはWeb Workerで使用可能な純粋な関数', () => {
      const data = generateTestData(100);
      
      // サービスが正しくインスタンス化されている
      expect(optimizedAccuracyService).toBeDefined();
      expect(typeof optimizedAccuracyService.runOptimizedBacktest).toBe('function');
      expect(typeof optimizedAccuracyService.getOptimizedParams).toBe('function');
      expect(typeof optimizedAccuracyService.clearCache).toBe('function');

      // 計算が実行可能
      const result = optimizedAccuracyService.runOptimizedBacktest(
        'TEST',
        data,
        'japan'
      );

      expect(result).toBeDefined();
      expect(result.symbol).toBe('TEST');
    });
  });
});

// 計算量の理論的分析テスト
describe('計算量の理論的分析', () => {
  it('OptimizedAccuracyServiceの計算量はO(N)である', () => {
    const sizes = [100, 200, 400];
    const times: number[] = [];

    sizes.forEach(size => {
      const data = generateTestData(size);
      
      // キャッシュをクリア
      optimizedAccuracyService.clearCache();
      
      const startTime = performance.now();
      optimizedAccuracyService.runOptimizedBacktest('TEST', data, 'japan');
      const executionTime = performance.now() - startTime;
      
      times.push(executionTime);
    });

    // O(N)の場合、データサイズが2倍になると実行時間も約2倍になる
    const ratio1 = times[1] / times[0];
    const ratio2 = times[2] / times[1];

    console.log(`計算量テスト: 100→200日: ${ratio1.toFixed(2)}倍, 200→400日: ${ratio2.toFixed(2)}倍`);

    // 線形時間の許容範囲（1.5 ~ 3.0倍）
    expect(ratio1).toBeGreaterThan(1.5);
    expect(ratio1).toBeLessThan(3.0);
    expect(ratio2).toBeGreaterThan(1.5);
    expect(ratio2).toBeLessThan(3.0);
  });
});
