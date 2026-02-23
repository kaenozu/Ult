import { Order, Position } from '@/app/types';
import {
  TradingBehaviorMetrics,
  PsychologyAlert,
  RiskTradingSession,
  BiasAnalysis,
  ConsecutiveLossInfo
} from '@/app/types/risk';

export type {
  Order,
  Position,
  TradingBehaviorMetrics,
  PsychologyAlert,
  RiskTradingSession,
  BiasAnalysis,
  ConsecutiveLossInfo
};

export type AlertSeverity = PsychologyAlert['severity'];

export interface RiskCheckResult {
  isExcessive: boolean;
  riskMultiplier: number;
  recommendation: string;
}

export interface RuleViolationResult {
  hasViolation: boolean;
  violations: string[];
}

export interface TradingRules {
  maxTradesPerDay?: number;
  maxLossPerDay?: number;
  requiredStopLoss?: boolean;
}

export interface ProposedPosition {
  size: number;
  riskAmount: number;
}

export interface TradeResult {
  pnl: number;
  trade: Order;
}
