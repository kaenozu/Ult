/**
 * Ensemble Model Service
 */

import { AllFeatures, SentimentFeatures, MacroEconomicFeatures } from '../FeatureEngineering';
import { OHLCV } from '@/app/types';
import {
  ModelType,
  ModelPerformance,
  EnsemblePrediction,
  MarketRegime,
  EnsembleWeights,
  DEFAULT_WEIGHTS,
} from './types';
import {
  validateProductionDeployment,
  generateAllPredictions,
} from './base-models';
import {
  applyMacroSentimentAdjustment,
  calculateEnsemblePrediction,
  calculateEnsembleConfidence,
  generateReasoning,
} from './blending';
import {
  detectMarketRegimeFromFeatures,
  adjustWeightsForRegime,
  adjustWeightsBasedOnPerformance,
  calculatePrecision,
  calculateRecall,
  calculateF1Score,
  calculateSharpeRatio,
  getModelPerformanceStats,
} from './stacking';

export class EnsembleModel {
  private performanceHistory: Map<ModelType, ModelPerformance[]> = new Map();
  private currentWeights: EnsembleWeights = { ...DEFAULT_WEIGHTS };
  private baseWeights: EnsembleWeights = { ...DEFAULT_WEIGHTS };
  private lastRegimeUpdate: string = new Date().toISOString();
  private currentRegime: MarketRegime | null = null;

  predict(
    data: OHLCV[],
    features: AllFeatures,
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): EnsemblePrediction {
    validateProductionDeployment();

    if (!data || data.length === 0) {
      throw new Error('Insufficient data for prediction');
    }

    const marketRegime = detectMarketRegimeFromFeatures(features, this.currentRegime);
    this.currentRegime = marketRegime;

    const adjustedWeights = adjustWeightsForRegime(marketRegime, this.currentWeights);

    const modelPredictions = generateAllPredictions(features);

    const macroAdjustedPredictions = applyMacroSentimentAdjustment(
      modelPredictions,
      macroData,
      sentimentData
    );

    const finalPrediction = calculateEnsemblePrediction(
      macroAdjustedPredictions,
      adjustedWeights
    );

    const confidence = calculateEnsembleConfidence(
      macroAdjustedPredictions,
      adjustedWeights,
      marketRegime
    );

    const reasoning = generateReasoning(
      macroAdjustedPredictions,
      adjustedWeights,
      marketRegime,
      confidence
    );

    return {
      finalPrediction,
      confidence,
      weights: adjustedWeights,
      modelPredictions: macroAdjustedPredictions,
      marketRegime: marketRegime.regime,
      reasoning,
      timestamp: new Date().toISOString(),
    };
  }

  recordPerformance(modelType: ModelType, predicted: number, actual: number): void {
    const isCorrect = Math.sign(predicted) === Math.sign(actual);

    const performance: ModelPerformance = {
      modelType,
      accuracy: isCorrect ? 100 : 0,
      precision: calculatePrecision(actual, predicted),
      recall: calculateRecall(actual, predicted),
      f1Score: calculateF1Score(actual, predicted),
      sharpeRatio: calculateSharpeRatio(actual, predicted),
      lastUpdate: new Date().toISOString(),
      totalPredictions: 1,
      correctPredictions: isCorrect ? 1 : 0,
    };

    if (!this.performanceHistory.has(modelType)) {
      this.performanceHistory.set(modelType, []);
    }

    const history = this.performanceHistory.get(modelType)!;
    history.push(performance);

    if (history.length > 50) {
      history.shift();
    }

    this.currentWeights = adjustWeightsBasedOnPerformance(
      this.performanceHistory,
      this.currentWeights
    );
  }

  getCurrentWeights(): EnsembleWeights {
    return { ...this.currentWeights };
  }

  getModelPerformanceStats(): Map<ModelType, ModelPerformance> {
    return getModelPerformanceStats(this.performanceHistory);
  }

  resetWeights(): void {
    this.currentWeights = { ...this.baseWeights };
    this.performanceHistory.clear();
  }
}

export const ensembleModel = new EnsembleModel();
