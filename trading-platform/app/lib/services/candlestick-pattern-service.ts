/**
 * Candlestick Pattern Recognition Service
 * 
 * Detects and scores various candlestick patterns for prediction enhancement
 */

import { OHLCV } from '@/app/types';

export interface CandlestickPattern {
  name: string;
  strength: number; // 0-1 scale
  direction: 'bullish' | 'bearish' | 'neutral';
  reliability: number; // Historical accuracy of this pattern
}

export interface PatternFeatures {
  isDoji: number;
  isHammer: number;
  isInvertedHammer: number;
  isShootingStar: number;
  isBullishEngulfing: number;
  isBearishEngulfing: number;
  isMorningStar: number;
  isEveningStar: number;
  isPiercingLine: number;
  isDarkCloudCover: number;
  isBullishHarami: number;
  isBearishHarami: number;
  bodyRatio: number;
  upperShadowRatio: number;
  lowerShadowRatio: number;
  candleStrength: number;
}

export class CandlestickPatternService {
  /**
   * Calculate body ratio (body size relative to range)
   */
  private calculateBodyRatio(candle: OHLCV): number {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    return range > 0 ? body / range : 0;
  }

  /**
   * Calculate upper shadow ratio
   */
  private calculateUpperShadowRatio(candle: OHLCV): number {
    const bodyTop = Math.max(candle.open, candle.close);
    const upperShadow = candle.high - bodyTop;
    const range = candle.high - candle.low;
    return range > 0 ? upperShadow / range : 0;
  }

  /**
   * Calculate lower shadow ratio
   */
  private calculateLowerShadowRatio(candle: OHLCV): number {
    const bodyBottom = Math.min(candle.open, candle.close);
    const lowerShadow = bodyBottom - candle.low;
    const range = candle.high - candle.low;
    return range > 0 ? lowerShadow / range : 0;
  }

  /**
   * Detect Doji pattern
   * Open and close are very close (small body)
   */
  private isDoji(candle: OHLCV): number {
    const bodyRatio = this.calculateBodyRatio(candle);
    const threshold = 0.1; // Body is less than 10% of range
    return bodyRatio < threshold ? 1 - (bodyRatio / threshold) : 0;
  }

  /**
   * Detect Hammer pattern
   * Small body at top, long lower shadow
   */
  private isHammer(candle: OHLCV): number {
    const bodyRatio = this.calculateBodyRatio(candle);
    const lowerShadowRatio = this.calculateLowerShadowRatio(candle);
    
    // Body should be in upper third, lower shadow should be 2x body or more
    if (bodyRatio < 0.3 && lowerShadowRatio > 0.5) {
      const upperShadowRatio = this.calculateUpperShadowRatio(candle);
      // Upper shadow should be small
      if (upperShadowRatio < 0.1) {
        return Math.min(lowerShadowRatio * 2, 1.0);
      }
    }
    return 0;
  }

  /**
   * Detect Inverted Hammer pattern
   * Small body at bottom, long upper shadow
   */
  private isInvertedHammer(candle: OHLCV): number {
    const bodyRatio = this.calculateBodyRatio(candle);
    const upperShadowRatio = this.calculateUpperShadowRatio(candle);
    
    if (bodyRatio < 0.3 && upperShadowRatio > 0.5) {
      const lowerShadowRatio = this.calculateLowerShadowRatio(candle);
      if (lowerShadowRatio < 0.1) {
        return Math.min(upperShadowRatio * 2, 1.0);
      }
    }
    return 0;
  }

  /**
   * Detect Shooting Star pattern
   * Small body at bottom of uptrend, long upper shadow
   */
  private isShootingStar(candle: OHLCV, prevCandles: OHLCV[]): number {
    const invertedHammer = this.isInvertedHammer(candle);
    if (invertedHammer === 0) return 0;
    
    // Check if we're in an uptrend
    if (prevCandles.length >= 3) {
      const trend = this.calculateTrend(prevCandles.slice(-3));
      if (trend > 0.5) {
        return invertedHammer;
      }
    }
    return 0;
  }

  /**
   * Detect Bullish Engulfing pattern
   * Current candle completely engulfs previous candle, and is bullish
   */
  private isBullishEngulfing(current: OHLCV, previous: OHLCV): number {
    const currentBullish = current.close > current.open;
    const previousBearish = previous.close < previous.open;
    
    if (currentBullish && previousBearish) {
      const engulfs = current.open <= previous.close && current.close >= previous.open;
      if (engulfs) {
        // Calculate strength based on size difference
        const currentBody = Math.abs(current.close - current.open);
        const prevBody = Math.abs(previous.close - previous.open);
        return Math.min(currentBody / prevBody, 1.5) / 1.5;
      }
    }
    return 0;
  }

  /**
   * Detect Bearish Engulfing pattern
   * Current candle completely engulfs previous candle, and is bearish
   */
  private isBearishEngulfing(current: OHLCV, previous: OHLCV): number {
    const currentBearish = current.close < current.open;
    const previousBullish = previous.close > previous.open;
    
    if (currentBearish && previousBullish) {
      const engulfs = current.open >= previous.close && current.close <= previous.open;
      if (engulfs) {
        const currentBody = Math.abs(current.close - current.open);
        const prevBody = Math.abs(previous.close - previous.open);
        return Math.min(currentBody / prevBody, 1.5) / 1.5;
      }
    }
    return 0;
  }

  /**
   * Detect Morning Star pattern (3 candles)
   * Bearish -> Small body -> Bullish
   */
  private isMorningStar(candles: OHLCV[]): number {
    if (candles.length < 3) return 0;
    
    const [first, second, third] = candles.slice(-3);
    
    const firstBearish = first.close < first.open;
    const thirdBullish = third.close > third.open;
    const secondSmallBody = this.calculateBodyRatio(second) < 0.3;
    const gapsDown = second.high < first.low;
    const gapsUp = third.low > second.high;
    
    if (firstBearish && thirdBullish && secondSmallBody) {
      // Gap confirmation increases reliability
      const gapBonus = (gapsDown && gapsUp) ? 1.3 : 1.0;
      const thirdBodyStrength = this.calculateBodyRatio(third);
      return Math.min(thirdBodyStrength * gapBonus, 1.0);
    }
    return 0;
  }

  /**
   * Detect Evening Star pattern (3 candles)
   * Bullish -> Small body -> Bearish
   */
  private isEveningStar(candles: OHLCV[]): number {
    if (candles.length < 3) return 0;
    
    const [first, second, third] = candles.slice(-3);
    
    const firstBullish = first.close > first.open;
    const thirdBearish = third.close < third.open;
    const secondSmallBody = this.calculateBodyRatio(second) < 0.3;
    const gapsUp = second.low > first.high;
    const gapsDown = third.high < second.low;
    
    if (firstBullish && thirdBearish && secondSmallBody) {
      const gapBonus = (gapsUp && gapsDown) ? 1.3 : 1.0;
      const thirdBodyStrength = this.calculateBodyRatio(third);
      return Math.min(thirdBodyStrength * gapBonus, 1.0);
    }
    return 0;
  }

  /**
   * Detect Piercing Line pattern (2 candles)
   * Bearish -> Bullish opening below previous low and closing above midpoint of previous body
   */
  private isPiercingLine(candles: OHLCV[]): number {
    if (candles.length < 2) return 0;

    const [prev, curr] = candles.slice(-2);

    const prevBearish = prev.close < prev.open;
    const currBullish = curr.close > curr.open;
    const prevBody = prev.open - prev.close;
    const prevMidpoint = prev.close + (prevBody / 2);

    const opensBelowLow = curr.open < prev.low;
    const closesAboveMidpoint = curr.close > prevMidpoint && curr.close < prev.open; // Should close within previous body

    if (prevBearish && currBullish && opensBelowLow && closesAboveMidpoint) {
      const penetrationDepth = (curr.close - prev.close) / prevBody;
      return Math.min(penetrationDepth * 1.5, 1.0); // Stronger signal if it penetrates deeper
    }
    return 0;
  }

  /**
   * Detect Dark Cloud Cover pattern (2 candles)
   * Bullish -> Bearish opening above previous high and closing below midpoint of previous body
   */
  private isDarkCloudCover(candles: OHLCV[]): number {
    if (candles.length < 2) return 0;

    const [prev, curr] = candles.slice(-2);

    const prevBullish = prev.close > prev.open;
    const currBearish = curr.close < curr.open;
    const prevBody = prev.close - prev.open;
    const prevMidpoint = prev.open + (prevBody / 2);

    const opensAboveHigh = curr.open > prev.high;
    const closesBelowMidpoint = curr.close < prevMidpoint && curr.close > prev.open; // Should close within previous body

    if (prevBullish && currBearish && opensAboveHigh && closesBelowMidpoint) {
      const penetrationDepth = (prev.close - curr.close) / prevBody;
      return Math.min(penetrationDepth * 1.5, 1.0); // Stronger signal if it penetrates deeper
    }
    return 0;
  }

  /**
   * Detect Bullish Harami pattern (2 candles)
   * Large Bearish -> Small Bullish completely contained within previous body
   */
  private isBullishHarami(candles: OHLCV[]): number {
    if (candles.length < 2) return 0;

    const [prev, curr] = candles.slice(-2);

    const prevBearish = prev.close < prev.open;
    const currBullish = curr.close > curr.open;

    const prevBody = prev.open - prev.close;
    const currBody = curr.close - curr.open;

    const isContained = curr.open > prev.close && curr.close < prev.open;
    const isSmallBody = currBody < (prevBody * 0.3);

    if (prevBearish && currBullish && isContained && isSmallBody) {
      // Return stronger signal if the body is smaller
      return 1.0 - (currBody / prevBody);
    }
    return 0;
  }

  /**
   * Detect Bearish Harami pattern (2 candles)
   * Large Bullish -> Small Bearish completely contained within previous body
   */
  private isBearishHarami(candles: OHLCV[]): number {
    if (candles.length < 2) return 0;

    const [prev, curr] = candles.slice(-2);

    const prevBullish = prev.close > prev.open;
    const currBearish = curr.close < curr.open;

    const prevBody = prev.close - prev.open;
    const currBody = curr.open - curr.close;

    const isContained = curr.open < prev.close && curr.close > prev.open;
    const isSmallBody = currBody < (prevBody * 0.3);

    if (prevBullish && currBearish && isContained && isSmallBody) {
      // Return stronger signal if the body is smaller
      return 1.0 - (currBody / prevBody);
    }
    return 0;
  }

  /**
   * Calculate simple trend from candles
   */
  private calculateTrend(candles: OHLCV[]): number {
    if (candles.length < 2) return 0;
    const first = candles[0].close;
    const last = candles[candles.length - 1].close;
    return ((last - first) / first) * 100;
  }

  /**
   * Calculate all pattern features for a single candle
   */
  calculatePatternFeatures(candles: OHLCV[]): PatternFeatures {
    if (candles.length === 0) {
      return this.getDefaultFeatures();
    }

    const current = candles[candles.length - 1];
    const previous = candles.length > 1 ? candles[candles.length - 2] : current;

    const doji = this.isDoji(current);
    const hammer = this.isHammer(current);
    const invertedHammer = this.isInvertedHammer(current);
    const shootingStar = this.isShootingStar(current, candles);
    const bullishEngulfing = this.isBullishEngulfing(current, previous);
    const bearishEngulfing = this.isBearishEngulfing(current, previous);
    const morningStar = this.isMorningStar(candles);
    const eveningStar = this.isEveningStar(candles);
    const piercingLine = this.isPiercingLine(candles);
    const darkCloudCover = this.isDarkCloudCover(candles);
    const bullishHarami = this.isBullishHarami(candles);
    const bearishHarami = this.isBearishHarami(candles);

    // Calculate combined strength score
    const bullishPatterns = hammer + invertedHammer + bullishEngulfing + morningStar + piercingLine + bullishHarami;
    const bearishPatterns = shootingStar + bearishEngulfing + eveningStar + darkCloudCover + bearishHarami;
    const candleStrength = Math.min(Math.abs(bullishPatterns - bearishPatterns), 3) / 3;

    return {
      isDoji: doji,
      isHammer: hammer,
      isInvertedHammer: invertedHammer,
      isShootingStar: shootingStar,
      isBullishEngulfing: bullishEngulfing,
      isBearishEngulfing: bearishEngulfing,
      isMorningStar: morningStar,
      isEveningStar: eveningStar,
      isPiercingLine: piercingLine,
      isDarkCloudCover: darkCloudCover,
      isBullishHarami: bullishHarami,
      isBearishHarami: bearishHarami,
      bodyRatio: this.calculateBodyRatio(current),
      upperShadowRatio: this.calculateUpperShadowRatio(current),
      lowerShadowRatio: this.calculateLowerShadowRatio(current),
      candleStrength
    };
  }

  /**
   * Get default features when no data available
   */
  private getDefaultFeatures(): PatternFeatures {
    return {
      isDoji: 0,
      isHammer: 0,
      isInvertedHammer: 0,
      isShootingStar: 0,
      isBullishEngulfing: 0,
      isBearishEngulfing: 0,
      isMorningStar: 0,
      isEveningStar: 0,
      isPiercingLine: 0,
      isDarkCloudCover: 0,
      isBullishHarami: 0,
      isBearishHarami: 0,
      bodyRatio: 0.5,
      upperShadowRatio: 0.25,
      lowerShadowRatio: 0.25,
      candleStrength: 0
    };
  }

  /**
   * Get pattern-based prediction signal
   * Returns value between -1 (bearish) and 1 (bullish)
   */
  getPatternSignal(features: PatternFeatures): number {
    const bullishScore = 
      features.isHammer * 0.8 +
      features.isInvertedHammer * 0.6 +
      features.isBullishEngulfing * 1.0 +
      features.isMorningStar * 0.9 +
      features.isPiercingLine * 0.8 +
      features.isBullishHarami * 0.7;

    const bearishScore = 
      features.isShootingStar * 0.8 +
      features.isBearishEngulfing * 1.0 +
      features.isEveningStar * 0.9 +
      features.isDarkCloudCover * 0.8 +
      features.isBearishHarami * 0.7;

    // Normalize to -1 to 1 range
    const totalScore = bullishScore - bearishScore;
    return Math.max(-1, Math.min(1, totalScore / 3));
  }
}

// Export singleton instance
export const candlestickPatternService = new CandlestickPatternService();
