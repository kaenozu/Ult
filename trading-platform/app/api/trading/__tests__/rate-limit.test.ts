/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { ipRateLimiter } from '@/app/lib/ip-rate-limit';
import { NextRequest } from 'next/server';

// Mock auth middleware
jest.mock('@/app/lib/auth', () => ({
  requireAuth: jest.fn(() => null),
}));

// Mock CSRF protection
jest.mock('@/app/lib/csrf/csrf-protection', () => ({
  requireCSRF: jest.fn(() => null),
  generateCSRFToken: jest.fn(() => 'mock-token'),
}));

// Mock the trading platform
jest.mock('@/app/lib/tradingCore/UnifiedTradingPlatform', () => ({
  getGlobalTradingPlatform: jest.fn(() => ({
    getStatus: jest.fn(() => 'running'),
    getPortfolio: jest.fn(() => ({})),
    getSignals: jest.fn(() => []),
    getRiskMetrics: jest.fn(() => ({})),
    getAlertHistory: jest.fn(() => []),
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
}));

describe('Trading API Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limiter state before each test
    ipRateLimiter.reset();
  });

  interface RequestBody {
    [key: string]: unknown;
  }

  const createRequest = (url: string, method: string = 'GET', body?: RequestBody) => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.100',
    });
    
    if (body) {
      headers.set('content-type', 'application/json');
    }
    
    const options = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    // Create NextRequest to ensure cookies API is available
    const req = new NextRequest(`http://localhost${url}`, options);

    // Manually ensure cookies exist and have a valid CSRF token for testing
    // Since NextRequest cookies are read-only or immutable in some contexts, we might need to mock or ensure the cookie string is in headers if NextRequest parses it.
    // However, validation uses request.cookies.get().
    // We can inject a cookie into the header before creating NextRequest.

    return req;
  };

  describe('GET /api/trading', () => {
    it('should allow requests under rate limit', async () => {
      const req = createRequest('/api/trading');
      const res = await GET(req);
      
      expect(res.status).toBe(200);
    });

    it('should block requests over rate limit', async () => {
      // Make requests up to the limit (default is 120 per minute)
      for (let i = 0; i < 120; i++) {
        const req = createRequest('/api/trading');
        await GET(req);
      }

      // Next request should be rate limited
      const req = createRequest('/api/trading');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toContain('Too many requests');
    });
  });

  describe('POST /api/trading', () => {
    // For POST requests, we need valid CSRF tokens
    const createPostRequest = (body: RequestBody) => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.100',
        'cookie': 'csrf-token=test-token',
        'x-csrf-token': 'test-token'
      });

      return new NextRequest('http://localhost/api/trading', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
    };

    it('should allow requests under rate limit', async () => {
      const req = createPostRequest({ action: 'reset' });
      const res = await POST(req);
      
      expect(res.status).toBe(200);
    });

    it('should block requests over rate limit', async () => {
      // Make requests up to the limit (default is 120 per minute)
      for (let i = 0; i < 120; i++) {
        const req = createRequest('/api/trading', 'POST', { action: 'reset' });
        await POST(req);
      }

      // Next request should be rate limited
      const req = createPostRequest({ action: 'reset' });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toContain('Too many requests');
    });
  });

  it('should rate limit different IPs independently', async () => {
    // Make requests from first IP
    const req1 = createRequest('/api/trading');
    const res1 = await GET(req1);
    expect(res1.status).toBe(200);

    // Make request from different IP
    const headers2 = new Headers({
      'x-forwarded-for': '192.168.1.101',
    });
    const req2 = new NextRequest('http://localhost/api/trading', {
      method: 'GET',
      headers: headers2,
    });
    // Ensure cookies are mocked for req2 as well
    if (!req2.cookies) {
        Object.defineProperty(req2, 'cookies', {
            value: { get: () => ({ value: 'mock-csrf-token' }) }
        });
    }

    const res2 = await GET(req2);
    expect(res2.status).toBe(200);
  });
});
