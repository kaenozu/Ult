/**
 * ML Model Service
 * 
 * RF、XGB、LSTMモデルによる予測サービス
 */

import { PredictionFeatures, ModelPrediction } from '../types';

const RSI_LOWER_BOUND = 25;
const RSI_UPPER_BOUND = 75;
const RSI_SCORE = 2;
const MOMENTUM_THRESHOLD = 1.5;
const MOMENTUM_SCORE = 1.5;
const LSTM_SCALING = 0.7;

export class MLModelService {
  private readonly weights = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  };

  predict(features: PredictionFeatures): ModelPrediction {
    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.calculateLstmScore(features);

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

  private randomForestPredict(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_STRONG_THRESHOLD = 2.0;
    const MOMENTUM_SCORE = 2;
    const SMA_BULL_SCORE = 2;
    const SMA_BEAR_SCORE = 1;
    const RF_SCALING = 0.8;

    let score = 0;

    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    if (f.sma5 > 0) score += SMA_BULL_SCORE;
    if (f.sma20 > 0) score += SMA_BEAR_SCORE;

    if (f.priceMomentum > MOMENTUM_STRONG_THRESHOLD) {
      score += MOMENTUM_SCORE;
    } else if (f.priceMomentum < -MOMENTUM_STRONG_THRESHOLD) {
      score -= MOMENTUM_SCORE;
    }

    return score * RF_SCALING;
  }

  private xgboostPredict(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_DIVISOR = 3;
    const MOMENTUM_MAX_SCORE = 3;
    const SMA_DIVISOR = 10;
    const SMA5_WEIGHT = 0.5;
    const SMA20_WEIGHT = 0.3;
    const XGB_SCALING = 0.9;

    let score = 0;

    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    const momentumScore = Math.min(f.priceMomentum / MOMENTUM_DIVISOR, MOMENTUM_MAX_SCORE);
    const smaScore = (f.sma5 * SMA5_WEIGHT + f.sma20 * SMA20_WEIGHT) / SMA_DIVISOR;
    
    score += momentumScore + smaScore;

    return score * XGB_SCALING;
  }

  private calculateLstmScore(f: PredictionFeatures): number {
    let score = 0;
    
    if (f.rsi < RSI_LOWER_BOUND) {
      score += RSI_SCORE;
    } else if (f.rsi > RSI_UPPER_BOUND) {
      score -= RSI_SCORE;
    }
    
    if (f.priceMomentum > MOMENTUM_THRESHOLD) {
      score += MOMENTUM_SCORE;
    } else if (f.priceMomentum < -MOMENTUM_THRESHOLD) {
      score -= MOMENTUM_SCORE;
    }
    
    return score * LSTM_SCALING;
  }

  private calculateConfidence(f: PredictionFeatures, prediction: number): number {
    const RSI_EXTREME_BONUS = 15;
    const RSI_STRONG_BONUS = 10;
    const MOMENTUM_BONUS = 12;
    const PREDICTION_BONUS = 10;
    const RSI_EXTREME = 20;
    const RSI_STRONG = 30;
    const MOMENTUM_THRESHOLD = 1.5;

    const hasSignal = Math.abs(prediction) > 0.5;
    let confidence = hasSignal ? 65 : 45;

    if (f.rsi < RSI_EXTREME || f.rsi > 100 - RSI_EXTREME) {
      confidence += RSI_EXTREME_BONUS;
    } else if (f.rsi < RSI_STRONG || f.rsi > 100 - RSI_STRONG) {
      confidence += RSI_STRONG_BONUS;
    }

    if (Math.abs(f.priceMomentum) > MOMENTUM_THRESHOLD) {
      confidence += MOMENTUM_BONUS;
    }

    if (Math.abs(prediction) > MOMENTUM_THRESHOLD) {
      confidence += PREDICTION_BONUS;
    }

    if (hasSignal) {
      return Math.min(Math.max(confidence, 65), 95);
    }
    return Math.min(Math.max(confidence, 30), 50);
  }
}

export const mlModelService = new MLModelService();
