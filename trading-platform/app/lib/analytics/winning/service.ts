import type { PerformanceMetrics } from '@/app/types/performance';
import {
  BacktestTrade,
  BacktestResult,
  WinRateAnalysis,
  ProfitLossAnalysis,
  TradePatternAnalysis,
  PerformanceReport,
  ComparativeAnalysis,
  getHoldingPeriods,
} from './types';
import {
  calculateDrawdownCurve,
  calculateWinRateByHour,
  calculateWinRateByDayOfWeek,
  calculateWinRateTrend,
  calculateConsecutive,
  calculateProfitByMonth,
  calculateProfitByStrategy,
  groupBy,
  createHoldingPattern,
  createExitPattern,
  calculatePatternStability,
  calculateStrategyScore,
  createEmptyWinRateAnalysis,
  createEmptyPLAnalysis,
} from './calculations';
import {
  generateRecommendations,
  assessRisk,
  detectMarketRegimes,
} from './reports';

function calculateMetrics(trades: BacktestTrade[], equityCurve: number[]): PerformanceMetrics {
  const winningTrades = trades.filter(t => t.pnl > 0);
  const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);

  const totalReturn = ((equityCurve[equityCurve.length - 1] - equityCurve[0]) / equityCurve[0]) * 100;
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) * Math.sqrt(252) * 100;
  const sharpeRatio = volatility > 0 ? (avgReturn * 252) / (volatility / 100) : 0;

  const maxDrawdown = Math.max(...calculateDrawdownCurve(equityCurve));

  const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
  const avgLoss = trades.filter(t => t.pnl <= 0).length > 0 ? totalLoss / trades.filter(t => t.pnl <= 0).length : 0;

  const metrics: PerformanceMetrics = {
    totalReturn,
    annualizedReturn: totalReturn,
    volatility: volatility / 100,
    sharpeRatio,
    sortinoRatio: 0,
    maxDrawdown: maxDrawdown / 100,
    maxDrawdownDuration: 0,
    averageDrawdown: 0,
    winRate: winRate / 100,
    profitFactor,
    averageWin: avgWin,
    averageLoss: avgLoss,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
    largestLoss: trades.filter(t => t.pnl <= 0).length > 0 ? Math.min(...trades.filter(t => t.pnl <= 0).map(t => t.pnl)) : 0,
    averageTrade: trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length : 0,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: trades.length - winningTrades.length,
    calmarRatio: maxDrawdown > 0 ? (totalReturn / 100) / (maxDrawdown / 100) : 0,
    omegaRatio: 0,
    valueAtRisk: 0,
    informationRatio: 0,
    treynorRatio: 0,
    conditionalValueAtRisk: 0,
    downsideDeviation: 0,
    averageWinLossRatio: avgLoss > 0 ? avgWin / avgLoss : 0,
    averageHoldingPeriod: trades.length > 0 ? trades.reduce((sum, t) => sum + getHoldingPeriods(t), 0) / trades.length : 0,
    averageRMultiple: 0,
    expectancy: 0,
    kellyCriterion: 0,
    riskOfRuin: 0,
    SQN: 0,
    profitToDrawdownRatio: maxDrawdown > 0 ? totalReturn / maxDrawdown : 0,
    returnToRiskRatio: volatility > 0 ? totalReturn / volatility : 0,
    skewness: 0,
    kurtosis: 0,
    ulcerIndex: 0
  };

  return metrics;
}

export class WinningAnalytics {
  generatePerformanceReport(trades: BacktestTrade[], equityCurve: number[]): PerformanceReport {
    const metrics = calculateMetrics(trades, equityCurve);

    return {
      summary: {
        totalTrades: metrics.totalTrades,
        winRate: metrics.winRate,
        profitFactor: metrics.profitFactor,
        sharpeRatio: metrics.sharpeRatio,
        maxDrawdown: metrics.maxDrawdown,
        totalReturn: metrics.totalReturn,
      },
      winRateAnalysis: this.analyzeWinRate(trades),
      plAnalysis: this.analyzeProfitLoss(trades, equityCurve),
      patternAnalysis: this.analyzeTradePatterns(trades),
      marketRegimes: detectMarketRegimes(equityCurve),
      recommendations: generateRecommendations(trades, metrics),
      riskAssessment: assessRisk(trades, equityCurve),
    };
  }

  analyzeWinRate(trades: BacktestTrade[]): WinRateAnalysis {
    if (trades.length === 0) {
      return createEmptyWinRateAnalysis();
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const overallWinRate = (winningTrades.length / trades.length) * 100;

    const winRateByStrategy = new Map<string, { wins: number; total: number }>();
    for (const trade of trades) {
      const strategyKey = trade.strategy ?? 'unknown';
      const current = winRateByStrategy.get(strategyKey) || { wins: 0, total: 0 };
      current.total++;
      if (trade.pnl > 0) current.wins++;
      winRateByStrategy.set(strategyKey, current);
    }

    const winRateByStrategyMap = new Map<string, number>();
    for (const [strategy, stats] of winRateByStrategy) {
      winRateByStrategyMap.set(strategy, (stats.wins / stats.total) * 100);
    }

    const winRateByTimeOfDay = calculateWinRateByHour(trades);
    const winRateByDayOfWeek = calculateWinRateByDayOfWeek(trades);
    const { consecutiveWins, consecutiveLosses } = calculateConsecutive(trades);

    return {
      overallWinRate,
      winRateByStrategy: winRateByStrategyMap,
      winRateByMarketCondition: new Map(),
      winRateByTimeOfDay,
      winRateByDayOfWeek,
      winRateTrend: calculateWinRateTrend(trades),
      consecutiveWins,
      consecutiveLosses,
    };
  }

  analyzeProfitLoss(trades: BacktestTrade[], equityCurve: number[]): ProfitLossAnalysis {
    if (trades.length === 0) {
      return createEmptyPLAnalysis();
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const netProfit = totalProfit - totalLoss;

    const averageProfit = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const expectancy = (winRate * averageProfit) - ((1 - winRate) * averageLoss);

    const drawdownCurve = calculateDrawdownCurve(equityCurve);
    const maxDrawdown = Math.max(...drawdownCurve);
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;

    return {
      totalProfit,
      totalLoss,
      netProfit,
      averageProfit,
      averageLoss,
      profitFactor,
      expectancy,
      profitByMonth: calculateProfitByMonth(trades),
      profitByStrategy: calculateProfitByStrategy(trades),
      equityCurve,
      drawdownCurve,
      recoveryFactor,
    };
  }

  analyzeTradePatterns(trades: BacktestTrade[]): TradePatternAnalysis {
    if (trades.length < 10) {
      return {
        patterns: [],
        bestPattern: null,
        worstPattern: null,
        patternStability: 0,
      };
    }

    const patterns = [];

    const strategyGroups = groupBy(trades, 'strategy');
    for (const [strategy, strategyTrades] of strategyGroups) {
      const winning = strategyTrades.filter((t: BacktestTrade) => t.pnl > 0);
      const winRate = (winning.length / strategyTrades.length) * 100;
      const avgProfit = strategyTrades.reduce((sum: number, t: BacktestTrade) => sum + t.pnl, 0) / strategyTrades.length;
      const avgHolding = strategyTrades.reduce((sum: number, t: BacktestTrade) => sum + getHoldingPeriods(t), 0) / strategyTrades.length;

      patterns.push({
        patternName: strategy,
        frequency: strategyTrades.length,
        winRate,
        avgProfit,
        avgHoldingPeriod: avgHolding,
        confidence: Math.min(100, strategyTrades.length * 5),
      });
    }

    const shortTerm = trades.filter(t => getHoldingPeriods(t) <= 5);
    const mediumTerm = trades.filter(t => getHoldingPeriods(t) > 5 && getHoldingPeriods(t) <= 20);
    const longTerm = trades.filter(t => getHoldingPeriods(t) > 20);

    if (shortTerm.length > 5) {
      patterns.push(createHoldingPattern('Short Term (<=5)', shortTerm));
    }
    if (mediumTerm.length > 5) {
      patterns.push(createHoldingPattern('Medium Term (6-20)', mediumTerm));
    }
    if (longTerm.length > 5) {
      patterns.push(createHoldingPattern('Long Term (>20)', longTerm));
    }

    const exitGroups = groupBy(trades, 'exitReason');
    for (const [reason, reasonTrades] of exitGroups) {
      if (reasonTrades.length >= 5) {
        patterns.push(createExitPattern(reason, reasonTrades));
      }
    }

    const sortedPatterns = [...patterns].sort((a, b) => b.avgProfit - a.avgProfit);
    const bestPattern = sortedPatterns[0] || null;
    const worstPattern = sortedPatterns[sortedPatterns.length - 1] || null;
    const patternStability = calculatePatternStability(patterns);

    return {
      patterns,
      bestPattern,
      worstPattern,
      patternStability,
    };
  }

  compareStrategies(results: Map<string, BacktestResult>): ComparativeAnalysis {
    const strategyComparison: ComparativeAnalysis['strategyComparison'] = [];

    for (const [strategy, result] of results) {
      const score = calculateStrategyScore(result.metrics);
      strategyComparison.push({
        strategy,
        totalReturn: result.metrics.totalReturn,
        sharpeRatio: result.metrics.sharpeRatio,
        maxDrawdown: result.metrics.maxDrawdown,
        winRate: result.metrics.winRate,
        score,
      });
    }

    strategyComparison.sort((a, b) => b.score - a.score);

    return {
      strategyComparison,
      benchmarkComparison: [],
      bestPerformingPeriods: this.findBestPeriods(results),
    };
  }

  private findBestPeriods(results: Map<string, BacktestResult>): { period: string; strategy: string; return: number }[] {
    const periods: { period: string; strategy: string; return: number }[] = [];

    for (const [strategy, result] of results) {
      periods.push({
        period: `${result.startDate} - ${result.endDate}`,
        strategy,
        return: result.metrics.totalReturn,
      });
    }

    return periods.sort((a, b) => b.return - a.return).slice(0, 5);
  }
}

export const winningAnalytics = new WinningAnalytics();
export default WinningAnalytics;
