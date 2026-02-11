/**
 * @jest-environment node
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

const mockChart = jest.fn();
const mockQuote = jest.fn();

jest.mock('yahoo-finance2', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chart: (...args: unknown[]) => mockChart(...args),
      quote: (...args: unknown[]) => mockQuote(...args),
    }))
  };
});

jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => null)
}));

describe('Market API - Japanese Stock Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return metadata for Japanese stock with intraday interval', async () => {
    mockChart.mockResolvedValue({
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
    expect(data.metadata.fallbackApplied).toBe(true);
    expect(data.metadata.interval).toBe('1d');
  });

  it('should return metadata for Japanese stock with daily interval', async () => {
    mockChart.mockResolvedValue({
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
    expect(data.metadata.fallbackApplied).toBe(false);
    expect(data.metadata.interval).toBe('1d');
  });

  it('should not return delay metadata for US stock', async () => {
    mockChart.mockResolvedValue({
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
    expect(data.metadata.fallbackApplied).toBe(false);
  });

  it('should return warning message for Japanese stock with intraday interval', async () => {
    mockChart.mockResolvedValue({
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

    expect(data.warnings).toBeDefined();
    expect(data.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('イントラデイデータ'),
      ])
    );
  });

  it('should handle all intraday intervals for Japanese stocks', async () => {
    const intervals = ['1m', '5m', '15m', '1h', '4h'];

    for (const interval of intervals) {
      mockChart.mockResolvedValue({
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

      const request = new NextRequest(`http://localhost:3000/api/market?type=history&symbol=7203&market=japan&interval=${interval}`);
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata.fallbackApplied).toBe(true);
      expect(data.metadata.interval).toBe('1d');
      expect(data.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('イントラデイデータ'),
        ])
      );
    }
  });
});
