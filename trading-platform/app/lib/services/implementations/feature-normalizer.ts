/**
 * Feature Normalizer Implementation
 * 
 * Converts PredictionFeatures to normalized arrays for TensorFlow models
 */

import { PredictionFeatures } from '../feature-calculation-service';
import { IFeatureNormalizer } from '../interfaces/ml-model-interfaces';

/**
 * Default feature normalizer
 * Normalizes features to appropriate ranges for neural network training
 */
export class FeatureNormalizer implements IFeatureNormalizer {
  /**
   * Normalize features to standardized ranges
   * 
   * Normalization strategy:
   * - RSI: 0-100 -> 0-1
   * - Percentages: Divide by 100
   * - Momentum: Divide by 10 for reasonable range
   * - Ratios: Keep as-is (already normalized)
   */
  normalize(features: PredictionFeatures): number[] {
    return [
      features.rsi / 100,           // Normalize to 0-1
      features.rsiChange / 100,     // Normalize percentage change
      features.sma5 / 100,          // Normalize percentage deviation
      features.sma20 / 100,         // Normalize percentage deviation
      features.sma50 / 100,         // Normalize percentage deviation
      features.priceMomentum / 10,  // Normalize momentum
      features.volumeRatio,         // Already normalized
      features.volatility,          // Already normalized
      features.macdSignal / 10,     // Normalize signal
      features.bollingerPosition / 100, // Normalize to 0-1
      features.atrPercent / 10      // Normalize percentage
    ];
  }
}
