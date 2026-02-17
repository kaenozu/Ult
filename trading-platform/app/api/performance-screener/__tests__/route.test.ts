/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/app/lib/PerformanceScreenerService', () => ({
  performanceScreenerService: {
    scanMultipleStocks: jest.fn().mockResolvedValue({
      results: [],
      totalScanned: 0,
      filteredCount: 0,
      scanDuration: 0,
      lastUpdated: new Date().toISOString(),
    }),
    clearCache: jest.fn(),
  },
}));

jest.mock('@/app/data/stocks', () => ({
  JAPAN_STOCKS: [],
  USA_STOCKS: [],
  fetchOHLCV: jest.fn().mockResolvedValue([]),
}));

// Mock auth middleware - intentionally returning 401 to test if it's called
jest.mock('@/app/lib/auth', () => ({
  requireAuth: jest.fn(() => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })),
}));

// Mock rate limiter - intentionally returning 429 to test if it's called
jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })),
}));

describe.skip('Performance Screener API Security', () => {

  describe('GET /api/performance-screener (Rate Limiting)', () => {
    it('should be rate limited', async () => {
      const req = new NextRequest('http://localhost:3000/api/performance-screener');
      const res = await GET(req);

      // If checkRateLimit is called, it returns 429 (mocked).
      // If NOT called, it returns 200 (default success path).
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ error: 'Too Many Requests' });
    });
  });

  describe('POST /api/performance-screener (Authentication)', () => {
    it('should require authentication to clear cache', async () => {
      const req = new NextRequest('http://localhost:3000/api/performance-screener', {
        method: 'POST',
        body: JSON.stringify({ action: 'clear-cache' }),
      });
      const res = await POST(req);

      // If requireAuth is called, it returns 401 (mocked).
      // If NOT called, it returns 200 (default success path).
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });
  });

});
