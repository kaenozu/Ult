/**
 * MarketDataService.test.ts
 * 
 * MarketDataServiceのテスト
 * 市場データの取得、相関分析、トレンド検出のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { MarketDataService } from '../MarketDataService';
import type { OHLCV } from '@/app/types';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new MarketDataService();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('市場データの取得', () => {
    it('指定されたシンボルの市場データを取得できる', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
        { open: 102, high: 107, low: 97, close: 104, volume: 1100, date: '2024-01-02', symbol: 'AAPL' },
        { open: 104, high: 109, low: 99, close: 106, volume: 1200, date: '2024-01-03', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getMarketData('AAPL');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.data).toEqual(mockData);
    });

    it('トレンドを正しく検出する', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
        { open: 102, high: 107, low: 97, close: 104, volume: 1100, date: '2024-01-02', symbol: 'AAPL' },
        { open: 104, high: 109, low: 99, close: 106, volume: 1200, date: '2024-01-03', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getMarketData('AAPL');

      expect(result.trend).toBe('UP');
    });

    it('変動率を正しく計算する', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 100, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
        { open: 102, high: 107, low: 97, close: 106, volume: 1100, date: '2024-01-02', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await service.getMarketData('AAPL');

      expect(result.changePercent).toBe(6); // (106 - 100) / 100 * 100
    });
  });

  describe('相関分析', () => {
    it('市場インデックスとの相関を計算できる', async () => {
      const mockStockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
        { open: 102, high: 107, low: 97, close: 104, volume: 1100, date: '2024-01-02', symbol: 'AAPL' },
      ];

      const mockIndexData: OHLCV[] = [
        { open: 200, high: 210, low: 190, close: 204, volume: 5000, date: '2024-01-01', symbol: '^GSPC' },
        { open: 204, high: 214, low: 194, close: 208, volume: 5500, date: '2024-01-02', symbol: '^GSPC' },
      ];

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStockData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndexData,
        });

      const result = await service.calculateCorrelation('AAPL', '^GSPC');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.indexSymbol).toBe('^GSPC');
      expect(result.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.correlation).toBeLessThanOrEqual(1);
    });

    it('ベータ値を計算できる', async () => {
      const mockStockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
        { open: 102, high: 107, low: 97, close: 104, volume: 1100, date: '2024-01-02', symbol: 'AAPL' },
      ];

      const mockIndexData: OHLCV[] = [
        { open: 200, high: 210, low: 190, close: 204, volume: 5000, date: '2024-01-01', symbol: '^GSPC' },
        { open: 204, high: 214, low: 194, close: 208, volume: 5500, date: '2024-01-02', symbol: '^GSPC' },
      ];

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStockData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndexData,
        });

      const result = await service.calculateCorrelation('AAPL', '^GSPC');

      expect(result.beta).toBeDefined();
      expect(typeof result.beta).toBe('number');
    });

    it('信頼度を適切に設定する', async () => {
      const mockStockData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000 + i * 10,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const mockIndexData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
        open: 200 + i * 2,
        high: 210 + i * 2,
        low: 190 + i * 2,
        close: 204 + i * 2,
        volume: 5000 + i * 20,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: '^GSPC',
      }));

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStockData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndexData,
        });

      const result = await service.calculateCorrelation('AAPL', '^GSPC');

      expect(['low', 'medium', 'high']).toContain(result.confidence);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーを適切に処理する', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getMarketData('AAPL')).rejects.toThrow('Network error');
    });

    it('APIエラーを適切に処理する', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getMarketData('AAPL')).rejects.toThrow();
    });

    it('空のデータを適切に処理する', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await service.getMarketData('AAPL');

      expect(result.data).toEqual([]);
      expect(result.trend).toBe('NEUTRAL');
    });
  });

  describe('キャッシング', () => {
    it('取得したデータをキャッシュする', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await service.getMarketData('AAPL');
      const cachedData = service.getCachedData('AAPL');

      expect(cachedData).toBeDefined();
      expect(cachedData?.data).toEqual(mockData);
    });

    it('キャッシュされたデータを再利用する', async () => {
      const mockData: OHLCV[] = [
        { open: 100, high: 105, low: 95, close: 102, volume: 1000, date: '2024-01-01', symbol: 'AAPL' },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      await service.getMarketData('AAPL');
      await service.getMarketData('AAPL');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('市場インデックス', () => {
    it('日本市場のインデックスを取得できる', async () => {
      const indices = service.getJapanMarketIndices();

      expect(indices).toBeDefined();
      expect(indices.length).toBeGreaterThan(0);
      expect(indices[0].market).toBe('japan');
    });

    it('米国市場のインデックスを取得できる', async () => {
      const indices = service.getUSAMarketIndices();

      expect(indices).toBeDefined();
      expect(indices.length).toBeGreaterThan(0);
      expect(indices[0].market).toBe('usa');
    });
  });
});
