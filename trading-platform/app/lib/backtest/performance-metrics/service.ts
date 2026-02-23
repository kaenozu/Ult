import { BacktestResult } from '@/app/types';
import {
  AdvancedMetrics,
  DrawdownAnalysis,
  TradeAnalysis,
  ReturnDistribution,
  BenchmarkComparison,
} from './types';
import { calculateEquityCurve, analyzeDrawdowns, findConsecutiveTrades } from './calculators';
import {
  calculateTradeDistribution,
  calculateMonthlyPerformance,
  calculateYearlyPerformance,
} from './calculators';
import { computeReturnDistribution, computeBenchmarkComparison } from './distribution';
import {
  calculateBasicMetrics,
  calculateRiskMetrics,
  calculateTradeMetrics,
  calculateDistributionMetrics,
} from './metrics';

export class AdvancedPerformanceMetrics {
  static calculateAllMetrics(result: BacktestResult, benchmarkReturns?: number[]): AdvancedMetrics {
    const returns = result.trades
      .map((t) => t.profitPercent)
      .filter((p): p is number => typeof p === 'number');
    const equity = calculateEquityCurve(result.trades);

    return {
      ...calculateBasicMetrics(result, returns),
      ...calculateRiskMetrics(result, returns, equity, benchmarkReturns),
      ...calculateTradeMetrics(result),
      ...calculateDistributionMetrics(returns),
    } as AdvancedMetrics;
  }

  static analyzeDrawdownsFromResult(result: BacktestResult): DrawdownAnalysis {
    const equity = calculateEquityCurve(result.trades);
    return analyzeDrawdowns(equity, result.trades);
  }

  static analyzeTrades(result: BacktestResult): TradeAnalysis {
    const trades = [...result.trades].sort((a, b) => {
      const dateA = a.exitDate ? new Date(a.exitDate).getTime() : 0;
      const dateB = b.exitDate ? new Date(b.exitDate).getTime() : 0;
      return dateA - dateB;
    });

    const sortedByPnL = [...trades].sort(
      (a, b) => (b.profitPercent || 0) - (a.profitPercent || 0)
    );
    const bestTrade = sortedByPnL[0] || trades[0];
    const worstTrade = sortedByPnL[sortedByPnL.length - 1] || trades[0];

    const tradesWithDuration = trades.map((t) => ({
      ...t,
      duration:
        ((t.exitDate ? new Date(t.exitDate).getTime() : Date.now()) -
          new Date(t.entryDate).getTime()) /
        (1000 * 60 * 60 * 24),
    }));
    const sortedByDuration = [...tradesWithDuration].sort((a, b) => b.duration - a.duration);
    const longestTrade = sortedByDuration[0] || trades[0];
    const shortestTrade = sortedByDuration[sortedByDuration.length - 1] || trades[0];

    const { consecutiveWins, consecutiveLosses } = findConsecutiveTrades(trades);

    return {
      bestTrade,
      worstTrade,
      longestTrade,
      shortestTrade,
      consecutiveWins,
      consecutiveLosses,
      tradeDistribution: calculateTradeDistribution(trades),
      monthlyPerformance: calculateMonthlyPerformance(trades),
      yearlyPerformance: calculateYearlyPerformance(trades),
    };
  }

  static calculateReturnDistribution(returns: number[], binCount = 20): ReturnDistribution {
    return computeReturnDistribution(returns, binCount);
  }

  static compareToBenchmark(
    strategyReturns: number[],
    benchmarkReturns: number[],
    dates: string[]
  ): BenchmarkComparison {
    return computeBenchmarkComparison(strategyReturns, benchmarkReturns, dates);
  }
}

export default AdvancedPerformanceMetrics;
