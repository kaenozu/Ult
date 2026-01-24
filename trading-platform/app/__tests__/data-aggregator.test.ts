import { marketClient } from '../lib/api/data-aggregator';
import { idbClient } from '../lib/api/idb';

// Mock IndexedDB
jest.mock('../lib/api/idb', () => ({
  idbClient: {
    getData: jest.fn(),
    saveData: jest.fn(),
    mergeAndSave: jest.fn(),
  }
}));

// Mock global fetch
global.fetch = jest.fn();

describe('MarketDataClient (Data Aggregator) Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset internal cache by re-creating or clearing (if exposed)
    // For now, we rely on unique symbols to avoid cache hits between tests
  });

  it('should fetch data from API when local DB is empty', async () => {
    (idbClient.getData as jest.Mock).mockResolvedValue([]);
    (idbClient.mergeAndSave as jest.Mock).mockImplementation((sym, data) => data);
    
    const mockOHLCV = [
      { date: '2026-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockOHLCV })
    });

    const result = await marketClient.fetchOHLCV('TEST_NEW');

    expect(result.success).toBe(true);
    expect(result.source).toBe('api');
    expect(result.data?.length).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('TEST_NEW'), expect.anything());
  });

  it('should handle 429 Rate Limit with retry', async () => {
    (idbClient.getData as jest.Mock).mockResolvedValue([]);
    
    // First call fails with 429, second succeeds
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 429,
        headers: new Map([['Retry-After', '0']]) // No wait for test
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ date: '2026-01-01', close: 100 }] })
      });

    const result = await marketClient.fetchOHLCV('TEST_RETRY');
    
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should return error when API returns 502', async () => {
    (idbClient.getData as jest.Mock).mockResolvedValue([]);
    
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 502,
      ok: false,
      json: async () => ({ error: 'Market provider down' })
    });

    const result = await marketClient.fetchOHLCV('TEST_FAIL');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Market provider down');
  });

  it('should use local DB data if it is fresh (< 24h)', async () => {
    const freshDate = new Date();
    freshDate.setHours(freshDate.getHours() - 2); // 2 hours ago
    
    const localData = [
      { date: freshDate.toISOString(), open: 100, high: 110, low: 90, close: 105, volume: 1000 }
    ];

    (idbClient.getData as jest.Mock).mockResolvedValue(localData);

    const result = await marketClient.fetchOHLCV('TEST_FRESH');

    expect(result.success).toBe(true);
    expect(result.source).toBe('idb');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
