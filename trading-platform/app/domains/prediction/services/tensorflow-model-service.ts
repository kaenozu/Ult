/**
 * TensorFlow.js Model Service
 * 
 * This service provides real machine learning models using TensorFlow.js
 * Implements LSTM and GRU models for time series prediction
 */

import * as tf from '@tensorflow/tfjs';
import { PredictionFeatures } from '../types';

// Set TensorFlow.js backend to CPU for Node.js environment
if (typeof window === 'undefined') {
  tf.setBackend('cpu');
}

export interface ModelTrainingData {
  features: number[][];
  labels: number[];
}

export interface ModelMetrics {
  mae: number;  // Mean Absolute Error
  rmse: number; // Root Mean Squared Error
  accuracy: number; // Classification accuracy (directional)
}

/**
 * Base class for TensorFlow.js models
 * 
 * This abstract class provides common functionality for all TensorFlow.js models including:
 * - Model training with historical data
 * - Prediction capabilities
 * - Performance metrics (MAE, RMSE, accuracy)
 * - Model persistence (save/load)
 * - Memory management (disposal)
 * 
 * To create a new model, extend this class and implement the `buildModel` method
 * to define your specific neural network architecture.
 * 
 * @example
 * class MyModel extends BaseTensorFlowModel {
 *   buildModel(inputShape: number): tf.LayersModel {
 *     const model = tf.sequential();
 *     model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [inputShape] }));
 *     model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
 *     model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
 *     return model;
 *   }
 * }
 */
abstract class BaseTensorFlowModel {
  protected model: tf.LayersModel | null = null;
  protected isTraining = false;
  protected metrics: ModelMetrics = { mae: 0, rmse: 0, accuracy: 0 };

  abstract buildModel(inputShape: number): tf.LayersModel;

  /**
   * Train the model with historical data
   * 
   * @param data - Training data with features and labels
   * @param epochs - Number of training epochs (default: 50)
   * @param onProgress - Optional callback for training progress
   * @returns Model metrics after training
   */
  async train(
    data: ModelTrainingData, 
    epochs = 50,
    onProgress?: (epoch: number, logs?: tf.Logs) => void
  ): Promise<ModelMetrics> {
    if (this.isTraining) {
      throw new Error('Model is already training');
    }

    this.isTraining = true;

    try {
      // Build model if not exists
      if (!this.model) {
        this.model = this.buildModel(data.features[0].length);
      }

      // Convert data to tensors
      const xs = tf.tensor2d(data.features);
      const ys = tf.tensor2d(data.labels, [data.labels.length, 1]);

      // Train the model
      await this.model.fit(xs, ys, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: onProgress ? {
          onEpochEnd: onProgress
        } : undefined
      });

      // Calculate metrics
      this.metrics = await this.evaluateModel(xs, ys);

      // Cleanup tensors
      xs.dispose();
      ys.dispose();

      return this.metrics;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Make a prediction
   */
  async predict(features: number[]): Promise<number> {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    return tf.tidy(() => {
      const input = tf.tensor2d([features]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      const value = prediction.dataSync()[0];
      return value;
    });
  }

  /**
   * Evaluate model performance
   */
  private async evaluateModel(xs: tf.Tensor2D, ys: tf.Tensor2D): Promise<ModelMetrics> {
    const predictions = this.model!.predict(xs) as tf.Tensor;
    
    // Calculate MAE
    const mae = tf.metrics.meanAbsoluteError(ys, predictions);
    const maeValue = (await mae.data())[0];
    
    // Calculate RMSE
    const mse = tf.metrics.meanSquaredError(ys, predictions);
    const rmseValue = Math.sqrt((await mse.data())[0]);
    
    // Calculate directional accuracy
    const yData = await ys.data();
    const predData = await predictions.data();
    let correctDirections = 0;
    for (let i = 1; i < yData.length; i++) {
      const actualDir = yData[i] > yData[i - 1];
      const predDir = predData[i] > predData[i - 1];
      if (actualDir === predDir) correctDirections++;
    }
    const accuracy = correctDirections / (yData.length - 1);

    // Cleanup
    mae.dispose();
    mse.dispose();
    predictions.dispose();

    return {
      mae: maeValue,
      rmse: rmseValue,
      accuracy: accuracy * 100
    };
  }

  /**
   * Get current model metrics
   */
  getMetrics(): ModelMetrics {
    return { ...this.metrics };
  }

  /**
   * Save model to local storage or IndexedDB
   */
  async saveModel(name: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }
    await this.model.save(`localstorage://${name}`);
  }

  /**
   * Load model from local storage or IndexedDB
   */
  async loadModel(name: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`localstorage://${name}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      throw new Error(`Failed to load model: ${name}`);
    }
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

/**
 * LSTM Model for time series prediction
 */
export class LSTMModel extends BaseTensorFlowModel {
  buildModel(inputShape: number): tf.LayersModel {
    const model = tf.sequential();

    // LSTM layers
    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: true,
      inputShape: [1, inputShape]
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: false
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Dense layers
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Predict with properly shaped input for LSTM
   */
  async predict(features: number[]): Promise<number> {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    return tf.tidy(() => {
      // LSTM expects [batch, timesteps, features]
      const input = tf.tensor3d([[features]], [1, 1, features.length]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      const value = prediction.dataSync()[0];
      return value;
    });
  }

  /**
   * Train with properly shaped data for LSTM
   */
  async train(data: ModelTrainingData, epochs = 50): Promise<ModelMetrics> {
    if (this.isTraining) {
      throw new Error('Model is already training');
    }

    this.isTraining = true;

    try {
      if (!this.model) {
        this.model = this.buildModel(data.features[0].length);
      }

      // Reshape for LSTM: [batch, timesteps, features]
      const xs = tf.tensor3d(
        data.features.map(f => [f]),
        [data.features.length, 1, data.features[0].length]
      );
      const ys = tf.tensor2d(data.labels, [data.labels.length, 1]);

      await this.model.fit(xs, ys, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        verbose: 0
      });

      // Calculate metrics using 2D tensors
      const xs2d = tf.tensor2d(data.features);
      const predictions = [];
      for (let i = 0; i < data.features.length; i++) {
        predictions.push(await this.predict(data.features[i]));
      }
      const predTensor = tf.tensor2d(predictions, [predictions.length, 1]);

      this.metrics = await this.evaluateWithTensors(ys, predTensor);

      xs.dispose();
      ys.dispose();
      xs2d.dispose();
      predTensor.dispose();

      return this.metrics;
    } finally {
      this.isTraining = false;
    }
  }

  private async evaluateWithTensors(actual: tf.Tensor2D, predicted: tf.Tensor2D): Promise<ModelMetrics> {
    const mae = tf.metrics.meanAbsoluteError(actual, predicted);
    const maeValue = (await mae.data())[0];
    
    const mse = tf.metrics.meanSquaredError(actual, predicted);
    const rmseValue = Math.sqrt((await mse.data())[0]);
    
    const yData = await actual.data();
    const predData = await predicted.data();
    let correctDirections = 0;
    for (let i = 1; i < yData.length; i++) {
      const actualDir = yData[i] > yData[i - 1];
      const predDir = predData[i] > predData[i - 1];
      if (actualDir === predDir) correctDirections++;
    }
    const accuracy = yData.length > 1 ? correctDirections / (yData.length - 1) : 0;

    mae.dispose();
    mse.dispose();

    return { mae: maeValue, rmse: rmseValue, accuracy: accuracy * 100 };
  }
}

/**
 * GRU Model for time series prediction (lighter than LSTM)
 */
export class GRUModel extends BaseTensorFlowModel {
  buildModel(inputShape: number): tf.LayersModel {
    const model = tf.sequential();

    // GRU layers
    model.add(tf.layers.gru({
      units: 64,
      returnSequences: true,
      inputShape: [1, inputShape]
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.gru({
      units: 32,
      returnSequences: false
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Dense layers
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Predict with properly shaped input for GRU
   */
  async predict(features: number[]): Promise<number> {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    return tf.tidy(() => {
      const input = tf.tensor3d([[features]], [1, 1, features.length]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      const value = prediction.dataSync()[0];
      return value;
    });
  }

  /**
   * Train with properly shaped data for GRU
   */
  async train(data: ModelTrainingData, epochs = 50): Promise<ModelMetrics> {
    if (this.isTraining) {
      throw new Error('Model is already training');
    }

    this.isTraining = true;

    try {
      if (!this.model) {
        this.model = this.buildModel(data.features[0].length);
      }

      const xs = tf.tensor3d(
        data.features.map(f => [f]),
        [data.features.length, 1, data.features[0].length]
      );
      const ys = tf.tensor2d(data.labels, [data.labels.length, 1]);

      await this.model.fit(xs, ys, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        verbose: 0
      });

      const predictions = [];
      for (let i = 0; i < data.features.length; i++) {
        predictions.push(await this.predict(data.features[i]));
      }
      const predTensor = tf.tensor2d(predictions, [predictions.length, 1]);

      this.metrics = await this.evaluateWithTensors(ys, predTensor);

      xs.dispose();
      ys.dispose();
      predTensor.dispose();

      return this.metrics;
    } finally {
      this.isTraining = false;
    }
  }

  private async evaluateWithTensors(actual: tf.Tensor2D, predicted: tf.Tensor2D): Promise<ModelMetrics> {
    const mae = tf.metrics.meanAbsoluteError(actual, predicted);
    const maeValue = (await mae.data())[0];
    
    const mse = tf.metrics.meanSquaredError(actual, predicted);
    const rmseValue = Math.sqrt((await mse.data())[0]);
    
    const yData = await actual.data();
    const predData = await predicted.data();
    let correctDirections = 0;
    for (let i = 1; i < yData.length; i++) {
      const actualDir = yData[i] > yData[i - 1];
      const predDir = predData[i] > predData[i - 1];
      if (actualDir === predDir) correctDirections++;
    }
    const accuracy = yData.length > 1 ? correctDirections / (yData.length - 1) : 0;

    mae.dispose();
    mse.dispose();

    return { mae: maeValue, rmse: rmseValue, accuracy: accuracy * 100 };
  }
}

/**
 * Simple feedforward neural network for Random Forest replacement
 */
export class FeedForwardModel extends BaseTensorFlowModel {
  buildModel(inputShape: number): tf.LayersModel {
    const model = tf.sequential();

    // Dense layers
    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: [inputShape]
    }));
    model.add(tf.layers.dropout({ rate: 0.3 }));

    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));

    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }
}

/**
 * Helper function to convert features object to feature array
 * @param features - Features object (can be PredictionFeatures or any compatible object)
 */
export function featuresToArray(features: any): number[] {
  return [
    features.rsi / 100,           // Normalize to 0-1
    features.rsiChange / 100,
    features.sma5 / 100,
    features.sma20 / 100,
    features.sma50 / 100,
    features.priceMomentum / 10,  // Normalize momentum
    features.volumeRatio,
    features.volatility,
    features.macdSignal / 10,
    features.bollingerPosition / 100,
    features.atrPercent / 10
  ];
}
