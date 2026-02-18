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

describe('POST /api/trading - Config Validation Security Test', () => {
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

  it('SECURITY FIX: should REJECT invalid config values (e.g. negative capital)', async () => {
    const req = createAuthenticatedRequest({
      action: 'update_config',
      config: {
        initialCapital: -1000,
        riskLimits: {
            maxPositionSize: -500
        }
      },
    });
    const res = await POST(req);
    const data = await res.json();

    // Now expecting 400 Bad Request due to Zod validation
    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
    expect(mockTradingPlatform.updateConfig).not.toHaveBeenCalled();
  });

  it('SECURITY FIX: should STRIP unknown keys (prevent pollution)', async () => {
    const req = createAuthenticatedRequest({
      action: 'update_config',
      config: {
        mode: 'paper',
        evil_property: 'injection',
        __proto__: { isAdmin: true }
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Check what was passed to updateConfig
    const calledWith = mockTradingPlatform.updateConfig.mock.calls[0][0];

    // Unknown keys should be stripped by Zod
    expect(calledWith).toHaveProperty('mode', 'paper');
    expect(calledWith).not.toHaveProperty('evil_property');
    // Note: All objects have __proto__, so we don't check for its absence,
    // but Zod prevents prototype pollution by default.
  });

  it('SECURITY FIX: should REJECT invalid types (string for number)', async () => {
    const req = createAuthenticatedRequest({
      action: 'update_config',
      config: {
        initialCapital: "one million dollars",
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
    expect(mockTradingPlatform.updateConfig).not.toHaveBeenCalled();
  });

  it('SECURITY FIX: should REJECT invalid enums', async () => {
    const req = createAuthenticatedRequest({
      action: 'update_config',
      config: {
        mode: 'god_mode',
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
    expect(mockTradingPlatform.updateConfig).not.toHaveBeenCalled();
  });
});
