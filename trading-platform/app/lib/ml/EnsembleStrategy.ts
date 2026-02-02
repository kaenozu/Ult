/**
 * Ensemble Strategy
 * 
 * Combines predictions from multiple ML models (LSTM, Transformer, etc.)
 * using intelligent weighting and meta-learning.
 */

import * as tf from '@tensorflow/tfjs';
import { ModelPipeline } from './ModelPipeline';
import { EnsemblePrediction, TrainingData, ModelConfig, ModelPredictionResult } from './types';

export class EnsembleStrategy {
  private lstmPipeline: ModelPipeline;
  private transformerPipeline: ModelPipeline;
  private weights: { lstm: number; transformer: number; gb: number };
  private performanceHistory: {
    lstm: number[];
    transformer: number[];
    gb: number[];
  };

  constructor() {
    this.lstmPipeline = new ModelPipeline();
    this.transformerPipeline = new ModelPipeline();
    this.weights = { lstm: 0.4, transformer: 0.35, gb: 0.25 };
    this.performanceHistory = { lstm: [], transformer: [], gb: [] };
  }

  /**
   * Train all base models
   */
  async trainAllModels(trainingData: TrainingData): Promise<void> {

    const inputFeatures = this.countFeatures(trainingData.features[0]);

    // LSTM configuration
    const lstmConfig: ModelConfig = {
      modelType: 'LSTM',
      inputFeatures,
      sequenceLength: 20,
      outputSize: 1,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      validationSplit: 0.2,
      lstmUnits: [128, 64, 32],
      dropoutRate: 0.3,
      patience: 10,
      minDelta: 0.0001,
    };

    // Transformer configuration
    const transformerConfig: ModelConfig = {
      modelType: 'Transformer',
      inputFeatures,
      sequenceLength: 20,
      outputSize: 1,
      learningRate: 0.0005,
      batchSize: 32,
      epochs: 100,
      validationSplit: 0.2,
      transformerHeads: 4,
      transformerLayers: 2,
      dropoutRate: 0.3,
      patience: 10,
      minDelta: 0.0001,
    };

    // Train LSTM
    await this.lstmPipeline.trainLSTMModel(trainingData, lstmConfig);
    await this.lstmPipeline.saveModel('lstm-v1');

    // Train Transformer
    await this.transformerPipeline.trainTransformerModel(trainingData, transformerConfig);
    await this.transformerPipeline.saveModel('transformer-v1');

  }

  /**
   * Load pre-trained models
   */
  async loadModels(): Promise<void> {
    try {
      await this.lstmPipeline.loadModel('lstm-v1');
      await this.transformerPipeline.loadModel('transformer-v1');
    } catch (error) {
      console.error('Error loading models:', error);
      throw new Error('Failed to load ensemble models');
    }
  }

  /**
   * Make ensemble prediction
   */
  async predictEnsemble(inputData: number[][]): Promise<EnsemblePrediction> {
    // Get predictions from each model
    const lstmResult = await this.lstmPipeline.predict(inputData);
    const transformerResult = await this.transformerPipeline.predict(inputData);
    const gbResult = this.gradientBoostingPredict(inputData);

    // Dynamic weight adjustment based on recent performance
    const dynamicWeights = this.calculateDynamicWeights();

    // Weighted ensemble
    const ensemblePrediction =
      lstmResult.prediction * dynamicWeights.lstm +
      transformerResult.prediction * dynamicWeights.transformer +
      gbResult.prediction * dynamicWeights.gb;

    // Weighted confidence
    const ensembleConfidence =
      lstmResult.confidence * dynamicWeights.lstm +
      transformerResult.confidence * dynamicWeights.transformer +
      gbResult.confidence * dynamicWeights.gb;

    return {
      lstmPrediction: lstmResult,
      transformerPrediction: transformerResult,
      gbPrediction: gbResult,
      ensembleResult: {
        prediction: ensemblePrediction,
        confidence: ensembleConfidence,
        weights: dynamicWeights,
      },
    };
  }

  /**
   * Simple Gradient Boosting prediction (rule-based fallback)
   */
  private gradientBoostingPredict(inputData: number[][]): ModelPredictionResult {
    // Simplified GB using the last sequence features
    const lastFeatures = inputData[inputData.length - 1];
    
    // Extract key features (assuming specific indices)
    const rsi = lastFeatures[0] || 50;
    const momentum = lastFeatures[5] || 0;
    const volatility = lastFeatures[10] || 0;
    
    // Simple decision tree ensemble
    let prediction = 0;
    
    // Tree 1: RSI-based
    if (rsi < 30) {
      prediction += 2;
    } else if (rsi > 70) {
      prediction -= 2;
    }
    
    // Tree 2: Momentum-based
    if (momentum > 0) {
      prediction += momentum * 0.5;
    } else {
      prediction += momentum * 0.5;
    }
    
    // Tree 3: Volatility adjustment
    const volAdjustment = Math.max(0.5, 1 - volatility / 50);
    prediction *= volAdjustment;
    
    // Calculate confidence based on signal strength
    const confidence = Math.min(95, Math.max(50, 60 + Math.abs(prediction) * 5));
    
    return {
      prediction,
      confidence,
      uncertainty: (100 - confidence) / 100,
      predictionInterval: {
        lower: prediction - 2,
        upper: prediction + 2,
      },
      contributingFeatures: [],
    };
  }

  /**
   * Calculate dynamic weights based on recent performance
   */
  private calculateDynamicWeights(): { lstm: number; transformer: number; gb: number } {
    if (
      this.performanceHistory.lstm.length === 0 ||
      this.performanceHistory.transformer.length === 0 ||
      this.performanceHistory.gb.length === 0
    ) {
      // Use default weights if no history
      return this.weights;
    }

    // Calculate average performance (inverse of error)
    const lstmPerf = this.calculateAveragePerformance(this.performanceHistory.lstm);
    const transformerPerf = this.calculateAveragePerformance(this.performanceHistory.transformer);
    const gbPerf = this.calculateAveragePerformance(this.performanceHistory.gb);

    // Normalize to sum to 1
    const total = lstmPerf + transformerPerf + gbPerf;
    
    if (total === 0) {
      return this.weights;
    }

    return {
      lstm: lstmPerf / total,
      transformer: transformerPerf / total,
      gb: gbPerf / total,
    };
  }

  /**
   * Calculate average performance from history
   */
  private calculateAveragePerformance(history: number[]): number {
    if (history.length === 0) return 0;
    
    // Use recent history (last 50 predictions)
    const recentHistory = history.slice(-50);
    const sum = recentHistory.reduce((a, b) => a + b, 0);
    const avg = sum / recentHistory.length;
    
    // Convert error to performance (inverse)
    return 1 / (1 + avg);
  }

  /**
   * Update performance history with actual results
   */
  updatePerformance(
    predicted: EnsemblePrediction,
    actual: number
  ): void {
    const lstmError = Math.abs(predicted.lstmPrediction.prediction - actual);
    const transformerError = Math.abs(predicted.transformerPrediction.prediction - actual);
    const gbError = Math.abs(predicted.gbPrediction.prediction - actual);

    this.performanceHistory.lstm.push(lstmError);
    this.performanceHistory.transformer.push(transformerError);
    this.performanceHistory.gb.push(gbError);

    // Keep only last 100 predictions
    if (this.performanceHistory.lstm.length > 100) {
      this.performanceHistory.lstm.shift();
      this.performanceHistory.transformer.shift();
      this.performanceHistory.gb.shift();
    }

    // Update weights based on new performance
    this.weights = this.calculateDynamicWeights();
  }

  /**
   * Perform stacking with meta-learner
   */
  async trainMetaLearner(
    baseModelPredictions: number[][],
    actualValues: number[]
  ): Promise<tf.LayersModel> {
    // Base model predictions as features for meta-learner
    const xData = tf.tensor2d(baseModelPredictions);
    const yData = tf.tensor2d(actualValues.map(v => [v]));

    // Simple meta-learner (linear regression)
    const metaModel = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 8,
          activation: 'relu',
          inputShape: [baseModelPredictions[0].length],
        }),
        tf.layers.dense({ units: 1 }),
      ],
    });

    metaModel.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    await metaModel.fit(xData, yData, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 0,
    });

    xData.dispose();
    yData.dispose();

    return metaModel;
  }

  /**
   * Get feature importance across all models
   */
  async getFeatureImportance(): Promise<Record<string, number>> {
    // This would require implementing SHAP or similar
    // For now, return placeholder
    return {
      rsi: 0.15,
      momentum: 0.12,
      volume: 0.10,
      volatility: 0.08,
      sma: 0.07,
      // ... more features
    };
  }

  /**
   * Perform Walk-Forward validation
   */
  async walkForwardValidation(
    data: TrainingData,
    windowSize: number,
    stepSize: number
  ): Promise<{
    predictions: number[];
    actuals: number[];
    metrics: { mae: number; rmse: number; directionAccuracy: number };
  }> {
    const predictions: number[] = [];
    const actuals: number[] = [];

    let startIdx = 0;
    while (startIdx + windowSize < data.features.length) {
      const endIdx = startIdx + windowSize;
      const testIdx = endIdx;

      if (testIdx >= data.features.length) break;

      // Train on window
      const trainData: TrainingData = {
        features: data.features.slice(startIdx, endIdx),
        labels: data.labels.slice(startIdx, endIdx),
        dates: data.dates.slice(startIdx, endIdx),
      };

      // Retrain models (simplified - in production, use cached models)
      await this.trainAllModels(trainData);

      // Predict on next point
      const testFeatures = this.prepareSequence(
        data.features.slice(Math.max(0, testIdx - 20), testIdx),
        20
      );
      
      const prediction = await this.predictEnsemble(testFeatures);
      predictions.push(prediction.ensembleResult.prediction);
      actuals.push(data.labels[testIdx]);

      startIdx += stepSize;
    }

    // Calculate metrics
    const mae = predictions.reduce((sum, pred, i) => sum + Math.abs(pred - actuals[i]), 0) / predictions.length;
    const mse = predictions.reduce((sum, pred, i) => sum + Math.pow(pred - actuals[i], 2), 0) / predictions.length;
    const rmse = Math.sqrt(mse);
    
    // Direction accuracy
    let correctDirections = 0;
    for (let i = 1; i < predictions.length; i++) {
      const predDirection = predictions[i] > predictions[i - 1] ? 1 : -1;
      const actualDirection = actuals[i] > actuals[i - 1] ? 1 : -1;
      if (predDirection === actualDirection) correctDirections++;
    }
    const directionAccuracy = correctDirections / (predictions.length - 1);

    return {
      predictions,
      actuals,
      metrics: { mae, rmse, directionAccuracy },
    };
  }

  /**
   * Prepare sequence from features
   */
  private prepareSequence(features: unknown[], sequenceLength: number): number[][] {
    const result: number[][] = [];
    
    for (let i = Math.max(0, features.length - sequenceLength); i < features.length; i++) {
      const featureArray = this.featuresToArray(features[i]);
      result.push(featureArray);
    }
    
    // Pad if necessary
    while (result.length < sequenceLength) {
      result.unshift(new Array(result[0]?.length || 50).fill(0));
    }
    
    return result;
  }

  /**
   * Convert feature object to array
   */
  private featuresToArray(feature: unknown): number[] {
    const featureObj = feature as Record<string, unknown>;
    const result: number[] = [];
    
    for (const key in featureObj) {
      const value = featureObj[key];
      if (typeof value === 'number') {
        result.push(value);
      } else if (Array.isArray(value)) {
        result.push(...value.filter(v => typeof v === 'number'));
      }
    }
    
    return result;
  }

  /**
   * Count features in feature object
   */
  private countFeatures(feature: unknown): number {
    return this.featuresToArray(feature).length;
  }

  /**
   * Dispose all models
   */
  dispose(): void {
    this.lstmPipeline.dispose();
    this.transformerPipeline.dispose();
  }
}

export const ensembleStrategy = new EnsembleStrategy();
