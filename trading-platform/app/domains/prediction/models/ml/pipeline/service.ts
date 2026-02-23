/**
 * Pipeline Service - Main ModelPipeline Class
 */

import * as tf from '@tensorflow/tfjs';
import { devLog, devError, devWarn } from '@/app/lib/utils/dev-logger';
import { ModelConfig, ModelMetadata, TrainingData, ModelPredictionResult } from '../types';
import {
  validateModelConfig,
  validateTrainingData,
  sanitizeModelId,
  validateInputData,
} from './validation';
import {
  prepareSequences,
  generateCombinations,
  buildConfigFromParams,
} from './preprocessing';
import {
  buildLSTMModel,
  buildTransformerModel,
  compileModel,
  trainModel,
  disposeTensors,
} from './training';
import { PreparedSequences, EvaluationResult, HyperparameterResult } from './types';

export class ModelPipeline {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig | null = null;
  private metadata: ModelMetadata | null = null;
  private featureColumns: string[] = [];

  async trainLSTMModel(
    trainingData: TrainingData,
    config: ModelConfig
  ): Promise<{ model: tf.LayersModel; history: tf.History }> {
    validateModelConfig(config);
    validateTrainingData(trainingData);

    this.config = config;

    const { xTrain, yTrain, xVal, yVal } = prepareSequences(
      trainingData,
      config.sequenceLength,
      config.validationSplit
    );

    const model = buildLSTMModel(config);
    compileModel(model, config.learningRate);

    const history = await trainModel(model, xTrain, yTrain, xVal, yVal, config);

    disposeTensors([xTrain, yTrain, xVal, yVal]);

    this.model = model;
    return { model, history };
  }

  async trainTransformerModel(
    trainingData: TrainingData,
    config: ModelConfig
  ): Promise<{ model: tf.LayersModel; history: tf.History }> {
    validateModelConfig(config);
    validateTrainingData(trainingData);

    this.config = config;

    const { xTrain, yTrain, xVal, yVal } = prepareSequences(
      trainingData,
      config.sequenceLength,
      config.validationSplit
    );

    const model = buildTransformerModel(config);
    compileModel(model, config.learningRate);

    const history = await trainModel(model, xTrain, yTrain, xVal, yVal, config);

    disposeTensors([xTrain, yTrain, xVal, yVal]);

    this.model = model;
    return { model, history };
  }

  async predict(inputData: number[][]): Promise<ModelPredictionResult> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    validateInputData(inputData, this.config);

    const inputTensor = tf.tensor3d([inputData]);
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const predictionValue = (await prediction.data())[0];

    const mcPredictions = await this.monteCarloDropout(inputData, 30);
    const mean = mcPredictions.reduce((a, b) => a + b, 0) / mcPredictions.length;
    const variance =
      mcPredictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
      mcPredictions.length;
    const uncertainty = Math.sqrt(variance);

    const confidence = Math.max(0, Math.min(100, 100 * (1 - uncertainty / Math.abs(mean || 1))));

    const z = 1.96;
    const lower = predictionValue - z * uncertainty;
    const upper = predictionValue + z * uncertainty;

    disposeTensors([inputTensor, prediction]);

    const contributingFeatures = await this.calculateFeatureImportance(inputData, predictionValue);

    return {
      prediction: predictionValue,
      confidence,
      uncertainty,
      predictionInterval: { lower, upper },
      contributingFeatures,
    };
  }

  private async monteCarloDropout(inputData: number[][], iterations: number): Promise<number[]> {
    if (!this.model) return [];

    const predictions: number[] = [];
    const inputTensor = tf.tensor3d([inputData]);

    for (let i = 0; i < iterations; i++) {
      const pred = this.model.predict(inputTensor) as tf.Tensor;
      const value = (await pred.data())[0];
      predictions.push(value);
      pred.dispose();
    }

    inputTensor.dispose();
    return predictions;
  }

  private async calculateFeatureImportance(
    inputData: number[][],
    baselinePrediction: number
  ): Promise<Array<{ feature: string; importance: number }>> {
    if (!this.model || this.featureColumns.length === 0) return [];

    const importances: Array<{ feature: string; importance: number }> = [];
    const baseline = Math.abs(baselinePrediction);

    for (let col = 0; col < this.featureColumns.length; col++) {
      const permutedData = inputData.map(row => [...row]);
      const columnValues = permutedData.map(row => row[col]);

      for (let i = columnValues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [columnValues[i], columnValues[j]] = [columnValues[j], columnValues[i]];
      }

      permutedData.forEach((row, i) => {
        row[col] = columnValues[i];
      });

      const permutedTensor = tf.tensor3d([permutedData]);
      const permutedPred = this.model.predict(permutedTensor) as tf.Tensor;
      const permutedValue = (await permutedPred.data())[0];

      const importance = Math.abs(permutedValue - baselinePrediction) / (baseline || 1);

      importances.push({
        feature: this.featureColumns[col],
        importance: Math.min(100, importance * 100),
      });

      disposeTensors([permutedTensor, permutedPred]);
    }

    return importances.sort((a, b) => b.importance - a.importance).slice(0, 5);
  }

  async saveModel(modelId: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    const sanitizedId = sanitizeModelId(modelId);
    await this.model.save(`indexeddb://${sanitizedId}`);
    devLog(`Model saved with ID: ${sanitizedId}`);
  }

  async loadModel(modelId: string): Promise<void> {
    const sanitizedId = sanitizeModelId(modelId);

    try {
      this.model = await tf.loadLayersModel(`indexeddb://${sanitizedId}`);
      devLog(`Model loaded: ${sanitizedId}`);
    } catch (error) {
      devError('Error loading model:', error);
      throw new Error(`Failed to load model: ${sanitizedId}`);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    const sanitizedId = sanitizeModelId(modelId);
    await tf.io.removeModel(`indexeddb://${sanitizedId}`);
    devLog(`Model deleted: ${sanitizedId}`);
  }

  async listModels(): Promise<string[]> {
    const models = await tf.io.listModels();
    return Object.keys(models).filter(key => key.startsWith('indexeddb://'));
  }

  async evaluate(testData: TrainingData): Promise<EvaluationResult> {
    if (!this.model || !this.config) {
      throw new Error('Model not loaded');
    }

    const { xVal, yVal } = prepareSequences(testData, this.config.sequenceLength, this.config.validationSplit);
    const result = this.model.evaluate(xVal, yVal) as tf.Scalar[];

    const loss = await result[0].data();
    const mae = await result[1].data();
    const mse = await result[2].data();

    disposeTensors([xVal, yVal, ...result]);

    return { loss: loss[0], mae: mae[0], mse: mse[0] };
  }

  async optimizeHyperparameters(
    trainingData: TrainingData,
    paramGrid: Record<string, number[]>
  ): Promise<HyperparameterResult> {
    let bestScore = Infinity;
    let bestParams: Record<string, number> = {};

    const combinations = generateCombinations(paramGrid);

    for (const params of combinations) {
      devLog('Testing params:', params);

      const config = buildConfigFromParams(trainingData, params);

      try {
        const { model, history } = await this.trainLSTMModel(trainingData, config);
        const valLoss = history.history.valLoss[history.history.valLoss.length - 1] as number;

        if (valLoss < bestScore) {
          bestScore = valLoss;
          bestParams = params;
        }

        model.dispose();
      } catch (error) {
        devError('Error during hyperparameter optimization:', error);
      }
    }

    return { bestParams, bestScore };
  }

  getModelSummary(): string {
    if (!this.model) {
      return 'No model loaded';
    }

    let summary = '';
    this.model.summary(undefined, undefined, (line: string) => {
      summary += line + '\n';
    });
    return summary;
  }

  dispose(): void {
    if (this.model) {
      try {
        this.model.dispose();
      } catch (e) {
        devWarn('Model disposal warning:', e);
      }
      this.model = null;
    }
  }
}

export const modelPipeline = new ModelPipeline();
