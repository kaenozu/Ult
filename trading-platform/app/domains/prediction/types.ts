/**
 * Prediction Types
 * 
 * 予測ドメインの型定義
 */

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

export interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
}


export interface EnhancedPrediction {
  prediction: number;
  confidence: number;
  expectedValue: number;
  kellyFraction: number;
  recommendedPositionSize: number;
  driftRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  marketRegime: {
    trend: 'BULL' | 'BEAR' | 'SIDEWAYS';
    volatility: 'LOW' | 'NORMAL' | 'HIGH';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INITIAL';
  };
  volatility: 'LOW' | 'NORMAL' | 'HIGH';
}
