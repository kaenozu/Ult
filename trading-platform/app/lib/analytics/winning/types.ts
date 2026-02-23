import { RealisticTradeMetrics, RealisticBacktestResult } from '../../backtest/RealisticBacktestEngine';
import type { PerformanceMetrics } from '@/app/types/performance';

export type BacktestTrade = RealisticTradeMetrics;
export type BacktestResult = RealisticBacktestResult;

export interface WinRateAnalysis {
  overallWinRate: number;
  winRateByStrategy: Map<string, number>;
  winRateByMarketCondition: Map<string, number>;
  winRateByTimeOfDay: Map<number, number>;
  winRateByDayOfWeek: Map<number, number>;
  winRateTrend: { period: string; winRate: number }[];
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface ProfitLossAnalysis {
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  profitByMonth: Map<string, number>;
  profitByStrategy: Map<string, number>;
  equityCurve: number[];
  drawdownCurve: number[];
  recoveryFactor: number;
}

export interface TradePattern {
  patternName: string;
  frequency: number;
  winRate: number;
  avgProfit: number;
  avgHoldingPeriod: number;
  confidence: number;
}

export interface TradePatternAnalysis {
  patterns: TradePattern[];
  bestPattern: TradePattern | null;
  worstPattern: TradePattern | null;
  patternStability: number;
}

export interface MarketRegime {
  regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' | 'UNKNOWN';
  startDate: string;
  endDate: string;
  duration: number;
  performance: {
    return: number;
    volatility: number;
    maxDrawdown: number;
  };
  optimalStrategy: string;
}

export interface PerformanceReport {
  summary: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalReturn: number;
  };
  winRateAnalysis: WinRateAnalysis;
  plAnalysis: ProfitLossAnalysis;
  patternAnalysis: TradePatternAnalysis;
  marketRegimes: MarketRegime[];
  recommendations: string[];
  riskAssessment: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    var95: number;
    var99: number;
    maxConsecutiveLosses: number;
    riskOfRuin: number;
  };
}

export interface ComparativeAnalysis {
  strategyComparison: {
    strategy: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    score: number;
  }[];
  benchmarkComparison: {
    strategy: string;
    alpha: number;
    beta: number;
    correlation: number;
    outperformance: number;
  }[];
  bestPerformingPeriods: {
    period: string;
    strategy: string;
    return: number;
  }[];
}

export function getHoldingPeriods(trade: RealisticTradeMetrics): number {
  return trade.holdingPeriods ?? 0;
}
