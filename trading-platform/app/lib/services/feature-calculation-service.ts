/**
 * Feature Calculation Service
 * 
 * Re-exports from domains/prediction/services for backward compatibility.
 * Please import directly from @/app/domains/prediction/services in new code.
 */

import { OHLCV, TechnicalIndicatorsWithATR } from '@/app/types';
// Re-export types from domains
export type { PredictionFeatures } from '@/app/domains/prediction/types';

import {
  FeatureCalculationService as DomainFeatureCalculationService,
  featureCalculationService as domainFeatureCalculationService,
} from '@/app/domains/prediction/services/feature-calculation-service';

/**
 * Extended Feature Calculation Service with backward compatibility
 * Supports both old API (with pre-calculated indicators) and new API
 */
export class FeatureCalculationService extends DomainFeatureCalculationService {
  /**
   * Calculate features with support for pre-calculated indicators
   * Backward compatible: accepts optional indicators parameter
   */
  calculateFeatures(data: OHLCV[], indicators?: TechnicalIndicatorsWithATR): ReturnType<DomainFeatureCalculationService['calculateFeatures']> {
    if (indicators) {
      // Check if indicators are empty
      const isEmptyIndicators = indicators.rsi.length === 0 || 
                                indicators.sma5.length === 0 ||
                                indicators.sma20.length === 0 ||
                                indicators.sma50.length === 0;
      
      if (isEmptyIndicators) {
        return {
          rsi: 0,
          rsiChange: 0,
          sma5: 0,
          sma20: 0,
          sma50: 0,
          volumeRatio: 0,
          priceMomentum: 0,
          macdSignal: 0,
          bollingerPosition: 0,
          atrPercent: 0,
          volatility: 0,
        };
      }
      
      // Use pre-calculated indicators
      const currentPrice = data[data.length - 1]?.close || 0;
      const lastIndex = indicators.rsi.length - 1;
      const prevIndex = Math.max(0, lastIndex - 1);
      const sma5Value = indicators.sma5[lastIndex] ?? currentPrice;
      const sma20Value = indicators.sma20[lastIndex] ?? currentPrice;
      const sma50Value = indicators.sma50[lastIndex] ?? currentPrice;
      
      // Calculate volume ratio: currentVolume / avgVolume
      const currentVolume = data[data.length - 1]?.volume || 0;
      const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
      
      // Calculate MACD signal difference: MACD - Signal
      const macdValue = indicators.macd?.macd?.[lastIndex] ?? 0;
      const signalValue = indicators.macd?.signal?.[lastIndex] ?? 0;
      
      // Calculate Bollinger position: (price - lower) / (upper - lower) * 100
      const upper = indicators.bollingerBands?.upper?.[lastIndex];
      const lower = indicators.bollingerBands?.lower?.[lastIndex];
      let bollingerPosition = 50; // Default to middle
      if (upper !== undefined && lower !== undefined && upper !== lower) {
        bollingerPosition = ((currentPrice - lower) / (upper - lower)) * 100;
      }
      
      // Calculate volatility from ATR
      const atrValue = indicators.atr?.[lastIndex] ?? 0;
      const volatility = currentPrice > 0 ? (atrValue / currentPrice) * 100 : 0;
      
      // Calculate price momentum
      const priceMomentum = this.calculatePriceMomentum(data.map(d => d.close), 5);
      
      return {
        rsi: indicators.rsi[lastIndex] ?? 50,
        rsiChange: indicators.rsi.length > 1 
          ? (indicators.rsi[lastIndex] ?? 50) - (indicators.rsi[prevIndex] ?? 50)
          : 0,
        // SMA deviation: ((price - sma) / price) * 100
        sma5: currentPrice > 0 ? ((currentPrice - sma5Value) / currentPrice) * 100 : 0,
        sma20: currentPrice > 0 ? ((currentPrice - sma20Value) / currentPrice) * 100 : 0,
        sma50: currentPrice > 0 ? ((currentPrice - sma50Value) / currentPrice) * 100 : 0,
        volumeRatio: avgVolume > 0 ? currentVolume / avgVolume : 1,
        priceMomentum,
        macdSignal: macdValue - signalValue,
        bollingerPosition,
        atrPercent: indicators.atr?.[lastIndex] && currentPrice > 0
          ? (indicators.atr[lastIndex] / currentPrice) * 100
          : 0,
        volatility,
      };
    }
    
    // Use parent implementation for raw data
    return super.calculateFeatures(data);
  }

  /**
   * Calculate price momentum
   * Returns percentage change over the specified period
   */
  calculatePriceMomentum(prices: number[], period: number): number {
    if (prices.length < period || prices.length < 2) {
      return 0;
    }
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - period - 1] ?? prices[0];
    
    if (pastPrice === 0) {
      return 0;
    }
    
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }
}

/**
 * Singleton instance
 */
export const featureCalculationService = new FeatureCalculationService();
