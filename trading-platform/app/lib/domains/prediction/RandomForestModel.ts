/**
 * Random Forest prediction model
 * 
 * Rule-based implementation following Random Forest algorithm patterns
 */

import { PredictionFeatures } from '../../../lib/services/feature-engineering-service';
import { IModel } from './interfaces';

export class RandomForestModel implements IModel {
  readonly name = 'RandomForest';

  private readonly RSI_EXTREME_SCORE = 3;
  private readonly MOMENTUM_STRONG_THRESHOLD = 2.0;
  private readonly MOMENTUM_SCORE = 2;
  private readonly SMA_BULL_SCORE = 2;
  private readonly SMA_BEAR_SCORE = 1;
  private readonly RF_SCALING = 0.8;

  /**
   * Predict using Random Forest algorithm
   */
  predict(features: PredictionFeatures): number {
    // Handle NaN values safely
    const safeRsi = isNaN(features.rsi) ? 50 : features.rsi;
    const safeSma5 = isNaN(features.sma5) ? 0 : features.sma5;
    const safeSma20 = isNaN(features.sma20) ? 0 : features.sma20;
    const safeMomentum = isNaN(features.priceMomentum) ? 0 : features.priceMomentum;

    let score = 0;

    // RSIが極端な値の場合
    if (safeRsi < 20) {
      score += this.RSI_EXTREME_SCORE;
    } else if (safeRsi > 80) {
      score -= this.RSI_EXTREME_SCORE;
    }

    // SMAスコア
    if (safeSma5 > 0) score += this.SMA_BULL_SCORE;
    if (safeSma20 > 0) score += this.SMA_BEAR_SCORE;

    // モメンタムスコア
    if (safeMomentum > this.MOMENTUM_STRONG_THRESHOLD) {
      score += this.MOMENTUM_SCORE;
    } else if (safeMomentum < -this.MOMENTUM_STRONG_THRESHOLD) {
      score -= this.MOMENTUM_SCORE;
    }

    return score * this.RF_SCALING;
  }
}
