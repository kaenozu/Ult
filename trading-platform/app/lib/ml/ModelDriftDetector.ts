/**
 * ModelDriftDetector.ts
 *
 * モデルドリフト検出器クラス
 * 予測精度の監視、再学習トリガー、モデルパフォーマンスの劣化検出を提供します。
 */

import { ModelType } from './EnsembleModel';

/**
 * 予測結果と実際の値
 */
export interface PredictionRecord {
  timestamp: string;
  modelType: ModelType | 'ENSEMBLE';
  predicted: number; // 予測騰落率（%）
  actual: number; // 実際の騰落率（%）
  confidence: number; // 予測信頼度 0-100
  marketRegime: string; // 市場レジーム
}

/**
 * ドリフト検出結果
 */
export interface DriftDetectionResult {
  isDriftDetected: boolean;
  driftSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  driftType: 'SUDDEN' | 'GRADUAL' | 'INCREMENTAL' | 'NONE';
  accuracy: number;
  accuracyDrop: number; // ベースラインからの低下
  recommendation: 'CONTINUE' | 'MONITOR' | 'RETRAIN' | 'EMERGENCY_RETRAIN';
  reason: string;
  detectedAt: string;
}

/**
 * モデルパフォーマンスメトリクス
 */
export interface ModelMetrics {
  modelType: ModelType | 'ENSEMBLE';
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  avgConfidence: number;
  avgError: number; // 平均予測誤差（%）
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  lastUpdate: string;
}

/**
 * パフォーマンス履歴
 */
export interface PerformanceHistory {
  timestamp: string;
  accuracy: number;
  avgError: number;
  sharpeRatio: number;
}

/**
 * モデルドリフト検出器クラス
 */
export class ModelDriftDetector {
  private predictionHistory: PredictionRecord[] = [];
  private performanceHistory: Map<ModelType | 'ENSEMBLE', PerformanceHistory[]> = new Map();
  private baselineMetrics: Map<ModelType | 'ENSEMBLE', ModelMetrics> = new Map();
  private driftHistory: DriftDetectionResult[] = [];

  // 検出設定
  private readonly BASELINE_WINDOW = 100; // ベースライン計算ウィンドウ
  private readonly DETECTION_WINDOW = 50; // ドリフト検出ウィンドウ
  private readonly MIN_PREDICTIONS_FOR_BASELINE = 50;
  private readonly MIN_PREDICTIONS_FOR_DETECTION = 20;

  // ドリフト閾値
  private readonly ACCURACY_DROP_LOW = 5; // 5%低下でLOW
  private readonly ACCURACY_DROP_MEDIUM = 10; // 10%低下でMEDIUM
  private readonly ACCURACY_DROP_HIGH = 15; // 15%低下でHIGH
  private readonly ACCURACY_DROP_CRITICAL = 20; // 20%低下でCRITICAL

  private readonly ERROR_INCREASE_LOW = 0.5; // 0.5%増加でLOW
  private readonly ERROR_INCREASE_MEDIUM = 1.0; // 1.0%増加でMEDIUM
  private readonly ERROR_INCREASE_HIGH = 1.5; // 1.5%増加でHIGH
  private readonly ERROR_INCREASE_CRITICAL = 2.0; // 2.0%増加でCRITICAL

  /**
   * 予測結果を記録
   */
  recordPrediction(
    modelType: ModelType | 'ENSEMBLE',
    predicted: number,
    actual: number,
    confidence: number,
    marketRegime: string
  ): void {
    const record: PredictionRecord = {
      timestamp: new Date().toISOString(),
      modelType,
      predicted,
      actual,
      confidence,
      marketRegime,
    };

    this.predictionHistory.push(record);

    // パフォーマンス履歴を更新
    this.updatePerformanceHistory(modelType, record);

    // ベースラインを更新
    if (this.predictionHistory.length >= this.MIN_PREDICTIONS_FOR_BASELINE) {
      this.updateBaselineMetrics(modelType);
    }
  }

  /**
   * ドリフトを検出
   */
  detectDrift(modelType?: ModelType | 'ENSEMBLE'): DriftDetectionResult {
    const modelTypes = modelType
      ? [modelType]
      : (['RF', 'XGB', 'LSTM', 'TECHNICAL', 'ENSEMBLE'] as (ModelType | 'ENSEMBLE')[]);

    let overallDriftSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';
    let worstDriftResult: DriftDetectionResult | null = null;

    for (const type of modelTypes) {
      const result = this.detectDriftForModel(type);
      if (result.driftSeverity !== 'NONE') {
        // 最も深刻なドリフトを記録
        if (
          !worstDriftResult ||
          this.getDriftSeverityScore(result.driftSeverity) >
            this.getDriftSeverityScore(worstDriftResult.driftSeverity)
        ) {
          worstDriftResult = result;
        }
      }
    }

    // 最も深刻なドリフト結果を返す
    if (worstDriftResult) {
      return worstDriftResult;
    }

    // ドリフトが検出されなかった場合
    return {
      isDriftDetected: false,
      driftSeverity: 'NONE',
      driftType: 'NONE',
      accuracy: 0,
      accuracyDrop: 0,
      recommendation: 'CONTINUE',
      reason: 'ドリフトは検出されませんでした。モデルは正常に機能しています。',
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * 特定のモデルのドリフトを検出
   */
  private detectDriftForModel(modelType: ModelType | 'ENSEMBLE'): DriftDetectionResult {
    const baseline = this.baselineMetrics.get(modelType);
    if (!baseline) {
      return {
        isDriftDetected: false,
        driftSeverity: 'NONE',
        driftType: 'NONE',
        accuracy: 0,
        accuracyDrop: 0,
        recommendation: 'CONTINUE',
        reason: 'ベースラインがまだ確立されていません。',
        detectedAt: new Date().toISOString(),
      };
    }

    // 最近のパフォーマンスを計算
    const recentRecords = this.predictionHistory
      .filter((r) => r.modelType === modelType)
      .slice(-this.DETECTION_WINDOW);

    if (recentRecords.length < this.MIN_PREDICTIONS_FOR_DETECTION) {
      return {
        isDriftDetected: false,
        driftSeverity: 'NONE',
        driftType: 'NONE',
        accuracy: baseline.accuracy,
        accuracyDrop: 0,
        recommendation: 'CONTINUE',
        reason: '検出に十分なデータがありません。',
        detectedAt: new Date().toISOString(),
      };
    }

    // 現在のメトリクスを計算
    const currentMetrics = this.calculateMetrics(recentRecords);

    // 精度低下を検出
    const accuracyDrop = baseline.accuracy - currentMetrics.accuracy;
    const accuracyDriftSeverity = this.getAccuracyDriftSeverity(accuracyDrop);

    // 誤差増加を検出
    const errorIncrease = currentMetrics.avgError - baseline.avgError;
    const errorDriftSeverity = this.getErrorDriftSeverity(errorIncrease);

    // ドリフトタイプを判定
    const driftType = this.detectDriftType(recentRecords);

    // 総合的なドリフト重大度を判定
    const overallSeverity = this.getOverallDriftSeverity(
      accuracyDriftSeverity,
      errorDriftSeverity,
      currentMetrics.sharpeRatio,
      baseline.sharpeRatio
    );

    // 推奨アクションを決定
    const recommendation = this.getRecommendation(overallSeverity, driftType);

    // 理由を生成
    const reason = this.generateDriftReason(
      accuracyDrop,
      errorIncrease,
      currentMetrics,
      baseline,
      driftType
    );

    const result: DriftDetectionResult = {
      isDriftDetected: overallSeverity !== 'NONE',
      driftSeverity: overallSeverity,
      driftType,
      accuracy: currentMetrics.accuracy,
      accuracyDrop,
      recommendation,
      reason,
      detectedAt: new Date().toISOString(),
    };

    // ドリフト履歴に記録
    if (overallSeverity !== 'NONE') {
      this.driftHistory.push(result);
    }

    return result;
  }

  /**
   * パフォーマンス履歴を更新
   */
  private updatePerformanceHistory(modelType: ModelType | 'ENSEMBLE', record: PredictionRecord): void {
    const modelRecords = this.predictionHistory.filter((r) => r.modelType === modelType);
    const metrics = this.calculateMetrics(modelRecords);

    const history: PerformanceHistory = {
      timestamp: record.timestamp,
      accuracy: metrics.accuracy,
      avgError: metrics.avgError,
      sharpeRatio: metrics.sharpeRatio,
    };

    if (!this.performanceHistory.has(modelType)) {
      this.performanceHistory.set(modelType, []);
    }

    const historyArray = this.performanceHistory.get(modelType)!;
    historyArray.push(history);

    // 履歴を一定数に制限
    // PERFORMANCE FIX: Replace shift() with slice() to avoid O(n) array reindexing
    if (historyArray.length > this.BASELINE_WINDOW) {
      this.performanceHistory.set(modelType, historyArray.slice(-this.BASELINE_WINDOW));
    }
  }

  /**
   * ベースラインメトリクスを更新
   */
  private updateBaselineMetrics(modelType: ModelType | 'ENSEMBLE'): void {
    const modelRecords = this.predictionHistory.filter((r) => r.modelType === modelType);
    const baselineRecords = modelRecords.slice(-this.BASELINE_WINDOW);

    if (baselineRecords.length < this.MIN_PREDICTIONS_FOR_BASELINE) {
      return;
    }

    const metrics = this.calculateMetrics(baselineRecords);
    this.baselineMetrics.set(modelType, metrics);
  }

  /**
   * メトリクスを計算
   */
  private calculateMetrics(records: PredictionRecord[]): ModelMetrics {
    if (records.length === 0) {
      return {
        modelType: 'ENSEMBLE',
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        avgConfidence: 0,
        avgError: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        lastUpdate: new Date().toISOString(),
      };
    }

    const totalPredictions = records.length;
    let correctPredictions = 0;
    let totalError = 0;
    let totalConfidence = 0;
    const returns: number[] = [];

    for (const record of records) {
      const isCorrect = Math.sign(record.predicted) === Math.sign(record.actual);
      if (isCorrect) {
        correctPredictions++;
      }

      totalError += Math.abs(record.actual - record.predicted);
      totalConfidence += record.confidence;

      // シャープレシオ計算用リターン
      if (isCorrect) {
        returns.push(Math.abs(record.actual));
      } else {
        returns.push(-Math.abs(record.actual));
      }
    }

    const accuracy = (correctPredictions / totalPredictions) * 100;
    const avgError = totalError / totalPredictions;
    const avgConfidence = totalConfidence / totalPredictions;

    // シャープレシオを計算
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // 最大ドローダウンを計算
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    for (const ret of returns) {
      cumulative += ret;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // 勝率
    const winRate = (correctPredictions / totalPredictions) * 100;

    return {
      modelType: records[0].modelType,
      totalPredictions,
      correctPredictions,
      accuracy,
      avgConfidence,
      avgError,
      sharpeRatio,
      maxDrawdown,
      winRate,
      lastUpdate: records[records.length - 1].timestamp,
    };
  }

  /**
   * 精度低下の重大度を判定
   */
  private getAccuracyDriftSeverity(accuracyDrop: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (accuracyDrop < this.ACCURACY_DROP_LOW) return 'NONE';
    if (accuracyDrop < this.ACCURACY_DROP_MEDIUM) return 'LOW';
    if (accuracyDrop < this.ACCURACY_DROP_HIGH) return 'MEDIUM';
    if (accuracyDrop < this.ACCURACY_DROP_CRITICAL) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * 誤差増加の重大度を判定
   */
  private getErrorDriftSeverity(errorIncrease: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (errorIncrease < this.ERROR_INCREASE_LOW) return 'NONE';
    if (errorIncrease < this.ERROR_INCREASE_MEDIUM) return 'LOW';
    if (errorIncrease < this.ERROR_INCREASE_HIGH) return 'MEDIUM';
    if (errorIncrease < this.ERROR_INCREASE_CRITICAL) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * ドリフトタイプを検出
   */
  private detectDriftType(records: PredictionRecord[]): 'SUDDEN' | 'GRADUAL' | 'INCREMENTAL' | 'NONE' {
    if (records.length < 10) return 'NONE';

    const firstHalf = records.slice(0, Math.floor(records.length / 2));
    const secondHalf = records.slice(Math.floor(records.length / 2));

    const firstHalfAccuracy =
      (firstHalf.filter((r) => Math.sign(r.predicted) === Math.sign(r.actual)).length / firstHalf.length) *
      100;
    const secondHalfAccuracy =
      (secondHalf.filter((r) => Math.sign(r.predicted) === Math.sign(r.actual)).length / secondHalf.length) *
      100;

    const accuracyDrop = firstHalfAccuracy - secondHalfAccuracy;

    if (accuracyDrop > 15) {
      return 'SUDDEN'; // 急激な低下
    } else if (accuracyDrop > 5) {
      return 'GRADUAL'; // 徐々に低下
    } else if (accuracyDrop > 0) {
      return 'INCREMENTAL'; // ゆっくりとした低下
    }

    return 'NONE';
  }

  /**
   * 総合的なドリフト重大度を判定
   */
  private getOverallDriftSeverity(
    accuracyDrift: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    errorDrift: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    currentSharpe: number,
    baselineSharpe: number
  ): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // シャープレシオの低下も考慮
    const sharpeDrop = baselineSharpe - currentSharpe;
    let sharpeDrift: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';
    if (sharpeDrop > 1.0) sharpeDrift = 'CRITICAL';
    else if (sharpeDrop > 0.5) sharpeDrift = 'HIGH';
    else if (sharpeDrop > 0.3) sharpeDrift = 'MEDIUM';
    else if (sharpeDrop > 0.1) sharpeDrift = 'LOW';

    // 最も深刻なドリフトを採用
    const scores = [
      this.getDriftSeverityScore(accuracyDrift),
      this.getDriftSeverityScore(errorDrift),
      this.getDriftSeverityScore(sharpeDrift),
    ];

    const maxScore = Math.max(...scores);

    if (maxScore >= 4) return 'CRITICAL';
    if (maxScore >= 3) return 'HIGH';
    if (maxScore >= 2) return 'MEDIUM';
    if (maxScore >= 1) return 'LOW';
    return 'NONE';
  }

  /**
   * ドリフト重大度をスコア化
   */
  private getDriftSeverityScore(severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): number {
    switch (severity) {
      case 'NONE':
        return 0;
      case 'LOW':
        return 1;
      case 'MEDIUM':
        return 2;
      case 'HIGH':
        return 3;
      case 'CRITICAL':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * 推奨アクションを決定
   */
  private getRecommendation(
    severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    driftType: 'SUDDEN' | 'GRADUAL' | 'INCREMENTAL' | 'NONE'
  ): 'CONTINUE' | 'MONITOR' | 'RETRAIN' | 'EMERGENCY_RETRAIN' {
    if (severity === 'CRITICAL' || (severity === 'HIGH' && driftType === 'SUDDEN')) {
      return 'EMERGENCY_RETRAIN';
    }
    if (severity === 'HIGH' || (severity === 'MEDIUM' && driftType === 'GRADUAL')) {
      return 'RETRAIN';
    }
    if (severity === 'MEDIUM' || severity === 'LOW') {
      return 'MONITOR';
    }
    return 'CONTINUE';
  }

  /**
   * ドリフト検出の理由を生成
   */
  private generateDriftReason(
    accuracyDrop: number,
    errorIncrease: number,
    current: ModelMetrics,
    baseline: ModelMetrics,
    driftType: string
  ): string {
    const parts: string[] = [];

    if (accuracyDrop > this.ACCURACY_DROP_LOW) {
      parts.push(`精度が${accuracyDrop.toFixed(1)}%低下（ベースライン: ${baseline.accuracy.toFixed(1)}% → 現在: ${current.accuracy.toFixed(1)}%）`);
    }

    if (errorIncrease > this.ERROR_INCREASE_LOW) {
      parts.push(`予測誤差が${errorIncrease.toFixed(2)}%増加（ベースライン: ${baseline.avgError.toFixed(2)}% → 現在: ${current.avgError.toFixed(2)}%）`);
    }

    if (current.sharpeRatio < baseline.sharpeRatio * 0.8) {
      parts.push(`シャープレシオが悪化（${baseline.sharpeRatio.toFixed(2)} → ${current.sharpeRatio.toFixed(2)}）`);
    }

    if (parts.length === 0) {
      return 'モデルパフォーマンスは正常範囲内です。';
    }

    const driftTypeText = {
      SUDDEN: '急激なドリフト',
      GRADUAL: '徐々進行するドリフト',
      INCREMENTAL: 'ゆっくりとしたドリフト',
      NONE: '',
    }[driftType];

    if (driftTypeText) {
      parts.unshift(`${driftTypeText}が検出されました。`);
    }

    return parts.join('、');
  }

  /**
   * 現在のメトリクスを取得
   */
  getCurrentMetrics(modelType: ModelType | 'ENSEMBLE'): ModelMetrics | null {
    const records = this.predictionHistory.filter((r) => r.modelType === modelType);
    if (records.length === 0) return null;
    return this.calculateMetrics(records);
  }

  /**
   * ベースラインメトリクスを取得
   */
  getBaselineMetrics(modelType: ModelType | 'ENSEMBLE'): ModelMetrics | null {
    return this.baselineMetrics.get(modelType) || null;
  }

  /**
   * 全モデルのメトリクスを取得
   */
  getAllMetrics(): Map<ModelType | 'ENSEMBLE', ModelMetrics> {
    const metrics = new Map<ModelType | 'ENSEMBLE', ModelMetrics>();
    const modelTypes: (ModelType | 'ENSEMBLE')[] = ['RF', 'XGB', 'LSTM', 'TECHNICAL', 'ENSEMBLE'];

    for (const modelType of modelTypes) {
      const current = this.getCurrentMetrics(modelType);
      if (current) {
        metrics.set(modelType, current);
      }
    }

    return metrics;
  }

  /**
   * ドリフト履歴を取得
   */
  getDriftHistory(): DriftDetectionResult[] {
    return [...this.driftHistory];
  }

  /**
   * 最近のドリフトを取得
   */
  getRecentDrifts(count: number = 10): DriftDetectionResult[] {
    return this.driftHistory.slice(-count);
  }

  /**
   * パフォーマンス履歴を取得
   */
  getPerformanceHistory(modelType: ModelType | 'ENSEMBLE'): PerformanceHistory[] {
    return this.performanceHistory.get(modelType) || [];
  }

  /**
   * 統計サマリーを取得
   */
  getStatisticsSummary(): {
    totalPredictions: number;
    totalModels: number;
    modelsWithDrift: number;
    avgAccuracy: number;
    avgError: number;
  } {
    const metrics = this.getAllMetrics();
    const totalPredictions = this.predictionHistory.length;
    const totalModels = metrics.size;
    const modelsWithDrift = this.driftHistory.filter(
      (d, i, arr) => arr.findIndex(x => x.detectedAt === d.detectedAt) === i
    ).length;

    let totalAccuracy = 0;
    let totalError = 0;
    for (const metric of metrics.values()) {
      totalAccuracy += metric.accuracy;
      totalError += metric.avgError;
    }

    return {
      totalPredictions,
      totalModels,
      modelsWithDrift,
      avgAccuracy: totalModels > 0 ? totalAccuracy / totalModels : 0,
      avgError: totalModels > 0 ? totalError / totalModels : 0,
    };
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.predictionHistory = [];
    this.performanceHistory.clear();
    this.baselineMetrics.clear();
    this.driftHistory = [];
  }

  /**
   * 予測履歴をエクスポート
   */
  exportPredictionHistory(): PredictionRecord[] {
    return [...this.predictionHistory];
  }

  /**
   * 予測履歴をインポート
   */
  importPredictionHistory(records: PredictionRecord[]): void {
    this.predictionHistory = [...records];

    // 各モデルのパフォーマンス履歴とベースラインを再構築
    for (const record of records) {
      this.updatePerformanceHistory(record.modelType, record);
      if (this.predictionHistory.length >= this.MIN_PREDICTIONS_FOR_BASELINE) {
        this.updateBaselineMetrics(record.modelType);
      }
    }
  }
}

export const modelDriftDetector = new ModelDriftDetector();
