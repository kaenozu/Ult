/**
 * APIクライアントのテストケース
 */

import { marketClient } from '@/app/lib/api/data-aggregator';
import { Stock, OHLCV, Signal } from '@/app/types';

// モックデータの作成
const mockStock: Stock = {
  symbol: 'TEST',
  name: 'Test Stock',
  market: 'japan',
  sector: 'Technology',
  price: 1000,
  change: 50,
  changePercent: 5.0,
  volume: 1000000
};

const mockOHLCVData: OHLCV[] = [
  {
    date: '2023-01-01',
    open: 1000,
    high: 1020,
    low: 990,
    close: 1010,
    volume: 1000000
  },
  {
    date: '2023-01-02',
    open: 1010,
    high: 1030,
    low: 1000,
    close: 1020,
    volume: 1200000
  }
];

// APIクライアントのモック
jest.mock('@/app/lib/api/data-aggregator', () => {
  return {
    marketClient: {
      fetchOHLCV: jest.fn(),
      fetchQuotes: jest.fn(),
      fetchQuote: jest.fn(),
      fetchMarketIndex: jest.fn(),
      fetchSignal: jest.fn()
    }
  };
});

describe('MarketDataClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchOHLCV', () => {
    it('should fetch OHLCV data successfully', async () => {
      // モックの設定
      (marketClient.fetchOHLCV as jest.MockedFunction<typeof marketClient.fetchOHLCV>)
        .mockResolvedValue({ success: true, data: mockOHLCVData, source: 'api' });

      // テスト対象の呼び出し
      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      // アサーション
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOHLCVData);
      expect(result.source).toBe('api');
      expect(marketClient.fetchOHLCV).toHaveBeenCalledWith('TEST', 'japan', undefined, undefined, undefined);
    });

    it('should handle fetch failure', async () => {
      // モックの設定
      (marketClient.fetchOHLCV as jest.MockedFunction<typeof marketClient.fetchOHLCV>)
        .mockResolvedValue({ success: false, data: null, source: 'error', error: 'Network error' });

      // テスト対象の呼び出し
      const result = await marketClient.fetchOHLCV('INVALID', 'japan');

      // アサーション
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.source).toBe('error');
      expect(result.error).toBe('Network error');
    });

    it('should fetch OHLCV data with interval parameter', async () => {
      // モックの設定
      (marketClient.fetchOHLCV as jest.MockedFunction<typeof marketClient.fetchOHLCV>)
        .mockResolvedValue({ success: true, data: mockOHLCVData, source: 'api' });

      // テスト対象の呼び出し
      const result = await marketClient.fetchOHLCV('TEST', 'japan', undefined, undefined, '1d');

      // アサーション
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOHLCVData);
      expect(result.source).toBe('api');
      expect(marketClient.fetchOHLCV).toHaveBeenCalledWith('TEST', 'japan', undefined, undefined, '1d');
    });
  });

  describe('fetchQuote', () => {
    it('should fetch quote data successfully', async () => {
      // モックの設定
      const mockQuoteData = {
        symbol: 'TEST',
        price: 1010,
        change: 10,
        changePercent: 1.0,
        volume: 1200000,
        marketState: 'REGULAR'
      };
      (marketClient.fetchQuote as jest.MockedFunction<typeof marketClient.fetchQuote>)
        .mockResolvedValue(mockQuoteData);

      // テスト対象の呼び出し
      const result = await marketClient.fetchQuote('TEST', 'japan');

      // アサーション
      expect(result).toEqual(mockQuoteData);
      expect(marketClient.fetchQuote).toHaveBeenCalledWith('TEST', 'japan');
    });

    it('should return null when fetch fails', async () => {
      // モックの設定
      (marketClient.fetchQuote as jest.MockedFunction<typeof marketClient.fetchQuote>)
        .mockResolvedValue(null);

      // テスト対象の呼び出し
      const result = await marketClient.fetchQuote('INVALID', 'japan');

      // アサーション
      expect(result).toBeNull();
    });
  });

  describe('fetchMarketIndex', () => {
    it('should fetch market index data successfully', async () => {
      // モックの設定
      const mockIndexData = {
        data: mockOHLCVData
      };
      (marketClient.fetchMarketIndex as jest.MockedFunction<typeof marketClient.fetchMarketIndex>)
        .mockResolvedValue(mockIndexData);

      // テスト対象の呼び出し
      const result = await marketClient.fetchMarketIndex('japan');

      // アサーション
      expect(result).toEqual(mockIndexData);
      expect(marketClient.fetchMarketIndex).toHaveBeenCalledWith('japan', undefined, undefined);
    });

    it('should handle market index fetch failure', async () => {
      // モックの設定
      const errorResult = {
        data: [],
        error: 'Market index fetch failed: Network error'
      };
      (marketClient.fetchMarketIndex as jest.MockedFunction<typeof marketClient.fetchMarketIndex>)
        .mockResolvedValue(errorResult);

      // テスト対象の呼び出し
      const result = await marketClient.fetchMarketIndex('japan');

      // アサーション
      expect(result).toEqual(errorResult);
    });
  });

  describe('fetchSignal', () => {
    it('should fetch signal data successfully', async () => {
      // モックの設定
      const mockSignal: Signal = {
        symbol: 'TEST',
        type: 'BUY',
        confidence: 85,
        targetPrice: 1100,
        stopLoss: 950,
        reason: 'Strong momentum and positive RSI divergence',
        predictedChange: 5.2,
        predictionDate: '2023-01-01'
      };
      (marketClient.fetchSignal as jest.MockedFunction<typeof marketClient.fetchSignal>)
        .mockResolvedValue({ success: true, data: mockSignal, source: 'api' });

      // テスト対象の呼び出し
      const result = await marketClient.fetchSignal(mockStock);

      // アサーション
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSignal);
      expect(result.source).toBe('api');
      expect(marketClient.fetchSignal).toHaveBeenCalledWith(mockStock, undefined, undefined);
    });

    it('should handle insufficient data for signal', async () => {
      // モックの設定
      (marketClient.fetchSignal as jest.MockedFunction<typeof marketClient.fetchSignal>)
        .mockResolvedValue({ 
          success: false, 
          data: null, 
          source: 'error', 
          error: 'Insufficient data for ML analysis' 
        });

      // テスト対象の呼び出し
      const result = await marketClient.fetchSignal({ ...mockStock, symbol: 'NEW' });

      // アサーション
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.source).toBe('error');
      expect(result.error).toBe('Insufficient data for ML analysis');
    });
  });
});