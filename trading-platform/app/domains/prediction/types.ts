/**
 * Prediction Types
 * 
 * 莠域ｸｬ繝峨Γ繧､繝ｳ縺ｮ蝙句ｮ夂ｾｩ
 */

import type { RegimeDetectionResult, VolatilityRegime } from '@/app/lib/MarketRegimeDetector';

export interface AttentionWeights {
  temporal: number[];
  feature: number[];
  price: number;
  volume: number;
}

export interface AdvancedPrediction {
  pricePrediction: number;
  confidence: number;
  attentionWeights: AttentionWeights;
  volatilityPrediction: number;
  trendStrength: number;
  marketRegime: 'BULL' | 'BEAR' | 'SIDEWAYS';
}

export interface EnhancedPrediction {
  prediction: number;
  confidence: number;
  expectedValue: number;
  kellyFraction: number;
  recommendedPositionSize: number;
  driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  marketRegime: RegimeDetectionResult;
  volatility: VolatilityRegime;
}


export interface MarketContext {
  economicIndicators: number[];
  sentimentScore: number;
  sectorPerformance: number[];
  marketVolatility: number;
}

export interface PredictionFeatures {
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  bollingerPosition: number;
  atrPercent: number;
}

export interface CandlestickPatterns {
  isDoji: number;
  isHammer: number;
  isInvertedHammer: number;
  isBullishEngulfing: number;
  isBearishEngulfing: number;
  bodyRatio: number;
  candleStrength: number;
}

export interface PriceTrajectory {
  zigzagTrend: number;
  trendConsistency: number;
  isConsolidation: number;
  supportLevel: number;
  resistanceLevel: number;
}

export interface VolumeProfile {
  volumeTrend: number;
  volumeSurge: number;
  priceVolumeCorrelation: number;
}

export interface VolatilityRegimeFeatures {
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  historicalVolatility: number;
  garchVolatility: number;
}

export interface EnhancedPredictionFeatures extends PredictionFeatures {
  candlestickPatterns: CandlestickPatterns;
  priceTrajectory: PriceTrajectory;
  volumeProfile: VolumeProfile;
  volatilityRegime: VolatilityRegimeFeatures;
}

export interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
}
