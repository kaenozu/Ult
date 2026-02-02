/**
 * @jest-environment node
 */
import { GET } from '../route';
import { ipRateLimiter } from '@/app/lib/ip-rate-limit';

// Mock auth middleware
jest.mock('@/app/lib/auth', () => ({
  requireAuth: jest.fn(() => null),
}));

// Mock the trading platform
jest.mock('@/app/lib/tradingCore/UnifiedTradingPlatform', () => ({
  getGlobalTradingPlatform: jest.fn(() => ({
    getSignal: jest.fn(() => ({ signal: 'BUY', confidence: 0.8 })),
    getMarketData: jest.fn(() => ({ price: 150, volume: 1000000 })),
  })),
}));

describe('Trading Symbol API Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limiter state before each test
    ipRateLimiter.reset();
  });

  const createRequest = (symbol: string) => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.100',
    });
    
    return new Request(`http://localhost/api/trading/${symbol}`, {
      method: 'GET',
      headers,
    });
  };

  const createContext = (symbol: string) => ({
    params: Promise.resolve({ symbol }),
  });

  it('should allow requests under rate limit', async () => {
    const req = createRequest('AAPL');
    const context = createContext('AAPL');
    const res = await GET(req, context);
    
    expect(res.status).toBe(200);
  });

  it('should block requests over rate limit', async () => {
    // Make requests up to the limit (default is 60 per minute)
    for (let i = 0; i < 60; i++) {
      const req = createRequest('AAPL');
      const context = createContext('AAPL');
      await GET(req, context);
    }

    // Next request should be rate limited
    const req = createRequest('AAPL');
    const context = createContext('AAPL');
    const res = await GET(req, context);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain('リクエスト回数の上限を超えました');
  });

  it('should rate limit different IPs independently', async () => {
    // Make request from first IP
    const req1 = createRequest('AAPL');
    const context1 = createContext('AAPL');
    const res1 = await GET(req1, context1);
    expect(res1.status).toBe(200);

    // Make request from different IP
    const headers2 = new Headers({
      'x-forwarded-for': '192.168.1.101',
    });
    const req2 = new Request('http://localhost/api/trading/AAPL', {
      method: 'GET',
      headers: headers2,
    });
    const context2 = createContext('AAPL');
    const res2 = await GET(req2, context2);
    expect(res2.status).toBe(200);
  });

  it('should return signal and market data for valid symbol', async () => {
    const req = createRequest('AAPL');
    const context = createContext('AAPL');
    const res = await GET(req, context);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty('signal');
    expect(json).toHaveProperty('marketData');
  });
});
