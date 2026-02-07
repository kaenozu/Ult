/**
 * MarketDataClient Integration Test
 * Tests using the exported marketClient instance
 */

import { marketClient } from '../data-aggregator';
import { generateMockOHLCV } from './test-utils';

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock IndexedDB for JSDOM
const mockIndexedDB = {
  open: jest.fn(() => ({
    onsuccess: jest.fn(),
    onerror: jest.fn(),
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          getAll: jest.fn(() => ({
            onsuccess: jest.fn(),
            onerror: jest.fn()
          })),
          add: jest.fn(),
          clear: jest.fn()
        }))
      }))
    }
  }))
};

global.indexedDB = mockIndexedDB;

describe('MarketDataClient Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should export marketClient instance', () => {
      expect(marketClient).toBeDefined();
      expect(typeof marketClient.fetchOHLCV).toBe('function');
    });

    it('should handle empty data gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      const result = await marketClient.fetchOHLCV('EMPTY', 1, 'daily');
      expect(result).toEqual([]);
    });

    it('should fetch daily data successfully', async () => {
      const mockData = generateMockOHLCV(1000, 60);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('TEST', 1, 'daily');
      expect(result).toHaveLength(60);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(marketClient.fetchOHLCV('TEST', 1, 'daily'))
        .rejects.toThrow('Network error');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      await expect(marketClient.fetchOHLCV('TEST', 1, 'daily'))
        .rejects.toThrow();
    });
  });

  describe('Data Processing', () => {
    it('should validate OHLCV data structure', async () => {
      const mockData = generateMockOHLCV(1000, 30);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData })
      });

      const result = await marketClient.fetchOHLCV('TEST', 1, 'daily');
      
      // Check data structure
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('high');
      expect(result[0]).toHaveProperty('low');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).toHaveProperty('volume');
      expect(result[0]).toHaveProperty('timestamp');
    });
  });
});