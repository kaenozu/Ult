/**
 * Supply/Demand Master Service
 * 
 * Provides dynamic support/resistance level detection and breakout analysis
 * with enhanced accuracy and real-time notification capabilities.
 */

import { OHLCV } from '../types';

export interface SupplyDemandLevel {
  price: number;
  strength: number; // 0-1, higher is stronger
  type: 'SUPPORT' | 'RESISTANCE';
  volume: number;
  touches: number;
  lastTouchDate: string;
  priceRange: { high: number; low: number };
}

export interface BreakoutEvent {
  level: SupplyDemandLevel;
  direction: 'up' | 'down';
  strength: number;
  timestamp: Date;
  volumeConfirmation: boolean;
  followThrough: boolean;
}

export interface SupplyDemandAnalysis {
  levels: SupplyDemandLevel[];
  currentPrice: number;
  nearestSupport: SupplyDemandLevel | null;
  nearestResistance: SupplyDemandLevel | null;
  breakout: BreakoutEvent | null;
  nextBreakoutPrediction: {
    bullish: { price: number; probability: number } | null;
    bearish: { price: number; probability: number } | null;
  };
}

export interface VolumeProfileBucket {
  price: number;
  volume: number;
  trades: number;
}

// Constants
const MIN_TOUCHES = 2;
const MAX_TOUCHES = 10;
const PRICE_TOLERANCE = 0.01; // 1%
const VOLUME_CONFIRMATION_THRESHOLD = 1.5; // 1.5x average volume
const BREAKOUT_CONFIRMATION_PERIOD = 3; // Number of candles to confirm

class SupplyDemandMaster {
  /**
   * Calculate volume profile by price range
   * Optimized to avoid unnecessary flatMap and spread operations
   */
  private calculateVolumeProfile(data: OHLCV[], bucketCount: number = 50): VolumeProfileBucket[] {
    if (data.length === 0) return [];

    // Find min/max prices in a single pass instead of flatMap + spread
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const d of data) {
      if (d.low < minPrice) minPrice = d.low;
      if (d.high > maxPrice) maxPrice = d.high;
    }

    const bucketSize = (maxPrice - minPrice) / bucketCount;

    const buckets: VolumeProfileBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
      price: minPrice + bucketSize * (i + 0.5),
      volume: 0,
      trades: 0
    }));

    // Distribute volume across buckets
    for (const candle of data) {
      const priceRange = candle.high - candle.low;
      const volumePerPrice = candle.volume / Math.max(1, priceRange / bucketSize);

      // Calculate bucket range once instead of in loop
      const startBucket = Math.max(0, Math.floor((candle.low - minPrice) / bucketSize));
      const endBucket = Math.min(bucketCount - 1, Math.floor((candle.high - minPrice) / bucketSize));

      for (let i = startBucket; i <= endBucket; i++) {
        const bucketHigh = minPrice + bucketSize * (i + 1);
        const bucketLow = minPrice + bucketSize * i;

        const overlap = Math.min(candle.high, bucketHigh) - Math.max(candle.low, bucketLow);
        
        // Only process if there's actual overlap (guards against edge cases)
        if (overlap > 0) {
          const overlapRatio = overlap / Math.max(1, priceRange);
          buckets[i].volume += candle.volume * overlapRatio;
          buckets[i].trades++;
        }
      }
    }

    return buckets;
  }

  /**
   * Identify supply and demand levels from volume profile
   */
  identifySupplyDemandLevels(data: OHLCV[]): SupplyDemandLevel[] {
    if (data.length < 20) return [];

    const volumeProfile = this.calculateVolumeProfile(data);
    const avgVolume = volumeProfile.reduce((sum, b) => sum + b.volume, 0) / volumeProfile.length;

    // Find peaks in volume profile (high volume = strong levels)
    const levels: SupplyDemandLevel[] = [];
    const windowSize = 5;

    for (let i = windowSize; i < volumeProfile.length - windowSize; i++) {
      const current = volumeProfile[i];
      const window = volumeProfile.slice(i - windowSize, i + windowSize + 1);
      const maxVolumeInWindow = Math.max(...window.map(b => b.volume));

      // Current is a local maximum
      if (current.volume === maxVolumeInWindow && current.volume > avgVolume * 1.2) {
        // Determine if support or resistance based on price position
        const prices = data.slice(-20).map(d => d.close);
        const currentPrice = prices[prices.length - 1];
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        const type = current.price < avgPrice ? 'SUPPORT' : 'RESISTANCE';

        // Count touches
        let touches = 0;
        let lastTouchDate = data[0].date;
        for (const candle of data) {
          const isTouch = candle.low <= current.price && candle.high >= current.price;
          if (isTouch) {
            touches++;
            lastTouchDate = candle.date;
          }
        }

        if (touches >= MIN_TOUCHES) {
          levels.push({
            price: current.price,
            strength: Math.min(1, (current.volume / avgVolume - 1) * 2),
            type,
            volume: current.volume,
            touches: Math.min(touches, MAX_TOUCHES),
            lastTouchDate,
            priceRange: {
              high: current.price * (1 + PRICE_TOLERANCE),
              low: current.price * (1 - PRICE_TOLERANCE)
            }
          });
        }
      }
    }

    // Sort by strength
    return levels.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Detect breakout from supply/demand levels
   */
  detectBreakout(
    currentPrice: number,
    levels: SupplyDemandLevel[],
    data: OHLCV[],
    options: {
      tolerance?: number;
      volumeConfirmation?: boolean;
    } = {}
  ): BreakoutEvent | null {
    const { tolerance = PRICE_TOLERANCE, volumeConfirmation = true } = options;

    if (data.length < BREAKOUT_CONFIRMATION_PERIOD + 1) return null;

    const avgVolume = data.slice(-50).reduce((sum, d) => sum + d.volume, 0) / Math.min(50, data.length);
    const recentCandles = data.slice(-BREAKOUT_CONFIRMATION_PERIOD);
    const latestCandle = data[data.length - 1];

    for (const level of levels) {
      const isUpBreakout = currentPrice > level.price * (1 + tolerance);
      const isDownBreakout = currentPrice < level.price * (1 - tolerance);

      if (isUpBreakout || isDownBreakout) {
        // Check volume confirmation
        const volumeConfirmed = !volumeConfirmation || latestCandle.volume > avgVolume * VOLUME_CONFIRMATION_THRESHOLD;

        // Check follow-through (price maintains breakout direction)
        let followThrough = true;
        if (isUpBreakout) {
          for (const candle of recentCandles) {
            if (candle.close < level.price) {
              followThrough = false;
              break;
            }
          }
        } else {
          for (const candle of recentCandles) {
            if (candle.close > level.price) {
              followThrough = false;
              break;
            }
          }
        }

        return {
          level,
          direction: isUpBreakout ? 'up' : 'down',
          strength: Math.abs(currentPrice - level.price) / level.price,
          timestamp: new Date(),
          volumeConfirmation: volumeConfirmed,
          followThrough
        };
      }
    }

    return null;
  }

  /**
   * Predict next breakout
   */
  predictNextBreakout(
    currentPrice: number,
    levels: SupplyDemandLevel[],
    options: {
      thresholdPercent?: number;
      minStrength?: number;
    } = {}
  ): {
    bullish: { price: number; probability: number } | null;
    bearish: { price: number; probability: number } | null;
  } {
    const { thresholdPercent = 0.02, minStrength = 0.3 } = options;
    const threshold = currentPrice * thresholdPercent;

    // Find nearby resistance
    const nearbyResistance = levels
      .filter(l => l.type === 'RESISTANCE' && l.strength >= minStrength)
      .filter(l => l.price > currentPrice && l.price - currentPrice <= threshold)
      .sort((a, b) => a.price - b.price)[0];

    // Find nearby support
    const nearbySupport = levels
      .filter(l => l.type === 'SUPPORT' && l.strength >= minStrength)
      .filter(l => l.price < currentPrice && currentPrice - l.price <= threshold)
      .sort((a, b) => b.price - a.price)[0];

    return {
      bullish: nearbyResistance
        ? {
            price: nearbyResistance.price,
            probability: nearbyResistance.strength * 100
          }
        : null,
      bearish: nearbySupport
        ? {
            price: nearbySupport.price,
            probability: nearbySupport.strength * 100
          }
        : null
    };
  }

  /**
   * Perform complete supply/demand analysis
   */
  analyze(data: OHLCV[]): SupplyDemandAnalysis {
    if (data.length === 0) {
      return {
        levels: [],
        currentPrice: 0,
        nearestSupport: null,
        nearestResistance: null,
        breakout: null,
        nextBreakoutPrediction: { bullish: null, bearish: null }
      };
    }

    const currentPrice = data[data.length - 1].close;
    const levels = this.identifySupplyDemandLevels(data);

    // Find nearest levels
    const supportLevels = levels.filter(l => l.type === 'SUPPORT' && l.price < currentPrice);
    const resistanceLevels = levels.filter(l => l.type === 'RESISTANCE' && l.price > currentPrice);

    const nearestSupport = supportLevels.length > 0
      ? supportLevels.sort((a, b) => b.price - a.price)[0]
      : null;
    const nearestResistance = resistanceLevels.length > 0
      ? resistanceLevels.sort((a, b) => a.price - b.price)[0]
      : null;

    // Detect breakout
    const breakout = this.detectBreakout(currentPrice, levels, data);

    // Predict next breakout
    const nextBreakoutPrediction = this.predictNextBreakout(currentPrice, levels);

    return {
      levels,
      currentPrice,
      nearestSupport,
      nearestResistance,
      breakout,
      nextBreakoutPrediction
    };
  }

  /**
   * Get dynamic support/resistance lines for chart display
   */
  getDynamicLevelsForChart(analysis: SupplyDemandAnalysis): {
    support: { price: number; strength: number; color: string }[];
    resistance: { price: number; strength: number; color: string }[];
  } {
    const support = analysis.levels
      .filter(l => l.type === 'SUPPORT')
      .slice(0, 5) // Top 5 strongest
      .map(l => ({
        price: l.price,
        strength: l.strength,
        color: l.strength > 0.7 ? '#22c55e' : l.strength > 0.4 ? '#86efac' : '#bbf7d0'
      }));

    const resistance = analysis.levels
      .filter(l => l.type === 'RESISTANCE')
      .slice(0, 5) // Top 5 strongest
      .map(l => ({
        price: l.price,
        strength: l.strength,
        color: l.strength > 0.7 ? '#ef4444' : l.strength > 0.4 ? '#fca5a5' : '#fecaca'
      }));

    return { support, resistance };
  }

  /**
   * Check if price is approaching a level
   */
  isApproachingLevel(
    currentPrice: number,
    level: SupplyDemandLevel,
    thresholdPercent: number = 0.02
  ): boolean {
    const threshold = currentPrice * thresholdPercent;
    const distance = Math.abs(currentPrice - level.price);
    return distance <= threshold;
  }

  /**
   * Get level strength description
   */
  getStrengthDescription(strength: number): string {
    if (strength >= 0.8) return '非常に強い';
    if (strength >= 0.6) return '強い';
    if (strength >= 0.4) return '中程度';
    if (strength >= 0.2) return '弱い';
    return '非常に弱い';
  }
}

export const supplyDemandMaster = new SupplyDemandMaster();
