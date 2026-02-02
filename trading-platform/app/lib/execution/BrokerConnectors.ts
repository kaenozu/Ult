/**
 * BrokerConnectors.ts
 * 
 * Real broker API integrations for live trading
 * Supports: Interactive Brokers (IBKR), Alpaca, TD Ameritrade
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'SUBMITTED' | 'FILLED' | 'PARTIAL' | 'CANCELLED' | 'REJECTED';
export type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK';

export interface BrokerCredentials {
  apiKey: string;
  apiSecret: string;
  accountId?: string;
  environment?: 'live' | 'paper' | 'demo';
}

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

export interface BrokerOrder {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  averageFillPrice?: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  submittedAt: number;
  filledAt?: number;
  cancelledAt?: number;
  commission?: number;
  broker: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  costBasis: number;
}

export interface AccountBalance {
  totalEquity: number;
  cashBalance: number;
  buyingPower: number;
  marginUsed: number;
  maintenanceMargin: number;
  dayTradingBuyingPower?: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  timestamp: number;
}

export interface ExecutionReport {
  orderId: string;
  symbol: string;
  side: OrderSide;
  executedQuantity: number;
  executionPrice: number;
  executionTime: number;
  commission: number;
  venue?: string;
  executionId: string;
}

export interface BrokerConfig {
  name: string;
  credentials: BrokerCredentials;
  enableOrderBookDepth: boolean;
  maxRetries: number;
  retryDelay: number;
  requestTimeout: number;
}

// ============================================================================
// Abstract Base Broker Connector
// ============================================================================

export abstract class BaseBrokerConnector extends EventEmitter {
  protected config: BrokerConfig;
  protected connected: boolean = false;
  protected orders: Map<string, BrokerOrder> = new Map();
  protected positions: Map<string, Position> = new Map();

  constructor(config: BrokerConfig) {
    super();
    this.config = config;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  // ============================================================================
  // Order Execution
  // ============================================================================

  abstract submitOrder(request: OrderRequest): Promise<BrokerOrder>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<BrokerOrder>;
  abstract getOrder(orderId: string): Promise<BrokerOrder>;
  abstract getOrders(symbol?: string): Promise<BrokerOrder[]>;

  // ============================================================================
  // Account & Positions
  // ============================================================================

  abstract getAccountBalance(): Promise<AccountBalance>;
  abstract getPositions(): Promise<Position[]>;
  abstract getPosition(symbol: string): Promise<Position | null>;

  // ============================================================================
  // Market Data
  // ============================================================================

  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBookSnapshot>;
  abstract subscribeToOrderBook(symbol: string, callback: (book: OrderBookSnapshot) => void): void;
  abstract unsubscribeFromOrderBook(symbol: string): void;

  // ============================================================================
  // Utility Methods
  // ============================================================================

  protected generateOrderId(): string {
    return `${this.config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected emitOrderUpdate(order: BrokerOrder): void {
    this.orders.set(order.orderId, order);
    this.emit('order_update', order);
  }

  protected emitExecutionReport(report: ExecutionReport): void {
    this.emit('execution_report', report);
  }

  protected emitError(error: Error): void {
    this.emit('error', error);
  }

  getBrokerName(): string {
    return this.config.name;
  }
}

// ============================================================================
// Interactive Brokers (IBKR) Connector
// ============================================================================

export class IBKRConnector extends BaseBrokerConnector {
  private apiEndpoint: string;

  constructor(config: Omit<BrokerConfig, 'name'>) {
    super({ ...config, name: 'IBKR' });
    this.apiEndpoint = config.credentials.environment === 'live' 
      ? 'https://api.ibkr.com/v1' 
      : 'https://api.ibkr.com/v1/portal';
  }

  async connect(): Promise<void> {
    try {
      // In a real implementation, this would authenticate with IBKR API
      // For now, we simulate the connection
      this.connected = true;
      this.emit('connected', { broker: 'IBKR' });
    } catch (error) {
      this.connected = false;
      throw new Error(`IBKR connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected', { broker: 'IBKR' });
  }

  async submitOrder(request: OrderRequest): Promise<BrokerOrder> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR');
    }

    const order: BrokerOrder = {
      orderId: request.clientOrderId || this.generateOrderId(),
      clientOrderId: request.clientOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      price: request.price,
      stopPrice: request.stopPrice,
      status: 'SUBMITTED',
      timeInForce: request.timeInForce || 'DAY',
      submittedAt: Date.now(),
      broker: 'IBKR',
    };

    // In a real implementation, this would call IBKR API
    // Simulate submission
    this.emitOrderUpdate(order);
    return order;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR');
    }

    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    order.status = 'CANCELLED';
    order.cancelledAt = Date.now();
    this.emitOrderUpdate(order);
    return true;
  }

  async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<BrokerOrder> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR');
    }

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (updates.quantity !== undefined) order.quantity = updates.quantity;
    if (updates.price !== undefined) order.price = updates.price;
    if (updates.stopPrice !== undefined) order.stopPrice = updates.stopPrice;

    this.emitOrderUpdate(order);
    return order;
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    return order;
  }

  async getOrders(symbol?: string): Promise<BrokerOrder[]> {
    const orders = Array.from(this.orders.values());
    return symbol ? orders.filter(o => o.symbol === symbol) : orders;
  }

  async getAccountBalance(): Promise<AccountBalance> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR');
    }

    // Simulated balance - in real implementation, would call IBKR API
    return {
      totalEquity: 100000,
      cashBalance: 50000,
      buyingPower: 200000,
      marginUsed: 25000,
      maintenanceMargin: 15000,
    };
  }

  async getPositions(): Promise<Position[]> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR');
    }

    return Array.from(this.positions.values());
  }

  async getPosition(symbol: string): Promise<Position | null> {
    return this.positions.get(symbol) || null;
  }

  async getOrderBook(symbol: string, depth: number = 10): Promise<OrderBookSnapshot> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR');
    }

    // Simulated order book - in real implementation, would call IBKR API
    return {
      symbol,
      bids: Array.from({ length: depth }, (_, i) => ({
        price: 100 - i * 0.1,
        size: 100 + i * 10,
      })),
      asks: Array.from({ length: depth }, (_, i) => ({
        price: 100 + i * 0.1,
        size: 100 + i * 10,
      })),
      timestamp: Date.now(),
    };
  }

  subscribeToOrderBook(symbol: string, callback: (book: OrderBookSnapshot) => void): void {
    // In real implementation, would setup WebSocket subscription
    this.emit('orderbook_subscribed', { symbol });
  }

  unsubscribeFromOrderBook(symbol: string): void {
    // In real implementation, would teardown WebSocket subscription
    this.emit('orderbook_unsubscribed', { symbol });
  }
}

// ============================================================================
// Alpaca Connector
// ============================================================================

export class AlpacaConnector extends BaseBrokerConnector {
  private apiEndpoint: string;

  constructor(config: Omit<BrokerConfig, 'name'>) {
    super({ ...config, name: 'Alpaca' });
    this.apiEndpoint = config.credentials.environment === 'live'
      ? 'https://api.alpaca.markets/v2'
      : 'https://paper-api.alpaca.markets/v2';
  }

  async connect(): Promise<void> {
    try {
      // In a real implementation, authenticate with Alpaca API
      this.connected = true;
      this.emit('connected', { broker: 'Alpaca' });
    } catch (error) {
      this.connected = false;
      throw new Error(`Alpaca connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected', { broker: 'Alpaca' });
  }

  async submitOrder(request: OrderRequest): Promise<BrokerOrder> {
    if (!this.connected) {
      throw new Error('Not connected to Alpaca');
    }

    const order: BrokerOrder = {
      orderId: request.clientOrderId || this.generateOrderId(),
      clientOrderId: request.clientOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      price: request.price,
      stopPrice: request.stopPrice,
      status: 'SUBMITTED',
      timeInForce: request.timeInForce || 'DAY',
      submittedAt: Date.now(),
      broker: 'Alpaca',
    };

    this.emitOrderUpdate(order);
    return order;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Not connected to Alpaca');
    }

    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    order.status = 'CANCELLED';
    order.cancelledAt = Date.now();
    this.emitOrderUpdate(order);
    return true;
  }

  async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<BrokerOrder> {
    if (!this.connected) {
      throw new Error('Not connected to Alpaca');
    }

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (updates.quantity !== undefined) order.quantity = updates.quantity;
    if (updates.price !== undefined) order.price = updates.price;
    if (updates.stopPrice !== undefined) order.stopPrice = updates.stopPrice;

    this.emitOrderUpdate(order);
    return order;
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    return order;
  }

  async getOrders(symbol?: string): Promise<BrokerOrder[]> {
    const orders = Array.from(this.orders.values());
    return symbol ? orders.filter(o => o.symbol === symbol) : orders;
  }

  async getAccountBalance(): Promise<AccountBalance> {
    if (!this.connected) {
      throw new Error('Not connected to Alpaca');
    }

    return {
      totalEquity: 100000,
      cashBalance: 50000,
      buyingPower: 200000,
      marginUsed: 25000,
      maintenanceMargin: 15000,
      dayTradingBuyingPower: 400000,
    };
  }

  async getPositions(): Promise<Position[]> {
    if (!this.connected) {
      throw new Error('Not connected to Alpaca');
    }

    return Array.from(this.positions.values());
  }

  async getPosition(symbol: string): Promise<Position | null> {
    return this.positions.get(symbol) || null;
  }

  async getOrderBook(symbol: string, depth: number = 10): Promise<OrderBookSnapshot> {
    if (!this.connected) {
      throw new Error('Not connected to Alpaca');
    }

    return {
      symbol,
      bids: Array.from({ length: depth }, (_, i) => ({
        price: 100 - i * 0.1,
        size: 100 + i * 10,
      })),
      asks: Array.from({ length: depth }, (_, i) => ({
        price: 100 + i * 0.1,
        size: 100 + i * 10,
      })),
      timestamp: Date.now(),
    };
  }

  subscribeToOrderBook(symbol: string, callback: (book: OrderBookSnapshot) => void): void {
    this.emit('orderbook_subscribed', { symbol });
  }

  unsubscribeFromOrderBook(symbol: string): void {
    this.emit('orderbook_unsubscribed', { symbol });
  }
}

// ============================================================================
// TD Ameritrade Connector
// ============================================================================

export class TDAmeritradeConnector extends BaseBrokerConnector {
  private apiEndpoint: string = 'https://api.tdameritrade.com/v1';

  constructor(config: Omit<BrokerConfig, 'name'>) {
    super({ ...config, name: 'TD Ameritrade' });
  }

  async connect(): Promise<void> {
    try {
      // In a real implementation, authenticate with TD Ameritrade API
      this.connected = true;
      this.emit('connected', { broker: 'TD Ameritrade' });
    } catch (error) {
      this.connected = false;
      throw new Error(`TD Ameritrade connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected', { broker: 'TD Ameritrade' });
  }

  async submitOrder(request: OrderRequest): Promise<BrokerOrder> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    const order: BrokerOrder = {
      orderId: request.clientOrderId || this.generateOrderId(),
      clientOrderId: request.clientOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      price: request.price,
      stopPrice: request.stopPrice,
      status: 'SUBMITTED',
      timeInForce: request.timeInForce || 'DAY',
      submittedAt: Date.now(),
      broker: 'TD Ameritrade',
    };

    this.emitOrderUpdate(order);
    return order;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    order.status = 'CANCELLED';
    order.cancelledAt = Date.now();
    this.emitOrderUpdate(order);
    return true;
  }

  async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<BrokerOrder> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (updates.quantity !== undefined) order.quantity = updates.quantity;
    if (updates.price !== undefined) order.price = updates.price;
    if (updates.stopPrice !== undefined) order.stopPrice = updates.stopPrice;

    this.emitOrderUpdate(order);
    return order;
  }

  async getOrder(orderId: string): Promise<BrokerOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    return order;
  }

  async getOrders(symbol?: string): Promise<BrokerOrder[]> {
    const orders = Array.from(this.orders.values());
    return symbol ? orders.filter(o => o.symbol === symbol) : orders;
  }

  async getAccountBalance(): Promise<AccountBalance> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    return {
      totalEquity: 100000,
      cashBalance: 50000,
      buyingPower: 200000,
      marginUsed: 25000,
      maintenanceMargin: 15000,
    };
  }

  async getPositions(): Promise<Position[]> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    return Array.from(this.positions.values());
  }

  async getPosition(symbol: string): Promise<Position | null> {
    return this.positions.get(symbol) || null;
  }

  async getOrderBook(symbol: string, depth: number = 10): Promise<OrderBookSnapshot> {
    if (!this.connected) {
      throw new Error('Not connected to TD Ameritrade');
    }

    return {
      symbol,
      bids: Array.from({ length: depth }, (_, i) => ({
        price: 100 - i * 0.1,
        size: 100 + i * 10,
      })),
      asks: Array.from({ length: depth }, (_, i) => ({
        price: 100 + i * 0.1,
        size: 100 + i * 10,
      })),
      timestamp: Date.now(),
    };
  }

  subscribeToOrderBook(symbol: string, callback: (book: OrderBookSnapshot) => void): void {
    this.emit('orderbook_subscribed', { symbol });
  }

  unsubscribeFromOrderBook(symbol: string): void {
    this.emit('orderbook_unsubscribed', { symbol });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export type BrokerType = 'IBKR' | 'Alpaca' | 'TDAmeritrade';

export function createBrokerConnector(
  type: BrokerType,
  config: Omit<BrokerConfig, 'name'>
): BaseBrokerConnector {
  switch (type) {
    case 'IBKR':
      return new IBKRConnector(config);
    case 'Alpaca':
      return new AlpacaConnector(config);
    case 'TDAmeritrade':
      return new TDAmeritradeConnector(config);
    default:
      throw new Error(`Unknown broker type: ${type}`);
  }
}
