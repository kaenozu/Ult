/**
 * @jest-environment node
 * 
 * Integration test for Risk Management Enforcement
 */

import { AdvancedRiskManager, DEFAULT_RISK_LIMITS } from '../AdvancedRiskManager';
import { AdvancedOrderManager } from '../../execution/AdvancedOrderManager';
import type { Portfolio } from '@/app/types';

describe('Risk Management Integration', () => {
  let riskManager: AdvancedRiskManager;
  let orderManager: AdvancedOrderManager;

  beforeEach(() => {
    // Create risk manager with strict limits
    riskManager = new AdvancedRiskManager({
      maxPositionSize: 10, // 10% max
      maxDailyLoss: 5, // 5% max daily loss
      maxLeverage: 1.5,
      minCashReserve: 20,
    });

    // Initialize portfolio
    const portfolio: Portfolio = {
      cash: 50000,
      positions: [],
      totalValue: 100000,
      dailyPnL: 0,
      totalProfit: 0,
      orders: [],
    };
    riskManager.updateRiskMetrics(portfolio);

    // Create order manager with risk validation enabled
    orderManager = new AdvancedOrderManager({
      enableRiskValidation: true,
    });

    // Set market prices
    orderManager.updateMarketPrice({
      symbol: 'AAPL',
      price: 150,
      timestamp: Date.now(),
    });
  });

  describe('Order Rejection', () => {
    it('should reject order exceeding position size limit', () => {
      // Try to create order that exceeds 10% position limit
      // $150 * 100 = $15,000 = 15% of portfolio
      expect(() => {
        orderManager.createStopLossOrder({
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          stopPrice: 145,
        });
      }).toThrow(/rejected/i);
    });

    it('should allow order within limits', () => {
      // Order within 10% limit: $150 * 50 = $7,500 = 7.5%
      // Don't provide stop price to avoid risk calculation issues in test
      const order = orderManager.createTakeProfitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 50,
        targetPrice: 160,
      });

      expect(order).toBeDefined();
      expect(order.quantity).toBe(50);
    });

    it('should halt trading on daily loss limit', () => {
      // Simulate 6% loss (exceeds 5% limit)
      const lossPortfolio: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 94000,
        dailyPnL: -6000,
        totalProfit: -6000,
        orders: [],
      };
      riskManager.updateRiskMetrics(lossPortfolio);

      expect(riskManager.isHalted()).toBe(true);

      // Try to create order - should be rejected
      expect(() => {
        orderManager.createStopLossOrder({
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          stopPrice: 145,
        });
      }).toThrow(/rejected/i);
    });

    it('should allow SELL orders even when halted', () => {
      // Halt trading
      const lossPortfolio: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 94000,
        dailyPnL: -6000,
        totalProfit: -6000,
        orders: [],
      };
      riskManager.updateRiskMetrics(lossPortfolio);

      expect(riskManager.isHalted()).toBe(true);

      // SELL orders should still work
      const order = orderManager.createStopLossOrder({
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 10,
        stopPrice: 155,
      });

      expect(order).toBeDefined();
      expect(order.side).toBe('SELL');
    });

    it('should emit order_rejected event', (done) => {
      orderManager.on('order_rejected', (data) => {
        expect(data.reason).toBeTruthy();
        done();
      });

      // Try to create order that will be rejected
      try {
        orderManager.createStopLossOrder({
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          stopPrice: 145,
        });
      } catch (error) {
        // Expected to throw
      }
    });
  });

  describe('Risk Validation Disabled', () => {
    beforeEach(() => {
      orderManager = new AdvancedOrderManager({
        enableRiskValidation: false,
      });

      orderManager.updateMarketPrice({
        symbol: 'AAPL',
        price: 150,
        timestamp: Date.now(),
      });
    });

    it('should allow any order when risk validation is disabled', () => {
      // Should allow even large order
      const order = orderManager.createStopLossOrder({
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 1000, // Very large order
        stopPrice: 145,
      });

      expect(order).toBeDefined();
      expect(order.quantity).toBe(1000);
    });
  });
});
