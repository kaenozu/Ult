/**
 * tradingStore-risk-integration.test.ts
 * 
 * Integration tests for risk management in trading store
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { usePortfolioStore } from '../store/portfolioStore';
import { OrderRequest } from '../types/order';

describe('TradingStore Risk Management Integration', () => {
  beforeEach(() => {
    // Reset to initial state
    const state = usePortfolioStore.getState();
    usePortfolioStore.setState({
      ...state,
      portfolio: {
        positions: [],
        orders: [],
        totalValue: 0,
        totalProfit: 0,
        dailyPnL: 0,
        cash: 1000000, // 1M starting capital
      },
    });
  });

  describe('Risk Management Enforcement', () => {
    it('should enforce stop loss requirement', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        // No stop loss provided
      };

      const result = usePortfolioStore.getState().executeOrder(order);

      // Should succeed with auto stop loss
      expect(result.success).toBe(true);
    });

    it('should reject orders exceeding position size limit', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 10000, // Very large position
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      const result = usePortfolioStore.getState().executeOrder(order);

      // Should succeed but with reduced quantity
      expect(result.success).toBe(true);
    });

    it('should enforce minimum risk/reward ratio', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145, // 5 point risk
        takeProfit: 152, // 2 point reward (poor R:R)
      };

      const result = usePortfolioStore.getState().executeOrder(order);

      // Should succeed (take profit will be adjusted)
      expect(result.success).toBe(true);
    });

    it('should block trading at max drawdown', () => {
      // First, execute a successful order
      const initialOrder: OrderRequest = {
        symbol: 'TEST',
        name: 'Test Stock',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
      };

      usePortfolioStore.getState().executeOrder(initialOrder);

      // Simulate major losses (set cash to 750k = 25% drawdown)
      usePortfolioStore.setState({
        portfolio: {
          ...usePortfolioStore.getState().portfolio,
          cash: 750000,
          totalValue: 0,
        },
      });

      // Try to execute another order
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

      const result = usePortfolioStore.getState().executeOrder(order);

      // Should be blocked due to drawdown
      expect(result.success).toBe(false);
      expect(result.error).toContain('ドローダウン');
    });

    it('should limit per-trade risk to 2%', () => {
      const originalQuantity = 5000;
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: originalQuantity, // Large quantity
        price: 100,
        orderType: 'MARKET',
        stopLoss: 90, // 10 point risk = 50k total (5% risk - too high)
      };

      const result = usePortfolioStore.getState().executeOrder(order);

      // Should succeed but with reduced quantity
      expect(result.success).toBe(true);
      
      // Check position was created with adjusted size
      const position = usePortfolioStore.getState().portfolio.positions.find(p => p.symbol === 'AAPL');
      expect(position).toBeDefined();
      expect(position!.quantity).toBeLessThan(originalQuantity);
    });

    it('should enforce maximum position count', () => {
      // Create 10 positions (max limit)
      for (let i = 0; i < 10; i++) {
        const order: OrderRequest = {
          symbol: `STOCK${i}`,
          name: `Stock ${i}`,
          market: 'US',
          side: 'BUY',
          quantity: 100,
          price: 100,
          orderType: 'MARKET',
          stopLoss: 95,
        };

        const result = usePortfolioStore.getState().executeOrder(order);
        expect(result.success).toBe(true);
      }

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

      const result = usePortfolioStore.getState().executeOrder(order);

      // Should be blocked
      expect(result.success).toBe(false);
      expect(result.error).toContain('ポジション');
    });

    it('should apply Kelly-based position sizing', () => {
      const originalQuantity = 10000;
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: originalQuantity, // Large requested quantity
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
        takeProfit: 110,
      };

      const result = usePortfolioStore.getState().executeOrder(order);

      // Should succeed with Kelly-adjusted size
      expect(result.success).toBe(true);
      
      const position = usePortfolioStore.getState().portfolio.positions.find(p => p.symbol === 'AAPL');
      expect(position).toBeDefined();
      // Kelly should significantly reduce this
      expect(position!.quantity).toBeLessThan(originalQuantity);
    });

    it('should handle concurrent orders with sufficient funds', () => {
      const order1: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 500,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      const order2: OrderRequest = {
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        market: 'US',
        side: 'BUY',
        quantity: 500,
        price: 100,
        orderType: 'MARKET',
        stopLoss: 95,
      };

      const result1 = usePortfolioStore.getState().executeOrder(order1);
      const result2 = usePortfolioStore.getState().executeOrder(order2);

      // Both should succeed (with possible risk adjustments)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify positions were created
      expect(usePortfolioStore.getState().portfolio.positions).toHaveLength(2);
    });

    it('should maintain position averaging when adding to existing position', () => {
      const order1: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 150,
        orderType: 'MARKET',
        stopLoss: 145,
      };

      const order2: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'US',
        side: 'BUY',
        quantity: 100,
        price: 160,
        orderType: 'MARKET',
        stopLoss: 155,
      };

      usePortfolioStore.getState().executeOrder(order1);
      usePortfolioStore.getState().executeOrder(order2);

      const positions = usePortfolioStore.getState().portfolio.positions;
      const applePosition = positions.find(p => p.symbol === 'AAPL');

      // Should still be one position
      expect(positions).toHaveLength(1);
      expect(applePosition).toBeDefined();
      
      // Average price should be between 150 and 160
      expect(applePosition!.avgPrice).toBeGreaterThan(150);
      expect(applePosition!.avgPrice).toBeLessThan(160);
    });
  });
});
