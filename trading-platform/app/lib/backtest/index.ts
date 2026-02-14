export * from './types';
export * from './BaseBacktestEngine';
export * from './AdvancedPerformanceMetrics';
export * from './MultiAssetBacktestEngine';

// Realistic Backtesting Modules (TRADING-030)
export * from './SlippageModel';
export * from './CommissionCalculator';
export * from './PartialFillSimulator';
export * from './LatencySimulator';
export * from './WalkForwardAnalyzer';
export * from './MonteCarloSimulator';
export * from './RealisticBacktestOrchestrator';

// Engines
export * from './AdvancedBacktestEngine';
export * from './RealisticBacktestEngine';

// Explicit re-exports and aliases for backward compatibility
export { AdvancedBacktestEngine as BacktestEngine } from './AdvancedBacktestEngine';

export type {
  BacktestConfig as AdvancedBacktestConfig
} from './types';

export {
  DEFAULT_BACKTEST_CONFIG as DEFAULT_ADVANCED_CONFIG
} from './BaseBacktestEngine';

// Enhanced realistic backtesting components aliases
export {
  DEFAULT_REALISTIC_CONFIG as DEFAULT_ENGINE_REALISTIC_CONFIG,
} from './RealisticBacktestEngine';

export * from './OverfittingDetector';
export { WalkForwardAnalysis, walkForwardAnalysis } from './WalkForwardAnalysis';
export type { WalkForwardConfig as MLWalkForwardConfig } from './WalkForwardAnalysis';
