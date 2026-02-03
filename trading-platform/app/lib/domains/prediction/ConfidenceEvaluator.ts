/**
 * Confidence Evaluator
 * 
 * Evaluates the confidence of predictions based on features and model agreement
 */

import { PredictionFeatures } from '../../services/feature-calculation-service';
import { IConfidenceEvaluator, ModelPrediction } from './interfaces';

export class ConfidenceEvaluator implements IConfidenceEvaluator {
  private readonly RSI_EXTREME_BONUS = 10;
  private readonly MOMENTUM_BONUS = 8;
  private readonly PREDICTION_BONUS = 5;
  private readonly MOMENTUM_THRESHOLD = 2.0;
  private readonly MODEL_AGREEMENT_BONUS = 10;

  /**
   * Evaluate confidence of a prediction
   */
  evaluate(features: PredictionFeatures, prediction: number, modelPredictions: ModelPrediction[]): number {
    let confidence = 50; // Base confidence

    // Handle NaN values safely
    const safeRsi = isNaN(features.rsi) ? 50 : features.rsi;
    const safeMomentum = isNaN(features.priceMomentum) ? 0 : features.priceMomentum;
    const safePrediction = isNaN(prediction) ? 0 : prediction;

    // RSIが極端な場合のボーナス
    if (safeRsi < 15 || safeRsi > 85) {
      confidence += this.RSI_EXTREME_BONUS;
    }

    // モメンタムが強い場合のボーナス
    if (Math.abs(safeMomentum) > this.MOMENTUM_THRESHOLD) {
      confidence += this.MOMENTUM_BONUS;
    }

    // 予測値が大きい場合のボーナス
    if (Math.abs(safePrediction) > this.MOMENTUM_THRESHOLD) {
      confidence += this.PREDICTION_BONUS;
    }

    // モデル間の一致度によるボーナス
    const agreementBonus = this.calculateModelAgreement(modelPredictions);
    confidence += agreementBonus;

    // 信頼度を50-95の範囲に制限
    return Math.min(Math.max(confidence, 50), 95);
  }

  /**
   * Calculate model agreement bonus
   * Higher agreement (lower variance) = higher confidence
   */
  private calculateModelAgreement(predictions: ModelPrediction[]): number {
    if (predictions.length < 2) {
      return 0;
    }

    const values = predictions.map(p => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Low standard deviation = high agreement = higher confidence
    // Normalize to 0-MODEL_AGREEMENT_BONUS range
    const normalizedStdDev = Math.min(stdDev / (Math.abs(mean) || 1), 1);
    const agreementScore = (1 - normalizedStdDev) * this.MODEL_AGREEMENT_BONUS;

    return agreementScore;
  }
}
