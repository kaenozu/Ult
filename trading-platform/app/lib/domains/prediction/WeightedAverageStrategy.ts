/**
 * Weighted Average Ensemble Strategy
 * 
 * Combines multiple model predictions using configurable weights
 */

import { IEnsembleStrategy, ModelPrediction } from './interfaces';

export interface ModelWeights {
  [modelName: string]: number;
}

export class WeightedAverageStrategy implements IEnsembleStrategy {
  readonly strategyName = 'WeightedAverage';

  /**
   * Model weights for ensemble
   * Default weights: RF: 0.35, XGBoost: 0.35, LSTM: 0.30
   */
  constructor(private weights: ModelWeights = {
    'RandomForest': 0.35,
    'XGBoost': 0.35,
    'LSTM': 0.30,
  }) {
    this.validateWeights();
  }

  /**
   * Combine predictions using weighted average
   */
  combine(predictions: ModelPrediction[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const prediction of predictions) {
      const weight = this.weights[prediction.modelName] ?? 0;
      weightedSum += prediction.value * weight;
      totalWeight += weight;
    }

    // Fallback to simple average if no weights match
    if (totalWeight === 0) {
      return predictions.reduce((sum, p) => sum + p.value, 0) / predictions.length;
    }

    return weightedSum / totalWeight;
  }

  /**
   * Update weights for a specific model
   */
  setWeight(modelName: string, weight: number): void {
    if (weight < 0 || weight > 1) {
      throw new Error(`Weight must be between 0 and 1, got ${weight}`);
    }
    this.weights[modelName] = weight;
  }

  /**
   * Get current weights
   */
  getWeights(): ModelWeights {
    return { ...this.weights };
  }

  /**
   * Validate that weights are reasonable
   */
  private validateWeights(): void {
    for (const [model, weight] of Object.entries(this.weights)) {
      if (weight < 0 || weight > 1) {
        throw new Error(`Invalid weight for ${model}: ${weight}. Must be between 0 and 1.`);
      }
    }
  }
}
