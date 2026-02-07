/**
 * Market Regime Detector
 * 
 * Detects market regimes (trending vs ranging) and volatility levels
 * to enable adaptive trading strategies.
 */

import { OHLCV } from '@/app/types';
import { TECHNICAL_INDICATORS, DATA_REQUIREMENTS } from './constants';

export type MarketRegime = 'TRENDING' | 'RANGING' | 'UNKNOWN';
export type VolatilityRegime = 'HIGH' | 'MEDIUM' | 'LOW';
export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type RegimeConfidence = 'INITIAL' | 'CONFIRMED';
export type SignalRestriction = 'BUY_ONLY' | 'SELL_ONLY' | 'NONE';

export interface RegimeDetectionResult {
  regime: MarketRegime;
  trendDirection: TrendDirection;
  volatility: VolatilityRegime;
  adx: number;
  atr: number;
  atrRatio: number;
  confidence: RegimeConfidence;
  daysInRegime: number;
  timestamp: string;
  signalRestriction?: SignalRestriction;
}

export interface StrategyRecommendation {
  primary: string;
  secondary: string[];
  weight: number;
  positionSizeAdjustment: number;
}

class MarketRegimeDetector {
  private currentRegime: MarketRegime = 'UNKNOWN';
  private currentTrendDirection: TrendDirection = 'NEUTRAL';
  private daysInRegime: number = 0;
  private lastRegimeChange: string | null = null;

  /**
   * Detect market regime based on OHLCV data
   * Uses ADX (Average Directional Index) for trend strength
   */
  detect(data: OHLCV[]): RegimeDetectionResult {
    if (data.length < DATA_REQUIREMENTS.MIN_DATA_POINTS) {
      return {
        regime: 'UNKNOWN',
        trendDirection: 'NEUTRAL',
        volatility: 'MEDIUM',
        adx: 0,
        atr: 0,
        atrRatio: 1,
        confidence: 'INITIAL',
        daysInRegime: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const adx = this.calculateADX(data, TECHNICAL_INDICATORS.ADX_PERIOD);
    const atr = this.calculateATR(data, TECHNICAL_INDICATORS.ATR_PERIOD);
    const volatility = this.detectVolatility(data);
    const trendDirection = this.calculateTrendDirection(data);

    // Determine regime based on ADX
    let regime: MarketRegime;
    if (adx > TECHNICAL_INDICATORS.ADX_TRENDING_THRESHOLD) {
      regime = 'TRENDING';
    } else if (adx < TECHNICAL_INDICATORS.ADX_RANGING_THRESHOLD) {
      regime = 'RANGING';
    } else {
      // Transition zone - use previous regime if available
      regime = this.currentRegime !== 'UNKNOWN' ? this.currentRegime : 'RANGING';
    }

    // Calculate ATR ratio for volatility context
    const avgATR = this.calculateAverageATR(data, TECHNICAL_INDICATORS.ATR_PERIOD);
    const atrRatio = avgATR > 0 ? atr / avgATR : 1;

    // Handle regime persistence
    const confidence = this.updateRegimePersistence(regime, trendDirection);

    // Determine signal restriction
    let signalRestriction: SignalRestriction = 'NONE';
    if (regime === 'TRENDING') {
      if (trendDirection === 'UP') signalRestriction = 'BUY_ONLY';
      else if (trendDirection === 'DOWN') signalRestriction = 'SELL_ONLY';
    }

    const result: RegimeDetectionResult = {
      regime,
      trendDirection,
      volatility,
      adx,
      atr,
      atrRatio,
      confidence,
      daysInRegime: this.daysInRegime,
      timestamp: new Date().toISOString(),
      signalRestriction,
    };

    return result;
  }

  /**
   * Detect volatility regime based on ATR ratio
   */
  detectVolatility(data: OHLCV[]): VolatilityRegime {
    if (data.length < DATA_REQUIREMENTS.MIN_DATA_POINTS) {
      return 'MEDIUM';
    }

    const atr = this.calculateATR(data, TECHNICAL_INDICATORS.ATR_PERIOD);
    const avgATR = this.calculateAverageATR(data, TECHNICAL_INDICATORS.ATR_PERIOD);
    const ratio = avgATR > 0 ? atr / avgATR : 1;

    if (ratio > 2.0) {
      return 'HIGH';
    } else if (ratio < 1.0) {
      return 'LOW';
    }
    return 'MEDIUM';
  }

  /**
   * Calculate ADX (Average Directional Index)
   * Measures trend strength (0-100)
   * ADX > 25: Trending market
   * ADX < 20: Ranging market
   */
  calculateADX(data: OHLCV[], period: number = TECHNICAL_INDICATORS.ADX_PERIOD): number {
    if (data.length < period * 2) {
      return 0;
    }

    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);

    // Calculate +DM and -DM
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];

      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      // True Range
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(tr1, tr2, tr3));
    }

    // Calculate smoothed averages
    const atr = this.smoothAverage(tr, period);
    const smoothedPlusDM = this.smoothAverage(plusDM, period);
    const smoothedMinusDM = this.smoothAverage(minusDM, period);

    if (atr === 0) return 0;

    // Calculate +DI and -DI
    const plusDI = (smoothedPlusDM / atr) * 100;
    const minusDI = (smoothedMinusDM / atr) * 100;

    // Calculate DX
    const diDiff = Math.abs(plusDI - minusDI);
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;

    return dx;
  }

  /**
   * Calculate ATR (Average True Range)
   */
  calculateATR(data: OHLCV[], period: number = TECHNICAL_INDICATORS.ATR_PERIOD): number {
    if (data.length < period + 1) {
      return 0;
    }

    const tr: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const tr1 = data[i].high - data[i].low;
      const tr2 = Math.abs(data[i].high - data[i - 1].close);
      const tr3 = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(tr1, tr2, tr3));
    }

    return this.smoothAverage(tr, period);
  }

  /**
   * Calculate average ATR over the entire data period
   */
  private calculateAverageATR(data: OHLCV[], period: number = TECHNICAL_INDICATORS.ATR_PERIOD): number {
    if (data.length < period * 2) {
      return this.calculateATR(data, period);
    }

    // Use historical average of ATR
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);

    const atr1 = this.calculateATR(firstHalf, period);
    const atr2 = this.calculateATR(secondHalf, period);

    return (atr1 + atr2) / 2;
  }

  /**
   * Calculate trend direction based on price movement
   */
  private calculateTrendDirection(data: OHLCV[]): TrendDirection {
    if (data.length < DATA_REQUIREMENTS.TREND_CALCULATION_PERIOD) {
      return 'NEUTRAL';
    }

    const recent = data.slice(-DATA_REQUIREMENTS.TREND_CALCULATION_PERIOD);
    const firstPrice = recent[0].close;
    const lastPrice = recent[recent.length - 1].close;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (change > 3) {
      return 'UP';
    } else if (change < -3) {
      return 'DOWN';
    }
    return 'NEUTRAL';
  }

  /**
   * Smooth average using Wilder's smoothing method
   */
  private smoothAverage(values: number[], period: number): number {
    if (values.length < period) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    }

    // First average
    let avg = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Wilder's smoothing
    const multiplier = 1 / period;
    for (let i = period; i < values.length; i++) {
      avg = values[i] * multiplier + avg * (1 - multiplier);
    }

    return avg;
  }

  /**
   * Update regime persistence counter
   * Returns confidence level based on days in regime
   */
  private updateRegimePersistence(
    regime: MarketRegime,
    trendDirection: TrendDirection
  ): RegimeConfidence {
    const now = new Date().toISOString();

    // Check if regime changed
    if (regime !== this.currentRegime || trendDirection !== this.currentTrendDirection) {
      this.currentRegime = regime;
      this.currentTrendDirection = trendDirection;
      this.daysInRegime = 1;
      this.lastRegimeChange = now;
      return 'INITIAL';
    }

    // Same regime - increment counter
    this.daysInRegime++;

    // Require minimum 3 days for confirmation
    if (this.daysInRegime >= 3) {
      return 'CONFIRMED';
    }

    return 'INITIAL';
  }

  /**
   * Get human-readable regime description
   */
  getRegimeDescription(
    regime: MarketRegime,
    trendDirection: TrendDirection,
    volatility: VolatilityRegime
  ): string {
    const regimeText = regime === 'TRENDING' ? 'トレンド' : 'レンジ';
    const directionText = trendDirection === 'UP' ? '上昇' : 
                          trendDirection === 'DOWN' ? '下落' : '中立';
    const volaText = volatility === 'HIGH' ? '高ボラ' : 
                     volatility === 'LOW' ? '低ボラ' : '中ボラ';

    if (regime === 'TRENDING') {
      return `${directionText}${regimeText}相場 (${volaText})`;
    } else {
      return `${regimeText}相場 (${volaText})`;
    }
  }

  /**
   * Get recommended trading strategy based on regime
   */
  getRecommendedStrategy(
    regime: MarketRegime,
    trendDirection: TrendDirection,
    volatility: VolatilityRegime
  ): StrategyRecommendation {
    if (regime === 'TRENDING') {
      if (volatility === 'HIGH') {
        return {
          primary: 'TrendFollowing',
          secondary: ['Breakout'],
          weight: 0.6,
          positionSizeAdjustment: 0.5, // Reduce size in high vol
        };
      }
      return {
        primary: 'TrendFollowing',
        secondary: ['Momentum'],
        weight: 0.7,
        positionSizeAdjustment: 1.0,
      };
    } else if (regime === 'RANGING') {
      if (volatility === 'HIGH') {
        return {
          primary: 'MeanReversion',
          secondary: ['Breakout'],
          weight: 0.5,
          positionSizeAdjustment: 0.5,
        };
      }
      return {
        primary: 'MeanReversion',
        secondary: [],
        weight: 0.8,
        positionSizeAdjustment: 1.0,
      };
    }

    // Unknown regime - be conservative
    return {
      primary: 'None',
      secondary: [],
      weight: 0,
      positionSizeAdjustment: 0,
    };
  }

  /**
   * Get signal strength multiplier based on regime alignment
   */
  getSignalStrengthMultiplier(regime: RegimeDetectionResult, signal: 'BUY' | 'SELL' | 'HOLD'): number {
    if (signal === 'HOLD') return 0;
    
    if (regime.regime === 'TRENDING') {
      if (regime.trendDirection === 'UP' && signal === 'BUY') return 1.2;
      if (regime.trendDirection === 'DOWN' && signal === 'SELL') return 1.2;
      if (regime.trendDirection === 'UP' && signal === 'SELL') return 0.5; // Counter-trend
      if (regime.trendDirection === 'DOWN' && signal === 'BUY') return 0.5; // Counter-trend
    }
    
    if (regime.regime === 'RANGING') {
      // Mean reversion signals are favored in ranging markets
      return 1.0;
    }
    
    return 0.8; // Default reduction for uncertainty
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.currentRegime = 'UNKNOWN';
    this.currentTrendDirection = 'NEUTRAL';
    this.daysInRegime = 0;
    this.lastRegimeChange = null;
  }
}

// Export singleton instance
export const marketRegimeDetector = new MarketRegimeDetector();

// For testing
export { MarketRegimeDetector };
