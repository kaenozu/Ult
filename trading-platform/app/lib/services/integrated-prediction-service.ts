/**
 * Integrated Prediction Service
 * 
 * Combines multiple prediction models and signals for unified predictions
 */

import { OHLCV, Stock } from '@/app/types';
import { EnhancedMLService } from './enhanced-ml-service';
import { MLModelService } from './ml-model-service';
import { featureCalculationService } from './feature-calculation-service';
import { mlPredictionService } from '../mlPrediction';

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

export class IntegratedPredictionService {
  private enhancedService: EnhancedMLService;
  private mlService: MLModelService;

  constructor() {
    this.enhancedService = new EnhancedMLService();
    this.mlService = new MLModelService();
  }

  async predict(stock: Stock, ohlcv: OHLCV[]): Promise<IntegratedPrediction> {
    // Get predictions from different services
    const enhancedPrediction = await this.enhancedService.predict(stock, ohlcv);
    const indicators = mlPredictionService.calculateIndicators(ohlcv);
    const features = featureCalculationService.calculateFeatures(ohlcv, indicators);
    const mlPrediction = this.mlService.predict(features);

    // Combine predictions into consensus
    const consensus = (enhancedPrediction.prediction + mlPrediction.ensemblePrediction) / 2;

    // Generate final signal
    let signal: 'BUY' | 'SELL' | 'HOLD';
    if (consensus > 0.55) {
      signal = 'BUY';
    } else if (consensus < 0.45) {
      signal = 'SELL';
    } else {
      signal = 'HOLD';
    }

    return {
      signal,
      confidence: (enhancedPrediction.confidence + mlPrediction.confidence) / 2,
      predictions: {
        enhanced: enhancedPrediction,
        ml: mlPrediction,
        consensus
      }
    };
  }
}
