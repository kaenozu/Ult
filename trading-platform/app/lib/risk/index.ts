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

// TRADING-023: Real-time Risk Monitoring
export {
  RealTimeRiskCalculator,
  createRealTimeRiskCalculator,
  DEFAULT_RISK_CONFIG,
} from './RealTimeRiskCalculator';

export type {
  RealTimeRiskMetrics,
  PositionRisk,
  RiskCalculationConfig,
  VaRMethod,
} from './RealTimeRiskCalculator';

// TRADING-023: Automatic Risk Control
export {
  AutomaticRiskController,
  createAutomaticRiskController,
  DEFAULT_CONTROL_CONFIG,
} from './AutomaticRiskController';

export type {
  RiskControlAction,
  PositionReductionProposal,
  RiskControlConfig,
  MarketCrashData,
} from './AutomaticRiskController';

// TRADING-023: Dynamic Risk Adjustment
export {
  DynamicRiskAdjuster,
  createDynamicRiskAdjuster,
  DEFAULT_ADJUSTER_CONFIG,
} from './DynamicRiskAdjuster';

export type {
  DynamicRiskAdjustment,
  DynamicRiskAdjusterConfig,
  MarketCondition,
  PerformanceMetrics,
} from './DynamicRiskAdjuster';
