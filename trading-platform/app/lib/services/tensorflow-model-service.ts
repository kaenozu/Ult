/**
 * TensorFlow.js Model Service
 * 
 * Re-exports from domains/prediction/services for backward compatibility.
 * Please import directly from @/app/domains/prediction/services in new code.
 */

// Re-export everything from domains
export {
  LSTMModel,
  GRUModel,
  FeedForwardModel,
  featuresToArray,
} from '@/app/domains/prediction/services/tensorflow-model-service';
export type {
  ModelTrainingData,
  ModelMetrics,
} from '@/app/domains/prediction/services/tensorflow-model-service';

// Additional types not in domains version
export interface ModelConfig {
  inputSize?: number;
  hiddenUnits?: number;
  outputSize?: number;
  learningRate?: number;
}

// Re-export PredictionFeatures from domains types
export type { PredictionFeatures } from '@/app/domains/prediction/types';
