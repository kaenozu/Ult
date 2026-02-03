/**
 * Broker Store Integration
 * 
 * Bridge between Zustand store and broker system.
 * Provides async order execution while maintaining store state.
 */

import { OrderRequest, OrderResult } from '../../types/order';
import { getOrderExecutor } from './OrderExecutor';
import { BrokerOrderRequest, OrderExecutionResult } from '../../types/broker';

/**
 * Convert OrderRequest (store format) to BrokerOrderRequest (broker format)
 */
export function convertOrderRequestToBrokerFormat(order: OrderRequest): BrokerOrderRequest {
  return {
    symbol: order.symbol,
    side: order.side === 'LONG' ? 'buy' : 'sell',
    type: order.orderType === 'MARKET' ? 'market' : 'limit',
    quantity: order.quantity,
    limitPrice: order.price,
    timeInForce: 'day',
  };
}

/**
 * Convert BrokerOrderResponse to OrderResult (store format)
 */
export function convertBrokerResultToOrderResult(
  brokerResult: OrderExecutionResult,
  order: OrderRequest,
  remainingCash: number
): OrderResult {
  if (!brokerResult.success) {
    return {
      success: false,
      error: brokerResult.error,
    };
  }

  const brokerOrder = brokerResult.order!;
  
  return {
    success: true,
    orderId: brokerOrder.orderId,
    remainingCash,
    newPosition: {
      symbol: order.symbol,
      name: order.name,
      market: order.market,
      side: order.side,
      quantity: brokerOrder.filledQuantity,
      avgPrice: brokerOrder.averageFillPrice || order.price,
      currentPrice: brokerOrder.averageFillPrice || order.price,
      change: 0,
      entryDate: brokerOrder.createdAt,
    },
  };
}

/**
 * Execute order through broker with store integration
 */
export async function executeOrderWithBroker(
  order: OrderRequest,
  currentCash: number
): Promise<OrderResult> {
  try {
    const executor = getOrderExecutor();
    
    // Validate sufficient funds for LONG positions
    const totalCost = order.quantity * order.price;
    if (order.side === 'LONG' && currentCash < totalCost) {
      return {
        success: false,
        error: `Insufficient funds. Required: ${totalCost}, Available: ${currentCash}`,
      };
    }

    // Convert to broker format and execute
    const brokerOrder = convertOrderRequestToBrokerFormat(order);
    const result = await executor.execute(brokerOrder);

    // Calculate new cash balance
    const newCash = order.side === 'LONG'
      ? currentCash - totalCost
      : currentCash + totalCost;

    // Convert result back to store format
    return convertBrokerResultToOrderResult(result, order, newCash);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync broker positions with store
 * Call this periodically to ensure store reflects actual broker state
 */
export async function syncBrokerPositions() {
  try {
    const executor = getOrderExecutor();
    const positions = await executor.getPositions();
    const account = await executor.getAccount();

    return {
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        name: pos.symbol, // Would need to fetch name from market data
        market: 'usa' as const, // Would need to determine from symbol
        side: pos.side === 'long' ? 'LONG' as const : 'SHORT' as const,
        quantity: pos.quantity,
        avgPrice: pos.averageEntryPrice,
        currentPrice: pos.currentPrice,
        change: pos.unrealizedPnL / pos.quantity,
        entryDate: new Date().toISOString(),
      })),
      cash: account?.cash || 0,
    };
  } catch (error) {
    console.error('Failed to sync broker positions:', error);
    return null;
  }
}

/**
 * Check if broker integration is enabled
 */
export function isBrokerIntegrationEnabled(): boolean {
  return process.env.ENABLE_BROKER_INTEGRATION === 'true';
}

/**
 * Get broker mode (paper or live)
 */
export function getBrokerMode(): 'paper' | 'live' {
  const defaultBroker = process.env.DEFAULT_BROKER || 'paper';
  
  if (defaultBroker === 'paper') {
    return 'paper';
  }

  // Check if paper trading is enabled for the broker
  const paperTrading = 
    (defaultBroker === 'alpaca' && process.env.ALPACA_PAPER_TRADING === 'true') ||
    (defaultBroker === 'oanda' && process.env.OANDA_PRACTICE_MODE === 'true') ||
    (defaultBroker === 'interactive_brokers' && process.env.IB_PAPER_TRADING === 'true');

  return paperTrading ? 'paper' : 'live';
}
