/**
 * ExecutionQualityMonitor.test.ts
 * 
 * Unit tests for Execution Quality Monitor
 */

import {
  ExecutionQualityMonitor,
  getGlobalExecutionQualityMonitor,
  resetGlobalExecutionQualityMonitor,
  QualityAlert,
} from '../ExecutionQualityMonitor';
import { ManagedOrder } from '../OrderManagementSystem';

describe('ExecutionQualityMonitor', () => {
  let monitor: ExecutionQualityMonitor;

  beforeEach(() => {
    monitor = new ExecutionQualityMonitor({
      slippageWarningThreshold: 0.3,
      slippageCriticalThreshold: 1.0,
      latencyWarningThreshold: 1000,
      latencyCriticalThreshold: 5000,
      fillRateWarningThreshold: 95,
      commissionWarningThreshold: 0.5,
      enableRealTimeAlerts: true,
      metricsRetentionPeriod: 90,
    });
  });

  describe('Metrics Recording', () => {
    it('should record execution metrics', () => {
      const recordedSpy = jest.fn();
      monitor.on('execution_recorded', recordedSpy);

      const mockOrder = createMockOrder({
        quantity: 100,
        filledQuantity: 100,
        averageFillPrice: 150.50,
        requestPrice: 150.00,
        submittedAt: Date.now() - 500,
        filledAt: Date.now(),
      });

      monitor.recordExecution(mockOrder);

      expect(recordedSpy).toHaveBeenCalled();
    });

    it('should calculate fill rate correctly', () => {
      const mockOrder = createMockOrder({
        quantity: 100,
        filledQuantity: 80,
        averageFillPrice: 150.00,
      });

      monitor.recordExecution(mockOrder);

      const metrics = monitor.getAggregatedMetrics('all');
      expect(metrics?.averageFillRate).toBeCloseTo(80, 0);
    });

    it('should calculate slippage for buy orders', () => {
      const mockOrder = createMockOrder({
        side: 'BUY',
        quantity: 100,
        filledQuantity: 100,
        requestPrice: 150.00,
        averageFillPrice: 150.50, // Paid more than expected
      });

      monitor.recordExecution(mockOrder);

      const metrics = monitor.getAggregatedMetrics('all');
      expect(metrics?.averageSlippage).toBeGreaterThan(0);
    });

    it('should calculate slippage for sell orders', () => {
      const mockOrder = createMockOrder({
        side: 'SELL',
        quantity: 100,
        filledQuantity: 100,
        requestPrice: 150.00,
        averageFillPrice: 149.50, // Received less than expected
      });

      monitor.recordExecution(mockOrder);

      const metrics = monitor.getAggregatedMetrics('all');
      expect(metrics?.averageSlippage).toBeGreaterThan(0);
    });

    it('should not record incomplete orders', () => {
      const incompleteOrder = createMockOrder({
        filledQuantity: 0,
        averageFillPrice: 0,
      });

      // Remove fills to make it incomplete
      (incompleteOrder as any).fills = [];

      monitor.recordExecution(incompleteOrder);

      const metrics = monitor.getAggregatedMetrics('all');
      expect(metrics).toBeNull();
    });
  });

  describe('Quality Alerts', () => {
    it('should raise warning for high slippage', () => {
      const alertSpy = jest.fn();
      monitor.on('quality_alert', alertSpy);

      const mockOrder = createMockOrder({
        quantity: 100,
        filledQuantity: 100,
        requestPrice: 150.00,
        averageFillPrice: 150.50, // 0.33% slippage
      });

      monitor.recordExecution(mockOrder);

      expect(alertSpy).toHaveBeenCalled();
      const alert: QualityAlert = alertSpy.mock.calls[0][0];
      expect(alert.type).toBe('HIGH_SLIPPAGE');
      expect(alert.severity).toBe('warning');
    });

    it('should raise critical alert for very high slippage', () => {
      const alertSpy = jest.fn();
      monitor.on('quality_alert', alertSpy);

      const mockOrder = createMockOrder({
        quantity: 100,
        filledQuantity: 100,
        requestPrice: 150.00,
        averageFillPrice: 152.00, // 1.33% slippage
      });

      monitor.recordExecution(mockOrder);

      expect(alertSpy).toHaveBeenCalled();
      const alert: QualityAlert = alertSpy.mock.calls[0][0];
      expect(alert.type).toBe('HIGH_SLIPPAGE');
      expect(alert.severity).toBe('critical');
    });

    it('should raise alert for high latency', () => {
      const alertSpy = jest.fn();
      monitor.on('quality_alert', alertSpy);

      const mockOrder = createMockOrder({
        quantity: 100,
        filledQuantity: 100,
        submittedAt: Date.now() - 6000, // 6 seconds ago
        filledAt: Date.now(),
      });

      monitor.recordExecution(mockOrder);

      expect(alertSpy).toHaveBeenCalled();
      const alert: QualityAlert = alertSpy.mock.calls[0][0];
      expect(alert.type).toBe('HIGH_LATENCY');
    });

    it('should raise alert for low fill rate', () => {
      const alertSpy = jest.fn();
      monitor.on('quality_alert', alertSpy);

      const mockOrder = createMockOrder({
        quantity: 100,
        filledQuantity: 85, // 85% fill rate
      });

      monitor.recordExecution(mockOrder);

      expect(alertSpy).toHaveBeenCalled();
      const alert: QualityAlert = alertSpy.mock.calls[0][0];
      expect(alert.type).toBe('LOW_FILL_RATE');
    });

    it('should get alerts by type', () => {
      const highSlippageOrder = createMockOrder({
        requestPrice: 150.00,
        averageFillPrice: 152.00,
      });

      const highLatencyOrder = createMockOrder({
        submittedAt: Date.now() - 6000,
        filledAt: Date.now(),
      });

      monitor.recordExecution(highSlippageOrder);
      monitor.recordExecution(highLatencyOrder);

      const slippageAlerts = monitor.getAlerts({ type: 'HIGH_SLIPPAGE' });
      const latencyAlerts = monitor.getAlerts({ type: 'HIGH_LATENCY' });

      expect(slippageAlerts.length).toBeGreaterThan(0);
      expect(latencyAlerts.length).toBeGreaterThan(0);
    });

    it('should clear alerts', () => {
      const mockOrder = createMockOrder({
        requestPrice: 150.00,
        averageFillPrice: 152.00,
      });

      monitor.recordExecution(mockOrder);

      let alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      monitor.clearAlerts();
      alerts = monitor.getAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('Venue Performance', () => {
    it('should track venue performance', () => {
      const performanceUpdatedSpy = jest.fn();
      monitor.on('venue_performance_updated', performanceUpdatedSpy);

      const mockOrder = createMockOrder({
        venue: 'IBKR',
        quantity: 100,
        filledQuantity: 100,
      });

      monitor.recordExecution(mockOrder);

      expect(performanceUpdatedSpy).toHaveBeenCalled();
    });

    it('should get venue performance', () => {
      const mockOrder = createMockOrder({
        venue: 'IBKR',
        quantity: 100,
        filledQuantity: 95,
      });

      monitor.recordExecution(mockOrder);

      const performance = monitor.getVenuePerformance('IBKR');

      expect(performance).toBeDefined();
      expect(performance?.venue).toBe('IBKR');
      expect(performance?.orderCount).toBeGreaterThan(0);
      expect(performance?.reliabilityScore).toBeGreaterThan(0);
    });

    it('should get all venue performances sorted by reliability', () => {
      const ibkrOrder = createMockOrder({
        venue: 'IBKR',
        quantity: 100,
        filledQuantity: 100,
        requestPrice: 150.00,
        averageFillPrice: 150.10,
      });

      const alpacaOrder = createMockOrder({
        venue: 'Alpaca',
        quantity: 100,
        filledQuantity: 90,
        requestPrice: 150.00,
        averageFillPrice: 151.00,
      });

      monitor.recordExecution(ibkrOrder);
      monitor.recordExecution(alpacaOrder);

      const performances = monitor.getAllVenuePerformances();

      expect(performances.length).toBe(2);
      expect(performances[0].reliabilityScore).toBeGreaterThanOrEqual(performances[1].reliabilityScore);
    });
  });

  describe('Aggregated Metrics', () => {
    it('should return null when no metrics available', () => {
      const metrics = monitor.getAggregatedMetrics('day');
      expect(metrics).toBeNull();
    });

    it('should calculate aggregated metrics', () => {
      const order1 = createMockOrder({
        quantity: 100,
        filledQuantity: 100,
        requestPrice: 150.00,
        averageFillPrice: 150.20,
        totalCommission: 5.00,
      });

      const order2 = createMockOrder({
        quantity: 200,
        filledQuantity: 200,
        requestPrice: 200.00,
        averageFillPrice: 200.50,
        totalCommission: 10.00,
      });

      monitor.recordExecution(order1);
      monitor.recordExecution(order2);

      const metrics = monitor.getAggregatedMetrics('all');

      expect(metrics).toBeDefined();
      expect(metrics?.totalOrders).toBe(2);
      expect(metrics?.totalVolume).toBe(300);
      expect(metrics?.totalCommissions).toBe(15);
      expect(metrics?.averageFillRate).toBeCloseTo(100, 0);
    });

    it('should identify best and worst executions', () => {
      const goodOrder = createMockOrder({
        requestPrice: 150.00,
        averageFillPrice: 150.05, // Low slippage
      });

      const badOrder = createMockOrder({
        requestPrice: 150.00,
        averageFillPrice: 151.50, // High slippage
      });

      monitor.recordExecution(goodOrder);
      monitor.recordExecution(badOrder);

      const metrics = monitor.getAggregatedMetrics('all');

      expect(metrics).toBeDefined();
      expect(Math.abs(metrics!.bestExecution.slippagePercent)).toBeLessThan(
        Math.abs(metrics!.worstExecution.slippagePercent)
      );
    });

    it('should filter metrics by time period', () => {
      const oldOrder = createMockOrder({
        filledAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      });

      const recentOrder = createMockOrder({
        filledAt: Date.now(),
      });

      monitor.recordExecution(oldOrder);
      monitor.recordExecution(recentOrder);

      const dayMetrics = monitor.getAggregatedMetrics('day');
      const allMetrics = monitor.getAggregatedMetrics('all');

      expect(dayMetrics?.totalOrders).toBe(1); // Only recent order
      expect(allMetrics?.totalOrders).toBe(2); // Both orders
    });
  });

  describe('Global Instance', () => {
    afterEach(() => {
      resetGlobalExecutionQualityMonitor();
    });

    it('should return singleton instance', () => {
      const instance1 = getGlobalExecutionQualityMonitor();
      const instance2 = getGlobalExecutionQualityMonitor();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton instance', () => {
      const instance1 = getGlobalExecutionQualityMonitor();
      resetGlobalExecutionQualityMonitor();
      const instance2 = getGlobalExecutionQualityMonitor();

      expect(instance1).not.toBe(instance2);
    });
  });
});

// Helper function to create mock orders
function createMockOrder(overrides: Partial<ManagedOrder> = {}): ManagedOrder {
  const now = Date.now();
  const defaultOrder: ManagedOrder = {
    id: `order_${Math.random().toString(36).substr(2, 9)}`,
    request: {
      symbol: 'AAPL',
      side: 'BUY',
      type: 'MARKET',
      quantity: 100,
      price: 150.00,
    },
    state: 'FILLED',
    createdAt: now - 1000,
    updatedAt: now,
    submittedAt: now - 800,
    filledAt: now - 200,
    fills: [
      {
        fillId: 'fill_1',
        orderId: 'order_1',
        quantity: 100,
        price: 150.00,
        commission: 5.00,
        timestamp: now - 200,
      },
    ],
    totalFilled: 100,
    remainingQuantity: 0,
    averageFillPrice: 150.00,
    totalCommission: 5.00,
    brokerOrder: {
      orderId: 'broker_order_1',
      symbol: 'AAPL',
      side: 'BUY',
      type: 'MARKET',
      quantity: 100,
      filledQuantity: 100,
      averageFillPrice: 150.00,
      status: 'FILLED',
      timeInForce: 'DAY',
      submittedAt: now - 800,
      filledAt: now - 200,
      commission: 5.00,
      broker: 'IBKR',
    },
    routingDecision: {
      venue: 'IBKR',
      strategy: 'SINGLE',
      splits: [],
      estimatedSlippage: 0,
      estimatedCommission: 5.00,
      reason: 'Best execution',
    },
  };

  // Apply overrides
  const order = { ...defaultOrder, ...overrides };

  // Update related fields if specific overrides are provided
  if (overrides.averageFillPrice !== undefined) {
    order.averageFillPrice = overrides.averageFillPrice;
    if (order.brokerOrder) {
      order.brokerOrder.averageFillPrice = overrides.averageFillPrice;
    }
  }

  if (overrides.totalFilled !== undefined) {
    order.totalFilled = overrides.totalFilled;
    if (order.brokerOrder) {
      order.brokerOrder.filledQuantity = overrides.totalFilled;
    }
  }

  if (overrides.side !== undefined) {
    order.request.side = overrides.side;
    if (order.brokerOrder) {
      order.brokerOrder.side = overrides.side;
    }
  }

  if (overrides.requestPrice !== undefined) {
    order.request.price = overrides.requestPrice;
  }

  if (overrides.venue !== undefined && order.routingDecision) {
    order.routingDecision.venue = overrides.venue;
  }

  return order;
}
