/**
 * Risk Management Module Index
 * 
 * 高度なリスク管理機能のエクスポート
 */

// Advanced Risk Manager
export {
  AdvancedRiskManager as default,
  AdvancedRiskManager,
  DEFAULT_RISK_LIMITS,
} from './AdvancedRiskManager';

export type {
  RiskMetrics,
  PositionSizingParams,
  PositionSizingResult,
  RiskLimits,
  RiskAlert,
  PortfolioOptimizationParams,
  OptimizationResult,
} from './AdvancedRiskManager';

// TRADING-003: Enhanced Risk Management Components
export {
  DynamicPositionSizing,
  createDynamicPositionSizing,
} from './DynamicPositionSizing';

export {
  CorrelationManager,
  createCorrelationManager,
} from './CorrelationManager';

export {
  StressTestEngine,
  createStressTestEngine,
} from './StressTestEngine';

export {
  PsychologyMonitor,
  createPsychologyMonitor,
} from './PsychologyMonitor';
