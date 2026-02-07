import { FeatureEngine } from '../FeatureEngine';
import { OHLCV } from '@/app/types';

describe('FeatureEngine', () => {
  let engine: FeatureEngine;

  beforeEach(() => {
    engine = new FeatureEngine();
  });

  test('OHLCVデータから正規化された特徴量を抽出できること', () => {
    const mockData: OHLCV[] = [
      { date: '2026-01-01', open: 100, high: 110, low: 90, close: 100, volume: 1000, symbol: '7203' },
      { date: '2026-01-02', open: 100, high: 110, low: 100, close: 110, volume: 2000, symbol: '7203' },
    ];

    const features = engine.extract(mockData);

    // 期待値: 
    // - 変動率: (110 - 100) / 100 = 0.1
    // - 出来高比: 2000 / 1000 = 2.0 (あるいはスケーリングされた値)
    expect(features.length).toBeGreaterThan(0);
    expect(typeof features[0]).toBe('number');
    expect(features[0]).toBeCloseTo(0.1); // 価格変動率
  });

  test('データが不足している場合にエラーを投げるか空配列を返すこと', () => {
    const insufficientData: OHLCV[] = [];
    expect(() => engine.extract(insufficientData)).toThrow();
  });
});
