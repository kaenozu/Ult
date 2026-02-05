/**
 * Prediction Quality Monitor
 * 
 * Tracks real-time prediction accuracy, detects model drift,
 * and provides calibration metrics.
 */

import { ModelPerformance, ModelPredictionResult } from './types';

export interface PredictionRecord {
  id: string;
  timestamp: Date;
  symbol: string;
  predicted: number;
  actual?: number;
  confidence: number;
  modelVersion: string;
}

export class PredictionQualityMonitor {
  private predictions: Map<string, PredictionRecord>;
  private performanceCache: Map<string, ModelPerformance>;
  private driftThreshold: number;
  private windowSize: number;

  constructor() {
    this.predictions = new Map();
    this.performanceCache = new Map();
    this.driftThreshold = 0.15; // 15% performance degradation triggers drift alert
    this.windowSize = 100; // Rolling window for metrics
  }

  /**
   * Record a new prediction
   */
  recordPrediction(
    symbol: string,
    prediction: ModelPredictionResult,
    modelVersion: string
  ): string {
    const id = `${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const record: PredictionRecord = {
      id,
      timestamp: new Date(),
      symbol,
      predicted: prediction.prediction,
      confidence: prediction.confidence,
      modelVersion,
    };

    this.predictions.set(id, record);
    return id;
  }

  /**
   * Update prediction with actual value
   */
  updateActual(predictionId: string, actualValue: number): void {
    const record = this.predictions.get(predictionId);
    if (!record) {
      console.warn(`Prediction ${predictionId} not found`);
      return;
    }

    record.actual = actualValue;
    this.predictions.set(predictionId, record);

    // Update performance metrics
    this.updatePerformanceMetrics(record);
  }

  /**
   * Get real-time accuracy for a model
   */
  getAccuracy(modelVersion: string, windowSize?: number): number {
    const recentPredictions = this.getRecentPredictions(
      modelVersion,
      windowSize || this.windowSize
    );

    if (recentPredictions.length === 0) return 0;

    const correctDirections = recentPredictions.filter((pred, i, arr) => {
      if (i === 0 || pred.actual === undefined) return false;
      const prevPred = arr[i - 1];
      if (prevPred.actual === undefined) return false;

      const predictedDirection = pred.predicted > prevPred.predicted ? 1 : -1;
      const actualDirection = pred.actual > prevPred.actual ? 1 : -1;

      return predictedDirection === actualDirection;
    }).length;

    return (correctDirections / (recentPredictions.length - 1)) * 100;
  }

  /**
   * Calculate Mean Absolute Error
   */
  getMAE(modelVersion: string, windowSize?: number): number {
    const recentPredictions = this.getRecentPredictions(
      modelVersion,
      windowSize || this.windowSize
    ).filter(p => p.actual !== undefined);

    if (recentPredictions.length === 0) return 0;

    const sum = recentPredictions.reduce(
      (acc, pred) => acc + Math.abs(pred.predicted - (pred.actual || 0)),
      0
    );

    return sum / recentPredictions.length;
  }

  /**
   * Calculate Mean Squared Error
   */
  getMSE(modelVersion: string, windowSize?: number): number {
    const recentPredictions = this.getRecentPredictions(
      modelVersion,
      windowSize || this.windowSize
    ).filter(p => p.actual !== undefined);

    if (recentPredictions.length === 0) return 0;

    const sum = recentPredictions.reduce(
      (acc, pred) => acc + Math.pow(pred.predicted - (pred.actual || 0), 2),
      0
    );

    return sum / recentPredictions.length;
  }

  /**
   * Calculate Root Mean Squared Error
   */
  getRMSE(modelVersion: string, windowSize?: number): number {
    return Math.sqrt(this.getMSE(modelVersion, windowSize));
  }

  /**
   * Calculate Mean Absolute Percentage Error
   */
  getMAPE(modelVersion: string, windowSize?: number): number {
    const recentPredictions = this.getRecentPredictions(
      modelVersion,
      windowSize || this.windowSize
    ).filter(p => p.actual !== undefined && p.actual !== 0);

    if (recentPredictions.length === 0) return 0;

    const sum = recentPredictions.reduce(
      (acc, pred) => acc + Math.abs((pred.predicted - (pred.actual || 0)) / (pred.actual || 1)),
      0
    );

    return (sum / recentPredictions.length) * 100;
  }

  /**
   * Calculate R² Score
   */
  getR2Score(modelVersion: string, windowSize?: number): number {
    const recentPredictions = this.getRecentPredictions(
      modelVersion,
      windowSize || this.windowSize
    ).filter(p => p.actual !== undefined);

    if (recentPredictions.length === 0) return 0;

    const actuals = recentPredictions.map(p => p.actual || 0);
    const predictions = recentPredictions.map(p => p.predicted);

    const mean = actuals.reduce((a, b) => a + b, 0) / actuals.length;
    
    const ssTotal = actuals.reduce((sum, actual) => sum + Math.pow(actual - mean, 2), 0);
    const ssResidual = actuals.reduce(
      (sum, actual, i) => sum + Math.pow(actual - predictions[i], 2),
      0
    );

    if (ssTotal === 0) return 0;
    return 1 - ssResidual / ssTotal;
  }

  /**
   * Detect model drift
   */
  detectDrift(modelVersion: string): {
    isDrifting: boolean;
    driftScore: number;
    recommendation: string;
  } {
    const recentPerformance = this.getMAE(modelVersion, 50);
    const historicalPerformance = this.getMAE(modelVersion, 500);

    if (historicalPerformance === 0) {
      return {
        isDrifting: false,
        driftScore: 0,
        recommendation: 'Insufficient data to detect drift',
      };
    }

    const driftScore = (recentPerformance - historicalPerformance) / historicalPerformance;
    const isDrifting = driftScore > this.driftThreshold;

    let recommendation = 'Model performance is stable';
    if (isDrifting) {
      recommendation = `Model drift detected (${(driftScore * 100).toFixed(1)}% performance degradation). Consider retraining.`;
    } else if (driftScore > this.driftThreshold / 2) {
      recommendation = 'Monitor closely - performance degradation approaching threshold';
    }

    return {
      isDrifting,
      driftScore,
      recommendation,
    };
  }

  /**
   * Calculate prediction calibration
   * Measures how well confidence levels match actual accuracy
   */
  getCalibration(modelVersion: string): {
    calibrationError: number;
    bins: { confidence: number; accuracy: number; count: number }[];
  } {
    const predictions = Array.from(this.predictions.values()).filter(
      p => p.modelVersion === modelVersion && p.actual !== undefined
    );

    if (predictions.length === 0) {
      return { calibrationError: 0, bins: [] };
    }

    // Create confidence bins
    const binSize = 10;
    const bins: { confidence: number; accuracy: number; count: number }[] = [];

    for (let i = 0; i < 100; i += binSize) {
      const binPredictions = predictions.filter(
        p => p.confidence >= i && p.confidence < i + binSize
      );

      if (binPredictions.length === 0) continue;

      const correctPredictions = binPredictions.filter(
        p => Math.abs(p.predicted - (p.actual || 0)) < 1 // Within 1% is considered correct
      ).length;

      const accuracy = (correctPredictions / binPredictions.length) * 100;

      bins.push({
        confidence: i + binSize / 2,
        accuracy,
        count: binPredictions.length,
      });
    }

    // Calculate Expected Calibration Error (ECE)
    const totalPredictions = predictions.length;
    const calibrationError = bins.reduce((sum, bin) => {
      const weight = bin.count / totalPredictions;
      return sum + weight * Math.abs(bin.confidence - bin.accuracy);
    }, 0);

    return { calibrationError, bins };
  }

  /**
   * Get confidence interval accuracy
   * Measures how often actual values fall within predicted intervals
   */
  getConfidenceIntervalCoverage(modelVersion: string): number {
    const predictions = Array.from(this.predictions.values()).filter(
      p => p.modelVersion === modelVersion && p.actual !== undefined
    );

    if (predictions.length === 0) return 0;

    // This would require storing interval data with predictions
    // For now, return placeholder
    return 95; // Target 95% coverage
  }

  /**
   * Get prediction latency statistics
   */
  getLatencyStats(_modelVersion: string): {
    mean: number;
    median: number;
    p95: number;
    p99: number;
  } {
    // This would require tracking prediction timing
    // Placeholder implementation
    return {
      mean: 50,
      median: 45,
      p95: 100,
      p99: 150,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(modelVersion: string): {
    accuracy: number;
    mae: number;
    mse: number;
    rmse: number;
    mape: number;
    r2Score: number;
    drift: ReturnType<PredictionQualityMonitor['detectDrift']>;
    calibration: ReturnType<PredictionQualityMonitor['getCalibration']>;
    totalPredictions: number;
    recentPredictions: number;
  } {
    const allPredictions = Array.from(this.predictions.values()).filter(
      p => p.modelVersion === modelVersion
    );

    return {
      accuracy: this.getAccuracy(modelVersion),
      mae: this.getMAE(modelVersion),
      mse: this.getMSE(modelVersion),
      rmse: this.getRMSE(modelVersion),
      mape: this.getMAPE(modelVersion),
      r2Score: this.getR2Score(modelVersion),
      drift: this.detectDrift(modelVersion),
      calibration: this.getCalibration(modelVersion),
      totalPredictions: allPredictions.length,
      recentPredictions: this.getRecentPredictions(modelVersion, this.windowSize).length,
    };
  }

  /**
   * Clear old predictions (keep last 1000)
   */
  cleanup(): void {
    const predictions = Array.from(this.predictions.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    if (predictions.length <= 1000) return;

    // Keep only last 1000
    const toKeep = new Set(predictions.slice(0, 1000).map(p => p.id));
    
    for (const [id] of this.predictions) {
      if (!toKeep.has(id)) {
        this.predictions.delete(id);
      }
    }
  }

  /**
   * Export predictions for analysis
   */
  exportPredictions(_modelVersion?: string): PredictionRecord[] {
    const predictions = Array.from(this.predictions.values());
    
    if (_modelVersion) {
      return predictions.filter(p => p.modelVersion === _modelVersion);
    }
    
    return predictions;
  }

  // Private helper methods

  private getRecentPredictions(modelVersion: string, windowSize: number): PredictionRecord[] {
    const predictions = Array.from(this.predictions.values())
      .filter(p => p.modelVersion === modelVersion)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, windowSize);

    return predictions.reverse(); // Return in chronological order
  }

  private updatePerformanceMetrics(record: PredictionRecord): void {
    if (record.actual === undefined) return;

    const performance = this.performanceCache.get(record.modelVersion) || {
      modelId: record.modelVersion,
      predictions: [],
      metrics: {
        mae: 0,
        mse: 0,
        rmse: 0,
        mape: 0,
        r2Score: 0,
        directionAccuracy: 0,
      },
      driftDetection: {
        isDrifting: false,
        driftScore: 0,
        lastChecked: new Date(),
      },
    };

    performance.predictions.push({
      timestamp: record.timestamp,
      predicted: record.predicted,
      actual: record.actual,
      error: Math.abs(record.predicted - record.actual),
    });

    // Keep only recent predictions
    if (performance.predictions.length > 1000) {
      performance.predictions.shift();
    }

    // Update metrics
    performance.metrics = {
      mae: this.getMAE(record.modelVersion),
      mse: this.getMSE(record.modelVersion),
      rmse: this.getRMSE(record.modelVersion),
      mape: this.getMAPE(record.modelVersion),
      r2Score: this.getR2Score(record.modelVersion),
      directionAccuracy: this.getAccuracy(record.modelVersion),
    };

    // Check for drift periodically
    if (performance.predictions.length % 50 === 0) {
      const drift = this.detectDrift(record.modelVersion);
      performance.driftDetection = {
        isDrifting: drift.isDrifting,
        driftScore: drift.driftScore,
        lastChecked: new Date(),
      };
    }

    this.performanceCache.set(record.modelVersion, performance);
  }
}

export const predictionQualityMonitor = new PredictionQualityMonitor();
