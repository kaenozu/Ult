/**
 * ML Model Service
 * 
 * RF、XGB、LSTMモデルによる予測サービス
 */

import { PredictionFeatures, ModelPrediction } from '../types';

export class MLModelService {
  private readonly weights = {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  };

  /**
   * Advanced prediction with ensemble logic and quality scoring
   */
  predict(features: PredictionFeatures): ModelPrediction {
    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.lstmPredict(features);

    // Dynamic confidence-weighted ensemble (simplified)
    const ensemblePrediction = rf * this.weights.RF + xgb * this.weights.XGB + lstm * this.weights.LSTM;
    
    // Core refinement: Adjusted confidence based on indicator agreement
    const confidence = this.calculateEnhancedConfidence(features, ensemblePrediction, [rf, xgb, lstm]);

    return { 
      rfPrediction: rf, 
      xgbPrediction: xgb, 
      lstmPrediction: lstm, 
      ensemblePrediction, 
      confidence 
    };
  }

  /**
   * RF Logic: Trend & Momentum Focus
   */
  private randomForestPredict(f: PredictionFeatures): number {
    let score = 0;

    // Trend alignment (SMA)
    if (f.sma5 > f.sma20) score += 1.5;
    if (f.sma20 > f.sma50) score += 1.0;
    
    // RSI Overbought/Oversold with reversal check
    if (f.rsi < 30) {
      score += (30 - f.rsi) / 10; // Scaled oversold
      if (f.rsiChange > 0) score += 1.5; // Reversal confirmation
    } else if (f.rsi > 70) {
      score -= (f.rsi - 70) / 10;
      if (f.rsiChange < 0) score -= 1.5;
    }

    // Momentum acceleration
    if (f.priceMomentum > 2.0) score += 2.0;
    else if (f.priceMomentum < -2.0) score -= 2.0;

    return score * 0.8;
  }

  /**
   * XGB Logic: Volatility & Volume Focus
   */
  private xgboostPredict(f: PredictionFeatures): number {
    let score = 0;

    // Volume surge confirmation
    if (f.volumeRatio > 1.5) {
      // If price is up and volume is up, strong buy
      if (f.priceMomentum > 0) score += 3.0;
      else if (f.priceMomentum < 0) score -= 3.0;
    }

    // Volatility context
    const volAdjustment = f.volatility > 2.0 ? 0.7 : 1.0;
    
    // Mean reversion (Bollinger Position)
    if (f.bollingerPosition < 0.1) score += 2.5;
    else if (f.bollingerPosition > 0.9) score -= 2.5;

    return score * volAdjustment * 0.9;
  }

  /**
   * LSTM Logic: Price Cycle & Oscillators
   */
  private lstmPredict(f: PredictionFeatures): number {
    let score = 0;
    
    // Oscillator convergence
    if (f.macdSignal > 0 && f.rsiChange > 0) score += 2.0;
    else if (f.macdSignal < 0 && f.rsiChange < 0) score -= 2.0;
    
    // Price relative to ATR (Volatility normalization)
    const normalizedPrice = f.priceMomentum / (f.atrPercent || 1);
    score += normalizedPrice;

    return score * 0.7;
  }

  /**
   * Core Upgrade: Enhanced Confidence Calculation
   * Checks for model agreement and volatility stability.
   */
  private calculateEnhancedConfidence(f: PredictionFeatures, prediction: number, models: number[]): number {
    let confidence = 55; // Base confidence for beginners

    // 1. Model Agreement Bonus
    const allAgree = (models[0] > 0 && models[1] > 0 && models[2] > 0) || 
                     (models[0] < 0 && models[1] < 0 && models[2] < 0);
    if (allAgree) confidence += 15;

    // 2. Volatility Penalty
    if (f.atrPercent > 5.0) confidence -= 10; // Too much risk decreases confidence
    
    // 3. Indicator Confirmation (RSI + Momentum)
    const indicatorAgree = (f.rsi > 50 && f.priceMomentum > 0) || (f.rsi < 50 && f.priceMomentum < 0);
    if (indicatorAgree) confidence += 10;

    // 4. Momentum Strength Bonus
    if (Math.abs(f.priceMomentum) > 3.0) confidence += 10;

    // Cap confidence to avoid over-trading
    return Math.min(Math.max(confidence, 40), 98);
  }
}

export const mlModelService = new MLModelService();
