/**
 * BrokerConnectors.test.ts
 * 
 * Unit tests for broker connector implementations
 */

import {
  IBKRConnector,
  AlpacaConnector,
  TDAmeritradeConnector,
  createBrokerConnector,
  OrderRequest,
  BrokerConfig,
} from '../BrokerConnectors';

describe('BrokerConnectors', () => {
  const mockConfig: Omit<BrokerConfig, 'name'> = {
    credentials: {
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      environment: 'paper',
    },
    enableOrderBookDepth: true,
    maxRetries: 3,
    retryDelay: 1000,
    requestTimeout: 5000,
  };

  describe('IBKRConnector', () => {
    let connector: IBKRConnector;

    beforeEach(() => {
      connector = new IBKRConnector(mockConfig);
    });

    afterEach(async () => {
      if (connector.isConnected()) {
        await connector.disconnect();
      }
    });

    it('should create IBKR connector', () => {
      expect(connector).toBeDefined();
      expect(connector.getBrokerName()).toBe('IBKR');
      expect(connector.isConnected()).toBe(false);
    });

    it('should connect successfully', async () => {
      await connector.connect();
      expect(connector.isConnected()).toBe(true);
    });

    it('should emit connected event', async () => {
      const connectedSpy = jest.fn();
      connector.on('connected', connectedSpy);

      await connector.connect();

      expect(connectedSpy).toHaveBeenCalledWith({ broker: 'IBKR' });
    });

    it('should submit market order', async () => {
      await connector.connect();

      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      const order = await connector.submitOrder(orderRequest);

      expect(order).toBeDefined();
      expect(order.symbol).toBe('AAPL');
      expect(order.side).toBe('BUY');
      expect(order.type).toBe('MARKET');
      expect(order.quantity).toBe(100);
      expect(order.status).toBe('SUBMITTED');
      expect(order.broker).toBe('IBKR');
    });

    it('should submit limit order with price', async () => {
      await connector.connect();

      const orderRequest: OrderRequest = {
        symbol: 'TSLA',
        side: 'SELL',
        type: 'LIMIT',
        quantity: 50,
        price: 250.50,
        timeInForce: 'GTC',
      };

      const order = await connector.submitOrder(orderRequest);

      expect(order.price).toBe(250.50);
      expect(order.timeInForce).toBe('GTC');
    });

    it('should fail to submit order when not connected', async () => {
      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      await expect(connector.submitOrder(orderRequest)).rejects.toThrow('Not connected to IBKR');
    });

    it('should cancel order', async () => {
      await connector.connect();

      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      const order = await connector.submitOrder(orderRequest);
      const cancelled = await connector.cancelOrder(order.orderId);

      expect(cancelled).toBe(true);
      
      const updatedOrder = await connector.getOrder(order.orderId);
      expect(updatedOrder.status).toBe('CANCELLED');
      expect(updatedOrder.cancelledAt).toBeDefined();
    });

    it('should modify order', async () => {
      await connector.connect();

      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150.00,
      };

      const order = await connector.submitOrder(orderRequest);
      const modifiedOrder = await connector.modifyOrder(order.orderId, {
        quantity: 200,
        price: 155.00,
      });

      expect(modifiedOrder.quantity).toBe(200);
      expect(modifiedOrder.price).toBe(155.00);
    });

    it('should get account balance', async () => {
      await connector.connect();

      const balance = await connector.getAccountBalance();

      expect(balance).toBeDefined();
      expect(balance.totalEquity).toBeGreaterThan(0);
      expect(balance.cashBalance).toBeGreaterThan(0);
      expect(balance.buyingPower).toBeGreaterThan(0);
    });

    it('should get positions', async () => {
      await connector.connect();

      const positions = await connector.getPositions();

      expect(Array.isArray(positions)).toBe(true);
    });

    it('should get order book', async () => {
      await connector.connect();

      const orderBook = await connector.getOrderBook('AAPL', 5);

      expect(orderBook).toBeDefined();
      expect(orderBook.symbol).toBe('AAPL');
      expect(orderBook.bids).toHaveLength(5);
      expect(orderBook.asks).toHaveLength(5);
      expect(orderBook.timestamp).toBeGreaterThan(0);
    });

    it('should emit order_update event', async () => {
      await connector.connect();

      const orderUpdateSpy = jest.fn();
      connector.on('order_update', orderUpdateSpy);

      const orderRequest: OrderRequest = {
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      };

      await connector.submitOrder(orderRequest);

      expect(orderUpdateSpy).toHaveBeenCalled();
    });

    it('should disconnect successfully', async () => {
      await connector.connect();
      
      const disconnectedSpy = jest.fn();
      connector.on('disconnected', disconnectedSpy);

      await connector.disconnect();

      expect(connector.isConnected()).toBe(false);
      expect(disconnectedSpy).toHaveBeenCalledWith({ broker: 'IBKR' });
    });
  });

  describe('AlpacaConnector', () => {
    let connector: AlpacaConnector;

    beforeEach(() => {
      connector = new AlpacaConnector(mockConfig);
    });

    afterEach(async () => {
      if (connector.isConnected()) {
        await connector.disconnect();
      }
    });

    it('should create Alpaca connector', () => {
      expect(connector).toBeDefined();
      expect(connector.getBrokerName()).toBe('Alpaca');
    });

    it('should connect and submit order', async () => {
      await connector.connect();

      const orderRequest: OrderRequest = {
        symbol: 'SPY',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10,
      };

      const order = await connector.submitOrder(orderRequest);

      expect(order.broker).toBe('Alpaca');
      expect(order.symbol).toBe('SPY');
    });

    it('should have day trading buying power in balance', async () => {
      await connector.connect();

      const balance = await connector.getAccountBalance();

      expect(balance.dayTradingBuyingPower).toBeDefined();
      expect(balance.dayTradingBuyingPower).toBeGreaterThan(0);
    });
  });

  describe('TDAmeritradeConnector', () => {
    let connector: TDAmeritradeConnector;

    beforeEach(() => {
      connector = new TDAmeritradeConnector(mockConfig);
    });

    afterEach(async () => {
      if (connector.isConnected()) {
        await connector.disconnect();
      }
    });

    it('should create TD Ameritrade connector', () => {
      expect(connector).toBeDefined();
      expect(connector.getBrokerName()).toBe('TD Ameritrade');
    });

    it('should connect and submit order', async () => {
      await connector.connect();

      const orderRequest: OrderRequest = {
        symbol: 'QQQ',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 20,
        price: 400.00,
      };

      const order = await connector.submitOrder(orderRequest);

      expect(order.broker).toBe('TD Ameritrade');
      expect(order.symbol).toBe('QQQ');
    });
  });

  describe('createBrokerConnector factory', () => {
    it('should create IBKR connector', () => {
      const connector = createBrokerConnector('IBKR', mockConfig);
      expect(connector.getBrokerName()).toBe('IBKR');
    });

    it('should create Alpaca connector', () => {
      const connector = createBrokerConnector('Alpaca', mockConfig);
      expect(connector.getBrokerName()).toBe('Alpaca');
    });

    it('should create TD Ameritrade connector', () => {
      const connector = createBrokerConnector('TDAmeritrade', mockConfig);
      expect(connector.getBrokerName()).toBe('TD Ameritrade');
    });

    it('should throw error for unknown broker type', () => {
      expect(() => {
        createBrokerConnector('Unknown' as unknown, mockConfig);
      }).toThrow('Unknown broker type');
    });
  });

  describe('Order lifecycle', () => {
    let connector: IBKRConnector;

    beforeEach(async () => {
      connector = new IBKRConnector(mockConfig);
      await connector.connect();
    });

    afterEach(async () => {
      await connector.disconnect();
    });

    it('should handle complete order lifecycle', async () => {
      // Submit order
      const orderRequest: OrderRequest = {
        symbol: 'MSFT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 300.00,
        clientOrderId: 'test-order-123',
      };

      const order = await connector.submitOrder(orderRequest);
      expect(order.status).toBe('SUBMITTED');

      // Modify order
      const modifiedOrder = await connector.modifyOrder(order.orderId, {
        price: 305.00,
      });
      expect(modifiedOrder.price).toBe(305.00);

      // Cancel order
      const cancelled = await connector.cancelOrder(order.orderId);
      expect(cancelled).toBe(true);

      // Verify final status
      const finalOrder = await connector.getOrder(order.orderId);
      expect(finalOrder.status).toBe('CANCELLED');
    });

    it('should get all orders for a symbol', async () => {
      const symbol = 'AAPL';

      // Submit multiple orders
      await connector.submitOrder({
        symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
      });

      await connector.submitOrder({
        symbol,
        side: 'SELL',
        type: 'LIMIT',
        quantity: 50,
        price: 180.00,
      });

      const orders = await connector.getOrders(symbol);

      expect(orders.length).toBeGreaterThanOrEqual(2);
      expect(orders.every(o => o.symbol === symbol)).toBe(true);
    });
  });
});
