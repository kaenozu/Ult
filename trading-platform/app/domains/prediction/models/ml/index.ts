/**
 * ML (Machine Learning) Module Index
 *
 * 機械学習関連の機能を統合的にエクスポートします。
 */

// Feature Engineering
export {
  featureEngineering,
  FeatureEngineering,
  featureEngineering as featureEngineeringService, // Alias for compatibility
} from './FeatureEngineering';

export type {
  TechnicalFeatures,
  MacroEconomicFeatures,
  SentimentFeatures,
  TimeSeriesFeatures,
  AllFeatures,
} from './FeatureEngineering';

// Ensemble Model
export {
  ensembleModel,
  EnsembleModel,
  EnsembleModel as ensembleStrategy, // Alias for compatibility
} from './EnsembleModel';

export type {
  ModelType,
  ModelPerformance,
  ModelPrediction as EnsembleModelPrediction,
  EnsemblePrediction,
  MarketRegime,
} from './EnsembleModel';

// Model Drift Detector
export {
  modelDriftDetector,
  ModelDriftDetector,
} from './ModelDriftDetector';

export type {
  PredictionRecord,
  DriftDetectionResult,
  ModelMetrics,
  PerformanceHistory,
} from './ModelDriftDetector';

// Prediction Quality Monitor
export {
  predictionQualityMonitor,
  PredictionQualityMonitor,
} from './PredictionQualityMonitor';

export type {
  PredictionRecord as QualityPredictionRecord, // Avoid conflict with ModelDriftDetector's PredictionRecord
} from './PredictionQualityMonitor';

// ML Service (Integration)
export {
  mlService,
  MLService,
} from './MLService';

export type {
  MLPredictionResult,
  RetrainingRecommendation,
} from './MLService';
