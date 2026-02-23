import { BacktestResult, BacktestTrade } from '@/app/types';
import {
  TradeAnalysis,
  ConsecutiveTrade,
  TradeDistribution,
  RangeCount,
  MonthlyPerformance,
  YearlyPerformance,
  ReturnDistribution,
  HistogramBin,
  DistributionStats,
  Percentiles,
} from './types';

export function calculateConsecutiveTrades(trades: BacktestTrade[]): { maxConsecutiveWins: number; maxConsecutiveLosses: number } {
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

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

export function findConsecutiveTrades(trades: BacktestTrade[]): { consecutiveWins: ConsecutiveTrade[]; consecutiveLosses: ConsecutiveTrade[] } {
  const consecutiveWins: ConsecutiveTrade[] = [];
  const consecutiveLosses: ConsecutiveTrade[] = [];

  let currentStreak: BacktestTrade[] = [];
  let isWinStreak = false;

  for (const trade of trades) {
    const isWin = (trade.profitPercent || 0) > 0;

    if (currentStreak.length === 0 || isWin === isWinStreak) {
      currentStreak.push(trade);
      isWinStreak = isWin;
    } else {
      if (currentStreak.length >= 2) {
        const streak: ConsecutiveTrade = {
          count: currentStreak.length,
          startDate: currentStreak[0].entryDate,
          endDate: currentStreak[currentStreak.length - 1].exitDate || currentStreak[currentStreak.length - 1].entryDate,
          totalPnL: parseFloat(currentStreak.reduce((sum, t) => sum + (t.profitPercent || 0), 0).toFixed(2)),
          trades: [...currentStreak],
        };

        if (isWinStreak) {
          consecutiveWins.push(streak);
        } else {
          consecutiveLosses.push(streak);
        }
      }

      currentStreak = [trade];
      isWinStreak = isWin;
    }
  }

  if (currentStreak.length >= 2) {
    const streak: ConsecutiveTrade = {
      count: currentStreak.length,
      startDate: currentStreak[0].entryDate,
      endDate: currentStreak[currentStreak.length - 1].exitDate || currentStreak[currentStreak.length - 1].entryDate,
      totalPnL: parseFloat(currentStreak.reduce((sum, t) => sum + (t.profitPercent || 0), 0).toFixed(2)),
      trades: [...currentStreak],
    };

    if (isWinStreak) {
      consecutiveWins.push(streak);
    } else {
      consecutiveLosses.push(streak);
    }
  }

  return { consecutiveWins, consecutiveLosses };
}

export function createRanges(values: number[], numRanges: number, isProfit: boolean): RangeCount[] {
  if (values.length === 0) return [];

  const max = Math.max(...values);
  const rangeSize = max / numRanges;

  const ranges: RangeCount[] = [];
  for (let i = 0; i < numRanges; i++) {
    const min = i * rangeSize;
    const rangeMax = (i + 1) * rangeSize;
    const count = values.filter(v => v >= min && v < rangeMax).length;

    ranges.push({
      range: `${min.toFixed(1)}% - ${rangeMax.toFixed(1)}%`,
      min,
      max: rangeMax,
      count,
      percentage: parseFloat(((count / values.length) * 100).toFixed(1)),
    });
  }

  return ranges;
}

export function calculateTradeDistribution(trades: BacktestTrade[]): TradeDistribution {
  const winningTrades = trades.filter(t => (t.profitPercent || 0) > 0);
  const losingTrades = trades.filter(t => (t.profitPercent || 0) <= 0);

  const profits = winningTrades.map(t => t.profitPercent || 0);
  const losses = losingTrades.map(t => Math.abs(t.profitPercent || 0));

  const avgProfit = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

  const sortedProfits = [...profits].sort((a, b) => a - b);
  const sortedLosses = [...losses].sort((a, b) => a - b);

  const medianProfit = sortedProfits[Math.floor(sortedProfits.length / 2)] || 0;
  const medianLoss = sortedLosses[Math.floor(sortedLosses.length / 2)] || 0;

  const profitVariance = profits.length > 0
    ? profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profits.length
    : 0;
  const lossVariance = losses.length > 0
    ? losses.reduce((sum, l) => sum + Math.pow(l - avgLoss, 2), 0) / losses.length
    : 0;

  const profitRanges = createRanges(profits, 5, true);
  const lossRanges = createRanges(losses, 5, false);

  return {
    profitRanges,
    lossRanges,
    avgProfit: parseFloat(avgProfit.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    medianProfit: parseFloat(medianProfit.toFixed(2)),
    medianLoss: parseFloat(medianLoss.toFixed(2)),
    stdDevProfit: parseFloat(Math.sqrt(profitVariance).toFixed(2)),
    stdDevLoss: parseFloat(Math.sqrt(lossVariance).toFixed(2)),
  };
}

export function calculateMonthlyPerformance(trades: BacktestTrade[]): MonthlyPerformance[] {
  const monthlyMap = new Map<string, { return: number; trades: number; wins: number; losses: number }>();

  for (const trade of trades) {
    if (!trade.exitDate) continue;
    const date = new Date(trade.exitDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { return: 0, trades: 0, wins: 0, losses: 0 });
    }

    const data = monthlyMap.get(key)!;
    data.return += (trade.profitPercent || 0);
    data.trades++;
    if ((trade.profitPercent || 0) > 0) {
      data.wins++;
    } else {
      data.losses++;
    }
  }

  return Array.from(monthlyMap.entries())
    .map(([key, data]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year,
        month,
        return: parseFloat(data.return.toFixed(2)),
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
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

    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, { return: 0, trades: 0, wins: 0, losses: 0, maxDrawdown: 0 });
    }

    const data = yearlyMap.get(year)!;
    data.return += (trade.profitPercent || 0);
    data.trades++;
    if ((trade.profitPercent || 0) > 0) {
      data.wins++;
    } else {
      data.losses++;
    }
  }

  return Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      return: parseFloat(data.return.toFixed(2)),
      trades: data.trades,
      wins: data.wins,
      losses: data.losses,
      winRate: parseFloat((data.trades > 0 ? (data.wins / data.trades) * 100 : 0).toFixed(1)),
      maxDrawdown: parseFloat(data.maxDrawdown.toFixed(2)),
    }))
    .sort((a, b) => a.year - b.year);
}

export function calculateTradeMetrics(result: BacktestResult): {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  lossFactor: number;
  payoffRatio: number;
  expectancy: number;
  expectedValue: number;
  averageTrade: number;
  averageWin: number;
  averageLoss: number;
  averageHoldingPeriod: number;
  averageWinHoldingPeriod: number;
  averageLossHoldingPeriod: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  gainToPainRatio: number;
} {
  const trades = result.trades;
  const winningTrades = trades.filter(t => (t.profitPercent || 0) > 0);
  const losingTrades = trades.filter(t => (t.profitPercent || 0) <= 0);

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losingTrades.length / totalTrades) * 100 : 0;

  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0));

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const lossFactor = grossProfit > 0 ? grossLoss / grossProfit : grossLoss > 0 ? Infinity : 0;

  const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

  const payoffRatio = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;

  const averageTrade = totalTrades > 0
    ? trades.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / totalTrades
    : 0;

  const expectancy = (winRate / 100) * averageWin - (lossRate / 100) * Math.abs(averageLoss);
  const expectedValue = expectancy * totalTrades;

  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profitPercent || 0)) : 0;
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profitPercent || 0)) : 0;

  const holdingPeriods = trades.map(t => {
    const entry = new Date(t.entryDate);
    const exit = t.exitDate ? new Date(t.exitDate) : new Date();
    return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  });

  const winHoldingPeriods = winningTrades.map(t => {
    const entry = new Date(t.entryDate);
    const exit = t.exitDate ? new Date(t.exitDate) : new Date();
    return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  });

  const lossHoldingPeriods = losingTrades.map(t => {
    const entry = new Date(t.entryDate);
    const exit = t.exitDate ? new Date(t.exitDate) : new Date();
    return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  });

  const averageHoldingPeriod = holdingPeriods.length > 0
    ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
    : 0;

  const averageWinHoldingPeriod = winHoldingPeriods.length > 0
    ? winHoldingPeriods.reduce((a, b) => a + b, 0) / winHoldingPeriods.length
    : 0;

  const averageLossHoldingPeriod = lossHoldingPeriods.length > 0
    ? lossHoldingPeriods.reduce((a, b) => a + b, 0) / lossHoldingPeriods.length
    : 0;

  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveTrades(trades);

  const gainToPainRatio = grossLoss > 0 ? result.totalReturn / grossLoss : result.totalReturn;

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: parseFloat(winRate.toFixed(1)),
    lossRate: parseFloat(lossRate.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    lossFactor: parseFloat(lossFactor.toFixed(2)),
    payoffRatio: parseFloat(payoffRatio.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    expectedValue: parseFloat(expectedValue.toFixed(2)),
    averageTrade: parseFloat(averageTrade.toFixed(2)),
    averageWin: parseFloat(averageWin.toFixed(2)),
    averageLoss: parseFloat(averageLoss.toFixed(2)),
    averageHoldingPeriod: parseFloat(averageHoldingPeriod.toFixed(1)),
    averageWinHoldingPeriod: parseFloat(averageWinHoldingPeriod.toFixed(1)),
    averageLossHoldingPeriod: parseFloat(averageLossHoldingPeriod.toFixed(1)),
    largestWin: parseFloat(largestWin.toFixed(2)),
    largestLoss: parseFloat(largestLoss.toFixed(2)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    gainToPainRatio: parseFloat(gainToPainRatio.toFixed(2)),
  };
}

export function analyzeTrades(result: BacktestResult): TradeAnalysis {
  const trades = [...result.trades].sort((a, b) => {
    const dateA = a.exitDate ? new Date(a.exitDate).getTime() : 0;
    const dateB = b.exitDate ? new Date(b.exitDate).getTime() : 0;
    return dateA - dateB;
  });

  const sortedByPnL = [...trades].sort((a, b) => (b.profitPercent || 0) - (a.profitPercent || 0));
  const bestTrade = sortedByPnL[0] || trades[0];
  const worstTrade = sortedByPnL[sortedByPnL.length - 1] || trades[0];

  const tradesWithDuration = trades.map(t => {
    const exitTime = t.exitDate ? new Date(t.exitDate).getTime() : Date.now();
    return {
      ...t,
      duration: (exitTime - new Date(t.entryDate).getTime()) / (1000 * 60 * 60 * 24),
    };
  });
  const sortedByDuration = [...tradesWithDuration].sort((a, b) => b.duration - a.duration);
  const longestTrade = sortedByDuration[0] || trades[0];
  const shortestTrade = sortedByDuration[sortedByDuration.length - 1] || trades[0];

  const { consecutiveWins, consecutiveLosses } = findConsecutiveTrades(trades);
  const tradeDistribution = calculateTradeDistribution(trades);
  const monthlyPerformance = calculateMonthlyPerformance(trades);
  const yearlyPerformance = calculateYearlyPerformance(trades);

  return {
    bestTrade,
    worstTrade,
    longestTrade,
    shortestTrade,
    consecutiveWins,
    consecutiveLosses,
    tradeDistribution,
    monthlyPerformance,
    yearlyPerformance,
  };
}

export function calculateReturnDistribution(returns: number[], binCount: number = 20): ReturnDistribution {
  if (returns.length === 0) {
    return {
      histogram: [],
      stats: {
        mean: 0,
        median: 0,
        stdDev: 0,
        skewness: 0,
        kurtosis: 0,
        min: 0,
        max: 0,
      },
      percentiles: {
        p1: 0, p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0,
      },
    };
  }

  const sorted = [...returns].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const binWidth = (max - min) / binCount;

  const histogram: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = returns.filter(r => r >= binStart && (i === binCount - 1 ? r <= binEnd : r < binEnd)).length;

    histogram.push({
      binStart: parseFloat(binStart.toFixed(2)),
      binEnd: parseFloat(binEnd.toFixed(2)),
      count,
      frequency: parseFloat((count / returns.length).toFixed(4)),
    });
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
  const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;

  const getPercentile = (p: number) => sorted[Math.floor(sorted.length * p / 100)] || 0;

  return {
    histogram,
    stats: {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      skewness: parseFloat(skewness.toFixed(2)),
      kurtosis: parseFloat(kurtosis.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
    },
    percentiles: {
      p1: parseFloat(getPercentile(1).toFixed(2)),
      p5: parseFloat(getPercentile(5).toFixed(2)),
      p10: parseFloat(getPercentile(10).toFixed(2)),
      p25: parseFloat(getPercentile(25).toFixed(2)),
      p50: parseFloat(getPercentile(50).toFixed(2)),
      p75: parseFloat(getPercentile(75).toFixed(2)),
      p90: parseFloat(getPercentile(90).toFixed(2)),
      p95: parseFloat(getPercentile(95).toFixed(2)),
      p99: parseFloat(getPercentile(99).toFixed(2)),
    },
  };
}

export function compareToBenchmark(
  strategyReturns: number[],
  benchmarkReturns: number[],
  dates: string[],
  calculateBenchmarkMetrics: (s: number[], b: number[]) => { alpha: number; beta: number; correlation: number; rSquared: number; trackingError: number; informationRatio: number }
): {
  strategyReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  alpha: number;
  beta: number;
  correlation: number;
  rSquared: number;
  trackingError: number;
  informationRatio: number;
  upCapture: number;
  downCapture: number;
  upMonths: number;
  downMonths: number;
  upRatio: number;
  monthlyReturns: Array<{ date: string; strategy: number; benchmark: number; excess: number }>;
} {
  const comparison = calculateBenchmarkMetrics(strategyReturns, benchmarkReturns);

  const upMonths = strategyReturns.filter((r, i) => r > 0 && benchmarkReturns[i] > 0).length;
  const downMonths = strategyReturns.filter((r, i) => r < 0 && benchmarkReturns[i] < 0).length;
  const benchmarkUpMonths = benchmarkReturns.filter(r => r > 0).length;
  const benchmarkDownMonths = benchmarkReturns.filter(r => r < 0).length;

  const upCapture = benchmarkUpMonths > 0 ? (upMonths / benchmarkUpMonths) * 100 : 0;
  const downCapture = benchmarkDownMonths > 0 ? (downMonths / benchmarkDownMonths) * 100 : 0;

  const monthlyReturns = dates.map((date, i) => ({
    date,
    strategy: strategyReturns[i],
    benchmark: benchmarkReturns[i],
    excess: strategyReturns[i] - benchmarkReturns[i],
  }));

  const strategyReturn = strategyReturns.reduce((a, b) => a + b, 0);
  const benchmarkReturn = benchmarkReturns.reduce((a, b) => a + b, 0);

  return {
    strategyReturn: parseFloat(strategyReturn.toFixed(2)),
    benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
    excessReturn: parseFloat((strategyReturn - benchmarkReturn).toFixed(2)),
    alpha: parseFloat(comparison.alpha.toFixed(2)),
    beta: parseFloat(comparison.beta.toFixed(2)),
    correlation: parseFloat(comparison.correlation.toFixed(2)),
    rSquared: parseFloat(comparison.rSquared.toFixed(2)),
    trackingError: parseFloat(comparison.trackingError.toFixed(2)),
    informationRatio: parseFloat(comparison.informationRatio.toFixed(2)),
    upCapture: parseFloat(upCapture.toFixed(2)),
    downCapture: parseFloat(downCapture.toFixed(2)),
    upMonths,
    downMonths,
    upRatio: parseFloat((upMonths / (upMonths + downMonths) * 100).toFixed(2)),
    monthlyReturns,
  };
}
