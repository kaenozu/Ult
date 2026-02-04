/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the trading platform
const mockTradingPlatform = {
  getStatus: jest.fn(() => ({ isRunning: true, state: 'running' })),
  getPortfolio: jest.fn(() => ({ cash: 100000, positions: [], totalValue: 100000 })),
  getSignals: jest.fn(() => []),
  getRiskMetrics: jest.fn(() => ({ var: 0, sharpeRatio: 0 })),
  getAlertHistory: jest.fn(() => []),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn(),
  placeOrder: jest.fn().mockResolvedValue(undefined),
  closePosition: jest.fn().mockResolvedValue(undefined),
  createAlert: jest.fn(),
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

describe('POST /api/trading', () => {
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

  describe('start action', () => {
    it('should start the trading platform successfully', async () => {
      const req = createAuthenticatedRequest({ action: 'start' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.start).toHaveBeenCalledTimes(1);
    });

    it('should handle start errors gracefully', async () => {
      mockTradingPlatform.start.mockRejectedValueOnce(new Error('Failed to start'));
      
      const req = createAuthenticatedRequest({ action: 'start' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to start');
    });
  });

  describe('stop action', () => {
    it('should stop the trading platform successfully', async () => {
      const req = createAuthenticatedRequest({ action: 'stop' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.stop).toHaveBeenCalledTimes(1);
    });

    it('should handle stop errors gracefully', async () => {
      mockTradingPlatform.stop.mockRejectedValueOnce(new Error('Failed to stop'));
      
      const req = createAuthenticatedRequest({ action: 'stop' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to stop');
    });
  });

  describe('reset action', () => {
    it('should reset the trading platform successfully', async () => {
      const req = createAuthenticatedRequest({ action: 'reset' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('place_order action', () => {
    it('should place a valid buy order', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.placeOrder).toHaveBeenCalledWith(
        'AAPL',
        'BUY',
        100,
        undefined
      );
    });

    it('should place a valid sell order with options', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'TSLA',
        side: 'SELL',
        quantity: 50,
        options: { stopLoss: 200 },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.placeOrder).toHaveBeenCalledWith(
        'TSLA',
        'SELL',
        50,
        { stopLoss: 200 }
      );
    });

    it('should reject order with empty symbol', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: '',
        side: 'BUY',
        quantity: 100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid symbol');
    });

    it('should reject order with whitespace-only symbol', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: '   ',
        side: 'BUY',
        quantity: 100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid symbol');
    });

    it('should reject order with missing symbol', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        side: 'BUY',
        quantity: 100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid symbol');
    });

    it('should reject order with invalid side', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'INVALID',
        quantity: 100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid side');
    });

    it('should reject order with missing side', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        quantity: 100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid side');
    });

    it('should reject order with zero quantity', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 0,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid quantity');
    });

    it('should reject order with negative quantity', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: -100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid quantity');
    });

    it('should reject order with Infinity quantity', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: Infinity,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid quantity');
    });

    it('should reject order with NaN quantity', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: NaN,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid quantity');
    });

    it('should reject order with string quantity', async () => {
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: '100' as unknown,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid quantity');
    });

    it('should handle order placement errors', async () => {
      mockTradingPlatform.placeOrder.mockRejectedValueOnce(
        new Error('Insufficient funds')
      );
      
      const req = createAuthenticatedRequest({
        action: 'place_order',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Insufficient funds');
    });
  });

  describe('close_position action', () => {
    it('should close a position successfully', async () => {
      const req = createAuthenticatedRequest({
        action: 'close_position',
        symbol: 'AAPL',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.closePosition).toHaveBeenCalledWith('AAPL');
    });

    it('should reject with empty symbol', async () => {
      const req = createAuthenticatedRequest({
        action: 'close_position',
        symbol: '',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid symbol');
    });

    it('should reject with whitespace-only symbol', async () => {
      const req = createAuthenticatedRequest({
        action: 'close_position',
        symbol: '   ',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid symbol');
    });

    it('should handle position closure errors', async () => {
      mockTradingPlatform.closePosition.mockRejectedValueOnce(
        new Error('Position not found')
      );
      
      const req = createAuthenticatedRequest({
        action: 'close_position',
        symbol: 'AAPL',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Position not found');
    });
  });

  describe('create_alert action', () => {
    it('should create an alert successfully', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: 'AAPL',
        type: 'price',
        operator: '>',
        value: 150,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.createAlert).toHaveBeenCalledWith(
        'Price Alert',
        'AAPL',
        'price',
        '>',
        150
      );
    });

    it('should reject alert with empty name', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: '',
        symbol: 'AAPL',
        type: 'price',
        operator: '>',
        value: 150,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid name');
    });

    it('should reject alert with whitespace-only name', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: '   ',
        symbol: 'AAPL',
        type: 'price',
        operator: '>',
        value: 150,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid name');
    });

    it('should reject alert with empty symbol', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: '',
        type: 'price',
        operator: '>',
        value: 150,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid symbol');
    });

    it('should reject alert with missing type', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: 'AAPL',
        operator: '>',
        value: 150,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });

    it('should reject alert with missing operator', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: 'AAPL',
        type: 'price',
        value: 150,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid operator');
    });

    it('should reject alert with null value', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: 'AAPL',
        type: 'price',
        operator: '>',
        value: null,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid value');
    });

    it('should reject alert with undefined value', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: 'AAPL',
        type: 'price',
        operator: '>',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid value');
    });

    it('should reject alert with Infinity value', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: 'AAPL',
        type: 'price',
        operator: '>',
        value: Infinity,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid value');
    });

    it('should reject alert with NaN value', async () => {
      const req = createAuthenticatedRequest({
        action: 'create_alert',
        name: 'Price Alert',
        symbol: 'AAPL',
        type: 'price',
        operator: '>',
        value: NaN,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid value');
    });
  });

  describe('update_config action', () => {
    it('should update config successfully with valid fields', async () => {
      const config = {
        mode: 'paper',
        initialCapital: 50000,
        aiEnabled: true
      };
      const req = createAuthenticatedRequest({
        action: 'update_config',
        config,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTradingPlatform.updateConfig).toHaveBeenCalledWith(config);
    });

    it('should reject non-object config', async () => {
      const req = createAuthenticatedRequest({
        action: 'update_config',
        config: 'invalid',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid config');
    });

    it('should reject invalid mode', async () => {
      const req = createAuthenticatedRequest({
        action: 'update_config',
        config: { mode: 'invalid_mode' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid mode');
    });

    it('should reject negative initialCapital', async () => {
      const req = createAuthenticatedRequest({
        action: 'update_config',
        config: { initialCapital: -100 },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid initialCapital');
    });

    it('should reject invalid riskLimits', async () => {
      const req = createAuthenticatedRequest({
        action: 'update_config',
        config: { riskLimits: 'not_an_object' },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid riskLimits');
    });

    it('should sanitize unknown keys', async () => {
      const req = createAuthenticatedRequest({
        action: 'update_config',
        config: {
          mode: 'paper',
          unknown_key: 'malicious_value',
          __proto__: { isAdmin: true }
        },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      // Should verify that unknown_key and __proto__ were stripped
      expect(mockTradingPlatform.updateConfig).toHaveBeenCalledWith({
        mode: 'paper'
      });
    });
  });

  describe('unknown action', () => {
    it('should reject unknown action', async () => {
      const req = createAuthenticatedRequest({
        action: 'invalid_action',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Unknown action');
    });
  });

  describe('error handling', () => {
    it('should handle non-Error exceptions', async () => {
      mockTradingPlatform.start.mockRejectedValueOnce('String error');
      
      const req = createAuthenticatedRequest({ action: 'start' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('String error');
    });
  });
});

describe('GET /api/trading', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, TRADING_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return platform status successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/trading');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('portfolio');
    expect(data).toHaveProperty('signals');
    expect(data).toHaveProperty('riskMetrics');
    expect(data).toHaveProperty('alerts');
  });

  it('should handle errors gracefully', async () => {
    mockTradingPlatform.getStatus.mockImplementationOnce(() => {
      throw new Error('Platform error');
    });
    
    const req = new NextRequest('http://localhost:3000/api/trading');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Platform error');
  });
});
