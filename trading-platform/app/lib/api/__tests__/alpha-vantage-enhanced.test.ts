/**
 * Enhanced tests for Alpha Vantage API Client
 *
 * Tests error handling, validation, and edge cases
 */

import { validateAlphaVantageResponse, handleAlphaVantageFetch, AlphaVantageClient } from '../alpha-vantage';
import { APIError, RateLimitError, isAlphaVantageError } from '@/app/types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Alpha Vantage API - Enhanced Tests', () => {

  describe('validateAlphaVantageResponse', () => {
    it('should not throw for valid data without error fields', () => {
      const validData = {
        'Time Series (Daily)': {
          '2023-01-01': {
            '1. open': '100',
            '2. high': '110',
            '3. low': '90',
            '4. close': '105',
            '5. volume': '1000000'
          }
        }
      };

      expect(() => validateAlphaVantageResponse(validData)).not.toThrow();
    });

    it('should not throw for non-object data', () => {
      expect(() => validateAlphaVantageResponse(null)).not.toThrow();
      expect(() => validateAlphaVantageResponse(undefined)).not.toThrow();
      expect(() => validateAlphaVantageResponse('string')).not.toThrow();
      expect(() => validateAlphaVantageResponse(123)).not.toThrow();
      expect(() => validateAlphaVantageResponse([])).not.toThrow();
    });

    it('should throw APIError for Error Message field', () => {
      const errorData = {
        'Error Message': 'Invalid API key'
      };

      expect(() => validateAlphaVantageResponse(errorData)).toThrow(APIError);
      expect(() => validateAlphaVantageResponse(errorData)).toThrow('Invalid API key');
    });

    it('should throw RateLimitError for Note field', () => {
      const rateLimitData = {
        'Note': 'Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.'
      };

      expect(() => validateAlphaVantageResponse(rateLimitData)).toThrow(RateLimitError);
      expect(() => validateAlphaVantageResponse(rateLimitData)).toThrow('Thank you for using Alpha Vantage');
    });

    it('should throw APIError for Information field', () => {
      const infoData = {
        'Information': 'Please upgrade to premium API'
      };

      expect(() => validateAlphaVantageResponse(infoData)).toThrow(APIError);
      expect(() => validateAlphaVantageResponse(infoData)).toThrow('Please upgrade to premium API');
    });
  });

  describe('isAlphaVantageError type guard', () => {
    it('should return true for error response with Error Message', () => {
      const errorData = {
        'Error Message': 'Invalid API key'
      };

      expect(isAlphaVantageError(errorData)).toBe(true);
    });

    it('should return true for error response with Note', () => {
      const rateLimitData = {
        'Note': 'Rate limit exceeded'
      };

      expect(isAlphaVantageError(rateLimitData)).toBe(true);
    });

    it('should return true for error response with Information', () => {
      const infoData = {
        'Information': 'Premium endpoint'
      };

      expect(isAlphaVantageError(infoData)).toBe(true);
    });

    it('should return false for valid response', () => {
      const validData = {
        'Time Series (Daily)': {}
      };

      expect(isAlphaVantageError(validData)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isAlphaVantageError(null)).toBe(false);
      expect(isAlphaVantageError(undefined)).toBe(false);
      expect(isAlphaVantageError('string')).toBe(false);
      expect(isAlphaVantageError(123)).toBe(false);
      expect(isAlphaVantageError([])).toBe(false);
    });

    it('should return false for object without error fields', () => {
      expect(isAlphaVantageError({})).toBe(false);
      expect(isAlphaVantageError({ data: 'value' })).toBe(false);
    });
  });

  describe('handleAlphaVantageFetch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return parsed JSON for successful response', async () => {
      const mockData = { result: 'success' };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockData
      } as unknown as Response;

      const result = await handleAlphaVantageFetch(mockResponse);
      expect(result).toEqual(mockData);
    });

    it('should throw NetworkError for failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      } as unknown as Response;

      await expect(handleAlphaVantageFetch(mockResponse)).rejects.toThrow('Alpha Vantage API Error: 500 Internal Server Error');
    });

    it('should validate response and throw for API errors', async () => {
      const mockErrorData = {
        'Error Message': 'Invalid API key'
      };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockErrorData
      } as unknown as Response;

      await expect(handleAlphaVantageFetch(mockResponse)).rejects.toThrow(APIError);
      await expect(handleAlphaVantageFetch(mockResponse)).rejects.toThrow('Invalid API key');
    });

    it('should validate response and throw for rate limit errors', async () => {
      const mockRateLimitData = {
        'Note': 'Rate limit exceeded'
      };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockRateLimitData
      } as unknown as Response;

      await expect(handleAlphaVantageFetch(mockResponse)).rejects.toThrow(RateLimitError);
    });
  });

  describe('AlphaVantageClient', () => {
    let client: AlphaVantageClient;

    beforeEach(() => {
      client = new AlphaVantageClient({
        apiKey: 'test-api-key',
        baseUrl: 'https://test.api/query'
      });
      jest.clearAllMocks();
    });

    describe('constructor', () => {
      it('should initialize with provided config', () => {
        expect(client).toBeDefined();
      });

      it('should use default baseUrl if not provided', () => {
        const defaultClient = new AlphaVantageClient({
          apiKey: 'test-key'
        });
        expect(defaultClient).toBeDefined();
      });
    });

    describe('getDailyBars', () => {
      it('should use compact outputsize by default', async () => {
        const mockData = {
          'Time Series (Daily)': {
            '2023-01-01': {
              '1. open': '100',
              '2. high': '110',
              '3. low': '90',
              '4. close': '105',
              '5. volume': '1000000'
            }
          }
        };

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockData
        };

        const mockFetch = jest.fn().mockResolvedValue(mockResponse);
        global.fetch = mockFetch as any;

        await client.getDailyBars('AAPL');

        expect(mockFetch).toHaveBeenCalled();
        const url = new URL((mockFetch as any).mock.calls[0][0]);
        expect(url.searchParams.get('outputsize')).toBe('compact');
      });

      it('should use full outputsize when specified', async () => {
        const mockData = {
          'Time Series (Daily)': {}
        };

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockData
        };

        const mockFetch = jest.fn().mockResolvedValue(mockResponse);
        global.fetch = mockFetch as any;

        await client.getDailyBars('AAPL', 'full');

        expect(mockFetch).toHaveBeenCalled();
        const url = new URL((mockFetch as any).mock.calls[0][0]);
        expect(url.searchParams.get('outputsize')).toBe('full');
      });

      it('should sort data by timestamp ascending', async () => {
        const mockData = {
          'Time Series (Daily)': {
            '2023-01-03': { '1. open': '100', '2. high': '110', '3. low': '90', '4. close': '105', '5. volume': '1000' },
            '2023-01-01': { '1. open': '95', '2. high': '100', '3. low': '90', '4. close': '98', '5. volume': '900' },
            '2023-01-02': { '1. open': '98', '2. high': '105', '3. low': '95', '4. close': '102', '5. volume': '950' }
          }
        };

        const mockResponse = {
          ok: true,
          status: 200,
          json: async () => mockData
        };

        const mockFetch = jest.fn().mockResolvedValue(mockResponse);
        global.fetch = mockFetch as any;

        const result = await client.getDailyBars('AAPL');

        expect(result.data[0].timestamp).toBe('2023-01-01');
        expect(result.data[1].timestamp).toBe('2023-01-02');
        expect(result.data[2].timestamp).toBe('2023-01-03');
      });
    });
  });

  describe('Error Classes', () => {
    describe('APIError', () => {
      it('should create error with message and code', () => {
        const error = new APIError('Test error', 'TEST_ERROR');
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_ERROR');
        expect(error.name).toBe('APIError');
      });

      it('should create error with status code', () => {
        const error = new APIError('Not found', 'NOT_FOUND', 404);
        expect(error.statusCode).toBe(404);
      });

      it('should create error with details', () => {
        const details = { field: 'value' };
        const error = new APIError('Validation error', 'VALIDATION_ERROR', undefined, details);
        expect(error.details).toEqual(details);
      });
    });

    describe('RateLimitError', () => {
      it('should extend APIError with correct defaults', () => {
        const error = new RateLimitError('Rate limit exceeded');
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.code).toBe('RATE_LIMIT_ERROR');
        expect(error.statusCode).toBe(429);
        expect(error.name).toBe('RateLimitError');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty time series response', async () => {
      const client = new AlphaVantageClient({ apiKey: 'test-key' });
      const mockData = {
        'Time Series (Daily)': {}
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => mockData
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch as any;

      const result = await client.getDailyBars('AAPL');
      expect(result.data).toEqual([]);
    });

    it('should handle malformed numeric values', async () => {
      const client = new AlphaVantageClient({ apiKey: 'test-key' });
      const mockData = {
        'Time Series (Daily)': {
          '2023-01-01': {
            '1. open': 'invalid',
            '2. high': '110',
            '3. low': '90',
            '4. close': '105',
            '5. volume': '1000000'
          }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => mockData
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch as any;

      const result = await client.getDailyBars('AAPL');
      expect(result.data[0].open).toBeNaN();
    });

    it('should handle very large volume values', async () => {
      const client = new AlphaVantageClient({ apiKey: 'test-key' });
      const mockData = {
        'Time Series (Daily)': {
          '2023-01-01': {
            '1. open': '100',
            '2. high': '110',
            '3. low': '90',
            '4. close': '105',
            '5. volume': '999999999999'
          }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => mockData
      };

      const mockFetch = jest.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch as any;

      const result = await client.getDailyBars('AAPL');
      expect(result.data[0].volume).toBe(999999999999);
    });
  });
});
