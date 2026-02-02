/**
 * ModelMonitor.ts
 * 
 * 機械学習モデルのモニタリングクラス。
 * 予測精度の追跡、モデルドリフトの検知、再学習トリガーを提供します。
 */

/**
 * 予測記録
 */
export interface PredictionRecord {
  timestamp: Date;
  symbol: string;
  prediction: number;
  actual: number | null;
  accuracy: number | null;
  confidence: number;
  signalType: 'BUY' | 'SELL' | 'HOLD';
}

/**
 * 精度履歴
 */
export interface AccuracyRecord {
  timestamp: Date;
  accuracy: number;
  sampleSize: number;
  period: 'daily' | 'weekly' | 'monthly';
}

/**
 * ドリフト検出アルゴリズム
 */
export interface DriftDetectionMethod {
  name: 'KL_DIVERGENCE' | 'PSI' | 'KOLMOGOROV_SMIRNOV';
  score: number;
  threshold: number;
  isDrift: boolean;
}

/**
 * データ分布
 */
export interface Distribution {
  values: number[];
  bins?: number;
  histogram?: { bin: number; count: number }[];
}

/**
 * ドリフトアラート
 */
export interface DriftAlert {
  type: 'ACCURACY_DRIFT' | 'DATA_DRIFT' | 'CONCEPT_DRIFT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  baselineAccuracy?: number;
  currentAccuracy: number;
  drift: number;
  recommendedAction: 'MONITOR' | 'REVIEW_MODEL' | 'RETRAIN_MODEL' | 'URGENT_RETRAIN';
  detectedAt: Date;
  details: string;
  detectionMethods?: DriftDetectionMethod[];
}

/**
 * 再学習トリガー
 */
export interface RetrainingTrigger {
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedAt: Date;
  metrics: {
    currentAccuracy: number;
    baselineAccuracy: number;
    performanceDropPercent: number;
    consecutivePoorPredictions: number;
  };
}

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number;
  mae: number;
  belowThreshold: boolean;
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * モデルモニタリングクラス
 */
export class ModelMonitor {
  private predictions: PredictionRecord[] = [];
  private accuracyHistory: AccuracyRecord[] = [];
  private baselineAccuracy: number = 0.75; // 75%をベースライン精度とする
  private readonly MAX_RECORDS = 10000; // 保存する最大レコード数
  private readonly ACCURACY_THRESHOLD = 0.65; // 65%を最低精度閾値とする
  private readonly DRIFT_THRESHOLD = 0.10; // 10%の精度低下でドリフトと判定
  private readonly POOR_PREDICTION_THRESHOLD = 3; // 連続した低精度予測の閾値

  /**
   * ベースライン精度を設定
   * 
   * @param accuracy - ベースライン精度（0-1）
   */
  setBaselineAccuracy(accuracy: number): void {
    if (accuracy < 0 || accuracy > 1) {
      throw new Error('Baseline accuracy must be between 0 and 1');
    }
    this.baselineAccuracy = accuracy;
  }

  /**
   * 予測を記録
   * 
   * @param record - 予測記録
   */
  trackPrediction(record: Omit<PredictionRecord, 'accuracy'>): void {
    const fullRecord: PredictionRecord = {
      ...record,
      accuracy: null,
    };

    this.predictions.push(fullRecord);

    // レコード数が上限を超えたら古いものを削除
    if (this.predictions.length > this.MAX_RECORDS) {
      this.predictions = this.predictions.slice(-this.MAX_RECORDS);
    }
  }

  /**
   * 実際の結果を記録して精度を更新
   * 
   * @param symbol - シンボル
   * @param timestamp - タイムスタンプ
   * @param actualValue - 実際の値
   */
  updateActual(symbol: string, timestamp: Date, actualValue: number): void {
    const record = this.predictions.find(
      p => p.symbol === symbol && 
           Math.abs(p.timestamp.getTime() - timestamp.getTime()) < 86400000 // 1日以内
    );

    if (record) {
      record.actual = actualValue;
      
      // 予測方向の正確性を計算
      const predictedUp = record.prediction > 0;
      const actualUp = actualValue > 0;
      record.accuracy = predictedUp === actualUp ? 1 : 0;

      // 精度履歴を更新
      this.updateAccuracyHistory();
    }
  }

  /**
   * モデルドリフトを検知
   * 
   * @param threshold - ドリフト閾値（デフォルト: 0.1）
   * @returns ドリフトアラート（検出されない場合はnull）
   */
  detectModelDrift(threshold: number = this.DRIFT_THRESHOLD): DriftAlert | null {
    const recentAccuracy = this.getRecentAccuracy(30); // 直近30日
    
    if (recentAccuracy === null) {
      return null; // データ不足
    }

    const drift = this.baselineAccuracy - recentAccuracy;
    
    // 精度低下の検知
    if (drift > threshold) {
      const severity = this.calculateDriftSeverity(drift);
      const action = this.determineRecommendedAction(severity);

      return {
        type: 'ACCURACY_DRIFT',
        severity,
        baselineAccuracy: this.baselineAccuracy,
        currentAccuracy: recentAccuracy,
        drift,
        recommendedAction: action,
        detectedAt: new Date(),
        details: `モデルの精度が${(drift * 100).toFixed(1)}%低下しています。`,
      };
    }

    // データ分布の変化を検知
    const dataDrift = this.detectDataDrift();
    if (dataDrift) {
      return dataDrift;
    }

    return null;
  }

  /**
   * データドリフトを検知
   */
  detectDataDrift(): DriftAlert | null {
    const recentPredictions = this.getRecentPredictions(30);
    const historicalPredictions = this.getHistoricalPredictions(30, 60);

    if (recentPredictions.length < 10 || historicalPredictions.length < 10) {
      return null; // データ不足
    }

    // 予測値の分布を比較
    const recentMean = this.calculateMean(recentPredictions.map(p => p.prediction));
    const historicalMean = this.calculateMean(historicalPredictions.map(p => p.prediction));
    const recentStd = this.calculateStd(recentPredictions.map(p => p.prediction));
    const historicalStd = this.calculateStd(historicalPredictions.map(p => p.prediction));

    // 平均値または標準偏差が大きく変化した場合
    const meanDrift = Math.abs(recentMean - historicalMean) / (Math.abs(historicalMean) + 0.001);
    const stdDrift = Math.abs(recentStd - historicalStd) / (historicalStd + 0.001);

    // 高度なドリフト検出手法を適用
    const recentDist: Distribution = {
      values: recentPredictions.map(p => p.prediction),
    };
    const historicalDist: Distribution = {
      values: historicalPredictions.map(p => p.prediction),
    };

    const klDrift = this.detectKLDrift(recentDist, historicalDist);
    const psiDrift = this.detectPSIDrift(recentDist, historicalDist);

    const detectionMethods: DriftDetectionMethod[] = [
      klDrift,
      psiDrift,
    ];

    // いずれかの手法でドリフトが検出された場合
    const isDriftDetected = detectionMethods.some(m => m.isDrift);

    if (meanDrift > 0.3 || stdDrift > 0.5 || isDriftDetected) {
      const maxDrift = Math.max(meanDrift, stdDrift, klDrift.score, psiDrift.score);
      
      return {
        type: 'DATA_DRIFT',
        severity: this.calculateDriftSeverity(maxDrift),
        currentAccuracy: this.getRecentAccuracy(30) || 0,
        drift: maxDrift,
        recommendedAction: this.determineRecommendedAction(this.calculateDriftSeverity(maxDrift)),
        detectedAt: new Date(),
        details: `データ分布が変化しています。平均ドリフト: ${(meanDrift * 100).toFixed(1)}%, 標準偏差ドリフト: ${(stdDrift * 100).toFixed(1)}%`,
        detectionMethods,
      };
    }

    return null;
  }

  /**
   * KLダイバージェンスによるドリフト検出
   * 
   * @param currentData - 現在のデータ分布
   * @param referenceData - 参照データ分布
   * @returns ドリフトスコア
   */
  detectKLDrift(currentData: Distribution, referenceData: Distribution): DriftDetectionMethod {
    const bins = 10;
    const currentHist = this.createHistogram(currentData.values, bins);
    const referenceHist = this.createHistogram(referenceData.values, bins);

    // KLダイバージェンスを計算
    let klDiv = 0;
    for (let i = 0; i < bins; i++) {
      const p = referenceHist[i] + 1e-10; // ゼロ除算を避ける
      const q = currentHist[i] + 1e-10;
      klDiv += p * Math.log(p / q);
    }

    const threshold = 0.15;
    const isDrift = klDiv > threshold;

    return {
      name: 'KL_DIVERGENCE',
      score: klDiv,
      threshold,
      isDrift,
    };
  }

  /**
   * PSI（Population Stability Index）によるドリフト検出
   * 
   * @param current - 現在のデータ分布
   * @param reference - 参照データ分布
   * @returns ドリフトスコア
   */
  detectPSIDrift(current: Distribution, reference: Distribution): DriftDetectionMethod {
    const bins = 10;
    const currentHist = this.createHistogram(current.values, bins);
    const referenceHist = this.createHistogram(reference.values, bins);

    // PSIを計算
    let psi = 0;
    for (let i = 0; i < bins; i++) {
      const actual = currentHist[i] + 1e-10;
      const expected = referenceHist[i] + 1e-10;
      psi += (actual - expected) * Math.log(actual / expected);
    }

    // PSIの閾値
    // < 0.1: 変化なし
    // 0.1 - 0.2: 軽度の変化
    // > 0.2: 重大な変化
    const threshold = 0.2;
    const isDrift = psi > threshold;

    return {
      name: 'PSI',
      score: psi,
      threshold,
      isDrift,
    };
  }

  /**
   * ヒストグラムを作成（確率分布に正規化）
   */
  private createHistogram(values: number[], bins: number): number[] {
    if (values.length === 0) {
      return new Array(bins).fill(0);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogram = new Array(bins).fill(0);

    for (const value of values) {
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex >= bins) binIndex = bins - 1;
      if (binIndex < 0) binIndex = 0;
      histogram[binIndex]++;
    }

    // 確率分布に正規化
    const total = values.length;
    return histogram.map(count => count / total);
  }

  /**
   * モデル再トレーニングが必要かを判定
   * 
   * @param driftScore - ドリフトスコア
   * @returns 再トレーニングが必要な場合はtrue
   */
  shouldRetrain(driftScore: DriftDetectionMethod): boolean {
    return driftScore.isDrift;
  }

  /**
   * 再学習トリガーを取得
   * 
   * @returns 再学習トリガー（トリガー条件を満たさない場合はnull）
   */
  getRetrainingTrigger(): RetrainingTrigger | null {
    const drift = this.detectModelDrift();
    const performance = this.getPerformanceMetrics();
    const consecutivePoor = this.getConsecutivePoorPredictions();

    // 複数の条件を評価
    if (drift) {
      const currentAccuracy = drift.currentAccuracy;
      const baselineAccuracy = drift.baselineAccuracy || this.baselineAccuracy;
      const performanceDropPercent = ((baselineAccuracy - currentAccuracy) / baselineAccuracy) * 100;

      return {
        reason: drift.details,
        urgency: drift.severity === 'CRITICAL' || drift.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        recommendedAt: new Date(),
        metrics: {
          currentAccuracy,
          baselineAccuracy,
          performanceDropPercent,
          consecutivePoorPredictions: consecutivePoor,
        },
      };
    }

    if (performance.belowThreshold) {
      return {
        reason: `モデルの精度が閾値（${this.ACCURACY_THRESHOLD * 100}%）を下回っています。`,
        urgency: 'HIGH',
        recommendedAt: new Date(),
        metrics: {
          currentAccuracy: performance.accuracy,
          baselineAccuracy: this.baselineAccuracy,
          performanceDropPercent: ((this.baselineAccuracy - performance.accuracy) / this.baselineAccuracy) * 100,
          consecutivePoorPredictions: consecutivePoor,
        },
      };
    }

    if (consecutivePoor >= this.POOR_PREDICTION_THRESHOLD) {
      return {
        reason: `${consecutivePoor}回連続で低精度の予測が続いています。`,
        urgency: 'MEDIUM',
        recommendedAt: new Date(),
        metrics: {
          currentAccuracy: performance.accuracy,
          baselineAccuracy: this.baselineAccuracy,
          performanceDropPercent: 0,
          consecutivePoorPredictions: consecutivePoor,
        },
      };
    }

    return null;
  }

  /**
   * パフォーマンスメトリクスを取得
   * 
   * @returns パフォーマンスメトリクス
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const recentPredictions = this.getRecentPredictions(30).filter(p => p.actual !== null);

    if (recentPredictions.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        mse: 0,
        mae: 0,
        belowThreshold: true,
        trend: 'stable',
      };
    }

    // 各メトリクスを計算
    const accuracy = recentPredictions.reduce((sum, p) => sum + (p.accuracy || 0), 0) / recentPredictions.length;

    let truePositive = 0, falsePositive = 0, trueNegative = 0, falseNegative = 0;
    let mseSum = 0, maeSum = 0;

    for (const p of recentPredictions) {
      if (p.actual === null) continue;

      const predictedUp = p.prediction > 0;
      const actualUp = p.actual > 0;

      if (predictedUp && actualUp) truePositive++;
      else if (predictedUp && !actualUp) falsePositive++;
      else if (!predictedUp && !actualUp) trueNegative++;
      else falseNegative++;

      mseSum += Math.pow(p.prediction - p.actual, 2);
      maeSum += Math.abs(p.prediction - p.actual);
    }

    const precision = truePositive + falsePositive > 0
      ? truePositive / (truePositive + falsePositive)
      : 0;

    const recall = truePositive + falseNegative > 0
      ? truePositive / (truePositive + falseNegative)
      : 0;

    const f1Score = precision + recall > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    const mse = mseSum / recentPredictions.length;
    const mae = maeSum / recentPredictions.length;

    const belowThreshold = accuracy < this.ACCURACY_THRESHOLD;

    // トレンドを分析
    const trend = this.analyzeAccuracyTrend();

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      mse,
      mae,
      belowThreshold,
      trend,
    };
  }

  /**
   * 直近の精度を取得
   * 
   * @param days - 日数
   * @returns 平均精度（データがない場合はnull）
   */
  getRecentAccuracy(days: number): number | null {
    const recentPredictions = this.getRecentPredictions(days).filter(p => p.actual !== null);

    if (recentPredictions.length === 0) {
      return null;
    }

    return recentPredictions.reduce((sum, p) => sum + (p.accuracy || 0), 0) / recentPredictions.length;
  }

  /**
   * ベースライン精度を取得
   */
  getBaselineAccuracy(): number {
    return this.baselineAccuracy;
  }

  /**
   * 直近の予測を取得
   */
  private getRecentPredictions(days: number): PredictionRecord[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.predictions.filter(p => p.timestamp >= cutoffDate);
  }

  /**
   * 過去の予測を取得（特定期間）
   */
  private getHistoricalPredictions(startDays: number, endDays: number): PredictionRecord[] {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - endDays);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - startDays);

    return this.predictions.filter(p => p.timestamp >= startDate && p.timestamp < endDate);
  }

  /**
   * 連続した低精度予測の回数を取得
   */
  private getConsecutivePoorPredictions(): number {
    const recentPredictions = this.predictions
      .filter(p => p.actual !== null)
      .slice(-10)
      .reverse();

    let count = 0;
    for (const p of recentPredictions) {
      if ((p.accuracy || 0) < 0.5) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * 精度履歴を更新
   */
  private updateAccuracyHistory(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAccuracy = this.accuracyHistory.find(
      a => a.timestamp.getTime() === today.getTime() && a.period === 'daily'
    );

    const recentAccuracy = this.getRecentAccuracy(1);
    const recentPredictions = this.getRecentPredictions(1).filter(p => p.actual !== null);

    if (recentAccuracy !== null && recentPredictions.length > 0) {
      if (todayAccuracy) {
        todayAccuracy.accuracy = recentAccuracy;
        todayAccuracy.sampleSize = recentPredictions.length;
      } else {
        this.accuracyHistory.push({
          timestamp: today,
          accuracy: recentAccuracy,
          sampleSize: recentPredictions.length,
          period: 'daily',
        });
      }

      // 古い履歴を削除（90日以上前）
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      this.accuracyHistory = this.accuracyHistory.filter(a => a.timestamp >= cutoffDate);
    }
  }

  /**
   * ドリフトの深刻度を計算
   */
  private calculateDriftSeverity(drift: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (drift > 0.25) return 'CRITICAL';
    if (drift > 0.20) return 'HIGH';
    if (drift > 0.15) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 推奨アクションを決定
   */
  private determineRecommendedAction(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): DriftAlert['recommendedAction'] {
    switch (severity) {
      case 'CRITICAL':
        return 'URGENT_RETRAIN';
      case 'HIGH':
        return 'RETRAIN_MODEL';
      case 'MEDIUM':
        return 'REVIEW_MODEL';
      default:
        return 'MONITOR';
    }
  }

  /**
   * 精度のトレンドを分析
   */
  private analyzeAccuracyTrend(): 'improving' | 'stable' | 'degrading' {
    const recentAccuracies = this.accuracyHistory
      .filter(a => a.period === 'daily')
      .slice(-7)
      .map(a => a.accuracy);

    if (recentAccuracies.length < 3) {
      return 'stable';
    }

    // 線形回帰で傾きを計算
    const n = recentAccuracies.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = recentAccuracies;

    const sumX = x.reduce((sum, v) => sum + v, 0);
    const sumY = y.reduce((sum, v) => sum + v, 0);
    const sumXY = x.reduce((sum, v, i) => sum + v * y[i], 0);
    const sumX2 = x.reduce((sum, v) => sum + v * v, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.02) return 'improving';
    if (slope < -0.02) return 'degrading';
    return 'stable';
  }

  /**
   * 平均値を計算
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * 標準偏差を計算
   */
  private calculateStd(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * すべての予測記録を取得（デバッグ用）
   */
  getAllPredictions(): PredictionRecord[] {
    return [...this.predictions];
  }

  /**
   * すべての精度履歴を取得（デバッグ用）
   */
  getAccuracyHistory(): AccuracyRecord[] {
    return [...this.accuracyHistory];
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalPredictions: number;
    predictionsWithActuals: number;
    recentAccuracy: number | null;
    baselineAccuracy: number;
    driftStatus: DriftAlert | null;
  } {
    return {
      totalPredictions: this.predictions.length,
      predictionsWithActuals: this.predictions.filter(p => p.actual !== null).length,
      recentAccuracy: this.getRecentAccuracy(30),
      baselineAccuracy: this.baselineAccuracy,
      driftStatus: this.detectModelDrift(),
    };
  }
}

export const modelMonitor = new ModelMonitor();
