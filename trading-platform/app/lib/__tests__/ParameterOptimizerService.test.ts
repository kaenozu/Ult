import { ParameterOptimizerService } from '../ParameterOptimizerService';
import { OHLCV } from '@/app/types';

describe('ParameterOptimizerService', () => {
  let service: ParameterOptimizerService;

  beforeEach(() => {
    service = new ParameterOptimizerService();
  });

  test('過去のデータから最も的中率の高いRSI期間を選び出せること', async () => {
    // 擬似的な相場データ（RSIの期間によって的中率が変わるようなデータ）
    const mockData: OHLCV[] = Array.from({ length: 100 }, (_, i) => ({
      date: `2026-01-${i + 1}`,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i + (i % 5 === 0 ? 5 : -2), // 周期的な変動を持たせる
      volume: 1000,
      symbol: 'TEST'
    }));

    const rsiPeriods = [7, 10, 14, 21];
    const bestPeriod = await service.findBestRSIPeriod(mockData, rsiPeriods);

    expect(rsiPeriods).toContain(bestPeriod);
    expect(bestPeriod).toBeGreaterThan(0);
  });

  test('データが不足している場合はデフォルト値を返すこと', async () => {
    const insufficientData: OHLCV[] = [];
    const bestPeriod = await service.findBestRSIPeriod(insufficientData, [14]);
    expect(bestPeriod).toBe(14);
  });
});
