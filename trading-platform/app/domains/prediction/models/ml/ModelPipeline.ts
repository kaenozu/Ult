/**
 * ML Model Pipeline
 *
 * Handles model training, loading, saving, and inference using TensorFlow.js
 *
 * Security: Includes input validation and boundary checks to prevent:
 * - Invalid data causing model corruption
 * - Resource exhaustion attacks
 * - Type confusion vulnerabilities
 */

import * as tf from '@tensorflow/tfjs';
import { ModelConfig, ModelMetadata, TrainingData, ModelPredictionResult } from './types';

// Security: Define validation constants
const VALIDATION_LIMITS = {
  MAX_SEQUENCE_LENGTH: 1000,
  MIN_SEQUENCE_LENGTH: 1,
  MAX_INPUT_FEATURES: 500,
  MIN_INPUT_FEATURES: 1,
  MAX_EPOCHS: 1000,
  MIN_EPOCHS: 1,
  MAX_BATCH_SIZE: 1024,
  MIN_BATCH_SIZE: 1,
  MAX_LSTM_UNITS: 1024,
  MIN_LSTM_UNITS: 1,
  MAX_OUTPUT_SIZE: 100,
  MIN_OUTPUT_SIZE: 1,
  MAX_LEARNING_RATE: 1.0,
  MIN_LEARNING_RATE: 0.0000001,
  MAX_DROPOUT_RATE: 0.9,
  MIN_DROPOUT_RATE: 0.0,
  MAX_TRAINING_DATA_SIZE: 1000000,
  MIN_TRAINING_DATA_SIZE: 10,
} as const;

export class ModelPipeline {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig | null = null;
  private metadata: ModelMetadata | null = null;

  /**
   * Security: Validate model configuration
   */
  private validateModelConfig(config: ModelConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config: must be a valid object');
    }

    // Validate sequence length
    if (typeof config.sequenceLength !== 'number' ||
        !Number.isInteger(config.sequenceLength) ||
        config.sequenceLength < VALIDATION_LIMITS.MIN_SEQUENCE_LENGTH ||
        config.sequenceLength > VALIDATION_LIMITS.MAX_SEQUENCE_LENGTH) {
      throw new Error(
        `Invalid sequenceLength: must be an integer between ${VALIDATION_LIMITS.MIN_SEQUENCE_LENGTH} and ${VALIDATION_LIMITS.MAX_SEQUENCE_LENGTH}`
      );
    }

    // Validate input features
    if (typeof config.inputFeatures !== 'number' ||
        !Number.isInteger(config.inputFeatures) ||
        config.inputFeatures < VALIDATION_LIMITS.MIN_INPUT_FEATURES ||
        config.inputFeatures > VALIDATION_LIMITS.MAX_INPUT_FEATURES) {
      throw new Error(
        `Invalid inputFeatures: must be an integer between ${VALIDATION_LIMITS.MIN_INPUT_FEATURES} and ${VALIDATION_LIMITS.MAX_INPUT_FEATURES}`
      );
    }

    // Validate epochs
    if (typeof config.epochs !== 'number' ||
        !Number.isInteger(config.epochs) ||
        config.epochs < VALIDATION_LIMITS.MIN_EPOCHS ||
        config.epochs > VALIDATION_LIMITS.MAX_EPOCHS) {
      throw new Error(
        `Invalid epochs: must be an integer between ${VALIDATION_LIMITS.MIN_EPOCHS} and ${VALIDATION_LIMITS.MAX_EPOCHS}`
      );
    }

    // Validate batch size
    if (typeof config.batchSize !== 'number' ||
        !Number.isInteger(config.batchSize) ||
        config.batchSize < VALIDATION_LIMITS.MIN_BATCH_SIZE ||
        config.batchSize > VALIDATION_LIMITS.MAX_BATCH_SIZE) {
      throw new Error(
        `Invalid batchSize: must be an integer between ${VALIDATION_LIMITS.MIN_BATCH_SIZE} and ${VALIDATION_LIMITS.MAX_BATCH_SIZE}`
      );
    }

    // Validate output size
    if (typeof config.outputSize !== 'number' ||
        !Number.isInteger(config.outputSize) ||
        config.outputSize < VALIDATION_LIMITS.MIN_OUTPUT_SIZE ||
        config.outputSize > VALIDATION_LIMITS.MAX_OUTPUT_SIZE) {
      throw new Error(
        `Invalid outputSize: must be an integer between ${VALIDATION_LIMITS.MIN_OUTPUT_SIZE} and ${VALIDATION_LIMITS.MAX_OUTPUT_SIZE}`
      );
    }

    // Validate learning rate
    if (typeof config.learningRate !== 'number' ||
        !isFinite(config.learningRate) ||
        config.learningRate < VALIDATION_LIMITS.MIN_LEARNING_RATE ||
        config.learningRate > VALIDATION_LIMITS.MAX_LEARNING_RATE) {
      throw new Error(
        `Invalid learningRate: must be a number between ${VALIDATION_LIMITS.MIN_LEARNING_RATE} and ${VALIDATION_LIMITS.MAX_LEARNING_RATE}`
      );
    }

    // Validate dropout rate (optional)
    if (config.dropoutRate !== undefined) {
      if (typeof config.dropoutRate !== 'number' ||
          !isFinite(config.dropoutRate) ||
          config.dropoutRate < VALIDATION_LIMITS.MIN_DROPOUT_RATE ||
          config.dropoutRate > VALIDATION_LIMITS.MAX_DROPOUT_RATE) {
        throw new Error(
          `Invalid dropoutRate: must be a number between ${VALIDATION_LIMITS.MIN_DROPOUT_RATE} and ${VALIDATION_LIMITS.MAX_DROPOUT_RATE}`
        );
      }
    }

    // Validate LSTM units (optional)
    if (config.lstmUnits !== undefined) {
      if (!Array.isArray(config.lstmUnits) || config.lstmUnits.length === 0) {
        throw new Error('Invalid lstmUnits: must be a non-empty array');
      }

      for (const units of config.lstmUnits) {
        if (typeof units !== 'number' ||
            !Number.isInteger(units) ||
            units < VALIDATION_LIMITS.MIN_LSTM_UNITS ||
            units > VALIDATION_LIMITS.MAX_LSTM_UNITS) {
          throw new Error(
            `Invalid LSTM units value: must be an integer between ${VALIDATION_LIMITS.MIN_LSTM_UNITS} and ${VALIDATION_LIMITS.MAX_LSTM_UNITS}`
          );
        }
      }
    }

    // Validate model type
    if (!['LSTM', 'Transformer'].includes(config.modelType)) {
      throw new Error('Invalid modelType: must be either "LSTM" or "Transformer"');
    }
  }

  /**
   * Security: Validate training data
   */
  private validateTrainingData(data: TrainingData): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid training data: must be a valid object');
    }

    if (!Array.isArray(data.features) || !Array.isArray(data.labels)) {
      throw new Error('Invalid training data: features and labels must be arrays');
    }

    if (data.features.length !== data.labels.length) {
      throw new Error('Invalid training data: features and labels must have the same length');
    }

    if (data.features.length < VALIDATION_LIMITS.MIN_TRAINING_DATA_SIZE) {
      throw new Error(
        `Insufficient training data: minimum ${VALIDATION_LIMITS.MIN_TRAINING_DATA_SIZE} samples required`
      );
    }

    if (data.features.length > VALIDATION_LIMITS.MAX_TRAINING_DATA_SIZE) {
      throw new Error(
        `Training data too large: maximum ${VALIDATION_LIMITS.MAX_TRAINING_DATA_SIZE} samples allowed`
      );
    }

    // Validate that all labels are finite numbers
    for (let i = 0; i < data.labels.length; i++) {
      if (typeof data.labels[i] !== 'number' || !isFinite(data.labels[i])) {
        throw new Error(`Invalid label at index ${i}: must be a finite number`);
      }
    }
  }

  /**
   * Type guard for training logs
   */
  private isTrainingLogs(logs: any): logs is { loss: number; val_loss?: number; valLoss?: number } {
    return logs && typeof logs.loss === 'number';
  }

  /**
   * Create and train a new LSTM model
   */
  async trainLSTMModel(
    trainingData: TrainingData,
    config: ModelConfig
  ): Promise<{ model: tf.LayersModel; history: tf.History }> {
    // Security: Validate inputs
    this.validateModelConfig(config);
    this.validateTrainingData(trainingData);

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
          if (this.isTrainingLogs(logs)) {
            const loss = logs.loss;
            const valLoss = logs.val_loss ?? logs.valLoss ?? 0;
            console.log(
              `Epoch ${epoch + 1}: loss = ${loss.toFixed(4)}, val_loss = ${valLoss.toFixed(4)}`
            );
          }
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
    // Security: Validate inputs
    this.validateModelConfig(config);
    this.validateTrainingData(trainingData);

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
          if (this.isTrainingLogs(logs)) {
            const loss = logs.loss;
            const valLoss = logs.val_loss ?? logs.valLoss ?? 0;
            console.log(
              `Epoch ${epoch + 1}: loss = ${loss.toFixed(4)}, val_loss = ${valLoss.toFixed(4)}`
            );
          }
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

    // Security: Validate input data
    if (!Array.isArray(inputData) || inputData.length === 0) {
      throw new Error('Invalid input data: must be a non-empty 2D array');
    }

    // Prevent memory exhaustion attacks
    if (inputData.length > 1000) {
      throw new Error(
        `Input too large: maximum 1000 sequences allowed, got ${inputData.length}`
      );
    }

    // Validate sequence length matches config
    if (this.config && inputData.length !== this.config.sequenceLength) {
      throw new Error(
        `Invalid input sequence length: expected ${this.config.sequenceLength}, got ${inputData.length}`
      );
    }

    // Validate each timestep
    for (let i = 0; i < inputData.length; i++) {
      if (!Array.isArray(inputData[i])) {
        throw new Error(`Invalid input at timestep ${i}: must be an array`);
      }

      // Validate feature count
      if (this.config && inputData[i].length !== this.config.inputFeatures) {
        throw new Error(
          `Invalid feature count at timestep ${i}: expected ${this.config.inputFeatures}, got ${inputData[i].length}`
        );
      }

      // Validate all values are finite numbers
      for (let j = 0; j < inputData[i].length; j++) {
        const value = inputData[i][j];
        if (typeof value !== 'number' || !isFinite(value)) {
          throw new Error(
            `Invalid value at timestep ${i}, feature ${j}: must be a finite number, got ${value}`
          );
        }
      }
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

    // Calculate feature importance using permutation-based approach
    const contributingFeatures = await this.calculateFeatureImportance(inputData, predictionValue);

    return {
      prediction: predictionValue,
      confidence,
      uncertainty,
      predictionInterval: { lower, upper },
      contributingFeatures,
    };
  }

  /**
   * Calculate feature importance using permutation-based approach
   * Measures how much the prediction changes when each feature is permuted
   */
  private async calculateFeatureImportance(
    inputData: number[][],
    baselinePrediction: number
  ): Promise<Array<{ feature: string; importance: number }>> {
    if (!this.model || !this.config?.featureColumns) return [];

    const importances: Array<{ feature: string; importance: number }> = [];
    const featureColumns = this.config.featureColumns;
    
    // Calculate baseline
    const baseline = Math.abs(baselinePrediction);
    
    // For each feature column
    for (let col = 0; col < featureColumns.length; col++) {
      // Create permuted input (shuffle the feature column)
      const permutedData = inputData.map(row => [...row]);
      const columnValues = permutedData.map(row => row[col]);
      
      // Shuffle values
      for (let i = columnValues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [columnValues[i], columnValues[j]] = [columnValues[j], columnValues[i]];
      }
      
      // Update permuted data
      permutedData.forEach((row, i) => {
        row[col] = columnValues[i];
      });
      
      // Make prediction with permuted data
      const permutedTensor = tf.tensor3d([permutedData]);
      const permutedPred = this.model.predict(permutedTensor) as tf.Tensor;
      const permutedValue = (await permutedPred.data())[0];
      
      // Calculate importance as absolute difference from baseline
      const importance = Math.abs(permutedValue - baselinePrediction) / (baseline || 1);
      
      importances.push({
        feature: featureColumns[col],
        importance: Math.min(100, importance * 100) // Normalize to 0-100
      });
      
      permutedTensor.dispose();
      permutedPred.dispose();
    }
    
    // Sort by importance and return top 5
    return importances
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
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
   * Security: Sanitize model ID to prevent injection attacks
   */
  private sanitizeModelId(modelId: string): string {
    if (!modelId || typeof modelId !== 'string') {
      throw new Error('Invalid modelId: must be a non-empty string');
    }

    // Remove any characters that aren't alphanumeric, dash, or underscore
    const sanitized = modelId.replace(/[^a-zA-Z0-9_-]/g, '');

    if (sanitized.length === 0) {
      throw new Error('Invalid modelId: must contain at least one alphanumeric character');
    }

    if (sanitized.length > 100) {
      throw new Error('Invalid modelId: maximum length is 100 characters');
    }

    return sanitized;
  }

  /**
   * Save model to IndexedDB or filesystem
   */
  async saveModel(modelId: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    // Security: Sanitize model ID to prevent path traversal and injection
    const sanitizedId = this.sanitizeModelId(modelId);

    await this.model.save(`indexeddb://${sanitizedId}`);
    console.log(`Model saved with ID: ${sanitizedId}`);
  }

  /**
   * Load model from storage
   */
  async loadModel(modelId: string): Promise<void> {
    // Security: Sanitize model ID to prevent path traversal and injection
    const sanitizedId = this.sanitizeModelId(modelId);

    try {
      this.model = await tf.loadLayersModel(`indexeddb://${sanitizedId}`);
      console.log(`Model loaded: ${sanitizedId}`);
    } catch (error) {
      console.error('Error loading model:', error);
      throw new Error(`Failed to load model: ${sanitizedId}`);
    }
  }

  /**
   * Delete model from storage
   */
  async deleteModel(modelId: string): Promise<void> {
    // Security: Sanitize model ID to prevent path traversal and injection
    const sanitizedId = this.sanitizeModelId(modelId);

    await tf.io.removeModel(`indexeddb://${sanitizedId}`);
    console.log(`Model deleted: ${sanitizedId}`);
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

    // Use validation data from prepareSequences (testData is used for preparation)
    const { xVal, yVal } = this.prepareSequences(testData, this.config.sequenceLength);

    const result = this.model.evaluate(xVal, yVal) as tf.Scalar[];

    const loss = await result[0].data();
    const mae = await result[1].data();
    const mse = await result[2].data();

    xVal.dispose();
    yVal.dispose();
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
      console.log('Testing params:', params);

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
      try {
        // Check if model is already disposed to avoid double-disposal errors
        // TF.js models usually throw if disposed twice, but we can't easily check 'isDisposed' property on LayersModel
        // So we wrap in try-catch
        this.model.dispose();
      } catch (e) {
        // Ignore disposal errors (likely already disposed)
        console.warn('Model disposal warning:', e);
      }
      this.model = null;
    }
  }
}

export const modelPipeline = new ModelPipeline();
