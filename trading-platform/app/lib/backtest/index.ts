/**
 * Backtest module exports
 */

export {
  AdvancedBacktestEngine,
  DEFAULT_BACKTEST_CONFIG,
  type Trade,
  type BacktestConfig,
  type BacktestResult as EngineBacktestResult,
  type PerformanceMetrics,
  type Strategy,
  type StrategyContext,
  type StrategyAction,
} from './AdvancedBacktestEngine';

export {
  AdvancedPerformanceMetrics,
  type AdvancedMetrics,
  type DrawdownAnalysis,
  type DrawdownEvent,
  type TradeAnalysis,
  type ConsecutiveTrade,
  type TradeDistribution,
  type RangeCount,
  type MonthlyPerformance,
  type YearlyPerformance,
  type ReturnDistribution,
  type HistogramBin,
  type DistributionStats,
  type Percentiles,
  type BenchmarkComparison,
} from './AdvancedPerformanceMetrics';

export { WinningBacktestEngine } from './WinningBacktestEngine';
export { MultiAssetBacktestEngine } from './MultiAssetBacktestEngine';
