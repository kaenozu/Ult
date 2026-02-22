/**
 * TensorFlow Prediction Strategy Implementation
 * 
 * Encapsulates TensorFlow-based prediction logic with dependency injection
 */

import { PredictionFeatures } from '../feature-engineering-service';
import { ModelPrediction } from '@/app/types';
import {
  ITensorFlowModel,
  ITensorFlowPredictionStrategy,
  IFeatureNormalizer,
  MLModelConfig
} from '../interfaces/ml-model-interfaces';

/**
 * Default TensorFlow prediction strategy
 * Coordinates multiple TensorFlow models for ensemble predictions
 */
import { logger } from '@/app/core/logger';
export class TensorFlowPredictionStrategy implements ITensorFlowPredictionStrategy {
  private useTensorFlowModels = false;

  constructor(
    private ffModel: ITensorFlowModel | null,
    private gruModel: ITensorFlowModel | null,
    private lstmModel: ITensorFlowModel | null,
    private featureNormalizer: IFeatureNormalizer,
    private config: MLModelConfig
  ) {
    this.useTensorFlowModels = config.useTensorFlowModels ?? false;
  }

  /**
   * Enable or disable TensorFlow models
   */
  setTensorFlowEnabled(enabled: boolean): void {
    this.useTensorFlowModels = enabled;
  }

  /**
   * Set model instances
   */
  setModels(
    ffModel: ITensorFlowModel | null,
    gruModel: ITensorFlowModel | null,
    lstmModel: ITensorFlowModel | null
  ): void {
    this.ffModel = ffModel;
    this.gruModel = gruModel;
    this.lstmModel = lstmModel;
  }

  /**
   * Check if TensorFlow models are ready
   */
  isTensorFlowEnabled(): boolean {
    return this.useTensorFlowModels && 
           this.ffModel !== null && 
           this.gruModel !== null && 
           this.lstmModel !== null;
  }

  /**
   * Predict using TensorFlow models
   */
  async predictWithTensorFlow(features: PredictionFeatures): Promise<ModelPrediction> {
    if (!this.isTensorFlowEnabled()) {
      throw new Error('TensorFlow models not available');
    }

    const featureArray = this.featureNormalizer.normalize(features);
    const weights = this.config.weights ?? { RF: 0.35, XGB: 0.35, LSTM: 0.30 };

    try {
      // Get predictions from all models
      const [ffPrediction, gruPrediction, lstmPrediction] = await Promise.all([
        this.ffModel!.predict(featureArray),
        this.gruModel!.predict(featureArray),
        this.lstmModel!.predict(featureArray)
      ]);

      // Calculate ensemble prediction
      const ensemblePrediction = 
        ffPrediction * weights.RF + 
        gruPrediction * weights.XGB + 
        lstmPrediction * weights.LSTM;

      // Calculate confidence
      const confidence = this.calculateTensorFlowConfidence(
        ffPrediction,
        gruPrediction,
        lstmPrediction,
        ensemblePrediction
      );

      return {
        rfPrediction: ffPrediction,
        xgbPrediction: gruPrediction,
        lstmPrediction: lstmPrediction,
        ensemblePrediction,
        confidence
      };
    } catch (error) {
      // Log error but don't expose implementation details
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        logger.error('TensorFlow prediction error:', error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Calculate confidence for TensorFlow predictions
   * Based on model agreement and individual model metrics
   */
  calculateTensorFlowConfidence(
    ff: number,
    gru: number,
    lstm: number,
    _ensemble: number
  ): number {
    // Calculate agreement between models
    const predictions = [ff, gru, lstm];
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce(
      (sum, pred) => sum + Math.pow(pred - mean, 2), 
      0
    ) / predictions.length;
    const stdDev = Math.sqrt(variance);

    // Low variance = high agreement = high confidence
    const agreementScore = Math.max(0, 1 - stdDev / Math.abs(mean || 1));

    // Get model metrics if available
    let avgAccuracy = 70; // Default assumption
    if (this.ffModel && this.gruModel && this.lstmModel) {
      const ffMetrics = this.ffModel.getMetrics();
      const gruMetrics = this.gruModel.getMetrics();
      const lstmMetrics = this.lstmModel.getMetrics();
      avgAccuracy = (ffMetrics.accuracy + gruMetrics.accuracy + lstmMetrics.accuracy) / 3;
    }

    // Combine agreement and accuracy
    const baseConfidence = 50;
    const agreementBonus = agreementScore * 25;
    const accuracyBonus = (avgAccuracy / 100) * 25;

    const confidence = baseConfidence + agreementBonus + accuracyBonus;

    return Math.min(Math.max(confidence, 50), 95);
  }
}
