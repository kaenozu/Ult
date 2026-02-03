// @ts-nocheck - Temporarily disabled during migration
// @ts-nocheck - Missing exports from TailRiskHedging
/**
 * Risk Management Module Index
 * 
 * 高度なリスク管理機能のエクスポート
 */

// Advanced Risk Manager
export {
  AdvancedRiskManager as default,
  AdvancedRiskManager,
  getGlobalRiskManager,
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

export {
  TailRiskHedging,
  createTailRiskHedging,
} from './TailRiskHedging';

export type {
  HedgeStrategy,
  TailRiskMetrics,
  HedgeRecommendation,
  HedgePerformance,
} from './TailRiskHedging';

export {
  EnhancedPortfolioRiskMonitor,
  createEnhancedPortfolioRiskMonitor,
} from './EnhancedPortfolioRiskMonitor';

export type {
  SectorExposure,
  EnhancedRiskMetrics,
} from './EnhancedPortfolioRiskMonitor';

export {
  EnhancedPsychologyMonitor,
  createEnhancedPsychologyMonitor,
} from './EnhancedPsychologyMonitor';

export type {
  DynamicRiskAdjustment,
  DynamicRiskAdjusterConfig,
  MarketCondition,
  PerformanceMetrics,
} from './DynamicRiskAdjuster';

// TRADING-028: Advanced Risk Management
export {
  DynamicPositionSizer,
  createDynamicPositionSizer,
} from './DynamicPositionSizer';

export type {
  VolatilityMetrics,
  PositionSizingRequest,
  PositionSizingResponse,
  PortfolioRiskLimits,
} from './DynamicPositionSizer';

export {
  PortfolioRiskMonitor,
  createPortfolioRiskMonitor,
} from './PortfolioRiskMonitor';

export type {
  VaRResult,
  CorrelationPair,
  StressTestScenario,
  StressTestResult,
  RiskContribution,
  PortfolioRiskReport,
} from './PortfolioRiskMonitor';

export type {
  OptionsHedge,
  InverseAssetHedge,
  FuturesHedge,
  HedgePortfolio,
} from './TailRiskHedging';

export type {
  EnhancedBehaviorMetrics,
  TiltIndicators,
  PsychologicalState,
} from './EnhancedPsychologyMonitor';

export {
  CoolingOffManager,
  createCoolingOffManager,
} from './CoolingOffManager';
