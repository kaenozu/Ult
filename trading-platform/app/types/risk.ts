/**
 * Risk Management Type Definitions
 */

import { PositionSizingMethod, StopLossType } from './shared';
import { OHLCV } from './shared';

// ============================================================================
// Basic Risk Types
// ============================================================================

export interface RiskManagementSettings {
  sizingMethod: PositionSizingMethod;
  fixedRatio?: number;
  kellyFraction?: number;
  atrMultiplier?: number;
  maxRiskPercent: number;
  maxPositionPercent: number;
  maxLossPerTrade?: number;
  maxLossPercent?: number;
  dailyLossLimit?: number;
  useATR?: boolean;
  atrPeriod?: number;
  maxPositions?: number;
  maxCorrelation?: number;
  stopLoss: {
    enabled: boolean;
    type: StopLossType;
    value: number;
    trailing?: boolean;
  };
  takeProfit: {
    enabled: boolean;
    type: 'percentage' | 'atr' | 'fixed' | 'price' | 'risk_reward_ratio';
    value: number;
    partials?: boolean;
  };
  trailingStop?: {
    enabled: boolean;
    activationPercent: number;
    trailPercent: number;
  };
}

export interface RiskCalculationResult {
  positionSize: number;
  riskAmount: number;
  rewardAmount?: number;
  riskRewardRatio?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  maxLoss?: number;
  maxGain?: number;
  capitalAtRisk?: number;
  riskPercent?: number;
  positionRiskPercent?: number;
  maxPositionSize?: number;
}

// ============================================================================
// Advanced Risk Management Types
// ============================================================================

export interface PositionSizingConfig {
  maxPositionSize: number;
  maxPositionPercent: number;
  riskPerTrade: number;
  maxRisk: number;
  volatilityAdjustment: boolean;
  correlationAdjustment: boolean;
  initialCapital?: number;
}

export interface SizingResult {
  recommendedSize: number;
  riskAmount: number;
  stopLossDistance: number;
  confidence: number;
  reasons: string[];
}

export interface CorrelationAnalysis {
  symbol1: string;
  symbol2: string;
  correlation: number;
  timeframe: string;
  significance: number;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  timestamp: Date;
}

export interface ConcentrationRisk {
  symbol: string;
  weight: number;
  sector: string;
  riskScore: number;
}

export interface HedgeRecommendation {
  primarySymbol: string;
  hedgeSymbol: string;
  hedgeRatio: number;
  correlation: number;
  reasoning: string;
}

export interface StressScenario {
  name: string;
  description: string;
  marketShock: number;
  volatilityMultiplier: number;
  correlationChange: number;
}

export interface StressTestResult {
  scenario: StressScenario;
  portfolioImpact: number;
  portfolioImpactPercent: number;
  maxDrawdown: number;
  var95: number;
  cvar95: number;
  positionImpacts: {
    symbol: string;
    impact: number;
    impactPercent: number;
  }[];
}

export interface MonteCarloConfig {
  numSimulations: number;
  timeHorizon: number;
  confidenceLevel: number;
}

export interface MonteCarloResult {
  expectedReturn: number;
  standardDeviation: number;
  var95: number;
  cvar95: number;
  probabilityOfProfit: number;
  worstCase: number;
  bestCase: number;
  percentiles: Record<string, number>;
}

export interface TradingBehaviorMetrics {
  averageHoldTime: number;
  winRate: number;
  lossRate: number;
  avgWinSize: number;
  avgLossSize: number;
  profitFactor: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  overTradingScore: number;
  emotionalTradingScore: number;
}

export interface PsychologyAlert {
  type: 'overtrading' | 'revenge_trading' | 'fear' | 'greed' | 'fatigue' | 'fomo' | 'confirmation_bias' | 'loss_aversion';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  timestamp: Date;
}

export interface RiskTradingSession {
  startTime: string;
  endTime?: string;
  tradesCount: number;
  profitLoss: number;
  emotionalState: 'calm' | 'excited' | 'fearful' | 'angry' | 'tired';
  decisionQuality: number;
}

export interface BiasAnalysis {
  detectedBiases: string[];
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ConsecutiveLossInfo {
  count: number;
  totalLoss: number;
  startedAt: Date;
  lastLossAt: Date;
}

export interface DisciplineScore {
  overall: number;
  planAdherence: number;
  emotionalControl: number;
  lossManagement: number;
  journalConsistency: number;
  coolingOffCompliance: number;
  breakdown: {
    planAdherenceRate: number;
    avgEmotionScore: number;
    maxConsecutiveLosses: number;
    journalEntryRate: number;
    coolingOffRespectRate: number;
  };
}

export interface CoolingReason {
  type: 'consecutive_losses' | 'daily_loss_limit' | 'weekly_loss_limit' | 'overtrading' | 'manual';
  severity: number;
  triggerValue: number;
  description: string;
}

export interface CooldownRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  reason: CoolingReason;
  duration: number;
  wasRespected: boolean;
  violationCount: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  ohlcv?: OHLCV;
}

export interface RiskMetrics {
  var95: number;
  cvar95: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
}

export interface KellyParams {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  portfolioValue: number;
  kellyFraction?: number;
}

export interface KellyResult {
  kellyPercentage: number;
  recommendedSize: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  warnings: string[];
}

export interface VolatilityAdjustment {
  actualVolatility: number;
  targetVolatility: number;
  adjustmentFactor: number;
}

export interface PositionSizeRecommendation {
  symbol: string;
  baseSize: number;
  adjustedSize: number;
  finalSize: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  constraints: {
    singlePositionLimit: number;
    sectorLimit: number;
    appliedLimits: string[];
  };
  volatilityAdjustment?: VolatilityAdjustment;
  kellyResult: KellyResult;
}

export interface ConcentrationLimits {
  maxSinglePosition: number;
  maxSectorExposure: number;
  minPositions: number;
  maxPositions: number;
}
