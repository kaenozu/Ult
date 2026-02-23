import { Order } from '@/app/types';
import { TiltIndicators, TradeResult, ConsecutiveResults, EnhancedBehaviorMetrics } from './types';

export function calculateOverTradingScore(recentTradesCount: number): number {
  const normalRate = 3;
  const ratio = recentTradesCount / normalRate;
  return Math.min(100, ratio * 50);
}

export function calculateEmotionalTradingScore(tiltScore: number): number {
  return Math.min(100, tiltScore * 0.8);
}

export function calculateConsecutiveResultsFromTrades(
  tradeResults: TradeResult[]
): ConsecutiveResults {
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentStreak = 0;
  let isWinStreak = true;

  for (let i = tradeResults.length - 1; i >= 0; i--) {
    const isWin = tradeResults[i].pnl > 0;

    if (i === tradeResults.length - 1) {
      isWinStreak = isWin;
      currentStreak = 1;
    } else if ((isWin && isWinStreak) || (!isWin && !isWinStreak)) {
      currentStreak++;
    } else {
      break;
    }
  }

  if (isWinStreak) {
    consecutiveWins = currentStreak;
  } else {
    consecutiveLosses = currentStreak;
  }

  return { consecutiveWins, consecutiveLosses };
}

export function calculateTradeResultsFromHistory(tradingHistory: Order[]): TradeResult[] {
  const results: TradeResult[] = [];

  const hasPrice = tradingHistory.some((t) => t.price && t.price > 0);
  if (!hasPrice) {
    return tradingHistory
      .filter((t) => t.status === 'FILLED')
      .map((trade) => ({
        pnl: trade.side === 'SELL' ? 1 : trade.side === 'BUY' ? -1 : 0,
        trade,
      }));
  }

  const positionMap = new Map<string, { quantity: number; avgPrice: number }>();

  for (const trade of tradingHistory.filter((t) => t.status === 'FILLED')) {
    const price = trade.price || 0;

    if (trade.side === 'BUY') {
      const current = positionMap.get(trade.symbol);
      if (current) {
        const totalQuantity = current.quantity + trade.quantity;
        const totalCost = current.quantity * current.avgPrice + trade.quantity * price;
        positionMap.set(trade.symbol, {
          quantity: totalQuantity,
          avgPrice: totalCost / totalQuantity,
        });
      } else {
        positionMap.set(trade.symbol, { quantity: trade.quantity, avgPrice: price });
      }
    } else if (trade.side === 'SELL') {
      const position = positionMap.get(trade.symbol);
      if (position && position.quantity > 0) {
        const sellQuantity = Math.min(trade.quantity, position.quantity);
        const pnl = (price - position.avgPrice) * sellQuantity;
        results.push({ pnl, trade });

        const remainingQuantity = position.quantity - sellQuantity;
        if (remainingQuantity > 0) {
          positionMap.set(trade.symbol, { ...position, quantity: remainingQuantity });
        } else {
          positionMap.delete(trade.symbol);
        }
      }
    }
  }

  return results;
}

export function calculateMetricsFromResults(tradeResults: TradeResult[]): {
  winRate: number;
  lossRate: number;
  avgWinSize: number;
  avgLossSize: number;
  profitFactor: number;
} {
  const wins = tradeResults.filter((r) => r.pnl > 0);
  const losses = tradeResults.filter((r) => r.pnl < 0);

  const totalTrades = tradeResults.length;
  const winRate = totalTrades > 0 ? wins.length / totalTrades : 0;
  const lossRate = totalTrades > 0 ? losses.length / totalTrades : 0;

  const avgWinSize =
    wins.length > 0 ? wins.reduce((sum, w) => sum + w.pnl, 0) / wins.length : 0;

  const avgLossSize =
    losses.length > 0
      ? losses.reduce((sum, l) => sum + Math.abs(l.pnl), 0) / losses.length
      : 0;

  const totalWinAmount = wins.reduce((sum, w) => sum + w.pnl, 0);
  const totalLossAmount = losses.reduce((sum, l) => sum + Math.abs(l.pnl), 0);
  const profitFactor =
    totalLossAmount > 0
      ? totalWinAmount / totalLossAmount
      : totalWinAmount > 0
      ? Infinity
      : 0;

  return { winRate, lossRate, avgWinSize, avgLossSize, profitFactor };
}

export function generateEnhancedAlertsList(
  tiltScore: number,
  disciplineScore: number
): Array<{ type: string; severity: string; message: string; recommendation: string; timestamp: Date }> {
  const alerts: Array<{ type: string; severity: string; message: string; recommendation: string; timestamp: Date }> = [];

  if (tiltScore > 60) {
    alerts.push({
      type: 'revenge_trading',
      severity: tiltScore > 80 ? 'high' : 'medium',
      message: `ティルト状態（スコア: ${tiltScore.toFixed(0)}）`,
      recommendation: '即座に取引を停止し、冷却期間を設けてください',
      timestamp: new Date(),
    });
  }

  if (disciplineScore < 50) {
    alerts.push({
      type: 'overtrading',
      severity: 'high',
      message: `規律スコアが低下（${disciplineScore.toFixed(0)}）`,
      recommendation: 'トレーディングプランを見直し、厳格に従ってください',
      timestamp: new Date(),
    });
  }

  return alerts;
}
