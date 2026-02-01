/**
 * Candlestick Pattern Recognizer
 * 
 * Detects various candlestick patterns including Doji, Hammer, Engulfing,
 * Morning/Evening Star, Three White Soldiers, Three Black Crows, etc.
 */

import { OHLCV } from '../../types/shared';
import { CandlestickPatternConfig, CandlestickPatternResult } from './types';

export class CandlestickPatternRecognizer {
  constructor(private config: CandlestickPatternConfig) {}

  /**
   * Detect Doji pattern (open ≈ close)
   */
  detectDoji(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 1) return null;
    
    const candle = window[window.length - 1];
    const bodySize = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    
    if (range === 0) return null;
    const bodyPercent = bodySize / range;
    
    if (bodyPercent < this.config.minBodySize) {
      return {
        id: `doji_${candle.date}`,
        name: 'Doji',
        type: 'NEUTRAL',
        timestamp: new Date(candle.date),
        confidence: 1 - bodyPercent / this.config.minBodySize,
        significance: 'MEDIUM'
      };
    }
    
    return null;
  }

  /**
   * Detect Hammer pattern (small body, long lower wick)
   */
  detectHammer(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 1) return null;
    
    const candle = window[window.length - 1];
    const bodySize = Math.abs(candle.close - candle.open);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;
    
    if (range === 0) return null;
    
    // Hammer: lower wick > 2 * body size, upper wick very small
    if (lowerWick > 2 * bodySize && upperWick < bodySize * 0.5) {
      return {
        id: `hammer_${candle.date}`,
        name: 'Hammer',
        type: 'BULLISH',
        timestamp: new Date(candle.date),
        confidence: Math.min(0.95, lowerWick / (2 * bodySize)),
        significance: 'HIGH'
      };
    }
    
    return null;
  }

  /**
   * Detect Engulfing pattern (current candle engulfs previous)
   */
  detectEngulfing(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 2) return null;
    
    const prev = window[window.length - 2];
    const curr = window[window.length - 1];
    
    const prevBullish = prev.close > prev.open;
    const currBullish = curr.close > curr.open;
    
    // Bullish engulfing
    if (!prevBullish && currBullish) {
      if (curr.open <= prev.close && curr.close >= prev.open) {
        const strength = (curr.close - curr.open) / (prev.open - prev.close);
        return {
          id: `bullish_engulfing_${curr.date}`,
          name: 'Bullish Engulfing',
          type: 'BULLISH',
          timestamp: new Date(curr.date),
          confidence: Math.min(0.95, strength * 0.5),
          significance: 'HIGH'
        };
      }
    }
    
    // Bearish engulfing
    if (prevBullish && !currBullish) {
      if (curr.open >= prev.close && curr.close <= prev.open) {
        const strength = (curr.open - curr.close) / (prev.close - prev.open);
        return {
          id: `bearish_engulfing_${curr.date}`,
          name: 'Bearish Engulfing',
          type: 'BEARISH',
          timestamp: new Date(curr.date),
          confidence: Math.min(0.95, strength * 0.5),
          significance: 'HIGH'
        };
      }
    }
    
    return null;
  }

  /**
   * Detect Morning Star pattern (3-candle bullish reversal)
   */
  detectMorningStar(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 3) return null;
    
    const [first, second, third] = window.slice(-3);
    
    // First: bearish
    const firstBearish = first.close < first.open;
    // Second: small body (star)
    const secondBodySize = Math.abs(second.close - second.open);
    const secondRange = second.high - second.low;
    // Third: bullish
    const thirdBullish = third.close > third.open;
    
    if (firstBearish && thirdBullish && secondRange > 0) {
      const secondBodyPercent = secondBodySize / secondRange;
      
      if (secondBodyPercent < this.config.minBodySize * 2) {
        // Star should be below first candle
        if (Math.max(second.open, second.close) < first.close) {
          // Third should close above midpoint of first
          const firstMidpoint = (first.open + first.close) / 2;
          if (third.close > firstMidpoint) {
            return {
              id: `morning_star_${third.date}`,
              name: 'Morning Star',
              type: 'BULLISH',
              timestamp: new Date(third.date),
              confidence: 0.85,
              significance: 'HIGH'
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Detect Evening Star pattern (3-candle bearish reversal)
   */
  detectEveningStar(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 3) return null;
    
    const [first, second, third] = window.slice(-3);
    
    // First: bullish
    const firstBullish = first.close > first.open;
    // Second: small body (star)
    const secondBodySize = Math.abs(second.close - second.open);
    const secondRange = second.high - second.low;
    // Third: bearish
    const thirdBearish = third.close < third.open;
    
    if (firstBullish && thirdBearish && secondRange > 0) {
      const secondBodyPercent = secondBodySize / secondRange;
      
      if (secondBodyPercent < this.config.minBodySize * 2) {
        // Star should be above first candle
        if (Math.min(second.open, second.close) > first.close) {
          // Third should close below midpoint of first
          const firstMidpoint = (first.open + first.close) / 2;
          if (third.close < firstMidpoint) {
            return {
              id: `evening_star_${third.date}`,
              name: 'Evening Star',
              type: 'BEARISH',
              timestamp: new Date(third.date),
              confidence: 0.85,
              significance: 'HIGH'
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Detect Three White Soldiers (3 consecutive bullish candles)
   */
  detectThreeWhiteSoldiers(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 3) return null;
    
    const [first, second, third] = window.slice(-3);
    
    // All three should be bullish
    const allBullish = 
      first.close > first.open &&
      second.close > second.open &&
      third.close > third.open;
    
    if (!allBullish) return null;
    
    // Each close should be higher than previous
    const progressivelyHigher = 
      second.close > first.close &&
      third.close > second.close;
    
    if (!progressivelyHigher) return null;
    
    // Check for reasonable body sizes
    const avgPrice = (first.close + second.close + third.close) / 3;
    const bodyRatios = [first, second, third].map(c => 
      Math.abs(c.close - c.open) / avgPrice
    );
    
    const minBodyRatio = Math.min(...bodyRatios);
    if (minBodyRatio > 0.01) {
      return {
        id: `three_white_soldiers_${third.date}`,
        name: 'Three White Soldiers',
        type: 'BULLISH',
        timestamp: new Date(third.date),
        confidence: 0.80,
        significance: 'HIGH'
      };
    }
    
    return null;
  }

  /**
   * Detect Three Black Crows (3 consecutive bearish candles)
   */
  detectThreeBlackCrows(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 3) return null;
    
    const [first, second, third] = window.slice(-3);
    
    // All three should be bearish
    const allBearish = 
      first.close < first.open &&
      second.close < second.open &&
      third.close < third.open;
    
    if (!allBearish) return null;
    
    // Each close should be lower than previous
    const progressivelyLower = 
      second.close < first.close &&
      third.close < second.close;
    
    if (!progressivelyLower) return null;
    
    // Check for reasonable body sizes
    const avgPrice = (first.close + second.close + third.close) / 3;
    const bodyRatios = [first, second, third].map(c => 
      Math.abs(c.close - c.open) / avgPrice
    );
    
    const minBodyRatio = Math.min(...bodyRatios);
    if (minBodyRatio > 0.01) {
      return {
        id: `three_black_crows_${third.date}`,
        name: 'Three Black Crows',
        type: 'BEARISH',
        timestamp: new Date(third.date),
        confidence: 0.80,
        significance: 'HIGH'
      };
    }
    
    return null;
  }

  /**
   * Detect Piercing Pattern (bullish reversal)
   */
  detectPiercingPattern(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 2) return null;
    
    const [prev, curr] = window.slice(-2);
    
    // Previous should be bearish, current bullish
    const prevBearish = prev.close < prev.open;
    const currBullish = curr.close > curr.open;
    
    if (!prevBearish || !currBullish) return null;
    
    // Current should open below previous close
    if (curr.open >= prev.close) return null;
    
    // Current should close above midpoint of previous body
    const prevMidpoint = (prev.open + prev.close) / 2;
    if (curr.close > prevMidpoint && curr.close < prev.open) {
      const penetration = (curr.close - prev.close) / (prev.open - prev.close);
      return {
        id: `piercing_pattern_${curr.date}`,
        name: 'Piercing Pattern',
        type: 'BULLISH',
        timestamp: new Date(curr.date),
        confidence: Math.min(0.90, penetration),
        significance: 'MEDIUM'
      };
    }
    
    return null;
  }

  /**
   * Detect Dark Cloud Cover (bearish reversal)
   */
  detectDarkCloudCover(window: OHLCV[]): CandlestickPatternResult | null {
    if (window.length < 2) return null;
    
    const [prev, curr] = window.slice(-2);
    
    // Previous should be bullish, current bearish
    const prevBullish = prev.close > prev.open;
    const currBearish = curr.close < curr.open;
    
    if (!prevBullish || !currBearish) return null;
    
    // Current should open above previous close
    if (curr.open <= prev.close) return null;
    
    // Current should close below midpoint of previous body
    const prevMidpoint = (prev.open + prev.close) / 2;
    if (curr.close < prevMidpoint && curr.close > prev.open) {
      const penetration = (prev.close - curr.close) / (prev.close - prev.open);
      return {
        id: `dark_cloud_cover_${curr.date}`,
        name: 'Dark Cloud Cover',
        type: 'BEARISH',
        timestamp: new Date(curr.date),
        confidence: Math.min(0.90, penetration),
        significance: 'MEDIUM'
      };
    }
    
    return null;
  }
}
