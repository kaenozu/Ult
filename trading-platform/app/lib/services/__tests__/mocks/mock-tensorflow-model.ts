/**
 * Mock TensorFlow Model for Testing
 */

export class MockTensorFlowModel {
  private weights: number[] = [];
  private bias: number = 0;
  private isTrained: boolean = false;
  private metrics: Record<string, number> = {};
  private savedPath: string | null = null;

  async train(features: number[][], labels: number[]): Promise<void> {
    // Simple mock training - just store some values
    this.weights = features[0]?.map(() => Math.random()) || [];
    this.bias = Math.random();
    this.isTrained = true;
  }

  predict(features: number[]): number {
    if (!this.isTrained || this.weights.length === 0) {
      return 0.5;
    }
    
    let sum = this.bias;
    for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
      sum += features[i] * this.weights[i];
    }
    
    // Apply sigmoid to get 0-1 range
    return 1 / (1 + Math.exp(-sum));
  }

  async predictBatch(features: number[][]): Promise<number[]> {
    return features.map(f => this.predict(f));
  }

  getWeights(): number[] {
    return [...this.weights];
  }

  getBias(): number {
    return this.bias;
  }

  isModelTrained(): boolean {
    return this.isTrained;
  }

  isTrained(): boolean {
    return this.isTrained;
  }

  reset(): void {
    this.weights = [];
    this.bias = 0;
    this.isTrained = false;
    this.metrics = {};
    this.savedPath = null;
  }

  setMetrics(metrics: Record<string, number>): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }

  async saveModel(path: string): Promise<void> {
    this.savedPath = path;
  }

  async loadModel(path: string): Promise<void> {
    this.savedPath = path;
    this.isTrained = true;
  }

  getSavedPath(): string | null {
    return this.savedPath;
  }
}
