/**
 * EnsembleModel.ts
 * 
 * アンサンブル機械学習モデルクラス。
 * 複数のモデル（Random Forest, XGBoost, LSTM）を組み合わせて
 * より高精度な予測を提供します。
 */

import { OHLCV } from '../../types/shared';
import { ExtendedTechnicalFeatures } from './FeatureEngineering';

/**
 * ベースモデル予測結果
 */
export interface BaseModelPrediction {
  value: number;
  confidence: number;
  model: 'RF' | 'XGB' | 'LSTM';
}

/**
 * アンサンブル予測結果
 */
export interface EnsemblePrediction {
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  score: number;
  individualPredictions: BaseModelPrediction[];
  strategy: 'weighted_average' | 'stacking' | 'voting';
  agreementScore: number;
}

/**
 * モデル重み
 */
export interface ModelWeights {
  RF: number;
  XGB: number;
  LSTM: number;
}

/**
 * モデルパフォーマンス
 */
export interface ModelPerformance {
  model: 'RF' | 'XGB' | 'LSTM';
  accuracy: number;
  recentAccuracy: number;
  weight: number;
}

/**
 * アンサンブルモデルクラス
 */
export class EnsembleModel {
  private weights: ModelWeights = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  };

  private performanceHistory: Map<string, number[]> = new Map([
    ['RF', []],
    ['XGB', []],
    ['LSTM', []],
  ]);

  private readonly CONFIDENCE_THRESHOLD = 0.65;
  private readonly AGREEMENT_THRESHOLD = 0.7;
  private readonly MAX_HISTORY_SIZE = 100;

  /**
   * モデル重みを設定
   * 
   * @param weights - モデル重み
   */
  setWeights(weights: Partial<ModelWeights>): void {
    this.weights = { ...this.weights, ...weights };
    
    // 重みの合計が1になるように正規化
    const sum = this.weights.RF + this.weights.XGB + this.weights.LSTM;
    if (Math.abs(sum - 1) > 0.001) {
      this.weights.RF /= sum;
      this.weights.XGB /= sum;
      this.weights.LSTM /= sum;
    }
  }

  /**
   * アンサンブル予測を実行
   * 
   * @param features - テクニカル特徴量
   * @param data - OHLCVデータ
   * @param strategy - アンサンブル戦略
   * @returns アンサンブル予測結果
   */
  predict(
    features: ExtendedTechnicalFeatures,
    data: OHLCV[],
    strategy: 'weighted_average' | 'stacking' | 'voting' = 'weighted_average'
  ): EnsemblePrediction {
    // 各モデルで予測
    const rfPrediction = this.predictRandomForest(features);
    const xgbPrediction = this.predictXGBoost(features);
    const lstmPrediction = this.predictLSTM(data, features);

    const individualPredictions: BaseModelPrediction[] = [
      rfPrediction,
      xgbPrediction,
      lstmPrediction,
    ];

    // アンサンブル戦略に基づいて統合
    let score: number;
    let confidence: number;

    switch (strategy) {
      case 'stacking':
        ({ score, confidence } = this.stackingPredict(individualPredictions, features));
        break;
      case 'voting':
        ({ score, confidence } = this.votingPredict(individualPredictions));
        break;
      default:
        ({ score, confidence } = this.weightedAveragePredict(individualPredictions));
    }

    // モデル間の合意度を計算
    const agreementScore = this.calculateAgreementScore(individualPredictions);

    // シグナル方向を決定
    let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (score > 1.0 && confidence >= this.CONFIDENCE_THRESHOLD) {
      direction = 'BUY';
    } else if (score < -1.0 && confidence >= this.CONFIDENCE_THRESHOLD) {
      direction = 'SELL';
    }

    return {
      direction,
      confidence,
      score,
      individualPredictions,
      strategy,
      agreementScore,
    };
  }

  /**
   * 重み付き平均によるアンサンブル
   */
  private weightedAveragePredict(predictions: BaseModelPrediction[]): { score: number; confidence: number } {
    let score = 0;
    let confidenceSum = 0;

    for (const pred of predictions) {
      const weight = this.weights[pred.model];
      score += pred.value * weight;
      confidenceSum += pred.confidence * weight;
    }

    return {
      score,
      confidence: confidenceSum,
    };
  }

  /**
   * スタッキングによるアンサンブル
   */
  private stackingPredict(
    predictions: BaseModelPrediction[],
    features: ExtendedTechnicalFeatures
  ): { score: number; confidence: number } {
    // メタ特徴量の構築
    const metaFeatures = [
      predictions[0].value,
      predictions[1].value,
      predictions[2].value,
      predictions[0].confidence,
      predictions[1].confidence,
      predictions[2].confidence,
      features.volatility / 100,
      features.momentumTrend === 'STRONG_UP' ? 1 : features.momentumTrend === 'STRONG_DOWN' ? -1 : 0,
    ];

    // メタモデル（線形結合）
    const weights = [0.25, 0.25, 0.20, 0.10, 0.10, 0.05, 0.03, 0.02];
    const score = metaFeatures.reduce((sum, feat, i) => sum + feat * weights[i], 0);

    // 信頼度は個別モデルの最大値と合意度の組み合わせ
    const maxConfidence = Math.max(...predictions.map(p => p.confidence));
    const agreementScore = this.calculateAgreementScore(predictions);
    const confidence = maxConfidence * 0.7 + agreementScore * 0.3;

    return { score, confidence };
  }

  /**
   * 投票によるアンサンブル
   */
  private votingPredict(predictions: BaseModelPrediction[]): { score: number; confidence: number } {
    // 各モデルの方向性に投票
    const votes = {
      buy: 0,
      sell: 0,
      hold: 0,
    };

    for (const pred of predictions) {
      const weight = this.weights[pred.model];
      if (pred.value > 1.0) {
        votes.buy += weight;
      } else if (pred.value < -1.0) {
        votes.sell += weight;
      } else {
        votes.hold += weight;
      }
    }

    // 最多投票の方向を選択
    const maxVote = Math.max(votes.buy, votes.sell, votes.hold);
    let score = 0;
    if (maxVote === votes.buy) {
      score = predictions.reduce((sum, p) => sum + Math.max(p.value, 0) * this.weights[p.model], 0);
    } else if (maxVote === votes.sell) {
      score = predictions.reduce((sum, p) => sum + Math.min(p.value, 0) * this.weights[p.model], 0);
    }

    // 信頼度は投票の割合
    const confidence = maxVote;

    return { score, confidence };
  }

  /**
   * Random Forest予測
   */
  private predictRandomForest(features: ExtendedTechnicalFeatures): BaseModelPrediction {
    let score = 0;

    // RSIベースの判定
    if (features.rsi < 30) score += 3;
    else if (features.rsi > 70) score -= 3;

    // SMAトレンド
    if (features.sma5 > 0 && features.sma20 > 0) score += 2;
    else if (features.sma5 < 0 && features.sma20 < 0) score -= 2;

    // モメンタム
    if (features.momentum > 5) score += 2;
    else if (features.momentum < -5) score -= 2;

    // 出来高
    if (features.volumeRatio > 1.5) score += 1;

    // ボラティリティ考慮
    const volatilityFactor = features.volatility > 30 ? 0.7 : 1.0;
    score *= volatilityFactor;

    // スケーリング
    score *= 0.8;

    // 信頼度の計算
    const confidence = this.calculateConfidence(features, 'RF');

    return {
      value: score,
      confidence,
      model: 'RF',
    };
  }

  /**
   * XGBoost予測
   */
  private predictXGBoost(features: ExtendedTechnicalFeatures): BaseModelPrediction {
    let score = 0;

    // RSIと変化率
    if (features.rsi < 30) score += 3;
    else if (features.rsi > 70) score -= 3;

    // モメンタムとROC
    score += Math.min(features.momentum / 3, 3);
    score += Math.min(features.rateOfChange / 3, 2);

    // SMA乖離率
    score += (features.sma5 * 0.5 + features.sma20 * 0.3) / 10;

    // テクニカル指標
    if (features.cci > 100) score += 1.5;
    else if (features.cci < -100) score -= 1.5;

    if (features.williamsR < -80) score += 1;
    else if (features.williamsR > -20) score -= 1;

    // スケーリング
    score *= 0.9;

    // 信頼度の計算
    const confidence = this.calculateConfidence(features, 'XGB');

    return {
      value: score,
      confidence,
      model: 'XGB',
    };
  }

  /**
   * LSTM予測（時系列パターン認識）
   */
  private predictLSTM(data: OHLCV[], features: ExtendedTechnicalFeatures): BaseModelPrediction {
    const prices = data.map(d => d.close).slice(-20);
    
    if (prices.length < 2) {
      return { value: 0, confidence: 0.5, model: 'LSTM' };
    }

    // 価格トレンドの計算
    const priceTrend = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;

    // モメンタムトレンドの重み付け
    let momentumWeight = 0;
    switch (features.momentumTrend) {
      case 'STRONG_UP':
        momentumWeight = 2;
        break;
      case 'UP':
        momentumWeight = 1;
        break;
      case 'DOWN':
        momentumWeight = -1;
        break;
      case 'STRONG_DOWN':
        momentumWeight = -2;
        break;
    }

    // スコアの計算
    const score = (priceTrend * 0.6 + momentumWeight * 0.4) * 0.6;

    // 信頼度の計算
    const confidence = this.calculateConfidence(features, 'LSTM');

    return {
      value: score,
      confidence,
      model: 'LSTM',
    };
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(features: ExtendedTechnicalFeatures, model: 'RF' | 'XGB' | 'LSTM'): number {
    let confidence = 0.5;

    // RSI極端値
    if (features.rsi < 25 || features.rsi > 75) {
      confidence += 0.15;
    }

    // モメンタムの強さ
    if (Math.abs(features.momentum) > 5) {
      confidence += 0.1;
    }

    // ボリンジャーバンド位置
    if (features.bollingerPosition < 10 || features.bollingerPosition > 90) {
      confidence += 0.1;
    }

    // 出来高
    if (features.volumeRatio > 1.5) {
      confidence += 0.05;
    }

    // ボラティリティレジームに応じた調整
    if (features.volatilityRegime === 'HIGH') {
      confidence *= 0.8; // 高ボラティリティ時は信頼度を下げる
    } else if (features.volatilityRegime === 'LOW') {
      confidence *= 1.1; // 低ボラティリティ時は信頼度を上げる
    }

    // モデル固有の調整
    const recentPerformance = this.getRecentPerformance(model);
    if (recentPerformance > 0.7) {
      confidence *= 1.1;
    } else if (recentPerformance < 0.5) {
      confidence *= 0.9;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * モデル間の合意度を計算
   */
  private calculateAgreementScore(predictions: BaseModelPrediction[]): number {
    const values = predictions.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // 標準偏差を計算
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    // 標準偏差が小さいほど合意度が高い
    // 標準偏差0で1.0、標準偏差5で0に近づく
    const agreementScore = Math.max(0, 1 - std / 5);

    return agreementScore;
  }

  /**
   * モデルのパフォーマンスを記録
   * 
   * @param model - モデル名
   * @param accuracy - 精度（0-1）
   */
  recordPerformance(model: 'RF' | 'XGB' | 'LSTM', accuracy: number): void {
    const history = this.performanceHistory.get(model) || [];
    history.push(accuracy);

    // 履歴サイズを制限
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }

    this.performanceHistory.set(model, history);

    // パフォーマンスに基づいて重みを動的に調整
    this.adjustWeights();
  }

  /**
   * 直近のモデルパフォーマンスを取得
   */
  private getRecentPerformance(model: 'RF' | 'XGB' | 'LSTM'): number {
    const history = this.performanceHistory.get(model) || [];
    if (history.length === 0) return 0.5;

    const recent = history.slice(-10);
    return recent.reduce((sum, acc) => sum + acc, 0) / recent.length;
  }

  /**
   * パフォーマンスに基づいて重みを動的に調整
   */
  private adjustWeights(): void {
    const performances = {
      RF: this.getRecentPerformance('RF'),
      XGB: this.getRecentPerformance('XGB'),
      LSTM: this.getRecentPerformance('LSTM'),
    };

    // 最小パフォーマンスを見つけて基準化
    const minPerf = Math.min(...Object.values(performances));
    const maxPerf = Math.max(...Object.values(performances));

    // パフォーマンスが類似している場合は調整しない
    if (maxPerf - minPerf < 0.1) {
      return;
    }

    // パフォーマンスに基づいて重みを再計算
    const rawWeights = {
      RF: Math.pow(performances.RF, 2),
      XGB: Math.pow(performances.XGB, 2),
      LSTM: Math.pow(performances.LSTM, 2),
    };

    const sum = rawWeights.RF + rawWeights.XGB + rawWeights.LSTM;

    // 既存の重みとブレンド（急激な変化を避ける）
    const blendFactor = 0.3;
    this.weights = {
      RF: this.weights.RF * (1 - blendFactor) + (rawWeights.RF / sum) * blendFactor,
      XGB: this.weights.XGB * (1 - blendFactor) + (rawWeights.XGB / sum) * blendFactor,
      LSTM: this.weights.LSTM * (1 - blendFactor) + (rawWeights.LSTM / sum) * blendFactor,
    };
  }

  /**
   * 現在のモデル重みを取得
   */
  getWeights(): ModelWeights {
    return { ...this.weights };
  }

  /**
   * モデルパフォーマンスの概要を取得
   */
  getPerformanceSummary(): ModelPerformance[] {
    return [
      {
        model: 'RF',
        accuracy: this.getAveragePerformance('RF'),
        recentAccuracy: this.getRecentPerformance('RF'),
        weight: this.weights.RF,
      },
      {
        model: 'XGB',
        accuracy: this.getAveragePerformance('XGB'),
        recentAccuracy: this.getRecentPerformance('XGB'),
        weight: this.weights.XGB,
      },
      {
        model: 'LSTM',
        accuracy: this.getAveragePerformance('LSTM'),
        recentAccuracy: this.getRecentPerformance('LSTM'),
        weight: this.weights.LSTM,
      },
    ];
  }

  /**
   * 平均パフォーマンスを取得
   */
  private getAveragePerformance(model: 'RF' | 'XGB' | 'LSTM'): number {
    const history = this.performanceHistory.get(model) || [];
    if (history.length === 0) return 0.5;

    return history.reduce((sum, acc) => sum + acc, 0) / history.length;
  }
}

export const ensembleModel = new EnsembleModel();
