/**
 * Base Model Predictions
 * STUB IMPLEMENTATIONS - Replace with actual trained ML models
 */

import { AllFeatures } from '../FeatureEngineering';
import { OHLCV } from '@/app/types';
import { ModelPrediction, ModelType } from './types';

const PRODUCTION_ML_READY = false;

export function validateProductionDeployment(): void {
  if (typeof window !== 'undefined' &&
      (window.location.hostname === 'production-domain.com' ||
       process.env.NODE_ENV === 'production' ||
       process.env.NEXT_PUBLIC_ENV === 'production')) {
    if (!PRODUCTION_ML_READY) {
      throw new Error(
        'SECURITY ERROR: Attempted to use STUB ML models in production. ' +
        'Replace stub implementations with trained models before deploying.'
      );
    }
  }
}

export function predictRandomForest(features: AllFeatures): ModelPrediction {
  const t = features.technical;
  let score = 0;

  if (t.rsi < 30) score += 3;
  else if (t.rsi > 70) score -= 3;

  if (t.momentum10 > 3) score += 2;
  else if (t.momentum10 < -3) score -= 2;

  if (t.sma5 > 0 && t.sma20 > 0) score += 2;
  if (t.sma5 < 0 && t.sma20 < 0) score -= 2;

  if (t.macdHistogram > 0) score += 1;
  else if (t.macdHistogram < 0) score -= 1;

  return {
    modelType: 'RF',
    prediction: score * 0.8,
    confidence: Math.min(95, 50 + Math.abs(score) * 5),
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

  return {
    modelType: 'XGB',
    prediction: score * 0.9,
    confidence: Math.min(95, 50 + Math.abs(score) * 4),
    timestamp: new Date().toISOString(),
  };
}

export function predictLSTMFromFeatures(features: AllFeatures): ModelPrediction {
  const ts = features.timeSeries;
  const t = features.technical;

  const prediction = ts.trendStrength * (ts.trendDirection === 'UP' ? 5 : -5) + t.priceVelocity;
  const confidence = Math.min(95, Math.max(50, 100 - t.atrPercent * 5));

  return {
    modelType: 'LSTM',
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

  return {
    modelType: 'TECHNICAL',
    prediction: score,
    confidence: Math.min(95, 50 + Math.abs(bullishSignals - bearishSignals) * 8),
    timestamp: new Date().toISOString(),
  };
}

export function generateAllPredictions(features: AllFeatures): ModelPrediction[] {
  return [
    predictRandomForest(features),
    predictXGBoost(features),
    predictLSTMFromFeatures(features),
    predictTechnical(features),
  ];
}
