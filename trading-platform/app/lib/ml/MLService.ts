/**
 * MLService.ts
 *
 * ML予測精度改善の統合サービス
 * 特徴量エンジニアリング、アンサンブルモデル、ドリフト検出を統合します。
 */

import { OHLCV } from '../../types/shared';
import { featureEngineering, AllFeatures } from './FeatureEngineering';
import { ensembleModel, EnsemblePrediction } from './EnsembleModel';
import { modelDriftDetector, DriftDetectionResult } from './ModelDriftDetector';

/**
 * 予測結果とメタデータ
 */
export interface MLPredictionResult {
  prediction: EnsemblePrediction;
  features: AllFeatures;
  driftDetection: DriftDetectionResult;
  timestamp: string;
}

/**
 * 再学習推奨
 */
export interface RetrainingRecommendation {
  shouldRetrain: boolean;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  affectedModels: string[];
}

/**
 * MLサービスクラス
 */
export class MLService {
  private isInitialized = false;

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    // 必要に応じて初期化処理を実装
    this.isInitialized = true;
  }

  /**
   * 予測を実行
   */
  async predict(
    symbol: string,
    data: OHLCV[],
    macroData?: Parameters<typeof featureEngineering.calculateAllFeatures>[1],
    sentimentData?: Parameters<typeof featureEngineering.calculateAllFeatures>[2]
  ): Promise<MLPredictionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 特徴量を計算
    const features = featureEngineering.calculateAllFeatures(data, macroData, sentimentData);

    // アンサンブル予測を実行
    const prediction = ensembleModel.predict(
      data,
      features,
      macroData,
      sentimentData
    );

    // ドリフト検出を実行
    const driftDetection = modelDriftDetector.detectDrift('ENSEMBLE');

    return {
      prediction,
      features,
      driftDetection,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 予測結果を記録
   */
  recordPredictionResult(
    predicted: number,
    actual: number,
    confidence: number,
    marketRegime: string
  ): void {
    modelDriftDetector.recordPrediction(
      'ENSEMBLE',
      predicted,
      actual,
      confidence,
      marketRegime
    );
  }

  /**
   * 再学習の必要性を評価
   */
  evaluateRetrainingNeed(): RetrainingRecommendation {
    const driftResult = modelDriftDetector.detectDrift();
    const modelStats = ensembleModel.getModelPerformanceStats();

    const shouldRetrain = driftResult.isDriftDetected;
    const urgency = this.mapDriftSeverityToUrgency(driftResult.driftSeverity);

    const affectedModels: string[] = [];
    if (shouldRetrain) {
      affectedModels.push('ENSEMBLE');

      // 個別モデルのドリフトもチェック
      for (const [modelType, _] of modelStats) {
        const modelDrift = modelDriftDetector.detectDrift(modelType);
        if (modelDrift.isDriftDetected) {
          affectedModels.push(modelType);
        }
      }
    }

    const reason = shouldRetrain
      ? `ドリフト検出: ${driftResult.reason} (${driftResult.driftSeverity} 重大度)`
      : 'モデルは正常に機能しています';

    return {
      shouldRetrain,
      urgency,
      reason,
      affectedModels,
    };
  }

  /**
   * ドリフト重大度を緊急度にマッピング
   */
  private mapDriftSeverityToUrgency(
    severity: DriftDetectionResult['driftSeverity']
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (severity) {
      case 'NONE':
        return 'LOW';
      case 'LOW':
        return 'LOW';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'HIGH':
        return 'HIGH';
      case 'CRITICAL':
        return 'CRITICAL';
      default:
        return 'LOW';
    }
  }

  /**
   * モデルパフォーマンスサマリーを取得
   */
  getModelPerformanceSummary(): {
    ensembleWeights: Record<string, number>;
    modelStats: ReturnType<typeof ensembleModel.getModelPerformanceStats>;
    driftStatus: DriftDetectionResult;
    statistics: ReturnType<typeof modelDriftDetector.getStatisticsSummary>;
  } {
    return {
      ensembleWeights: ensembleModel.getCurrentWeights() as unknown as Record<string, number>,
      modelStats: ensembleModel.getModelPerformanceStats(),
      driftStatus: modelDriftDetector.detectDrift(),
      statistics: modelDriftDetector.getStatisticsSummary(),
    };
  }

  /**
   * 特徴量の重要性分析
   */
  analyzeFeatureImportance(features: AllFeatures): {
    technical: Array<{ name: string; value: number; importance: 'HIGH' | 'MEDIUM' | 'LOW' }>;
    timeSeries: Array<{ name: string; value: number; importance: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  } {
    const technical = this.analyzeTechnicalFeatures(features.technical);
    const timeSeries = this.analyzeTimeSeriesFeatures(features.timeSeries);

    return { technical, timeSeries };
  }

  /**
   * テクニカル特徴量の重要性を分析
   */
  private analyzeTechnicalFeatures(features: AllFeatures['technical']) {
    return [
      { name: 'RSI', value: features.rsi, importance: this.getImportance(Math.abs(features.rsi - 50), 0, 50) as 'HIGH' | 'MEDIUM' | 'LOW' },
      { name: 'Momentum10', value: features.momentum10, importance: this.getImportance(Math.abs(features.momentum10), 0, 10) as 'HIGH' | 'MEDIUM' | 'LOW' },
      { name: 'MACD', value: features.macd, importance: this.getImportance(Math.abs(features.macd), 0, 5) as 'HIGH' | 'MEDIUM' | 'LOW' },
      { name: 'BB Position', value: features.bbPosition, importance: this.getImportance(Math.abs(features.bbPosition - 50), 0, 50) as 'HIGH' | 'MEDIUM' | 'LOW' },
      { name: 'Volume Ratio', value: features.volumeRatio, importance: this.getImportance(Math.abs(features.volumeRatio - 1), 0, 2) as 'HIGH' | 'MEDIUM' | 'LOW' },
      { name: 'ATR %', value: features.atrPercent, importance: this.getImportance(features.atrPercent, 0, 5) as 'HIGH' | 'MEDIUM' | 'LOW' },
    ];
  }

  /**
   * 時系列特徴量の重要性を分析
   */
  private analyzeTimeSeriesFeatures(features: AllFeatures['timeSeries']) {
    return [
      { name: 'Trend Strength', value: features.trendStrength, importance: this.getImportance(features.trendStrength, 0, 1) as 'HIGH' | 'MEDIUM' | 'LOW' },
      { name: 'Cyclicality', value: features.cyclicality, importance: this.getImportance(features.cyclicality, 0, 1) as 'HIGH' | 'MEDIUM' | 'LOW' },
      { name: 'MA20', value: features.ma20, importance: 'MEDIUM' as const },
    ];
  }

  /**
   * 重要性を判定
   */
  private getImportance(value: number, min: number, max: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    const normalized = (value - min) / (max - min);
    if (normalized > 0.7) return 'HIGH';
    if (normalized > 0.3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * データをクリア
   */
  clearAllData(): void {
    modelDriftDetector.clearHistory();
    ensembleModel.resetWeights();
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // ドリフトチェック
    const driftResult = modelDriftDetector.detectDrift();
    if (driftResult.isDriftDetected) {
      issues.push(`モデルドリフト検出: ${driftResult.driftSeverity}`);
      if (driftResult.recommendation === 'RETRAIN' || driftResult.recommendation === 'EMERGENCY_RETRAIN') {
        recommendations.push('モデルの再学習を検討してください');
      }
    }

    // データ品質チェック
    const stats = modelDriftDetector.getStatisticsSummary();
    if (stats.totalPredictions < 50) {
      issues.push('予測データが不足しています');
      recommendations.push('より多くの予測データを蓄積してください');
    }

    // 精度チェック
    if (stats.avgAccuracy < 55 && stats.totalPredictions > 50) {
      issues.push('予測精度が低いです');
      recommendations.push('特徴量エンジニアリングの見直しを検討してください');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * モデルをリセット
   */
  async reset(): Promise<void> {
    this.clearAllData();
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * 統計情報をエクスポート
   */
  exportStatistics(): {
    predictionHistory: ReturnType<typeof modelDriftDetector.exportPredictionHistory>;
    driftHistory: ReturnType<typeof modelDriftDetector.getDriftHistory>;
    currentWeights: ReturnType<typeof ensembleModel.getCurrentWeights>;
    performanceSummary: Record<string, unknown>;
  } {
    return {
      predictionHistory: modelDriftDetector.exportPredictionHistory(),
      driftHistory: modelDriftDetector.getDriftHistory(),
      currentWeights: ensembleModel.getCurrentWeights(),
      performanceSummary: this.getModelPerformanceSummary(),
    };
  }
}

export const mlService = new MLService();
