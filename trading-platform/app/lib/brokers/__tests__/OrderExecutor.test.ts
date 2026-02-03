/**
 * Tests for Order Executor
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { OrderExecutor, OrderExecutorConfig } from '../OrderExecutor';
import { BrokerOrderRequest } from '../../../types/broker';

describe('OrderExecutor', () => {
  let executor: OrderExecutor;
  const config: OrderExecutorConfig = {
    defaultBroker: 'paper',
    brokers: [
      {
        type: 'paper',
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        paperTrading: true,
      },
    ],
    autoRetry: true,
    maxRetries: 3,
    retryDelay: 100,
  };

  beforeEach(async () => {
    executor = new OrderExecutor(config);
    await executor.connectAll();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(executor.getDefaultBroker()).toBe('paper');
      expect(executor.getConfiguredBrokers()).toContain('paper');
    });

    it('should connect to all brokers', () => {
      expect(executor.isConnected('paper')).toBe(true);
    });
  });

  describe('Order Execution', () => {
    it('should execute a market order', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const result = await executor.execute(order);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order?.status).toBe('filled');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle order execution errors', async () => {
      const order: BrokerOrderRequest = {
        symbol: '',
        side: 'buy',
        type: 'market',
        quantity: 100,
      };

      const result = await executor.execute(order);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should calculate slippage', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const result = await executor.execute(order);

      expect(result.slippage).toBeDefined();
    });

    it('should use specified broker', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const result = await executor.execute(order, 'paper');

      expect(result.success).toBe(true);
      expect(result.order?.orderId).toContain('PAPER');
    });
  });

  describe('Order Management', () => {
    it('should cancel an order', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'limit',
        quantity: 100,
        limitPrice: 150,
      };

      const result = await executor.execute(order);
      const cancelled = await executor.cancel(result.order!.orderId);

      expect(cancelled).toBe(true);
    });

    it('should get order status', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const result = await executor.execute(order);
      const orderStatus = await executor.getOrder(result.order!.orderId);

      expect(orderStatus).toBeDefined();
      expect(orderStatus?.orderId).toBe(result.order!.orderId);
    });

    it('should get open orders', async () => {
      const order1: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'limit',
        quantity: 100,
        limitPrice: 150,
      };

      const order2: BrokerOrderRequest = {
        symbol: 'GOOGL',
        side: 'buy',
        type: 'limit',
        quantity: 50,
        limitPrice: 2500,
      };

      await executor.execute(order1);
      await executor.execute(order2);

      const openOrders = await executor.getOpenOrders();

      expect(openOrders.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Positions', () => {
    it('should get positions', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      await executor.execute(order);

      const positions = await executor.getPositions();

      expect(positions.length).toBeGreaterThan(0);
      expect(positions[0].symbol).toBe('AAPL');
    });
  });

  describe('Account', () => {
    it('should get account information', async () => {
      const account = await executor.getAccount();

      expect(account).toBeDefined();
      expect(account?.accountId).toBeDefined();
      expect(account?.cash).toBeDefined();
    });
  });

  describe('Broker Management', () => {
    it('should set default broker', () => {
      executor.setDefaultBroker('paper');
      expect(executor.getDefaultBroker()).toBe('paper');
    });

    it('should throw error when setting invalid broker', () => {
      expect(() => executor.setDefaultBroker('invalid' as any)).toThrow();
    });

    it('should disconnect from all brokers', async () => {
      await executor.disconnectAll();
      expect(executor.isConnected('paper')).toBe(false);
    });
  });
});
