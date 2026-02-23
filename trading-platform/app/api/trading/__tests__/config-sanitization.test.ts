/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the trading platform
const mockTradingPlatform = {
  updateConfig: jest.fn(),
};

jest.mock('@/app/lib/tradingCore/UnifiedTradingPlatform', () => ({
  getGlobalTradingPlatform: jest.fn(() => mockTradingPlatform),
}));

// Mock rate limiter
jest.mock('@/app/lib/ip-rate-limit', () => ({
  ipRateLimiter: {
    check: jest.fn(() => true),
  },
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

// Mock auth middleware
jest.mock('@/app/lib/auth', () => ({
  requireAuth: jest.fn(() => null), // Return null = authenticated
  verifyAuthToken: jest.fn(() => ({ userId: 'test-user' })),
  generateAuthToken: jest.fn(() => 'test-token'),
}));

// Mock api-middleware
jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => null), // Return null = no rate limit
}));

// Mock csrf-protection
jest.mock('@/app/lib/csrf/csrf-protection', () => ({
  requireCSRF: jest.fn(() => null), // Return null = valid CSRF
  generateCSRFToken: jest.fn(() => 'test-csrf-token'),
  csrfTokenMiddleware: jest.fn(() => null),
}));

describe('POST /api/trading - Config XSS Sanitization Test', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, TRADING_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createAuthenticatedRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/trading', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('SECURITY FIX: should SANITIZE symbols in update_config to prevent Stored XSS', async () => {
    const maliciousSymbol = '<script>alert(1)</script>';
    const expectedSanitizedSymbol = 'SCRIPTALERT1SCRIPT'; // Based on sanitizeSymbol behavior (A-Z0-9 only)

    const req = createAuthenticatedRequest({
      action: 'update_config',
      config: {
        symbols: [maliciousSymbol, 'BTC-USD'],
      },
    });

    const res = await POST(req);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify what was passed to updateConfig
    const calledWith = mockTradingPlatform.updateConfig.mock.calls[0][0];

    // This assertion should FAIL if sanitization is missing
    expect(calledWith.symbols).toContain(expectedSanitizedSymbol);
    expect(calledWith.symbols).not.toContain(maliciousSymbol);
    expect(calledWith.symbols).toContain('BTCUSD'); // Assuming sanitizeSymbol cleans BTC-USD to BTCUSD or similar
  });

  it('SECURITY FIX: should SANITIZE exchanges in update_config', async () => {
    const maliciousExchange = '<img src=x onerror=alert(1)>';
    // sanitizeText with default options escapes HTML entities
    const expectedSanitizedExchange = '&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;';

    const req = createAuthenticatedRequest({
      action: 'update_config',
      config: {
        exchanges: [maliciousExchange],
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);

    const calledWith = mockTradingPlatform.updateConfig.mock.calls[0][0];

    // This assertion should FAIL if sanitization is missing
    expect(calledWith.exchanges[0]).toBe(expectedSanitizedExchange);
  });
});
