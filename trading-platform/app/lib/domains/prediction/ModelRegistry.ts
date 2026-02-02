/**
 * Model Registry implementation
 * 
 * Manages multiple prediction models and coordinates their predictions
 */

import { PredictionFeatures } from '../../services/feature-calculation-service';
import { IModel, IModelRegistry, ModelPrediction } from './interfaces';

export class ModelRegistry implements IModelRegistry {
  private models: Map<string, IModel> = new Map();

  /**
   * Register a new model
   */
  register(model: IModel): void {
    this.models.set(model.name, model);
  }

  /**
   * Get all registered models
   */
  getModels(): IModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get predictions from all registered models
   */
  predictAll(features: PredictionFeatures): ModelPrediction[] {
    const predictions: ModelPrediction[] = [];

    for (const model of this.models.values()) {
      predictions.push({
        value: model.predict(features),
        modelName: model.name,
      });
    }

    return predictions;
  }

  /**
   * Get a specific model by name
   */
  getModel(name: string): IModel | undefined {
    return this.models.get(name);
  }

  /**
   * Check if a model is registered
   */
  hasModel(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * Unregister a model
   */
  unregister(name: string): boolean {
    return this.models.delete(name);
  }

  /**
   * Clear all registered models
   */
  clear(): void {
    this.models.clear();
  }
}
