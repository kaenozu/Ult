/**
 * Walk-Forward Analysis Extension for Backtest Engine
 * 
 * Implements Walk-Forward validation for ML models to prevent overfitting
 * and provide realistic performance estimates.
 */

import { OHLCV } from '@/app/types';
import { TrainingData, WalkForwardResult, MLBacktestConfig } from '../ml/types';
import { EnsembleStrategy } from '../ml/EnsembleStrategy';
import { FeatureEngineeringService } from '../ml/FeatureEngineering';

export interface WalkForwardConfig {
  trainWindowSize: number; // days
  testWindowSize: number; // days
  stepSize: number; // days to move window forward
  minTrainingSamples: number;
  retrainFrequency: number; // retrain every N test windows
}

export class WalkForwardAnalysis {
  private featureService: FeatureEngineeringService;
  private ensembleStrategy: EnsembleStrategy;

  constructor() {
    this.featureService = new FeatureEngineeringService();
    this.ensembleStrategy = new EnsembleStrategy();
  }

  /**
   * Perform Walk-Forward validation
   */
  async runWalkForward(
    data: OHLCV[],
    config: WalkForwardConfig
  ): Promise<{
    results: WalkForwardResult[];
    overallMetrics: {
      averageReturn: number;
      averageSharpe: number;
      winRate: number;
      avgMaxDrawdown: number;
    };
  }> {
    const results: WalkForwardResult[] = [];
    let windowId = 0;
    let startIdx = 0;

    while (startIdx + config.trainWindowSize + config.testWindowSize < data.length) {
      const trainEndIdx = startIdx + config.trainWindowSize;
      const testEndIdx = Math.min(trainEndIdx + config.testWindowSize, data.length);

      // Extract train and test windows
      const trainData = data.slice(startIdx, trainEndIdx);
      const testData = data.slice(trainEndIdx, testEndIdx);

      console.log(
        `Walk-Forward Window ${windowId + 1}: Train ${trainData.length} samples, Test ${testData.length} samples`
      );

      // Extract features
      const trainFeatures = this.featureService.extractFeatures(trainData, 200);
      const trainLabels = this.calculateReturns(trainData.slice(200));

      // Normalize features
      const { normalized: normalizedTrain, scalers } = this.featureService.normalizeFeatures(trainFeatures);

      // Prepare training data
      const trainingData: TrainingData = {
        features: trainFeatures,
        labels: trainLabels,
        dates: trainData.slice(200).map(d => new Date(d.date)),
      };

      // Train models on this window (only if needed)
      if (windowId % config.retrainFrequency === 0) {
        console.log(`Retraining models for window ${windowId + 1}...`);
        try {
          await this.ensembleStrategy.trainAllModels(trainingData);
        } catch (error) {
          console.error('Error training models:', error);
          // Skip this window if training fails
          startIdx += config.stepSize;
          windowId++;
          continue;
        }
      }

      // Test on out-of-sample data
      const testFeatures = this.featureService.extractFeatures(testData, 200);
      const testLabels = this.calculateReturns(testData.slice(200));

      // Make predictions
      const predictions: { date: Date; predicted: number; actual: number }[] = [];
      
      for (let i = 0; i < testFeatures.length; i++) {
        try {
          // Prepare sequence
          const sequence = this.prepareSequence(testFeatures, i, 20);
          
          // Get ensemble prediction
          const prediction = await this.ensembleStrategy.predictEnsemble(sequence);
          
          predictions.push({
            date: new Date(testData[200 + i].date),
            predicted: prediction.ensembleResult.prediction,
            actual: testLabels[i],
          });
        } catch (error) {
          console.error('Error making prediction:', error);
        }
      }

      // Calculate test metrics
      const testMetrics = this.calculateTestMetrics(predictions);

      // Create result
      const result: WalkForwardResult = {
        windowId: windowId + 1,
        trainStartDate: new Date(trainData[0].date),
        trainEndDate: new Date(trainData[trainData.length - 1].date),
        testStartDate: new Date(testData[0].date),
        testEndDate: new Date(testData[testData.length - 1].date),
        trainMetrics: {
          loss: 0, // Would need to store from training
          accuracy: 0,
        },
        testMetrics,
        predictions,
      };

      results.push(result);

      // Move window forward
      startIdx += config.stepSize;
      windowId++;
    }

    // Calculate overall metrics
    const overallMetrics = this.calculateOverallMetrics(results);

    return { results, overallMetrics };
  }

  /**
   * Perform Time Series Cross-Validation
   */
  async timeSeriesCrossValidation(
    data: OHLCV[],
    nSplits: number
  ): Promise<{
    splits: {
      trainIndices: number[];
      testIndices: number[];
      metrics: { mae: number; rmse: number; directionAccuracy: number };
    }[];
    averageMetrics: { mae: number; rmse: number; directionAccuracy: number };
  }> {
    const splits = [];
    const testSize = Math.floor(data.length / (nSplits + 1));

    for (let i = 0; i < nSplits; i++) {
      const trainEndIdx = (i + 1) * testSize;
      const testEndIdx = (i + 2) * testSize;

      const trainIndices = Array.from({ length: trainEndIdx }, (_, idx) => idx);
      const testIndices = Array.from(
        { length: testEndIdx - trainEndIdx },
        (_, idx) => trainEndIdx + idx
      );

      // Extract and prepare data
      const trainData = data.slice(0, trainEndIdx);
      const testData = data.slice(trainEndIdx, testEndIdx);

      // Extract features
      const trainFeatures = this.featureService.extractFeatures(trainData, 200);
      const trainLabels = this.calculateReturns(trainData.slice(200));

      const trainingData: TrainingData = {
        features: trainFeatures,
        labels: trainLabels,
        dates: trainData.slice(200).map(d => new Date(d.date)),
      };

      // Train on this fold
      await this.ensembleStrategy.trainAllModels(trainingData);

      // Test
      const testFeatures = this.featureService.extractFeatures(testData, 200);
      const testLabels = this.calculateReturns(testData.slice(200));

      const predictions: number[] = [];
      for (let j = 0; j < testFeatures.length; j++) {
        const sequence = this.prepareSequence(testFeatures, j, 20);
        const prediction = await this.ensembleStrategy.predictEnsemble(sequence);
        predictions.push(prediction.ensembleResult.prediction);
      }

      // Calculate metrics
      const mae = predictions.reduce((sum, pred, idx) => sum + Math.abs(pred - testLabels[idx]), 0) / predictions.length;
      const mse = predictions.reduce((sum, pred, idx) => sum + Math.pow(pred - testLabels[idx], 2), 0) / predictions.length;
      const rmse = Math.sqrt(mse);

      // Direction accuracy
      let correctDirections = 0;
      for (let j = 1; j < predictions.length; j++) {
        const predDirection = predictions[j] > predictions[j - 1] ? 1 : -1;
        const actualDirection = testLabels[j] > testLabels[j - 1] ? 1 : -1;
        if (predDirection === actualDirection) correctDirections++;
      }
      const directionAccuracy = correctDirections / (predictions.length - 1);

      splits.push({
        trainIndices,
        testIndices,
        metrics: { mae, rmse, directionAccuracy },
      });
    }

    // Calculate average metrics
    const averageMetrics = {
      mae: splits.reduce((sum, s) => sum + s.metrics.mae, 0) / splits.length,
      rmse: splits.reduce((sum, s) => sum + s.metrics.rmse, 0) / splits.length,
      directionAccuracy: splits.reduce((sum, s) => sum + s.metrics.directionAccuracy, 0) / splits.length,
    };

    return { splits, averageMetrics };
  }

  /**
   * Detect overfitting by comparing train and test performance
   */
  detectOverfitting(
    trainMetrics: { mae: number; rmse: number },
    testMetrics: { mae: number; rmse: number }
  ): {
    isOverfit: boolean;
    overfitScore: number;
    recommendation: string;
  } {
    const maeRatio = testMetrics.mae / (trainMetrics.mae || 1);
    const rmseRatio = testMetrics.rmse / (trainMetrics.rmse || 1);
    const overfitScore = (maeRatio + rmseRatio) / 2;

    const threshold = 1.5; // Test error > 1.5x train error indicates overfitting
    const isOverfit = overfitScore > threshold;

    let recommendation = 'Model generalization is good';
    if (isOverfit) {
      recommendation = `Overfitting detected (score: ${overfitScore.toFixed(2)}). Consider: 1) Simplifying model, 2) Adding regularization, 3) Collecting more data, 4) Reducing features`;
    } else if (overfitScore > 1.2) {
      recommendation = 'Some overfitting detected. Monitor performance closely.';
    }

    return {
      isOverfit,
      overfitScore,
      recommendation,
    };
  }

  /**
   * Benchmark against Buy & Hold strategy
   */
  benchmarkBuyAndHold(
    predictions: WalkForwardResult[]
  ): {
    mlStrategy: { return: number; sharpe: number };
    buyHold: { return: number; sharpe: number };
    outperformance: number;
  } {
    // Calculate ML strategy returns
    const mlReturns = predictions.flatMap(p => 
      p.predictions.map(pred => pred.predicted / 100)
    );

    // Calculate buy & hold returns
    const buyHoldReturns = predictions.flatMap(p =>
      p.predictions.map(pred => pred.actual / 100)
    );

    const mlReturn = mlReturns.reduce((sum, r) => sum + r, 0);
    const buyHoldReturn = buyHoldReturns.reduce((sum, r) => sum + r, 0);

    const mlSharpe = this.calculateSharpe(mlReturns);
    const buyHoldSharpe = this.calculateSharpe(buyHoldReturns);

    const outperformance = mlReturn - buyHoldReturn;

    return {
      mlStrategy: { return: mlReturn, sharpe: mlSharpe },
      buyHold: { return: buyHoldReturn, sharpe: buyHoldSharpe },
      outperformance,
    };
  }

  // Private helper methods

  private calculateReturns(data: OHLCV[]): number[] {
    return data.slice(1).map((d, i) => {
      const prevPrice = data[i].close;
      return prevPrice === 0 ? 0 : ((d.close - prevPrice) / prevPrice) * 100;
    });
  }

  private prepareSequence(features: unknown[], index: number, sequenceLength: number): number[][] {
    const result: number[][] = [];
    const start = Math.max(0, index - sequenceLength + 1);
    
    for (let i = start; i <= index; i++) {
      result.push(this.featuresToArray(features[i]));
    }
    
    // Pad if necessary
    while (result.length < sequenceLength) {
      result.unshift(new Array(result[0]?.length || 50).fill(0));
    }
    
    return result;
  }

  private featuresToArray(feature: unknown): number[] {
    const featureObj = feature as Record<string, unknown>;
    const result: number[] = [];
    
    for (const key in featureObj) {
      const value = featureObj[key];
      if (typeof value === 'number') {
        result.push(value);
      } else if (Array.isArray(value)) {
        result.push(...value.filter(v => typeof v === 'number'));
      }
    }
    
    return result;
  }

  private calculateTestMetrics(predictions: { predicted: number; actual: number }[]): {
    returns: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  } {
    if (predictions.length === 0) {
      return { returns: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0 };
    }

    // Calculate returns based on prediction accuracy
    const returns = predictions.map(p => {
      const direction = p.predicted > 0 ? 1 : -1;
      return direction * p.actual / 100;
    });

    const totalReturn = returns.reduce((sum, r) => sum + r, 0);
    const sharpeRatio = this.calculateSharpe(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    
    const winningTrades = returns.filter(r => r > 0).length;
    const winRate = (winningTrades / returns.length) * 100;

    return {
      returns: totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
    };
  }

  private calculateSharpe(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    
    if (std === 0) return 0;
    
    // Annualize (assuming daily returns)
    return (mean / std) * Math.sqrt(252);
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const r of returns) {
      cumulative += r;
      peak = Math.max(peak, cumulative);
      const drawdown = (peak - cumulative) / (peak || 1);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown * 100;
  }

  private calculateOverallMetrics(results: WalkForwardResult[]): {
    averageReturn: number;
    averageSharpe: number;
    winRate: number;
    avgMaxDrawdown: number;
  } {
    if (results.length === 0) {
      return { averageReturn: 0, averageSharpe: 0, winRate: 0, avgMaxDrawdown: 0 };
    }

    return {
      averageReturn: results.reduce((sum, r) => sum + r.testMetrics.returns, 0) / results.length,
      averageSharpe: results.reduce((sum, r) => sum + r.testMetrics.sharpeRatio, 0) / results.length,
      winRate: results.reduce((sum, r) => sum + r.testMetrics.winRate, 0) / results.length,
      avgMaxDrawdown: results.reduce((sum, r) => sum + r.testMetrics.maxDrawdown, 0) / results.length,
    };
  }
}

export const walkForwardAnalysis = new WalkForwardAnalysis();
