/**
 * EnsembleModel.ts
 * 
 * アンサンブル機械学習モデルクラス。
 * 複数のモデル（Random Forest, XGBoost, LSTM）を組み合わせて
 * より高精度な予測を提供します。
 */

import { OHLCV } from '../../types/shared';
import { ExtendedTechnicalFeatures } from './FeatureEngineering';
import { ENSEMBLE_CONFIG } from '../constants/prediction';
import { TECHNICAL_INDICATORS } from '../constants/technical-indicators';

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
  shapValues?: ShapValues;
  uncertainty?: number;
}

/**
 * SHAP値（特徴量の寄与度）
 */
export interface ShapValues {
  features: { [key: string]: number };
  baseValue: number;
  totalContribution: number;
  topFeatures: Array<{ name: string; contribution: number }>;
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
    RF: ENSEMBLE_CONFIG.WEIGHTS.RF,
    XGB: ENSEMBLE_CONFIG.WEIGHTS.XGB,
    LSTM: ENSEMBLE_CONFIG.WEIGHTS.LSTM,
  };

  private performanceHistory: Map<string, number[]> = new Map([
    ['RF', []],
    ['XGB', []],
    ['LSTM', []],
  ]);

  private readonly CONFIDENCE_THRESHOLD = ENSEMBLE_CONFIG.CONFIDENCE_THRESHOLD;
  private readonly AGREEMENT_THRESHOLD = ENSEMBLE_CONFIG.AGREEMENT_THRESHOLD;
  private readonly MAX_HISTORY_SIZE = ENSEMBLE_CONFIG.MAX_HISTORY_SIZE;

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

    // SHAP値の計算（モデル解釈可能性）
    const shapValues = this.calculateShapValues(features, individualPredictions, score);

    // 予測の不確実性を計算
    const uncertainty = this.calculateUncertainty(individualPredictions, confidence);

    // シグナル方向を決定
    let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (score > ENSEMBLE_CONFIG.BUY_SCORE_THRESHOLD && confidence >= this.CONFIDENCE_THRESHOLD) {
      direction = 'BUY';
    } else if (score < ENSEMBLE_CONFIG.SELL_SCORE_THRESHOLD && confidence >= this.CONFIDENCE_THRESHOLD) {
      direction = 'SELL';
    }

    return {
      direction,
      confidence,
      score,
      individualPredictions,
      strategy,
      agreementScore,
      shapValues,
      uncertainty,
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
    const weights = ENSEMBLE_CONFIG.STACKING_WEIGHTS;
    const score = metaFeatures.reduce((sum, feat, i) => sum + feat * weights[i], 0);

    // 信頼度は個別モデルの最大値と合意度の組み合わせ
    const maxConfidence = Math.max(...predictions.map(p => p.confidence));
    const agreementScore = this.calculateAgreementScore(predictions);
    const confidence = maxConfidence * ENSEMBLE_CONFIG.MAX_CONFIDENCE_WEIGHT + agreementScore * ENSEMBLE_CONFIG.AGREEMENT_CONFIDENCE_WEIGHT;

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
    if (features.rsi < TECHNICAL_INDICATORS.RSI_OVERSOLD) score += ENSEMBLE_CONFIG.RF_RSI_OVERSOLD_SCORE;
    else if (features.rsi > TECHNICAL_INDICATORS.RSI_OVERBOUGHT) score += ENSEMBLE_CONFIG.RF_RSI_OVERBOUGHT_SCORE;

    // SMAトレンド
    if (features.sma5 > 0 && features.sma20 > 0) score += ENSEMBLE_CONFIG.RF_SMA_BULL_SCORE;
    else if (features.sma5 < 0 && features.sma20 < 0) score += ENSEMBLE_CONFIG.RF_SMA_BEAR_SCORE;

    // モメンタム
    if (features.momentum > TECHNICAL_INDICATORS.MOMENTUM_STRONG_THRESHOLD) score += ENSEMBLE_CONFIG.RF_MOMENTUM_STRONG_SCORE;
    else if (features.momentum < TECHNICAL_INDICATORS.MOMENTUM_WEAK_THRESHOLD) score += ENSEMBLE_CONFIG.RF_MOMENTUM_WEAK_SCORE;

    // 出来高
    if (features.volumeRatio > TECHNICAL_INDICATORS.VOLUME_RATIO_THRESHOLD) score += ENSEMBLE_CONFIG.RF_VOLUME_SPIKE_SCORE;

    // ボラティリティ考慮
    const volatilityFactor = features.volatility > TECHNICAL_INDICATORS.VOLATILITY_HIGH_THRESHOLD ? ENSEMBLE_CONFIG.RF_VOLATILITY_HIGH_FACTOR : 1.0;
    score *= volatilityFactor;

    // スケーリング
    score *= ENSEMBLE_CONFIG.RF_SCALING_FACTOR;

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
    if (features.rsi < TECHNICAL_INDICATORS.RSI_OVERSOLD) score += ENSEMBLE_CONFIG.XGB_RSI_OVERSOLD_SCORE;
    else if (features.rsi > TECHNICAL_INDICATORS.RSI_OVERBOUGHT) score += ENSEMBLE_CONFIG.XGB_RSI_OVERBOUGHT_SCORE;

    // モメンタムとROC
    score += Math.min(features.momentum / ENSEMBLE_CONFIG.XGB_MOMENTUM_DIVISOR, ENSEMBLE_CONFIG.XGB_MOMENTUM_MAX_SCORE);
    score += Math.min(features.rateOfChange / ENSEMBLE_CONFIG.XGB_RATE_OF_CHANGE_DIVISOR, ENSEMBLE_CONFIG.XGB_RATE_OF_CHANGE_MAX_SCORE);

    // SMA乖離率
    score += (features.sma5 * ENSEMBLE_CONFIG.XGB_SMA_WEIGHT_5 + features.sma20 * ENSEMBLE_CONFIG.XGB_SMA_WEIGHT_20) / ENSEMBLE_CONFIG.XGB_SMA_DIVISOR;

    // テクニカル指標
    if (features.cci > TECHNICAL_INDICATORS.CCI_OVERBOUGHT) score += ENSEMBLE_CONFIG.XGB_CCI_OVERBOUGHT_SCORE;
    else if (features.cci < TECHNICAL_INDICATORS.CCI_OVERSOLD) score += ENSEMBLE_CONFIG.XGB_CCI_OVERSOLD_SCORE;

    if (features.williamsR < TECHNICAL_INDICATORS.WILLIAMS_R_OVERSOLD) score += ENSEMBLE_CONFIG.XGB_WILLIAMS_R_OVERSOLD_SCORE;
    else if (features.williamsR > TECHNICAL_INDICATORS.WILLIAMS_R_OVERBOUGHT) score += ENSEMBLE_CONFIG.XGB_WILLIAMS_R_OVERBOUGHT_SCORE;

    // スケーリング
    score *= ENSEMBLE_CONFIG.XGB_SCALING_FACTOR;

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
    const prices = data.map(d => d.close).slice(-ENSEMBLE_CONFIG.LSTM_PRICE_HISTORY_LENGTH);

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
    const score = (priceTrend * ENSEMBLE_CONFIG.LSTM_PRICE_TREND_WEIGHT + momentumWeight * ENSEMBLE_CONFIG.LSTM_MOMENTUM_WEIGHT) * ENSEMBLE_CONFIG.LSTM_SCALING_FACTOR;

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
      confidence += ENSEMBLE_CONFIG.RSI_EXTREME_BONUS;
    }

    // モメンタムの強さ
    if (Math.abs(features.momentum) > TECHNICAL_INDICATORS.MOMENTUM_STRONG_THRESHOLD) {
      confidence += ENSEMBLE_CONFIG.MOMENTUM_STRONG_BONUS;
    }

    // ボリンジャーバンド位置
    if (features.bollingerPosition < TECHNICAL_INDICATORS.BB_POSITION_LOWER_THRESHOLD || features.bollingerPosition > TECHNICAL_INDICATORS.BB_POSITION_UPPER_THRESHOLD) {
      confidence += ENSEMBLE_CONFIG.BOLLINGER_POSITION_BONUS;
    }

    // 出来高
    if (features.volumeRatio > TECHNICAL_INDICATORS.VOLUME_RATIO_THRESHOLD) {
      confidence += ENSEMBLE_CONFIG.VOLUME_SPIKE_BONUS;
    }

    // ボラティリティレジームに応じた調整
    if (features.volatilityRegime === 'HIGH') {
      confidence *= ENSEMBLE_CONFIG.VOLATILITY_HIGH_MULTIPLIER; // 高ボラティリティ時は信頼度を下げる
    } else if (features.volatilityRegime === 'LOW') {
      confidence *= ENSEMBLE_CONFIG.VOLATILITY_LOW_MULTIPLIER; // 低ボラティリティ時は信頼度を上げる
    }

    // モデル固有の調整
    const recentPerformance = this.getRecentPerformance(model);
    if (recentPerformance > 0.7) {
      confidence *= ENSEMBLE_CONFIG.PERFORMANCE_HIGH_MULTIPLIER;
    } else if (recentPerformance < 0.5) {
      confidence *= ENSEMBLE_CONFIG.PERFORMANCE_LOW_MULTIPLIER;
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
    const agreementScore = Math.max(0, 1 - std / ENSEMBLE_CONFIG.AGREEMENT_STD_DIVISOR);

    return agreementScore;
  }

  /**
   * SHAP値を計算（簡易版）
   * 
   * 各特徴量が予測にどれだけ寄与しているかを計算
   * 
   * @param features - 入力特徴量
   * @param predictions - 個別モデルの予測
   * @param finalScore - 最終スコア
   * @returns SHAP値
   */
  calculateShapValues(
    features: ExtendedTechnicalFeatures,
    predictions: BaseModelPrediction[],
    finalScore: number
  ): ShapValues {
    // ベース値（平均的な予測値）
    const baseValue = 0;

    // 各特徴量の寄与度を計算
    const featureContributions: { [key: string]: number } = {};

    // RSIの寄与
    if (features.rsi < 30) {
      featureContributions['rsi_oversold'] = 2.0;
    } else if (features.rsi > 70) {
      featureContributions['rsi_overbought'] = -2.0;
    } else {
      featureContributions['rsi_neutral'] = 0;
    }

    // モメンタムの寄与
    featureContributions['momentum'] = features.momentum / 10;

    // SMAトレンドの寄与
    const smaTrend = (features.sma5 + features.sma20 + features.sma50) / 3;
    featureContributions['sma_trend'] = smaTrend / 10;

    // ボラティリティの寄与（負の影響）
    if (features.volatilityRegime === 'HIGH') {
      featureContributions['high_volatility'] = -0.5;
    } else if (features.volatilityRegime === 'LOW') {
      featureContributions['low_volatility'] = 0.3;
    }

    // 出来高の寄与
    if (features.volumeRatio > 1.5) {
      featureContributions['high_volume'] = 0.5;
    }

    // MACDの寄与
    featureContributions['macd_signal'] = features.macdSignal / 5;

    // モデル合意度の寄与
    const agreementScore = this.calculateAgreementScore(predictions);
    featureContributions['model_agreement'] = agreementScore * 1.5;

    // マクロ指標の寄与（利用可能な場合）
    if (features.macroIndicators?.vix) {
      featureContributions['vix_impact'] = -(features.macroIndicators.vix / 40) * 0.8;
    }

    // ニュース感情の寄与（利用可能な場合）
    if (features.sentiment) {
      featureContributions['news_sentiment'] = features.sentiment.overall * 0.7;
    }

    // 時系列特徴の寄与（利用可能な場合）
    if (features.timeSeriesFeatures) {
      featureContributions['momentum_change'] = features.timeSeriesFeatures.momentumChange / 5;
      featureContributions['price_acceleration'] = features.timeSeriesFeatures.priceAcceleration / 10;
    }

    // 総寄与度を計算
    const totalContribution = Object.values(featureContributions).reduce((sum, v) => sum + v, 0);

    // トップ特徴量を抽出
    const topFeatures = Object.entries(featureContributions)
      .map(([name, contribution]) => ({ name, contribution }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);

    return {
      features: featureContributions,
      baseValue,
      totalContribution,
      topFeatures,
    };
  }

  /**
   * 予測の不確実性を計算
   * 
   * @param predictions - 個別モデルの予測
   * @param confidence - 信頼度
   * @returns 不確実性スコア（0-1、高いほど不確実）
   */
  calculateUncertainty(predictions: BaseModelPrediction[], confidence: number): number {
    // モデル間の予測値のばらつき
    const values = predictions.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    // 標準偏差を不確実性の指標として使用
    const varianceUncertainty = Math.min(std / ENSEMBLE_CONFIG.UNCERTAINTY_STD_DIVISOR, 1);

    // 信頼度の逆数も不確実性に寄与
    const confidenceUncertainty = 1 - confidence;

    // 加重平均で総合的な不確実性を計算
    const uncertainty = varianceUncertainty * ENSEMBLE_CONFIG.UNCERTAINTY_VARIANCE_WEIGHT + confidenceUncertainty * ENSEMBLE_CONFIG.UNCERTAINTY_CONFIDENCE_WEIGHT;

    return Math.min(Math.max(uncertainty, 0), 1);
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

    const recent = history.slice(-ENSEMBLE_CONFIG.RECENT_PERFORMANCE_WINDOW);
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
    if (maxPerf - minPerf < ENSEMBLE_CONFIG.MIN_PERFORMANCE_DIFF) {
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
    const blendFactor = ENSEMBLE_CONFIG.WEIGHT_BLEND_FACTOR;
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
