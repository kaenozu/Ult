import { OHLCV } from '../../../types/shared';
import type { AllFeatures, MacroEconomicFeatures, SentimentFeatures } from '../../services/feature-engineering/feature-types';

export type ModelType = 'RF' | 'XGB' | 'LSTM' | 'TECHNICAL' | 'PATTERN' | 'ENSEMBLE';
export type AdjustableModelType = Exclude<ModelType, 'ENSEMBLE'>;
export type RegimeType = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type VolatilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

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
  marketRegime: RegimeType;
  reasoning: string;
  timestamp: string;
}

export interface MarketRegime {
  regime: RegimeType;
  trendDirection: TrendDirection;
  volatilityLevel: VolatilityLevel;
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
  PATTERN: number;
  ENSEMBLE: number;
}

export interface WeightAdjustmentConfig {
  learningRate: number;
  minWeight: number;
  maxWeight: number;
  performanceWindow: number;
  regimeUpdateInterval: number;
}

export const DEFAULT_WEIGHT_ADJUSTMENT_CONFIG: WeightAdjustmentConfig = {
  learningRate: 0.1,
  minWeight: 0.05,
  maxWeight: 0.6,
  performanceWindow: 50,
  regimeUpdateInterval: 5,
};

export const DEFAULT_WEIGHTS: EnsembleWeights = {
  RF: 0.23,
  XGB: 0.32,
  LSTM: 0.32,
  TECHNICAL: 0.05,
  PATTERN: 0.08,
  ENSEMBLE: 0,
};

export interface PredictionInput {
  data: OHLCV[];
  features: AllFeatures;
  macroData?: MacroEconomicFeatures;
  sentimentData?: SentimentFeatures;
}
