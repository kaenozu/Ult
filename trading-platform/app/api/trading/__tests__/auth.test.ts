/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';

// Mock the trading platform
jest.mock('@/app/lib/tradingCore/UnifiedTradingPlatform', () => ({
  getGlobalTradingPlatform: jest.fn(() => ({
    getStatus: jest.fn(() => 'running'),
    start: jest.fn(),
    getPortfolio: jest.fn(() => ({})),
    getSignals: jest.fn(() => []),
    getRiskMetrics: jest.fn(() => ({})),
    getAlertHistory: jest.fn(() => []),
  })),
}));

// Mock rate limiter
jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => null),
}));

// Mock auth middleware
jest.mock('@/app/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

import { requireAuth } from '@/app/lib/auth';
const mockRequireAuth = requireAuth as jest.Mock;

describe('Trading API Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (method: string = 'GET', body?: Record<string, unknown>) => {
    return new NextRequest('http://localhost:3000/api/trading', {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it('GET /api/trading should enforce authentication', async () => {
    // Simulate unauthorized
    mockRequireAuth.mockReturnValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const req = createRequest('GET');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
    expect(mockRequireAuth).toHaveBeenCalled();
  });

  it('GET /api/trading should proceed when authenticated', async () => {
    // Simulate authorized (returns null)
    mockRequireAuth.mockReturnValueOnce(null);

    const req = createRequest('GET');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockRequireAuth).toHaveBeenCalled();
  });

  it('POST /api/trading should enforce authentication', async () => {
    // Simulate unauthorized
    mockRequireAuth.mockReturnValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const req = createRequest('POST', { action: 'start' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(mockRequireAuth).toHaveBeenCalled();
  });
});
