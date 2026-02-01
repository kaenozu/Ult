/** @jest-environment node */
/**
 * data-aggregator.test.ts
 * 
 * 注意: このテストはAPIシグネチャ変更により一時的に無効化
 */

import { marketClient } from '../lib/api/data-aggregator';
import { idbClient } from '../lib/api/idb';
import { mlPredictionService } from '../lib/mlPrediction';

jest.mock('../lib/api/idb', () => ({
  idbClient: {
    init: jest.fn().mockResolvedValue(undefined),
    clearAllData: jest.fn().mockResolvedValue(undefined),
    getData: jest.fn(),
    saveData: jest.fn(),
    mergeAndSave: jest.fn(),
  }
}));

jest.mock('../lib/mlPrediction', () => ({
  mlPredictionService: {
    calculateIndicators: jest.fn(),
    predict: jest.fn(),
    generateSignal: jest.fn(),
  }
}));

global.fetch = jest.fn() as any;

// Test constants to avoid magic numbers
const TEST_PRICES = {
  INITIAL: 100,
  UPDATED: 110,
  HIGH: 120,
} as const;

const TEST_VOLUMES = {
  SMALL: 1000,
  LARGE: 2000,
} as const;

const TEST_TIMINGS = {
  DAYS_AGO: 2,
  RETRY_DELAY_MS: 2000,
  RETRY_ADVANCE_MS: 2500,
  FETCH_RETRY_DELAY_MS: 10000,
} as const;

const TEST_DATA_SIZES = {
  SYMBOLS_COUNT: 60,
  OHLCV_ARRAY_SIZE: 30,
  EXPECTED_INTERPOLATED_LENGTH: 3,
} as const;

const TEST_BATCH = {
  CHUNK_SIZE: 50,
  EXPECTED_CHUNKS: 2,
} as const;

const TEST_RETRY = {
  MAX_ITERATIONS: 5,
} as const;

const HTTP_STATUS = {
  TOO_MANY_REQUESTS: 429,
} as const;

describe('MarketDataClient (Data Aggregator) Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton cache if possible (or use new symbols)
    (marketClient as any).cache.clear();
    (marketClient as any).pendingRequests.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses cache when available', async () => {
    const mockData = [{ date: '2026-01-01', close: TEST_PRICES.INITIAL }];
    // Fix: Cache key now includes interval (default 1d)
    (marketClient as any).cache.set('ohlcv-AAPL-1d', { data: mockData, timestamp: Date.now() });

    const result = await marketClient.fetchOHLCV('AAPL');
    expect(result.source).toBe('cache');
    expect(result.data).toEqual(mockData);
    expect(idbClient.getData).not.toHaveBeenCalled();
  });

  it('deduplicates pending requests', async () => {
    (idbClient.getData as jest.Mock).mockReturnValue(new Promise(() => { })); // Never resolves

    marketClient.fetchOHLCV('DEDUP');
    marketClient.fetchOHLCV('DEDUP');

    expect((marketClient as any).pendingRequests.size).toBe(1);
  });

  it('performs delta fetching when IDB has old data', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - TEST_TIMINGS.DAYS_AGO);
    const oldData = [{ date: oldDate.toISOString().split('T')[0], close: TEST_PRICES.INITIAL }];

    (idbClient.getData as jest.Mock).mockResolvedValue(oldData);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ date: '2026-01-02', close: TEST_PRICES.UPDATED }] })
    });
    (idbClient.mergeAndSave as jest.Mock).mockResolvedValue([...oldData, { date: '2026-01-02', close: TEST_PRICES.UPDATED }]);

    const result = await marketClient.fetchOHLCV('DELTA');
    expect(result.source).toBe('api');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('startDate='), expect.anything());
  });

  it('handles batch fetchQuotes with chunking', async () => {
    const symbols = Array.from({ length: TEST_DATA_SIZES.SYMBOLS_COUNT }, (_, i) => `S${i}`);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ symbol: 'S0', price: TEST_PRICES.INITIAL }] })
    });

    await marketClient.fetchQuotes(symbols);
    expect(global.fetch).toHaveBeenCalledTimes(TEST_BATCH.EXPECTED_CHUNKS); // SYMBOLS_COUNT / CHUNK_SIZE
  });

  it('retries fetchQuotes on 429', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ status: HTTP_STATUS.TOO_MANY_REQUESTS })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ symbol: 'RETRY', price: TEST_PRICES.INITIAL }] })
      });

    const promise = marketClient.fetchQuotes(['RETRY']);

    // The retry happens after RETRY_DELAY_MS
    await Promise.resolve();
    jest.advanceTimersByTime(TEST_TIMINGS.RETRY_ADVANCE_MS);
    await Promise.resolve();

    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('RETRY');
  });

  it('provides signals with macro data', async () => {
    const stock = { symbol: 'AAPL', market: 'usa' } as any;
    const mockOHLCV = Array(TEST_DATA_SIZES.OHLCV_ARRAY_SIZE).fill({ date: '2026-01-01', close: TEST_PRICES.INITIAL });

    // Mocking fetchOHLCV for symbol and index
    jest.spyOn(marketClient, 'fetchOHLCV').mockImplementation(async (sym) => {
      if (sym === 'AAPL' || sym === '^IXIC') {
        return { success: true, data: mockOHLCV, source: 'idb' } as any;
      }
      return { success: false, data: [] } as any;
    });

    (mlPredictionService.calculateIndicators as jest.Mock).mockReturnValue({});
    (mlPredictionService.predict as jest.Mock).mockReturnValue({ signal: 'BUY' });
    (mlPredictionService.generateSignal as jest.Mock).mockReturnValue({ type: 'BUY' });

    const result = await marketClient.fetchSignal(stock);
    expect(result.success).toBe(true);
    expect(result.data?.type).toBe('BUY');
    expect(mlPredictionService.generateSignal).toHaveBeenCalledWith(
      stock, expect.anything(), expect.anything(), expect.anything(), expect.any(Array)
    );
  });

  it('interpolates gaps in OHLCV data', async () => {
    const data = [
      { date: '2026-01-05', open: TEST_PRICES.INITIAL, high: TEST_PRICES.INITIAL, low: TEST_PRICES.INITIAL, close: TEST_PRICES.INITIAL, volume: TEST_VOLUMES.SMALL },
      { date: '2026-01-07', open: TEST_PRICES.HIGH, high: TEST_PRICES.HIGH, low: TEST_PRICES.HIGH, close: TEST_PRICES.HIGH, volume: TEST_VOLUMES.LARGE }
    ];

    const result = (marketClient as any).interpolateOHLCV(data);
    // Gaps: 2026-01-06 (one day diff)
    expect(result).toHaveLength(TEST_DATA_SIZES.EXPECTED_INTERPOLATED_LENGTH);
    expect(result[1].date).toBe('2026-01-06');
    expect(result[1].close).toBe(TEST_PRICES.UPDATED);
  });

  it('handles fetchWithRetry failure after max retries', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Fail'));

    const promise = (marketClient as any).fetchWithRetry('/test');

    // Advance timers for all retry attempts
    for (let i = 0; i < TEST_RETRY.MAX_ITERATIONS; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(TEST_TIMINGS.FETCH_RETRY_DELAY_MS);
    }

    await expect(promise).rejects.toThrow('Network Fail');
  });

  it('handles fetchMarketIndex failure gracefully', async () => {
    const spy = jest.spyOn(marketClient, 'fetchOHLCV').mockResolvedValue({ success: false, data: null, source: 'error', error: 'Test error' });
    const result = await marketClient.fetchMarketIndex('japan');
    // エラー時はdataが空配列になることを確認
    expect(result.data).toEqual([]);
    expect(result.error).toBeDefined();
    spy.mockRestore();
  });

  it('returns empty for fetchQuotes with zero symbols', async () => {
    const result = await marketClient.fetchQuotes([]);
    expect(result).toEqual([]);
  });
});
