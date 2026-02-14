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

// Engines - Named exports to avoid type conflicts
export {
  AdvancedBacktestEngine,
  getGlobalBacktestEngine,
  resetGlobalBacktestEngine,
} from './AdvancedBacktestEngine';

export {
  RealisticBacktestEngine,
  getRealisticBacktestEngine,
  resetRealisticBacktestEngine,
  DEFAULT_REALISTIC_ENGINE_CONFIG,
} from './RealisticBacktestEngine';

// Explicit re-exports and aliases for backward compatibility
export { AdvancedBacktestEngine as BacktestEngine } from './AdvancedBacktestEngine';

export type {
  BacktestConfig as AdvancedBacktestConfig
} from './types';

export {
  DEFAULT_BACKTEST_CONFIG as DEFAULT_ADVANCED_CONFIG
} from './BaseBacktestEngine';

export {
  DEFAULT_REALISTIC_ENGINE_CONFIG as DEFAULT_ENGINE_REALISTIC_CONFIG,
} from './RealisticBacktestEngine';

export * from './OverfittingDetector';
export { WalkForwardAnalysis, walkForwardAnalysis } from './WalkForwardAnalysis';
export type { WalkForwardConfig as MLWalkForwardConfig } from './WalkForwardAnalysis';
