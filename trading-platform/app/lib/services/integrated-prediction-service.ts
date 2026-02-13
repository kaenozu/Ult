/**
 * Integrated Prediction Service
 * 
 * Re-exports from domains/prediction/services for backward compatibility.
 * Please import directly from @/app/domains/prediction/services in new code.
 */

// Re-export from domains
export {
  IntegratedPredictionService,
  integratedPredictionService,
} from '@/app/domains/prediction/services/integrated-prediction-service';
export type { IntegratedPredictionResult } from '@/app/domains/prediction/services/integrated-prediction-service';

// Additional interfaces for backward compatibility
export interface EnhancedPrediction {
  prediction: number;
  confidence: number;
}

export interface MLPrediction {
  ensemblePrediction: number;
  confidence: number;
}

export interface IntegratedPrediction {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  predictions: {
    enhanced: EnhancedPrediction;
    ml: MLPrediction;
    consensus: number;
  };
}
