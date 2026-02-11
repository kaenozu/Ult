/**
 * Enhanced ML Service
 * 
 * Re-exports from domains/prediction/services for backward compatibility.
 * Please import directly from @/app/domains/prediction/services in new code.
 */

import type { PredictionFeatures } from '@/app/domains/prediction/types';
import type { Stock, OHLCV } from '@/app/types';
import {
  EnhancedMLService as DomainEnhancedMLService,
  enhancedMLService as domainEnhancedMLService,
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

/**
 * Extended Enhanced ML Service with backward compatibility
 */
export class EnhancedMLService extends DomainEnhancedMLService {
  /**
   * Predict with backward compatible interface
   */
  async predict(stock: Stock, historicalData: OHLCV[]): Promise<EnhancedMLPrediction> {
    const features: PredictionFeatures = {
      symbol: stock.symbol,
      currentPrice: historicalData[historicalData.length - 1]?.close || 0,
      rsi: 50,
      rsiChange: 0,
      sma5: 0,
      sma20: 0,
      sma50: 0,
      volumeRatio: 1,
      priceMomentum: 0,
      macdSignal: 0,
      bbPosition: 0.5,
      atrPercent: 0,
    };

    const result = await this.predictEnhanced(features, stock, historicalData);
    
    // Normalize confidence to be between 0 and 1
    const normalizedConfidence = Math.max(0, Math.min(1, result.confidence));
    
    return {
      prediction: result.prediction,
      confidence: normalizedConfidence,
      trend: result.prediction > 0.6 ? 'UP' : result.prediction < 0.4 ? 'DOWN' : 'SIDEWAYS',
      features,
    };
  }
}

/**
 * Singleton instance
 */
export const enhancedMLService = new EnhancedMLService();

export { ModelPerformance, DriftMetrics };
