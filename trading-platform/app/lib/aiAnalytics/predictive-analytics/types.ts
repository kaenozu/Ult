/**
 * PredictiveAnalytics Types
 * 
 * 予測分析エンジンの型定義
 */

export interface TechnicalFeatures {
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  sma200?: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  bollingerPosition: number;
  atrPercent: number;
  ema12: number;
  ema26: number;
  williamsR: number;
  stochasticK: number;
  stochasticD: number;
  adx: number;
  obv: number;
  mfi: number;
  cci: number;
}

export interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  expectedReturn: number;
  volatilityForecast: number;
}

export interface PredictionResult {
  symbol: string;
  timestamp: number;
  prediction: ModelPrediction;
  features: TechnicalFeatures;
  signal: TradingSignal;
  forecast: PriceForecast;
}

export interface TradingSignal {
  type: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: 'short' | 'medium' | 'long';
  rationale: string[];
}

export interface PriceForecast {
  currentPrice: number;
  predictions: {
    timeframe: string;
    price: number;
    confidenceInterval: [number, number];
    probability: number;
  }[];
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number;
}

export interface PositionSizingInput {
  accountEquity: number;
  riskPerTrade: number;
  entryPrice: number;
  stopLossPrice: number;
  confidence?: number;
  minShares?: number;
  maxPositionPercent?: number;
}

export interface PositionSizingResult {
  recommendedShares: number;
  maxLossAmount: number;
  riskAmount: number;
  positionValue: number;
  riskPercent: number;
  stopLossDistance: number;
  stopLossPercent: number;
  reasoning: string[];
}

export interface ModelConfig {
  randomForest: {
    nEstimators: number;
    maxDepth: number;
    minSamplesSplit: number;
    featureImportance: boolean;
  };
  xgboost: {
    maxDepth: number;
    learningRate: number;
    nEstimators: number;
    subsample: number;
    colsampleByTree: number;
  };
  lstm: {
    sequenceLength: number;
    hiddenUnits: number;
    dropout: number;
    epochs: number;
    batchSize: number;
  };
  ensemble: {
    weights: {
      rf: number;
      xgb: number;
      lstm: number;
    };
    confidenceThreshold: number;
  };
}
