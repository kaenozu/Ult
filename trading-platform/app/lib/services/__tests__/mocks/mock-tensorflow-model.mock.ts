/**
 * Mock TensorFlow Model for Testing
 * 
 * Provides a mock implementation of ITensorFlowModel for unit testing
 * without requiring actual TensorFlow.js dependencies
 */

// Mock interface for testing
interface ITensorFlowModel {
  predict(features: number[]): Promise<number>;
  train(data: any, epochs?: number): Promise<any>;
  getMetrics(): any;
  saveModel(name: string): Promise<void>;
  loadModel(name: string): Promise<void>;
  dispose(): void;
}

import { ModelMetrics, ModelTrainingData } from '../../tensorflow-model-service';

/**
 * Mock TensorFlow model for testing
 */
export class MockTensorFlowModel implements ITensorFlowModel {
  private metrics: ModelMetrics = {
    accuracy: 75.0,
    precision: 70.0,
    recall: 80.0,
    loss: 0.2
  };

  private trained = false;
  private predictValue = 0.5;

  /**
   * Set value that predict() should return
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

describe('MockTensorFlowModel', () => {
  test('should create mock model', () => {
    const model = new MockTensorFlowModel();
    expect(model).toBeDefined();
    expect(model.isTrained()).toBe(false);
  });

  test('should train model', async () => {
    const model = new MockTensorFlowModel();
    await model.train({ features: [[]], labels: [] });
    expect(model.isTrained()).toBe(true);
  });

  test('should predict after training', async () => {
    const model = new MockTensorFlowModel();
    model.setPredictValue(0.8);
    await model.train({ features: [[]], labels: [] });
    
    const prediction = await model.predict([1, 2, 3]);
    expect(prediction).toBe(0.8);
  });
});

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
