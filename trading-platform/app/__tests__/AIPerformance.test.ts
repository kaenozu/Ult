```
import { calculateAIHitRate } from '../lib/analysis';
import { OHLCV } from '../types';

describe('AI Performance Calculation (Hit Rate)', () => {
  // 300日分のサンプルデータを作成 (AccuracyService requires 252+)
  const mockData: OHLCV[] = Array.from({ length: 300 }, (_, i) => {
    let price = 1000 + i * 2;
    // 250日目付近で暴落
    if (i >= 250 && i < 260) price = 1500 - (i - 250) * 20; 
    // 260日目から急反発
    if (i >= 260) price = 1300 + (i - 260) * 15; 

    const date = new Date(2025, 0, 1 + i);
    return {
      date: date.toISOString().split('T')[0],
      open: price,
      high: price + 15,
      low: price - 15,
      close: price,
      volume: 10000
    };
  });

  it('should calculate hit rate correctly for a winning trend', () => {
    // 常に上昇しているデータなら、BUYシグナルの的中率は高くなるはず
    const result = calculateAIHitRate('TEST', mockData, 'japan');

    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.hitRate).toBeGreaterThan(0);
    expect(result.directionalAccuracy).toBeGreaterThan(0);
  });

  it('should return 0 trades for insufficient data', () => {
    const result = calculateAIHitRate('TEST', mockData.slice(0, 10), 'japan');
    expect(result.totalTrades).toBe(0);
  });
});