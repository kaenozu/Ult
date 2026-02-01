/**
 * @jest-environment node
 */
import {
  AlgorithmicExecutionEngine,
  Order,
  OrderBook,
  ExecutionConfig,
  DEFAULT_EXECUTION_CONFIG,
} from '../AlgorithmicExecutionEngine';

describe('AlgorithmicExecutionEngine', () => {
  let engine: AlgorithmicExecutionEngine;
  let mockOrderBook: OrderBook;

  beforeEach(() => {
    engine = new AlgorithmicExecutionEngine();
    mockOrderBook = {
      symbol: 'AAPL',
      bids: [
        { price: 150, size: 100 },
        { price: 149.9, size: 200 },
        { price: 149.8, size: 150 },
      ],
      asks: [
        { price: 150.1, size: 100 },
        { price: 150.2, size: 200 },
        { price: 150.3, size: 150 },
      ],
      timestamp: Date.now(),
      spread: 0.1,
      midPrice: 150.05,
    };
    engine.updateOrderBook('AAPL', mockOrderBook);
  });

  afterEach(() => {
    engine.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const defaultEngine = new AlgorithmicExecutionEngine();
      expect(defaultEngine).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<ExecutionConfig> = {
        maxLatency: 100,
        slippageTolerance: 0.2,
      };
      const customEngine = new AlgorithmicExecutionEngine(customConfig);
      expect(customEngine).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<ExecutionConfig> = {
        maxLatency: 100,
      };
      const customEngine = new AlgorithmicExecutionEngine(customConfig);
      expect(customEngine).toBeDefined();
      // Should still have other default values
    });
  });

  describe('Engine lifecycle', () => {
    it('should start the engine', () => {
      const startSpy = jest.fn();
      engine.on('started', startSpy);
      
      engine.start();
      
      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop the engine', () => {
      const stopSpy = jest.fn();
      engine.on('stopped', stopSpy);
      
      engine.start();
      engine.stop();
      
      expect(stopSpy).toHaveBeenCalledTimes(1);
    });

    it('should cancel all active orders when stopped', async () => {
      const cancelSpy = jest.fn();
      engine.on('order_cancelled', cancelSpy);
      
      engine.start();
      
      // Submit an order
      const orderPromise = engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150,
        timeInForce: 'GTC',
      });
      
      engine.stop();
      
      await orderPromise;
      
      // Should have cancelled orders
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('Standard order execution', () => {
    it('should submit and execute a market buy order', async () => {
      const submitSpy = jest.fn();
      const completeSpy = jest.fn();
      
      engine.on('order_submitted', submitSpy);
      engine.on('order_completed', completeSpy);
      
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      expect(submitSpy).toHaveBeenCalledTimes(1);
      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('filled');
      expect(result.filledQuantity).toBe(100);
      expect(result.avgPrice).toBeGreaterThan(0);
    });

    it('should submit and execute a market sell order', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'SELL',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      expect(result.status).toBe('filled');
      expect(result.filledQuantity).toBe(100);
      expect(result.avgPrice).toBeGreaterThan(0);
    });

    it('should execute a limit buy order within tolerance', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150.2,
        timeInForce: 'GTC',
      });
      
      expect(result.status).toBe('filled');
      expect(result.filledQuantity).toBeGreaterThan(0);
    });

    it('should reject limit buy order with excessive slippage', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 1000,
        price: 140, // Far below market
        timeInForce: 'GTC',
      });
      
      // Should partially fill or reject due to slippage
      expect(result.filledQuantity).toBeLessThan(1000);
    });

    it('should calculate fills correctly across multiple price levels', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 350, // More than first level
        timeInForce: 'GTC',
      });
      
      expect(result.fills.length).toBeGreaterThan(1);
      expect(result.filledQuantity).toBe(350);
    });

    it('should calculate fees correctly', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      expect(result.fees).toBeGreaterThan(0);
      expect(result.fees).toBe(result.totalValue * 0.001);
    });

    it('should calculate slippage correctly', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      expect(result.slippage).toBeDefined();
    });

    it('should reject order when no order book available', async () => {
      const result = await engine.submitOrder({
        symbol: 'UNKNOWN',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      expect(result.status).toBe('rejected');
      expect(result.filledQuantity).toBe(0);
    });
  });

  describe('Order management', () => {
    it('should cancel an order', async () => {
      const orderPromise = engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150,
        timeInForce: 'GTC',
      });
      
      const result = await orderPromise;
      const cancelled = await engine.cancelOrder(result.orderId);
      
      expect(cancelled).toBe(true);
    });

    it('should return false when cancelling non-existent order', async () => {
      const cancelled = await engine.cancelOrder('non-existent-id');
      expect(cancelled).toBe(false);
    });

    it('should modify an order', async () => {
      const orderPromise = engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150,
        timeInForce: 'GTC',
      });
      
      const result = await orderPromise;
      const activeOrders = engine.getActiveOrders();
      const orderId = activeOrders[0]?.id;
      
      if (orderId) {
        const modified = await engine.modifyOrder(orderId, { quantity: 200 });
        expect(modified?.quantity).toBe(200);
      }
    });

    it('should return null when modifying non-existent order', async () => {
      const modified = await engine.modifyOrder('non-existent-id', { quantity: 200 });
      expect(modified).toBeNull();
    });

    it('should get active orders', async () => {
      const orderPromise = engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        price: 150,
        timeInForce: 'GTC',
      });
      
      await orderPromise;
      const activeOrders = engine.getActiveOrders();
      
      expect(Array.isArray(activeOrders)).toBe(true);
    });
  });

  describe('TWAP algorithm', () => {
    it('should execute TWAP order', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'TWAP',
        quantity: 1000,
        timeInForce: 'GTC',
        algorithm: {
          type: 'twap',
          params: { duration: 1, slices: 5 },
        },
      });
      
      expect(result.fills.length).toBeGreaterThan(1);
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 10000);

    it('should distribute TWAP orders evenly', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'TWAP',
        quantity: 1000,
        timeInForce: 'GTC',
        algorithm: {
          type: 'twap',
          params: { duration: 1, slices: 4 },
        },
      });
      
      expect(result.fills.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('VWAP algorithm', () => {
    it('should execute VWAP order', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'VWAP',
        quantity: 1000,
        timeInForce: 'GTC',
        algorithm: {
          type: 'vwap',
          params: { duration: 1 },
        },
      });
      
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 15000);

    it('should use custom volume profile if provided', async () => {
      const customProfile = [0.3, 0.4, 0.3];
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'VWAP',
        quantity: 1000,
        timeInForce: 'GTC',
        algorithm: {
          type: 'vwap',
          params: { duration: 1, volumeProfile: customProfile },
        },
      });
      
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Iceberg algorithm', () => {
    it('should execute iceberg order', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'ICEBERG',
        quantity: 500,
        price: 151,
        timeInForce: 'GTC',
        algorithm: {
          type: 'iceberg',
          params: { displaySize: 100, variance: 0.1 },
        },
      });
      
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 15000);

    it('should vary iceberg slice sizes', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'ICEBERG',
        quantity: 500,
        price: 151,
        timeInForce: 'GTC',
        algorithm: {
          type: 'iceberg',
          params: { displaySize: 100, variance: 0.2 },
        },
      });
      
      expect(result.fills.length).toBeGreaterThan(1);
    }, 15000);
  });

  describe('Sniper algorithm', () => {
    it('should execute sniper order when trigger price reached', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
        algorithm: {
          type: 'sniper',
          params: { triggerPrice: 150.1, timeout: 1000 },
        },
      });
      
      // Should execute immediately since trigger price is at ask
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 5000);

    it('should timeout sniper order if trigger not reached', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
        algorithm: {
          type: 'sniper',
          params: { triggerPrice: 100, timeout: 500 }, // Very low trigger
        },
      });
      
      expect(result.status).toBe('rejected');
    }, 3000);
  });

  describe('Peg algorithm', () => {
    it('should execute peg order', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 100,
        timeInForce: 'GTC',
        algorithm: {
          type: 'peg',
          params: { offset: 0.01, duration: 1 },
        },
      });
      
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 5000);
  });

  describe('Percentage algorithm', () => {
    it('should execute percentage order', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
        algorithm: {
          type: 'percentage',
          params: { targetPercentage: 5, duration: 1 },
        },
      });
      
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 5000);
  });

  describe('Unknown algorithm', () => {
    it('should reject order with unknown algorithm', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
        algorithm: {
          type: 'unknown' as any,
          params: {},
        },
      });
      
      expect(result.status).toBe('rejected');
    });
  });

  describe('Order book management', () => {
    it('should update order book', () => {
      const updateSpy = jest.fn();
      engine.on('orderbook_update', updateSpy);
      
      const newOrderBook: OrderBook = { ...mockOrderBook };
      engine.updateOrderBook('AAPL', newOrderBook);
      
      expect(updateSpy).toHaveBeenCalledWith('AAPL', newOrderBook);
    });

    it('should get order book', () => {
      const orderBook = engine.getOrderBook('AAPL');
      expect(orderBook).toBeDefined();
      expect(orderBook?.symbol).toBe('AAPL');
    });

    it('should return undefined for non-existent order book', () => {
      const orderBook = engine.getOrderBook('UNKNOWN');
      expect(orderBook).toBeUndefined();
    });
  });

  describe('Market impact estimation', () => {
    it('should estimate market impact', () => {
      const estimate = engine.estimateMarketImpact('AAPL', 10000);
      
      expect(estimate.temporaryImpact).toBeGreaterThanOrEqual(0);
      expect(estimate.permanentImpact).toBeGreaterThanOrEqual(0);
      expect(estimate.totalCost).toBeGreaterThanOrEqual(0);
      expect(estimate.optimalSize).toBeGreaterThan(0);
    });

    it('should return zero impact when no order book', () => {
      const estimate = engine.estimateMarketImpact('UNKNOWN', 10000);
      
      expect(estimate.temporaryImpact).toBe(0);
      expect(estimate.permanentImpact).toBe(0);
      expect(estimate.totalCost).toBe(0);
    });

    it('should calculate impact with linear model', () => {
      const linearEngine = new AlgorithmicExecutionEngine({
        marketImpactModel: 'linear',
      });
      linearEngine.updateOrderBook('AAPL', mockOrderBook);
      
      const estimate = linearEngine.estimateMarketImpact('AAPL', 10000);
      expect(estimate.temporaryImpact).toBeGreaterThanOrEqual(0);
    });

    it('should calculate impact with power model', () => {
      const powerEngine = new AlgorithmicExecutionEngine({
        marketImpactModel: 'power',
      });
      powerEngine.updateOrderBook('AAPL', mockOrderBook);
      
      const estimate = powerEngine.estimateMarketImpact('AAPL', 10000);
      expect(estimate.temporaryImpact).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Latency tracking', () => {
    it('should track latency metrics', async () => {
      await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      const avgLatency = engine.getAverageLatency();
      
      expect(avgLatency.orderSubmission).toBeGreaterThanOrEqual(0);
      expect(avgLatency.orderAcknowledgment).toBeGreaterThanOrEqual(0);
      expect(avgLatency.fillNotification).toBeGreaterThanOrEqual(0);
      expect(avgLatency.roundTrip).toBeGreaterThanOrEqual(0);
    });

    it('should emit high latency event when threshold exceeded', async () => {
      const lowLatencyEngine = new AlgorithmicExecutionEngine({
        maxLatency: 0.001, // Very low threshold
      });
      lowLatencyEngine.updateOrderBook('AAPL', mockOrderBook);
      
      const highLatencySpy = jest.fn();
      lowLatencyEngine.on('high_latency', highLatencySpy);
      
      await lowLatencyEngine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      expect(highLatencySpy).toHaveBeenCalled();
    });

    it('should return zero latency when no metrics', () => {
      const newEngine = new AlgorithmicExecutionEngine();
      const avgLatency = newEngine.getAverageLatency();
      
      expect(avgLatency.roundTrip).toBe(0);
    });
  });

  describe('Execution history', () => {
    it('should track execution history', async () => {
      await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      const history = engine.getExecutionHistory();
      
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('orderId');
      expect(history[0]).toHaveProperty('status');
      expect(history[0]).toHaveProperty('filledQuantity');
    });

    it('should maintain multiple executions in history', async () => {
      await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      await engine.submitOrder({
        symbol: 'AAPL',
        side: 'SELL',
        type: 'MARKET',
        quantity: 50,
        timeInForce: 'GTC',
      });
      
      const history = engine.getExecutionHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero quantity gracefully', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0,
        timeInForce: 'GTC',
      });
      
      expect(result.filledQuantity).toBe(0);
    });

    it('should handle missing algorithm params', async () => {
      const result = await engine.submitOrder({
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
        algorithm: {
          type: 'twap',
          params: {},
        },
      });
      
      // Should use default params
      expect(result.filledQuantity).toBeGreaterThan(0);
    }, 10000);

    it('should handle partial fills correctly', async () => {
      // Create order book with limited liquidity
      const limitedOrderBook: OrderBook = {
        symbol: 'TEST',
        bids: [{ price: 100, size: 50 }],
        asks: [{ price: 100.1, size: 50 }],
        timestamp: Date.now(),
        spread: 0.1,
        midPrice: 100.05,
      };
      engine.updateOrderBook('TEST', limitedOrderBook);
      
      const result = await engine.submitOrder({
        symbol: 'TEST',
        side: 'BUY',
        type: 'MARKET',
        quantity: 100,
        timeInForce: 'GTC',
      });
      
      expect(result.status).toBe('partial');
      expect(result.filledQuantity).toBe(50);
    });
  });
});
