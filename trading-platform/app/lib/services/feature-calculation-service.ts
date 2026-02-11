/**
 * Feature Calculation Service
 * 
 * Re-exports from domains/prediction/services for backward compatibility.
 * Please import directly from @/app/domains/prediction/services in new code.
 */

// Re-export types from domains
export type { PredictionFeatures } from '@/app/domains/prediction/types';

// Re-export service from domains
export {
  FeatureCalculationService,
  featureCalculationService,
} from '@/app/domains/prediction/services/feature-calculation-service';
