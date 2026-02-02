/**
 * OrderManagementSystem.test.ts
 * 
 * Unit tests for Order Management System
 */

import {
  OrderManagementSystem,
  getGlobalOrderManagementSystem,
  resetGlobalOrderManagementSystem,
} from '../OrderManagementSystem';
import { IBKRConnector, OrderRequest } from '../BrokerConnectors';
import { SmartOrderRouter } from '../SmartOrderRouter';

describe('OrderManagementSystem', () => {
  let oms: OrderManagementSystem;
  let mockBroker: IBKRConnector;

  beforeEach(() => {
    oms = new OrderManagementSystem({
      enableSmartRouting: false,
      allowPartialFills: true,
      maxOrderLifetime: 60000, // 1 minute for testing
      autoRetryOnRejection: false,
      validateOrdersBeforeSubmit: true,
    });

    mockBroker = new IBKRConnector({
      credentials: {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        environment: 'paper',
      },
      enableOrderBookDepth: true,
      maxRetries: 3,
      retryDelay: 1000,
      requestTimeout: 5000,
    });
  });

  afterEach(() => {
    oms.shutdown();
  });

  describe('Broker Management', () => {
    it('should register broker', () => {
      const registeredSpy = jest.fn();
      oms.on('broker_registered', registeredSpy);

      oms.registerBroker(mockBroker);

      expect(registeredSpy).toHaveBeenCalledWith({ broker: 'IBKR' });
    });

    it('should unregister broker', () => {
      oms.registerBroker(mockBroker);

      const unregisteredSpy = jest.fn();
      oms.on('broker_unregistered', unregisteredSpy);

      oms.unregisterBroker('IBKR');

      expect(unregisteredSpy).toHaveBeenCalledWith({ broker: 'IBKR' });
    });

    it('should set order router', () => {
      const router = new SmartOrderRouter();
      oms.setOrderRouter(router);
      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('Order Submission', () => {
    beforeEach(async () => {
      await mockBroker.connect();
      oms.registerBroker(mockBroker);
    });

    afterEach(async () => {
      await mockBroker.disconnect();
    });

    it('should submit valid market order', async () => {
      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      const managedOrder = await oms.submitOrder(orderRequest);

      expect(managedOrder).toBeDefined();
      expect(managedOrder.id).toBeDefined();
      expect(managedOrder.state).toBe('SUBMITTED');
      expect(managedOrder.request.symbol).toBe('AAPL');
    });

    it('should validate order before submission', async () => {
      const invalidRequest: OrderRequest = {
        symbol: '',
        side: 'BUY',
        type: 'MARKET',
        quantity: -10, // Invalid quantity
      };

      const managedOrder = await oms.submitOrder(invalidRequest);

      expect(managedOrder.state).toBe('REJECTED');
      expect(managedOrder.rejectionReason).toContain('Validation failed');
    });

    it('should require price for limit orders', async () => {
      const limitRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        // Missing price
      };

      const managedOrder = await oms.submitOrder(limitRequest);

      expect(managedOrder.state).toBe('REJECTED');
      expect(managedOrder.rejectionReason).toContain('Price is required');
    });

    it('should require stop price for stop orders', async () => {
      const stopRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'SELL',
        type: 'STOP',
        quantity: 100,
        // Missing stopPrice
      };

      const managedOrder = await oms.submitOrder(stopRequest);

      expect(managedOrder.state).toBe('REJECTED');
      expect(managedOrder.rejectionReason).toContain('Stop price is required');
    });

    it('should emit order_created event', async () => {
      const createdSpy = jest.fn();
      oms.on('order_created', createdSpy);

      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      await oms.submitOrder(orderRequest);

      expect(createdSpy).toHaveBeenCalled();
    });

    it('should emit order_state_changed event', async () => {
      const stateChangedSpy = jest.fn();
      oms.on('order_state_changed', stateChangedSpy);

      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      await oms.submitOrder(orderRequest);

      expect(stateChangedSpy).toHaveBeenCalled();
    });
  });

  describe('Order Cancellation', () => {
    beforeEach(async () => {
      await mockBroker.connect();
      oms.registerBroker(mockBroker);
    });

    afterEach(async () => {
      await mockBroker.disconnect();
    });

    it('should cancel submitted order', async () => {
      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150.00,
      };

      const managedOrder = await oms.submitOrder(orderRequest);
      const cancelled = await oms.cancelOrder(managedOrder.id);

      expect(cancelled).toBe(true);

      const order = oms.getOrder(managedOrder.id);
      expect(order?.state).toBe('CANCELLED');
      expect(order?.cancelledAt).toBeDefined();
    });

    it('should fail to cancel non-existent order', async () => {
      await expect(oms.cancelOrder('non-existent-id')).rejects.toThrow('Order non-existent-id not found');
    });
  });

  describe('Order Modification', () => {
    beforeEach(async () => {
      await mockBroker.connect();
      oms.registerBroker(mockBroker);
    });

    afterEach(async () => {
      await mockBroker.disconnect();
    });

    it('should modify order price', async () => {
      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150.00,
      };

      const managedOrder = await oms.submitOrder(orderRequest);
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const modifiedOrder = await oms.modifyOrder(managedOrder.id, {
        price: 155.00,
      });

      expect(modifiedOrder.request.price).toBe(155.00);
      expect(modifiedOrder.updatedAt).toBeGreaterThanOrEqual(managedOrder.updatedAt);
    });

    it('should modify order quantity', async () => {
      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150.00,
      };

      const managedOrder = await oms.submitOrder(orderRequest);
      const modifiedOrder = await oms.modifyOrder(managedOrder.id, {
        quantity: 200,
      });

      expect(modifiedOrder.request.quantity).toBe(200);
    });

    it('should fail to modify non-existent order', async () => {
      await expect(oms.modifyOrder('non-existent-id', { price: 100 }))
        .rejects.toThrow('Order non-existent-id not found');
    });
  });

  describe('Order Querying', () => {
    beforeEach(async () => {
      await mockBroker.connect();
      oms.registerBroker(mockBroker);
    });

    afterEach(async () => {
      await mockBroker.disconnect();
    });

    it('should get order by id', async () => {
      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      const managedOrder = await oms.submitOrder(orderRequest);
      const retrievedOrder = oms.getOrder(managedOrder.id);

      expect(retrievedOrder).toBeDefined();
      expect(retrievedOrder?.id).toBe(managedOrder.id);
    });

    it('should get all orders', async () => {
      await oms.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      });

      await oms.submitOrder({
        symbol: 'TSLA',
        side: 'SELL',
        type: 'LIMIT',
        quantity: 50,
        price: 250.00,
      });

      const orders = oms.getOrders();

      expect(orders.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter orders by symbol', async () => {
      await oms.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      });

      await oms.submitOrder({
        symbol: 'TSLA',
        side: 'SELL',
        type: 'LIMIT',
        quantity: 50,
        price: 250.00,
      });

      const appleOrders = oms.getOrders({ symbol: 'AAPL' });

      expect(appleOrders.every(o => o.request.symbol === 'AAPL')).toBe(true);
    });

    it('should get active orders only', async () => {
      const order1 = await oms.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      });

      const order2 = await oms.submitOrder({
        symbol: 'TSLA',
        side: 'BUY',
        type: 'MARKET',
        quantity: 50,
      });

      await oms.cancelOrder(order2.id);

      const activeOrders = oms.getActiveOrders();

      expect(activeOrders.some(o => o.id === order1.id)).toBe(true);
      expect(activeOrders.some(o => o.id === order2.id)).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await mockBroker.connect();
      oms.registerBroker(mockBroker);
    });

    afterEach(async () => {
      await mockBroker.disconnect();
    });

    it('should calculate statistics', async () => {
      await oms.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      });

      await oms.submitOrder({
        symbol: 'TSLA',
        side: 'SELL',
        type: 'LIMIT',
        quantity: 50,
        price: 250.00,
      });

      const stats = oms.getStatistics();

      expect(stats.totalOrders).toBeGreaterThanOrEqual(2);
      expect(stats.activeOrders).toBeDefined();
      expect(stats.fillRate).toBeDefined();
    });

    it('should track cancelled orders', async () => {
      const order = await oms.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150.00,
      });

      await oms.cancelOrder(order.id);

      const stats = oms.getStatistics();

      expect(stats.cancelledOrders).toBeGreaterThan(0);
    });
  });

  describe('Global Instance', () => {
    afterEach(() => {
      resetGlobalOrderManagementSystem();
    });

    it('should return singleton instance', () => {
      const instance1 = getGlobalOrderManagementSystem();
      const instance2 = getGlobalOrderManagementSystem();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton instance', () => {
      const instance1 = getGlobalOrderManagementSystem();
      resetGlobalOrderManagementSystem();
      const instance2 = getGlobalOrderManagementSystem();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Order Expiry', () => {
    beforeEach(async () => {
      await mockBroker.connect();
      oms.registerBroker(mockBroker);
    });

    afterEach(async () => {
      await mockBroker.disconnect();
    });

    it('should handle order expiry timer', async () => {
      const omsWithShortExpiry = new OrderManagementSystem({
        maxOrderLifetime: 100, // 100ms for testing
        validateOrdersBeforeSubmit: false,
      });

      await mockBroker.connect();
      omsWithShortExpiry.registerBroker(mockBroker);

      const order = await omsWithShortExpiry.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150.00,
      });

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 200));

      const retrievedOrder = omsWithShortExpiry.getOrder(order.id);
      // Order should be cancelled or expired
      expect(['CANCELLED', 'EXPIRED']).toContain(retrievedOrder?.state);

      omsWithShortExpiry.shutdown();
    });
  });
});
