/**
 * Order Executor Service
 * 
 * Central service for executing orders through configured brokers.
 * Handles broker selection, connection management, and order routing.
 */

import {
  BrokerType,
  BrokerConfig,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
  BrokerAccount,
  IBrokerConnector,
  OrderExecutionResult,
} from '../../types/broker';
import { BaseBrokerConnector } from './BaseBrokerConnector';
import { PaperTradingConnector } from './PaperTradingConnector';
import { AlpacaConnector } from './AlpacaConnector';

/**
 * Order Executor configuration
 */
import { logger } from '@/app/core/logger';
export interface OrderExecutorConfig {
  /** Default broker to use */
  defaultBroker: BrokerType;
  /** Broker configurations */
  brokers: BrokerConfig[];
  /** Enable auto-retry on failure */
  autoRetry?: boolean;
  /** Max retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Order Executor Service
 */
export class OrderExecutor {
  private connectors: Map<BrokerType, IBrokerConnector> = new Map();
  private config: OrderExecutorConfig;
  private defaultBroker: BrokerType;

  constructor(config: OrderExecutorConfig) {
    this.config = config;
    this.defaultBroker = config.defaultBroker;
    this.initializeConnectors(config.brokers);
  }

  /**
   * Initialize broker connectors
   */
  private initializeConnectors(brokerConfigs: BrokerConfig[]): void {
    for (const config of brokerConfigs) {
      const connector = this.createConnector(config);
      this.connectors.set(config.type, connector);
    }
  }

  /**
   * Create a broker connector instance
   */
  private createConnector(config: BrokerConfig): IBrokerConnector {
    switch (config.type) {
      case 'paper':
        return new PaperTradingConnector(config);
      case 'alpaca':
        return new AlpacaConnector(config);
      case 'oanda':
        // Placeholder for OANDA implementation
        throw new Error('OANDA connector not yet implemented');
      case 'interactive_brokers':
        // Placeholder for Interactive Brokers implementation
        throw new Error('Interactive Brokers connector not yet implemented');
      default:
        throw new Error(`Unknown broker type: ${config.type}`);
    }
  }

  /**
   * Get connector for broker type
   */
  private getConnector(brokerType?: BrokerType): IBrokerConnector {
    const type = brokerType || this.defaultBroker;
    const connector = this.connectors.get(type);
    
    if (!connector) {
      throw new Error(`Broker ${type} not configured`);
    }

    return connector;
  }

  /**
   * Connect to all configured brokers
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.connectors.values()).map(connector =>
      connector.connect().catch(error => {
        logger.error(`Failed to connect to ${connector.getBrokerType()}:`, error instanceof Error ? error : new Error(String(error)));
      })
    );
    await Promise.all(promises);
  }

  /**
   * Connect to specific broker
   */
  async connect(brokerType: BrokerType): Promise<void> {
    const connector = this.getConnector(brokerType);
    await connector.connect();
  }

  /**
   * Disconnect from all brokers
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connectors.values()).map(connector =>
      connector.disconnect().catch(error => {
        logger.error(`Failed to disconnect from ${connector.getBrokerType()}:`, error instanceof Error ? error : new Error(String(error)));
      })
    );
    await Promise.all(promises);
  }

  /**
   * Execute an order
   */
  async execute(
    order: BrokerOrderRequest,
    brokerType?: BrokerType
  ): Promise<OrderExecutionResult> {
    const startTime = Date.now();
    const connector = this.getConnector(brokerType);

    try {
      // Ensure connected
      if (!connector.isConnected()) {
        await connector.connect();
      }

      // Execute order with retry logic
      const response = await this.executeWithRetry(connector, order);

      // Calculate execution metrics
      const executionTime = Date.now() - startTime;
      const slippage = this.calculateSlippage(order, response);

      return {
        success: true,
        order: response,
        timestamp: new Date().toISOString(),
        slippage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute order with retry logic
   */
  private async executeWithRetry(
    connector: IBrokerConnector,
    order: BrokerOrderRequest
  ): Promise<BrokerOrderResponse> {
    const maxRetries = this.config.maxRetries || 3;
    const retryDelay = this.config.retryDelay || 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await connector.executeOrder(order);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries - 1 && this.config.autoRetry !== false) {
          await this.sleep(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Cancel an order
   */
  async cancel(orderId: string, brokerType?: BrokerType): Promise<boolean> {
    const connector = this.getConnector(brokerType);

    try {
      if (!connector.isConnected()) {
        await connector.connect();
      }

      return await connector.cancelOrder(orderId);
    } catch (error) {
      logger.error('Failed to cancel order:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string, brokerType?: BrokerType): Promise<BrokerOrderResponse | null> {
    const connector = this.getConnector(brokerType);

    try {
      if (!connector.isConnected()) {
        await connector.connect();
      }

      return await connector.getOrder(orderId);
    } catch (error) {
      logger.error('Failed to get order:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Get all open orders
   */
  async getOpenOrders(brokerType?: BrokerType): Promise<BrokerOrderResponse[]> {
    const connector = this.getConnector(brokerType);

    try {
      if (!connector.isConnected()) {
        await connector.connect();
      }

      return await connector.getOpenOrders();
    } catch (error) {
      logger.error('Failed to get open orders:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Get current positions
   */
  async getPositions(brokerType?: BrokerType): Promise<BrokerPosition[]> {
    const connector = this.getConnector(brokerType);

    try {
      if (!connector.isConnected()) {
        await connector.connect();
      }

      return await connector.getPositions();
    } catch (error) {
      logger.error('Failed to get positions:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Get account information
   */
  async getAccount(brokerType?: BrokerType): Promise<BrokerAccount | null> {
    const connector = this.getConnector(brokerType);

    try {
      if (!connector.isConnected()) {
        await connector.connect();
      }

      return await connector.getAccount();
    } catch (error) {
      logger.error('Failed to get account:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Check if broker is connected
   */
  isConnected(brokerType?: BrokerType): boolean {
    const connector = this.getConnector(brokerType);
    return connector.isConnected();
  }

  /**
   * Get list of configured brokers
   */
  getConfiguredBrokers(): BrokerType[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Set default broker
   */
  setDefaultBroker(brokerType: BrokerType): void {
    if (!this.connectors.has(brokerType)) {
      throw new Error(`Broker ${brokerType} not configured`);
    }
    this.defaultBroker = brokerType;
  }

  /**
   * Get default broker
   */
  getDefaultBroker(): BrokerType {
    return this.defaultBroker;
  }

  /**
   * Calculate slippage
   */
  private calculateSlippage(order: BrokerOrderRequest, response: BrokerOrderResponse): number | undefined {
    if (!response.averageFillPrice || !order.limitPrice) {
      return undefined;
    }

    return Math.abs(response.averageFillPrice - order.limitPrice);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance (optional, can be instantiated multiple times)
 */
let orderExecutorInstance: OrderExecutor | null = null;

/**
 * Initialize the order executor singleton
 */
export function initializeOrderExecutor(config: OrderExecutorConfig): OrderExecutor {
  orderExecutorInstance = new OrderExecutor(config);
  return orderExecutorInstance;
}

/**
 * Get the order executor singleton
 */
export function getOrderExecutor(): OrderExecutor {
  if (!orderExecutorInstance) {
    throw new Error('Order executor not initialized. Call initializeOrderExecutor first.');
  }
  return orderExecutorInstance;
}
