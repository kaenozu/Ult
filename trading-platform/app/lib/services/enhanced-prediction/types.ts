import { OHLCV, Signal, TechnicalIndicatorsWithATR } from '@/app/types';
import { PatternFeatures } from '../candlestick-pattern-service';
import { PredictionFeatures } from '../feature-engineering-service';

export const SIGNAL_THRESHOLDS = {
  MIN_CONFIDENCE: 0.6,
  EXTREME_CONFIDENCE: 0.95,
} as const;

export interface PredictionInput {
  symbol: string;
  data: OHLCV[];
  indicators?: TechnicalIndicatorsWithATR;
}

export interface EnhancedPredictionResult {
  signal: Signal;
  confidence: number;
  direction: number;
  expectedReturn: number;
  ensembleContribution: {
    rf: number;
    xgb: number;
    lstm: number;
    pattern: number;
  };
  features: {
    technical: PredictionFeatures;
    pattern: PatternFeatures;
  };
  marketRegime: string;
  calculationTime: number;
  cacheHit: boolean;
}

export interface CacheEntry {
  result: EnhancedPredictionResult;
  timestamp: number;
  dataHash: string;
}

export interface PerformanceMetrics {
  totalCalculations: number;
  cacheHits: number;
  averageCalculationTime: number;
  lastCleanup: number;
}

export type MarketRegime = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'UNKNOWN';

export interface EnsembleWeights {
  RF: number;
  XGB: number;
  LSTM: number;
  TECHNICAL: number;
}
