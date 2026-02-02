/**
 * OrderManagementSystem.ts
 * 
 * Comprehensive order lifecycle management system
 * Handles order state tracking, partial fills, cancellations, and routing
 */

import { EventEmitter } from 'events';
import { 
  BaseBrokerConnector, 
  BrokerOrder, 
  OrderRequest, 
  OrderStatus 
} from './BrokerConnectors';
import { SmartOrderRouter, RoutingDecision } from './SmartOrderRouter';

// ============================================================================
// Types
// ============================================================================

export type OrderLifecycleState = 
  | 'CREATED'
  | 'VALIDATED'
  | 'ROUTED'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'PARTIAL_FILL'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export interface ManagedOrder {
  id: string;
  request: OrderRequest;
  state: OrderLifecycleState;
  brokerOrder?: BrokerOrder;
  routingDecision?: RoutingDecision;
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
  filledAt?: number;
  cancelledAt?: number;
  rejectionReason?: string;
  fills: OrderFill[];
  totalFilled: number;
  remainingQuantity: number;
  averageFillPrice: number;
  totalCommission: number;
}

export interface OrderFill {
  fillId: string;
  orderId: string;
  quantity: number;
  price: number;
  commission: number;
  timestamp: number;
  venue?: string;
}

export interface OMSConfig {
  enableSmartRouting: boolean;
  allowPartialFills: boolean;
  maxOrderLifetime: number; // milliseconds
  autoRetryOnRejection: boolean;
  maxRetries: number;
  validateOrdersBeforeSubmit: boolean;
}

export interface OrderValidationError {
  field: string;
  message: string;
}

export interface OMSStatistics {
  totalOrders: number;
  activeOrders: number;
  filledOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  averageFillTime: number; // milliseconds
  totalVolume: number;
  totalCommissions: number;
  fillRate: number; // percentage
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OMS_CONFIG: OMSConfig = {
  enableSmartRouting: true,
  allowPartialFills: true,
  maxOrderLifetime: 86400000, // 24 hours
  autoRetryOnRejection: false,
  maxRetries: 3,
  validateOrdersBeforeSubmit: true,
};

// ============================================================================
// Order Management System
// ============================================================================

export class OrderManagementSystem extends EventEmitter {
  private config: OMSConfig;
  private brokers: Map<string, BaseBrokerConnector> = new Map();
  private router: SmartOrderRouter | null = null;
  private orders: Map<string, ManagedOrder> = new Map();
  private orderExpiryTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<OMSConfig> = {}) {
    super();
    this.config = { ...DEFAULT_OMS_CONFIG, ...config };
  }

  // ============================================================================
  // Broker Management
  // ============================================================================

  registerBroker(broker: BaseBrokerConnector): void {
    const brokerName = broker.getBrokerName();
    this.brokers.set(brokerName, broker);

    // Subscribe to broker events
    broker.on('order_update', (order: BrokerOrder) => {
      this.handleBrokerOrderUpdate(order);
    });

    broker.on('execution_report', (report) => {
      this.handleExecutionReport(report);
    });

    broker.on('error', (error) => {
      this.emit('broker_error', { broker: brokerName, error });
    });

    this.emit('broker_registered', { broker: brokerName });
  }

  unregisterBroker(brokerName: string): void {
    this.brokers.delete(brokerName);
    this.emit('broker_unregistered', { broker: brokerName });
  }

  setOrderRouter(router: SmartOrderRouter): void {
    this.router = router;
  }

  // ============================================================================
  // Order Lifecycle Management
  // ============================================================================

  async submitOrder(request: OrderRequest): Promise<ManagedOrder> {
    // Create managed order
    const managedOrder: ManagedOrder = {
      id: this.generateOrderId(),
      request,
      state: 'CREATED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fills: [],
      totalFilled: 0,
      remainingQuantity: request.quantity,
      averageFillPrice: 0,
      totalCommission: 0,
    };

    this.orders.set(managedOrder.id, managedOrder);
    this.emit('order_created', managedOrder);

    try {
      // Validate order
      if (this.config.validateOrdersBeforeSubmit) {
        const validationErrors = this.validateOrder(request);
        if (validationErrors.length > 0) {
          return this.rejectOrder(managedOrder, `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
        }
        this.updateOrderState(managedOrder, 'VALIDATED');
      }

      // Route order
      const routingDecision = await this.routeOrder(managedOrder);
      managedOrder.routingDecision = routingDecision;
      this.updateOrderState(managedOrder, 'ROUTED');

      // Submit to broker
      const broker = this.brokers.get(routingDecision.venue);
      if (!broker || !broker.isConnected()) {
        return this.rejectOrder(managedOrder, `Broker ${routingDecision.venue} not available`);
      }

      const brokerOrder = await broker.submitOrder(request);
      managedOrder.brokerOrder = brokerOrder;
      managedOrder.submittedAt = Date.now();
      this.updateOrderState(managedOrder, 'SUBMITTED');

      // Set expiry timer
      this.setOrderExpiryTimer(managedOrder);

      return managedOrder;
    } catch (error) {
      return this.rejectOrder(managedOrder, `Submission failed: ${error}`);
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (!order.brokerOrder || !order.routingDecision) {
      return false;
    }

    const broker = this.brokers.get(order.routingDecision.venue);
    if (!broker) {
      return false;
    }

    try {
      const cancelled = await broker.cancelOrder(order.brokerOrder.orderId);
      if (cancelled) {
        order.cancelledAt = Date.now();
        this.updateOrderState(order, 'CANCELLED');
        this.clearOrderExpiryTimer(orderId);
      }
      return cancelled;
    } catch (error) {
      this.emit('cancel_failed', { orderId, error });
      return false;
    }
  }

  async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<ManagedOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (!order.brokerOrder || !order.routingDecision) {
      throw new Error(`Order ${orderId} not yet submitted`);
    }

    const broker = this.brokers.get(order.routingDecision.venue);
    if (!broker) {
      throw new Error(`Broker ${order.routingDecision.venue} not available`);
    }

    try {
      const updatedBrokerOrder = await broker.modifyOrder(order.brokerOrder.orderId, updates);
      order.brokerOrder = updatedBrokerOrder;
      order.request = { ...order.request, ...updates };
      order.updatedAt = Date.now();
      this.emit('order_modified', order);
      return order;
    } catch (error) {
      this.emit('modify_failed', { orderId, error });
      throw error;
    }
  }

  // ============================================================================
  // Order Querying
  // ============================================================================

  getOrder(orderId: string): ManagedOrder | undefined {
    return this.orders.get(orderId);
  }

  getOrders(filter?: {
    state?: OrderLifecycleState;
    symbol?: string;
    broker?: string;
  }): ManagedOrder[] {
    let orders = Array.from(this.orders.values());

    if (filter?.state) {
      orders = orders.filter(o => o.state === filter.state);
    }

    if (filter?.symbol) {
      orders = orders.filter(o => o.request.symbol === filter.symbol);
    }

    if (filter?.broker) {
      orders = orders.filter(o => o.routingDecision?.venue === filter.broker);
    }

    return orders;
  }

  getActiveOrders(): ManagedOrder[] {
    return this.getOrders().filter(o => 
      ['CREATED', 'VALIDATED', 'ROUTED', 'SUBMITTED', 'ACKNOWLEDGED', 'PARTIAL_FILL'].includes(o.state)
    );
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  getStatistics(): OMSStatistics {
    const allOrders = Array.from(this.orders.values());
    const filledOrders = allOrders.filter(o => o.state === 'FILLED');
    const activeOrders = this.getActiveOrders();

    const fillTimes = filledOrders
      .filter(o => o.submittedAt && o.filledAt)
      .map(o => o.filledAt! - o.submittedAt!);

    return {
      totalOrders: allOrders.length,
      activeOrders: activeOrders.length,
      filledOrders: filledOrders.length,
      cancelledOrders: allOrders.filter(o => o.state === 'CANCELLED').length,
      rejectedOrders: allOrders.filter(o => o.state === 'REJECTED').length,
      averageFillTime: fillTimes.length > 0 ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length : 0,
      totalVolume: allOrders.reduce((sum, o) => sum + o.totalFilled, 0),
      totalCommissions: allOrders.reduce((sum, o) => sum + o.totalCommission, 0),
      fillRate: allOrders.length > 0 ? (filledOrders.length / allOrders.length) * 100 : 0,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateOrderId(): string {
    // Use timestamp + random for better uniqueness
    // In production, consider using a UUID library like 'uuid'
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const counter = Math.floor(Math.random() * 10000);
    return `OMS_${timestamp}_${counter}_${random}`;
  }

  private validateOrder(request: OrderRequest): OrderValidationError[] {
    const errors: OrderValidationError[] = [];

    if (!request.symbol || request.symbol.trim() === '') {
      errors.push({ field: 'symbol', message: 'Symbol is required' });
    }

    if (request.quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be positive' });
    }

    if ((request.type === 'LIMIT' || request.type === 'STOP_LIMIT') && !request.price) {
      errors.push({ field: 'price', message: `Price is required for ${request.type} orders` });
    }

    if ((request.type === 'STOP' || request.type === 'STOP_LIMIT') && !request.stopPrice) {
      errors.push({ field: 'stopPrice', message: `Stop price is required for ${request.type} orders` });
    }

    return errors;
  }

  private async routeOrder(order: ManagedOrder): Promise<RoutingDecision> {
    if (this.config.enableSmartRouting && this.router) {
      // Use smart router
      const decision = await this.router.routeOrder({
        symbol: order.request.symbol,
        side: order.request.side,
        quantity: order.request.quantity,
        urgency: order.request.type === 'MARKET' ? 'high' : 'medium',
      });
      return decision;
    } else {
      // Use first available broker
      const firstBroker = Array.from(this.brokers.keys())[0];
      if (!firstBroker) {
        throw new Error('No brokers available');
      }
      return {
        venue: firstBroker,
        strategy: 'SINGLE',
        splits: [],
        estimatedSlippage: 0,
        estimatedCommission: 0,
        reason: 'Default routing',
      };
    }
  }

  private updateOrderState(order: ManagedOrder, newState: OrderLifecycleState): void {
    const oldState = order.state;
    order.state = newState;
    order.updatedAt = Date.now();
    this.emit('order_state_changed', { order, oldState, newState });
  }

  private rejectOrder(order: ManagedOrder, reason: string): ManagedOrder {
    order.rejectionReason = reason;
    this.updateOrderState(order, 'REJECTED');
    this.emit('order_rejected', { order, reason });
    return order;
  }

  private handleBrokerOrderUpdate(brokerOrder: BrokerOrder): void {
    // Find managed order
    const managedOrder = Array.from(this.orders.values()).find(
      o => o.brokerOrder?.orderId === brokerOrder.orderId
    );

    if (!managedOrder) {
      return;
    }

    managedOrder.brokerOrder = brokerOrder;
    managedOrder.updatedAt = Date.now();

    // Update state based on broker order status
    switch (brokerOrder.status) {
      case 'PENDING':
      case 'SUBMITTED':
        if (managedOrder.state === 'SUBMITTED') {
          this.updateOrderState(managedOrder, 'ACKNOWLEDGED');
        }
        break;

      case 'PARTIAL':
        this.updateOrderState(managedOrder, 'PARTIAL_FILL');
        this.handlePartialFill(managedOrder, brokerOrder);
        break;

      case 'FILLED':
        managedOrder.filledAt = Date.now();
        this.updateOrderState(managedOrder, 'FILLED');
        this.handleFullFill(managedOrder, brokerOrder);
        this.clearOrderExpiryTimer(managedOrder.id);
        break;

      case 'CANCELLED':
        managedOrder.cancelledAt = Date.now();
        this.updateOrderState(managedOrder, 'CANCELLED');
        this.clearOrderExpiryTimer(managedOrder.id);
        break;

      case 'REJECTED':
        this.rejectOrder(managedOrder, 'Rejected by broker');
        this.clearOrderExpiryTimer(managedOrder.id);
        break;
    }
  }

  private handleExecutionReport(report: any): void {
    this.emit('execution_report', report);
  }

  private handlePartialFill(order: ManagedOrder, brokerOrder: BrokerOrder): void {
    if (!brokerOrder.averageFillPrice) return;

    const fillQuantity = brokerOrder.filledQuantity - order.totalFilled;
    if (fillQuantity <= 0) return;

    const fill: OrderFill = {
      fillId: `${order.id}_${order.fills.length + 1}`,
      orderId: order.id,
      quantity: fillQuantity,
      price: brokerOrder.averageFillPrice,
      commission: brokerOrder.commission || 0,
      timestamp: Date.now(),
    };

    order.fills.push(fill);
    order.totalFilled = brokerOrder.filledQuantity;
    order.remainingQuantity = order.request.quantity - order.totalFilled;
    order.averageFillPrice = this.calculateAverageFillPrice(order.fills);
    order.totalCommission += fill.commission;

    this.emit('partial_fill', { order, fill });
  }

  private handleFullFill(order: ManagedOrder, brokerOrder: BrokerOrder): void {
    this.handlePartialFill(order, brokerOrder);
    this.emit('order_filled', order);
  }

  private calculateAverageFillPrice(fills: OrderFill[]): number {
    if (fills.length === 0) return 0;

    const totalValue = fills.reduce((sum, fill) => sum + fill.price * fill.quantity, 0);
    const totalQuantity = fills.reduce((sum, fill) => sum + fill.quantity, 0);

    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  private setOrderExpiryTimer(order: ManagedOrder): void {
    const timer = setTimeout(() => {
      if (order.state !== 'FILLED' && order.state !== 'CANCELLED') {
        this.cancelOrder(order.id).then(() => {
          this.updateOrderState(order, 'EXPIRED');
        });
      }
    }, this.config.maxOrderLifetime);

    this.orderExpiryTimers.set(order.id, timer);
  }

  private clearOrderExpiryTimer(orderId: string): void {
    const timer = this.orderExpiryTimers.get(orderId);
    if (timer) {
      clearTimeout(timer);
      this.orderExpiryTimers.delete(orderId);
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  shutdown(): void {
    // Clear all timers
    for (const timer of this.orderExpiryTimers.values()) {
      clearTimeout(timer);
    }
    this.orderExpiryTimers.clear();

    // Disconnect all brokers
    for (const broker of this.brokers.values()) {
      broker.disconnect().catch(() => {});
    }

    this.emit('shutdown');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalOMSInstance: OrderManagementSystem | null = null;

export function getGlobalOrderManagementSystem(): OrderManagementSystem {
  if (!globalOMSInstance) {
    globalOMSInstance = new OrderManagementSystem();
  }
  return globalOMSInstance;
}

export function resetGlobalOrderManagementSystem(): void {
  if (globalOMSInstance) {
    globalOMSInstance.shutdown();
    globalOMSInstance = null;
  }
}
