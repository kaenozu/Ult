export * from './AdvancedPerformanceMetrics';
export * from './MultiAssetBacktestEngine';
// Export specific symbols from WinningBacktestEngine to avoid MonteCarloResult conflict
export { default as WinningBacktestEngine } from './WinningBacktestEngine';

// Realistic Backtesting Modules (TRADING-030)
export * from './SlippageModel';
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
export type {
  BacktestConfig as WinningBacktestConfig
} from './WinningBacktestEngine';
export {
  DEFAULT_BACKTEST_CONFIG as DEFAULT_WINNING_CONFIG
} from './WinningBacktestEngine';

// Enhanced realistic backtesting components
// Duplicate exports removed - already exported via RealisticBacktestOrchestrator
// export * from './RealisticBacktestEngine';
// MonteCarloSimulator already exported above (line 8)
// export * from './OverfittingDetector';
// export * from './WalkForwardAnalysis';
