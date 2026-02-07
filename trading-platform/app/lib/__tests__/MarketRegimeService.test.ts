import { MarketRegimeService, MarketRegime } from '../MarketRegimeService';
import { OHLCV } from '@/app/types';

describe('MarketRegimeService', () => {
  let service: MarketRegimeService;

  beforeEach(() => {
    service = new MarketRegimeService();
  });

  test('ボラティリティが高い急落相場を CRASH モードと判定できること', () => {
    const crashData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${i + 1}`,
      open: 100 - i,
      high: 100 - i + 1,
      low: 100 - i - 5, // 大きな下髭
      close: 100 - i - 4, // 急落
      volume: 2000 + i * 100,
      symbol: 'MARKET'
    }));

    const regime = service.classify(crashData);
    expect(regime).toBe('CRASH');
  });

  test('安定した上昇相場を BULL モードと判定できること', () => {
    const bullData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${i + 1}`,
      open: 100 + i,
      high: 100 + i + 1,
      low: 100 + i - 0.5,
      close: 100 + i + 0.8, // 着実な上昇
      volume: 1000,
      symbol: 'MARKET'
    }));

    const regime = service.classify(bullData);
    expect(regime).toBe('BULL');
  });
});
