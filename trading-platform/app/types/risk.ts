/**
 * Risk Management Type Definitions
 * 
 * TRADING-003: リスク管理システムの高度化
 */

import { Position, Portfolio, OHLCV } from './index';

// ============================================================================
// Dynamic Position Sizing Types
// ============================================================================

export interface PositionSizingConfig {
  maxPositionSize: number; // 最大ポジションサイズ（ドル）
  maxPositionPercent: number; // ポートフォリオの最大パーセンテージ
  riskPerTrade: number; // 1取引あたりのリスク（パーセンテージ）
  maxRisk: number; // 最大リスク（ドル）
  volatilityAdjustment: boolean; // ボラティリティ調整の有無
  correlationAdjustment: boolean; // 相関調整の有無
  initialCapital?: number; // 初期資本（ケリー基準の動的調整用）
}

export interface SizingResult {
  recommendedSize: number;
  riskAmount: number;
  stopLossDistance: number;
  confidence: number;
  reasons: string[];
}

// ============================================================================
// Correlation Management Types
// ============================================================================

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

// ============================================================================
// Stress Testing Types
// ============================================================================

export interface StressScenario {
  name: string;
  description: string;
  marketShock: number; // パーセンテージ
  volatilityMultiplier: number;
  correlationChange: number;
}

export interface StressTestResult {
  scenario: StressScenario;
  portfolioImpact: number; // ドル
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
  timeHorizon: number; // days
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
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

// ============================================================================
// Psychology Management Types
// ============================================================================

export interface TradingBehaviorMetrics {
  averageHoldTime: number; // hours
  winRate: number;
  lossRate: number;
  avgWinSize: number;
  avgLossSize: number;
  profitFactor: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  overTradingScore: number; // 0-100
  emotionalTradingScore: number; // 0-100
}

export interface PsychologyAlert {
  type: 'overtrading' | 'revenge_trading' | 'fear' | 'greed' | 'fatigue';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  timestamp: Date;
}

export interface TradingSession {
  startTime: Date;
  endTime?: Date;
  tradesCount: number;
  profitLoss: number;
  emotionalState: 'calm' | 'excited' | 'fearful' | 'angry' | 'tired';
  decisionQuality: number; // 0-100
}

// ============================================================================
// Cooling-off Management Types
// ============================================================================

export interface CoolingReason {
  type: 'consecutive_losses' | 'daily_loss_limit' | 'weekly_loss_limit' | 'overtrading' | 'manual';
  severity: number; // 1-10
  triggerValue: number;
  description: string;
}

export interface CooldownRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  reason: CoolingReason;
  duration: number; // minutes
  wasRespected: boolean;
  violationCount: number;
}

// ============================================================================
// Market Data Types
// ============================================================================

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
