import type { ConsensusSignal } from '../../ConsensusSignalService';

export interface RSIAnalysis {
  current: number;
  trend: 'rising' | 'falling' | 'neutral';
  signal: 'oversold' | 'overbought' | 'neutral' | 'extreme_oversold' | 'extreme_overbought';
  divergence: {
    detected: boolean;
    type: 'bullish' | 'bearish' | 'none';
    strength: number;
  };
  score: number;
  reasons: string[];
}

export interface TrendAnalysis {
  shortTerm: 'bullish' | 'bearish' | 'neutral';
  mediumTerm: 'bullish' | 'bearish' | 'neutral';
  longTerm: 'bullish' | 'bearish' | 'neutral';
  crossover: {
    detected: boolean;
    type: 'golden' | 'dead' | 'none';
    strength: number;
  };
  alignment: number;
  score: number;
  reasons: string[];
}

export interface VolatilityAnalysis {
  current: number;
  state: 'squeeze' | 'expansion' | 'normal';
  bollingerPosition: number;
  bandwidth: number;
  score: number;
  reasons: string[];
}

export interface MomentumAnalysis {
  macdHistogram: number;
  histogramTrend: 'increasing' | 'decreasing' | 'neutral';
  macdCross: {
    detected: boolean;
    type: 'bullish' | 'bearish' | 'none';
    strength: number;
  };
  score: number;
  reasons: string[];
}

export interface CompositeAnalysis {
  rsi: RSIAnalysis;
  trend: TrendAnalysis;
  volatility: VolatilityAnalysis;
  momentum: MomentumAnalysis;
  consensus: ConsensusSignal;
  finalScore: number;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  explainability: {
    primaryReasons: string[];
    supportingReasons: string[];
    warnings: string[];
  };
}

export type Direction = 'BUY' | 'SELL' | 'NEUTRAL';
export type Strength = 'WEAK' | 'MODERATE' | 'STRONG';
