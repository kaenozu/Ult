/**
 * Prediction Calculator Implementation
 * 
 * Pure function implementations for prediction calculations.
 * Extracted from MLModelService for better testability.
 */

import { PredictionFeatures } from '../feature-engineering-service';
import { IPredictionCalculator } from '../interfaces/ml-model-interfaces';

/**
 * Default implementation of prediction calculator
 * Contains all pure prediction logic without side effects
 */
export class PredictionCalculator implements IPredictionCalculator {
  /**
   * Random Forest prediction algorithm
   * Rule-based scoring using RSI, SMA, and momentum
   * Optimized parameters for better early signal detection
   */
  calculateRandomForest(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 4;  // Increased from 3 for stronger signals
    const RSI_MODERATE_SCORE = 2; // Added for moderate oversold/overbought
    const MOMENTUM_STRONG_THRESHOLD = 1.5; // Reduced from 2.0 for earlier detection
    const MOMENTUM_MODERATE_THRESHOLD = 0.8; // Added moderate threshold
    const MOMENTUM_STRONG_SCORE = 3; // Increased for strong momentum
    const MOMENTUM_MODERATE_SCORE = 1; // Added moderate score
    const SMA_BULL_SCORE = 2;
    const SMA_BEAR_SCORE = 1;
    const SMA50_BULL_SCORE = 1; // Added SMA50 consideration
    const RF_SCALING = 0.85; // Increased from 0.8

    let score = 0;

    // RSI extreme values - more granular thresholds
    if (f.rsi < 15) {
      score += RSI_EXTREME_SCORE; // Strong oversold
    } else if (f.rsi < 30) {
      score += RSI_MODERATE_SCORE; // Moderate oversold
    } else if (f.rsi > 85) {
      score -= RSI_EXTREME_SCORE; // Strong overbought
    } else if (f.rsi > 70) {
      score -= RSI_MODERATE_SCORE; // Moderate overbought
    }

    // SMA signals with SMA50 added
    if (f.sma5 > 0) score += SMA_BULL_SCORE;
    if (f.sma20 > 0) score += SMA_BEAR_SCORE;
    if (f.sma50 > 0) score += SMA50_BULL_SCORE;

    // Enhanced momentum signals with multiple thresholds
    if (f.priceMomentum > MOMENTUM_STRONG_THRESHOLD) {
      score += MOMENTUM_STRONG_SCORE;
    } else if (f.priceMomentum > MOMENTUM_MODERATE_THRESHOLD) {
      score += MOMENTUM_MODERATE_SCORE;
    } else if (f.priceMomentum < -MOMENTUM_STRONG_THRESHOLD) {
      score -= MOMENTUM_STRONG_SCORE;
    } else if (f.priceMomentum < -MOMENTUM_MODERATE_THRESHOLD) {
      score -= MOMENTUM_MODERATE_SCORE;
    }

    return score * RF_SCALING;
  }

  /**
   * XGBoost prediction algorithm
   * Gradient boosting-inspired calculation with weighted features
   * Optimized with adaptive feature weights
   */
  calculateXGBoost(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 4;
    const RSI_MODERATE_SCORE = 2;
    const MOMENTUM_DIVISOR = 2.5; // Reduced for more sensitivity
    const MOMENTUM_MAX_SCORE = 4; // Increased for stronger signals
    const SMA_DIVISOR = 8; // Reduced for more SMA influence
    const SMA5_WEIGHT = 0.6; // Increased
    const SMA20_WEIGHT = 0.4; // Increased
    const SMA50_WEIGHT = 0.2; // Added
    const VOLATILITY_WEIGHT = 0.3; // Added volatility consideration
    const XGB_SCALING = 0.95; // Increased from 0.9

    let score = 0;

    // RSI with more granular thresholds
    if (f.rsi < 15) {
      score += RSI_EXTREME_SCORE;
    } else if (f.rsi < 30) {
      score += RSI_MODERATE_SCORE;
    } else if (f.rsi > 85) {
      score -= RSI_EXTREME_SCORE;
    } else if (f.rsi > 70) {
      score -= RSI_MODERATE_SCORE;
    }

    // Enhanced momentum calculation with adaptive scaling
    const momentumScore = Math.min(
      Math.abs(f.priceMomentum) / MOMENTUM_DIVISOR, 
      MOMENTUM_MAX_SCORE
    ) * Math.sign(f.priceMomentum);
    
    // SMA with additional SMA50 and volume ratio consideration
    const smaScore = (
      f.sma5 * SMA5_WEIGHT + 
      f.sma20 * SMA20_WEIGHT + 
      f.sma50 * SMA50_WEIGHT
    ) / SMA_DIVISOR;
    
    // Volatility adjustment - reduce score in high volatility
    const volatilityAdjustment = f.volatility > 5 ? 0.8 : 1.0;
    
    // Volume confirmation - boost score if volume supports the move
    const volumeBoost = f.volumeRatio > 1.5 ? 1.2 : 1.0;
    
    score += (momentumScore + smaScore) * volatilityAdjustment * volumeBoost;

    return score * XGB_SCALING;
  }

  /**
   * LSTM prediction algorithm (simplified)
   * Time-series prediction based on price momentum with trend detection
   * Enhanced with multi-period momentum and trend confirmation
   */
  calculateLSTM(f: PredictionFeatures): number {
    const LSTM_SCALING = 0.8; // Increased from 0.6
    const TREND_CONFIRMATION_WEIGHT = 0.3;
    
    // Base momentum with scaling
    let prediction = f.priceMomentum * LSTM_SCALING;
    
    // Trend confirmation using multiple SMAs
    const trendStrength = (f.sma5 + f.sma20 + f.sma50) / 3;
    const trendConfirmed = Math.sign(f.priceMomentum) === Math.sign(trendStrength);
    
    // Boost prediction when trend is confirmed across timeframes
    if (trendConfirmed && Math.abs(trendStrength) > 1.0) {
      prediction *= (1 + TREND_CONFIRMATION_WEIGHT);
    }
    
    // MACD confirmation
    if (f.macdSignal > 0 && prediction > 0) {
      prediction *= 1.1;
    } else if (f.macdSignal < 0 && prediction < 0) {
      prediction *= 1.1;
    }
    
    // Volatility dampening - reduce extreme predictions in volatile markets
    if (f.volatility > 5) {
      prediction *= 0.85;
    }
    
    return prediction;
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
