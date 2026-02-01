export * from './AdvancedPerformanceMetrics';
export * from './MultiAssetBacktestEngine';
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
