import { Order, Position } from '@/app/types';
import { TradingBehaviorMetrics, PsychologyAlert } from '@/app/types/risk';
import { TradeResult } from './types';

export class IndicatorCalculator {
  constructor(
    private getTradingHistory: () => Order[],
    private getRecentTrades: (hours: number) => Order[],
    private getCurrentSession: () => { startTime: string } | null
  ) {}

  calculateBehaviorMetrics(): TradingBehaviorMetrics {
    const tradingHistory = this.getTradingHistory();
    if (tradingHistory.length === 0) {
      return this.getDefaultMetrics();
    }

    const completedTrades = tradingHistory.filter(order => order.status === 'FILLED');
    const tradeResults = this.calculateTradeResults(completedTrades);
    const wins = tradeResults.filter(result => result.pnl > 0);
    const losses = tradeResults.filter(result => result.pnl < 0);

    const winRate = tradeResults.length > 0 ? wins.length / tradeResults.length : 0;
    const lossRate = tradeResults.length > 0 ? losses.length / tradeResults.length : 0;

    const avgWinSize = wins.length > 0
      ? wins.reduce((sum, win) => sum + win.pnl, 0) / wins.length
      : 0;

    const avgLossSize = losses.length > 0
      ? losses.reduce((sum, loss) => sum + Math.abs(loss.pnl), 0) / losses.length
      : 0;

    const totalWins = wins.reduce((sum, win) => sum + win.pnl, 0);
    const totalLosses = losses.reduce((sum, loss) => sum + Math.abs(loss.pnl), 0);
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveResults();
    const overTradingScore = this.calculateOverTradingScore();
    const emotionalTradingScore = this.calculateEmotionalTradingScore();
    const averageHoldTime = this.calculateAverageHoldTime();

    return {
      averageHoldTime,
      winRate,
      lossRate,
      avgWinSize,
      avgLossSize,
      profitFactor,
      consecutiveWins,
      consecutiveLosses,
      overTradingScore,
      emotionalTradingScore
    };
  }

  calculateConsecutiveResults(): { consecutiveWins: number; consecutiveLosses: number } {
    const tradingHistory = this.getTradingHistory();
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentStreak = 0;
    let isWinStreak = true;

    for (let i = tradingHistory.length - 1; i >= 0; i--) {
      const trade = tradingHistory[i];
      const isWin = trade.side === 'SELL';

      if (i === tradingHistory.length - 1) {
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

  calculateOverTradingScore(): number {
    const recentTrades = this.getRecentTrades(24);
    const tradesPerHour = recentTrades.length / 24;
    const normalFrequency = 1;
    const overTradingRatio = tradesPerHour / normalFrequency;
    return Math.min(100, overTradingRatio * 50);
  }

  calculateEmotionalTradingScore(): number {
    let score = 0;
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveResults();

    if (consecutiveWins >= 3) {
      score += consecutiveWins * 10;
    }

    if (consecutiveLosses >= 3) {
      score += consecutiveLosses * 15;
    }

    const recentTrades = this.getRecentTrades(6);
    const previousTrades = this.getRecentTrades(12).slice(0, -6);

    if (recentTrades.length > previousTrades.length * 2) {
      score += 30;
    }

    return Math.min(100, score);
  }

  calculateAverageHoldTime(): number {
    return 4;
  }

  isTraderFatigued(): boolean {
    const currentSession = this.getCurrentSession();
    if (!currentSession) return false;

    const sessionDuration = Date.now() - new Date(currentSession.startTime).getTime();
    const hoursTrading = sessionDuration / (1000 * 60 * 60);
    return hoursTrading >= 4;
  }

  calculateTradeResults(trades: Order[]): TradeResult[] {
    const results: TradeResult[] = [];

    const hasPrice = trades.some(t => t.price && t.price > 0);
    if (!hasPrice) {
      return trades.map(trade => ({
        pnl: trade.side === 'SELL' ? 1 : trade.side === 'BUY' ? -1 : 0,
        trade
      }));
    }

    const positionMap = new Map<string, { quantity: number; avgPrice: number }>();

    for (const trade of trades) {
      const price = trade.price || 0;

      if (trade.side === 'BUY') {
        const current = positionMap.get(trade.symbol);
        if (current) {
          const totalQuantity = current.quantity + trade.quantity;
          const totalCost = current.quantity * current.avgPrice + trade.quantity * price;
          positionMap.set(trade.symbol, {
            quantity: totalQuantity,
            avgPrice: totalCost / totalQuantity
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

  calculateTodayLoss(): number {
    const tradingHistory = this.getTradingHistory();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayTrades = tradingHistory.filter(
      trade => trade.status === 'FILLED' && (trade.timestamp || 0) >= todayTimestamp
    );

    const tradeResults = this.calculateTradeResults(todayTrades);
    return tradeResults
      .filter(result => result.pnl < 0)
      .reduce((sum, result) => sum + Math.abs(result.pnl), 0);
  }

  getTodayTrades(): Order[] {
    const tradingHistory = this.getTradingHistory();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return tradingHistory.filter(trade => (trade.timestamp || 0) >= todayTimestamp);
  }

  getDefaultMetrics(): TradingBehaviorMetrics {
    return {
      averageHoldTime: 0,
      winRate: 0,
      lossRate: 0,
      avgWinSize: 0,
      avgLossSize: 0,
      profitFactor: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      overTradingScore: 0,
      emotionalTradingScore: 0
    };
  }
}
