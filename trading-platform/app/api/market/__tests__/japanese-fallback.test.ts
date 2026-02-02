/**
 * @jest-environment node
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chart: jest.fn(),
      quote: jest.fn()
    }))
  };
});

// Mock error handler
jest.mock('@/app/lib/error-handler', () => ({
  handleApiError: jest.fn((error) => {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }),
  validationError: jest.fn((message) => {
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  })
}));

// Mock rate limit
jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => null)
}));

describe('Market API - Japanese Stock Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return metadata for Japanese stock with intraday interval', async () => {
    const YahooFinance = require('yahoo-finance2').default;
    const yf = new YahooFinance();
    
    yf.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date('2024-01-29'),
          open: 3580,
          high: 3600,
          low: 3550,
          close: 3590,
          volume: 1000000
        }
      ],
      meta: {
        currency: 'JPY',
        symbol: '7203.T',
        regularMarketPrice: 3590
      }
    });

    const request = new NextRequest('http://localhost:3000/api/market?type=history&symbol=7203&market=japan&interval=1m');
    const response = await GET(request);
    const data = await response.json();

    expect(data.metadata).toBeDefined();
    expect(data.metadata.isJapaneseStock).toBe(true);
    expect(data.metadata.dataDelayMinutes).toBe(20);
    expect(data.metadata.fallbackApplied).toBe(true);
    expect(data.metadata.requestedInterval).toBe('1m');
    expect(data.metadata.interval).toBe('1d'); // Fell back to daily
  });

  it('should return metadata for Japanese stock with daily interval', async () => {
    const YahooFinance = require('yahoo-finance2').default;
    const yf = new YahooFinance();
    
    yf.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date('2024-01-29'),
          open: 3580,
          high: 3600,
          low: 3550,
          close: 3590,
          volume: 1000000
        }
      ],
      meta: {
        currency: 'JPY',
        symbol: '7203.T',
        regularMarketPrice: 3590
      }
    });

    const request = new NextRequest('http://localhost:3000/api/market?type=history&symbol=7203&market=japan&interval=1d');
    const response = await GET(request);
    const data = await response.json();

    expect(data.metadata).toBeDefined();
    expect(data.metadata.isJapaneseStock).toBe(true);
    expect(data.metadata.dataDelayMinutes).toBe(20);
    expect(data.metadata.fallbackApplied).toBe(false); // No fallback for daily
    expect(data.metadata.requestedInterval).toBe('1d');
    expect(data.metadata.interval).toBe('1d');
  });

  it('should not return delay metadata for US stock', async () => {
    const YahooFinance = require('yahoo-finance2').default;
    const yf = new YahooFinance();
    
    yf.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date('2024-01-29T09:30:00'),
          open: 185,
          high: 186,
          low: 184,
          close: 185.5,
          volume: 50000000
        }
      ],
      meta: {
        currency: 'USD',
        symbol: 'AAPL',
        regularMarketPrice: 185.5
      }
    });

    const request = new NextRequest('http://localhost:3000/api/market?type=history&symbol=AAPL&market=usa&interval=1m');
    const response = await GET(request);
    const data = await response.json();

    expect(data.metadata).toBeDefined();
    expect(data.metadata.isJapaneseStock).toBe(false);
    expect(data.metadata.dataDelayMinutes).toBeUndefined();
    expect(data.metadata.fallbackApplied).toBe(false);
  });

  it('should return warning message for Japanese stock with intraday interval', async () => {
    const YahooFinance = require('yahoo-finance2').default;
    const yf = new YahooFinance();
    
    yf.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date('2024-01-29'),
          open: 3580,
          high: 3600,
          low: 3550,
          close: 3590,
          volume: 1000000
        }
      ],
      meta: {
        currency: 'JPY',
        symbol: '7203.T',
        regularMarketPrice: 3590
      }
    });

    const request = new NextRequest('http://localhost:3000/api/market?type=history&symbol=7203&market=japan&interval=5m');
    const response = await GET(request);
    const data = await response.json();

    expect(data.warning).toBeDefined();
    expect(data.warning).toContain('Intraday data');
    expect(data.warning).toContain('not available');
    expect(data.warning).toContain('Daily data is shown instead');
  });

  it('should handle all intraday intervals for Japanese stocks', async () => {
    const YahooFinance = require('yahoo-finance2').default;
    const yf = new YahooFinance();
    
    yf.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date('2024-01-29'),
          open: 3580,
          high: 3600,
          low: 3550,
          close: 3590,
          volume: 1000000
        }
      ],
      meta: {
        currency: 'JPY',
        symbol: '7203.T',
        regularMarketPrice: 3590
      }
    });

    const intervals = ['1m', '5m', '15m', '1h', '4H'];

    for (const interval of intervals) {
      const request = new NextRequest(`http://localhost:3000/api/market?type=history&symbol=7203&market=japan&interval=${interval}`);
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata.fallbackApplied).toBe(true);
      expect(data.metadata.interval).toBe('1d');
      expect(data.warning).toContain('Intraday data');
    }
  });
});
