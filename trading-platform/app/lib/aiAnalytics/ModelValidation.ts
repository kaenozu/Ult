/**
 * ModelValidation.ts
 * 
 * 機械学習モデルの検証・評価クラス。
 * 時系列交差検証、過学習検知、モデル性能評価を提供します。
 */

import { OHLCV } from '../../types/shared';

/**
 * 訓練データセット
 */
import { logger } from '@/app/core/logger';
export interface TrainingData {
  features: number[][];
  targets: number[];
  timestamps: string[];
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  fold?: number;
  timestamp?: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number;
  mae: number;
  prediction: number[];
  actual: number[];
}

/**
 * 交差検証結果
 */
export interface CrossValidationResult {
  meanAccuracy: number;
  stdAccuracy: number;
  meanPrecision: number;
  meanRecall: number;
  meanF1Score: number;
  meanMSE: number;
  meanMAE: number;
  results: ValidationResult[];
  isOverfitting: boolean;
  overfittingScore: number;
}

/**
 * 時系列交差検証結果
 */
export interface TimeSeriesCVResult {
  results: ValidationResult[];
  windowSize: number;
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'degrading';
  confidenceInterval: [number, number];
}

/**
 * パラメータ範囲
 */
export interface ParameterRange {
  name: string;
  min: number;
  max: number;
  step: number;
}

/**
 * 最適パラメータ
 */
export interface OptimalParameters {
  parameters: Record<string, number>;
  accuracy: number;
  validationScore: number;
}

/**
 * モデル検証クラス
 */
export class ModelValidation {
  private readonly OVERFITTING_THRESHOLD = 0.1; // 10%の精度差で過学習と判定

  /**
   * K-分割交差検証を実行
   * 
   * @param data - 訓練データ
   * @param predictFn - 予測関数
   * @param folds - 分割数（デフォルト: 5）
   * @returns 交差検証結果
   */
  crossValidate(
    data: TrainingData,
    predictFn: (features: number[][]) => number[],
    folds: number = 5
  ): CrossValidationResult {
    if (data.features.length < folds) {
      throw new Error(`Insufficient data for ${folds}-fold cross-validation`);
    }

    const results: ValidationResult[] = [];
    const foldSize = Math.floor(data.features.length / folds);

    for (let i = 0; i < folds; i++) {
      const valStart = i * foldSize;
      const valEnd = (i + 1) * foldSize;

      // 検証セットを除外して訓練セットを作成
      const trainFeatures = [
        ...data.features.slice(0, valStart),
        ...data.features.slice(valEnd),
      ];
      const trainTargets = [
        ...data.targets.slice(0, valStart),
        ...data.targets.slice(valEnd),
      ];

      const valFeatures = data.features.slice(valStart, valEnd);
      const valTargets = data.targets.slice(valStart, valEnd);

      // 予測実行
      const predictions = predictFn(valFeatures);

      // 評価指標の計算
      const metrics = this.calculateMetrics(predictions, valTargets);

      results.push({
        fold: i + 1,
        ...metrics,
        prediction: predictions,
        actual: valTargets,
      });
    }

    // 平均値の計算
    const meanAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / folds;
    const meanPrecision = results.reduce((sum, r) => sum + r.precision, 0) / folds;
    const meanRecall = results.reduce((sum, r) => sum + r.recall, 0) / folds;
    const meanF1Score = results.reduce((sum, r) => sum + r.f1Score, 0) / folds;
    const meanMSE = results.reduce((sum, r) => sum + r.mse, 0) / folds;
    const meanMAE = results.reduce((sum, r) => sum + r.mae, 0) / folds;

    // 標準偏差の計算
    const accuracies = results.map(r => r.accuracy);
    const stdAccuracy = this.calculateStd(accuracies);

    // 過学習の検知
    const { isOverfitting, overfittingScore } = this.detectOverfitting(results);

    return {
      meanAccuracy,
      stdAccuracy,
      meanPrecision,
      meanRecall,
      meanF1Score,
      meanMSE,
      meanMAE,
      results,
      isOverfitting,
      overfittingScore,
    };
  }

  /**
   * 時系列交差検証（Walk-forward validation）を実行
   * 
   * @param data - 訓練データ
   * @param predictFn - 予測関数
   * @param windowSize - ウィンドウサイズ（デフォルト: 252営業日）
   * @returns 時系列交差検証結果
   */
  timeSeriesCrossValidate(
    data: TrainingData,
    predictFn: (features: number[][]) => number[],
    windowSize: number = 252
  ): TimeSeriesCVResult {
    if (data.features.length <= windowSize) {
      throw new Error(`Insufficient data for time series cross-validation with window size ${windowSize}`);
    }

    const results: ValidationResult[] = [];

    // ローリングウィンドウでの検証
    for (let i = windowSize; i < data.features.length; i++) {
      const trainFeatures = data.features.slice(Math.max(0, i - windowSize), i);
      const trainTargets = data.targets.slice(Math.max(0, i - windowSize), i);

      const testFeatures = [data.features[i]];
      const testTargets = [data.targets[i]];

      // 予測実行
      const predictions = predictFn(testFeatures);

      // 評価指標の計算
      const metrics = this.calculateMetrics(predictions, testTargets);

      results.push({
        timestamp: data.timestamps[i],
        ...metrics,
        prediction: predictions,
        actual: testTargets,
      });
    }

    // 平均精度の計算
    const averageAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;

    // トレンドの分析
    const trend = this.analyzeTrend(results.map(r => r.accuracy));

    // 信頼区間の計算（95%）
    const accuracies = results.map(r => r.accuracy);
    const mean = averageAccuracy;
    const std = this.calculateStd(accuracies);
    const confidenceInterval: [number, number] = [
      mean - 1.96 * std,
      mean + 1.96 * std,
    ];

    return {
      results,
      windowSize,
      averageAccuracy,
      trend,
      confidenceInterval,
    };
  }

  /**
   * グリッドサーチによるパラメータ最適化
   * 
   * @param data - 訓練データ
   * @param predictFn - パラメータを受け取る予測関数
   * @param paramRanges - パラメータ範囲の配列
   * @returns 最適パラメータ
   */
  optimizeParameters(
    data: TrainingData,
    predictFn: (features: number[][], params: Record<string, number>) => number[],
    paramRanges: ParameterRange[]
  ): OptimalParameters {
    let bestParams: Record<string, number> = {};
    let bestScore = -Infinity;
    let bestAccuracy = 0;

    // グリッドサーチの実行
    const paramCombinations = this.generateParamCombinations(paramRanges);

    for (const params of paramCombinations) {
      // 交差検証で評価
      const cvResult = this.crossValidate(
        data,
        (features) => predictFn(features, params),
        3 // 3-fold CV for faster optimization
      );

      // バリデーションスコアの計算（過学習を考慮）
      const validationScore = cvResult.meanAccuracy - cvResult.overfittingScore * 0.5;

      if (validationScore > bestScore) {
        bestScore = validationScore;
        bestAccuracy = cvResult.meanAccuracy;
        bestParams = params;
      }
    }

    return {
      parameters: bestParams,
      accuracy: bestAccuracy,
      validationScore: bestScore,
    };
  }

  /**
   * 評価指標を計算
   */
  private calculateMetrics(predictions: number[], actual: number[]): Omit<ValidationResult, 'fold' | 'timestamp' | 'prediction' | 'actual'> {
    if (predictions.length !== actual.length || predictions.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        mse: 0,
        mae: 0,
      };
    }

    // 回帰問題として扱う
    const mse = predictions.reduce((sum, pred, i) => {
      return sum + Math.pow(pred - actual[i], 2);
    }, 0) / predictions.length;

    const mae = predictions.reduce((sum, pred, i) => {
      return sum + Math.abs(pred - actual[i]);
    }, 0) / predictions.length;

    // 方向性の正確性（上昇/下降の予測が合っているか）
    let correct = 0;
    let truePositive = 0;
    let falsePositive = 0;
    let trueNegative = 0;
    let falseNegative = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predictedUp = predictions[i] > 0;
      const actualUp = actual[i] > 0;

      if (predictedUp === actualUp) {
        correct++;
        if (predictedUp) truePositive++;
        else trueNegative++;
      } else {
        if (predictedUp) falsePositive++;
        else falseNegative++;
      }
    }

    const accuracy = correct / predictions.length;

    // Precision と Recall の計算
    const precision = truePositive + falsePositive > 0
      ? truePositive / (truePositive + falsePositive)
      : 0;

    const recall = truePositive + falseNegative > 0
      ? truePositive / (truePositive + falseNegative)
      : 0;

    // F1スコアの計算
    const f1Score = precision + recall > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      mse,
      mae,
    };
  }

  /**
   * 過学習を検知
   */
  private detectOverfitting(results: ValidationResult[]): { isOverfitting: boolean; overfittingScore: number } {
    if (results.length < 2) {
      return { isOverfitting: false, overfittingScore: 0 };
    }

    const accuracies = results.map(r => r.accuracy);
    const maxAccuracy = Math.max(...accuracies);
    const minAccuracy = Math.min(...accuracies);
    const variance = this.calculateStd(accuracies);

    // 分散が大きい場合、過学習の可能性
    const overfittingScore = variance > this.OVERFITTING_THRESHOLD ? variance : 0;
    const isOverfitting = (maxAccuracy - minAccuracy) > this.OVERFITTING_THRESHOLD;

    return { isOverfitting, overfittingScore };
  }

  /**
   * 標準偏差を計算
   */
  private calculateStd(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * トレンドを分析（線形回帰で傾きを計算）
   */
  private analyzeTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 3) return 'stable';

    // 線形回帰で傾きを計算
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, v) => sum + v, 0);
    const sumY = y.reduce((sum, v) => sum + v, 0);
    const sumXY = x.reduce((sum, v, i) => sum + v * y[i], 0);
    const sumX2 = x.reduce((sum, v) => sum + v * v, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // 傾きでトレンドを判定
    if (slope > 0.01) return 'improving';
    if (slope < -0.01) return 'degrading';
    return 'stable';
  }

  /**
   * パラメータの組み合わせを生成
   */
  private generateParamCombinations(paramRanges: ParameterRange[]): Array<Record<string, number>> {
    if (paramRanges.length === 0) return [{}];

    const combinations: Array<Record<string, number>> = [];
    
    const generate = (index: number, current: Record<string, number>) => {
      if (index === paramRanges.length) {
        combinations.push({ ...current });
        return;
      }

      const range = paramRanges[index];
      for (let value = range.min; value <= range.max; value += range.step) {
        current[range.name] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});

    // 組み合わせが多すぎる場合は制限（最大100個）
    if (combinations.length > 100) {
      logger.warn(`Too many parameter combinations (${combinations.length}). Sampling 100 combinations.`);
      const step = Math.floor(combinations.length / 100);
      return combinations.filter((_, i) => i % step === 0).slice(0, 100);
    }

    return combinations;
  }
}

export const modelValidation = new ModelValidation();
