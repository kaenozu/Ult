import { Position, Portfolio } from '@/app/types';

export interface RealTimeRiskMetrics {
  totalRiskPercent: number;
  usedCapitalPercent: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  
  currentDrawdown: number;
  maxDrawdown: number;
  peakValue: number;
  
  var95: number;
  var99: number;
  cvar95: number;
  
  portfolioVolatility: number;
  weightedVolatility: number;
  
  concentrationRisk: number;
  largestPositionPercent: number;
  
  correlationRisk: number;
  avgCorrelation: number;
  
  dailyLoss: number;
  dailyLossPercent: number;
  
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger' | 'critical';
  alerts: RiskAlert[];
}

export interface PositionRisk {
  symbol: string;
  positionValue: number;
  positionPercent: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  volatility: number;
  var95: number;
  riskContribution: number;
  stopLossDistance: number;
}

export interface RiskAlert {
  id: string;
  type: 'max_loss' | 'drawdown' | 'concentration' | 'correlation' | 'volatility' | 'position_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  thresholdValue: number;
  timestamp: number;
  actionRequired?: string;
}

export type VaRMethod = 'historical' | 'parametric' | 'montecarlo';

export interface RiskCalculationConfig {
  varMethod: VaRMethod;
  varConfidenceLevel: number;
  varTimeHorizon: number;
  historicalPeriod: number;
  
  safeThreshold: number;
  cautionThreshold: number;
  warningThreshold: number;
  dangerThreshold: number;
  
  maxDailyLossPercent: number;
  maxWeeklyLossPercent: number;
  maxDrawdownPercent: number;
  maxSinglePositionLossPercent: number;
  
  maxPositionPercent: number;
  maxSectorConcentration: number;
  
  maxCorrelation: number;
  correlationWindow: number;
}

export const DEFAULT_RISK_CONFIG: RiskCalculationConfig = {
  varMethod: 'historical',
  varConfidenceLevel: 95,
  varTimeHorizon: 1,
  historicalPeriod: 252,
  
  safeThreshold: 10,
  cautionThreshold: 20,
  warningThreshold: 30,
  dangerThreshold: 50,
  
  maxDailyLossPercent: 5,
  maxWeeklyLossPercent: 10,
  maxDrawdownPercent: 20,
  maxSinglePositionLossPercent: 2,
  
  maxPositionPercent: 20,
  maxSectorConcentration: 30,
  
  maxCorrelation: 0.7,
  correlationWindow: 60,
};

export type { Position, Portfolio };
