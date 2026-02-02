/**
 * XGBoost prediction model
 * 
 * Rule-based implementation following XGBoost algorithm patterns
 */

import { PredictionFeatures } from '../../services/feature-calculation-service';
import { IModel } from './interfaces';

export class XGBoostModel implements IModel {
  readonly name = 'XGBoost';

  private readonly RSI_EXTREME_SCORE = 3;
  private readonly MOMENTUM_DIVISOR = 3;
  private readonly MOMENTUM_MAX_SCORE = 3;
  private readonly SMA_DIVISOR = 10;
  private readonly SMA5_WEIGHT = 0.5;
  private readonly SMA20_WEIGHT = 0.3;
  private readonly XGB_SCALING = 0.9;

  /**
   * Predict using XGBoost algorithm
   */
  predict(features: PredictionFeatures): number {
    // Handle NaN values safely
    const safeRsi = isNaN(features.rsi) ? 50 : features.rsi;
    const safeMomentum = isNaN(features.priceMomentum) ? 0 : features.priceMomentum;
    const safeSma5 = isNaN(features.sma5) ? 0 : features.sma5;
    const safeSma20 = isNaN(features.sma20) ? 0 : features.sma20;

    let score = 0;

    // RSIが極端な値の場合
    if (safeRsi < 20) {
      score += this.RSI_EXTREME_SCORE;
    } else if (safeRsi > 80) {
      score -= this.RSI_EXTREME_SCORE;
    }

    // モメンタムとSMAの影響
    const momentumScore = Math.min(safeMomentum / this.MOMENTUM_DIVISOR, this.MOMENTUM_MAX_SCORE);
    const smaScore = (safeSma5 * this.SMA5_WEIGHT + safeSma20 * this.SMA20_WEIGHT) / this.SMA_DIVISOR;
    
    score += momentumScore + smaScore;

    return score * this.XGB_SCALING;
  }
}
