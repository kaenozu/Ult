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
  type: 'overtrading' | 'revenge_trading' | 'fear' | 'greed' | 'fatigue' | 'fomo' | 'confirmation_bias' | 'loss_aversion';
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
// TRADING-025: Enhanced Psychology Features
// ============================================================================

export interface BiasAnalysis {
  hasFOMO: boolean;
  hasFear: boolean;
  hasConfirmationBias: boolean;
  hasLossAversion: boolean;
  detectedBiases: string[];
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface ConsecutiveLossInfo {
  currentStreak: number;
  maxStreak: number;
  totalLosses: number;
  shouldCoolOff: boolean;
  coolOffReason?: string;
}

export interface EmotionLevel {
  fear: number; // 1-5
  greed: number; // 1-5
  confidence: number; // 1-5
  stress: number; // 1-5
  overall: number; // 1-5 (average)
}

export interface TradePlan {
  id: string;
  symbol: string;
  strategy: string;
  entryReason: string;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  positionSize: number;
  createdAt: Date;
}

export interface TradeReflection {
  tradeId: string;
  lessonsLearned: string;
  whatWorked: string;
  whatDidntWork: string;
  emotionalState: EmotionLevel;
  wouldDoAgain: boolean;
  improvementAreas: string[];
  createdAt: Date;
}

export interface CoolingReason {
  type: 'consecutive_losses' | 'daily_loss_limit' | 'weekly_loss_limit' | 'overtrading' | 'manual';
  severity: number; // 1-10
  triggerValue: number | string;
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

export interface DisciplineScore {
  overall: number; // 0-100
  planAdherence: number; // 0-30
  emotionalControl: number; // 0-20
  lossManagement: number; // 0-20
  journalConsistency: number; // 0-10
  coolingOffCompliance: number; // 0-20
  breakdown: {
    planAdherenceRate: number; // percentage
    avgEmotionScore: number; // 1-10
    maxConsecutiveLosses: number;
    journalEntryRate: number; // percentage
    coolingOffRespectRate: number; // percentage
  };
}

export interface PsychologyGoals {
  daily: {
    maxTrades: number;
    maxLoss: number;
    minDisciplineScore: number;
  };
  weekly: {
    maxConsecutiveLosses: number;
    minJournalRate: number;
    targetEmotionScore: number;
  };
  monthly: {
    targetDisciplineScore: number;
    planAdherenceTarget: number;
  };
}

export interface TradingCalendarDay {
  date: string; // YYYY-MM-DD
  tradesCount: number;
  profitLoss: number;
  emotionScore: number;
  disciplineScore: number;
  hasViolation: boolean;
  isCoolingOff: boolean;
  notes: string;
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
