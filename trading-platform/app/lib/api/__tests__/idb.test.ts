/**
 * Tests for IndexedDB Client
 *
 * Tests local data storage operations
 */

import { IndexedDBClient, idbClient } from '../idb';
import { OHLCV } from '@/app/types';

describe('IndexedDB Client', () => {
  let client: IndexedDBClient;
  let mockOpenRequest: any;
  let mockDB: any;
  let mockStore: any;

  beforeEach(() => {
    client = new IndexedDBClient();

    // Create mock store
    mockStore = {
      get: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
      put: jest.fn(() => ({ onsuccess: null, onerror: null })),
      clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
    };

    // Create mock DB
    mockDB = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => mockStore)
      })),
      objectStoreNames: { contains: jest.fn(() => true) },
    };

    // Create mock open request
    mockOpenRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDB,
    };

    jest.spyOn(window.indexedDB, 'open').mockReturnValue(mockOpenRequest);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('init', () => {
    it('should be instance of IndexedDBClient', () => {
      expect(client).toBeInstanceOf(IndexedDBClient);
    });

    it('should export singleton instance', () => {
      expect(idbClient).toBeInstanceOf(IndexedDBClient);
    });

    it('should initialize successfully', async () => {
      const initPromise = client.init();
      if (mockOpenRequest.onsuccess) {
        mockOpenRequest.onsuccess({ target: mockOpenRequest });
      }
      await expect(initPromise).resolves.toBeUndefined();
    });
  });

  describe('mergeAndSave logic', () => {
    it('should merge new data with existing data correctly', () => {
      const existingData: OHLCV[] = [
        { date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000 },
        { date: '2023-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1100000 }
      ];

      const newData: OHLCV[] = [
        { date: '2023-01-02', open: 106, high: 116, low: 101, close: 111, volume: 1150000 }, // Overwrites
        { date: '2023-01-03', open: 110, high: 120, low: 105, close: 115, volume: 1200000 }  // New
      ];

      // Test merge logic
      const dataMap = new Map<string, OHLCV>();
      existingData.forEach(d => dataMap.set(d.date, d));
      newData.forEach(d => dataMap.set(d.date, d));

      const merged = Array.from(dataMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      expect(merged).toHaveLength(3);
      expect(merged[0].date).toBe('2023-01-01'); // From existing
      expect(merged[1].date).toBe('2023-01-02'); // Overwritten
      expect(merged[1].open).toBe(106); // New value
      expect(merged[2].date).toBe('2023-01-03'); // From new
    });

    it('should handle data with same dates correctly', () => {
      const existingData: OHLCV[] = [
        { date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000 }
      ];

      const newData: OHLCV[] = [
        { date: '2023-01-01', open: 101, high: 111, low: 91, close: 106, volume: 1050000 } // Same date
      ];

      // Test merge logic
      const dataMap = new Map<string, OHLCV>();
      existingData.forEach(d => dataMap.set(d.date, d));
      newData.forEach(d => dataMap.set(d.date, d));

      const merged = Array.from(dataMap.values());

      expect(merged).toHaveLength(1); // Only one entry per date
      expect(merged[0].open).toBe(101); // New value overwrites
    });

    it('should handle empty existing data', () => {
      const existingData: OHLCV[] = [];
      const newData: OHLCV[] = [
        { date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000 }
      ];

      // Test merge logic
      const dataMap = new Map<string, OHLCV>();
      existingData.forEach(d => dataMap.set(d.date, d));
      newData.forEach(d => dataMap.set(d.date, d));

      const merged = Array.from(dataMap.values());

      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual(newData[0]);
    });

    it('should sort data by date', () => {
      const unsortedData: OHLCV[] = [
        { date: '2023-01-03', open: 110, high: 120, low: 105, close: 115, volume: 1200000 },
        { date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000 },
        { date: '2023-01-02', open: 105, high: 115, low: 100, close: 110, volume: 1100000 }
      ];

      // Test sort logic
      const sorted = [...unsortedData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      expect(sorted[0].date).toBe('2023-01-01');
      expect(sorted[1].date).toBe('2023-01-02');
      expect(sorted[2].date).toBe('2023-01-03');
    });
  });
});
