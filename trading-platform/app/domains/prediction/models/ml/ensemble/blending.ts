/**
 * Blending/Ensemble Logic
 */

import { AllFeatures, SentimentFeatures, MacroEconomicFeatures } from '../FeatureEngineering';
import { ModelPrediction, EnsembleWeights, MarketRegime } from './types';

export function applyMacroSentimentAdjustment(
  predictions: ModelPrediction[],
  macroData?: MacroEconomicFeatures,
  sentimentData?: SentimentFeatures
): ModelPrediction[] {
  return predictions.map((p) => {
    let adjustedPrediction = p.prediction;
    let adjustedConfidence = p.confidence;

    if (macroData) {
      const macroAdjustment = macroData.macroScore * 2;
      adjustedPrediction += macroAdjustment;
      if (Math.abs(macroData.macroScore) > 0.5) {
        adjustedConfidence = Math.min(95, adjustedConfidence + 5);
      }
    }

    if (sentimentData) {
      const sentimentAdjustment = sentimentData.sentimentScore * 1.5;
      adjustedPrediction += sentimentAdjustment;
      if (Math.abs(sentimentData.sentimentScore) > 0.5) {
        adjustedConfidence = Math.min(95, adjustedConfidence + 3);
      }
    }

    return {
      ...p,
      prediction: adjustedPrediction,
      confidence: adjustedConfidence,
    };
  });
}

export function calculateEnsemblePrediction(
  predictions: ModelPrediction[],
  weights: EnsembleWeights
): number {
  return (
    predictions.find((p) => p.modelType === 'RF')!.prediction * weights.RF +
    predictions.find((p) => p.modelType === 'XGB')!.prediction * weights.XGB +
    predictions.find((p) => p.modelType === 'LSTM')!.prediction * weights.LSTM +
    predictions.find((p) => p.modelType === 'TECHNICAL')!.prediction * weights.TECHNICAL
  );
}

export function calculateEnsembleConfidence(
  predictions: ModelPrediction[],
  weights: EnsembleWeights,
  regime: MarketRegime
): number {
  const weightedConfidence =
    predictions.find((p) => p.modelType === 'RF')!.confidence * weights.RF +
    predictions.find((p) => p.modelType === 'XGB')!.confidence * weights.XGB +
    predictions.find((p) => p.modelType === 'LSTM')!.confidence * weights.LSTM +
    predictions.find((p) => p.modelType === 'TECHNICAL')!.confidence * weights.TECHNICAL;

  const variance =
    predictions.reduce((sum, p) => sum + Math.pow(p.prediction, 2), 0) / predictions.length -
    Math.pow(predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length, 2);

  const agreementBonus = Math.max(0, 20 - variance * 2);
  const regimeBonus = regime.confidence / 10;

  return Math.min(
    95,
    Math.max(50, weightedConfidence + agreementBonus + regimeBonus)
  );
}

export function generateReasoning(
  predictions: ModelPrediction[],
  weights: EnsembleWeights,
  regime: MarketRegime,
  confidence: number
): string {
  const parts: string[] = [];

  parts.push(`市場状態: ${regime.regime} (${regime.trendDirection} トレンド, ボラティリティ: ${regime.volatilityLevel})`);

  const maxWeightModel = (Object.entries(weights) as [keyof EnsembleWeights, number][])
    .filter(([k]) => k !== 'ENSEMBLE')
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  parts.push(`主要モデル: ${maxWeightModel} (重み: ${(weights[maxWeightModel] * 100).toFixed(1)}%)`);

  const avgPrediction = predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length;
  parts.push(
    `予測方向: ${avgPrediction > 0 ? '強気' : avgPrediction < 0 ? '弱気' : '中立'} (${avgPrediction.toFixed(2)}%)`
  );

  parts.push(`信頼度: ${confidence.toFixed(0)}%`);

  return parts.join(' | ');
}
