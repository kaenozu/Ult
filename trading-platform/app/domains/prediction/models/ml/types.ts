/**
 * ML Model Pipeline Types
 * 
 * Type definitions for the machine learning model pipeline,
 * feature engineering, and model management.
 */

import { OHLCV } from '@/app/types';

/**
 * Enhanced feature set for ML prediction
 * 60+ technical and market structure features
 */
export interface MLFeatures {
  // Price-based features
  close: number;
  open: number;
  high: number;
  low: number;
  
  // Technical indicators (existing)
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  macdHistogram: number;
  bollingerPosition: number;
  atrPercent: number;
  
  // Advanced technical indicators (new)
  stochasticK: number;
  stochasticD: number;
  williamsR: number;
  adx: number;
  cci: number;
  roc: number;
  obv: number;
  vwap: number;
  
  // Market microstructure features
  bidAskSpread?: number;
  orderImbalance?: number;
  volumeProfile: number[];
  priceLevel: number;
  
  // Momentum features
  momentum5: number;
  momentum10: number;
  momentum20: number;
  
  // Volatility features
  historicalVolatility: number;
  parkinsonVolatility: number;
  garmanKlassVolatility: number;
  
  // Trend features
  adxTrend: number;
  aroonUp: number;
  aroonDown: number;
  
  // Volume features
  volumeSMA: number;
  volumeStd: number;
  volumeTrend: number;
  
  // Price patterns
  candlePattern: number;
  supportLevel: number;
  resistanceLevel: number;
  
  // Macro correlation
  marketCorrelation: number;
  sectorCorrelation: number;
  
  // Time-based features
  dayOfWeek: number;
  weekOfMonth: number;
  monthOfYear: number;
  
  // Normalized timestamp (0-1 for sequence models)
  timestamp: number;
}

/**
 * Model training configuration
 */
export interface ModelConfig {
  modelType: 'LSTM' | 'Transformer' | 'GradientBoosting' | 'Ensemble';
  inputFeatures: number;
  sequenceLength: number;
  outputSize: number;
  
  // Training hyperparameters
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
  
  // Architecture-specific
  lstmUnits?: number[];
  transformerHeads?: number;
  transformerLayers?: number;
  dropoutRate?: number;
  
  // Regularization
  l1Regularization?: number;
  l2Regularization?: number;
  
  // Early stopping
  patience?: number;
  minDelta?: number;
}

/**
 * Trained model metadata
 */
export interface ModelMetadata {
  id: string;
  version: string;
  modelType: string;
  trainedAt: Date;
  trainingMetrics: {
    loss: number;
    valLoss: number;
    accuracy: number;
    valAccuracy: number;
    mse: number;
    mae: number;
  };
  config: ModelConfig;
  features: string[];
  performanceStats: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgReturn: number;
  };
}

/**
 * Model prediction with uncertainty
 */
export interface ModelPredictionResult {
  prediction: number;
  confidence: number;
  uncertainty: number;
  predictionInterval: {
    lower: number;
    upper: number;
  };
  contributingFeatures: {
    feature: string;
    importance: number;
  }[];
}

/**
 * Ensemble prediction combining multiple models
 */
export interface EnsemblePrediction {
  lstmPrediction: ModelPredictionResult;
  transformerPrediction: ModelPredictionResult;
  gbPrediction: ModelPredictionResult;
  ensembleResult: {
    prediction: number;
    confidence: number;
    weights: {
      lstm: number;
      transformer: number;
      gb: number;
    };
  };
}

/**
 * Model performance tracking
 */
export interface ModelPerformance {
  modelId: string;
  predictions: {
    timestamp: Date;
    predicted: number;
    actual: number;
    error: number;
  }[];
  
  metrics: {
    mae: number;
    mse: number;
    rmse: number;
    mape: number;
    r2Score: number;
    directionAccuracy: number;
  };
  
  driftDetection: {
    isDrifting: boolean;
    driftScore: number;
    lastChecked: Date;
  };
}

/**
 * Feature importance result
 */
export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

/**
 * Walk-forward validation result
 */
export interface WalkForwardResult {
  windowId: number;
  trainStartDate: Date;
  trainEndDate: Date;
  testStartDate: Date;
  testEndDate: Date;
  
  trainMetrics: {
    loss: number;
    accuracy: number;
  };
  
  testMetrics: {
    returns: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  
  predictions: {
    date: Date;
    predicted: number;
    actual: number;
  }[];
}

/**
 * Hyperparameter optimization result
 */
export interface HyperparameterResult {
  params: Record<string, number | string>;
  score: number;
  metrics: {
    trainScore: number;
    valScore: number;
    testScore: number;
  };
}

/**
 * Training data with features and labels
 */
export interface TrainingData {
  features: MLFeatures[];
  labels: number[];
  dates: Date[];
  split?: {
    trainIndices: number[];
    valIndices: number[];
    testIndices: number[];
  };
}

/**
 * Model storage interface
 */
export interface ModelStorage {
  saveModel(model: unknown, metadata: ModelMetadata): Promise<string>;
  loadModel(modelId: string): Promise<{ model: unknown; metadata: ModelMetadata }>;
  listModels(): Promise<ModelMetadata[]>;
  deleteModel(modelId: string): Promise<void>;
}

/**
 * Backtesting configuration for ML models
 */
export interface MLBacktestConfig {
  initialCapital: number;
  commission: number;
  slippage: number;
  positionSizing: 'fixed' | 'kelly' | 'volatility';
  riskPerTrade: number;
  maxPositions: number;
  
  // Walk-forward settings
  walkForwardWindow: number; // days
  retrainFrequency: number; // days
  minTrainingSamples: number;
}

/**
 * Real-time prediction request
 */
export interface PredictionRequest {
  symbol: string;
  ohlcvData: OHLCV[];
  indexData?: OHLCV[];
  features?: Partial<MLFeatures>;
}

/**
 * Model A/B test configuration
 */
export interface ABTestConfig {
  name: string;
  modelA: string; // model ID
  modelB: string; // model ID
  trafficSplit: number; // 0-1, percentage to model A
  startDate: Date;
  endDate?: Date;
  metrics: string[];
}

/**
 * A/B test result
 */
export interface ABTestResult {
  config: ABTestConfig;
  modelAMetrics: Record<string, number>;
  modelBMetrics: Record<string, number>;
  winner?: 'A' | 'B' | 'TIE';
  confidence: number;
  endDate: Date;
}
