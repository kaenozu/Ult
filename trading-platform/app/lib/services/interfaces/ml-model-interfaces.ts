/**
 * ML Model Service Interfaces
 * 
 * This module defines interfaces for dependency injection and testability
 * of the ML Model Service components.
 */

import { PredictionFeatures } from '../feature-engineering-service';
import { ModelPrediction } from '@/app/types';
import { ModelMetrics, ModelTrainingData } from '../tensorflow-model-service';

/**
 * Interface for TensorFlow model
 * Allows mocking and testing without actual TensorFlow dependencies
 */
export interface ITensorFlowModel {
  /**
   * Make a prediction using the model
   * @param features - Array of feature values
   * @returns Predicted value
   */
  predict(features: number[]): Promise<number>;

  /**
   * Train the model with data
   * @param data - Training data with features and labels
   * @param epochs - Number of training epochs
   * @returns Model metrics after training
   */
  train(data: ModelTrainingData, epochs?: number): Promise<ModelMetrics>;

  /**
   * Get current model metrics
   * @returns Model performance metrics
   */
  getMetrics(): ModelMetrics;

  /**
   * Save model to storage
   * @param name - Model name for storage
   */
  saveModel(name: string): Promise<void>;

  /**
   * Load model from storage
   * @param name - Model name to load
   */
  loadModel(name: string): Promise<void>;

  /**
   * Dispose model and free resources
   */
  dispose(): void;
}

/**
 * Interface for prediction calculator
 * Abstracts the core prediction logic for better testability
 */
export interface IPredictionCalculator {
  /**
   * Calculate Random Forest prediction
   * @param features - Prediction features
   * @returns Prediction score
   */
  calculateRandomForest(features: PredictionFeatures): number;

  /**
   * Calculate XGBoost prediction
   * @param features - Prediction features
   * @returns Prediction score
   */
  calculateXGBoost(features: PredictionFeatures): number;

  /**
   * Calculate LSTM prediction
   * @param features - Prediction features
   * @returns Prediction score
   */
  calculateLSTM(features: PredictionFeatures): number;

  /**
   * Calculate ensemble prediction from individual model predictions
   * @param rf - Random Forest prediction
   * @param xgb - XGBoost prediction
   * @param lstm - LSTM prediction
   * @param weights - Model weights
   * @returns Ensemble prediction
   */
  calculateEnsemble(
    rf: number,
    xgb: number,
    lstm: number,
    weights: { RF: number; XGB: number; LSTM: number }
  ): number;

  /**
   * Calculate prediction confidence
   * @param features - Prediction features
   * @param prediction - Ensemble prediction value
   * @returns Confidence score (50-95)
   */
  calculateConfidence(features: PredictionFeatures, prediction: number): number;
}

/**
 * Interface for feature normalization
 * Converts PredictionFeatures to normalized array for TensorFlow models
 */
export interface IFeatureNormalizer {
  /**
   * Convert features to normalized array
   * @param features - Prediction features
   * @returns Normalized feature array
   */
  normalize(features: PredictionFeatures): number[];
}

/**
 * Interface for TensorFlow prediction strategy
 * Encapsulates TensorFlow-based prediction logic
 */
export interface ITensorFlowPredictionStrategy {
  /**
   * Predict using TensorFlow models
   * @param features - Prediction features
   * @returns Model prediction
   */
  predictWithTensorFlow(features: PredictionFeatures): Promise<ModelPrediction>;

  /**
   * Calculate confidence for TensorFlow predictions
   * @param ff - FeedForward prediction
   * @param gru - GRU prediction
   * @param lstm - LSTM prediction
   * @param ensemble - Ensemble prediction
   * @returns Confidence score
   */
  calculateTensorFlowConfidence(
    ff: number,
    gru: number,
    lstm: number,
    ensemble: number
  ): number;

  /**
   * Check if TensorFlow models are available
   * @returns True if models are trained and ready
   */
  isTensorFlowEnabled(): boolean;
}

/**
 * Configuration for ML Model Service
 */
export interface MLModelConfig {
  /** Model weights for ensemble prediction */
  weights?: {
    RF: number;
    XGB: number;
    LSTM: number;
  };

  /** Whether to use TensorFlow models by default */
  useTensorFlowModels?: boolean;

  /** Model names for persistence */
  modelNames?: {
    ff: string;
    gru: string;
    lstm: string;
  };
}
