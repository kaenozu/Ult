import { ExpectedValueService, TradeStats } from '../ExpectedValueService';

describe('ExpectedValueService', () => {
  let service: ExpectedValueService;

  beforeEach(() => {
    service = new ExpectedValueService();
  });

  test('基本的な期待値を正しく計算できること', () => {
    const stats: TradeStats = {
      hitRate: 60,        // 勝率 60%
      avgProfit: 1000,    // 平均利益 1000円
      avgLoss: 500,       // 平均損失 500円
      totalTrades: 100
    };

    // 期待値 = (0.6 * 1000) - (0.4 * 500) = 600 - 200 = 400
    const ev = service.calculate(stats);
    expect(ev.expectedValue).toBe(400);
    expect(ev.isPositive).toBe(true);
  });

  test('スリッページと手数料を考慮して期待値が算出されること', () => {
    const stats: TradeStats = {
      hitRate: 50,
      avgProfit: 1000,
      avgLoss: 1000,
      totalTrades: 10
    };

    // 手数料 100円, スリッページ 50円の場合
    // 1トレードあたりの追加コスト = 150円
    // 期待値 = ((0.5 * 1000) - (0.5 * 1000)) - 150 = -150
    const ev = service.calculate(stats, { commission: 100, slippage: 50 });
    expect(ev.expectedValue).toBe(-150);
    expect(ev.isPositive).toBe(false);
  });

  test('トレード数が少ない場合に信頼度スコアが低くなること', () => {
    const stats: TradeStats = { hitRate: 60, avgProfit: 1000, avgLoss: 500, totalTrades: 5 };
    const ev = service.calculate(stats);
    expect(ev.confidenceScore).toBeLessThan(50); // 5回では信頼できない
  });
});
