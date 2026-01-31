/**
 * Market Regime Detector
 * 
 * Detects market regimes (trending vs ranging) and volatility levels
 * to enable adaptive trading strategies.
 * 
 * Enhanced with:
 * - ADX + SMA + Volatility combined regime detection
 * - Trend direction filtering (UP trend: BUY only, DOWN trend: SELL only)
 * - Signal strength adjustment based on regime confidence
 */

import { OHLCV } from '@/app/types';
import { TECHNICAL_INDICATORS, DATA_REQUIREMENTS, RISK_PARAMS } from './constants';

export type MarketRegime = 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'UNKNOWN';
export type VolatilityRegime = 'HIGH' | 'MEDIUM' | 'LOW';
export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type RegimeConfidence = 'INITIAL' | 'CONFIRMED' | 'STRONG';

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
  // Enhanced fields
  smaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  priceVsSMA: 'ABOVE' | 'BELOW' | 'AT';
  signalRestriction: 'BUY_ONLY' | 'SELL_ONLY' | 'BOTH' | 'NONE';
  recommendedPositionSize: number; // 0-1 multiplier
}

export interface StrategyRecommendation {
  primary: string;
  secondary: string[];
  weight: number;
  positionSizeAdjustment: number;
  allowedSignals: ('BUY' | 'SELL')[];
}

class MarketRegimeDetector {
  private currentRegime: MarketRegime = 'UNKNOWN';
  private currentTrendDirection: TrendDirection = 'NEUTRAL';
  private daysInRegime: number = 0;
  private lastRegimeChange: string | null = null;

  /**
   * Detect market regime based on OHLCV data
   * Uses ADX + SMA + Volatility for comprehensive regime detection
   */
  detect(data: OHLCV[]): RegimeDetectionResult {
    if (data.length < DATA_REQUIREMENTS.MIN_DATA_POINTS) {
      return this.createDefaultResult();
    }

    const adx = this.calculateADX(data, TECHNICAL_INDICATORS.ADX_PERIOD);
    const atr = this.calculateATR(data, TECHNICAL_INDICATORS.ATR_PERIOD);
    const volatility = this.detectVolatility(data);
    const trendDirection = this.calculateTrendDirection(data);
    const smaAlignment = this.calculateSMAAlignment(data);
    const priceVsSMA = this.calculatePriceVsSMA(data);

    // Enhanced regime detection combining ADX, SMA, and volatility
    let regime: MarketRegime;
    
    if (adx > TECHNICAL_INDICATORS.ADX_TRENDING_THRESHOLD) {
      // Strong trend detected by ADX
      if (trendDirection === 'UP' && smaAlignment === 'BULLISH') {
        regime = 'TRENDING_UP';
      } else if (trendDirection === 'DOWN' && smaAlignment === 'BEARISH') {
        regime = 'TRENDING_DOWN';
      } else {
        // ADX says trending but SMA disagrees - use previous regime or ranging
        regime = this.currentRegime !== 'UNKNOWN' ? this.currentRegime : 'RANGING';
      }
    } else if (adx < TECHNICAL_INDICATORS.ADX_RANGING_THRESHOLD) {
      // Clear ranging market
      regime = 'RANGING';
    } else {
      // Transition zone - use SMA alignment to decide
      if (smaAlignment === 'BULLISH' && trendDirection === 'UP') {
        regime = 'TRENDING_UP';
      } else if (smaAlignment === 'BEARISH' && trendDirection === 'DOWN') {
        regime = 'TRENDING_DOWN';
      } else {
        regime = 'RANGING';
      }
    }

    // Calculate ATR ratio for volatility context
    const avgATR = this.calculateAverageATR(data, TECHNICAL_INDICATORS.ATR_PERIOD);
    const atrRatio = avgATR > 0 ? atr / avgATR : 1;

    // Handle regime persistence
    const confidence = this.updateRegimePersistence(regime, trendDirection);

    // Determine signal restrictions based on regime
    const signalRestriction = this.getSignalRestriction(regime, smaAlignment);

    // Calculate recommended position size based on regime confidence and volatility
    const recommendedPositionSize = this.calculateRecommendedPositionSize(
      regime, volatility, confidence, adx
    );

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
      smaAlignment,
      priceVsSMA,
      signalRestriction,
      recommendedPositionSize,
    };

    return result;
  }

  /**
   * Create default result for insufficient data
   */
  private createDefaultResult(): RegimeDetectionResult {
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
      smaAlignment: 'NEUTRAL',
      priceVsSMA: 'AT',
      signalRestriction: 'NONE',
      recommendedPositionSize: 0,
    };
  }

  /**
   * Calculate SMA alignment (Bullish: SMA20 > SMA50, Bearish: SMA20 < SMA50)
   */
  private calculateSMAAlignment(data: OHLCV[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (data.length < TECHNICAL_INDICATORS.SMA_PERIOD_LONG) {
      return 'NEUTRAL';
    }

    const closes = data.map(d => d.close);
    const sma20 = this.calculateSMA(closes, TECHNICAL_INDICATORS.SMA_PERIOD_MEDIUM);
    const sma50 = this.calculateSMA(closes, TECHNICAL_INDICATORS.SMA_PERIOD_LONG);

    if (sma20 > sma50 * 1.02) {
      return 'BULLISH';
    } else if (sma20 < sma50 * 0.98) {
      return 'BEARISH';
    }
    return 'NEUTRAL';
  }

  /**
   * Calculate price position relative to SMA20
   */
  private calculatePriceVsSMA(data: OHLCV[]): 'ABOVE' | 'BELOW' | 'AT' {
    if (data.length < TECHNICAL_INDICATORS.SMA_PERIOD_MEDIUM) {
      return 'AT';
    }

    const closes = data.map(d => d.close);
    const sma20 = this.calculateSMA(closes, TECHNICAL_INDICATORS.SMA_PERIOD_MEDIUM);
    const latestPrice = closes[closes.length - 1];

    if (latestPrice > sma20 * 1.01) {
      return 'ABOVE';
    } else if (latestPrice < sma20 * 0.99) {
      return 'BELOW';
    }
    return 'AT';
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) {
      return data.reduce((a, b) => a + b, 0) / data.length;
    }
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * Determine signal restrictions based on regime and SMA alignment
   */
  private getSignalRestriction(
    regime: MarketRegime,
    smaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ): 'BUY_ONLY' | 'SELL_ONLY' | 'BOTH' | 'NONE' {
    switch (regime) {
      case 'TRENDING_UP':
        return 'BUY_ONLY';
      case 'TRENDING_DOWN':
        return 'SELL_ONLY';
      case 'RANGING':
        // In ranging markets, allow both but with caution
        return 'BOTH';
      default:
        return 'NONE';
    }
  }

  /**
   * Calculate recommended position size based on regime and market conditions
   */
  private calculateRecommendedPositionSize(
    regime: MarketRegime,
    volatility: VolatilityRegime,
    confidence: RegimeConfidence,
    adx: number
  ): number {
    let baseSize = 1.0;

    // Adjust for regime type
    if (regime === 'TRENDING_UP' || regime === 'TRENDING_DOWN') {
      baseSize = 1.0;
    } else if (regime === 'RANGING') {
      baseSize = 0.5; // Reduce size in ranging markets
    } else {
      baseSize = 0;
    }

    // Adjust for volatility
    if (volatility === 'HIGH') {
      baseSize *= 0.5;
    } else if (volatility === 'LOW') {
      baseSize *= 1.2;
    }

    // Adjust for confidence
    if (confidence === 'STRONG') {
      baseSize *= 1.0;
    } else if (confidence === 'CONFIRMED') {
      baseSize *= 0.8;
    } else {
      baseSize *= 0.5;
    }

    // Adjust for trend strength (ADX)
    if (adx > 40) {
      baseSize *= 1.1;
    } else if (adx < 20) {
      baseSize *= 0.7;
    }

    return Math.min(1.0, Math.max(0, baseSize));
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
    } else if (ratio < 0.8) {
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
   * Calculate trend direction based on price movement and SMA
   */
  private calculateTrendDirection(data: OHLCV[]): TrendDirection {
    if (data.length < DATA_REQUIREMENTS.TREND_CALCULATION_PERIOD) {
      return 'NEUTRAL';
    }

    const recent = data.slice(-DATA_REQUIREMENTS.TREND_CALCULATION_PERIOD);
    const firstPrice = recent[0].close;
    const lastPrice = recent[recent.length - 1].close;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    // Also consider SMA alignment for confirmation
    const closes = data.map(d => d.close);
    const sma20 = this.calculateSMA(closes, TECHNICAL_INDICATORS.SMA_PERIOD_MEDIUM);
    const priceVsSMA20 = ((lastPrice - sma20) / sma20) * 100;

    if (change > 3 && priceVsSMA20 > 1) {
      return 'UP';
    } else if (change < -3 && priceVsSMA20 < -1) {
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

    // Require minimum 3 days for confirmation, 7 days for strong
    if (this.daysInRegime >= 7) {
      return 'STRONG';
    } else if (this.daysInRegime >= 3) {
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
    const regimeText = regime === 'TRENDING_UP' ? '上昇トレンド' :
                       regime === 'TRENDING_DOWN' ? '下降トレンド' :
                       regime === 'RANGING' ? 'レンジ' : '不明';
    const volaText = volatility === 'HIGH' ? '高ボラ' : 
                     volatility === 'LOW' ? '低ボラ' : '中ボラ';

    return `${regimeText}相場 (${volaText})`;
  }

  /**
   * Get recommended trading strategy based on regime
   */
  getRecommendedStrategy(
    regime: MarketRegime,
    trendDirection: TrendDirection,
    volatility: VolatilityRegime
  ): StrategyRecommendation {
    if (regime === 'TRENDING_UP') {
      if (volatility === 'HIGH') {
        return {
          primary: 'TrendFollowing',
          secondary: ['Breakout'],
          weight: 0.6,
          positionSizeAdjustment: 0.5,
          allowedSignals: ['BUY'],
        };
      }
      return {
        primary: 'TrendFollowing',
        secondary: ['Momentum'],
        weight: 0.8,
        positionSizeAdjustment: 1.0,
        allowedSignals: ['BUY'],
      };
    } else if (regime === 'TRENDING_DOWN') {
      if (volatility === 'HIGH') {
        return {
          primary: 'TrendFollowing',
          secondary: ['Breakout'],
          weight: 0.6,
          positionSizeAdjustment: 0.5,
          allowedSignals: ['SELL'],
        };
      }
      return {
        primary: 'TrendFollowing',
        secondary: ['Momentum'],
        weight: 0.8,
        positionSizeAdjustment: 1.0,
        allowedSignals: ['SELL'],
      };
    } else if (regime === 'RANGING') {
      if (volatility === 'HIGH') {
        return {
          primary: 'MeanReversion',
          secondary: ['Breakout'],
          weight: 0.4,
          positionSizeAdjustment: 0.3,
          allowedSignals: ['BUY', 'SELL'],
        };
      }
      return {
        primary: 'MeanReversion',
        secondary: [],
        weight: 0.6,
        positionSizeAdjustment: 0.5,
        allowedSignals: ['BUY', 'SELL'],
      };
    }

    // Unknown regime - be conservative
    return {
      primary: 'None',
      secondary: [],
      weight: 0,
      positionSizeAdjustment: 0,
      allowedSignals: [],
    };
  }

  /**
   * Check if a signal is allowed in current regime
   */
  isSignalAllowed(regime: RegimeDetectionResult, signal: 'BUY' | 'SELL'): boolean {
    if (regime.signalRestriction === 'NONE') {
      return false;
    }
    if (regime.signalRestriction === 'BUY_ONLY') {
      return signal === 'BUY';
    }
    if (regime.signalRestriction === 'SELL_ONLY') {
      return signal === 'SELL';
    }
    return true; // BOTH
  }

  /**
   * Get signal strength multiplier based on regime alignment
   */
  getSignalStrengthMultiplier(regime: RegimeDetectionResult, signal: 'BUY' | 'SELL'): number {
    // If signal aligns with trend, boost confidence
    if (regime.regime === 'TRENDING_UP' && signal === 'BUY') {
      return 1.3;
    }
    if (regime.regime === 'TRENDING_DOWN' && signal === 'SELL') {
      return 1.3;
    }
    
    // If signal opposes trend, reduce confidence
    if (regime.regime === 'TRENDING_UP' && signal === 'SELL') {
      return 0.3; // Strong penalty for counter-trend
    }
    if (regime.regime === 'TRENDING_DOWN' && signal === 'BUY') {
      return 0.3;
    }

    // Ranging market - neutral
    return 1.0;
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
