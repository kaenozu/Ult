/**
 * DataAggregator.test.ts
 * 
 * DataAggregatorのテスト
 * APIバッチ処理、キャッシング、リクエスト重複排除のテスト
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DataAggregator } from '../data-aggregator';
import type { OHLCV } from '@/app/types';

describe('DataAggregator', () => {
  let aggregator: DataAggregator;
  let fetchMock: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    aggregator = new DataAggregator();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('キャッシュ機能', () => {
    it('fetchWithCacheでデータをキャッシュできる', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      let fetchCount = 0;
      const fetcher = () => {
        fetchCount++;
        return Promise.resolve(mockData);
      };

      const result1 = await aggregator.fetchWithCache('AAPL', fetcher);
      const result2 = await aggregator.fetchWithCache('AAPL', fetcher);

      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(fetchCount).toBe(1);
    });

    it('TTLを指定してキャッシュできる', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValueOnce(mockData);

      const result = await aggregator.fetchWithCache('AAPL', () => Promise.resolve(mockData), 1000);
      expect(result).toEqual(mockData);
    });

    it('invalidateAllでキャッシュをクリアできる', () => {
      aggregator.invalidateAll();
      const stats = aggregator.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('バッチ処理', () => {
    it('fetchBatchで複数のキーをバッチ取得できる', async () => {
      const mockData = new Map([
        ['AAPL', [{ open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' }]],
        ['GOOGL', [{ open: 150, high: 155, low: 145, close: 152, volume: 2000, date: '2024-01-01', symbol: 'GOOGL' }]],
      ]);

      const result = await aggregator.fetchBatch(
        ['AAPL', 'GOOGL'],
        (keys) => {
          const data = new Map();
          for (const key of keys) {
            data.set(key, mockData.get(key));
          }
          return Promise.resolve(data);
        }
      );

      expect(result.size).toBe(2);
      expect(result.get('AAPL')).toBeDefined();
      expect(result.get('GOOGL')).toBeDefined();
    });

    it('空のキー配列で空のMapを返す', async () => {
      const result = await aggregator.fetchBatch([], () => Promise.resolve(new Map()));
      expect(result.size).toBe(0);
    });
  });

  describe('リクエスト重複排除', () => {
    it('同じリクエストを重複して送信しない', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      let fetchCount = 0;
      const fetcher = () => {
        fetchCount++;
        return Promise.resolve(mockData);
      };

      const [result1, result2] = await Promise.all([
        aggregator.fetchWithCache('AAPL', fetcher),
        aggregator.fetchWithCache('AAPL', fetcher),
      ]);

      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(fetchCount).toBe(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーを適切に処理する', async () => {
      await expect(
        aggregator.fetchWithCache('AAPL', () => Promise.reject(new Error('Network error')))
      ).rejects.toThrow('Network error');
    });

    it('APIエラーを適切に処理する', async () => {
      await expect(
        aggregator.fetchWithCache('AAPL', () => Promise.reject(new Error('Internal Server Error')))
      ).rejects.toThrow();
    });
  });

  describe('レート制限', () => {
    it('統計情報を取得できる', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      await aggregator.fetchWithCache('AAPL', () => Promise.resolve(mockData));
      const stats = aggregator.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheSize).toBe(1);
    });
  });

  describe('優先度キュー', () => {
    it('fetchWithPriorityで優先度を指定できる', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      const result = await aggregator.fetchWithPriority(['AAPL'], 'high', () => Promise.resolve(mockData));
      expect(result).toBeInstanceOf(Map);
      expect((result as Map<string, OHLCV>).get('AAPL')).toEqual(mockData[0]);
    });
  });

  describe('統計情報', () => {
    it('初期状態で統計がゼロである', () => {
      const stats = aggregator.getStats();
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.cacheSize).toBe(0);
    });
  });
});
