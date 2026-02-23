/**
 * Types for Ensemble Model
 */

export type ModelType = 'RF' | 'XGB' | 'LSTM' | 'TECHNICAL' | 'ENSEMBLE';

export interface ModelPerformance {
  modelType: ModelType;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sharpeRatio: number;
  lastUpdate: string;
  totalPredictions: number;
  correctPredictions: number;
}

export interface ModelPrediction {
  modelType: ModelType;
  prediction: number;
  confidence: number;
  timestamp: string;
}

export interface EnsemblePrediction {
  finalPrediction: number;
  confidence: number;
  weights: Record<ModelType, number>;
  modelPredictions: ModelPrediction[];
  marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
  reasoning: string;
  timestamp: string;
}

export interface MarketRegime {
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
  trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  adx: number;
  atr: number;
  expectedDuration: number;
  daysInRegime: number;
}

export interface EnsembleWeights {
  RF: number;
  XGB: number;
  LSTM: number;
  TECHNICAL: number;
  ENSEMBLE: number;
}

export const DEFAULT_WEIGHTS: EnsembleWeights = {
  RF: 0.25,
  XGB: 0.35,
  LSTM: 0.25,
  TECHNICAL: 0.15,
  ENSEMBLE: 0,
};

export const WEIGHT_CONSTRAINTS = {
  LEARNING_RATE: 0.1,
  MIN_WEIGHT: 0.05,
  MAX_WEIGHT: 0.6,
  PERFORMANCE_WINDOW: 50,
  REGIME_UPDATE_INTERVAL: 5,
} as const;
