/**
 * Risk Management Module Index
 * 
 * 高度なリスク管理機能のエクスポート
 */

// Advanced Risk Manager
export {
  default as AdvancedRiskManager,
  advancedRiskManager,
  DEFAULT_RISK_LIMITS,
} from './AdvancedRiskManager';

export type {
  PositionSizingInput,
  PositionSizingResult,
  StopLossConfig,
  StopLossResult,
  PortfolioRiskMetrics,
  RiskLimitConfig,
} from './AdvancedRiskManager';
