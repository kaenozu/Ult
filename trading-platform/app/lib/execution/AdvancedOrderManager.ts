/**
 * AdvancedOrderManager.ts
 * 
 * 高度なオーダータイプを管理するクラス
 * Manages advanced order types including Stop Loss, Take Profit, OCO, Iceberg, Trailing Stop, and Bracket orders
 */

import { EventEmitter } from 'events';
import {
  AdvancedOrder,
  StopLossOrder,
  TakeProfitOrder,
  OCOOrder,
  IcebergOrder,
  TrailingStopOrder,
  BracketOrder,
  BaseOrder,
  OrderStatus,
  OrderEvent,
  isStopLossOrder,
  isTakeProfitOrder,
  isOCOOrder,
  isIcebergOrder,
  isTrailingStopOrder,
  isBracketOrder,
} from '../../types/advancedOrder';

// ============================================================================
// Types
// ============================================================================

export interface MarketPrice {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface OrderFill {
  orderId: string;
  quantity: number;
  price: number;
  timestamp: number;
}

export interface AdvancedOrderManagerConfig {
  enableLogging: boolean;
  maxActiveOrders: number;
  priceUpdateInterval: number; // milliseconds
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AdvancedOrderManagerConfig = {
  enableLogging: true,
  maxActiveOrders: 100,
  priceUpdateInterval: 1000,
};

// ============================================================================
// Advanced Order Manager
// ============================================================================

export class AdvancedOrderManager extends EventEmitter {
  private config: AdvancedOrderManagerConfig;
  private orders: Map<string, AdvancedOrder> = new Map();
  private marketPrices: Map<string, MarketPrice> = new Map();
  private priceMonitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<AdvancedOrderManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the order manager
   */
  start(): void {
    if (this.priceMonitoringInterval) {
      return;
    }

    this.priceMonitoringInterval = setInterval(() => {
      this.checkOrders();
    }, this.config.priceUpdateInterval);

    this.log('AdvancedOrderManager started');
    this.emit('started');
  }

  /**
   * Stop the order manager
   */
  stop(): void {
    if (this.priceMonitoringInterval) {
      clearInterval(this.priceMonitoringInterval);
      this.priceMonitoringInterval = null;
    }

    this.log('AdvancedOrderManager stopped');
    this.emit('stopped');
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  /**
   * Create a Stop Loss order
   */
  createStopLossOrder(params: Omit<StopLossOrder, 'id' | 'type' | 'status' | 'createdAt' | 'updatedAt'>): StopLossOrder {
    const order: StopLossOrder = {
      ...params,
      id: this.generateOrderId(),
      type: 'STOP_LOSS',
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.addOrder(order);
    return order;
  }

  /**
   * Create a Take Profit order
   */
  createTakeProfitOrder(params: Omit<TakeProfitOrder, 'id' | 'type' | 'status' | 'createdAt' | 'updatedAt'>): TakeProfitOrder {
    const order: TakeProfitOrder = {
      ...params,
      id: this.generateOrderId(),
      type: 'TAKE_PROFIT',
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.addOrder(order);
    return order;
  }

  /**
   * Create an OCO (One-Cancels-Other) order
   */
  createOCOOrder(params: Omit<OCOOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>): OCOOrder {
    const order: OCOOrder = {
      ...params,
      id: this.generateOrderId(),
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Set IDs for child orders
    order.order1.id = `${order.id}_1`;
    order.order2.id = `${order.id}_2`;

    this.addOrder(order);
    return order;
  }

  /**
   * Create an Iceberg order
   */
  createIcebergOrder(params: Omit<IcebergOrder, 'id' | 'type' | 'status' | 'createdAt' | 'updatedAt' | 'executedQuantity'>): IcebergOrder {
    const order: IcebergOrder = {
      ...params,
      id: this.generateOrderId(),
      type: 'ICEBERG',
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executedQuantity: 0,
    };

    this.addOrder(order);
    return order;
  }

  /**
   * Create a Trailing Stop order
   */
  createTrailingStopOrder(params: Omit<TrailingStopOrder, 'id' | 'type' | 'status' | 'createdAt' | 'updatedAt' | 'currentStopPrice'>): TrailingStopOrder {
    const marketPrice = this.marketPrices.get(params.symbol);
    if (!marketPrice) {
      throw new Error(`No market price available for ${params.symbol}`);
    }

    const currentStopPrice = params.side === 'BUY'
      ? marketPrice.price + params.trailAmount
      : marketPrice.price - params.trailAmount;

    const order: TrailingStopOrder = {
      ...params,
      id: this.generateOrderId(),
      type: 'TRAILING_STOP',
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentStopPrice,
      highestPrice: params.side === 'SELL' ? marketPrice.price : undefined,
      lowestPrice: params.side === 'BUY' ? marketPrice.price : undefined,
    };

    this.addOrder(order);
    return order;
  }

  /**
   * Create a Bracket order (entry + stop loss + take profit)
   */
  createBracketOrder(params: Omit<BracketOrder, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'entryFilled' | 'exitFilled'>): BracketOrder {
    const order: BracketOrder = {
      ...params,
      id: this.generateOrderId(),
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entryFilled: false,
      exitFilled: false,
    };

    // Set IDs for child orders
    order.entryOrder.id = `${order.id}_entry`;
    order.stopLossOrder.id = `${order.id}_sl`;
    order.takeProfitOrder.id = `${order.id}_tp`;

    this.addOrder(order);
    return order;
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    // Update status based on order type
    if (isOCOOrder(order) || isBracketOrder(order)) {
      order.status = 'CANCELLED';
    } else {
      order.status = 'CANCELLED';
    }

    order.updatedAt = Date.now();
    this.emitOrderEvent('ORDER_CANCELLED', orderId);
    this.orders.delete(orderId);

    return true;
  }

  /**
   * Get an order by ID
   */
  getOrder(orderId: string): AdvancedOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all active orders
   */
  getActiveOrders(): AdvancedOrder[] {
    return Array.from(this.orders.values()).filter(
      order => order.status === 'ACTIVE' || order.status === 'PENDING'
    );
  }

  /**
   * Get all orders for a symbol
   */
  getOrdersBySymbol(symbol: string): AdvancedOrder[] {
    return Array.from(this.orders.values()).filter(order => order.symbol === symbol);
  }

  // ============================================================================
  // Market Price Updates
  // ============================================================================

  /**
   * Update market price for a symbol
   */
  updateMarketPrice(symbol: string, price: number): void {
    this.marketPrices.set(symbol, {
      symbol,
      price,
      timestamp: Date.now(),
    });

    // Check orders immediately on price update
    this.checkOrdersForSymbol(symbol);
  }

  // ============================================================================
  // Order Monitoring
  // ============================================================================

  /**
   * Check all orders against current market prices
   */
  private checkOrders(): void {
    for (const order of this.orders.values()) {
      this.checkOrder(order);
    }
  }

  /**
   * Check orders for a specific symbol
   */
  private checkOrdersForSymbol(symbol: string): void {
    for (const order of this.orders.values()) {
      if (order.symbol === symbol) {
        this.checkOrder(order);
      }
    }
  }

  /**
   * Check a single order
   */
  private checkOrder(order: AdvancedOrder): void {
    if (isStopLossOrder(order)) {
      this.checkStopLossOrder(order);
    } else if (isTakeProfitOrder(order)) {
      this.checkTakeProfitOrder(order);
    } else if (isOCOOrder(order)) {
      this.checkOCOOrder(order);
    } else if (isIcebergOrder(order)) {
      this.checkIcebergOrder(order);
    } else if (isTrailingStopOrder(order)) {
      this.checkTrailingStopOrder(order);
    } else if (isBracketOrder(order)) {
      this.checkBracketOrder(order);
    }
  }

  /**
   * Check Stop Loss order
   */
  private checkStopLossOrder(order: StopLossOrder): void {
    const marketPrice = this.marketPrices.get(order.symbol);
    if (!marketPrice) {
      return;
    }

    const shouldTrigger = order.side === 'BUY'
      ? marketPrice.price >= order.stopPrice
      : marketPrice.price <= order.stopPrice;

    if (shouldTrigger && order.status === 'PENDING') {
      order.status = 'ACTIVE';
      this.emitOrderEvent('STOP_TRIGGERED', order.id, { price: marketPrice.price });
      this.executeOrder(order, marketPrice.price);
    }
  }

  /**
   * Check Take Profit order
   */
  private checkTakeProfitOrder(order: TakeProfitOrder): void {
    const marketPrice = this.marketPrices.get(order.symbol);
    if (!marketPrice) {
      return;
    }

    const shouldTrigger = order.side === 'BUY'
      ? marketPrice.price <= order.takeProfitPrice
      : marketPrice.price >= order.takeProfitPrice;

    if (shouldTrigger && order.status === 'PENDING') {
      order.status = 'ACTIVE';
      this.emitOrderEvent('STOP_TRIGGERED', order.id, { price: marketPrice.price });
      this.executeOrder(order, marketPrice.price);
    }
  }

  /**
   * Check OCO order
   */
  private checkOCOOrder(order: OCOOrder): void {
    if (order.status !== 'PENDING') {
      return;
    }

    // Check both orders
    this.checkStopLossOrder(order.order1 as StopLossOrder);
    this.checkTakeProfitOrder(order.order2 as TakeProfitOrder);

    // If one order is triggered, cancel the other
    if (order.order1.status === 'FILLED') {
      order.order2.status = 'CANCELLED';
      order.filledOrderId = order.order1.id;
      order.status = 'FILLED';
    } else if (order.order2.status === 'FILLED') {
      order.order1.status = 'CANCELLED';
      order.filledOrderId = order.order2.id;
      order.status = 'FILLED';
    }
  }

  /**
   * Check Iceberg order
   */
  private checkIcebergOrder(order: IcebergOrder): void {
    if (order.status !== 'PENDING' && order.status !== 'PARTIALLY_FILLED') {
      return;
    }

    // Calculate next slice
    const remainingQty = order.totalQuantity - order.executedQuantity;
    if (remainingQty <= 0) {
      order.status = 'FILLED';
      this.emitOrderEvent('ORDER_FILLED', order.id);
      return;
    }

    const nextSliceQty = Math.min(order.visibleQuantity, remainingQty);
    const marketPrice = this.marketPrices.get(order.symbol);
    if (!marketPrice) {
      return;
    }

    // Simulate execution of visible slice
    order.executedQuantity += nextSliceQty;
    order.status = order.executedQuantity >= order.totalQuantity ? 'FILLED' : 'PARTIALLY_FILLED';
    
    this.emitOrderEvent(
      order.status === 'FILLED' ? 'ORDER_FILLED' : 'ORDER_PARTIALLY_FILLED',
      order.id,
      { executedQuantity: order.executedQuantity, totalQuantity: order.totalQuantity }
    );
  }

  /**
   * Check Trailing Stop order
   */
  private checkTrailingStopOrder(order: TrailingStopOrder): void {
    const marketPrice = this.marketPrices.get(order.symbol);
    if (!marketPrice) {
      return;
    }

    if (order.side === 'SELL') {
      // For SELL orders, trail the highest price
      if (!order.highestPrice || marketPrice.price > order.highestPrice) {
        order.highestPrice = marketPrice.price;
        order.currentStopPrice = marketPrice.price - order.trailAmount;
        this.emitOrderEvent('TRAIL_UPDATED', order.id, { stopPrice: order.currentStopPrice });
      }

      // Trigger if price falls below stop
      if (marketPrice.price <= order.currentStopPrice && order.status === 'PENDING') {
        order.status = 'ACTIVE';
        this.emitOrderEvent('STOP_TRIGGERED', order.id, { price: marketPrice.price });
        this.executeOrder(order, marketPrice.price);
      }
    } else {
      // For BUY orders, trail the lowest price
      if (!order.lowestPrice || marketPrice.price < order.lowestPrice) {
        order.lowestPrice = marketPrice.price;
        order.currentStopPrice = marketPrice.price + order.trailAmount;
        this.emitOrderEvent('TRAIL_UPDATED', order.id, { stopPrice: order.currentStopPrice });
      }

      // Trigger if price rises above stop
      if (marketPrice.price >= order.currentStopPrice && order.status === 'PENDING') {
        order.status = 'ACTIVE';
        this.emitOrderEvent('STOP_TRIGGERED', order.id, { price: marketPrice.price });
        this.executeOrder(order, marketPrice.price);
      }
    }
  }

  /**
   * Check Bracket order
   */
  private checkBracketOrder(order: BracketOrder): void {
    if (order.status !== 'PENDING' && !order.entryFilled) {
      return;
    }

    // Check entry order first
    if (!order.entryFilled) {
      const marketPrice = this.marketPrices.get(order.symbol);
      if (marketPrice) {
        // Simulate entry fill
        order.entryOrder.status = 'FILLED';
        order.entryFilled = true;
        this.emitOrderEvent('ORDER_FILLED', order.entryOrder.id);
      }
      return;
    }

    // Once entry is filled, check stop loss and take profit
    this.checkStopLossOrder(order.stopLossOrder);
    this.checkTakeProfitOrder(order.takeProfitOrder);

    // If one exit order is filled, cancel the other
    if (order.stopLossOrder.status === 'FILLED') {
      order.takeProfitOrder.status = 'CANCELLED';
      order.exitFilled = true;
      order.status = 'FILLED';
    } else if (order.takeProfitOrder.status === 'FILLED') {
      order.stopLossOrder.status = 'CANCELLED';
      order.exitFilled = true;
      order.status = 'FILLED';
    }
  }

  // ============================================================================
  // Order Execution
  // ============================================================================

  /**
   * Execute an order
   */
  private executeOrder(order: BaseOrder, price: number): void {
    order.status = 'FILLED';
    order.filledQuantity = order.quantity;
    order.avgFillPrice = price;
    order.updatedAt = Date.now();

    this.emitOrderEvent('ORDER_FILLED', order.id, { price, quantity: order.quantity });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Add an order to the manager
   */
  private addOrder(order: AdvancedOrder): void {
    if (this.orders.size >= this.config.maxActiveOrders) {
      throw new Error('Maximum number of active orders reached');
    }

    this.orders.set(order.id, order);
    this.emitOrderEvent('ORDER_CREATED', order.id);
    this.log(`Order created: ${order.id}`);
  }

  /**
   * Generate a unique order ID
   */
  private generateOrderId(): string {
    return `adv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit an order event
   */
  private emitOrderEvent(type: OrderEvent['type'], orderId: string, data?: unknown): void {
    const event: OrderEvent = {
      type,
      orderId,
      timestamp: Date.now(),
      data,
    };

    this.emit('order_event', event);
    this.emit(type.toLowerCase(), event);
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[AdvancedOrderManager] ${message}`);
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get order statistics
   */
  getStatistics(): {
    totalOrders: number;
    activeOrders: number;
    filledOrders: number;
    cancelledOrders: number;
  } {
    const orders = Array.from(this.orders.values());
    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(o => o.status === 'ACTIVE' || o.status === 'PENDING').length,
      filledOrders: orders.filter(o => o.status === 'FILLED').length,
      cancelledOrders: orders.filter(o => o.status === 'CANCELLED').length,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<AdvancedOrderManagerConfig>) => new AdvancedOrderManager(config)
);

export const getGlobalAdvancedOrderManager = getInstance;
export const resetGlobalAdvancedOrderManager = resetInstance;

export default AdvancedOrderManager;
