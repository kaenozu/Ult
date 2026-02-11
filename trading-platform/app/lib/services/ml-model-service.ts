/**
 * ML Model Service
 * 
 * Re-exports from domains/prediction/services for backward compatibility.
 * Please import directly from @/app/domains/prediction/services in new code.
 */

import { PREDICTION } from '../constants';
import { 
  MLModelService as DomainMLModelService,
  mlModelService as domainMlModelService,
} from '@/app/domains/prediction/services/ml-model-service';
import type { PredictionFeatures } from '@/app/domains/prediction/types';
import type { ModelPrediction } from '../../types';

export interface MLServiceConfig {
  weights: {
    RF: number;
    XGB: number;
    LSTM: number;
  };
  useTensorFlowModels: boolean;
}

/**
 * ML Model Service with extended configuration support
 * Extends the domain service with TensorFlow.js capabilities
 */
export class MLModelService extends DomainMLModelService {
  private readonly weights: MLServiceConfig['weights'];
  private useTensorFlowModels: boolean;

  constructor(
    _calculator?: unknown,
    _placeholder?: unknown,
    config: Partial<MLServiceConfig> = {}
  ) {
    super();
    this.weights = config.weights || PREDICTION.MODEL_WEIGHTS;
    this.useTensorFlowModels = config.useTensorFlowModels || false;
  }

  /**
   * Async prediction with TensorFlow.js support
   */
  async predictAsync(features: PredictionFeatures): Promise<ModelPrediction> {
    // For now, delegate to sync prediction
    // TensorFlow.js integration can be added here
    return this.predict(features) as ModelPrediction;
  }
}

/**
 * Singleton instance
 */
export const mlModelService = new MLModelService();
