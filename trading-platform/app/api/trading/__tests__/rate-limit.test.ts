/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { ipRateLimiter } from '@/app/lib/ip-rate-limit';

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
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
      headers.set('content-type', 'application/json');
    }
    
    return new Request(`http://localhost${url}`, options);
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
      expect(json.error).toContain('リクエスト回数の上限を超えました');
    });
  });

  describe('POST /api/trading', () => {
    it('should allow requests under rate limit', async () => {
      const req = createRequest('/api/trading', 'POST', { action: 'reset' });
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
      const req = createRequest('/api/trading', 'POST', { action: 'reset' });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toContain('リクエスト回数の上限を超えました');
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
    const req2 = new Request('http://localhost/api/trading', {
      method: 'GET',
      headers: headers2,
    });
    const res2 = await GET(req2);
    expect(res2.status).toBe(200);
  });
});
