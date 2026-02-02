/**
 * ML予測モデルサービス
 * 
 * このモジュールは、RF、XGB、LSTMの各モデルによる予測を実行する機能を提供します。
 */

import { PredictionFeatures } from './feature-calculation-service';
import { ModelPrediction } from '../../types';
import { PREDICTION } from '../constants';

/**
 * ML予測モデルサービス
 */
export class MLModelService {
  private readonly weights = PREDICTION.MODEL_WEIGHTS;

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
    const { THRESHOLDS, SCALING } = PREDICTION;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < THRESHOLDS.RSI_OVERSOLD) {
      score += THRESHOLDS.RSI_EXTREME;
    } else if (f.rsi > THRESHOLDS.RSI_OVERBOUGHT) {
      score -= THRESHOLDS.RSI_EXTREME;
    }

    // SMAスコア
    if (f.sma5 > 0) score += THRESHOLDS.SMA_BULL_SCORE;
    if (f.sma20 > 0) score += THRESHOLDS.SMA_BEAR_SCORE;

    // モメンタムスコア
    if (f.priceMomentum > THRESHOLDS.MOMENTUM_STRONG) {
      score += THRESHOLDS.MOMENTUM_SCORE;
    } else if (f.priceMomentum < -THRESHOLDS.MOMENTUM_STRONG) {
      score -= THRESHOLDS.MOMENTUM_SCORE;
    }

    return score * SCALING.RF;
  }

  /**
   * XGBoostによる予測
   */
  private xgboostPredict(f: PredictionFeatures): number {
    const { THRESHOLDS, SCALING, XGB_PARAMS } = PREDICTION;

    let score = 0;

    // RSIが極端な値の場合
    if (f.rsi < THRESHOLDS.RSI_OVERSOLD) {
      score += THRESHOLDS.RSI_EXTREME;
    } else if (f.rsi > THRESHOLDS.RSI_OVERBOUGHT) {
      score -= THRESHOLDS.RSI_EXTREME;
    }

    // モメンタムとSMAの影響
    const momentumScore = Math.min(
      f.priceMomentum / XGB_PARAMS.MOMENTUM_DIVISOR, 
      XGB_PARAMS.MOMENTUM_MAX_SCORE
    );
    const smaScore = (
      f.sma5 * XGB_PARAMS.SMA5_WEIGHT + 
      f.sma20 * XGB_PARAMS.SMA20_WEIGHT
    ) / XGB_PARAMS.SMA_DIVISOR;
    
    score += momentumScore + smaScore;

    return score * SCALING.XGB;
  }

  /**
   * LSTMによる予測（簡易版）
   */
  private lstmPredict(f: PredictionFeatures): number {
    // LSTMの予測は価格モメンタムに基づいて簡略化
    return f.priceMomentum * PREDICTION.SCALING.LSTM;
  }

  /**
   * 予測の信頼度を計算
   */
  private calculateConfidence(f: PredictionFeatures, prediction: number): number {
    const { THRESHOLDS, CONFIDENCE } = PREDICTION;

    let confidence = CONFIDENCE.BASE;

    // RSIが極端な場合のボーナス
    if (f.rsi < THRESHOLDS.RSI_EXTREME_LOW || f.rsi > THRESHOLDS.RSI_EXTREME_HIGH) {
      confidence += CONFIDENCE.RSI_EXTREME_BONUS;
    }

    // モメンタムが強い場合のボーナス
    if (Math.abs(f.priceMomentum) > THRESHOLDS.MOMENTUM_STRONG) {
      confidence += CONFIDENCE.MOMENTUM_BONUS;
    }

    // 予測値が大きい場合のボーナス
    if (Math.abs(prediction) > THRESHOLDS.MOMENTUM_STRONG) {
      confidence += CONFIDENCE.PREDICTION_BONUS;
    }

    // 信頼度を0-100の範囲に制限
    return Math.min(Math.max(confidence, THRESHOLDS.CONFIDENCE_MIN), THRESHOLDS.CONFIDENCE_MAX);
  }
}

export const mlModelService = new MLModelService();