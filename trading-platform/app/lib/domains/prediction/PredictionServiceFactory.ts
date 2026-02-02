/**
 * Factory for creating prediction service instances
 * 
 * Provides convenient methods for creating fully configured prediction services
 */

import { PredictionService } from './PredictionService';
import { ModelRegistry } from './ModelRegistry';
import { RandomForestModel } from './RandomForestModel';
import { XGBoostModel } from './XGBoostModel';
import { LSTMModel } from './LSTMModel';
import { WeightedAverageStrategy, ModelWeights } from './WeightedAverageStrategy';
import { ConfidenceEvaluator } from './ConfidenceEvaluator';
import { IModel } from './interfaces';

export class PredictionServiceFactory {
  /**
   * Create a default prediction service with standard models and weights
   */
  static createDefault(): PredictionService {
    const modelRegistry = new ModelRegistry();
    
    // Register default models
    modelRegistry.register(new RandomForestModel());
    modelRegistry.register(new XGBoostModel());
    modelRegistry.register(new LSTMModel());

    // Default weights matching original implementation
    const ensembleStrategy = new WeightedAverageStrategy({
      'RandomForest': 0.35,
      'XGBoost': 0.35,
      'LSTM': 0.30,
    });

    const confidenceEvaluator = new ConfidenceEvaluator();

    return new PredictionService(
      modelRegistry,
      ensembleStrategy,
      confidenceEvaluator
    );
  }

  /**
   * Create a prediction service with custom weights
   */
  static createWithWeights(weights: ModelWeights): PredictionService {
    const modelRegistry = new ModelRegistry();
    
    // Register default models
    modelRegistry.register(new RandomForestModel());
    modelRegistry.register(new XGBoostModel());
    modelRegistry.register(new LSTMModel());

    const ensembleStrategy = new WeightedAverageStrategy(weights);
    const confidenceEvaluator = new ConfidenceEvaluator();

    return new PredictionService(
      modelRegistry,
      ensembleStrategy,
      confidenceEvaluator
    );
  }

  /**
   * Create a prediction service with custom models
   */
  static createWithModels(models: IModel[], weights?: ModelWeights): PredictionService {
    const modelRegistry = new ModelRegistry();
    
    // Register provided models
    for (const model of models) {
      modelRegistry.register(model);
    }

    // Use provided weights or create default ones
    const modelWeights: ModelWeights = weights ?? {};
    if (!weights) {
      const defaultWeight = 1.0 / models.length;
      for (const model of models) {
        modelWeights[model.name] = defaultWeight;
      }
    }

    const ensembleStrategy = new WeightedAverageStrategy(modelWeights);
    const confidenceEvaluator = new ConfidenceEvaluator();

    return new PredictionService(
      modelRegistry,
      ensembleStrategy,
      confidenceEvaluator
    );
  }
}
