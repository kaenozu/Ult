/**
 * ML予測モデルサービス
 * 
 * このモジュールは、RF、XGB、LSTMの各モデルによる予測を実行する機能を提供します。
 */

import { PredictionFeatures } from './feature-calculation-service';
import { ModelPrediction } from '../../types';

/**
 * 市場体制タイプ
 */
export type MarketRegime = 'BULL' | 'BEAR' | 'SIDEWAYS';

/**
 * 動的重みインターフェース
 */
export interface DynamicWeights {
  rf: number;
  xgb: number;
  lstm: number;
  marketRegime: MarketRegime;
  lastUpdated: number;
}

/**
 * 精度履歴インターフェース
 */
interface AccuracyRecord {
  model: 'RF' | 'XGB' | 'LSTM';
  prediction: number;
  actual: number;
  error: number;
  timestamp: number;
}

/**
 * ML予測モデルサービス
 */
export class MLModelService {
  // デフォルト重み（バックアップ用）
  private readonly defaultWeights = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  };

  // 市場体制別の最適重みパターン
  private readonly regimeWeights: Record<MarketRegime, { rf: number; xgb: number; lstm: number }> = {
    BULL: {
      rf: 0.25,    // 強気相場ではRFの重みを減らす
      xgb: 0.40,   // XGBは勢いをよく捉える
      lstm: 0.35,  // LSTMは継続性を捉える
    },
    BEAR: {
      rf: 0.40,    // 弱気相場ではRFの重みを増やす（リスク検出）
      xgb: 0.35,   // XGBは標準的な重み
      lstm: 0.25,  // LSTMは下落を過小評価する傾向
    },
    SIDEWAYS: {
      rf: 0.35,    // もみ合い相場ではバランス重視
      xgb: 0.30,   // XGBは少し抑える
      lstm: 0.35,  // LSTMは価格パターンを捉える
    },
  };

  // 現在の動的重み
  private currentWeights: DynamicWeights = {
    rf: this.defaultWeights.RF,
    xgb: this.defaultWeights.XGB,
    lstm: this.defaultWeights.LSTM,
    marketRegime: 'SIDEWAYS',
    lastUpdated: Date.now(),
  };

  // 精度履歴（最大20件）
  private accuracyHistory: AccuracyRecord[] = [];
  private readonly maxHistorySize = 20;

  // 精度ベースの重み調整を有効化するかどうか
  private enableAccuracyBasedWeighting = true;

  // 重み平滑化のための指数移動平均係数
  private readonly smoothingFactor = 0.3;

  /**
   * すべてのモデルによる予測を実行
   */
  predict(features: PredictionFeatures): ModelPrediction {
    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.lstmPredict(features);

    // 動的重みを使用してアンサンブル予測を計算
    const ensemblePrediction = 
      rf * this.currentWeights.rf + 
      xgb * this.currentWeights.xgb + 
      lstm * this.currentWeights.lstm;
    
    const confidence = this.calculateConfidence(features, ensemblePrediction);

    return { 
      rfPrediction: rf, 
      xgbPrediction: xgb, 
      lstmPrediction: lstm, 
      ensemblePrediction, 
      confidence 
    };
  }

  /**
   * 市場体制に基づいて重みを更新（Phase 1）
   */
  updateWeightsForMarketRegime(regime: MarketRegime): void {
    const regimeWeights = this.regimeWeights[regime];
    
    // 指数移動平均による重み平滑化
    this.currentWeights.rf = this.smoothWeight(this.currentWeights.rf, regimeWeights.rf);
    this.currentWeights.xgb = this.smoothWeight(this.currentWeights.xgb, regimeWeights.xgb);
    this.currentWeights.lstm = this.smoothWeight(this.currentWeights.lstm, regimeWeights.lstm);
    this.currentWeights.marketRegime = regime;
    this.currentWeights.lastUpdated = Date.now();
  }

  /**
   * 予測精度のフィードバックを記録（Phase 2）
   */
  recordPredictionAccuracy(
    rfPrediction: number,
    xgbPrediction: number,
    lstmPrediction: number,
    actualValue: number
  ): void {
    const timestamp = Date.now();

    // 各モデルの精度を記録
    this.accuracyHistory.push(
      {
        model: 'RF',
        prediction: rfPrediction,
        actual: actualValue,
        error: Math.abs(rfPrediction - actualValue),
        timestamp,
      },
      {
        model: 'XGB',
        prediction: xgbPrediction,
        actual: actualValue,
        error: Math.abs(xgbPrediction - actualValue),
        timestamp,
      },
      {
        model: 'LSTM',
        prediction: lstmPrediction,
        actual: actualValue,
        error: Math.abs(lstmPrediction - actualValue),
        timestamp,
      }
    );

    // 最大サイズを超えたら古いものを削除
    while (this.accuracyHistory.length > this.maxHistorySize * 3) {
      this.accuracyHistory.shift();
    }

    // 精度ベースの重み調整が有効な場合は更新
    if (this.enableAccuracyBasedWeighting) {
      this.updateWeightsBasedOnAccuracy();
    }
  }

  /**
   * 精度に基づいて重みを更新（Phase 2）
   */
  private updateWeightsBasedOnAccuracy(): void {
    if (this.accuracyHistory.length < 10) {
      // データが不足している場合は更新しない
      return;
    }

    // 各モデルの平均誤差を計算
    const errors = {
      RF: this.calculateModelAverageError('RF'),
      XGB: this.calculateModelAverageError('XGB'),
      LSTM: this.calculateModelAverageError('LSTM'),
    };

    // 誤差の逆数を重みとする（誤差が小さいほど大きな重み）
    const inverseErrors = {
      RF: errors.RF > 0 ? 1 / errors.RF : 1,
      XGB: errors.XGB > 0 ? 1 / errors.XGB : 1,
      LSTM: errors.LSTM > 0 ? 1 / errors.LSTM : 1,
    };

    const totalInverse = inverseErrors.RF + inverseErrors.XGB + inverseErrors.LSTM;

    // 正規化して重みを計算（市場体制の重みとブレンド）
    const accuracyWeights = {
      rf: inverseErrors.RF / totalInverse,
      xgb: inverseErrors.XGB / totalInverse,
      lstm: inverseErrors.LSTM / totalInverse,
    };

    const regimeWeights = this.regimeWeights[this.currentWeights.marketRegime];

    // 市場体制重み(70%)と精度ベース重み(30%)をブレンド
    const blendedWeights = {
      rf: regimeWeights.rf * 0.7 + accuracyWeights.rf * 0.3,
      xgb: regimeWeights.xgb * 0.7 + accuracyWeights.xgb * 0.3,
      lstm: regimeWeights.lstm * 0.7 + accuracyWeights.lstm * 0.3,
    };

    // 平滑化して更新
    this.currentWeights.rf = this.smoothWeight(this.currentWeights.rf, blendedWeights.rf);
    this.currentWeights.xgb = this.smoothWeight(this.currentWeights.xgb, blendedWeights.xgb);
    this.currentWeights.lstm = this.smoothWeight(this.currentWeights.lstm, blendedWeights.lstm);
    this.currentWeights.lastUpdated = Date.now();
  }

  /**
   * 指定モデルの平均誤差を計算
   */
  private calculateModelAverageError(model: 'RF' | 'XGB' | 'LSTM'): number {
    const modelRecords = this.accuracyHistory.filter(r => r.model === model);
    
    if (modelRecords.length === 0) {
      return 1; // デフォルト誤差
    }

    const totalError = modelRecords.reduce((sum, record) => sum + record.error, 0);
    return totalError / modelRecords.length;
  }

  /**
   * 重みを指数移動平均で平滑化
   */
  private smoothWeight(currentWeight: number, targetWeight: number): number {
    return currentWeight * (1 - this.smoothingFactor) + targetWeight * this.smoothingFactor;
  }

  /**
   * 現在の動的重みを取得
   */
  getCurrentWeights(): DynamicWeights {
    return { ...this.currentWeights };
  }

  /**
   * 精度履歴をクリア
   */
  clearAccuracyHistory(): void {
    this.accuracyHistory = [];
  }

  /**
   * 精度ベースの重み調整を有効化/無効化
   */
  setAccuracyBasedWeighting(enabled: boolean): void {
    this.enableAccuracyBasedWeighting = enabled;
  }

  /**
   * 重みをリセット
   */
  resetWeights(): void {
    this.currentWeights = {
      rf: this.defaultWeights.RF,
      xgb: this.defaultWeights.XGB,
      lstm: this.defaultWeights.LSTM,
      marketRegime: 'SIDEWAYS',
      lastUpdated: Date.now(),
    };
    this.clearAccuracyHistory();
  }

  /**
   * Random Forestによる予測
   */
  private randomForestPredict(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_STRONG_THRESHOLD = 2.0;
    const MOMENTUM_SCORE = 2;
    const SMA_BULL_SCORE = 2;
    const SMA_BEAR_SCORE = 1;
    const RF_SCALING = 0.8;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    // SMAスコア
    if (f.sma5 > 0) score += SMA_BULL_SCORE;
    if (f.sma20 > 0) score += SMA_BEAR_SCORE;

    // モメンタムスコア
    if (f.priceMomentum > MOMENTUM_STRONG_THRESHOLD) {
      score += MOMENTUM_SCORE;
    } else if (f.priceMomentum < -MOMENTUM_STRONG_THRESHOLD) {
      score -= MOMENTUM_SCORE;
    }

    return score * RF_SCALING;
  }

  /**
   * XGBoostによる予測
   */
  private xgboostPredict(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_DIVISOR = 3;
    const MOMENTUM_MAX_SCORE = 3;
    const SMA_DIVISOR = 10;
    const SMA5_WEIGHT = 0.5;
    const SMA20_WEIGHT = 0.3;
    const XGB_SCALING = 0.9;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    // モメンタムとSMAの影響
    const momentumScore = Math.min(f.priceMomentum / MOMENTUM_DIVISOR, MOMENTUM_MAX_SCORE);
    const smaScore = (f.sma5 * SMA5_WEIGHT + f.sma20 * SMA20_WEIGHT) / SMA_DIVISOR;
    
    score += momentumScore + smaScore;

    return score * XGB_SCALING;
  }

  /**
   * LSTMによる予測（簡易版）
   */
  private lstmPredict(f: PredictionFeatures): number {
    // LSTMの予測は価格モメンタムに基づいて簡略化
    const LSTM_SCALING = 0.6;
    return f.priceMomentum * LSTM_SCALING;
  }

  /**
   * 予測の信頼度を計算
   */
  private calculateConfidence(f: PredictionFeatures, prediction: number): number {
    const RSI_EXTREME_BONUS = 10;
    const MOMENTUM_BONUS = 8;
    const PREDICTION_BONUS = 5;
    const MOMENTUM_THRESHOLD = 2.0;

    let confidence = 50;

    // RSIが極端な場合のボーナス
    if (f.rsi < 15 || f.rsi > 85) {
      confidence += RSI_EXTREME_BONUS;
    }

    // モメンタムが強い場合のボーナス
    if (Math.abs(f.priceMomentum) > MOMENTUM_THRESHOLD) {
      confidence += MOMENTUM_BONUS;
    }

    // 予測値が大きい場合のボーナス
    if (Math.abs(prediction) > MOMENTUM_THRESHOLD) {
      confidence += PREDICTION_BONUS;
    }

    // 信頼度を0-100の範囲に制限
    return Math.min(Math.max(confidence, 50), 95);
  }

  /**
   * 特徴量から市場体制を簡易検出
   * Note: より正確な検出には MarketRegimeDetector の使用を推奨
   */
  detectMarketRegimeFromFeatures(features: PredictionFeatures): MarketRegime {
    // RSIとモメンタムから市場体制を推定
    const { rsi, priceMomentum, sma5, sma20 } = features;

    // 強気市場の条件
    const isBullish = (
      rsi > 50 && 
      priceMomentum > 1.5 && 
      sma5 > 0 && 
      sma20 > 0
    );

    // 弱気市場の条件
    const isBearish = (
      rsi < 50 && 
      priceMomentum < -1.5 && 
      sma5 < 0 && 
      sma20 < 0
    );

    if (isBullish) {
      return 'BULL';
    } else if (isBearish) {
      return 'BEAR';
    } else {
      return 'SIDEWAYS';
    }
  }
}

export const mlModelService = new MLModelService();