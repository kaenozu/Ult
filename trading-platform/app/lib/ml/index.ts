/**
 * ML (Machine Learning) Module Index
 *
 * 機械学習関連の機能を統合的にエクスポートします。
 */

// Feature Engineering
export { featureEngineeringService as featureEngineering, FeatureEngineeringService as FeatureEngineering } from '../services/feature-engineering-service';
export type {
  TechnicalFeatures,
  MacroEconomicFeatures,
  SentimentFeatures,
  TimeSeriesFeatures,
  AllFeatures,
} from '../services/feature-engineering-service';

// Ensemble Model
export { ensembleModel, EnsembleModel } from './EnsembleModel';
export type {
  ModelType,
  ModelPerformance,
  ModelPrediction as EnsembleModelPrediction,
  EnsemblePrediction,
  MarketRegime,
} from './EnsembleModel';

// Model Drift Detector
export { modelDriftDetector, ModelDriftDetector } from './ModelDriftDetector';
export type {
  PredictionRecord,
  DriftDetectionResult,
  ModelMetrics,
  PerformanceHistory,
} from './ModelDriftDetector';

// ML Service (Integration)
export { mlService, MLService } from './MLService';
export type { MLPredictionResult, RetrainingRecommendation } from './MLService';
