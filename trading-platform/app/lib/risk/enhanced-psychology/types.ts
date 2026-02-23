import { Order } from '@/app/types';
import {
  TradingBehaviorMetrics,
  PsychologyAlert,
  RiskTradingSession,
} from '@/app/types/risk';

export interface EnhancedBehaviorMetrics extends TradingBehaviorMetrics {
  tiltScore: number;
  emotionalVolatility: number;
  impulsivityScore: number;
  disciplineScore: number;
  recoveryRate: number;
  tradeQualityTrend: 'improving' | 'stable' | 'declining';
}

export interface TiltIndicators {
  rapidFireTrading: boolean;
  positionSizeEscalation: boolean;
  stopLossIgnorance: boolean;
  revengeTrading: boolean;
  overconfidence: boolean;
  panicSelling: boolean;
}

export interface PsychologicalState {
  overall: 'healthy' | 'stressed' | 'tilted' | 'burnout';
  confidence: number;
  emotional: 'calm' | 'excited' | 'fearful' | 'angry' | 'tired';
  focus: number;
  stress: number;
  recommendation: string;
}

export interface TradeResult {
  pnl: number;
  trade: Order;
}

export interface ConsecutiveResults {
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface PsychologyMonitorState {
  tradingHistory: Order[];
  sessions: RiskTradingSession[];
  currentSession: RiskTradingSession | null;
  alerts: PsychologyAlert[];
  tradeTimestamps: number[];
  positionSizeHistory: number[];
}
