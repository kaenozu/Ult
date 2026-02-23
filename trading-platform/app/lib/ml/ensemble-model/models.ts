import { OHLCV } from '../../../types/shared';
import type { AllFeatures, SentimentFeatures, MacroEconomicFeatures } from '../../services/feature-engineering/feature-types';
import { RSI_THRESHOLDS } from '../../config/prediction-config';
import { candlestickPatternService } from '../../services/candlestick-pattern-service';
import type { ModelPrediction, ModelType } from './types';

export function predictRandomForest(features: AllFeatures): ModelPrediction {
  const t = features.technical;
  let score = 0;

  if (t.rsi < RSI_THRESHOLDS.EXTREME_OVERSOLD) score += 4;
  else if (t.rsi < RSI_THRESHOLDS.MODERATE_OVERSOLD) score += 2;
  else if (t.rsi > RSI_THRESHOLDS.EXTREME_OVERBOUGHT) score -= 4;
  else if (t.rsi > RSI_THRESHOLDS.MODERATE_OVERBOUGHT) score -= 2;

  if (t.momentum10 > 3) score += 2;
  else if (t.momentum10 < -3) score -= 2;

  if (t.sma5 > 0 && t.sma20 > 0) score += 2;
  if (t.sma5 < 0 && t.sma20 < 0) score -= 2;

  if (t.macdHistogram > 0) score += 1;
  else if (t.macdHistogram < 0) score -= 1;

  const prediction = score * 0.8;
  const confidence = Math.min(95, 50 + Math.abs(score) * 5);

  return {
    modelType: 'RF',
    prediction,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

export function predictXGBoost(features: AllFeatures): ModelPrediction {
  const t = features.technical;
  let score = 0;

  score += (50 - t.rsi) / 10;
  score += (t.momentum10 + t.momentum20) / 5;
  score += (t.sma5 + t.sma10 + t.sma20) / 10;
  score += (t.bbPosition - 50) / 20;
  score += (t.atrRatio - 1) * 2;

  const prediction = score * 0.9;
  const confidence = Math.min(95, 50 + Math.abs(score) * 4);

  return {
    modelType: 'XGB',
    prediction,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

export function predictLSTM(data: OHLCV[], features: AllFeatures): ModelPrediction {
  const prices = data.map(d => d.close);
  const recentPrices = prices.slice(-30);

  const n = recentPrices.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = recentPrices.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * recentPrices[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const prediction = (slope / (recentPrices[0] || 1)) * 100 * 30;

  const volatility = features.technical.atrPercent;
  const confidence = Math.min(95, Math.max(50, 100 - volatility * 2));

  return {
    modelType: 'LSTM',
    prediction,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

export function predictTechnical(features: AllFeatures): ModelPrediction {
  const t = features.technical;
  let score = 0;
  let bullishSignals = 0;
  let bearishSignals = 0;

  if (t.rsi < 30) bullishSignals++;
  else if (t.rsi > 70) bearishSignals++;

  if (t.macdHistogram > 0) bullishSignals++;
  else bearishSignals++;

  if (t.sma5 > 0 && t.sma20 > 0 && t.sma50 > 0) bullishSignals++;
  else if (t.sma5 < 0 && t.sma20 < 0 && t.sma50 < 0) bearishSignals++;

  if (t.bbPosition < 20) bullishSignals++;
  else if (t.bbPosition > 80) bearishSignals++;

  if (t.volumeTrend === 'INCREASING' && bullishSignals > bearishSignals) score += 1;
  if (t.volumeTrend === 'INCREASING' && bearishSignals > bullishSignals) score -= 1;

  score += (bullishSignals - bearishSignals) * 1.5;

  const prediction = score;
  const confidence = Math.min(95, 50 + Math.abs(bullishSignals - bearishSignals) * 8);

  return {
    modelType: 'TECHNICAL',
    prediction,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

export function predictPattern(data: OHLCV[]): ModelPrediction {
  const features = candlestickPatternService.calculatePatternFeatures(data);
  const signal = candlestickPatternService.getPatternSignal(features);

  const prediction = signal * 3;
  const confidence = Math.min(95, 50 + Math.abs(signal) * 30);

  return {
    modelType: 'PATTERN',
    prediction,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

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

export function generateAllPredictions(
  data: OHLCV[],
  features: AllFeatures
): ModelPrediction[] {
  return [
    predictRandomForest(features),
    predictXGBoost(features),
    predictLSTM(data, features),
    predictTechnical(features),
    predictPattern(data),
  ];
}
