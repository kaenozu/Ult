/**
 * Tests for IndexedDB Client
 *
 * Tests local data storage operations
 */

import { IndexedDBClient, idbClient } from '../idb';
import { OHLCV } from '@/app/types';

describe('IndexedDB Client', () => {
  let client: IndexedDBClient;
  let mockOpenRequest: unknown;
  let mockDB: unknown;
  let mockStore: unknown;

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

    jest.spyOn(window.indexedDB, 'open').mockImplementation(() => {
      setTimeout(() => {
        if (mockOpenRequest.onsuccess) {
          mockOpenRequest.onsuccess({ target: mockOpenRequest });
        }
      }, 0);
      return mockOpenRequest;
    });
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

  describe('getData', () => {
    it('should retrieve data from store', async () => {
      const mockResult = [{ date: '2023-01-01', close: 100 }];
      const getRequest = { result: mockResult, onsuccess: null, onerror: null };

      // Auto-trigger onsuccess for store.get
      (mockStore as any).get.mockImplementation(() => {
        setTimeout(() => {
          if (getRequest.onsuccess) (getRequest.onsuccess as any)();
        }, 0);
        return getRequest;
      });

      const result = await client.getData('AAPL');

      expect(result).toEqual(mockResult);
      expect((mockStore as any).get).toHaveBeenCalledWith('AAPL');
    });

    it('should return empty array on null result', async () => {
      const getRequest = { result: null, onsuccess: null, onerror: null };
      (mockStore as any).get.mockImplementation(() => {
        setTimeout(() => {
          if (getRequest.onsuccess) (getRequest.onsuccess as any)();
        }, 0);
        return getRequest;
      });

      const result = await client.getData('AAPL');
      expect(result).toEqual([]);
    });
  });

  describe('saveData', () => {
    it('should save sorted data', async () => {
      const data = [
        { date: '2023-01-02', close: 110 } as any,
        { date: '2023-01-01', close: 100 } as any
      ];

      const putRequest = { onsuccess: null, onerror: null };
      (mockStore as any).put.mockImplementation(() => {
        setTimeout(() => {
          if (putRequest.onsuccess) (putRequest.onsuccess as any)();
        }, 0);
        return putRequest;
      });

      await client.saveData('AAPL', data);

      expect((mockStore as any).put).toHaveBeenCalled();
      const savedData = (mockStore as any).put.mock.calls[0][0];
      expect(savedData[0].date).toBe('2023-01-01');
    });
  });

  describe('mergeAndSave', () => {
    it('should merge and save data', async () => {
      const existing = [{ date: '2023-01-01', close: 100 } as any];
      const getRequest = { result: existing, onsuccess: null };
      (mockStore as any).get.mockImplementation(() => {
        setTimeout(() => {
          if (getRequest.onsuccess) (getRequest.onsuccess as any)();
        }, 0);
        return getRequest;
      });

      const putRequest = { onsuccess: null };
      (mockStore as any).put.mockImplementation(() => {
        setTimeout(() => {
          if (putRequest.onsuccess) (putRequest.onsuccess as any)();
        }, 0);
        return putRequest;
      });

      const newData = [{ date: '2023-01-02', close: 110 } as any];

      const result = await client.mergeAndSave('AAPL', newData);
      expect(result).toHaveLength(2);
      expect((mockStore as any).put).toHaveBeenCalled();
    });
  });

  describe('clearAllData', () => {
    it('should clear object store', async () => {
      const clearRequest = { onsuccess: null, onerror: null };
      (mockStore as any).clear.mockImplementation(() => {
        setTimeout(() => {
          if (clearRequest.onsuccess) (clearRequest.onsuccess as any)();
        }, 0);
        return clearRequest;
      });

      await client.clearAllData();
      expect((mockStore as any).clear).toHaveBeenCalled();
    });
  });
});
