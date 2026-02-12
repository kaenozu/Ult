/**
 * Data Aggregator - TDD Test Suite
 * Tests the improved data fetching and caching logic
 */

import { marketClient } from '@/app/lib/api/data-aggregator';
import { generateMockOHLCV as generateMock } from './test-helpers';

const generateMockOHLCV = (startPrice: number, count: number) => 
  generateMock(startPrice, count);

// Mock IndexedDB client
let mockIdbStorage: Record<string, any[]> = {};

jest.mock('@/app/lib/api/idb-migrations', () => ({
  idbClient: {
    getData: jest.fn((symbol) => Promise.resolve(mockIdbStorage[symbol] || [])),
    saveData: jest.fn((symbol, data) => {
      mockIdbStorage[symbol] = data;
      return Promise.resolve();
    }),
    mergeAndSave: jest.fn((symbol, data) => {
      const existing = mockIdbStorage[symbol] || [];
      const merged = [...existing, ...data]; // Simple merge for mock
      mockIdbStorage[symbol] = merged;
      return Promise.resolve(merged);
    })
  }
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Data Aggregator - Improved Data Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    marketClient.clearCache();
    mockIdbStorage = {};
    (global.fetch as jest.Mock).mockReset();
  });

  describe('fetchOHLCV - Daily Data', () => {
    test('should fetch 1 year of historical data from API', async () => {
      const mockData = generateMockOHLCV(1000, 365);
      
      mockIdbStorage['TEST'] = [];
      (global.fetch as jest.Mock).mockReset();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(365);
      expect(result.source).toBe('api');
    });

    test('should save data to IndexedDB after API fetch', async () => {
      const mockData = generateMockOHLCV(1000, 365);
      
      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      // Using shared mock storage
      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(true);
      expect(result.source).toBe('api');
      // Verify mock storage has data
      expect(mockIdbStorage['TEST']).toHaveLength(365);
    });

    test('should use cached data when available', async () => {
      const mockData = generateMockOHLCV(1000, 365);
      
      // Ensure the data is very recent to avoid "needs update"
      const today = new Date().toISOString().split('T')[0];
      mockData[mockData.length - 1].date = today;
      
      mockIdbStorage['TEST'] = mockData;
      (global.fetch as jest.Mock).mockReset();

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(365);
      expect(result.source).toBe('idb');
      
      // API should not be called when cached data is available and fresh
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should return idb data even if stale (SWR handled by hook)', async () => {
      const oldData = generateMockOHLCV(1000, 200);
      // Make the data stale by moving dates back
      oldData.forEach(d => {
        const date = new Date(d.date);
        date.setDate(date.getDate() - 2);
        d.date = date.toISOString().split('T')[0];
      });
      
      mockIdbStorage['TEST'] = oldData;
      
      // Mock fetch to fail, so we fallback/return stale data
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Fetch failed' })
      });

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(200);
      expect(result.source).toBe('idb');
    });
  });

  describe('fetchOHLCV - Intraday Data', () => {
    test('should fetch 30 days of intraday data for 1m interval', async () => {
      const mockData = generateMockOHLCV(1000, 30);
      
      // Mock API response for intraday data
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('TEST', 'japan', undefined, undefined, '1m');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(30);
      expect(result.source).toBe('api');
    });

    test('should not cache intraday data', async () => {
      const mockData = generateMockOHLCV(1000, 30);
      
      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      // Using shared mock storage

      const result = await marketClient.fetchOHLCV('TEST', 'japan', undefined, undefined, '1m');

      expect(result.success).toBe(true);
      expect(result.source).toBe('api');
      
      // Should not save intraday data to cache/IDB via mergeAndSave
      // Note: DataAggregator might not call mergeAndSave for intraday, or only setCache (memory).
      // Test expectation:
      const idbClient = require('@/app/lib/api/idb-migrations').idbClient;
      // Depending on implementation, it might or might not save to IDB.
      // My implementation of intraday logic: "Intraday data should always be fetched fresh from API, not from IndexedDB... Don't cache intraday data"
      // It does NOT call mergeAndSave for intraday in the code.
      expect(mockIdbStorage['TEST']).toBeUndefined();
    });

    test('should handle different intraday intervals', async () => {
      const mockData5m = generateMockOHLCV(1000, 30);
      const mockData1h = generateMockOHLCV(1000, 30);
      
      // Test 5m interval
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData5m })
      });

      const result5m = await marketClient.fetchOHLCV('TEST', 'japan', undefined, undefined, '5m');
      expect(result5m.success).toBe(true);
      expect(result5m.data).toHaveLength(30);

      // Test 1h interval
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData1h })
      });

      const result1h = await marketClient.fetchOHLCV('TEST', 'japan', undefined, undefined, '1h');
      expect(result1h.success).toBe(true);
      expect(result1h.data).toHaveLength(30);
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    test('should handle rate limiting', async () => {
      // Mock rate limit error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    test('should handle empty API response', async () => {
      // Mock empty response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    test('should handle malformed API response', async () => {
      // Mock malformed response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('Data Interpolation', () => {
    test('should interpolate missing data points', async () => {
      // Create data with gaps
      const mockData = generateMockOHLCV(1000, 10);
      
      // Add a gap by removing some middle data
      const dataWithGaps = [
        mockData[0],
        mockData[1],
        mockData[2],
        // Gap here (missing data for several days)
        mockData[7],
        mockData[8],
        mockData[9]
      ];

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: dataWithGaps })
      });

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(true);
      // Should interpolate to fill gaps
      expect(result.data.length).toBeGreaterThan(dataWithGaps.length);
      // Should not have zero values in the middle
      const middleData = result.data.slice(3, 6);
      expect(middleData.every(point => point.close !== 0)).toBe(true);
    });

    test('should handle weekend gaps correctly', async () => {
      // Create data spanning weekends
      const mockData = generateMockOHLCV(1000, 10);
      
      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('TEST', 'japan');

      expect(result.success).toBe(true);
      // Should handle weekend gaps appropriately
      expect(result.data.length).toBeGreaterThanOrEqual(mockData.length);
    });
  });

  describe('Performance', () => {
    test('should complete API fetch quickly', async () => {
      const mockData = generateMockOHLCV(1000, 365);
      
      mockIdbStorage['TEST'] = [];
      (global.fetch as jest.Mock).mockReset();
      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      const startTime = performance.now();
      
      const result = await marketClient.fetchOHLCV('TEST', 'japan');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(365);
      // Should complete quickly even with large dataset
      expect(duration).toBeLessThan(1000);
    });

    test('should handle concurrent requests efficiently', async () => {
      const mockData1 = generateMockOHLCV(1000, 365);
      const mockData2 = generateMockOHLCV(1050, 365);
      
      // Mock API responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData1 })
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockData2 })
      });

      const startTime = performance.now();
      
      // Make concurrent requests
      const [result1, result2] = await Promise.all([
        marketClient.fetchOHLCV('TEST1', 'japan'),
        marketClient.fetchOHLCV('TEST2', 'japan')
      ]);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(1500);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle Panasonic (7203) data fetching', async () => {
      const mockData = generateMockOHLCV(3742, 365);
      
      mockIdbStorage['7203'] = [];
      (global.fetch as jest.Mock).mockReset();
      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('7203', 'japan');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(365);
      expect(result.source).toBe('api');
      
      // Verify data structure
      const firstPoint = result.data[0];
      expect(firstPoint).toHaveProperty('date');
      expect(firstPoint).toHaveProperty('open');
      expect(firstPoint).toHaveProperty('high');
      expect(firstPoint).toHaveProperty('low');
      expect(firstPoint).toHaveProperty('close');
      expect(firstPoint).toHaveProperty('volume');
    });

    test('should handle Hino Motors (7205) data fetching', async () => {
      const mockData = generateMockOHLCV(500, 365);
      
      mockIdbStorage['7205'] = [];
      (global.fetch as jest.Mock).mockReset();
      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('7205', 'japan');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(365);
      expect(result.source).toBe('api');
    });

    test('should handle US market data fetching', async () => {
      const mockData = generateMockOHLCV(150, 365);
      
      mockIdbStorage['AAPL'] = [];
      (global.fetch as jest.Mock).mockReset();
      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('AAPL', 'usa');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(365);
      expect(result.source).toBe('api');
    });
  });
});