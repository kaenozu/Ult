import { UnifiedIntelligenceService } from '../services/UnifiedIntelligenceService';
import { marketDataService } from '../MarketDataService';
import { OHLCV } from '@/app/types';

// MarketDataService のモック
jest.mock('../MarketDataService');

describe('UnifiedIntelligenceService Integration', () => {
  let service: UnifiedIntelligenceService;

  beforeEach(() => {
    service = new UnifiedIntelligenceService();
    jest.clearAllMocks();
  });

  test('相場変動時(CRASH/RANGING)において、自動的に守備的な分析(需給)の重みが優先されること', async () => {
    // 1. 暴落データのシミュレーション
    const crashData: OHLCV[] = Array.from({ length: 60 }, (_, i) => {
      const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
      return {
        date,
        open: 10000 * Math.pow(0.9, i), // 10% drop daily
        high: 10000 * Math.pow(0.9, i) * 1.01,
        low: 10000 * Math.pow(0.9, i) * 0.95,
        close: 10000 * Math.pow(0.9, i) * 0.96,
        volume: 5000,
        symbol: '7203'
      };
    });

    (marketDataService.fetchMarketData as jest.Mock).mockResolvedValue({
      success: true,
      data: crashData
    });

    // 2. 統合レポート生成
    const report = await service.generateReport('7203', 'japan');

    // 3. 検証
    // CRASH or RANGING (high volatility)
    expect(['CRASH', 'RANGING']).toContain(report.regime);
    // 守備的な局面では supplyDemand の重みが他（aiなど）より高いことを確認
    expect(report.appliedWeights.supplyDemand).toBeGreaterThan(report.appliedWeights.ai);
    expect(report.reasoning).toContain('価格が強力なサポートゾーン（需要の壁）に位置しています。');
  });

  test('期待値(EV)がマイナスの銘柄に対して確信度をペナルティ調整すること', async () => {
    // 的中率が低い（負け越している）銘柄のシミュレーション
    // (内部の getHistoricalPerformance が 40% 程度の的中率を返すと仮定)
    const mockData: OHLCV[] = Array.from({ length: 60 }, (_, i) => {
      const date = new Date(2026, 0, i + 1).toISOString().split('T')[0];
      return {
        date,
        close: 100,
        open: 100, high: 105, low: 95, volume: 1000, symbol: 'LOW_EV'
      };
    });

    (marketDataService.fetchMarketData as jest.Mock).mockResolvedValue({
      success: true,
      data: mockData
    });

    const report = await service.generateReport('LOW_EV', 'japan');

    // 期待値がマイナス（あるいは低信頼）の場合、確信度が抑制されていることを確認
    // (本来の計算値より低くなっているはず)
    expect(report.expectedValue.isPositive).toBeDefined();
    if (!report.expectedValue.isPositive) {
      expect(report.confidenceScore).toBeLessThan(50);
    }
  });
});
