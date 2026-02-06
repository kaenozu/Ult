/**
 * MarketDataService.test.ts
 * 
 * MarketDataServiceのテスト
 * 市場データの取得、相関分析、トレンド検出のテスト
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MarketDataService, MARKET_INDICES } from '../MarketDataService';
import type { OHLCV } from '@/app/types';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new MarketDataService();
    fetchMock = jest.fn() as jest.Mock;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('市場データの取得', () => {
    it('指定されたシンボルの市場データを取得できる', async () => {
      const mockData = [
        { date: '2024-01-01', open: '100', high: '105', low: '95', close: '102', volume: '1000' },
        { date: '2024-01-02', open: '102', high: '107', low: '97', close: '104', volume: '1100' },
        { date: '2024-01-03', open: '104', high: '109', low: '99', close: '106', volume: '1200' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await service.getMarketData('AAPL');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.data.length).toBe(3);
      expect(result.data[0].open).toBe(100);
    });

    it('トレンドを正しく検出する - 上昇', async () => {
      // 上昇トレンドを示すデータを生成（20日分以上必要）
      const mockData = Array.from({ length: 60 }, (_, i) => ({
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        open: String(100 + i),
        high: String(105 + i),
        low: String(95 + i),
        close: String(102 + i),  // 着実に上昇
        volume: String(1000 + i * 10),
      }));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await service.getMarketData('AAPL');

      expect(result.trend).toBe('UP');
    });

    it('変動率を正しく計算する', async () => {
      const mockData = [
        { date: '2024-01-01', open: '100', high: '105', low: '95', close: '100', volume: '1000' },
        { date: '2024-01-02', open: '102', high: '107', low: '97', close: '106', volume: '1100' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await service.getMarketData('AAPL');

      expect(result.changePercent).toBe(6); // (106 - 100) / 100 * 100
    });
  });

  describe('相関分析', () => {
    it('相関係数を計算できる', () => {
      // 相関計算のテスト - 同じデータは完全な正の相関
      const stockData: OHLCV[] = Array.from({ length: 60 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000 + i * 10,
      }));

      const indexData: OHLCV[] = Array.from({ length: 60 }, (_, i) => ({
        symbol: '^GSPC',
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        open: 200 + i * 2,
        high: 210 + i * 2,
        low: 190 + i * 2,
        close: 204 + i * 2,
        volume: 5000 + i * 20,
      }));

      const correlation = service.calculateCorrelation(stockData, indexData);

      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('ベータ値を計算できる', () => {
      const stockData: OHLCV[] = Array.from({ length: 60 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000,
      }));

      const indexData: OHLCV[] = Array.from({ length: 60 }, (_, i) => ({
        symbol: '^GSPC',
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        open: 200 + i * 2,
        high: 210 + i * 2,
        low: 190 + i * 2,
        close: 204 + i * 2,
        volume: 5000,
      }));

      const beta = service.calculateBeta(stockData, indexData);

      expect(typeof beta).toBe('number');
      expect(isFinite(beta)).toBe(true);
    });

    it('信頼度を適切に設定する', () => {
      expect(service.getCorrelationConfidence(300)).toBe('high');
      expect(service.getCorrelationConfidence(150)).toBe('medium');
      expect(service.getCorrelationConfidence(50)).toBe('low');
    });
  });

  describe('エラーハンドリング', () => {
    it('APIエラー時は空配列を返す', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await service.getMarketData('AAPL');

      // サービスはエラーを内部で処理し、空のデータを返す
      expect(result.data).toEqual([]);
      expect(result.trend).toBe('NEUTRAL');
    });

    it('空のデータを適切に処理する', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const result = await service.getMarketData('AAPL');

      expect(result.data).toEqual([]);
      expect(result.trend).toBe('NEUTRAL');
    });
  });

  describe('キャッシング', () => {
    it('取得したデータをキャッシュする', async () => {
      const mockData = [
        { date: '2024-01-01', open: '100', high: '105', low: '95', close: '102', volume: '1000' },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      await service.getMarketData('AAPL');
      const cachedData = service.getCachedData('AAPL');

      expect(cachedData).toBeDefined();
      expect(cachedData?.data.length).toBe(1);
    });
  });

  describe('市場インデックス', () => {
    it('日本市場のインデックスを取得できる', () => {
      const indices = service.getJapanMarketIndices();

      expect(indices).toBeDefined();
      expect(indices.length).toBeGreaterThan(0);
      expect(indices[0].market).toBe('japan');
    });

    it('米国市場のインデックスを取得できる', () => {
      const indices = service.getUSAMarketIndices();

      expect(indices).toBeDefined();
      expect(indices.length).toBeGreaterThan(0);
      expect(indices[0].market).toBe('usa');
    });
  });

  describe('calculateTrend', () => {
    it('データ不足時はNEUTRALを返す', () => {
      const data: OHLCV[] = Array.from({ length: 10 }, (_, i) => ({
        symbol: 'TEST',
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      }));

      const trend = service.calculateTrend(data);
      expect(trend).toBe('NEUTRAL');
    });
  });

  describe('calculateStd', () => {
    it('標準偏差を正しく計算する', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const std = service.calculateStd(data);
      expect(std).toBeCloseTo(2, 0);
    });

    it('データ不足時は0を返す', () => {
      expect(service.calculateStd([])).toBe(0);
      expect(service.calculateStd([1])).toBe(0);
    });
  });
});
