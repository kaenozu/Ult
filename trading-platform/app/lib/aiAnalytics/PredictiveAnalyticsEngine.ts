/**
 * PredictiveAnalyticsEngine (Re-export)
 * 
 * このファイルは後方互換性のために維持されています。
 * 新しいコードでは `./predictive-analytics` から直接インポートしてください。
 */

export * from './predictive-analytics';
export { PredictiveAnalyticsEngine, getGlobalAnalyticsEngine, resetGlobalAnalyticsEngine } from './predictive-analytics/PredictiveAnalyticsEngine';
export { TechnicalIndicatorCalculator } from './predictive-analytics/TechnicalIndicatorCalculator';
export { DEFAULT_MODEL_CONFIG } from './predictive-analytics/constants';
export type {
  TechnicalFeatures,
  ModelPrediction,
  PredictionResult,
  TradingSignal,
  PriceForecast,
  PositionSizingInput,
  PositionSizingResult,
  ModelConfig,
} from './predictive-analytics/types';

import { PredictiveAnalyticsEngine as Engine } from './predictive-analytics/PredictiveAnalyticsEngine';
export default Engine;
