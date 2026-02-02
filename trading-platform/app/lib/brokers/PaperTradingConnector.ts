/**
 * Paper Trading Broker Connector
 * 
 * Mock broker implementation for testing and development.
 * Simulates order execution with realistic delays and slippage.
 */

import { BaseBrokerConnector } from './BaseBrokerConnector';
import {
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
  BrokerAccount,
  BrokerOrderStatus,
} from '../../types/broker';

interface PaperOrder extends BrokerOrderResponse {
  timeInForce: string;
}

interface PaperPositionData {
  symbol: string;
  quantity: number;
  averageEntryPrice: number;
}

export class PaperTradingConnector extends BaseBrokerConnector {
  private orders: Map<string, PaperOrder> = new Map();
  private positions: Map<string, PaperPositionData> = new Map();
  private cash: number = 100000; // Starting cash
  private orderIdCounter: number = 1;

  async connect(): Promise<void> {
    // Simulate connection delay
    await this.sleep(100);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async executeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResponse> {
    this.ensureConnected();

    // Validate order
    const validationErrors = this.validateOrder(order);
    if (validationErrors.length > 0) {
      const error = validationErrors[0];
      throw new Error(`Validation failed: ${error.message}`);
    }

    // Generate order ID
    const orderId = `PAPER_${this.orderIdCounter++}`;
    const clientOrderId = order.clientOrderId || this.generateClientOrderId();

    // Simulate order execution delay
    await this.sleep(50 + Math.random() * 100);

    // For market orders, fill immediately at "current price"
    // For paper trading, we use the provided limit price or simulate market price
    const fillPrice = order.type === 'market' 
      ? (order.limitPrice || 100) * (1 + (Math.random() - 0.5) * 0.001) // ±0.05% slippage
      : order.limitPrice || 100;

    const status: BrokerOrderStatus = order.type === 'market' ? 'filled' : 'accepted';
    const filledQuantity = order.type === 'market' ? order.quantity : 0;

    // Update positions for filled orders
    if (status === 'filled') {
      this.updatePosition(order.symbol, order.side, order.quantity, fillPrice);
    }

    const response: BrokerOrderResponse = {
      orderId,
      clientOrderId,
      status,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      filledQuantity,
      averageFillPrice: filledQuantity > 0 ? fillPrice : undefined,
      limitPrice: order.limitPrice,
      stopPrice: order.stopPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store order
    this.orders.set(orderId, {
      ...response,
      timeInForce: order.timeInForce || 'day',
    });

    return response;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    this.ensureConnected();

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      throw new Error(`Cannot cancel order in ${order.status} status`);
    }

    order.status = 'cancelled';
    order.updatedAt = new Date().toISOString();

    return true;
  }

  async getOrder(orderId: string): Promise<BrokerOrderResponse> {
    this.ensureConnected();

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return order;
  }

  async getOpenOrders(): Promise<BrokerOrderResponse[]> {
    this.ensureConnected();

    return Array.from(this.orders.values()).filter(
      order => order.status === 'accepted' || order.status === 'pending' || order.status === 'partial'
    );
  }

  async getPositions(): Promise<BrokerPosition[]> {
    this.ensureConnected();

    const positions: BrokerPosition[] = [];

    const entries = Array.from(this.positions.entries());
    for (const [symbol, posData] of entries) {
      if (posData.quantity === 0) continue;

      // Simulate current price with small random movement
      const currentPrice = posData.averageEntryPrice * (1 + (Math.random() - 0.5) * 0.02);
      const marketValue = Math.abs(posData.quantity) * currentPrice;
      const costBasis = Math.abs(posData.quantity) * posData.averageEntryPrice;
      const unrealizedPnL = posData.quantity > 0 
        ? (currentPrice - posData.averageEntryPrice) * posData.quantity
        : (posData.averageEntryPrice - currentPrice) * Math.abs(posData.quantity);
      const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;

      positions.push({
        symbol,
        quantity: Math.abs(posData.quantity),
        side: posData.quantity > 0 ? 'long' : 'short',
        averageEntryPrice: posData.averageEntryPrice,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        marketValue,
        costBasis,
      });
    }

    return positions;
  }

  async getAccount(): Promise<BrokerAccount> {
    this.ensureConnected();

    const positions = await this.getPositions();
    const portfolioValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    return {
      accountId: 'PAPER_ACCOUNT',
      accountType: 'cash',
      buyingPower: this.cash,
      cash: this.cash,
      portfolioValue: this.cash + portfolioValue,
      currency: 'USD',
    };
  }

  /**
   * Update position data
   */
  private updatePosition(symbol: string, side: 'buy' | 'sell', quantity: number, price: number): void {
    const existing = this.positions.get(symbol);

    if (!existing) {
      // New position
      const qty = side === 'buy' ? quantity : -quantity;
      this.positions.set(symbol, {
        symbol,
        quantity: qty,
        averageEntryPrice: price,
      });
      
      // Update cash
      this.cash -= Math.abs(qty) * price;
    } else {
      // Existing position
      const newQty = side === 'buy' ? quantity : -quantity;
      const totalQty = existing.quantity + newQty;

      if (totalQty === 0) {
        // Position closed
        this.positions.delete(symbol);
        // Realize P&L
        const pnl = side === 'buy' 
          ? (existing.averageEntryPrice - price) * quantity
          : (price - existing.averageEntryPrice) * quantity;
        this.cash += pnl;
      } else if ((existing.quantity > 0 && totalQty > 0) || (existing.quantity < 0 && totalQty < 0)) {
        // Adding to position
        const totalCost = existing.averageEntryPrice * Math.abs(existing.quantity) + price * quantity;
        existing.quantity = totalQty;
        existing.averageEntryPrice = totalCost / Math.abs(totalQty);
        this.cash -= quantity * price;
      } else {
        // Partial close
        existing.quantity = totalQty;
        // Realize partial P&L
        const pnl = side === 'buy'
          ? (existing.averageEntryPrice - price) * quantity
          : (price - existing.averageEntryPrice) * quantity;
        this.cash += pnl;
      }
    }
  }

  /**
   * Reset account (for testing)
   */
  resetAccount(initialCash: number = 100000): void {
    this.orders.clear();
    this.positions.clear();
    this.cash = initialCash;
    this.orderIdCounter = 1;
  }
}
