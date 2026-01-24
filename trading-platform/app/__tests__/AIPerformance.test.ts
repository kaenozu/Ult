import { calculateAIHitRate } from '../lib/analysis';
import { OHLCV } from '../types';

describe('AI Performance Calculation (Hit Rate)', () => {
  // 100日分のサンプルデータを作成
  const mockData: OHLCV[] = Array.from({ length: 200 }, (_, i) => {
    let price = 1000 + i * 2;
    // 150日目付近で暴落
    if (i >= 150 && i < 160) price = 1300 - (i - 150) * 20; 
    // 160日目から急反発
    if (i >= 160) price = 1100 + (i - 160) * 15; 

    return {
      date: `2025-01-${i + 1}`,
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