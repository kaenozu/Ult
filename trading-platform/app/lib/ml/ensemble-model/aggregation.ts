import { OHLCV } from '../../../types/shared';
import { calculateATR } from '../../utils/technical-analysis';
import { OPTIMIZED_ENSEMBLE_WEIGHTS } from '../../config/prediction-config';
import type {
  EnsembleWeights,
  MarketRegime,
  ModelPrediction,
  ModelType,
  AdjustableModelType,
  RegimeType,
  WeightAdjustmentConfig,
} from './types';
import { DEFAULT_WEIGHT_ADJUSTMENT_CONFIG } from './types';

export function normalizeWeights(weights: EnsembleWeights): EnsembleWeights {
  const total = weights.RF + weights.XGB + weights.LSTM + weights.TECHNICAL + weights.PATTERN;
  if (total === 0) {
    return { ...weights };
  }
  return {
    RF: weights.RF / total,
    XGB: weights.XGB / total,
    LSTM: weights.LSTM / total,
    TECHNICAL: weights.TECHNICAL / total,
    PATTERN: weights.PATTERN / total,
    ENSEMBLE: weights.ENSEMBLE,
  };
}

export function calculateADX(data: OHLCV[], period: number): number {
  if (data.length < period * 2) return 20;

  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const atr = calculateATR(data, period);

  const plusDI: number[] = [];
  const minusDI: number[] = [];
  for (let i = 0; i < plusDM.length; i++) {
    const atrValue = atr[i + 1] || atr[atr.length - 1];
    plusDI.push((plusDM[i] / atrValue) * 100);
    minusDI.push((minusDM[i] / atrValue) * 100);
  }

  const dx: number[] = [];
  for (let i = 0; i < plusDI.length; i++) {
    const sum = plusDI[i] + minusDI[i];
    dx.push(sum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / sum) * 100 : 0);
  }

  const recentDX = dx.slice(-period);
  return recentDX.reduce((sum, d) => sum + d, 0) / recentDX.length;
}

export function estimateRegimeDuration(regime: RegimeType): number {
  switch (regime) {
    case 'TRENDING':
      return 20;
    case 'RANGING':
      return 15;
    case 'VOLATILE':
      return 5;
    case 'QUIET':
      return 10;
    default:
      return 10;
  }
}

export function detectMarketRegime(
  data: OHLCV[],
  currentRegime: MarketRegime | null,
  lastRegimeUpdate: string
): MarketRegime {
  const prices = data.map(d => d.close);

  const adx = calculateADX(data, 14);
  const atr = calculateATR(data, 14);

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * 100;

  const recentPrices = prices.slice(-20);
  const firstHalf = recentPrices.slice(0, 10);
  const secondHalf = recentPrices.slice(10);
  const trendDirection =
    (secondHalf.reduce((sum, p) => sum + p, 0) / 10) >
    (firstHalf.reduce((sum, p) => sum + p, 0) / 10) * 1.02
      ? 'UP'
      : (secondHalf.reduce((sum, p) => sum + p, 0) / 10) <
        (firstHalf.reduce((sum, p) => sum + p, 0) / 10) * 0.98
      ? 'DOWN'
      : 'NEUTRAL';

  let regime: RegimeType;
  if (adx > 25) {
    regime = 'TRENDING';
  } else if (volatility > 2.5) {
    regime = 'VOLATILE';
  } else if (adx < 20 && volatility < 1.5) {
    regime = 'QUIET';
  } else {
    regime = 'RANGING';
  }

  const volatilityLevel = volatility > 2.5 ? 'HIGH' : volatility > 1.5 ? 'MEDIUM' : 'LOW';
  const confidence = Math.min(100, (adx / 40) * 100);

  let daysInRegime = 0;
  if (currentRegime && currentRegime.regime === regime) {
    const lastUpdate = new Date(lastRegimeUpdate);
    const now = new Date();
    daysInRegime = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (!currentRegime || currentRegime.regime !== regime) {
    return {
      regime,
      trendDirection,
      volatilityLevel,
      confidence,
      adx,
      atr: atr[atr.length - 1] || 0,
      expectedDuration: estimateRegimeDuration(regime),
      daysInRegime: 0,
    };
  }

  return {
    ...currentRegime,
    daysInRegime,
  };
}

export function adjustWeightsForRegime(
  regime: MarketRegime,
  config: WeightAdjustmentConfig
): EnsembleWeights {
  const baseWeights = OPTIMIZED_ENSEMBLE_WEIGHTS[regime.regime];

  const adjustedWeights: EnsembleWeights = {
    RF: Math.max(config.minWeight, Math.min(config.maxWeight, baseWeights.RF)),
    XGB: Math.max(config.minWeight, Math.min(config.maxWeight, baseWeights.XGB)),
    LSTM: Math.max(config.minWeight, Math.min(config.maxWeight, baseWeights.LSTM)),
    TECHNICAL: Math.max(config.minWeight, Math.min(config.maxWeight, baseWeights.TECHNICAL)),
    PATTERN: Math.max(config.minWeight, Math.min(config.maxWeight, baseWeights.PATTERN)),
    ENSEMBLE: 0,
  };

  return normalizeWeights(adjustedWeights);
}

export function calculateEnsemblePrediction(
  predictions: ModelPrediction[],
  weights: EnsembleWeights
): number {
  const findByType = (type: ModelType) => predictions.find((p) => p.modelType === type)!;

  return (
    findByType('RF').prediction * weights.RF +
    findByType('XGB').prediction * weights.XGB +
    findByType('LSTM').prediction * weights.LSTM +
    findByType('TECHNICAL').prediction * weights.TECHNICAL +
    findByType('PATTERN').prediction * weights.PATTERN
  );
}

export function calculateEnsembleConfidence(
  predictions: ModelPrediction[],
  weights: EnsembleWeights,
  regime: MarketRegime
): number {
  const findByType = (type: ModelType) => predictions.find((p) => p.modelType === type)!;

  const weightedConfidence =
    findByType('RF').confidence * weights.RF +
    findByType('XGB').confidence * weights.XGB +
    findByType('LSTM').confidence * weights.LSTM +
    findByType('TECHNICAL').confidence * weights.TECHNICAL +
    findByType('PATTERN').confidence * weights.PATTERN;

  const variance =
    predictions.reduce((sum, p) => sum + Math.pow(p.prediction, 2), 0) / predictions.length -
    Math.pow(predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length, 2);

  const agreementBonus = Math.max(0, 20 - variance * 2);
  const regimeBonus = regime.confidence / 10;

  return Math.min(95, Math.max(50, weightedConfidence + agreementBonus + regimeBonus));
}

export function generateReasoning(
  predictions: ModelPrediction[],
  weights: EnsembleWeights,
  regime: MarketRegime,
  confidence: number
): string {
  const parts: string[] = [];

  parts.push(`市場状態: ${regime.regime} (${regime.trendDirection} トレンド, ボラティリティ: ${regime.volatilityLevel})`);

  const maxWeightModel = Object.entries(weights).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0] as ModelType;
  parts.push(`主要モデル: ${maxWeightModel} (重み: ${(weights[maxWeightModel] * 100).toFixed(1)}%)`);

  const avgPrediction = predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length;
  parts.push(
    `予測方向: ${avgPrediction > 0 ? '強気' : avgPrediction < 0 ? '弱気' : '中立'} (${avgPrediction.toFixed(2)}%)`
  );

  parts.push(`信頼度: ${confidence.toFixed(0)}%`);

  return parts.join(' | ');
}

export function calculatePrecision(actual: number, predicted: number): number {
  const actualSign = Math.sign(actual);
  const predictedSign = Math.sign(predicted);
  return actualSign === predictedSign ? 1 : 0;
}

export function calculateRecall(actual: number, predicted: number): number {
  return calculatePrecision(actual, predicted);
}

export function calculateF1Score(actual: number, predicted: number): number {
  const precision = calculatePrecision(actual, predicted);
  const recall = calculateRecall(actual, predicted);
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

export function calculateSharpeRatio(actual: number, predicted: number): number {
  const returns = actual * predicted > 0 ? Math.abs(actual) : -Math.abs(actual);
  return returns;
}

export function updateWeightsBasedOnPerformance(
  currentWeights: EnsembleWeights,
  performanceHistory: Map<ModelType, { accuracy: number }[]>,
  config: WeightAdjustmentConfig
): EnsembleWeights {
  const modelTypes: AdjustableModelType[] = ['RF', 'XGB', 'LSTM', 'TECHNICAL', 'PATTERN'];
  const newWeights = { ...currentWeights };

  for (const modelType of modelTypes) {
    const history = performanceHistory.get(modelType);
    if (!history || history.length < 10) continue;

    const recentHistory = history.slice(-10);
    const avgAccuracy = recentHistory.reduce((sum, p) => sum + p.accuracy, 0) / recentHistory.length;

    const baselineAccuracy = 55;
    const adjustment = (avgAccuracy - baselineAccuracy) / 100 * config.learningRate;

    newWeights[modelType] = Math.max(
      config.minWeight,
      Math.min(config.maxWeight, newWeights[modelType] * (1 + adjustment))
    );
  }

  return normalizeWeights(newWeights);
}
