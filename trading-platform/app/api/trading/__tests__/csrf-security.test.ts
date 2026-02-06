/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the trading platform to avoid side effects
jest.mock('@/app/lib/tradingCore/UnifiedTradingPlatform', () => ({
  getGlobalTradingPlatform: jest.fn(() => ({
    start: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock auth middleware to pass authentication
jest.mock('@/app/lib/auth', () => ({
  requireAuth: jest.fn(() => null), // Return null = authenticated
}));

// Mock api-middleware
jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => null), // Return null = no rate limit
}));

// We do NOT mock csrf-protection here because we want to test that it is correctly integrated into the route handler.

describe('POST /api/trading CSRF Protection', () => {
  it('should require CSRF token for POST requests', async () => {
    const req = new NextRequest('http://localhost:3000/api/trading', {
      method: 'POST',
      body: JSON.stringify({ action: 'start' }),
    });

    const res = await POST(req);

    // Expect 403 Forbidden because no CSRF token is provided
    // This assertion will FAIL before the fix is implemented (receiving 200)
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toBe('CSRF validation failed');
  });
});
