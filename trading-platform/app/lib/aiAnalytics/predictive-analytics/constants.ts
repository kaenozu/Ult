/**
 * PredictiveAnalytics Constants
 * 
 * 予測分析エンジンの設定値
 */

import type { ModelConfig } from './types';

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  randomForest: {
    nEstimators: 200,
    maxDepth: 15,
    minSamplesSplit: 5,
    featureImportance: true,
  },
  xgboost: {
    maxDepth: 8,
    learningRate: 0.05,
    nEstimators: 300,
    subsample: 0.8,
    colsampleByTree: 0.8,
  },
  lstm: {
    sequenceLength: 60,
    hiddenUnits: 128,
    dropout: 0.2,
    epochs: 100,
    batchSize: 32,
  },
  ensemble: {
    weights: {
      rf: 0.35,
      xgb: 0.35,
      lstm: 0.30,
    },
    confidenceThreshold: 0.65,
  },
};
