import { JournalEntry } from '@/app/types';

export interface AIStatusMetrics {
  virtualBalance: number;
  totalProfit: number;
  realizedProfit: number;
  unrealizedProfit: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export function calculateAIStatusMetrics(entries: JournalEntry[]): AIStatusMetrics {
  const INITIAL_BALANCE = 10000000;

  let realizedProfit = 0;
  let unrealizedProfit = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  for (const entry of entries) {
    const quantity = entry.quantity;
    const isBuy = entry.signalType === 'BUY';
    const isClosed = entry.status === 'CLOSED';

    if (isClosed && entry.exitPrice) {
      const profit = isBuy
        ? (entry.exitPrice - entry.entryPrice) * quantity
        : (entry.entryPrice - entry.exitPrice) * quantity;
      realizedProfit += profit;

      if (profit > 0) {
        winningTrades++;
      } else if (profit < 0) {
        losingTrades++;
      }
    } else if (!isClosed && entry.entryPrice) {
      const currentPrice = entry.entryPrice * 1.05;
      const unrealized = isBuy
        ? (currentPrice - entry.entryPrice) * quantity
        : (entry.entryPrice - currentPrice) * quantity;
      unrealizedProfit += unrealized;
    }
  }

  const totalProfit = realizedProfit + unrealizedProfit;
  const totalTrades = winningTrades + losingTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return {
    virtualBalance: INITIAL_BALANCE + realizedProfit,
    totalProfit,
    realizedProfit,
    unrealizedProfit,
    winRate,
    totalTrades,
    winningTrades,
    losingTrades,
  };
}
