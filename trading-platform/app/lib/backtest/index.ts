export * from './AdvancedPerformanceMetrics';
export * from './MultiAssetBacktestEngine';
// WinningBacktestEngine is deprecated - use RealisticBacktestEngine instead
// export * from './WinningBacktestEngine';

// Realistic Backtesting Modules (TRADING-030)
export * from './SlippageModel';
export * from './CommissionCalculator';
export * from './PartialFillSimulator';
export * from './LatencySimulator';
export * from './WalkForwardAnalyzer';
export * from './MonteCarloSimulator';
export * from './RealisticBacktestOrchestrator';

// Explicit re-exports to avoid naming conflicts
export type {
  BacktestConfig as AdvancedBacktestConfig
} from './AdvancedBacktestEngine';
export {
  DEFAULT_BACKTEST_CONFIG as DEFAULT_ADVANCED_CONFIG
} from './AdvancedBacktestEngine';
// WinningBacktestEngine is deprecated - use RealisticBacktestEngine instead
// export type {
//   BacktestConfig as WinningBacktestConfig
// } from './WinningBacktestEngine';
// export {
//   DEFAULT_BACKTEST_CONFIG as DEFAULT_WINNING_CONFIG
// } from './WinningBacktestEngine';

// Enhanced realistic backtesting components
export {
  RealisticBacktestEngine,
  getRealisticBacktestEngine,
  resetRealisticBacktestEngine,
  DEFAULT_REALISTIC_CONFIG as DEFAULT_ENGINE_REALISTIC_CONFIG,
} from './RealisticBacktestEngine';
export type {
  RealisticBacktestConfig as EngineRealisticBacktestConfig,
  RealisticBacktestResult,
  RealisticTradeMetrics,
  WalkForwardResult,
  MonteCarloResult,
} from './RealisticBacktestEngine';
// MonteCarloSimulator already exported above, skip duplicate
export * from './OverfittingDetector';
export { WalkForwardAnalysis, walkForwardAnalysis } from './WalkForwardAnalysis';
export type { WalkForwardConfig as MLWalkForwardConfig } from './WalkForwardAnalysis';
