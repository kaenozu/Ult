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

// Mock CSRF middleware - bypass for these tests
jest.mock('@/app/lib/csrf/csrf-protection', () => ({
  requireCSRF: jest.fn(() => null),
}));

// Mock rate limiter
import { checkRateLimit } from '@/app/lib/api-middleware';
jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => null),
}));

describe('Performance Screener API Security', () => {

  describe('GET /api/performance-screener (Rate Limiting)', () => {
    it('should be rate limited', async () => {
      (checkRateLimit as jest.Mock).mockReturnValueOnce(NextResponse.json({ error: 'Too Many Requests' }, { status: 429 }));
      const req = new NextRequest('http://localhost:3000/api/performance-screener');
      const res = await GET(req);

      // If checkRateLimit is called, it returns 429 (mocked).
      // If NOT called, it returns 200 (default success path).
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ error: 'Too Many Requests' });
    });
  });

});
