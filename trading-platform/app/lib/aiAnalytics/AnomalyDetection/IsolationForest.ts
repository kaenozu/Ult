/**
 * Isolation Forest Detector
 * Implements a simplified version of the Isolation Forest algorithm for anomaly detection
 */

import { DetectorResult, MarketData } from './types';

export interface IsolationForestConfig {
  nEstimators: number;
  contamination: number;
  maxSamples: number;
  maxDepth: number;
}

interface TreeNode {
  splitFeature?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
  size?: number;
  depth: number;
}

// Euler-Mascheroni constant used in isolation forest path length calculations
const EULER_MASCHERONI_CONSTANT = 0.5772156649;

export class IsolationForest {
  private config: IsolationForestConfig;
  private trees: TreeNode[] = [];
  private trained: boolean = false;

  constructor(config?: Partial<IsolationForestConfig>) {
    this.config = {
      nEstimators: config?.nEstimators ?? 100,
      contamination: config?.contamination ?? 0.1,
      maxSamples: config?.maxSamples ?? 256,
      maxDepth: config?.maxDepth ?? 8,
    };
  }

  /**
   * Detect anomalies using Isolation Forest
   */
  detect(data: MarketData): DetectorResult {
    const features = this.extractFeatures(data);
    
    if (!this.trained || this.trees.length === 0) {
      // Train on current data window
      const trainingData = data.ohlcv.slice(-this.config.maxSamples).map(d => 
        this.extractFeaturesFromOHLCV(d, data.ohlcv)
      );
      this.train(trainingData);
    }

    const score = this.anomalyScore(features);
    const threshold = 0.5 + this.config.contamination;
    const isAnomaly = score > threshold;
    const confidence = Math.min(Math.abs(score - 0.5) * 2, 1.0);

    return {
      detectorName: 'IsolationForest',
      isAnomaly,
      score,
      confidence,
      details: {
        threshold,
        nTrees: this.trees.length,
      },
    };
  }

  /**
   * Train the isolation forest
   */
  private train(data: number[][]): void {
    this.trees = [];
    const nSamples = Math.min(this.config.maxSamples, data.length);
    
    for (let i = 0; i < this.config.nEstimators; i++) {
      // Random sampling
      const sample = this.randomSample(data, nSamples);
      const tree = this.buildTree(sample, 0, this.config.maxDepth);
      this.trees.push(tree);
    }
    
    this.trained = true;
  }

  /**
   * Build an isolation tree
   */
  private buildTree(
    data: number[][],
    depth: number,
    maxDepth: number
  ): TreeNode {
    if (depth >= maxDepth || data.length <= 1) {
      return {
        size: data.length,
        depth,
      };
    }

    // Random feature and split value
    const nFeatures = data[0].length;
    const splitFeature = Math.floor(Math.random() * nFeatures);
    
    const featureValues = data.map(d => d[splitFeature]);
    const minVal = Math.min(...featureValues);
    const maxVal = Math.max(...featureValues);
    
    if (minVal === maxVal) {
      return {
        size: data.length,
        depth,
      };
    }

    const splitValue = minVal + Math.random() * (maxVal - minVal);

    // Split data
    const leftData = data.filter(d => d[splitFeature] < splitValue);
    const rightData = data.filter(d => d[splitFeature] >= splitValue);

    if (leftData.length === 0 || rightData.length === 0) {
      return {
        size: data.length,
        depth,
      };
    }

    return {
      splitFeature,
      splitValue,
      left: this.buildTree(leftData, depth + 1, maxDepth),
      right: this.buildTree(rightData, depth + 1, maxDepth),
      depth,
    };
  }

  /**
   * Calculate anomaly score for a sample
   */
  private anomalyScore(features: number[]): number {
    const avgPathLength = this.trees.reduce((sum, tree) => {
      return sum + this.pathLength(features, tree);
    }, 0) / this.trees.length;

    // Normalize using expected average path length
    const c = this.expectedAveragePathLength(this.config.maxSamples);
    const score = Math.pow(2, -avgPathLength / c);
    
    return score;
  }

  /**
   * Calculate path length in a tree
   */
  private pathLength(features: number[], node: TreeNode, depth: number = 0): number {
    if (!node.splitFeature || !node.splitValue) {
      // Leaf node
      return depth + this.estimateAveragePathLength(node.size ?? 1);
    }

    if (features[node.splitFeature] < node.splitValue) {
      return this.pathLength(features, node.left!, depth + 1);
    } else {
      return this.pathLength(features, node.right!, depth + 1);
    }
  }

  /**
   * Estimate average path length for unsuccessful search
   */
  private estimateAveragePathLength(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    const c = 2 * (Math.log(n - 1) + EULER_MASCHERONI_CONSTANT) - (2 * (n - 1) / n);
    return c;
  }

  /**
   * Expected average path length
   */
  private expectedAveragePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + EULER_MASCHERONI_CONSTANT) - (2 * (n - 1) / n);
  }

  /**
   * Random sampling
   */
  private randomSample<T>(data: T[], n: number): T[] {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  /**
   * Extract features from market data
   */
  private extractFeatures(data: MarketData): number[] {
    const ohlcv = data.ohlcv;
    if (ohlcv.length === 0) return [];
    
    return this.extractFeaturesFromOHLCV(
      ohlcv[ohlcv.length - 1],
      ohlcv
    );
  }

  /**
   * Extract features from OHLCV data point
   */
  private extractFeaturesFromOHLCV(
    current: { open: number; high: number; low: number; close: number; volume: number },
    history: { open: number; high: number; low: number; close: number; volume: number }[]
  ): number[] {
    const priceChange = (current.close - current.open) / current.open;
    const range = (current.high - current.low) / current.close;
    
    // Calculate volume ratio
    const avgVolume = history.slice(-10).reduce((sum, d) => sum + d.volume, 0) / 10;
    const volumeRatio = avgVolume > 0 ? current.volume / avgVolume : 1;

    // Price volatility
    const returns = history.slice(-10).map((d, i) => {
      if (i === 0) return 0;
      return (d.close - history[i - 1].close) / history[i - 1].close;
    });
    const volatility = this.calculateStdDev(returns);

    return [
      priceChange,
      range,
      volumeRatio,
      volatility,
      current.close,
    ];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Reset the detector
   */
  reset(): void {
    this.trees = [];
    this.trained = false;
  }
}
