/**
 * Backtest Module Index
 *
 * バックテスト関連モジュールのエクスポート
 */

// Advanced Backtest Engine
export {
  AdvancedBacktestEngine,
  getGlobalBacktestEngine,
  resetGlobalBacktestEngine,
  type OHLCV,
  type Trade,
  type BacktestConfig,
  type BacktestResult as AdvancedBacktestResult,
  type PerformanceMetrics,
  type Strategy,
  type StrategyContext,
  type StrategyAction,
  DEFAULT_BACKTEST_CONFIG,
} from './AdvancedBacktestEngine';

// Multi-Asset Backtest Engine
export {
  MultiAssetBacktestEngine,
  getGlobalMultiAssetBacktestEngine,
  resetGlobalMultiAssetBacktestEngine,
  type PortfolioConfig,
  type MultiAssetBacktestConfig,
  type PortfolioPosition,
  type PortfolioSnapshot,
  type CorrelationMatrix,
  type RebalanceEvent,
  type RebalanceTrade,
  type MultiAssetBacktestResult,
  type PortfolioPerformanceMetrics,
  type MonthlyReturn,
  type YearlyReturn,
  DEFAULT_PORTFOLIO_CONFIG,
  DEFAULT_MULTI_ASSET_CONFIG,
} from './MultiAssetBacktestEngine';

// Parameter Optimizer
export {
  ParameterOptimizer,
  getGlobalParameterOptimizer,
  resetGlobalParameterOptimizer,
  type ParameterSpace,
  type OptimizationConfig,
  type ParameterSet,
  type OptimizationResult,
  type WalkForwardResult,
  type GeneticConfig,
  type Individual,
  DEFAULT_OPTIMIZATION_CONFIG,
  DEFAULT_GENETIC_CONFIG,
  DEFAULT_PARAMETER_SPACE,
} from './ParameterOptimizer';

// Advanced Performance Metrics
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

// Backtest Visualization Utils
export {
  BacktestVisualizationUtils,
  type CumulativeReturnDataPoint,
  type TradeDistribution as VisualizationTradeDistribution,
  type MonthlyPerformance as VisualizationMonthlyPerformance,
} from '../BacktestVisualizationUtils';

// Legacy exports for backward compatibility
export { runBacktest } from '../backtest';
export { optimizedAccuracyService, OptimizedAccuracyService } from '../OptimizedAccuracyService';
