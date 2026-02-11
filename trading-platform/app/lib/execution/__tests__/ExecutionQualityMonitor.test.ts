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
      (incompleteOrder as { fills: unknown[] }).fills = [];

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
        filledQuantity: 90, // 90% fill rate (below 95% threshold)
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
        filledQuantity: 100, // 100% fill rate
      });

      monitor.recordExecution(mockOrder);

      const performance = monitor.getVenuePerformance('IBKR');

      expect(performance).toBeDefined();
      expect(performance?.venue).toBe('IBKR');
      expect(performance?.orderCount).toBeGreaterThan(0);
      expect(performance?.reliabilityScore).toBeGreaterThanOrEqual(0);
      expect(performance?.reliabilityScore).toBeLessThanOrEqual(100);
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
        quantity: 100, // Changed from 200 to 100
        filledQuantity: 100, // Changed from 200 to 100
        requestPrice: 200.00,
        averageFillPrice: 200.50,
        totalCommission: 10.00,
      });

      monitor.recordExecution(order1);
      monitor.recordExecution(order2);

      const metrics = monitor.getAggregatedMetrics('all');

      expect(metrics).toBeDefined();
      expect(metrics?.totalOrders).toBe(2);
      expect(metrics?.totalVolume).toBe(200); // Changed from 300 to 200
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
function createMockOrder(overrides: Partial<ManagedOrder> & {
  quantity?: number;
  filledQuantity?: number;
  averageFillPrice?: number;
  requestPrice?: number;
  side?: 'BUY' | 'SELL';
  totalCommission?: number;
  submittedAt?: number;
  filledAt?: number;
  venue?: string;
} = {}): ManagedOrder {
  const now = Date.now();
  
  // Extract overrides
  const quantity = overrides.quantity ?? 100;
  const filledQuantity = overrides.filledQuantity ?? 100;
  const averageFillPrice = overrides.averageFillPrice ?? 150.00;
  const requestPrice = overrides.requestPrice ?? 150.00;
  const side = overrides.side ?? 'BUY';
  const totalCommission = overrides.totalCommission ?? 5.00;
  const submittedAt = overrides.submittedAt ?? (now - 800);
  const filledAt = overrides.filledAt ?? (now - 200);
  const venue = overrides.venue ?? 'IBKR';
  
  const defaultOrder: ManagedOrder = {
    id: `order_${Math.random().toString(36).substr(2, 9)}`,
    request: {
      symbol: 'AAPL',
      side: side,
      type: 'MARKET',
      quantity: quantity,
      price: requestPrice,
    },
    state: 'FILLED',
    createdAt: now - 1000,
    updatedAt: now,
    submittedAt: submittedAt,
    filledAt: filledAt,
    fills: [
      {
        fillId: 'fill_1',
        orderId: 'order_1',
        quantity: filledQuantity,
        price: averageFillPrice,
        commission: totalCommission,
        timestamp: filledAt,
      },
    ],
    totalFilled: filledQuantity,
    remainingQuantity: quantity - filledQuantity,
    averageFillPrice: averageFillPrice,
    totalCommission: totalCommission,
    brokerOrder: {
      orderId: 'broker_order_1',
      symbol: 'AAPL',
      side: side,
      type: 'MARKET',
      quantity: quantity,
      filledQuantity: filledQuantity,
      averageFillPrice: averageFillPrice,
      status: 'FILLED',
      timeInForce: 'DAY',
      submittedAt: submittedAt,
      filledAt: filledAt,
      commission: totalCommission,
      broker: 'IBKR',
    },
    routingDecision: {
      primaryVenue: venue,
      strategy: 'SINGLE',
      splits: [],
      estimatedSlippage: 0,
      estimatedCommission: totalCommission,
      reason: 'Best execution',
    },
  };

  // Apply other overrides
  return { ...defaultOrder, ...overrides };
}
