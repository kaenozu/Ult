import { OHLCV } from '../../../types/shared';
import type { AllFeatures, SentimentFeatures, MacroEconomicFeatures } from '../../services/feature-engineering/feature-types';
import type {
  ModelType,
  ModelPerformance,
  EnsemblePrediction,
  MarketRegime,
  EnsembleWeights,
} from './types';
import { DEFAULT_WEIGHT_ADJUSTMENT_CONFIG, DEFAULT_WEIGHTS } from './types';
import {
  detectMarketRegime,
  adjustWeightsForRegime,
  calculateEnsemblePrediction,
  calculateEnsembleConfidence,
  generateReasoning,
  calculatePrecision,
  calculateRecall,
  calculateF1Score,
  calculateSharpeRatio,
  updateWeightsBasedOnPerformance,
} from './aggregation';
import {
  generateAllPredictions,
  applyMacroSentimentAdjustment,
} from './models';

export class EnsembleModel {
  private performanceHistory: Map<ModelType, ModelPerformance[]> = new Map();
  private currentWeights: EnsembleWeights = { ...DEFAULT_WEIGHTS };
  private baseWeights: EnsembleWeights = { ...DEFAULT_WEIGHTS };
  private lastRegimeUpdate: string = new Date().toISOString();
  private currentRegime: MarketRegime | null = null;

  private readonly config = DEFAULT_WEIGHT_ADJUSTMENT_CONFIG;

  predict(
    data: OHLCV[],
    features: AllFeatures,
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): EnsemblePrediction {
    const marketRegime = detectMarketRegime(
      data,
      this.currentRegime,
      this.lastRegimeUpdate
    );

    if (!this.currentRegime || this.currentRegime.regime !== marketRegime.regime) {
      this.currentRegime = marketRegime;
      this.lastRegimeUpdate = new Date().toISOString();
    } else {
      this.currentRegime = marketRegime;
    }

    const adjustedWeights = adjustWeightsForRegime(marketRegime, this.config);

    const modelPredictions = generateAllPredictions(data, features);

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

  recordPerformance(modelType: ModelType, actual: number, predicted: number): void {
    const isCorrect = Math.sign(actual) === Math.sign(predicted);
    const accuracy = isCorrect ? 100 : 0;

    const performance: ModelPerformance = {
      modelType,
      accuracy,
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

    if (history.length > this.config.performanceWindow) {
      history.shift();
    }

    this.updateWeightsBasedOnPerformance();
  }

  private updateWeightsBasedOnPerformance(): void {
    this.currentWeights = updateWeightsBasedOnPerformance(
      this.currentWeights,
      this.performanceHistory,
      this.config
    );
  }

  getCurrentWeights(): EnsembleWeights {
    return { ...this.currentWeights };
  }

  getModelPerformanceStats(): Map<ModelType, ModelPerformance> {
    const stats = new Map<ModelType, ModelPerformance>();

    for (const [modelType, history] of this.performanceHistory.entries()) {
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

  resetWeights(): void {
    this.currentWeights = { ...this.baseWeights };
    this.performanceHistory.clear();
  }
}

export const ensembleModel = new EnsembleModel();
