import type { PerformanceMetrics } from '@/app/types/performance';
import {
  BacktestTrade,
  WinRateAnalysis,
  ProfitLossAnalysis,
  TradePattern,
  MarketRegime,
  getHoldingPeriods,
} from './types';

export function calculateDrawdownCurve(equityCurve: number[]): number[] {
  let peak = equityCurve[0];
  return equityCurve.map(eq => {
    if (eq > peak) peak = eq;
    return ((peak - eq) / peak) * 100;
  });
}

export function calculateWinRateByHour(trades: BacktestTrade[]): Map<number, number> {
  const hourStats = new Map<number, { wins: number; total: number }>();

  for (const trade of trades) {
    const hour = new Date(trade.entryDate).getHours();
    const stats = hourStats.get(hour) || { wins: 0, total: 0 };
    stats.total++;
    if (trade.pnl > 0) stats.wins++;
    hourStats.set(hour, stats);
  }

  const result = new Map<number, number>();
  for (const [hour, stats] of hourStats) {
    result.set(hour, (stats.wins / stats.total) * 100);
  }
  return result;
}

export function calculateWinRateByDayOfWeek(trades: BacktestTrade[]): Map<number, number> {
  const dayStats = new Map<number, { wins: number; total: number }>();

  for (const trade of trades) {
    const day = new Date(trade.entryDate).getDay();
    const stats = dayStats.get(day) || { wins: 0, total: 0 };
    stats.total++;
    if (trade.pnl > 0) stats.wins++;
    dayStats.set(day, stats);
  }

  const result = new Map<number, number>();
  for (const [day, stats] of dayStats) {
    result.set(day, (stats.wins / stats.total) * 100);
  }
  return result;
}

export function calculateWinRateTrend(trades: BacktestTrade[]): { period: string; winRate: number }[] {
  const trend: { period: string; winRate: number }[] = [];
  const windowSize = Math.max(10, Math.floor(trades.length / 10));

  for (let i = windowSize; i <= trades.length; i += windowSize) {
    const window = trades.slice(i - windowSize, i);
    const wins = window.filter(t => t.pnl > 0).length;
    trend.push({
      period: `Period ${Math.floor(i / windowSize)}`,
      winRate: (wins / window.length) * 100,
    });
  }

  return trend;
}

export function calculateConsecutive(trades: BacktestTrade[]): { consecutiveWins: number; consecutiveLosses: number } {
  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const trade of trades) {
    if (trade.pnl > 0) {
      currentWins++;
      currentLosses = 0;
      maxWins = Math.max(maxWins, currentWins);
    } else {
      currentLosses++;
      currentWins = 0;
      maxLosses = Math.max(maxLosses, currentLosses);
    }
  }

  return { consecutiveWins: maxWins, consecutiveLosses: maxLosses };
}

export function calculateProfitByMonth(trades: BacktestTrade[]): Map<string, number> {
  const monthly = new Map<string, number>();

  for (const trade of trades) {
    const month = trade.entryDate.substring(0, 7);
    monthly.set(month, (monthly.get(month) || 0) + trade.pnl);
  }

  return monthly;
}

export function calculateProfitByStrategy(trades: BacktestTrade[]): Map<string, number> {
  const byStrategy = new Map<string, number>();

  for (const trade of trades) {
    const strategyKey = trade.strategy ?? 'unknown';
    byStrategy.set(strategyKey, (byStrategy.get(strategyKey) || 0) + trade.pnl);
  }

  return byStrategy;
}

export function groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of array) {
    const value = String(item[key]);
    const group = groups.get(value) || [];
    group.push(item);
    groups.set(value, group);
  }

  return groups;
}

export function createHoldingPattern(name: string, trades: BacktestTrade[]): TradePattern {
  const winning = trades.filter(t => t.pnl > 0);
  return {
    patternName: name,
    frequency: trades.length,
    winRate: (winning.length / trades.length) * 100,
    avgProfit: trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length,
    avgHoldingPeriod: trades.reduce((sum, t) => sum + getHoldingPeriods(t), 0) / trades.length,
    confidence: Math.min(100, trades.length * 5),
  };
}

export function createExitPattern(reason: string, trades: BacktestTrade[]): TradePattern {
  const winning = trades.filter(t => t.pnl > 0);
  return {
    patternName: `Exit: ${reason}`,
    frequency: trades.length,
    winRate: (winning.length / trades.length) * 100,
    avgProfit: trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length,
    avgHoldingPeriod: trades.reduce((sum, t) => sum + getHoldingPeriods(t), 0) / trades.length,
    confidence: Math.min(100, trades.length * 5),
  };
}

export function calculatePatternStability(patterns: TradePattern[]): number {
  if (patterns.length < 2) return 0;

  const winRates = patterns.map(p => p.winRate);
  const avg = winRates.reduce((a, b) => a + b, 0) / winRates.length;
  const variance = winRates.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / winRates.length;
  const stdDev = Math.sqrt(variance);

  return Math.max(0, 100 - stdDev);
}

export function createMarketRegime(
  regime: MarketRegime['regime'],
  start: number,
  end: number,
  equityCurve: number[],
  drawdownCurveFn: (ec: number[]) => number[]
): MarketRegime {
  const window = equityCurve.slice(start, end);
  const returns = window.slice(1).map((eq, i) => (eq - window[i]) / window[i]);

  const totalReturn = ((window[window.length - 1] - window[0]) / window[0]) * 100;
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - returns.reduce((a, b) => a + b, 0) / returns.length, 2), 0) / returns.length) * 100;
  const maxDrawdown = Math.max(...drawdownCurveFn(window));

  return {
    regime,
    startDate: '',
    endDate: '',
    duration: end - start,
    performance: {
      return: totalReturn,
      volatility,
      maxDrawdown,
    },
    optimalStrategy: getOptimalStrategyForRegime(regime),
  };
}

export function getOptimalStrategyForRegime(regime: MarketRegime['regime']): string {
  switch (regime) {
    case 'TRENDING_UP':
      return 'TREND_FOLLOWING';
    case 'TRENDING_DOWN':
      return 'MEAN_REVERSION';
    case 'RANGING':
      return 'MEAN_REVERSION';
    case 'VOLATILE':
      return 'BREAKOUT';
    default:
      return 'COMPOSITE';
  }
}

export function calculateStrategyScore(metrics: PerformanceMetrics): number {
  const sharpeScore = Math.max(0, metrics.sharpeRatio) * 10;
  const returnScore = Math.max(0, metrics.totalReturn);
  const drawdownScore = Math.max(0, 100 - metrics.maxDrawdown);
  const winRateScore = metrics.winRate;
  const profitFactorScore = Math.min(metrics.profitFactor, 5) * 10;

  return (sharpeScore + returnScore + drawdownScore + winRateScore + profitFactorScore) / 5;
}



export function createEmptyWinRateAnalysis(): WinRateAnalysis {
  return {
    overallWinRate: 0,
    winRateByStrategy: new Map(),
    winRateByMarketCondition: new Map(),
    winRateByTimeOfDay: new Map(),
    winRateByDayOfWeek: new Map(),
    winRateTrend: [],
    consecutiveWins: 0,
    consecutiveLosses: 0,
  };
}

export function createEmptyPLAnalysis(): ProfitLossAnalysis {
  return {
    totalProfit: 0,
    totalLoss: 0,
    netProfit: 0,
    averageProfit: 0,
    averageLoss: 0,
    profitFactor: 0,
    expectancy: 0,
    profitByMonth: new Map(),
    profitByStrategy: new Map(),
    equityCurve: [],
    drawdownCurve: [],
    recoveryFactor: 0,
  };
}
