/**
 * ML (Machine Learning) Module Index
 *
 * 機械学習関連の機能を統合的にエクスポートします。
 */

// Feature Engineering
export {
  featureEngineering,
  FeatureEngineering,
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
  PredictionRecord,
  DriftDetectionResult,
  ModelMetrics,
  PerformanceHistory,
} from './ModelDriftDetector';

// ML Service (Integration)
export {
  mlService,
  MLService,
  MLPredictionResult,
  RetrainingRecommendation,
} from './MLService';

// Re-export types using 'export type' for isolatedModules compatibility
export type {
  TechnicalFeatures,
  MacroEconomicFeatures,
  SentimentFeatures,
  TimeSeriesFeatures,
  AllFeatures,
  ModelType,
  ModelPerformance,
  EnsembleModelPrediction,
  EnsemblePrediction,
  MarketRegime,
  PredictionRecord,
  DriftDetectionResult,
  ModelMetrics,
  PerformanceHistory,
  MLPredictionResult,
  RetrainingRecommendation,
} from './FeatureEngineering' or './EnsembleModel' or './ModelDriftDetector' or './MLService';
