import { marketClient } from './data-aggregator';
import { OHLCV } from '../../types';

// Mock fetch to simulate API response
global.fetch = jest.fn();

describe('Data Aggregator - Interpolation', () => {
  const mockSymbol = '7203.T';
  const mockMarket = 'japan';

  beforeEach(() => {
    jest.clearAllMocks();
    // キャッシュを強制的にクリア（プライベートプロパティにアクセス）
    (marketClient as any).cache = new Map();
  });

  it('should interpolate missing (zero) values in OHLCV data', async () => {
    // 欠損データを含むOHLCV（5番目のデータが0）
    const dirtyData: OHLCV[] = Array.from({ length: 60 }, (_, i) => ({
      date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 101 + i,
      volume: 1000
    }));

    // 5番目のデータを欠損させる
    dirtyData[4] = {
      ...dirtyData[4],
      open: 0,
      high: 0,
      low: 0,
      close: 0
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: dirtyData })
    });

    const result = await marketClient.fetchOHLCV(mockSymbol, mockMarket);

    expect(result.success).toBe(true);
    if (result.data) {
      expect(result.data[4].close).toBe(105);
    }
  });

  it('should fill date gaps in OHLCV data', async () => {
    // 2024-01-01, 2024-01-02, 2024-01-04 (2024-01-03が欠落)
    const gapData: OHLCV[] = [
      { date: '2024-01-01', open: 100, high: 105, low: 95, close: 101, volume: 1000 },
      { date: '2024-01-02', open: 101, high: 106, low: 96, close: 102, volume: 1100 },
      { date: '2024-01-04', open: 103, high: 108, low: 98, close: 104, volume: 1200 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: gapData })
    });

    const result = await marketClient.fetchOHLCV(mockSymbol, mockMarket);

    expect(result.success).toBe(true);
    if (result.data) {
      // 欠落した1月3日のデータが補間されて追加されているはず
      expect(result.data.length).toBe(4);
      const jan3 = result.data.find(d => d.date === '2024-01-03');
      expect(jan3).toBeDefined();
      if (jan3) {
        expect(jan3.close).toBe(103); // 102と104の中間
      }
    }
  });

  it('should retry with exponential backoff on API failure', async () => {
    // 1回目は失敗、2回目は成功するレスポンスをシミュレート
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Rate Limit'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ date: '2024-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 }] })
      });

    // テスト時間を短縮するため、リトライの待ち時間をモックするか、
    // 実装側でリトライ間隔を調整できるようにする必要がありますが、
    // まずは単純な呼び出しをテストします。
    const result = await marketClient.fetchOHLCV(mockSymbol, mockMarket);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
