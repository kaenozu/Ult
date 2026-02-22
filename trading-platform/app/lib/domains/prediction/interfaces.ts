/**
 * Core interfaces for the prediction domain
 */

import { PredictionFeatures } from '../../../lib/services/feature-engineering-service';

/**
 * Individual model prediction result
 */
export interface ModelPrediction {
  value: number;
  modelName: string;
}

/**
 * Base interface for all prediction models
 */
export interface IModel {
  /**
   * Model name for identification
   */
  readonly name: string;

  /**
   * Predict based on features
   */
  predict(features: PredictionFeatures): number;
}

/**
 * Registry for managing multiple models
 */
export interface IModelRegistry {
  /**
   * Register a new model
   */
  register(model: IModel): void;

  /**
   * Get all registered models
   */
  getModels(): IModel[];

  /**
   * Get predictions from all models
   */
  predictAll(features: PredictionFeatures): ModelPrediction[];
}

/**
 * Strategy for combining multiple predictions
 */
export interface IEnsembleStrategy {
  /**
   * Combine multiple model predictions into a single prediction
   */
  combine(predictions: ModelPrediction[]): number;

  /**
   * Get the strategy name
   */
  readonly strategyName: string;
}

/**
 * Evaluator for calculating prediction confidence
 */
export interface IConfidenceEvaluator {
  /**
   * Evaluate confidence of a prediction
   */
  evaluate(features: PredictionFeatures, prediction: number, modelPredictions: ModelPrediction[]): number;
}
