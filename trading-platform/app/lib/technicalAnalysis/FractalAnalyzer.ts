/**
 * Fractal Analyzer
 * 
 * Calculates fractal dimension, Hurst exponent, analyzes self-similarity,
 * and provides fractal-based predictions.
 */

import { OHLCV } from '../../types/shared';
import {
  FractalConfig,
  FractalDimensionResult,
  HurstExponentResult,
  SelfSimilarityResult,
  SelfSimilarityMetric,
  MultiTimeframeResult,
  TimeframeAnalysis,
  FractalPrediction,
  FractalForecast
} from './types';
import { dfa, mean, stdDev, correlation, calculateReturns } from './mathUtils';

export class FractalAnalyzer {
  constructor(private config: FractalConfig) {}

  /**
   * Calculate fractal dimension using multiple methods
   */
  calculateFractalDimension(data: OHLCV[]): FractalDimensionResult {
    const prices = data.map(d => d.close);
    
    // Box counting dimension
    const boxCountingDim = this.calculateBoxCountingDimension(prices);
    
    // DFA dimension (2 - Hurst exponent)
    const hurstExponent = this.calculateHurstExponentValue(prices);
    const dfaDim = 2 - hurstExponent;
    
    // Average the two methods
    const fractalDimension = (boxCountingDim + dfaDim) / 2;
    
    return {
      fractalDimension,
      boxCountingDimension: boxCountingDim,
      dfaDimension: dfaDim,
      interpretation: this.interpretDimension(fractalDimension),
      timestamp: new Date()
    };
  }

  /**
   * Calculate box counting dimension
   */
  private calculateBoxCountingDimension(prices: number[]): number {
    if (prices.length < 10) return 1.5;
    
    const boxSizes = [2, 4, 8, 16, 32];
    const counts: number[] = [];
    
    for (const boxSize of boxSizes) {
      if (boxSize > prices.length / 2) continue;
      
      let count = 0;
      for (let i = 0; i < prices.length - boxSize; i += boxSize) {
        const segment = prices.slice(i, i + boxSize);
        const min = Math.min(...segment);
        const max = Math.max(...segment);
        const boxes = Math.ceil((max - min) / boxSize) || 1;
        count += boxes;
      }
      counts.push(count);
    }
    
    if (counts.length < 2) return 1.5;
    
    // Calculate slope of log-log plot
    const logSizes = boxSizes.slice(0, counts.length).map(s => Math.log(s));
    const logCounts = counts.map(c => Math.log(c));
    
    const slope = this.linearRegressionSlope(logSizes, logCounts);
    return Math.abs(slope);
  }

  /**
   * Calculate Hurst exponent
   */
  calculateHurstExponent(data: OHLCV[]): HurstExponentResult {
    const returns = calculateReturns(data.map(d => d.close));
    const hurst = this.calculateHurstExponentValue(returns);
    
    return {
      hurstExponent: hurst,
      interpretation: this.interpretHurst(hurst),
      confidence: this.calculateHurstConfidence(returns.length),
      timestamp: new Date()
    };
  }

  /**
   * Calculate Hurst exponent value using DFA
   */
  private calculateHurstExponentValue(data: number[]): number {
    if (data.length < 20) return 0.5;
    
    const hurstValue = dfa(
      data,
      this.config.dfa.minScale,
      this.config.dfa.maxScale,
      this.config.dfa.scaleStep
    );
    
    // Clamp to valid range [0, 1]
    return Math.max(0, Math.min(1, hurstValue));
  }

  /**
   * Interpret fractal dimension
   */
  private interpretDimension(dimension: number): string {
    if (dimension < 1.3) {
      return 'Smooth, persistent trend';
    } else if (dimension < 1.5) {
      return 'Mild trending behavior';
    } else if (dimension < 1.7) {
      return 'Random walk behavior';
    } else {
      return 'Highly volatile, mean-reverting';
    }
  }

  /**
   * Interpret Hurst exponent
   */
  private interpretHurst(hurst: number): string {
    if (hurst < 0.4) {
      return 'Mean-reverting (anti-persistent)';
    } else if (hurst < 0.6) {
      return 'Random walk (no correlation)';
    } else {
      return 'Trending (persistent)';
    }
  }

  /**
   * Calculate confidence for Hurst exponent
   */
  private calculateHurstConfidence(dataLength: number): number {
    // Confidence increases with more data
    const minLength = 50;
    const maxLength = 500;
    
    if (dataLength < minLength) {
      return dataLength / minLength * 0.5;
    } else if (dataLength > maxLength) {
      return 0.95;
    } else {
      return 0.5 + (dataLength - minLength) / (maxLength - minLength) * 0.45;
    }
  }

  /**
   * Analyze self-similarity at different scales
   */
  analyzeSelfSimilarity(data: OHLCV[]): SelfSimilarityResult {
    const prices = data.map(d => d.close);
    const scales = [5, 10, 20, 50, 100];
    const similarities: SelfSimilarityMetric[] = [];
    
    for (const scale of scales) {
      if (scale * 2 > prices.length) continue;
      
      const similarity = this.calculateSimilarityAtScale(prices, scale);
      const corr = this.calculateScaleCorrelation(prices, scale);
      
      similarities.push({
        scale,
        similarity,
        correlation: corr
      });
    }
    
    const overallSimilarity = similarities.length > 0 
      ? mean(similarities.map(s => s.similarity))
      : 0;
    
    return {
      similarities,
      overallSimilarity,
      isSelfSimilar: overallSimilarity > 0.6,
      timestamp: new Date()
    };
  }

  /**
   * Calculate similarity at a specific scale
   */
  private calculateSimilarityAtScale(prices: number[], scale: number): number {
    if (prices.length < scale * 2) return 0;
    
    // Compare first and second half at this scale
    const firstHalf = prices.slice(0, scale);
    const secondHalf = prices.slice(scale, scale * 2);
    
    // Normalize to [0, 1]
    const normalizeSegment = (segment: number[]) => {
      const min = Math.min(...segment);
      const max = Math.max(...segment);
      const range = max - min;
      if (range === 0) return segment.map(() => 0.5);
      return segment.map(p => (p - min) / range);
    };
    
    const norm1 = normalizeSegment(firstHalf);
    const norm2 = normalizeSegment(secondHalf);
    
    // Calculate correlation
    return Math.abs(correlation(norm1, norm2));
  }

  /**
   * Calculate correlation at scale
   */
  private calculateScaleCorrelation(prices: number[], scale: number): number {
    if (prices.length < scale * 2) return 0;
    
    const returns1 = calculateReturns(prices.slice(0, scale));
    const returns2 = calculateReturns(prices.slice(scale, scale * 2));
    
    if (returns1.length !== returns2.length) return 0;
    
    return correlation(returns1, returns2);
  }

  /**
   * Analyze multiple timeframes
   */
  analyzeMultiTimeframe(
    data: OHLCV[],
    timeframes: string[] = ['1D', '1W', '1M']
  ): MultiTimeframeResult {
    const results: TimeframeAnalysis[] = [];
    
    // For each timeframe, resample and analyze
    for (const timeframe of timeframes) {
      const resampledData = this.resampleData(data, timeframe);
      
      if (resampledData.length < 20) continue;
      
      const fractalDim = this.calculateFractalDimension(resampledData);
      const hurst = this.calculateHurstExponent(resampledData);
      const trend = this.determineTrend(resampledData);
      
      results.push({
        timeframe,
        fractalDimension: fractalDim.fractalDimension,
        hurstExponent: hurst.hurstExponent,
        trend
      });
    }
    
    return {
      symbol: data[0]?.symbol || 'UNKNOWN',
      timeframes: results,
      consistency: this.calculateConsistency(results),
      recommendations: this.generateRecommendations(results),
      timestamp: new Date()
    };
  }

  /**
   * Resample data to different timeframe
   */
  private resampleData(data: OHLCV[], timeframe: string): OHLCV[] {
    // Simplified resampling - in production, use proper time-based resampling
    const multipliers: { [key: string]: number } = {
      '1D': 1,
      '1W': 5,
      '1M': 20
    };
    
    const multiplier = multipliers[timeframe] || 1;
    const result: OHLCV[] = [];
    
    for (let i = 0; i < data.length; i += multiplier) {
      const segment = data.slice(i, Math.min(i + multiplier, data.length));
      if (segment.length === 0) continue;
      
      result.push({
        symbol: data[0].symbol,
        date: segment[0].date,
        open: segment[0].open,
        high: Math.max(...segment.map(d => d.high)),
        low: Math.min(...segment.map(d => d.low)),
        close: segment[segment.length - 1].close,
        volume: segment.reduce((sum, d) => sum + d.volume, 0)
      });
    }
    
    return result;
  }

  /**
   * Determine trend from data
   */
  private determineTrend(data: OHLCV[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (data.length < 2) return 'NEUTRAL';
    
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const change = (lastPrice - firstPrice) / firstPrice;
    
    if (change > 0.05) return 'BULLISH';
    if (change < -0.05) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Calculate consistency across timeframes
   */
  private calculateConsistency(results: TimeframeAnalysis[]): number {
    if (results.length < 2) return 1.0;
    
    // Check if Hurst exponents are similar
    const hursts = results.map(r => r.hurstExponent);
    const hurst Std = stdDev(hursts);
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - hurstStd * 2);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(results: TimeframeAnalysis[]): string[] {
    const recommendations: string[] = [];
    
    if (results.length === 0) {
      recommendations.push('Insufficient data for analysis');
      return recommendations;
    }
    
    const avgHurst = mean(results.map(r => r.hurstExponent));
    
    if (avgHurst > 0.6) {
      recommendations.push('Persistent trending behavior detected - trend following strategies recommended');
    } else if (avgHurst < 0.4) {
      recommendations.push('Mean-reverting behavior detected - counter-trend strategies recommended');
    } else {
      recommendations.push('Random walk behavior - use caution with directional strategies');
    }
    
    return recommendations;
  }

  /**
   * Predict future prices based on fractal characteristics
   */
  predictFromFractals(data: OHLCV[], horizon: number = 5): FractalPrediction {
    const fractalDim = this.calculateFractalDimension(data);
    const hurst = this.calculateHurstExponent(data);
    const selfSimilarity = this.analyzeSelfSimilarity(data);
    
    const predictions: FractalForecast[] = [];
    const lastPrice = data[data.length - 1].close;
    const returns = calculateReturns(data.map(d => d.close));
    const avgReturn = mean(returns);
    const volatility = stdDev(returns);
    
    for (let t = 1; t <= horizon; t++) {
      // Use Hurst exponent to adjust predictions
      const persistence = (hurst.hurstExponent - 0.5) * 2; // Range [-1, 1]
      const expectedReturn = avgReturn * (1 + persistence * 0.5);
      const expectedChange = expectedReturn * t;
      const expectedPrice = lastPrice * (1 + expectedChange);
      
      // Confidence decreases with horizon
      const confidence = hurst.confidence * Math.exp(-t / 10);
      
      predictions.push({
        step: t,
        expectedPrice,
        expectedChange,
        confidence
      });
    }
    
    return {
      symbol: data[0]?.symbol || 'UNKNOWN',
      horizon,
      predictions,
      fractalCharacteristics: {
        dimension: fractalDim.fractalDimension,
        hurst: hurst.hurstExponent,
        selfSimilarity: selfSimilarity.overallSimilarity
      },
      confidence: mean(predictions.map(p => p.confidence)),
      timestamp: new Date()
    };
  }

  /**
   * Calculate linear regression slope
   */
  private linearRegressionSlope(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
  }
}

/**
 * Create default fractal analyzer configuration
 */
export function createDefaultFractalConfig(): FractalConfig {
  return {
    hurst: {
      minLag: 2,
      maxLag: 20
    },
    boxCounting: {
      minBoxSize: 2,
      maxBoxSize: 32
    },
    dfa: {
      minScale: 4,
      maxScale: -1, // Auto-determine
      scaleStep: 2
    }
  };
}
