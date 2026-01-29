/**
 * data-interpolation.test.ts
 * 
 * Yahoo Finance APIデータ欠損処理のテスト
 * 個人開発プロジェクト向けのシンプルなテスト
 */

import { OHLCV } from '../types';

// データ補間関数（route.tsから抽出）
function interpolateData(quotes: Array<{
  date: Date | string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}>): Array<OHLCV & { isInterpolated?: boolean }> {
  let lastValidClose: number | null = null;

  return quotes.map((q) => {
    const dateStr = q.date instanceof Date
      ? q.date.toISOString().split('T')[0]
      : String(q.date);

    const hasValidClose = q.close !== null && q.close !== undefined && q.close > 0;
    
    if (hasValidClose) {
      lastValidClose = q.close;
    }
    
    const interpolatedClose = hasValidClose ? q.close : (lastValidClose ?? 0);
    
    return {
      date: dateStr,
      open: q.open ?? interpolatedClose ?? 0,
      high: q.high ?? interpolatedClose ?? 0,
      low: q.low ?? interpolatedClose ?? 0,
      close: interpolatedClose ?? 0,
      volume: q.volume ?? 0,
      isInterpolated: !hasValidClose,
    };
  });
}

describe('Data Interpolation', () => {
  it('should interpolate missing data with previous close', () => {
    const input = [
      { date: new Date('2024-01-01'), open: 100, high: 105, low: 99, close: 102, volume: 1000 },
      { date: new Date('2024-01-02'), open: null, high: null, low: null, close: null, volume: null },
      { date: new Date('2024-01-03'), open: 103, high: 108, low: 102, close: 107, volume: 1500 },
    ];

    const result = interpolateData(input);

    // 欠損データが前日終値で補間される
    expect(result[1].close).toBe(102);
    expect(result[1].open).toBe(102);
    expect(result[1].high).toBe(102);
    expect(result[1].low).toBe(102);
    expect(result[1].volume).toBe(0);
    expect(result[1].isInterpolated).toBe(true);

    // 有効なデータはそのまま
    expect(result[0].close).toBe(102);
    expect(result[0].isInterpolated).toBe(false);
    expect(result[2].close).toBe(107);
    expect(result[2].isInterpolated).toBe(false);
  });

  it('should not create false price spikes with zero', () => {
    const input = [
      { date: new Date('2024-01-01'), open: 100, high: 105, low: 99, close: 100, volume: 1000 },
      { date: new Date('2024-01-02'), open: null, high: null, low: null, close: null, volume: null },
      { date: new Date('2024-01-03'), open: null, high: null, low: null, close: null, volume: null },
      { date: new Date('2024-01-04'), open: 101, high: 106, low: 100, close: 105, volume: 1200 },
    ];

    const result = interpolateData(input);

    // 0が含まれていないことを確認
    const closes = result.map(r => r.close);
    expect(closes).not.toContain(0);

    // 急激な変動がないことを確認
    for (let i = 1; i < result.length; i++) {
      const change = Math.abs(result[i].close - result[i-1].close);
      expect(change).toBeLessThanOrEqual(5); // 最大5円の変動
    }
  });

  it('should handle multiple consecutive missing days', () => {
    const input = [
      { date: new Date('2024-01-01'), open: 100, high: 105, low: 99, close: 100, volume: 1000 },
      { date: new Date('2024-01-02'), open: null, high: null, low: null, close: null, volume: null },
      { date: new Date('2024-01-03'), open: null, high: null, low: null, close: null, volume: null },
      { date: new Date('2024-01-04'), open: null, high: null, low: null, close: null, volume: null },
      { date: new Date('2024-01-05'), open: 110, high: 115, low: 108, close: 112, volume: 2000 },
    ];

    const result = interpolateData(input);

    // 連続する欠損日も前日終値で補間
    expect(result[1].close).toBe(100);
    expect(result[2].close).toBe(100);
    expect(result[3].close).toBe(100);
    expect(result[1].isInterpolated).toBe(true);
    expect(result[2].isInterpolated).toBe(true);
    expect(result[3].isInterpolated).toBe(true);
  });

  it('should handle first day missing', () => {
    const input = [
      { date: new Date('2024-01-01'), open: null, high: null, low: null, close: null, volume: null },
      { date: new Date('2024-01-02'), open: 100, high: 105, low: 99, close: 102, volume: 1000 },
    ];

    const result = interpolateData(input);

    // 最初の日が欠損している場合は0になる（前日データがないため）
    expect(result[0].close).toBe(0);
    expect(result[0].isInterpolated).toBe(true);
    expect(result[1].close).toBe(102);
  });

  it('should preserve valid data unchanged', () => {
    const input = [
      { date: new Date('2024-01-01'), open: 100, high: 105, low: 99, close: 102, volume: 1000 },
      { date: new Date('2024-01-02'), open: 103, high: 108, low: 102, close: 107, volume: 1500 },
      { date: new Date('2024-01-03'), open: 106, high: 110, low: 105, close: 109, volume: 1200 },
    ];

    const result = interpolateData(input);

    // 有効なデータはそのまま
    expect(result[0]).toMatchObject({
      date: '2024-01-01',
      open: 100,
      high: 105,
      low: 99,
      close: 102,
      volume: 1000,
      isInterpolated: false,
    });
  });
});
