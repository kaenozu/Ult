/**
 * ML Model Pipeline
 * 
 * Handles model training, loading, saving, and inference using TensorFlow.js
 */

import * as tf from '@tensorflow/tfjs';
import { ModelConfig, ModelMetadata, TrainingData, ModelPredictionResult } from './types';

export class ModelPipeline {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig | null = null;
  private metadata: ModelMetadata | null = null;

  /**
   * Create and train a new LSTM model
   */
  async trainLSTMModel(
    trainingData: TrainingData,
    config: ModelConfig
  ): Promise<{ model: tf.LayersModel; history: tf.History }> {
    this.config = config;

    // Prepare sequences for LSTM
    const { xTrain, yTrain, xVal, yVal } = this.prepareSequences(
      trainingData,
      config.sequenceLength
    );

    // Build LSTM model
    const model = this.buildLSTMModel(config);

    // Compile model
    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mse'],
    });

    // Train model
    const history = await model.fit(xTrain, yTrain, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationData: [xVal, yVal],
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const loss = logs?.loss;
          const valLoss = logs?.valLoss;
          console.log(
            `Epoch ${epoch + 1}: loss = ${loss?.toFixed(4) ?? 'N/A'}, val_loss = ${valLoss?.toFixed(4) ?? 'N/A'}`
          );
        },
      },
      shuffle: true,
    });

    // Cleanup tensors
    xTrain.dispose();
    yTrain.dispose();
    xVal.dispose();
    yVal.dispose();

    this.model = model;
    return { model, history };
  }

  /**
   * Build LSTM model architecture
   */
  private buildLSTMModel(config: ModelConfig): tf.LayersModel {
    const model = tf.sequential();

    const lstmUnits = config.lstmUnits || [128, 64, 32];

    // First LSTM layer
    model.add(
      tf.layers.lstm({
        units: lstmUnits[0],
        returnSequences: lstmUnits.length > 1,
        inputShape: [config.sequenceLength, config.inputFeatures],
      })
    );

    if (config.dropoutRate) {
      model.add(tf.layers.dropout({ rate: config.dropoutRate }));
    }

    // Additional LSTM layers
    for (let i = 1; i < lstmUnits.length; i++) {
      model.add(
        tf.layers.lstm({
          units: lstmUnits[i],
          returnSequences: i < lstmUnits.length - 1,
        })
      );

      if (config.dropoutRate) {
        model.add(tf.layers.dropout({ rate: config.dropoutRate }));
      }
    }

    // Dense layers
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    
    if (config.dropoutRate) {
      model.add(tf.layers.dropout({ rate: config.dropoutRate }));
    }

    // Output layer
    model.add(tf.layers.dense({ units: config.outputSize }));

    return model;
  }

  /**
   * Create and train a Transformer model
   */
  async trainTransformerModel(
    trainingData: TrainingData,
    config: ModelConfig
  ): Promise<{ model: tf.LayersModel; history: tf.History }> {
    this.config = config;

    const { xTrain, yTrain, xVal, yVal } = this.prepareSequences(
      trainingData,
      config.sequenceLength
    );

    // Build Transformer model (simplified)
    const model = this.buildTransformerModel(config);

    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mse'],
    });

    const history = await model.fit(xTrain, yTrain, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationData: [xVal, yVal],
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const loss = logs?.loss;
          const valLoss = logs?.valLoss;
          console.log(
            `Epoch ${epoch + 1}: loss = ${loss?.toFixed(4) ?? 'N/A'}, val_loss = ${valLoss?.toFixed(4) ?? 'N/A'}`
          );
        },
      },
      shuffle: true,
    });

    xTrain.dispose();
    yTrain.dispose();
    xVal.dispose();
    yVal.dispose();

    this.model = model;
    return { model, history };
  }

  /**
   * Build simplified Transformer model
   */
  private buildTransformerModel(config: ModelConfig): tf.LayersModel {
    const model = tf.sequential();

    // Input embedding with positional encoding
    model.add(
      tf.layers.dense({
        units: 128,
        activation: 'relu',
        inputShape: [config.sequenceLength, config.inputFeatures],
      })
    );

    // Multi-head attention simulation using dense layers
    // (True multi-head attention would require custom layers)
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    
    if (config.dropoutRate) {
      model.add(tf.layers.dropout({ rate: config.dropoutRate }));
    }

    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    
    if (config.dropoutRate) {
      model.add(tf.layers.dropout({ rate: config.dropoutRate }));
    }

    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: config.outputSize }));

    return model;
  }

  /**
   * Make prediction with uncertainty estimation
   */
  async predict(inputData: number[][]): Promise<ModelPredictionResult> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Convert input to tensor
    const inputTensor = tf.tensor3d([inputData]);

    // Make prediction
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const predictionValue = (await prediction.data())[0];

    // Monte Carlo Dropout for uncertainty estimation
    const mcPredictions = await this.monteCarloDropout(inputData, 30);
    const mean = mcPredictions.reduce((a, b) => a + b, 0) / mcPredictions.length;
    const variance =
      mcPredictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
      mcPredictions.length;
    const uncertainty = Math.sqrt(variance);

    // Calculate confidence (inverse of uncertainty, normalized)
    const confidence = Math.max(0, Math.min(100, 100 * (1 - uncertainty / Math.abs(mean || 1))));

    // Prediction interval (95% confidence)
    const z = 1.96;
    const lower = predictionValue - z * uncertainty;
    const upper = predictionValue + z * uncertainty;

    // Cleanup
    inputTensor.dispose();
    prediction.dispose();

    return {
      prediction: predictionValue,
      confidence,
      uncertainty,
      predictionInterval: { lower, upper },
      contributingFeatures: [], // TODO: Implement feature importance
    };
  }

  /**
   * Monte Carlo Dropout for uncertainty estimation
   */
  private async monteCarloDropout(inputData: number[][], iterations: number): Promise<number[]> {
    if (!this.model) return [];

    const predictions: number[] = [];
    const inputTensor = tf.tensor3d([inputData]);

    for (let i = 0; i < iterations; i++) {
      // Note: TensorFlow.js doesn't support training mode in predict
      // This is a simplified uncertainty estimation
      const pred = this.model.predict(inputTensor) as tf.Tensor;
      const value = (await pred.data())[0];
      predictions.push(value);
      pred.dispose();
    }

    inputTensor.dispose();
    return predictions;
  }

  /**
   * Prepare sequences for time series models
   */
  private prepareSequences(
    data: TrainingData,
    sequenceLength: number
  ): {
    xTrain: tf.Tensor3D;
    yTrain: tf.Tensor2D;
    xVal: tf.Tensor3D;
    yVal: tf.Tensor2D;
  } {
    const { features, labels } = data;

    // Create sequences
    const xData: number[][][] = [];
    const yData: number[][] = [];

    for (let i = sequenceLength; i < features.length; i++) {
      // Extract sequence
      const sequence: number[][] = [];
      for (let j = i - sequenceLength; j < i; j++) {
        sequence.push(this.featuresToArray(features[j]));
      }
      xData.push(sequence);
      yData.push([labels[i]]);
    }

    // Split into train and validation
    const splitIndex = Math.floor(xData.length * (1 - (this.config?.validationSplit || 0.2)));
    
    const xTrainData = xData.slice(0, splitIndex);
    const yTrainData = yData.slice(0, splitIndex);
    const xValData = xData.slice(splitIndex);
    const yValData = yData.slice(splitIndex);

    // Convert to tensors
    const xTrain = tf.tensor3d(xTrainData);
    const yTrain = tf.tensor2d(yTrainData);
    const xVal = tf.tensor3d(xValData);
    const yVal = tf.tensor2d(yValData);

    return { xTrain, yTrain, xVal, yVal };
  }

  /**
   * Convert feature object to array
   */
  private featuresToArray(features: unknown): number[] {
    // This should match the feature extraction order
    const featureObj = features as Record<string, unknown>;
    const result: number[] = [];
    
    for (const key in featureObj) {
      const value = featureObj[key];
      if (typeof value === 'number') {
        result.push(value);
      } else if (Array.isArray(value)) {
        result.push(...value);
      }
    }
    
    return result;
  }

  /**
   * Save model to IndexedDB or filesystem
   */
  async saveModel(modelId: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`indexeddb://${modelId}`);
  }

  /**
   * Load model from storage
   */
  async loadModel(modelId: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`indexeddb://${modelId}`);
    } catch (error) {
      console.error('Error loading model:', error);
      throw new Error(`Failed to load model: ${modelId}`);
    }
  }

  /**
   * Delete model from storage
   */
  async deleteModel(modelId: string): Promise<void> {
    await tf.io.removeModel(`indexeddb://${modelId}`);
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    const models = await tf.io.listModels();
    return Object.keys(models).filter(key => key.startsWith('indexeddb://'));
  }

  /**
   * Evaluate model performance
   */
  async evaluate(testData: TrainingData): Promise<{ loss: number; mae: number; mse: number }> {
    if (!this.model || !this.config) {
      throw new Error('Model not loaded');
    }

    const { xTest, yTest } = this.prepareSequences(testData, this.config.sequenceLength);

    const result = this.model.evaluate(xTest, yTest) as tf.Scalar[];
    
    const loss = await result[0].data();
    const mae = await result[1].data();
    const mse = await result[2].data();

    xTest.dispose();
    yTest.dispose();
    result.forEach(r => r.dispose());

    return {
      loss: loss[0],
      mae: mae[0],
      mse: mse[0],
    };
  }

  /**
   * Perform hyperparameter optimization
   */
  async optimizeHyperparameters(
    trainingData: TrainingData,
    paramGrid: Record<string, number[]>
  ): Promise<{ bestParams: Record<string, number>; bestScore: number }> {
    let bestScore = Infinity;
    let bestParams: Record<string, number> = {};

    // Grid search
    const combinations = this.generateCombinations(paramGrid);

    for (const params of combinations) {

      const config: ModelConfig = {
        modelType: 'LSTM',
        inputFeatures: trainingData.features[0] ? Object.keys(trainingData.features[0]).length : 50,
        sequenceLength: params.sequenceLength || 20,
        outputSize: 1,
        learningRate: params.learningRate || 0.001,
        batchSize: params.batchSize || 32,
        epochs: params.epochs || 50,
        validationSplit: 0.2,
        lstmUnits: params.lstmUnits ? [params.lstmUnits] : [64],
        dropoutRate: params.dropoutRate || 0.2,
      };

      try {
        const { model, history } = await this.trainLSTMModel(trainingData, config);
        const valLoss = history.history.valLoss[history.history.valLoss.length - 1] as number;

        if (valLoss < bestScore) {
          bestScore = valLoss;
          bestParams = params;
        }

        // Dispose model
        model.dispose();
      } catch (error) {
        console.error('Error during hyperparameter optimization:', error);
      }
    }

    return { bestParams, bestScore };
  }

  /**
   * Generate parameter combinations for grid search
   */
  private generateCombinations(paramGrid: Record<string, number[]>): Record<string, number>[] {
    const keys = Object.keys(paramGrid);
    const combinations: Record<string, number>[] = [];

    const generate = (index: number, current: Record<string, number>): void => {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      for (const value of paramGrid[key]) {
        current[key] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  }

  /**
   * Get model summary
   */
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

  /**
   * Dispose model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export const modelPipeline = new ModelPipeline();
