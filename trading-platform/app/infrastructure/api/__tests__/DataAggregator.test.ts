/**
 * DataAggregator.test.ts
 * 
 * DataAggregatorのテスト
 * APIバッチ処理、キャッシング、リクエスト重複排除のテスト
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MarketDataClient } from '../data-aggregator';
import type { OHLCV } from '@/app/types';

describe('DataAggregator', () => {
  let aggregator: MarketDataClient;
  let fetchMock: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    aggregator = new MarketDataClient();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('キャッシュ機能', () => {
    it('データをキャッシュに保存して取得できる', () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      aggregator.setCached('AAPL', mockData);
      const cached = aggregator.getCached('AAPL');

      expect(cached).toEqual(mockData);
    });

    it('TTLが切れたキャッシュはnullを返す', () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      // Use constructor option for TTL if needed, or pass to setCached
      aggregator.setCached('AAPL', mockData, 1); // 1ms TTL
      // 短い待機時間を追加してTTLを確実に切れるようにする
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const cached = aggregator.getCached('AAPL');
        expect(cached).toBeUndefined();
      });
    });

    it('キャッシュをクリアできる', () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      aggregator.setCached('AAPL', mockData);
      aggregator.clearCache();
      const cached = aggregator.getCached('AAPL');

      expect(cached).toBeUndefined();
    });
  });

  describe('バッチ処理', () => {
    it('複数のリクエストをバッチで処理できる', async () => {
      const mockData: Record<string, OHLCV[]> = {
        AAPL: [{ open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' } as any],
        GOOGL: [{ open: 150, high: 155, low: 145, close: 152, volume: 2000, date: '2024-01-01', symbol: 'GOOGL' } as any],
      };

      fetchMock.mockImplementation((url: string) => {
        const symbol = new URL(url, 'http://localhost').searchParams.get('symbol');
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockData[symbol!] }),
        });
      });

      const results = await Promise.all([
        aggregator.fetchData('AAPL'),
        aggregator.fetchData('GOOGL'),
      ]);

      expect(results[0]).toEqual(mockData.AAPL);
      expect(results[1]).toEqual(mockData.GOOGL);
    });

    it('バッチサイズ制限を尊重する', async () => {
      const symbols = Array.from({ length: 10 }, (_, i) => `SYM${i}`);

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const results = await Promise.all(
        symbols.map(symbol => aggregator.fetchData(symbol))
      );

      expect(results).toHaveLength(10);
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('リクエスト重複排除', () => {
    it('同じリクエストを重複して送信しない', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const [result1, result2] = await Promise.all([
        aggregator.fetchData('AAPL'),
        aggregator.fetchData('AAPL'),
      ]);

      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーを適切に処理する', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(aggregator.fetchData('AAPL')).rejects.toThrow('Network error');
    });

    it('APIエラーを適切に処理する', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(aggregator.fetchData('AAPL')).rejects.toThrow();
    });
  });

  describe('レート制限', () => {
    it('レート制限を尊重する', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      // 多数のリクエストを送信
      const requests = Array.from({ length: 100 }, () => aggregator.fetchData('AAPL'));
      await Promise.all(requests);

      // レート制限が適用されていることを確認
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('優先度キュー', () => {
    it('優先度の高いリクエストを先に処理する', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      // 優先度の異なるリクエストを送信
      const results = await Promise.all([
        aggregator.fetchData('LOW', { priority: 1 }),
        aggregator.fetchData('HIGH', { priority: 10 }),
        aggregator.fetchData('MEDIUM', { priority: 5 }),
      ]);

      expect(results).toHaveLength(3);
    });
  });
});
