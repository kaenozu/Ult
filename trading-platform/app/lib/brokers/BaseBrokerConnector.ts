/**
 * Base Broker Connector
 * 
 * Abstract base class for all broker implementations.
 * Provides common functionality and error handling.
 */

import {
  IBrokerConnector,
  BrokerType,
  BrokerConfig,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
  BrokerAccount,
  OrderValidationError,
} from '../../types/broker';

export abstract class BaseBrokerConnector implements IBrokerConnector {
  protected config: BrokerConfig;
  protected connected: boolean = false;
  protected lastError?: string;

  constructor(config: BrokerConfig) {
    this.config = config;
  }

  /**
   * Initialize connection to broker
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from broker
   */
  abstract disconnect(): Promise<void>;

  /**
   * Execute an order
   */
  abstract executeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResponse>;

  /**
   * Cancel an order
   */
  abstract cancelOrder(orderId: string): Promise<boolean>;

  /**
   * Get order status
   */
  abstract getOrder(orderId: string): Promise<BrokerOrderResponse>;

  /**
   * Get all open orders
   */
  abstract getOpenOrders(): Promise<BrokerOrderResponse[]>;

  /**
   * Get current positions
   */
  abstract getPositions(): Promise<BrokerPosition[]>;

  /**
   * Get account information
   */
  abstract getAccount(): Promise<BrokerAccount>;

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get broker type
   */
  getBrokerType(): BrokerType {
    return this.config.type;
  }

  /**
   * Get last error message
   */
  getLastError(): string | undefined {
    return this.lastError;
  }

  /**
   * Validate order before submission
   */
  protected validateOrder(order: BrokerOrderRequest): OrderValidationError[] {
    const errors: OrderValidationError[] = [];

    // Validate symbol
    if (!order.symbol || order.symbol.trim() === '') {
      errors.push({
        code: 'INVALID_SYMBOL',
        message: 'Symbol is required',
        field: 'symbol',
      });
    }

    // Validate quantity
    if (!order.quantity || order.quantity <= 0) {
      errors.push({
        code: 'INVALID_QUANTITY',
        message: 'Quantity must be greater than 0',
        field: 'quantity',
      });
    }

    // Validate limit price for limit orders
    if (order.type === 'limit' && (!order.limitPrice || order.limitPrice <= 0)) {
      errors.push({
        code: 'INVALID_LIMIT_PRICE',
        message: 'Limit price is required for limit orders',
        field: 'limitPrice',
      });
    }

    // Validate stop price for stop orders
    if ((order.type === 'stop' || order.type === 'stop_limit') && (!order.stopPrice || order.stopPrice <= 0)) {
      errors.push({
        code: 'INVALID_STOP_PRICE',
        message: 'Stop price is required for stop orders',
        field: 'stopPrice',
      });
    }

    return errors;
  }

  /**
   * Ensure connection before operation
   */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.config.type} broker`);
    }
  }

  /**
   * Handle API errors
   */
  protected handleError(error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.lastError = message;
    throw new Error(`${this.config.type} broker error: ${message}`);
  }

  /**
   * Generate client order ID
   */
  protected generateClientOrderId(): string {
    return `${this.config.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Sleep utility for retry logic
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry logic for API calls
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries - 1) {
          await this.sleep(delayMs * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}
