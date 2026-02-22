/**
 * Prediction Service - Main orchestrator
 * 
 * Coordinates prediction workflow using dependency injection
 */

import { PredictionFeatures } from '../../../lib/services/feature-engineering-service';
import { ModelPrediction as LegacyModelPrediction } from '../../../types';
import {
  IModelRegistry,
  IEnsembleStrategy,
  IConfidenceEvaluator,
} from './interfaces';

export class PredictionService {
  /**
   * Create a new prediction service with injected dependencies
   */
  constructor(
    private modelRegistry: IModelRegistry,
    private ensembleStrategy: IEnsembleStrategy,
    private confidenceEvaluator: IConfidenceEvaluator
  ) {}

  /**
   * Generate prediction from all registered models
   */
  predict(features: PredictionFeatures): LegacyModelPrediction {
    // Get predictions from all models
    const modelPredictions = this.modelRegistry.predictAll(features);

    // Combine predictions using ensemble strategy
    const ensemblePrediction = this.ensembleStrategy.combine(modelPredictions);

    // Evaluate confidence
    const confidence = this.confidenceEvaluator.evaluate(
      features,
      ensemblePrediction,
      modelPredictions
    );

    // Map to legacy format for backward compatibility
    const rfPrediction = modelPredictions.find(p => p.modelName === 'RandomForest')?.value ?? 0;
    const xgbPrediction = modelPredictions.find(p => p.modelName === 'XGBoost')?.value ?? 0;
    const lstmPrediction = modelPredictions.find(p => p.modelName === 'LSTM')?.value ?? 0;

    return {
      rfPrediction,
      xgbPrediction,
      lstmPrediction,
      ensemblePrediction,
      confidence,
    };
  }

  /**
   * Get the model registry (for advanced usage)
   */
  getModelRegistry(): IModelRegistry {
    return this.modelRegistry;
  }

  /**
   * Get the ensemble strategy (for configuration)
   */
  getEnsembleStrategy(): IEnsembleStrategy {
    return this.ensembleStrategy;
  }

  /**
   * Get the confidence evaluator (for configuration)
   */
  getConfidenceEvaluator(): IConfidenceEvaluator {
    return this.confidenceEvaluator;
  }
}
