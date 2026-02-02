/**
 * Prediction Calculator Implementation
 * 
 * Pure function implementations for prediction calculations.
 * Extracted from MLModelService for better testability.
 */

import { PredictionFeatures } from '../feature-calculation-service';
import { IPredictionCalculator } from '../interfaces/ml-model-interfaces';

/**
 * Default implementation of prediction calculator
 * Contains all pure prediction logic without side effects
 */
export class PredictionCalculator implements IPredictionCalculator {
  /**
   * Random Forest prediction algorithm
   * Rule-based scoring using RSI, SMA, and momentum
   */
  calculateRandomForest(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_STRONG_THRESHOLD = 2.0;
    const MOMENTUM_SCORE = 2;
    const SMA_BULL_SCORE = 2;
    const SMA_BEAR_SCORE = 1;
    const RF_SCALING = 0.8;

    let score = 0;

    // RSI extreme values
    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    // SMA signals
    if (f.sma5 > 0) score += SMA_BULL_SCORE;
    if (f.sma20 > 0) score += SMA_BEAR_SCORE;

    // Momentum signals
    if (f.priceMomentum > MOMENTUM_STRONG_THRESHOLD) {
      score += MOMENTUM_SCORE;
    } else if (f.priceMomentum < -MOMENTUM_STRONG_THRESHOLD) {
      score -= MOMENTUM_SCORE;
    }

    return score * RF_SCALING;
  }

  /**
   * XGBoost prediction algorithm
   * Gradient boosting-inspired calculation with weighted features
   */
  calculateXGBoost(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_DIVISOR = 3;
    const MOMENTUM_MAX_SCORE = 3;
    const SMA_DIVISOR = 10;
    const SMA5_WEIGHT = 0.5;
    const SMA20_WEIGHT = 0.3;
    const XGB_SCALING = 0.9;

    let score = 0;

    // RSI extreme values
    if (f.rsi < 20) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi > 80) {
      score -= RSI_EXTREME_SCORE;
    }

    // Momentum and SMA influence
    const momentumScore = Math.min(f.priceMomentum / MOMENTUM_DIVISOR, MOMENTUM_MAX_SCORE);
    const smaScore = (f.sma5 * SMA5_WEIGHT + f.sma20 * SMA20_WEIGHT) / SMA_DIVISOR;
    
    score += momentumScore + smaScore;

    return score * XGB_SCALING;
  }

  /**
   * LSTM prediction algorithm (simplified)
   * Time-series prediction based on price momentum
   */
  calculateLSTM(f: PredictionFeatures): number {
    const LSTM_SCALING = 0.6;
    return f.priceMomentum * LSTM_SCALING;
  }

  /**
   * Calculate weighted ensemble prediction
   * Combines predictions from multiple models using specified weights
   */
  calculateEnsemble(
    rf: number,
    xgb: number,
    lstm: number,
    weights: { RF: number; XGB: number; LSTM: number }
  ): number {
    return rf * weights.RF + xgb * weights.XGB + lstm * weights.LSTM;
  }

  /**
   * Calculate prediction confidence score
   * Based on feature extremity and prediction strength
   */
  calculateConfidence(f: PredictionFeatures, prediction: number): number {
    const RSI_EXTREME_BONUS = 10;
    const MOMENTUM_BONUS = 8;
    const PREDICTION_BONUS = 5;
    const MOMENTUM_THRESHOLD = 2.0;

    let confidence = 50;

    // Bonus for extreme RSI
    if (f.rsi < 15 || f.rsi > 85) {
      confidence += RSI_EXTREME_BONUS;
    }

    // Bonus for strong momentum
    if (Math.abs(f.priceMomentum) > MOMENTUM_THRESHOLD) {
      confidence += MOMENTUM_BONUS;
    }

    // Bonus for strong prediction
    if (Math.abs(prediction) > MOMENTUM_THRESHOLD) {
      confidence += PREDICTION_BONUS;
    }

    // Clamp to valid range
    return Math.min(Math.max(confidence, 50), 95);
  }
}
