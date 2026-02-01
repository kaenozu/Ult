/**
 * ML予測モデルサービス
 * 
 * このモジュールは、RF、XGB、LSTMの各モデルによる予測を実行する機能を提供します。
 */

import { PredictionFeatures } from './feature-calculation-service';
import { ModelPrediction } from '../../types';

/**
 * ML予測モデルサービス
 */
export class MLModelService {
  private readonly weights = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  };

  /**
   * すべてのモデルによる予測を実行
   */
  predict(features: PredictionFeatures): ModelPrediction {
    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.lstmPredict(features);

    const ensemblePrediction = rf * this.weights.RF + xgb * this.weights.XGB + lstm * this.weights.LSTM;
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
}

export const mlModelService = new MLModelService();