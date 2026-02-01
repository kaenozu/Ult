/**
 * Pattern Recognizer
 * 
 * Main coordinator for pattern recognition including candlestick patterns,
 * chart patterns, and geometric patterns.
 */

import { OHLCV } from '../../types/shared';
import { CandlestickPatternRecognizer } from './CandlestickPatternRecognizer';
import {
  PatternConfig,
  CandlestickPatternResult,
  ChartPatternResult,
  GeometricPatternResult,
  PatternReliability,
  PatternResult
} from './types';

export class PatternRecognizer {
  private candlestickPatterns: CandlestickPatternRecognizer;

  constructor(config: PatternConfig) {
    this.candlestickPatterns = new CandlestickPatternRecognizer(config.candlestick);
  }

  /**
   * Recognize candlestick patterns in data
   */
  recognizeCandlestickPatterns(data: OHLCV[]): CandlestickPatternResult[] {
    const patterns: CandlestickPatternResult[] = [];

    for (let i = 2; i < data.length; i++) {
      const window = data.slice(i - 2, i + 1);
      
      // Detect all pattern types
      const detectedPatterns = [
        this.candlestickPatterns.detectDoji(window),
        this.candlestickPatterns.detectHammer(window),
        this.candlestickPatterns.detectEngulfing(window),
        this.candlestickPatterns.detectMorningStar(window),
        this.candlestickPatterns.detectEveningStar(window),
        this.candlestickPatterns.detectThreeWhiteSoldiers(window),
        this.candlestickPatterns.detectThreeBlackCrows(window),
        this.candlestickPatterns.detectPiercingPattern(window),
        this.candlestickPatterns.detectDarkCloudCover(window),
      ].filter((p): p is CandlestickPatternResult => p !== null);

      patterns.push(...detectedPatterns);
    }

    return patterns;
  }

  /**
   * Recognize chart patterns (simplified implementation)
   */
  recognizeChartPatterns(data: OHLCV[]): ChartPatternResult[] {
    const patterns: ChartPatternResult[] = [];

    // Detect support/resistance levels
    const levels = this.detectSupportResistanceLevels(data);
    patterns.push(...levels);

    return patterns;
  }

  /**
   * Detect support and resistance levels
   */
  private detectSupportResistanceLevels(data: OHLCV[]): ChartPatternResult[] {
    const patterns: ChartPatternResult[] = [];
    const lookback = 20;

    for (let i = lookback; i < data.length - lookback; i++) {
      const window = data.slice(i - lookback, i + lookback + 1);
      const currentHigh = data[i].high;
      const currentLow = data[i].low;

      // Check if current point is a local maximum (resistance)
      const isResistance = window.every((d, idx) => 
        idx === lookback || d.high <= currentHigh
      );

      if (isResistance) {
        patterns.push({
          id: `resistance_${data[i].date}`,
          name: 'Resistance Level',
          type: 'SUPPORT_RESISTANCE',
          startIndex: i - lookback,
          endIndex: i + lookback,
          keyLevels: [currentHigh],
          confidence: 0.75
        });
      }

      // Check if current point is a local minimum (support)
      const isSupport = window.every((d, idx) => 
        idx === lookback || d.low >= currentLow
      );

      if (isSupport) {
        patterns.push({
          id: `support_${data[i].date}`,
          name: 'Support Level',
          type: 'SUPPORT_RESISTANCE',
          startIndex: i - lookback,
          endIndex: i + lookback,
          keyLevels: [currentLow],
          confidence: 0.75
        });
      }
    }

    return patterns;
  }

  /**
   * Recognize geometric patterns (Fibonacci, Pivot Points)
   */
  recognizeGeometricPatterns(data: OHLCV[]): GeometricPatternResult[] {
    const patterns: GeometricPatternResult[] = [];

    // Calculate Fibonacci retracement levels
    const fibLevels = this.calculateFibonacciRetracements(data);
    if (fibLevels) {
      patterns.push(fibLevels);
    }

    // Calculate pivot points
    const pivotPoints = this.calculatePivotPoints(data);
    if (pivotPoints) {
      patterns.push(pivotPoints);
    }

    return patterns;
  }

  /**
   * Calculate Fibonacci retracement levels
   */
  private calculateFibonacciRetracements(data: OHLCV[]): GeometricPatternResult | null {
    if (data.length < 2) return null;

    // Find recent swing high and low
    const recentData = data.slice(-50);
    const high = Math.max(...recentData.map(d => d.high));
    const low = Math.min(...recentData.map(d => d.low));
    const range = high - low;

    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
    const levels = fibLevels.map(level => ({
      level,
      price: high - (range * level)
    }));

    return {
      id: `fibonacci_${data[data.length - 1].date}`,
      name: 'Fibonacci Retracement',
      type: 'FIBONACCI',
      levels,
      validity: 'ACTIVE'
    };
  }

  /**
   * Calculate pivot points
   */
  private calculatePivotPoints(data: OHLCV[]): GeometricPatternResult | null {
    if (data.length < 1) return null;

    const lastCandle = data[data.length - 1];
    const pivot = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
    
    const r1 = 2 * pivot - lastCandle.low;
    const s1 = 2 * pivot - lastCandle.high;
    const r2 = pivot + (lastCandle.high - lastCandle.low);
    const s2 = pivot - (lastCandle.high - lastCandle.low);

    return {
      id: `pivot_${lastCandle.date}`,
      name: 'Pivot Points',
      type: 'PIVOT',
      levels: [
        { level: 2, price: r2 },
        { level: 1, price: r1 },
        { level: 0, price: pivot },
        { level: -1, price: s1 },
        { level: -2, price: s2 }
      ],
      validity: 'ACTIVE'
    };
  }

  /**
   * Evaluate pattern reliability based on historical data
   */
  evaluatePatternReliability(
    pattern: PatternResult,
    historicalData: OHLCV[]
  ): PatternReliability {
    // Simplified implementation
    // In a real system, this would analyze historical occurrences
    
    const baseSuccessRate = 0.65; // Default success rate
    const sampleSize = 100; // Assumed historical occurrences
    
    return {
      patternId: pattern.id,
      successRate: baseSuccessRate,
      averageMove: 0.03, // 3% average move
      averageTimeToTarget: 5, // 5 days average
      sampleSize,
      confidence: 0.75,
      recommendedAction: baseSuccessRate > 0.6 ? 'ENTER' : 'WAIT'
    };
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculateConfidence(
    pattern: CandlestickPatternResult | null,
    window: OHLCV[]
  ): number {
    if (!pattern) return 0;
    
    // Base confidence from pattern
    let confidence = pattern.confidence;
    
    // Adjust based on volume if available
    if (window.length > 1) {
      const latestVolume = window[window.length - 1].volume;
      const avgVolume = window.reduce((sum, d) => sum + d.volume, 0) / window.length;
      
      if (avgVolume > 0) {
        const volumeRatio = latestVolume / avgVolume;
        // Higher volume increases confidence
        confidence *= Math.min(1.2, 1 + (volumeRatio - 1) * 0.2);
      }
    }
    
    return Math.min(0.95, confidence);
  }
}

/**
 * Create default pattern recognizer configuration
 */
export function createDefaultPatternConfig(): PatternConfig {
  return {
    candlestick: {
      minBodySize: 0.1,
      wickThreshold: 0.3
    },
    chart: {
      minPatternBars: 10,
      tolerancePercent: 0.02
    },
    geometric: {
      fibonacciLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0],
      gannAngles: [45, 63.75, 71.25, 75, 82.5]
    }
  };
}
