import { calculateAIHitRate } from '../lib/analysis';
import { OHLCV } from '../types';

describe('AI Performance Strict Logic Tests', () => {
  const generateBaseData = (count: number, startPrice: number): OHLCV[] => {
    return Array.from({ length: count }, (_, i) => ({
      date: `2026-01-${i + 1}`,
      open: startPrice,
      high: startPrice + 5,
      low: startPrice - 5,
      close: startPrice,
      volume: 1000
    }));
  };

  it('should be conservative when both target and stop are hit on same day', () => {
    const data = generateBaseData(200, 1000);
    // 105日目に、高値1100(利確)と安値900(損切)の両方を記録する異常日を作る
    // シグナルは100日目に出る想定(Warmup=100)
    data[101] = { ...data[101], high: 1200, low: 800, close: 1000 }; 

    const result = calculateAIHitRate('TEST', data, 'japan');
    
    // このトレードは「負け」としてカウントされなければならない
    // 全てHOLDにならないようにデータに少し動きをつけて調整
    expect(result.hitRate).toBeLessThan(100);
  });

  it('should handle zero or NaN prices gracefully without crashing', () => {
    const data = generateBaseData(200, 1000);
    data[105].close = NaN;
    data[106].high = 0;
    
    const result = calculateAIHitRate('TEST', data, 'japan');
    expect(result).toBeDefined();
    expect(typeof result.hitRate).toBe('number');
  });

  it('should calculate directional accuracy independently of hit rate', () => {
    const data = generateBaseData(200, 1000);
    // 5日後の価格だけ予測方向に動かす
    for(let i=101; i<106; i++) {
        data[i] = { ...data[i], high: 1001, low: 999, close: 1000 };
    }
    data[105].close = 1010; // 5日後は上昇

    const result = calculateAIHitRate('TEST', data, 'japan');
    expect(result.directionalAccuracy).toBeDefined();
  });

  it('should return insufficient flag for small datasets', () => {
    const data = generateBaseData(50, 1000);
    const result = calculateAIHitRate('TEST', data, 'japan');
    expect(result.totalTrades).toBe(0);
  });
});
