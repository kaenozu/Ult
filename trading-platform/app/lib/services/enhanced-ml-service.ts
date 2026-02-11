/**
 * Enhanced ML Service
 * 
 * Re-exports from domains/prediction/services for backward compatibility.
 * Please import directly from @/app/domains/prediction/services in new code.
 */

import type { PredictionFeatures } from '@/app/domains/prediction/types';

// Re-export from domains
export {
  EnhancedMLService,
  enhancedMLService,
  ModelPerformance,
  DriftMetrics,
} from '@/app/domains/prediction/services/enhanced-ml-service';

// Additional type not in domains
export interface EnhancedMLPrediction {
  prediction: number;
  confidence: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  features: PredictionFeatures;
}
