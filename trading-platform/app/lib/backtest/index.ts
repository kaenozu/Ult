/**
 * Backtest Module Index
 * 
 * バックテスト機能のエクスポート
 */

// Winning Backtest Engine
export {
  default as WinningBacktestEngine,
  winningBacktestEngine,
  DEFAULT_BACKTEST_CONFIG,
} from './WinningBacktestEngine';

export type {
  BacktestTrade,
  BacktestConfig,
  PerformanceMetrics,
  BacktestResult,
  WalkForwardResult,
  MonteCarloResult,
} from './WinningBacktestEngine';

// Advanced Backtest Engine (既存)
export {
  AdvancedBacktestEngine,
  getGlobalBacktestEngine,
  resetGlobalBacktestEngine,
  DEFAULT_BACKTEST_CONFIG as ADVANCED_BACKTEST_CONFIG,
} from './AdvancedBacktestEngine';

export type {
  Trade,
  Strategy,
  StrategyContext,
  StrategyAction,
} from './AdvancedBacktestEngine';

// Parameter Optimizer
export {
  default as ParameterOptimizer,
} from './ParameterOptimizer';
