import type { AlertCondition, MarketData } from '../AlertSystem';
import type { OHLCV } from '../../../types';

export type { OHLCV };

export interface CompositeAlertCondition {
  id: string;
  name: string;
  logic: 'AND' | 'OR';
  conditions: AlertCondition[];
  nestedConditions?: CompositeAlertCondition[];
  enabled: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cooldownMinutes: number;
}

export interface SmartAlert {
  id: string;
  name: string;
  symbol: string;
  condition: CompositeAlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  priority: CompositeAlertCondition['priority'];
  metadata?: Record<string, unknown>;
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'sms' | 'auto_trade' | 'custom';
  config: Record<string, unknown>;
}

export interface DetectedPattern {
  type: PatternType;
  confidence: number;
  startIndex: number;
  endIndex: number;
  direction?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  metadata?: Record<string, unknown>;
}

export type PatternType =
  | 'DOJI'
  | 'HAMMER'
  | 'INVERTED_HAMMER'
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'MORNING_STAR'
  | 'EVENING_STAR'
  | 'THREE_WHITE_SOLDIERS'
  | 'THREE_BLACK_CROWS'
  | 'HEAD_AND_SHOULDERS'
  | 'INVERSE_HEAD_AND_SHOULDERS'
  | 'DOUBLE_TOP'
  | 'DOUBLE_BOTTOM'
  | 'TRIANGLE_ASCENDING'
  | 'TRIANGLE_DESCENDING'
  | 'FLAG_BULLISH'
  | 'FLAG_BEARISH';

export interface EnhancedMarketData extends MarketData {
  ohlcv: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  indicators?: Map<string, number>;
  patternData?: OHLCV[];
}

export interface AlertLearningData {
  symbol: string;
  alertType: string;
  triggerPrice: number;
  subsequentPrice: number;
  timeToResolution: number;
  wasProfitable: boolean;
  marketCondition: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'CRISIS';
}

export interface EnhancedAlertConfig {
  maxNestingLevel: number;
  minPatternConfidence: number;
  learningDataRetentionDays: number;
  adaptiveThresholdsEnabled: boolean;
  anomalyThreshold: number;
}

export const DEFAULT_CONFIG: EnhancedAlertConfig = {
  maxNestingLevel: 3,
  minPatternConfidence: 0.6,
  learningDataRetentionDays: 30,
  adaptiveThresholdsEnabled: true,
  anomalyThreshold: 2.5,
};
