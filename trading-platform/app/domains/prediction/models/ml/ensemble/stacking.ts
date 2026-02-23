/**
 * Stacking Logic - Market Regime Detection and Weight Adjustment
 */

import { AllFeatures } from '../FeatureEngineering';
import {
  MarketRegime,
  EnsembleWeights,
  ModelType,
  ModelPerformance,
  DEFAULT_WEIGHTS,
  WEIGHT_CONSTRAINTS,
} from './types';

export function detectMarketRegimeFromFeatures(
  features: AllFeatures,
  currentRegime: MarketRegime | null
): MarketRegime {
  const t = features.technical;
  const ts = features.timeSeries;

  const adx = t.cci;
  const atr = t.atr;

  let regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
  if (ts.trendStrength > 0.6) {
    regime = 'TRENDING';
  } else if (t.atrPercent > 3.0) {
    regime = 'VOLATILE';
  } else if (ts.trendStrength < 0.2 && t.atrPercent < 1.0) {
    regime = 'QUIET';
  } else {
    regime = 'RANGING';
  }

  const volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
    t.atrPercent > 3.0 ? 'HIGH' : t.atrPercent > 1.5 ? 'MEDIUM' : 'LOW';

  if (!currentRegime || currentRegime.regime !== regime) {
    return {
      regime,
      trendDirection: ts.trendDirection,
      volatilityLevel,
      confidence: ts.trendStrength * 100,
      adx,
      atr,
      expectedDuration: estimateRegimeDuration(regime),
      daysInRegime: 0,
    };
  }

  return currentRegime;
}

export function estimateRegimeDuration(regime: string): number {
  switch (regime) {
    case 'TRENDING': return 20;
    case 'RANGING': return 15;
    case 'VOLATILE': return 5;
    case 'QUIET': return 10;
    default: return 10;
  }
}

export function adjustWeightsForRegime(
  regime: MarketRegime,
  currentWeights: EnsembleWeights
): EnsembleWeights {
  const adjustedWeights = { ...currentWeights };
  const adxStrength = Math.min(regime.adx / 50, 1.0);
  const volImpact = regime.volatilityLevel === 'HIGH' ? 1.5 : 1.0;

  switch (regime.regime) {
    case 'TRENDING':
      adjustedWeights.LSTM = Math.min(WEIGHT_CONSTRAINTS.MAX_WEIGHT, currentWeights.LSTM * (1.0 + 0.5 * adxStrength));
      adjustedWeights.XGB = Math.min(WEIGHT_CONSTRAINTS.MAX_WEIGHT, currentWeights.XGB * (1.0 + 0.3 * adxStrength));
      adjustedWeights.RF = currentWeights.RF * (1.0 - 0.3 * adxStrength);
      adjustedWeights.TECHNICAL = currentWeights.TECHNICAL * (1.0 - 0.2 * adxStrength);
      break;

    case 'RANGING':
      adjustedWeights.TECHNICAL = Math.min(WEIGHT_CONSTRAINTS.MAX_WEIGHT, currentWeights.TECHNICAL * 1.5);
      adjustedWeights.RF = Math.min(WEIGHT_CONSTRAINTS.MAX_WEIGHT, currentWeights.RF * 1.3);
      adjustedWeights.LSTM = currentWeights.LSTM * 0.7;
      adjustedWeights.XGB = currentWeights.XGB * 0.9;
      break;

    case 'VOLATILE':
      adjustedWeights.RF = Math.min(WEIGHT_CONSTRAINTS.MAX_WEIGHT, currentWeights.RF * (1.0 + 0.2 * volImpact));
      adjustedWeights.XGB = Math.min(WEIGHT_CONSTRAINTS.MAX_WEIGHT, currentWeights.XGB * (1.0 + 0.3 * volImpact));
      adjustedWeights.LSTM = currentWeights.LSTM * 0.6;
      adjustedWeights.TECHNICAL = currentWeights.TECHNICAL * 0.8;
      break;

    case 'QUIET':
      const equalize = (w: number) => 0.25 * 0.5 + w * 0.5;
      adjustedWeights.RF = equalize(currentWeights.RF);
      adjustedWeights.XGB = equalize(currentWeights.XGB);
      adjustedWeights.LSTM = equalize(currentWeights.LSTM);
      adjustedWeights.TECHNICAL = equalize(currentWeights.TECHNICAL);
      break;
  }

  return normalizeWeights(adjustedWeights);
}

export function normalizeWeights(weights: EnsembleWeights): EnsembleWeights {
  const total = weights.RF + weights.XGB + weights.LSTM + weights.TECHNICAL;
  return {
    RF: weights.RF / total,
    XGB: weights.XGB / total,
    LSTM: weights.LSTM / total,
    TECHNICAL: weights.TECHNICAL / total,
    ENSEMBLE: 0,
  };
}

export function calculatePrecision(actual: number, predicted: number): number {
  return Math.sign(actual) === Math.sign(predicted) ? 1 : 0;
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
  return actual * predicted > 0 ? Math.abs(actual) : -Math.abs(actual);
}

export function adjustWeightsBasedOnPerformance(
  performanceHistory: Map<ModelType, ModelPerformance[]>,
  currentWeights: EnsembleWeights
): EnsembleWeights {
  const stats = getModelPerformanceStats(performanceHistory);
  let totalScore = 0;
  const scores: Record<ModelType, number> = {
    RF: 0, XGB: 0, LSTM: 0, TECHNICAL: 0, ENSEMBLE: 0
  };

  for (const type of ['RF', 'XGB', 'LSTM', 'TECHNICAL'] as ModelType[]) {
    const s = stats.get(type);
    if (s) {
      const score = Math.max(0.1, (s.accuracy / 100) + (s.f1Score * 0.5));
      scores[type] = score;
      totalScore += score;
    } else {
      scores[type] = 0.25;
      totalScore += 0.25;
    }
  }

  if (totalScore > 0) {
    const rf = scores.RF / totalScore;
    const xgb = scores.XGB / totalScore;
    const lstm = scores.LSTM / totalScore;
    const technical = scores.TECHNICAL / totalScore;

    const weights = [
      { type: 'RF' as ModelType, val: rf },
      { type: 'XGB' as ModelType, val: xgb },
      { type: 'LSTM' as ModelType, val: lstm },
      { type: 'TECHNICAL' as ModelType, val: technical }
    ];

    let excess = 0;
    weights.forEach(w => {
      if (w.val < WEIGHT_CONSTRAINTS.MIN_WEIGHT) {
        excess -= (WEIGHT_CONSTRAINTS.MIN_WEIGHT - w.val);
        w.val = WEIGHT_CONSTRAINTS.MIN_WEIGHT;
      }
    });

    weights.forEach(w => {
      if (w.val > WEIGHT_CONSTRAINTS.MAX_WEIGHT) {
        excess += (w.val - WEIGHT_CONSTRAINTS.MAX_WEIGHT);
        w.val = WEIGHT_CONSTRAINTS.MAX_WEIGHT;
      }
    });

    if (Math.abs(excess) > 0.0001) {
      const adjustable = weights.filter(w => w.val > WEIGHT_CONSTRAINTS.MIN_WEIGHT && w.val < WEIGHT_CONSTRAINTS.MAX_WEIGHT);
      if (adjustable.length > 0) {
        const share = excess / adjustable.length;
        adjustable.forEach(w => { w.val += share; });
      }
    }

    const finalTotal = weights.reduce((sum, w) => sum + w.val, 0);
    const newWeights: EnsembleWeights = {
      RF: Math.round((weights[0].val / finalTotal) * 10000) / 10000,
      XGB: Math.round((weights[1].val / finalTotal) * 10000) / 10000,
      LSTM: Math.round((weights[2].val / finalTotal) * 10000) / 10000,
      TECHNICAL: Math.round((weights[3].val / finalTotal) * 10000) / 10000,
      ENSEMBLE: 0,
    };

    const total = newWeights.RF + newWeights.XGB + newWeights.LSTM + newWeights.TECHNICAL;
    newWeights.TECHNICAL += (1.0 - total);

    return newWeights;
  }

  return currentWeights;
}

export function getModelPerformanceStats(
  performanceHistory: Map<ModelType, ModelPerformance[]>
): Map<ModelType, ModelPerformance> {
  const stats = new Map<ModelType, ModelPerformance>();

  for (const [modelType, history] of performanceHistory.entries()) {
    if (history.length === 0) continue;

    const avgPerformance: ModelPerformance = {
      modelType,
      accuracy: history.reduce((sum, p) => sum + p.accuracy, 0) / history.length,
      precision: history.reduce((sum, p) => sum + p.precision, 0) / history.length,
      recall: history.reduce((sum, p) => sum + p.recall, 0) / history.length,
      f1Score: history.reduce((sum, p) => sum + p.f1Score, 0) / history.length,
      sharpeRatio: history.reduce((sum, p) => sum + p.sharpeRatio, 0) / history.length,
      lastUpdate: history[history.length - 1].lastUpdate,
      totalPredictions: history.reduce((sum, p) => sum + p.totalPredictions, 0),
      correctPredictions: history.reduce((sum, p) => sum + p.correctPredictions, 0),
    };

    stats.set(modelType, avgPerformance);
  }

  return stats;
}
