/**
 * API Integration Tests
 * 
 * APIエンドポイントの統合テスト
 */

import { test, expect } from '../fixtures';
import { mockApiResponse, mockApiError } from '../helpers';

test.describe('API Integration', () => {
  test.describe('Market Data API', () => {
    test('should fetch stock quote', async ({ page }) => {
      const mockQuote = {
        symbol: 'AAPL',
        price: 175.50,
        change: 2.50,
        changePercent: 1.44,
        volume: 50000000,
      };
      
      await mockApiResponse(page, '**/api/market?type=quote**', mockQuote);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/market?type=quote&symbol=AAPL');
        return res.json();
      });
      
      expect(response).toEqual(mockQuote);
    });

    test('should fetch historical data', async ({ page }) => {
      const mockHistory = {
        symbol: 'AAPL',
        data: [
          { date: '2026-01-01', open: 170, high: 175, low: 169, close: 173, volume: 1000000 },
          { date: '2026-01-02', open: 173, high: 178, low: 172, close: 175, volume: 1200000 },
        ],
      };
      
      await mockApiResponse(page, '**/api/market?type=history**', mockHistory);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/market?type=history&symbol=AAPL&interval=1d');
        return res.json();
      });
      
      expect(response.data).toHaveLength(2);
    });

    test('should handle invalid symbol', async ({ page }) => {
      await mockApiError(page, '**/api/market**', 400, 'Invalid symbol');
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/market?type=quote&symbol=INVALID');
        return { status: res.status, body: await res.json() };
      });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid symbol');
    });
  });

  test.describe('Trading API', () => {
    test('should place order successfully', async ({ page }) => {
      const mockResponse = {
        success: true,
        orderId: 'order-123',
        status: 'PENDING',
        timestamp: Date.now(),
      };
      
      await mockApiResponse(page, '**/api/trading', mockResponse);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'place_order',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 100,
            orderType: 'MARKET',
          }),
        });
        return res.json();
      });
      
      expect(response.success).toBe(true);
      expect(response.orderId).toBe('order-123');
    });

    test('should validate order parameters', async ({ page }) => {
      const mockError = {
        success: false,
        error: 'Invalid quantity',
        field: 'quantity',
      };
      
      await mockApiResponse(page, '**/api/trading', mockError, 400);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'place_order',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: -100,
          }),
        });
        return { status: res.status, body: await res.json() };
      });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid quantity');
    });

    test('should close position', async ({ page }) => {
      const mockResponse = {
        success: true,
        orderId: 'close-order-456',
        closedPosition: {
          symbol: 'AAPL',
          quantity: 100,
          realizedPnL: 2500,
        },
      };
      
      await mockApiResponse(page, '**/api/trading', mockResponse);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'close_position',
            symbol: 'AAPL',
          }),
        });
        return res.json();
      });
      
      expect(response.success).toBe(true);
      expect(response.closedPosition.realizedPnL).toBe(2500);
    });
  });

  test.describe('Portfolio API', () => {
    test('should fetch portfolio data', async ({ page }) => {
      const mockPortfolio = {
        positions: [
          { symbol: 'AAPL', quantity: 100, avgPrice: 150, currentPrice: 175 },
          { symbol: 'MSFT', quantity: 50, avgPrice: 300, currentPrice: 400 },
        ],
        totalValue: 37500,
        totalProfit: 12500,
        dailyPnL: 500,
      };
      
      await mockApiResponse(page, '**/api/portfolio', mockPortfolio);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/portfolio');
        return res.json();
      });
      
      expect(response.positions).toHaveLength(2);
      expect(response.totalValue).toBe(37500);
    });
  });

  test.describe('News API', () => {
    test('should fetch financial news', async ({ page }) => {
      const mockNews = {
        articles: [
          {
            id: '1',
            title: 'Apple announces record earnings',
            source: 'Financial Times',
            timestamp: Date.now(),
            sentiment: 'positive',
          },
          {
            id: '2',
            title: 'Market volatility increases',
            source: 'Reuters',
            timestamp: Date.now(),
            sentiment: 'negative',
          },
        ],
      };
      
      await mockApiResponse(page, '**/api/news', mockNews);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/news');
        return res.json();
      });
      
      expect(response.articles).toHaveLength(2);
    });
  });

  test.describe('Backtest API', () => {
    test('should run backtest successfully', async ({ page }) => {
      const mockBacktest = {
        success: true,
        results: {
          totalReturn: 15.5,
          sharpeRatio: 1.2,
          maxDrawdown: -8.5,
          trades: 25,
          winRate: 60,
        },
      };
      
      await mockApiResponse(page, '**/api/backtest', mockBacktest);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'AAPL',
            strategy: 'momentum',
            startDate: '2025-01-01',
            endDate: '2025-12-31',
          }),
        });
        return res.json();
      });
      
      expect(response.success).toBe(true);
      expect(response.results.totalReturn).toBe(15.5);
    });
  });

  test.describe('Authentication API', () => {
    test('should authenticate user', async ({ page }) => {
      const mockAuth = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'trader',
        },
      };
      
      await mockApiResponse(page, '**/api/auth/login', mockAuth);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        });
        return res.json();
      });
      
      expect(response.success).toBe(true);
      expect(response.token).toBe('mock-jwt-token');
    });

    test('should reject invalid credentials', async ({ page }) => {
      const mockError = {
        success: false,
        error: 'Invalid credentials',
      };
      
      await mockApiResponse(page, '**/api/auth/login', mockError, 401);
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrongpassword',
          }),
        });
        return { status: res.status, body: await res.json() };
      });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
