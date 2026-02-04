export * from './AdvancedPerformanceMetrics';
export * from './MultiAssetBacktestEngine';
export * from './WinningBacktestEngine';

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
export * from './RealisticBacktestEngine';
export * from './MonteCarloSimulator';
export * from './OverfittingDetector';
export * from './WalkForwardAnalysis';
