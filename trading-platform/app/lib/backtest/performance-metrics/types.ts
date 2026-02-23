import { BacktestTrade } from '@/app/types';

export interface AdvancedMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  treynorRatio: number;
  omegaRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  averageDrawdown: number;
  recoveryFactor: number;
  ulcerIndex: number;
  painRatio: number;
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
  skewness: number;
  kurtosis: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR95: number;
  gainToPainRatio: number;
  kRatio: number;
  rSquared: number;
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

export interface BenchmarkMetricsResult {
  alpha: number;
  beta: number;
  correlation: number;
  rSquared: number;
  trackingError: number;
  informationRatio: number;
}
