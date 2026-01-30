/**
 * AdvancedPerformanceMetrics.ts
 *
 * 高度なパフォーマンス指標計算モジュール
 * 最大ドローダウン、リカバリーファクター、Calmarレシオ、Sortinoレシオ、
 * 勝率、損益比、平均保有期間、取引回数、プロフィットファクターなどを提供します。
 */

import { BacktestResult, BacktestTrade } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface AdvancedMetrics {
  // Basic metrics
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  
  // Risk-adjusted returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  treynorRatio: number;
  omegaRatio: number;
  
  // Drawdown metrics
  maxDrawdown: number;
  maxDrawdownDuration: number;
  averageDrawdown: number;
  recoveryFactor: number;
  ulcerIndex: number;
  painRatio: number;
  
  // Trade metrics
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
  
  // Average metrics
  averageTrade: number;
  averageWin: number;
  averageLoss: number;
  averageHoldingPeriod: number; // days
  averageWinHoldingPeriod: number;
  averageLossHoldingPeriod: number;
  
  // Extreme metrics
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  
  // Distribution metrics
  skewness: number;
  kurtosis: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR95: number;
  
  // Efficiency metrics
  gainToPainRatio: number;
  kRatio: number;
  rSquared: number;
  
  // Benchmark metrics
  alpha: number;
  beta: number;
  trackingError: number;
  upCaptureRatio: number;
  downCaptureRatio: number;
}

export interface DrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownStart: string;
  maxDrawdownEnd: string;
  maxDrawdownDuration: number;
  recoveryDuration: number;
  averageDrawdown: number;
  drawdownFrequency: number;
  drawdowns: DrawdownEvent[];
}

export interface DrawdownEvent {
  startDate: string;
  endDate: string;
  peakValue: number;
  troughValue: number;
  drawdownPercent: number;
  duration: number;
  recoveryDate?: string;
  recoveryDuration?: number;
}

export interface TradeAnalysis {
  bestTrade: BacktestTrade;
  worstTrade: BacktestTrade;
  longestTrade: BacktestTrade;
  shortestTrade: BacktestTrade;
  consecutiveWins: ConsecutiveTrade[];
  consecutiveLosses: ConsecutiveTrade[];
  tradeDistribution: TradeDistribution;
  monthlyPerformance: MonthlyPerformance[];
  yearlyPerformance: YearlyPerformance[];
}

export interface ConsecutiveTrade {
  count: number;
  startDate: string;
  endDate: string;
  totalPnL: number;
  trades: BacktestTrade[];
}

export interface TradeDistribution {
  profitRanges: RangeCount[];
  lossRanges: RangeCount[];
  avgProfit: number;
  avgLoss: number;
  medianProfit: number;
  medianLoss: number;
  stdDevProfit: number;
  stdDevLoss: number;
}

export interface RangeCount {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface MonthlyPerformance {
  year: number;
  month: number;
  return: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgTrade: number;
}

export interface YearlyPerformance {
  year: number;
  return: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  maxDrawdown: number;
}

export interface ReturnDistribution {
  histogram: HistogramBin[];
  stats: DistributionStats;
  percentiles: Percentiles;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  frequency: number;
}

export interface DistributionStats {
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
}

export interface Percentiles {
  p1: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface BenchmarkComparison {
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
  monthlyReturns: Array<{
    date: string;
    strategy: number;
    benchmark: number;
    excess: number;
  }>;
}

// ============================================================================
// Advanced Performance Metrics Calculator
// ============================================================================

export class AdvancedPerformanceMetrics {
  /**
   * 全ての高度なメトリクスを計算
   */
  static calculateAllMetrics(
    result: BacktestResult,
    benchmarkReturns?: number[]
  ): AdvancedMetrics {
    const returns = result.trades.map(t => t.profitPercent);
    const equity = this.calculateEquityCurve(result);
    
    const basicMetrics = this.calculateBasicMetrics(result, returns, equity);
    const riskMetrics = this.calculateRiskMetrics(result, returns, equity, benchmarkReturns);
    const tradeMetrics = this.calculateTradeMetrics(result);
    const distributionMetrics = this.calculateDistributionMetrics(returns);
    
    return {
      ...basicMetrics,
      ...riskMetrics,
      ...tradeMetrics,
      ...distributionMetrics,
    };
  }

  /**
   * 基本メトリクスを計算
   */
  private static calculateBasicMetrics(
    result: BacktestResult,
    returns: number[],
    equity: number[]
  ): Partial<AdvancedMetrics> {
    const totalReturn = result.totalReturn;
    
    const startDate = new Date(result.startDate);
    const endDate = new Date(result.endDate);
    const years = Math.max(0.1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const annualizedReturn = (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;
    
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;
    const volatility = Math.sqrt(variance) * Math.sqrt(252);

    return {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
    };
  }

  /**
   * リスクメトリクスを計算
   */
  private static calculateRiskMetrics(
    result: BacktestResult,
    returns: number[],
    equity: number[],
    benchmarkReturns?: number[]
  ): Partial<AdvancedMetrics> {
    const riskFreeRate = 2; // 2% annual
    
    // Sharpe Ratio
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate / 252) / stdDev * Math.sqrt(252) : 0;

    // Sortino Ratio
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 0
      ? downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? (avgReturn * 252 - riskFreeRate) / (downsideDeviation * Math.sqrt(252)) : 0;

    // Max Drawdown and Calmar
    const drawdownAnalysis = this.analyzeDrawdowns(equity, result.trades);
    const calmarRatio = drawdownAnalysis.maxDrawdown > 0
      ? (result.totalReturn / drawdownAnalysis.maxDrawdown)
      : 0;

    // Recovery Factor
    const recoveryFactor = drawdownAnalysis.maxDrawdown > 0
      ? result.totalReturn / drawdownAnalysis.maxDrawdown
      : 0;

    // Ulcer Index
    const ulcerIndex = this.calculateUlcerIndex(equity);

    // Pain Ratio
    const painRatio = ulcerIndex > 0 ? result.totalReturn / ulcerIndex : 0;

    // Omega Ratio
    const threshold = 0;
    const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + r - threshold, 0);
    const losses = returns.filter(r => r < threshold).reduce((sum, r) => sum + threshold - r, 0);
    const omegaRatio = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;

    // Benchmark metrics
    let alpha = 0, beta = 0, informationRatio = 0, trackingError = 0;
    
    if (benchmarkReturns && benchmarkReturns.length === returns.length) {
      const benchmarkStats = this.calculateBenchmarkMetrics(returns, benchmarkReturns);
      alpha = benchmarkStats.alpha;
      beta = benchmarkStats.beta;
      informationRatio = benchmarkStats.informationRatio;
      trackingError = benchmarkStats.trackingError;
    }

    return {
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      calmarRatio: parseFloat(calmarRatio.toFixed(2)),
      informationRatio: parseFloat(informationRatio.toFixed(2)),
      treynorRatio: beta > 0 ? parseFloat((result.totalReturn / beta).toFixed(2)) : 0,
      omegaRatio: parseFloat(omegaRatio.toFixed(2)),
      maxDrawdown: parseFloat(drawdownAnalysis.maxDrawdown.toFixed(2)),
      maxDrawdownDuration: drawdownAnalysis.maxDrawdownDuration,
      averageDrawdown: parseFloat(drawdownAnalysis.averageDrawdown.toFixed(2)),
      recoveryFactor: parseFloat(recoveryFactor.toFixed(2)),
      ulcerIndex: parseFloat(ulcerIndex.toFixed(2)),
      painRatio: parseFloat(painRatio.toFixed(2)),
      alpha: parseFloat(alpha.toFixed(2)),
      beta: parseFloat(beta.toFixed(2)),
      trackingError: parseFloat(trackingError.toFixed(2)),
    };
  }

  /**
   * トレードメトリクスを計算
   */
  private static calculateTradeMetrics(result: BacktestResult): Partial<AdvancedMetrics> {
    const trades = result.trades;
    const winningTrades = trades.filter(t => t.profitPercent > 0);
    const losingTrades = trades.filter(t => t.profitPercent <= 0);

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const lossRate = totalTrades > 0 ? (losingTrades.length / totalTrades) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitPercent, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitPercent, 0));

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const lossFactor = grossProfit > 0 ? grossLoss / grossProfit : grossLoss > 0 ? Infinity : 0;

    const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const payoffRatio = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;

    const averageTrade = totalTrades > 0
      ? trades.reduce((sum, t) => sum + t.profitPercent, 0) / totalTrades
      : 0;

    const expectancy = (winRate / 100) * averageWin - (lossRate / 100) * Math.abs(averageLoss);
    const expectedValue = expectancy * totalTrades;

    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profitPercent)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profitPercent)) : 0;

    // Holding periods
    const holdingPeriods = trades.map(t => {
      const entry = new Date(t.entryDate);
      const exit = new Date(t.exitDate);
      return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
    });

    const winHoldingPeriods = winningTrades.map(t => {
      const entry = new Date(t.entryDate);
      const exit = new Date(t.exitDate);
      return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
    });

    const lossHoldingPeriods = losingTrades.map(t => {
      const entry = new Date(t.entryDate);
      const exit = new Date(t.exitDate);
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

    // Consecutive trades
    const { maxConsecutiveWins, maxConsecutiveLosses } = this.calculateConsecutiveTrades(trades);

    // Gain to Pain Ratio
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

  /**
   * 分布メトリクスを計算
   */
  private static calculateDistributionMetrics(returns: number[]): Partial<AdvancedMetrics> {
    if (returns.length === 0) {
      return {
        skewness: 0,
        kurtosis: 0,
        valueAtRisk95: 0,
        valueAtRisk99: 0,
        conditionalVaR95: 0,
        kRatio: 0,
        rSquared: 0,
        upCaptureRatio: 0,
        downCaptureRatio: 0,
      };
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Skewness
    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;

    // Kurtosis
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;

    // VaR (Historical)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var99Index = Math.floor(sortedReturns.length * 0.01);
    const valueAtRisk95 = sortedReturns[var95Index] || 0;
    const valueAtRisk99 = sortedReturns[var99Index] || 0;

    // CVaR (Conditional VaR)
    const cvar95Returns = sortedReturns.slice(0, var95Index);
    const conditionalVaR95 = cvar95Returns.length > 0
      ? cvar95Returns.reduce((a, b) => a + b, 0) / cvar95Returns.length
      : 0;

    return {
      skewness: parseFloat(skewness.toFixed(2)),
      kurtosis: parseFloat(kurtosis.toFixed(2)),
      valueAtRisk95: parseFloat(valueAtRisk95.toFixed(2)),
      valueAtRisk99: parseFloat(valueAtRisk99.toFixed(2)),
      conditionalVaR95: parseFloat(conditionalVaR95.toFixed(2)),
      kRatio: 0, // Would require regression analysis
      rSquared: 0, // Would require regression analysis
      upCaptureRatio: 0, // Would require benchmark
      downCaptureRatio: 0, // Would require benchmark
    };
  }

  /**
   * ドローダウン分析
   */
  static analyzeDrawdowns(equity: number[], trades: BacktestTrade[]): DrawdownAnalysis {
    const drawdowns: DrawdownEvent[] = [];
    let maxDrawdown = 0;
    let maxDrawdownStart = '';
    let maxDrawdownEnd = '';
    let maxDrawdownDuration = 0;
    let recoveryDuration = 0;

    let peak = equity[0];
    let peakIndex = 0;
    let inDrawdown = false;
    let drawdownStart = '';
    let drawdownStartIndex = 0;

    for (let i = 1; i < equity.length; i++) {
      if (equity[i] > peak) {
        // New peak - end of drawdown
        if (inDrawdown) {
          const drawdownPercent = ((peak - Math.min(...equity.slice(drawdownStartIndex, i))) / peak) * 100;
          drawdowns.push({
            startDate: drawdownStart,
            endDate: trades[i - 1]?.exitDate || '',
            peakValue: peak,
            troughValue: Math.min(...equity.slice(drawdownStartIndex, i)),
            drawdownPercent: parseFloat(drawdownPercent.toFixed(2)),
            duration: i - drawdownStartIndex,
            recoveryDate: trades[i - 1]?.exitDate,
            recoveryDuration: i - drawdownStartIndex,
          });
          inDrawdown = false;
        }
        peak = equity[i];
        peakIndex = i;
      } else {
        // In drawdown
        if (!inDrawdown) {
          inDrawdown = true;
          drawdownStart = trades[i - 1]?.exitDate || '';
          drawdownStartIndex = i;
        }

        const currentDrawdown = ((peak - equity[i]) / peak) * 100;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
          maxDrawdownStart = drawdownStart;
          maxDrawdownEnd = trades[i - 1]?.exitDate || '';
          maxDrawdownDuration = i - peakIndex;
          recoveryDuration = i - drawdownStartIndex;
        }
      }
    }

    const averageDrawdown = drawdowns.length > 0
      ? drawdowns.reduce((sum, d) => sum + d.drawdownPercent, 0) / drawdowns.length
      : 0;

    return {
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownStart,
      maxDrawdownEnd,
      maxDrawdownDuration,
      recoveryDuration,
      averageDrawdown: parseFloat(averageDrawdown.toFixed(2)),
      drawdownFrequency: drawdowns.length,
      drawdowns,
    };
  }

  /**
   * トレード分析
   */
  static analyzeTrades(result: BacktestResult): TradeAnalysis {
    const trades = [...result.trades].sort((a, b) => 
      new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
    );

    // Best and worst trades
    const sortedByPnL = [...trades].sort((a, b) => b.profitPercent - a.profitPercent);
    const bestTrade = sortedByPnL[0] || trades[0];
    const worstTrade = sortedByPnL[sortedByPnL.length - 1] || trades[0];

    // Longest and shortest trades
    const tradesWithDuration = trades.map(t => ({
      ...t,
      duration: (new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / (1000 * 60 * 60 * 24),
    }));
    const sortedByDuration = [...tradesWithDuration].sort((a, b) => b.duration - a.duration);
    const longestTrade = sortedByDuration[0] || trades[0];
    const shortestTrade = sortedByDuration[sortedByDuration.length - 1] || trades[0];

    // Consecutive trades
    const { consecutiveWins, consecutiveLosses } = this.findConsecutiveTrades(trades);

    // Distribution
    const tradeDistribution = this.calculateTradeDistribution(trades);

    // Monthly performance
    const monthlyPerformance = this.calculateMonthlyPerformance(trades);

    // Yearly performance
    const yearlyPerformance = this.calculateYearlyPerformance(trades);

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

  /**
   * リターン分布を計算
   */
  static calculateReturnDistribution(returns: number[], binCount: number = 20): ReturnDistribution {
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

    // Histogram
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

    // Stats
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;

    // Percentiles
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

  /**
   * ベンチマーク比較
   */
  static compareToBenchmark(
    strategyReturns: number[],
    benchmarkReturns: number[],
    dates: string[]
  ): BenchmarkComparison {
    const comparison = this.calculateBenchmarkMetrics(strategyReturns, benchmarkReturns);

    // Up/Down capture
    const upMonths = strategyReturns.filter((r, i) => r > 0 && benchmarkReturns[i] > 0).length;
    const downMonths = strategyReturns.filter((r, i) => r < 0 && benchmarkReturns[i] < 0).length;
    const benchmarkUpMonths = benchmarkReturns.filter(r => r > 0).length;
    const benchmarkDownMonths = benchmarkReturns.filter(r => r < 0).length;

    const upCapture = benchmarkUpMonths > 0 ? (upMonths / benchmarkUpMonths) * 100 : 0;
    const downCapture = benchmarkDownMonths > 0 ? (downMonths / benchmarkDownMonths) * 100 : 0;

    // Monthly returns
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

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static calculateEquityCurve(result: BacktestResult): number[] {
    const equity: number[] = [100];
    let currentEquity = 100;

    for (const trade of result.trades) {
      currentEquity *= (1 + trade.profitPercent / 100);
      equity.push(parseFloat(currentEquity.toFixed(2)));
    }

    return equity;
  }

  private static calculateUlcerIndex(equity: number[]): number {
    let sumSquared = 0;
    let peak = equity[0];

    for (let i = 1; i < equity.length; i++) {
      if (equity[i] > peak) {
        peak = equity[i];
      }
      const drawdown = ((peak - equity[i]) / peak) * 100;
      sumSquared += drawdown * drawdown;
    }

    return Math.sqrt(sumSquared / equity.length);
  }

  private static calculateConsecutiveTrades(trades: BacktestTrade[]): { maxConsecutiveWins: number; maxConsecutiveLosses: number } {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const trade of trades) {
      if (trade.profitPercent > 0) {
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

  private static findConsecutiveTrades(trades: BacktestTrade[]): { consecutiveWins: ConsecutiveTrade[]; consecutiveLosses: ConsecutiveTrade[] } {
    const consecutiveWins: ConsecutiveTrade[] = [];
    const consecutiveLosses: ConsecutiveTrade[] = [];

    let currentStreak: BacktestTrade[] = [];
    let isWinStreak = false;

    for (const trade of trades) {
      const isWin = trade.profitPercent > 0;

      if (currentStreak.length === 0 || isWin === isWinStreak) {
        currentStreak.push(trade);
        isWinStreak = isWin;
      } else {
        // Streak ended
        if (currentStreak.length >= 2) {
          const streak: ConsecutiveTrade = {
            count: currentStreak.length,
            startDate: currentStreak[0].entryDate,
            endDate: currentStreak[currentStreak.length - 1].exitDate,
            totalPnL: parseFloat(currentStreak.reduce((sum, t) => sum + t.profitPercent, 0).toFixed(2)),
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

    // Handle last streak
    if (currentStreak.length >= 2) {
      const streak: ConsecutiveTrade = {
        count: currentStreak.length,
        startDate: currentStreak[0].entryDate,
        endDate: currentStreak[currentStreak.length - 1].exitDate,
        totalPnL: parseFloat(currentStreak.reduce((sum, t) => sum + t.profitPercent, 0).toFixed(2)),
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

  private static calculateTradeDistribution(trades: BacktestTrade[]): TradeDistribution {
    const winningTrades = trades.filter(t => t.profitPercent > 0);
    const losingTrades = trades.filter(t => t.profitPercent <= 0);

    const profits = winningTrades.map(t => t.profitPercent);
    const losses = losingTrades.map(t => Math.abs(t.profitPercent));

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

    // Create ranges
    const profitRanges = this.createRanges(profits, 5, true);
    const lossRanges = this.createRanges(losses, 5, false);

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

  private static createRanges(values: number[], numRanges: number, isProfit: boolean): RangeCount[] {
    if (values.length === 0) return [];

    const max = Math.max(...values);
    const rangeSize = max / numRanges;

    const ranges: RangeCount[] = [];
    for (let i = 0; i < numRanges; i++) {
      const min = i * rangeSize;
      const max = (i + 1) * rangeSize;
      const count = values.filter(v => v >= min && v < max).length;

      ranges.push({
        range: `${min.toFixed(1)}% - ${max.toFixed(1)}%`,
        min,
        max,
        count,
        percentage: parseFloat(((count / values.length) * 100).toFixed(1)),
      });
    }

    return ranges;
  }

  private static calculateMonthlyPerformance(trades: BacktestTrade[]): MonthlyPerformance[] {
    const monthlyMap = new Map<string, { return: number; trades: number; wins: number; losses: number }>();

    for (const trade of trades) {
      const date = new Date(trade.exitDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { return: 0, trades: 0, wins: 0, losses: 0 });
      }

      const data = monthlyMap.get(key)!;
      data.return += trade.profitPercent;
      data.trades++;
      if (trade.profitPercent > 0) {
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

  private static calculateYearlyPerformance(trades: BacktestTrade[]): YearlyPerformance[] {
    const yearlyMap = new Map<number, { return: number; trades: number; wins: number; losses: number; maxDrawdown: number }>();

    for (const trade of trades) {
      const year = new Date(trade.exitDate).getFullYear();

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { return: 0, trades: 0, wins: 0, losses: 0, maxDrawdown: 0 });
      }

      const data = yearlyMap.get(year)!;
      data.return += trade.profitPercent;
      data.trades++;
      if (trade.profitPercent > 0) {
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

  private static calculateBenchmarkMetrics(strategyReturns: number[], benchmarkReturns: number[]) {
    const n = Math.min(strategyReturns.length, benchmarkReturns.length);
    
    const strategySlice = strategyReturns.slice(0, n);
    const benchmarkSlice = benchmarkReturns.slice(0, n);

    const avgStrategy = strategySlice.reduce((a, b) => a + b, 0) / n;
    const avgBenchmark = benchmarkSlice.reduce((a, b) => a + b, 0) / n;

    // Covariance and variance
    let covariance = 0;
    let varianceBenchmark = 0;
    let varianceStrategy = 0;

    for (let i = 0; i < n; i++) {
      const diffStrategy = strategySlice[i] - avgStrategy;
      const diffBenchmark = benchmarkSlice[i] - avgBenchmark;
      covariance += diffStrategy * diffBenchmark;
      varianceBenchmark += diffBenchmark * diffBenchmark;
      varianceStrategy += diffStrategy * diffStrategy;
    }

    covariance /= n;
    varianceBenchmark /= n;
    varianceStrategy /= n;

    const stdDevBenchmark = Math.sqrt(varianceBenchmark);
    const stdDevStrategy = Math.sqrt(varianceStrategy);

    // Beta
    const beta = varianceBenchmark > 0 ? covariance / varianceBenchmark : 0;

    // Alpha
    const alpha = avgStrategy - beta * avgBenchmark;

    // Correlation
    const correlation = stdDevBenchmark > 0 && stdDevStrategy > 0
      ? covariance / (stdDevBenchmark * stdDevStrategy)
      : 0;

    // R-squared
    const rSquared = correlation * correlation;

    // Tracking error
    const excessReturns = strategySlice.map((s, i) => s - benchmarkSlice[i]);
    const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / n;
    const varianceExcess = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / n;
    const trackingError = Math.sqrt(varianceExcess);

    // Information ratio
    const informationRatio = trackingError > 0 ? avgExcess / trackingError : 0;

    return {
      alpha,
      beta,
      correlation,
      rSquared,
      trackingError,
      informationRatio,
    };
  }
}

export default AdvancedPerformanceMetrics;
