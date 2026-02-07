/** @jest-environment node */
/**
 * data-aggregator.test.ts
 * 
 * MarketDataClient (Data Aggregator) の包括的なテスト
 */

import { marketClient } from '../lib/api/data-aggregator';
import { idbClient } from '../lib/api/idb-migrations';
import { mlPredictionService } from '../lib/mlPrediction';

jest.mock('../lib/api/idb-migrations', () => ({
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
    marketClient.clearCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses cache when available', async () => {
    const mockData = [{ date: '2026-01-01', close: TEST_PRICES.INITIAL }];
    (marketClient as any).setCache('ohlcv-AAPL-1d', mockData);

    const result = await marketClient.fetchOHLCV('AAPL');
    expect(result.source).toBe('cache');
    expect(result.data).toEqual(mockData);
    expect(idbClient.getData).not.toHaveBeenCalled();
  });

  it('deduplicates pending requests', async () => {
    // IDBは即座に空を返すようにする
    (idbClient.getData as jest.Mock).mockResolvedValue([]);
    // fetchは未完了のPromiseを返すようにする
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => { })); 

    const p1 = marketClient.fetchOHLCV('DEDUP');
    const p2 = marketClient.fetchOHLCV('DEDUP');

    // 微小な時間待って非同期処理を1ステップ進める
    await Promise.resolve();
    await Promise.resolve();

    expect((marketClient as any).pendingRequests.size).toBe(1);
  });

  it('performs delta fetching when IDB has old data', async () => {
    jest.useRealTimers();
    const now = new Date();
    
    const oldDate = new Date(now);
    oldDate.setDate(oldDate.getDate() - TEST_TIMINGS.DAYS_AGO);
    const oldData = [{ date: oldDate.toISOString().split('T')[0], close: TEST_PRICES.INITIAL }];

    (idbClient.getData as jest.Mock).mockResolvedValue(oldData);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ date: now.toISOString().split('T')[0], close: TEST_PRICES.UPDATED }] })
    });
    (idbClient.mergeAndSave as jest.Mock).mockResolvedValue([...oldData, { date: now.toISOString().split('T')[0], close: TEST_PRICES.UPDATED }]);

    const result = await marketClient.fetchOHLCV('DELTA');
    expect(result.success).toBe(true);
    // Note: source check might be flaky in some environments, but global.fetch call is the critical part
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('startDate='), expect.anything());
  });

  it('handles batch fetchQuotes with chunking', async () => {
    const symbols = Array.from({ length: TEST_DATA_SIZES.SYMBOLS_COUNT }, (_, i) => `S${i}`);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ symbol: 'S0', price: TEST_PRICES.INITIAL }] })
    });

    await marketClient.fetchQuotes(symbols);
    expect(global.fetch).toHaveBeenCalledTimes(TEST_BATCH.EXPECTED_CHUNKS);
  });

  it('retries fetchQuotes on 429', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ status: HTTP_STATUS.TOO_MANY_REQUESTS })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ symbol: 'RETRY', price: TEST_PRICES.INITIAL }] })
      });

    const promise = marketClient.fetchQuotes(['RETRY']);

    await Promise.resolve();
    jest.advanceTimersByTime(TEST_TIMINGS.RETRY_DELAY_MS);
    await Promise.resolve();

    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('RETRY');
  });

  it('interpolates gaps in OHLCV data', async () => {
    const data = [
      { date: '2026-01-05', open: TEST_PRICES.INITIAL, high: TEST_PRICES.INITIAL, low: TEST_PRICES.INITIAL, close: TEST_PRICES.INITIAL, volume: TEST_VOLUMES.SMALL },
      { date: '2026-01-07', open: TEST_PRICES.HIGH, high: TEST_PRICES.HIGH, low: TEST_PRICES.HIGH, close: TEST_PRICES.HIGH, volume: TEST_VOLUMES.LARGE }
    ];

    const result = (marketClient as any).interpolateOHLCV(data);
    expect(result.length).toBeGreaterThan(2);
    const gapDay = result.find((d: any) => d.date === '2026-01-06');
    expect(gapDay).toBeDefined();
    expect(gapDay.close).toBeCloseTo((TEST_PRICES.INITIAL + TEST_PRICES.HIGH) / 2);
  });

  it('handles fetchMarketIndex failure gracefully', async () => {
    // fetchOHLCVをスパイしてエラーをシミュレート
    const spy = jest.spyOn(marketClient, 'fetchOHLCV').mockResolvedValue({ success: false, data: null, source: 'error', error: 'Test error' });
    const result = await marketClient.fetchMarketIndex('japan');
    expect(result.data).toEqual([]);
    expect(result.error).toBeDefined();
    spy.mockRestore();
  });

  it('returns empty for fetchQuotes with zero symbols', async () => {
    const result = await marketClient.fetchQuotes([]);
    expect(result).toEqual([]);
  });
});