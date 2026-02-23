export type {
  ModelType,
  AdjustableModelType,
  RegimeType,
  TrendDirection,
  VolatilityLevel,
  ModelPerformance,
  ModelPrediction,
  EnsemblePrediction,
  MarketRegime,
  EnsembleWeights,
  WeightAdjustmentConfig,
} from './types';

export { DEFAULT_WEIGHT_ADJUSTMENT_CONFIG, DEFAULT_WEIGHTS } from './types';

export { EnsembleModel, ensembleModel } from './service';

export {
  predictRandomForest,
  predictXGBoost,
  predictLSTM,
  predictTechnical,
  predictPattern,
  applyMacroSentimentAdjustment,
  generateAllPredictions,
} from './models';

export {
  normalizeWeights,
  calculateADX,
  estimateRegimeDuration,
  detectMarketRegime,
  adjustWeightsForRegime,
  calculateEnsemblePrediction,
  calculateEnsembleConfidence,
  generateReasoning,
  updateWeightsBasedOnPerformance,
} from './aggregation';
