export type {
  AdvancedMetrics,
  DrawdownAnalysis,
  DrawdownEvent,
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
  BenchmarkComparison,
  BenchmarkMetricsResult,
} from './types';

export { AdvancedPerformanceMetrics } from './service';
export { default } from './service';

export {
  calculateEquityCurve,
  calculateUlcerIndex,
  calculateConsecutiveTrades,
  findConsecutiveTrades,
  calculateTradeDistribution,
  createRanges,
  calculateMonthlyPerformance,
  calculateYearlyPerformance,
  analyzeDrawdowns,
} from './calculators';

export {
  calculateBenchmarkMetrics,
  computeReturnDistribution,
  computeBenchmarkComparison,
} from './distribution';

export {
  calculateBasicMetrics,
  calculateRiskMetrics,
  calculateTradeMetrics,
  calculateDistributionMetrics,
} from './metrics';
