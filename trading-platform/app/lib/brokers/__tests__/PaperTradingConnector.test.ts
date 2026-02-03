/**
 * Tests for Paper Trading Connector
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PaperTradingConnector } from '../PaperTradingConnector';
import { BrokerConfig, BrokerOrderRequest } from '../../../types/broker';

describe('PaperTradingConnector', () => {
  let connector: PaperTradingConnector;
  const config: BrokerConfig = {
    type: 'paper',
    apiKey: 'test_key',
    apiSecret: 'test_secret',
    paperTrading: true,
  };

  beforeEach(async () => {
    connector = new PaperTradingConnector(config);
    await connector.connect();
  });

  describe('Connection', () => {
    it('should connect successfully', () => {
      expect(connector.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await connector.disconnect();
      expect(connector.isConnected()).toBe(false);
    });

    it('should return correct broker type', () => {
      expect(connector.getBrokerType()).toBe('paper');
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

      const response = await connector.executeOrder(order);

      expect(response.orderId).toBeDefined();
      expect(response.status).toBe('filled');
      expect(response.symbol).toBe('AAPL');
      expect(response.side).toBe('buy');
      expect(response.quantity).toBe(100);
      expect(response.filledQuantity).toBe(100);
      expect(response.averageFillPrice).toBeDefined();
    });

    it('should execute a limit order', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'GOOGL',
        side: 'buy',
        type: 'limit',
        quantity: 50,
        limitPrice: 2500,
      };

      const response = await connector.executeOrder(order);

      expect(response.status).toBe('accepted');
      expect(response.filledQuantity).toBe(0);
      expect(response.limitPrice).toBe(2500);
    });

    it('should reject invalid order (missing symbol)', async () => {
      const order: BrokerOrderRequest = {
        symbol: '',
        side: 'buy',
        type: 'market',
        quantity: 100,
      };

      await expect(connector.executeOrder(order)).rejects.toThrow('Symbol is required');
    });

    it('should reject invalid order (zero quantity)', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 0,
      };

      await expect(connector.executeOrder(order)).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should generate unique order IDs', async () => {
      const order1: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const order2: BrokerOrderRequest = {
        symbol: 'GOOGL',
        side: 'buy',
        type: 'market',
        quantity: 50,
        limitPrice: 2500,
      };

      const response1 = await connector.executeOrder(order1);
      const response2 = await connector.executeOrder(order2);

      expect(response1.orderId).not.toBe(response2.orderId);
    });
  });

  describe('Order Management', () => {
    it('should cancel an open order', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'limit',
        quantity: 100,
        limitPrice: 150,
      };

      const response = await connector.executeOrder(order);
      const cancelled = await connector.cancelOrder(response.orderId);

      expect(cancelled).toBe(true);

      const orderStatus = await connector.getOrder(response.orderId);
      expect(orderStatus.status).toBe('cancelled');
    });

    it('should throw error when cancelling filled order', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const response = await connector.executeOrder(order);

      await expect(connector.cancelOrder(response.orderId)).rejects.toThrow('Cannot cancel order in filled status');
    });

    it('should get order by ID', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const response = await connector.executeOrder(order);
      const retrieved = await connector.getOrder(response.orderId);

      expect(retrieved.orderId).toBe(response.orderId);
      expect(retrieved.symbol).toBe('AAPL');
    });

    it('should list open orders', async () => {
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

      await connector.executeOrder(order1);
      await connector.executeOrder(order2);

      const openOrders = await connector.getOpenOrders();

      expect(openOrders.length).toBe(2);
    });
  });

  describe('Positions', () => {
    it('should create a long position', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      await connector.executeOrder(order);

      const positions = await connector.getPositions();

      expect(positions.length).toBe(1);
      expect(positions[0].symbol).toBe('AAPL');
      expect(positions[0].side).toBe('long');
      expect(positions[0].quantity).toBe(100);
    });

    it('should create a short position', async () => {
      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'sell',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      await connector.executeOrder(order);

      const positions = await connector.getPositions();

      expect(positions.length).toBe(1);
      expect(positions[0].symbol).toBe('AAPL');
      expect(positions[0].side).toBe('short');
      expect(positions[0].quantity).toBe(100);
    });

    it('should add to existing position', async () => {
      const order1: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const order2: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 50,
        limitPrice: 155,
      };

      await connector.executeOrder(order1);
      await connector.executeOrder(order2);

      const positions = await connector.getPositions();

      expect(positions.length).toBe(1);
      expect(positions[0].quantity).toBe(150);
    });

    it('should close position', async () => {
      const buyOrder: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      const sellOrder: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'sell',
        type: 'market',
        quantity: 100,
        limitPrice: 160,
      };

      await connector.executeOrder(buyOrder);
      await connector.executeOrder(sellOrder);

      const positions = await connector.getPositions();

      expect(positions.length).toBe(0);
    });
  });

  describe('Account', () => {
    it('should get account information', async () => {
      const account = await connector.getAccount();

      expect(account.accountId).toBe('PAPER_ACCOUNT');
      expect(account.accountType).toBe('cash');
      expect(account.cash).toBeDefined();
      expect(account.portfolioValue).toBeDefined();
      expect(account.currency).toBe('USD');
    });

    it('should update cash after order', async () => {
      const initialAccount = await connector.getAccount();
      const initialCash = initialAccount.cash;

      const order: BrokerOrderRequest = {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 100,
        limitPrice: 150,
      };

      await connector.executeOrder(order);

      const finalAccount = await connector.getAccount();
      const finalCash = finalAccount.cash;

      expect(finalCash).toBeLessThan(initialCash);
    });
  });
});
