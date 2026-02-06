/**
 * Market Regime Detector
 * 
 * Detects market regime (bull/bear/sideways) and volatility levels
 */

import { OHLCV } from '@/app/types';

export type MarketTrend = 'BULL' | 'BEAR' | 'SIDEWAYS';
export type VolatilityRegime = 'LOW' | 'NORMAL' | 'HIGH';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INITIAL';

export interface MarketRegime {
  trend: MarketTrend;
  volatility: VolatilityRegime;
  confidence: ConfidenceLevel;
}

class MarketRegimeDetectorImpl {
  /**
   * Detect market regime from historical data
   */
  detect(historicalData: OHLCV[]): MarketRegime {
    if (!historicalData || historicalData.length < 20) {
      return {
        trend: 'SIDEWAYS',
        volatility: 'NORMAL',
        confidence: 'INITIAL',
      };
    }

    const trend = this.detectTrend(historicalData);
    const volatility = this.detectVolatility(historicalData);
    const confidence = this.calculateConfidence(historicalData);

    return {
      trend,
      volatility,
      confidence,
    };
  }

  private detectTrend(data: OHLCV[]): MarketTrend {
    const recentData = data.slice(-20);
    const sma5 = this.calculateSMA(recentData, 5);
    const sma20 = this.calculateSMA(recentData, 20);
    
    const firstPrice = recentData[0].close;
    const lastPrice = recentData[recentData.length - 1].close;
    const priceChange = (lastPrice - firstPrice) / firstPrice;

    if (priceChange > 0.05 && sma5 > sma20) {
      return 'BULL';
    } else if (priceChange < -0.05 && sma5 < sma20) {
      return 'BEAR';
    }
    return 'SIDEWAYS';
  }

  private detectVolatility(data: OHLCV[]): VolatilityRegime {
    const recentData = data.slice(-20);
    const returns = recentData.slice(1).map((d, i) => 
      (d.close - recentData[i].close) / recentData[i].close
    );
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

    if (volatility < 0.15) {
      return 'LOW';
    } else if (volatility > 0.30) {
      return 'HIGH';
    }
    return 'NORMAL';
  }

  private calculateConfidence(data: OHLCV[]): ConfidenceLevel {
    if (data.length < 50) return 'LOW';
    if (data.length < 100) return 'MEDIUM';
    return 'HIGH';
  }

  private calculateSMA(data: OHLCV[], period: number): number {
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b.close, 0) / slice.length;
  }
}

export const marketRegimeDetector = new MarketRegimeDetectorImpl();
export { MarketRegimeDetectorImpl as MarketRegimeDetector };
