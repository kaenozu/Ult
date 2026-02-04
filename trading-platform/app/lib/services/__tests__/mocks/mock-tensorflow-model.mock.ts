/**
 * Mock TensorFlow Model for Testing
 * 
 * Provides a mock implementation of ITensorFlowModel for unit testing
 * without requiring actual TensorFlow.js dependencies
 */

import { ITensorFlowModel } from '../../interfaces/ml-model-interfaces';
import { ModelMetrics, ModelTrainingData } from '../../tensorflow-model-service';

/**
 * Mock TensorFlow model for testing
 */
export class MockTensorFlowModel implements ITensorFlowModel {
  private metrics: ModelMetrics = {
    mae: 0.1,
    rmse: 0.15,
    accuracy: 75.0
  };

  private trained = false;
  private predictValue = 0.5;

  /**
   * Set the value that predict() should return
   */
  setPredictValue(value: number): void {
    this.predictValue = value;
  }

  /**
   * Set custom metrics
   */
  setMetrics(metrics: Partial<ModelMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  /**
   * Mock prediction (returns configured value)
   */
  async predict(_features: number[]): Promise<number> {
    if (!this.trained) {
      throw new Error('Model not trained. Call train() first.');
    }
    return this.predictValue;
  }

  /**
   * Mock training (just sets trained flag)
   */
  async train(_data: ModelTrainingData, _epochs?: number): Promise<ModelMetrics> {
    this.trained = true;
    return this.metrics;
  }

  /**
   * Get mock metrics
   */
  getMetrics(): ModelMetrics {
    return { ...this.metrics };
  }

  /**
   * Mock save (no-op)
   */
  async saveModel(_name: string): Promise<void> {
    // No-op for mock
  }

  /**
   * Mock load (sets trained flag)
   */
  async loadModel(_name: string): Promise<void> {
    this.trained = true;
  }

  /**
   * Mock dispose (resets state)
   */
  dispose(): void {
    this.trained = false;
  }

  /**
   * Check if model is trained (for testing)
   */
  isTrained(): boolean {
    return this.trained;
  }
}
