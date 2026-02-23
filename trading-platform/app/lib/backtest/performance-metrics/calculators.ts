import { BacktestTrade } from '@/app/types';
import {
  DrawdownAnalysis,
  DrawdownEvent,
  ConsecutiveTrade,
  TradeDistribution,
  RangeCount,
  MonthlyPerformance,
  YearlyPerformance,
} from './types';

export function calculateEquityCurve(trades: BacktestTrade[]): number[] {
  const equity: number[] = [100];
  let currentEquity = 100;
  for (const trade of trades) {
    currentEquity *= (1 + (trade.profitPercent || 0) / 100);
    equity.push(parseFloat(currentEquity.toFixed(2)));
  }
  return equity;
}

export function calculateUlcerIndex(equity: number[]): number {
  let sumSquared = 0;
  let peak = equity[0];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i] > peak) peak = equity[i];
    const drawdown = ((peak - equity[i]) / peak) * 100;
    sumSquared += drawdown * drawdown;
  }
  return Math.sqrt(sumSquared / equity.length);
}

export function calculateConsecutiveTrades(trades: BacktestTrade[]): {
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
} {
  let maxConsecutiveWins = 0, maxConsecutiveLosses = 0, currentWins = 0, currentLosses = 0;
  for (const trade of trades) {
    if ((trade.profitPercent || 0) > 0) {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    }
  }
  return { maxConsecutiveWins, maxConsecutiveLosses };
}

export function findConsecutiveTrades(trades: BacktestTrade[]): {
  consecutiveWins: ConsecutiveTrade[];
  consecutiveLosses: ConsecutiveTrade[];
} {
  const consecutiveWins: ConsecutiveTrade[] = [];
  const consecutiveLosses: ConsecutiveTrade[] = [];
  let currentStreak: BacktestTrade[] = [];
  let isWinStreak = false;

  const saveStreak = () => {
    if (currentStreak.length < 2) return;
    const streak: ConsecutiveTrade = {
      count: currentStreak.length,
      startDate: currentStreak[0].entryDate,
      endDate: currentStreak[currentStreak.length - 1].exitDate || currentStreak[currentStreak.length - 1].entryDate,
      totalPnL: parseFloat(currentStreak.reduce((sum, t) => sum + (t.profitPercent || 0), 0).toFixed(2)),
      trades: [...currentStreak],
    };
    (isWinStreak ? consecutiveWins : consecutiveLosses).push(streak);
  };

  for (const trade of trades) {
    const isWin = (trade.profitPercent || 0) > 0;
    if (currentStreak.length === 0 || isWin === isWinStreak) {
      currentStreak.push(trade);
      isWinStreak = isWin;
    } else {
      saveStreak();
      currentStreak = [trade];
      isWinStreak = isWin;
    }
  }
  saveStreak();
  return { consecutiveWins, consecutiveLosses };
}

export function calculateTradeDistribution(trades: BacktestTrade[]): TradeDistribution {
  const winningTrades = trades.filter((t) => (t.profitPercent || 0) > 0);
  const losingTrades = trades.filter((t) => (t.profitPercent || 0) <= 0);
  const profits = winningTrades.map((t) => t.profitPercent || 0);
  const losses = losingTrades.map((t) => Math.abs(t.profitPercent || 0));

  const avgProfit = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const sortedProfits = [...profits].sort((a, b) => a - b);
  const sortedLosses = [...losses].sort((a, b) => a - b);
  const medianProfit = sortedProfits[Math.floor(sortedProfits.length / 2)] || 0;
  const medianLoss = sortedLosses[Math.floor(sortedLosses.length / 2)] || 0;
  const profitVariance = profits.length > 0 ? profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profits.length : 0;
  const lossVariance = losses.length > 0 ? losses.reduce((sum, l) => sum + Math.pow(l - avgLoss, 2), 0) / losses.length : 0;

  return {
    profitRanges: createRanges(profits, 5),
    lossRanges: createRanges(losses, 5),
    avgProfit: parseFloat(avgProfit.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    medianProfit: parseFloat(medianProfit.toFixed(2)),
    medianLoss: parseFloat(medianLoss.toFixed(2)),
    stdDevProfit: parseFloat(Math.sqrt(profitVariance).toFixed(2)),
    stdDevLoss: parseFloat(Math.sqrt(lossVariance).toFixed(2)),
  };
}

export function createRanges(values: number[], numRanges: number): RangeCount[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const rangeSize = max / numRanges;
  const ranges: RangeCount[] = [];
  for (let i = 0; i < numRanges; i++) {
    const min = i * rangeSize;
    const rangeMax = (i + 1) * rangeSize;
    const count = values.filter((v) => v >= min && v < rangeMax).length;
    ranges.push({
      range: `${min.toFixed(1)}% - ${rangeMax.toFixed(1)}%`,
      min, max: rangeMax, count,
      percentage: parseFloat(((count / values.length) * 100).toFixed(1)),
    });
  }
  return ranges;
}

export function calculateMonthlyPerformance(trades: BacktestTrade[]): MonthlyPerformance[] {
  const monthlyMap = new Map<string, { return: number; trades: number; wins: number; losses: number }>();
  for (const trade of trades) {
    if (!trade.exitDate) continue;
    const date = new Date(trade.exitDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { return: 0, trades: 0, wins: 0, losses: 0 });
    const data = monthlyMap.get(key)!;
    data.return += trade.profitPercent || 0;
    data.trades++;
    (trade.profitPercent || 0) > 0 ? data.wins++ : data.losses++;
  }
  return Array.from(monthlyMap.entries())
    .map(([key, data]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year, month,
        return: parseFloat(data.return.toFixed(2)),
        trades: data.trades, wins: data.wins, losses: data.losses,
        winRate: parseFloat((data.trades > 0 ? (data.wins / data.trades) * 100 : 0).toFixed(1)),
        avgTrade: parseFloat((data.trades > 0 ? data.return / data.trades : 0).toFixed(2)),
      };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

export function calculateYearlyPerformance(trades: BacktestTrade[]): YearlyPerformance[] {
  const yearlyMap = new Map<number, { return: number; trades: number; wins: number; losses: number; maxDrawdown: number }>();
  for (const trade of trades) {
    if (!trade.exitDate) continue;
    const year = new Date(trade.exitDate).getFullYear();
    if (!yearlyMap.has(year)) yearlyMap.set(year, { return: 0, trades: 0, wins: 0, losses: 0, maxDrawdown: 0 });
    const data = yearlyMap.get(year)!;
    data.return += trade.profitPercent || 0;
    data.trades++;
    (trade.profitPercent || 0) > 0 ? data.wins++ : data.losses++;
  }
  return Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      return: parseFloat(data.return.toFixed(2)),
      trades: data.trades, wins: data.wins, losses: data.losses,
      winRate: parseFloat((data.trades > 0 ? (data.wins / data.trades) * 100 : 0).toFixed(1)),
      maxDrawdown: parseFloat(data.maxDrawdown.toFixed(2)),
    }))
    .sort((a, b) => a.year - b.year);
}

export function analyzeDrawdowns(equity: number[], trades: BacktestTrade[]): DrawdownAnalysis {
  const drawdowns: DrawdownEvent[] = [];
  let maxDrawdown = 0, maxDrawdownStart = '', maxDrawdownEnd = '', maxDrawdownDuration = 0, recoveryDuration = 0;
  let peak = equity[0], inDrawdown = false, drawdownStart = '', drawdownStartIndex = 0;

  for (let i = 1; i < equity.length; i++) {
    if (equity[i] > peak) {
      if (inDrawdown) {
        const drawdownPercent = ((peak - Math.min(...equity.slice(drawdownStartIndex, i))) / peak) * 100;
        drawdowns.push({
          startDate: drawdownStart, endDate: trades[i - 1]?.exitDate || '',
          peakValue: peak, troughValue: Math.min(...equity.slice(drawdownStartIndex, i)),
          drawdownPercent: parseFloat(drawdownPercent.toFixed(2)),
          duration: i - drawdownStartIndex, recoveryDate: trades[i - 1]?.exitDate, recoveryDuration: i - drawdownStartIndex,
        });
        inDrawdown = false;
      }
      peak = equity[i];
    } else {
      if (!inDrawdown) { inDrawdown = true; drawdownStart = trades[i - 1]?.exitDate || ''; drawdownStartIndex = i; }
      const currentDrawdown = ((peak - equity[i]) / peak) * 100;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown; maxDrawdownStart = drawdownStart;
        maxDrawdownEnd = trades[i - 1]?.exitDate || '';
        maxDrawdownDuration = i - drawdownStartIndex; recoveryDuration = i - drawdownStartIndex;
      }
    }
  }
  const averageDrawdown = drawdowns.length > 0 ? drawdowns.reduce((sum, d) => sum + d.drawdownPercent, 0) / drawdowns.length : 0;
  return {
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)), maxDrawdownStart, maxDrawdownEnd,
    maxDrawdownDuration, recoveryDuration, averageDrawdown: parseFloat(averageDrawdown.toFixed(2)),
    drawdownFrequency: drawdowns.length, drawdowns,
  };
}
