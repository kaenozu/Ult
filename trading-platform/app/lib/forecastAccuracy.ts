/**
 * Forecast Accuracy Service
 * 
 * Enhanced accuracy calculation engine with confidence distribution
 * and dynamic accuracy tracking.
 */

import { OHLCV, Signal } from '../types';

export interface Prediction {
  symbol: string;
  date: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  predictedChange: number;
  targetPrice: number;
  stopLoss: number;
  lower: number;
  upper: number;
}

export interface AccuracyMetrics {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  directionalAccuracy: number;
  confidenceDistribution: Record<string, number>;
  accuracyByConfidence: Record<string, number>;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
}

export interface PredictionHistory {
  predictions: Prediction[];
  actuals: number[];
  dates: string[];
}

// Constants
const CONFIDENCE_BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const MIN_PREDICTIONS_FOR_STATS = 10;

class ForecastAccuracyService {
  /**
   * Calculate accuracy metrics from prediction history
   */
  calculateAccuracy(
    predictions: Prediction[],
    actuals: number[]
  ): AccuracyMetrics {
    if (predictions.length === 0 || actuals.length === 0) {
      return this.getEmptyMetrics();
    }

    const minLength = Math.min(predictions.length, actuals.length);
    let correct = 0;
    let directionalCorrect = 0;
    const confidenceDist: Record<string, number> = {};
    const accuracyByConfidence: Record<string, number> = {};
    const profits: number[] = [];
    const losses: number[] = [];

    // Initialize confidence buckets
    for (let i = 0; i < CONFIDENCE_BUCKETS.length - 1; i++) {
      const bucket = `${CONFIDENCE_BUCKETS[i]}-${CONFIDENCE_BUCKETS[i + 1]}`;
      confidenceDist[bucket] = 0;
      accuracyByConfidence[bucket] = 0;
    }

    for (let i = 0; i < minLength; i++) {
      const pred = predictions[i];
      const actual = actuals[i];

      // Update confidence distribution
      const bucketIndex = Math.floor(pred.confidence / 10);
      const bucket = `${bucketIndex * 10}-${(bucketIndex + 1) * 10}`;
      confidenceDist[bucket] = (confidenceDist[bucket] || 0) + 1;

      // Check if prediction is in range
      const inRange = actual >= pred.lower && actual <= pred.upper;
      if (inRange) {
        correct++;
        accuracyByConfidence[bucket] = (accuracyByConfidence[bucket] || 0) + 1;
      }

      // Check directional accuracy
      const predictedDirection = pred.type === 'BUY' ? 1 : pred.type === 'SELL' ? -1 : 0;
      const actualDirection = actual > pred.stopLoss ? 1 : actual < pred.stopLoss ? -1 : 0;
      if (predictedDirection === actualDirection && predictedDirection !== 0) {
        directionalCorrect++;
      }

      // Track profits/losses
      const profit = (actual - pred.stopLoss) / pred.stopLoss * 100;
      if (profit > 0) {
        profits.push(profit);
      } else {
        losses.push(Math.abs(profit));
      }
    }

    // Calculate accuracy by confidence bucket
    for (const bucket in confidenceDist) {
      if (confidenceDist[bucket] > 0) {
        accuracyByConfidence[bucket] = (accuracyByConfidence[bucket] / confidenceDist[bucket]) * 100;
      }
    }

    // Calculate additional metrics
    const totalPredictions = minLength;
    const accuracy = (correct / totalPredictions) * 100;
    const directionalAccuracy = (directionalCorrect / totalPredictions) * 100;

    const avgProfit = profits.length > 0
      ? profits.reduce((a, b) => a + b, 0) / profits.length
      : 0;
    const avgLoss = losses.length > 0
      ? losses.reduce((a, b) => a + b, 0) / losses.length
      : 0;

    const grossProfit = profits.reduce((a, b) => a + b, 0);
    const grossLoss = losses.reduce((a, b) => a + b, 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let equity = 100;
    for (let i = 0; i < minLength; i++) {
      const pred = predictions[i];
      const actual = actuals[i];
      const profit = (actual - pred.stopLoss) / pred.stopLoss;
      equity *= (1 + profit);
      if (equity > peak) peak = equity;
      const drawdown = (peak - equity) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return {
      totalPredictions,
      correctPredictions: correct,
      accuracy,
      directionalAccuracy,
      confidenceDistribution: confidenceDist,
      accuracyByConfidence,
      averageProfit: avgProfit,
      averageLoss: avgLoss,
      profitFactor,
      maxDrawdown
    };
  }

  /**
   * Calculate real-time accuracy using sliding window
   */
  calculateRealTimeAccuracy(
    symbol: string,
    data: OHLCV[],
    signalGenerator: (data: OHLCV[], index: number) => Signal | null,
    windowSize: number = 20
  ): AccuracyMetrics {
    if (data.length < windowSize + 10) {
      return this.getEmptyMetrics();
    }

    const predictions: Prediction[] = [];
    const actuals: number[] = [];

    for (let i = windowSize; i < data.length - 5; i++) {
      const signal = signalGenerator(data, i);
      if (!signal || signal.type === 'HOLD') continue;

      const currentPrice = data[i].close;
      const futurePrice = data[i + 5].close;
      const atr = signal.atr || (currentPrice * 0.02);

      const prediction: Prediction = {
        symbol,
        date: data[i].date,
        type: signal.type,
        confidence: signal.confidence,
        predictedChange: signal.predictedChange,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
        lower: currentPrice - atr * 2,
        upper: currentPrice + atr * 2
      };

      predictions.push(prediction);
      actuals.push(futurePrice);
    }

    return this.calculateAccuracy(predictions, actuals);
  }

  /**
   * Get accuracy trend over time
   */
  getAccuracyTrend(
    predictions: Prediction[],
    actuals: number[],
    windowSize: number = 20
  ): { date: string; accuracy: number }[] {
    if (predictions.length < windowSize) return [];

    const trend: { date: string; accuracy: number }[] = [];

    for (let i = windowSize; i <= predictions.length; i++) {
      const windowPredictions = predictions.slice(i - windowSize, i);
      const windowActuals = actuals.slice(i - windowSize, i);
      const metrics = this.calculateAccuracy(windowPredictions, windowActuals);
      trend.push({
        date: predictions[i - 1].date,
        accuracy: metrics.accuracy
      });
    }

    return trend;
  }

  /**
   * Get confidence-weighted accuracy
   */
  getConfidenceWeightedAccuracy(
    predictions: Prediction[],
    actuals: number[]
  ): number {
    if (predictions.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    const minLength = Math.min(predictions.length, actuals.length);
    for (let i = 0; i < minLength; i++) {
      const pred = predictions[i];
      const actual = actuals[i];
      const inRange = actual >= pred.lower && actual <= pred.upper;
      const weight = pred.confidence / 100;

      weightedSum += inRange ? weight : 0;
      totalWeight += weight;
    }

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  }

  /**
   * Get prediction error statistics
   */
  getPredictionErrorStats(
    predictions: Prediction[],
    actuals: number[]
  ): {
    meanError: number;
    medianError: number;
    maxError: number;
    minError: number;
    stdDev: number;
  } {
    if (predictions.length === 0 || actuals.length === 0) {
      return {
        meanError: 0,
        medianError: 0,
        maxError: 0,
        minError: 0,
        stdDev: 0
      };
    }

    const minLength = Math.min(predictions.length, actuals.length);
    const errors: number[] = [];

    for (let i = 0; i < minLength; i++) {
      const pred = predictions[i];
      const actual = actuals[i];
      const error = Math.abs(actual - pred.targetPrice) / pred.targetPrice * 100;
      errors.push(error);
    }

    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const sortedErrors = [...errors].sort((a, b) => a - b);
    const medianError = sortedErrors[Math.floor(sortedErrors.length / 2)];
    const maxError = Math.max(...errors);
    const minError = Math.min(...errors);

    const variance = errors.reduce((sum, e) => sum + Math.pow(e - meanError, 2), 0) / errors.length;
    const stdDev = Math.sqrt(variance);

    return {
      meanError,
      medianError,
      maxError,
      minError,
      stdDev
    };
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): AccuracyMetrics {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      directionalAccuracy: 0,
      confidenceDistribution: {},
      accuracyByConfidence: {},
      averageProfit: 0,
      averageLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0
    };
  }

  /**
   * Generate accuracy report
   */
  generateAccuracyReport(metrics: AccuracyMetrics): string {
    const lines: string[] = [];
    lines.push('=== 予測精度レポート ===');
    lines.push(`総予測数: ${metrics.totalPredictions}`);
    lines.push(`的中数: ${metrics.correctPredictions}`);
    lines.push(`的中率: ${metrics.accuracy.toFixed(1)}%`);
    lines.push(`方向的中率: ${metrics.directionalAccuracy.toFixed(1)}%`);
    lines.push(`平均利益: ${metrics.averageProfit.toFixed(2)}%`);
    lines.push(`平均損失: ${metrics.averageLoss.toFixed(2)}%`);
    lines.push(`プロフィットファクター: ${metrics.profitFactor.toFixed(2)}`);
    lines.push(`最大ドローダウン: ${metrics.maxDrawdown.toFixed(1)}%`);
    lines.push('');
    lines.push('=== 信頼度別分布 ===');
    for (const bucket in metrics.confidenceDistribution) {
      const count = metrics.confidenceDistribution[bucket];
      const accuracy = metrics.accuracyByConfidence[bucket] || 0;
      lines.push(`${bucket}%: ${count}件 (精度: ${accuracy.toFixed(1)}%)`);
    }

    return lines.join('\n');
  }
}

export const forecastAccuracyService = new ForecastAccuracyService();
