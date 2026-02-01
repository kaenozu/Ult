/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the trading platform to avoid side effects
jest.mock('@/app/lib/tradingCore/UnifiedTradingPlatform', () => ({
  getGlobalTradingPlatform: jest.fn(() => ({
    getStatus: jest.fn(() => ({ isRunning: true })),
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
    placeOrder: jest.fn(),
    closePosition: jest.fn(),
    createAlert: jest.fn(),
    updateConfig: jest.fn(),
    getPortfolio: jest.fn(() => ({})),
    getSignals: jest.fn(() => []),
    getRiskMetrics: jest.fn(() => ({})),
    getAlertHistory: jest.fn(() => []),
  })),
}));

// Mock ip-rate-limit
jest.mock('@/app/lib/ip-rate-limit', () => ({
  ipRateLimiter: {
    check: jest.fn(() => true),
  },
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

describe('Admin API Authentication', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('GET /api/trading should return 401 if TRADING_API_KEY is not set', async () => {
    delete process.env.TRADING_API_KEY;

    const req = new NextRequest('http://localhost:3000/api/trading');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Server configuration error');
  });

  it('GET /api/trading should return 401 if x-api-key header is missing', async () => {
    process.env.TRADING_API_KEY = 'secret-key';

    const req = new NextRequest('http://localhost:3000/api/trading');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('GET /api/trading should return 401 if x-api-key header is incorrect', async () => {
    process.env.TRADING_API_KEY = 'secret-key';

    const req = new NextRequest('http://localhost:3000/api/trading', {
      headers: { 'x-api-key': 'wrong-key' }
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('GET /api/trading should return 200 if x-api-key header is correct', async () => {
    process.env.TRADING_API_KEY = 'secret-key';

    const req = new NextRequest('http://localhost:3000/api/trading', {
      headers: { 'x-api-key': 'secret-key' }
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('POST /api/trading should return 401 if x-api-key header is incorrect', async () => {
    process.env.TRADING_API_KEY = 'secret-key';

    const req = new NextRequest('http://localhost:3000/api/trading', {
      method: 'POST',
      headers: { 'x-api-key': 'wrong-key' },
      body: JSON.stringify({ action: 'start' })
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});
