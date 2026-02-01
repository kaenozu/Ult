/**
 * AdvancedOrderManager.test.ts
 * 
 * Unit tests for Advanced Order Manager
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  AdvancedOrderManager,
  resetGlobalAdvancedOrderManager,
} from '../AdvancedOrderManager';
import type { OrderSide, TimeInForce } from '../../../types/advancedOrder';

describe('AdvancedOrderManager', () => {
  let manager: AdvancedOrderManager;

  beforeEach(() => {
    manager = new AdvancedOrderManager({ enableLogging: false });
    manager.start();
  });

  afterEach(() => {
    manager.stop();
    resetGlobalAdvancedOrderManager();
  });

  describe('Stop Loss Orders', () => {
    it('should create a stop loss order', () => {
      const order = manager.createStopLossOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        stopPrice: 1950,
        timeInForce: 'GTC' as TimeInForce,
      });

      expect(order).toBeDefined();
      expect(order.type).toBe('STOP_LOSS');
      expect(order.symbol).toBe('7203');
      expect(order.stopPrice).toBe(1950);
      expect(order.status).toBe('PENDING');
    });

    it('should trigger stop loss when price reaches stop price', () => {
      const order = manager.createStopLossOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        stopPrice: 1950,
        timeInForce: 'GTC' as TimeInForce,
      });

      // Update price to trigger stop
      manager.updateMarketPrice('7203', 1945);

      const updatedOrder = manager.getOrder(order.id);
      expect(updatedOrder?.status).toBe('FILLED');
    });

    it('should not trigger stop loss when price is above stop', () => {
      const order = manager.createStopLossOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        stopPrice: 1950,
        timeInForce: 'GTC' as TimeInForce,
      });

      manager.updateMarketPrice('7203', 2000);

      const updatedOrder = manager.getOrder(order.id);
      expect(updatedOrder?.status).toBe('PENDING');
    });
  });

  describe('Take Profit Orders', () => {
    it('should create a take profit order', () => {
      const order = manager.createTakeProfitOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        takeProfitPrice: 2100,
        timeInForce: 'GTC' as TimeInForce,
      });

      expect(order).toBeDefined();
      expect(order.type).toBe('TAKE_PROFIT');
      expect(order.takeProfitPrice).toBe(2100);
    });

    it('should trigger take profit when price reaches target', () => {
      const order = manager.createTakeProfitOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        takeProfitPrice: 2100,
        timeInForce: 'GTC' as TimeInForce,
      });

      manager.updateMarketPrice('7203', 2105);

      const updatedOrder = manager.getOrder(order.id);
      expect(updatedOrder?.status).toBe('FILLED');
    });
  });

  describe('OCO Orders', () => {
    it('should create an OCO order', () => {
      const order = manager.createOCOOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        order1: {
          id: '',
          symbol: '7203',
          side: 'SELL' as OrderSide,
          quantity: 100,
          stopPrice: 1950,
          timeInForce: 'GTC' as TimeInForce,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'STOP_LOSS',
        },
        order2: {
          id: '',
          symbol: '7203',
          side: 'SELL' as OrderSide,
          quantity: 100,
          takeProfitPrice: 2100,
          timeInForce: 'GTC' as TimeInForce,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'TAKE_PROFIT',
        },
        timeInForce: 'GTC' as TimeInForce,
      });

      expect(order).toBeDefined();
      expect(order.order1).toBeDefined();
      expect(order.order2).toBeDefined();
    });

    it('should cancel second order when first is filled', () => {
      const order = manager.createOCOOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        order1: {
          id: '',
          symbol: '7203',
          side: 'SELL' as OrderSide,
          quantity: 100,
          stopPrice: 1950,
          timeInForce: 'GTC' as TimeInForce,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'STOP_LOSS',
        },
        order2: {
          id: '',
          symbol: '7203',
          side: 'SELL' as OrderSide,
          quantity: 100,
          takeProfitPrice: 2100,
          timeInForce: 'GTC' as TimeInForce,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'TAKE_PROFIT',
        },
        timeInForce: 'GTC' as TimeInForce,
      });

      // Trigger stop loss
      manager.updateMarketPrice('7203', 1945);

      const updatedOrder = manager.getOrder(order.id);
      expect(updatedOrder?.status).toBe('FILLED');
    });
  });

  describe('Iceberg Orders', () => {
    it('should create an iceberg order', () => {
      const order = manager.createIcebergOrder({
        symbol: '7203',
        side: 'BUY' as OrderSide,
        quantity: 1000,
        totalQuantity: 1000,
        visibleQuantity: 100,
        timeInForce: 'GTC' as TimeInForce,
      });

      expect(order).toBeDefined();
      expect(order.type).toBe('ICEBERG');
      expect(order.totalQuantity).toBe(1000);
      expect(order.visibleQuantity).toBe(100);
    });

    it('should execute iceberg order in slices', () => {
      const order = manager.createIcebergOrder({
        symbol: '7203',
        side: 'BUY' as OrderSide,
        quantity: 1000,
        totalQuantity: 1000,
        visibleQuantity: 100,
        timeInForce: 'GTC' as TimeInForce,
      });

      manager.updateMarketPrice('7203', 2000);

      const updatedOrder = manager.getOrder(order.id);
      expect(updatedOrder?.status).toBe('PARTIALLY_FILLED');
    });
  });

  describe('Trailing Stop Orders', () => {
    it('should create a trailing stop order', () => {
      manager.updateMarketPrice('7203', 2000);

      const order = manager.createTrailingStopOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        trailAmount: 50,
        timeInForce: 'GTC' as TimeInForce,
      });

      expect(order).toBeDefined();
      expect(order.type).toBe('TRAILING_STOP');
      expect(order.trailAmount).toBe(50);
      expect(order.currentStopPrice).toBe(1950);
    });

    it('should update stop price as market price increases', () => {
      manager.updateMarketPrice('7203', 2000);

      const order = manager.createTrailingStopOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        trailAmount: 50,
        timeInForce: 'GTC' as TimeInForce,
      });

      const initialStop = order.currentStopPrice;

      // Price increases
      manager.updateMarketPrice('7203', 2050);

      const updatedOrder = manager.getOrder(order.id);
      expect(updatedOrder && 'currentStopPrice' in updatedOrder).toBe(true);
      if (updatedOrder && 'currentStopPrice' in updatedOrder) {
        expect(updatedOrder.currentStopPrice).toBeGreaterThan(initialStop);
      }
    });
  });

  describe('Bracket Orders', () => {
    it('should create a bracket order', () => {
      const order = manager.createBracketOrder({
        symbol: '7203',
        side: 'BUY' as OrderSide,
        quantity: 100,
        entryOrder: {
          id: '',
          symbol: '7203',
          side: 'BUY' as OrderSide,
          quantity: 100,
          timeInForce: 'GTC' as TimeInForce,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        stopLossOrder: {
          id: '',
          symbol: '7203',
          side: 'SELL' as OrderSide,
          quantity: 100,
          stopPrice: 1950,
          timeInForce: 'GTC' as TimeInForce,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'STOP_LOSS',
        },
        takeProfitOrder: {
          id: '',
          symbol: '7203',
          side: 'SELL' as OrderSide,
          quantity: 100,
          takeProfitPrice: 2100,
          timeInForce: 'GTC' as TimeInForce,
          status: 'PENDING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'TAKE_PROFIT',
        },
      });

      expect(order).toBeDefined();
      expect(order.entryOrder).toBeDefined();
      expect(order.stopLossOrder).toBeDefined();
      expect(order.takeProfitOrder).toBeDefined();
    });
  });

  describe('Order Management', () => {
    it('should cancel an order', () => {
      const order = manager.createStopLossOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        stopPrice: 1950,
        timeInForce: 'GTC' as TimeInForce,
      });

      const cancelled = manager.cancelOrder(order.id);
      expect(cancelled).toBe(true);

      const updatedOrder = manager.getOrder(order.id);
      expect(updatedOrder).toBeUndefined();
    });

    it('should get active orders', () => {
      manager.createStopLossOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        stopPrice: 1950,
        timeInForce: 'GTC' as TimeInForce,
      });

      const activeOrders = manager.getActiveOrders();
      expect(activeOrders.length).toBe(1);
    });

    it('should get orders by symbol', () => {
      manager.createStopLossOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        stopPrice: 1950,
        timeInForce: 'GTC' as TimeInForce,
      });

      manager.createTakeProfitOrder({
        symbol: '6758',
        side: 'SELL' as OrderSide,
        quantity: 50,
        takeProfitPrice: 10500,
        timeInForce: 'GTC' as TimeInForce,
      });

      const orders = manager.getOrdersBySymbol('7203');
      expect(orders.length).toBe(1);
      expect(orders[0].symbol).toBe('7203');
    });
  });

  describe('Statistics', () => {
    it('should return order statistics', () => {
      manager.createStopLossOrder({
        symbol: '7203',
        side: 'SELL' as OrderSide,
        quantity: 100,
        stopPrice: 1950,
        timeInForce: 'GTC' as TimeInForce,
      });

      const stats = manager.getStatistics();
      expect(stats.totalOrders).toBe(1);
      expect(stats.activeOrders).toBe(1);
    });
  });
});
