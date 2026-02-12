/**
 * Prediction Clouds Module
 * 
 * ATRに基づく株価予測雲の計算と表示
 */

// Types
export type {
  PredictionCloudPoint,
  PredictionCloudResult,
  PredictionCloudConfig,
  PredictionCloudStyle,
} from './types';

export {
  DEFAULT_PREDICTION_CLOUD_CONFIG,
  DEFAULT_PREDICTION_CLOUD_STYLE,
  RISK_BASED_STYLES,
} from './types';

// Calculator
export {
  calculatePredictionClouds,
  calculateATRTrend,
  getVolatilityAssessment,
  getTrendDirection,
  calculateRiskScore,
} from './calculator';

export type { ATRTrend } from './calculator';
