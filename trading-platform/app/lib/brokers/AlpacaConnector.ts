/**
 * Alpaca Broker Connector
 * 
 * Connector for Alpaca Markets API
 * Supports: US stocks, ETFs
 * Docs: https://alpaca.markets/docs/api-references/trading-api/
 */

import { BaseBrokerConnector } from './BaseBrokerConnector';
import {
  BrokerConfig,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
  BrokerAccount,
} from '../../types/broker';

export class AlpacaConnector extends BaseBrokerConnector {
  private baseUrl: string;

  constructor(config: BrokerConfig) {
    super(config);
    this.baseUrl = config.paperTrading 
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';
  }

  async connect(): Promise<void> {
    try {
      // Test connection by fetching account
      const response = await fetch(`${this.baseUrl}/v2/account`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.statusText}`);
      }

      this.connected = true;
    } catch (error) {
      this.handleError(error);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async executeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResponse> {
    this.ensureConnected();

    const validationErrors = this.validateOrder(order);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors[0].message}`);
    }

    try {
      const alpacaOrder = {
        symbol: order.symbol,
        qty: order.quantity,
        side: order.side,
        type: order.type,
        time_in_force: order.timeInForce || 'day',
        limit_price: order.limitPrice,
        stop_price: order.stopPrice,
        extended_hours: order.extendedHours || false,
        client_order_id: order.clientOrderId || this.generateClientOrderId(),
      };

      const response = await fetch(`${this.baseUrl}/v2/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(alpacaOrder),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to execute order: ${response.statusText}`);
      }

      const result = await response.json();
      return this.transformOrder(result);
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    this.ensureConnected();

    try {
      const response = await fetch(`${this.baseUrl}/v2/orders/${orderId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getOrder(orderId: string): Promise<BrokerOrderResponse> {
    this.ensureConnected();

    try {
      const response = await fetch(`${this.baseUrl}/v2/orders/${orderId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get order: ${response.statusText}`);
      }

      const result = await response.json();
      return this.transformOrder(result);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getOpenOrders(): Promise<BrokerOrderResponse[]> {
    this.ensureConnected();

    try {
      const response = await fetch(`${this.baseUrl}/v2/orders?status=open`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get orders: ${response.statusText}`);
      }

      const results = await response.json();
      return results.map((order: Record<string, unknown>) => this.transformOrder(order));
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPositions(): Promise<BrokerPosition[]> {
    this.ensureConnected();

    try {
      const response = await fetch(`${this.baseUrl}/v2/positions`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get positions: ${response.statusText}`);
      }

      const results = await response.json();
      return results.map((pos: Record<string, unknown>) => this.transformPosition(pos));
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAccount(): Promise<BrokerAccount> {
    this.ensureConnected();

    try {
      const response = await fetch(`${this.baseUrl}/v2/account`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get account: ${response.statusText}`);
      }

      const result = await response.json();
      return this.transformAccount(result);
    } catch (error) {
      this.handleError(error);
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.apiSecret,
      'Content-Type': 'application/json',
    };
  }

  private transformOrder(order: Record<string, unknown>): BrokerOrderResponse {
    return {
      orderId: String(order.id),
      clientOrderId: order.client_order_id as string | undefined,
      status: this.mapOrderStatus(String(order.status)),
      symbol: String(order.symbol),
      side: String(order.side) as 'buy' | 'sell',
      type: String(order.order_type) as 'market' | 'limit' | 'stop' | 'stop_limit',
      quantity: Number(order.qty),
      filledQuantity: Number(order.filled_qty || 0),
      averageFillPrice: order.filled_avg_price ? Number(order.filled_avg_price) : undefined,
      limitPrice: order.limit_price ? Number(order.limit_price) : undefined,
      stopPrice: order.stop_price ? Number(order.stop_price) : undefined,
      createdAt: String(order.created_at),
      updatedAt: String(order.updated_at),
    };
  }

  private transformPosition(pos: Record<string, unknown>): BrokerPosition {
    const qty = Number(pos.qty);
    return {
      symbol: String(pos.symbol),
      quantity: Math.abs(qty),
      side: qty > 0 ? 'long' : 'short',
      averageEntryPrice: Number(pos.avg_entry_price),
      currentPrice: Number(pos.current_price),
      unrealizedPnL: Number(pos.unrealized_pl),
      unrealizedPnLPercent: Number(pos.unrealized_plpc) * 100,
      marketValue: Number(pos.market_value),
      costBasis: Number(pos.cost_basis),
    };
  }

  private transformAccount(acc: Record<string, unknown>): BrokerAccount {
    return {
      accountId: String(acc.account_number),
      accountType: String(acc.account_type) === 'margin' ? 'margin' : 'cash',
      buyingPower: Number(acc.buying_power),
      cash: Number(acc.cash),
      portfolioValue: Number(acc.portfolio_value),
      currency: String(acc.currency),
      dayTradeCount: Number(acc.daytrade_count),
      isPatternDayTrader: Boolean(acc.pattern_day_trader),
    };
  }

  private mapOrderStatus(status: string): BrokerOrderResponse['status'] {
    const statusMap: Record<string, BrokerOrderResponse['status']> = {
      'new': 'pending',
      'accepted': 'accepted',
      'filled': 'filled',
      'partially_filled': 'partial',
      'canceled': 'cancelled',
      'expired': 'expired',
      'rejected': 'rejected',
    };
    return statusMap[status] || 'pending';
  }
}
