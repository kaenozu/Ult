/**
 * Broker Integration Type Definitions
 * 
 * This file defines the interfaces for broker connectivity and order execution.
 * Supports: Alpaca, OANDA, Interactive Brokers
 */

/**
 * Supported broker types
 */
export type BrokerType = 'alpaca' | 'oanda' | 'interactive_brokers' | 'paper';

/**
 * Order status types from brokers
 */
export type BrokerOrderStatus = 
  | 'pending'      // Order submitted but not yet accepted
  | 'accepted'     // Order accepted by broker
  | 'filled'       // Order completely filled
  | 'partial'      // Order partially filled
  | 'cancelled'    // Order cancelled
  | 'rejected'     // Order rejected by broker
  | 'expired';     // Order expired

/**
 * Order request to broker
 */
export interface BrokerOrderRequest {
  /** Symbol/ticker */
  symbol: string;
  /** Order side */
  side: 'buy' | 'sell';
  /** Order type */
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  /** Quantity */
  quantity: number;
  /** Limit price (for limit orders) */
  limitPrice?: number;
  /** Stop price (for stop orders) */
  stopPrice?: number;
  /** Time in force */
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
  /** Extended hours trading (for Alpaca) */
  extendedHours?: boolean;
  /** Client order ID for tracking */
  clientOrderId?: string;
}

/**
 * Order response from broker
 */
export interface BrokerOrderResponse {
  /** Broker order ID */
  orderId: string;
  /** Client order ID (if provided) */
  clientOrderId?: string;
  /** Order status */
  status: BrokerOrderStatus;
  /** Symbol */
  symbol: string;
  /** Side */
  side: 'buy' | 'sell';
  /** Type */
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  /** Quantity ordered */
  quantity: number;
  /** Quantity filled */
  filledQuantity: number;
  /** Average fill price */
  averageFillPrice?: number;
  /** Limit price */
  limitPrice?: number;
  /** Stop price */
  stopPrice?: number;
  /** Timestamp when order was created */
  createdAt: string;
  /** Timestamp when order was updated */
  updatedAt?: string;
  /** Error message if rejected */
  errorMessage?: string;
}

/**
 * Position from broker
 */
export interface BrokerPosition {
  /** Symbol */
  symbol: string;
  /** Quantity (negative for short positions) */
  quantity: number;
  /** Side */
  side: 'long' | 'short';
  /** Average entry price */
  averageEntryPrice: number;
  /** Current market price */
  currentPrice: number;
  /** Unrealized P&L */
  unrealizedPnL: number;
  /** Unrealized P&L percentage */
  unrealizedPnLPercent: number;
  /** Market value */
  marketValue: number;
  /** Cost basis */
  costBasis: number;
}

/**
 * Account information from broker
 */
export interface BrokerAccount {
  /** Account ID */
  accountId: string;
  /** Account type */
  accountType: 'cash' | 'margin';
  /** Buying power */
  buyingPower: number;
  /** Cash available */
  cash: number;
  /** Portfolio value */
  portfolioValue: number;
  /** Currency */
  currency: string;
  /** Day trade count (for PDT rule) */
  dayTradeCount?: number;
  /** Pattern day trader status */
  isPatternDayTrader?: boolean;
}

/**
 * Broker configuration
 */
export interface BrokerConfig {
  /** Broker type */
  type: BrokerType;
  /** API key */
  apiKey: string;
  /** API secret */
  apiSecret: string;
  /** Base URL (optional, for sandbox/paper trading) */
  baseUrl?: string;
  /** Paper trading mode */
  paperTrading?: boolean;
}

/**
 * Broker connection status
 */
export interface BrokerConnectionStatus {
  /** Is connected */
  connected: boolean;
  /** Broker type */
  broker: BrokerType;
  /** Connection error if any */
  error?: string;
  /** Last connection attempt */
  lastAttempt?: string;
}

/**
 * Base interface for broker connectors
 */
export interface IBrokerConnector {
  /**
   * Initialize connection to broker
   */
  connect(): Promise<void>;

  /**
   * Disconnect from broker
   */
  disconnect(): Promise<void>;

  /**
   * Check connection status
   */
  isConnected(): boolean;

  /**
   * Execute an order
   */
  executeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResponse>;

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): Promise<boolean>;

  /**
   * Get order status
   */
  getOrder(orderId: string): Promise<BrokerOrderResponse>;

  /**
   * Get all open orders
   */
  getOpenOrders(): Promise<BrokerOrderResponse[]>;

  /**
   * Get current positions
   */
  getPositions(): Promise<BrokerPosition[]>;

  /**
   * Get account information
   */
  getAccount(): Promise<BrokerAccount>;

  /**
   * Get broker type
   */
  getBrokerType(): BrokerType;
}

/**
 * Order execution result with detailed information
 */
export interface OrderExecutionResult {
  /** Success flag */
  success: boolean;
  /** Broker order response */
  order?: BrokerOrderResponse;
  /** Error message */
  error?: string;
  /** Execution timestamp */
  timestamp: string;
  /** Slippage (difference between expected and actual price) */
  slippage?: number;
  /** Commission/fees */
  commission?: number;
}

/**
 * Order validation error
 */
export interface OrderValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field that caused the error */
  field?: string;
}
