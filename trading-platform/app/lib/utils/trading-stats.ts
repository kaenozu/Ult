import { Order } from '../../types';

export interface TradingStats {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
}

/**
 * Calculates trading statistics based on a list of orders.
 *
 * @param orders - The list of orders to analyze.
 * @returns An object containing win rate, average win, average loss, and total trades.
 */
export function calculateTradingStats(orders: Order[]): TradingStats {
  const filledOrders = orders.filter(o => o.status === 'FILLED');

  if (filledOrders.length === 0) {
    return { winRate: 0.5, avgWin: 0, avgLoss: 0, totalTrades: 0 };
  }

  const sellOrders = filledOrders.filter(o => o.side === 'SELL');

  let winCount = 0;
  let lossCount = 0;
  let winAmount = 0;
  let lossAmount = 0;

  sellOrders.forEach(sell => {
    // Find the first matching buy order that occurred before this sell
    // Note: This logic assumes a simple FIFO or single-position model.
    // It might count the same buy order multiple times if there are multiple sells.
    const buy = filledOrders.find(o =>
      o.symbol === sell.symbol &&
      o.side === 'BUY' &&
      (o.timestamp || 0) < (sell.timestamp || 0)
    );

    if (buy && buy.price && sell.price) {
      const profit = (sell.price - buy.price) * sell.quantity;
      if (profit > 0) {
        winCount++;
        winAmount += profit;
      } else {
        lossCount++;
        lossAmount += Math.abs(profit);
      }
    }
  });

  const totalMatchedTrades = winCount + lossCount;

  return {
    winRate: totalMatchedTrades > 0 ? winCount / totalMatchedTrades : 0.5,
    avgWin: winCount > 0 ? winAmount / winCount : 0,
    avgLoss: lossCount > 0 ? lossAmount / lossCount : 0,
    totalTrades: filledOrders.length
  };
}
