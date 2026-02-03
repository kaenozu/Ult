/**
 * RiskManagementService.test.ts
 * 
 * CRITICAL: 自動リスク管理システムのテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  RiskManagementService, 
  getRiskManagementService,
  resetRiskManagementService,
  DEFAULT_RISK_CONFIG
} from '../RiskManagementService';
import { Portfolio, Position, OHLCV } from '@/app/types';
import { OrderRequest } from '@/app/types/order';

describe('RiskManagementService', () => {
  let service: RiskManagementService;
  let mockPortfolio: Portfolio;

  beforeEach(() => {
    resetRiskManagementService();
    service = new RiskManagementService();
    
    mockPortfolio = {
      positions: [],
      orders: [],
      totalValue: 0,
      totalProfit: 0,
      dailyPnL: 0,
      cash: 1000000, // 1M starting capital
    };
  });

  describe('Position Sizing with Kelly Criterion', () => {
    it('should calculate Kelly-based position size', () => {
      const originalQuantity = 1000;
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: originalQuantity,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145, // 5 point risk
        takeProfit: 160, // 10 point reward (2:1 R:R)
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(true);
      expect(result.adjustedQuantity).toBeDefined();
      expect(result.adjustedQuantity).toBeLessThanOrEqual(originalQuantity);
      expect(result.reasons.some(r => r.includes('Kelly'))).toBe(true);
    });

    it('should apply conservative Kelly fraction (25%)', () => {
      const originalQuantity = 10000;
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: originalQuantity,
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
        takeProfit: 110,
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(true);
      // Position should be significantly reduced by Kelly
      expect(result.adjustedQuantity).toBeLessThan(originalQuantity);
    });
  });

  describe('Maximum Drawdown Circuit Breaker', () => {
    it('should block trading when drawdown exceeds 20%', () => {
      // Set peak balance
      service.resetPeakBalance(1000000);
      
      // Portfolio has lost 25% (below peak by 250k)
      mockPortfolio.cash = 750000;
      mockPortfolio.totalValue = 0;

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'max_drawdown')).toBe(true);
      expect(result.reasons[0]).toContain('ドローダウン');
    });

    it('should allow trading when drawdown is within limits', () => {
      // Set peak balance
      service.resetPeakBalance(1000000);
      
      // Portfolio has lost 10% (within 20% limit)
      mockPortfolio.cash = 900000;
      mockPortfolio.totalValue = 0;

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Per-Trade Risk Validation', () => {
    it('should require stop loss for trades', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        // No stop loss
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(true);
      expect(result.stopLossPrice).toBeDefined();
      expect(result.reasons.some(r => r.includes('ストップロス'))).toBe(true);
    });

    it('should enforce minimum risk/reward ratio of 1.5:1', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145, // 5 point risk
        takeProfit: 152, // 2 point reward (0.4:1 R:R - too low)
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.violations.some(v => v.type === 'risk_reward_ratio')).toBe(true);
      expect(result.takeProfitPrice).toBeGreaterThanOrEqual(157.5);
    });

    it('should limit per-trade risk to 2% of account', () => {
      const originalQuantity = 5000;
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: originalQuantity, // Large position
        price: 100,
        orderType: 'MARKET',
        stopLoss: 90, // 10 point risk = 50k total risk (5% of 1M)
      };

      const result = service.validateOrder(order, mockPortfolio);

      // Should reduce quantity for risk management reasons
      expect(result.allowed).toBe(true);
      expect(result.adjustedQuantity).toBeLessThan(originalQuantity);
      // Should limit to 2% risk = 20k / 10 = 2000 shares max
      expect(result.adjustedQuantity).toBeLessThanOrEqual(2000);
    });
  });

  describe('Portfolio-Level Risk Controls', () => {
    it('should limit position size to 5% of portfolio', () => {
      const originalQuantity = 1000;
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: originalQuantity,
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
      };

      // Order value = 100k = 10% of portfolio (too large)
      const result = service.validateOrder(order, mockPortfolio);

      // Position should be adjusted (either by Kelly or position size limit)
      expect(result.adjustedQuantity).toBeLessThan(originalQuantity);
      // Should not exceed 5% = 50k / 100 = 500 shares
      expect(result.adjustedQuantity).toBeLessThanOrEqual(500);
      expect(result.allowed).toBe(true);
    });

    it('should enforce maximum position count', () => {
      // Add 10 existing positions
      mockPortfolio.positions = Array.from({ length: 10 }, (_, i) => ({
        symbol: `STOCK${i}`,
        name: `Stock ${i}`,
        market: 'US',
        side: 'LONG' as const,
        quantity: 100,
        avgPrice: 100,
        currentPrice: 100,
        change: 0,
        entryDate: new Date().toISOString(),
      }));

      // Try to add 11th position
      const order: OrderRequest = {
        symbol: 'NEW_STOCK',
        name: 'New Stock',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'max_positions')).toBe(true);
    });

    it('should allow adding to existing position even at max positions', () => {
      // Add 10 existing positions
      mockPortfolio.positions = Array.from({ length: 10 }, (_, i) => ({
        symbol: i === 0 ? 'AAPL' : `STOCK${i}`,
        name: `Stock ${i}`,
        market: 'US',
        side: 'LONG' as const,
        quantity: 100,
        avgPrice: 100,
        currentPrice: 100,
        change: 0,
        entryDate: new Date().toISOString(),
      }));

      // Add to existing AAPL position
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 50,
        price: 105,
        orderType: 'MARKET',
        stopLoss: 100,
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Daily Loss Limit', () => {
    it('should block trading when daily loss exceeds 5%', () => {
      // First, establish the starting balance
      const initialOrder: OrderRequest = {
        symbol: 'TEST',
        name: 'Test Stock',
        market: 'US',
        side: 'BUY',
        quantity: 1,
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
      };
      
      // This sets the daily start balance to 1M
      service.validateOrder(initialOrder, mockPortfolio);
      
      // Now portfolio has lost 6% (940k)
      mockPortfolio.cash = 940000;
      mockPortfolio.totalValue = 0;
      
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'daily_loss_limit')).toBe(true);
    });
  });

  describe('Automatic Stop Loss and Take Profit', () => {
    it('should automatically set stop loss if not provided', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(true);
      expect(result.stopLossPrice).toBeDefined();
      expect(result.stopLossPrice).toBeLessThan(order.price);
    });

    it('should automatically set take profit for good R:R ratio', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145, // 5 point risk
      };

      const result = service.validateOrder(order, mockPortfolio);

      expect(result.allowed).toBe(true);
      expect(result.takeProfitPrice).toBeDefined();
      // Should be at least 1.5:1 R:R = 150 + (5 * 1.5) = 157.5
      expect(result.takeProfitPrice).toBeGreaterThanOrEqual(157.5);
    });
  });

  describe('Risk Status Management', () => {
    it('should return current risk status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('isTradingHalted');
      expect(status).toHaveProperty('isOrdersBlocked');
      expect(status).toHaveProperty('currentDrawdown');
      expect(status).toHaveProperty('dailyLoss');
      expect(status).toHaveProperty('peakBalance');
    });

    it('should allow manual trading resume', () => {
      // Simulate drawdown that halts trading
      service.resetPeakBalance(1000000);
      mockPortfolio.cash = 700000; // 30% drawdown

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      service.validateOrder(order, mockPortfolio);
      
      // Resume trading
      service.resumeTrading();
      
      const status = service.getStatus();
      expect(status.isTradingHalted).toBe(false);
    });
  });

  describe('Integration with ATR-based Volatility', () => {
    it('should use ATR for volatility adjustment', () => {
      const mockOHLCV: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000000,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 1000,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      const result = service.validateOrder(order, mockPortfolio, mockOHLCV);

      expect(result.allowed).toBe(true);
      expect(result.reasons.some(r => r.includes('ボラティリティ'))).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getRiskManagementService();
      const instance2 = getRiskManagementService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getRiskManagementService();
      resetRiskManagementService();
      const instance2 = getRiskManagementService();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Configuration Management', () => {
    it('should use default configuration', () => {
      const service = new RiskManagementService();
      const status = service.getStatus();

      // Default config should be applied
      expect(status).toBeDefined();
    });

    it('should allow custom configuration', () => {
      const customConfig = {
        maxPositionPercent: 10,
        maxRiskPerTrade: 3,
        minRiskRewardRatio: 2.0,
        useKellyCriterion: false, // Disable Kelly to test position percent limit directly
      };

      const service = new RiskManagementService(customConfig);
      
      const originalQuantity = 1500;
      // Config should be applied (test through behavior)
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: originalQuantity, // 15% of portfolio
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
      };

      const result = service.validateOrder(order, mockPortfolio);

      // With 10% limit, should adjust position
      expect(result.violations.some(v => v.type === 'position_size_limit')).toBe(true);
      expect(result.adjustedQuantity).toBeLessThan(originalQuantity);
    });

    it('should update configuration dynamically', () => {
      const service = new RiskManagementService();
      
      service.updateConfig({
        maxPositionPercent: 3, // More restrictive
      });

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 500, // 5% of portfolio
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
      };

      const result = service.validateOrder(order, mockPortfolio);

      // Should violate new 3% limit
      expect(result.violations.some(v => v.type === 'position_size_limit')).toBe(true);
    });
  });
});
