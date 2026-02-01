/**
 * Cycle Analyzer
 * 
 * Analyzes price cycles using FFT, detects seasonality patterns,
 * and provides cycle-based predictions.
 */

import { OHLCV } from '../../types/shared';
import {
  CycleConfig,
  CycleDetectionResult,
  CycleInfo,
  SeasonalityResult,
  SeasonalPattern,
  CycleBasedPrediction,
  CyclePrediction,
  TurningPoint
} from './types';
import { fft, complexMagnitude, mean, calculateReturns } from './mathUtils';

export class CycleAnalyzer {
  constructor(private config: CycleConfig) {}

  /**
   * Detect price cycles using FFT
   */
  detectPriceCycles(data: OHLCV[]): CycleDetectionResult {
    const prices = data.map(d => d.close);
    
    // Perform FFT
    const spectrum = fft(prices);
    const magnitudes = spectrum.map(complexMagnitude);
    
    // Find dominant cycles
    const cycles = this.extractCycles(magnitudes, prices.length);
    const dominantCycle = cycles.length > 0 ? cycles[0] : this.getDefaultCycle();
    
    return {
      cycles,
      dominantCycle,
      cycleStrength: this.calculateCycleStrength(cycles),
      phase: this.calculateCurrentPhase(prices, dominantCycle),
      timestamp: new Date()
    };
  }

  /**
   * Extract significant cycles from FFT magnitudes
   */
  private extractCycles(magnitudes: number[], dataLength: number): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const halfLength = Math.floor(magnitudes.length / 2);
    
    // Skip DC component (index 0)
    for (let i = 1; i < halfLength; i++) {
      const period = dataLength / i;
      
      // Filter by configured range
      if (period < this.config.fft.minCycleLength || 
          period > this.config.fft.maxCycleLength) {
        continue;
      }
      
      const amplitude = magnitudes[i] / dataLength;
      
      // Only keep significant cycles
      if (amplitude > this.config.fft.significanceThreshold) {
        cycles.push({
          period,
          amplitude,
          phase: 0, // Simplified
          strength: amplitude
        });
      }
    }
    
    // Sort by amplitude (strength)
    cycles.sort((a, b) => b.amplitude - a.amplitude);
    
    return cycles.slice(0, 5); // Top 5 cycles
  }

  /**
   * Calculate current phase of dominant cycle
   */
  private calculateCurrentPhase(prices: number[], cycle: CycleInfo): number {
    if (prices.length === 0 || cycle.period === 0) return 0;
    
    // Simple phase calculation
    const position = prices.length % cycle.period;
    return (2 * Math.PI * position) / cycle.period;
  }

  /**
   * Calculate overall cycle strength
   */
  private calculateCycleStrength(cycles: CycleInfo[]): number {
    if (cycles.length === 0) return 0;
    
    const totalStrength = cycles.reduce((sum, c) => sum + c.strength, 0);
    return Math.min(1.0, totalStrength);
  }

  /**
   * Get default cycle when none detected
   */
  private getDefaultCycle(): CycleInfo {
    return {
      period: 20, // Default 20-day cycle
      amplitude: 0,
      phase: 0,
      strength: 0
    };
  }

  /**
   * Analyze seasonality patterns
   */
  analyzeSeasonality(data: OHLCV[]): SeasonalityResult {
    const returns = calculateReturns(data.map(d => d.close));
    
    return {
      monthly: this.analyzeMonthlyPattern(data),
      weekly: this.analyzeWeeklyPattern(data),
      daily: this.analyzeDailyPattern(data),
      overallSeasonality: this.calculateOverallSeasonality(returns),
      recommendations: this.getSeasonalityRecommendations(data)
    };
  }

  /**
   * Analyze monthly seasonal patterns
   */
  private analyzeMonthlyPattern(data: OHLCV[]): SeasonalPattern {
    const monthlyReturns: { [key: number]: number[] } = {};
    
    // Group returns by month
    for (let i = 1; i < data.length; i++) {
      const date = new Date(data[i].date);
      const month = date.getMonth();
      const ret = (data[i].close - data[i - 1].close) / data[i - 1].close;
      
      if (!monthlyReturns[month]) {
        monthlyReturns[month] = [];
      }
      monthlyReturns[month].push(ret);
    }
    
    // Calculate average returns per month
    const periods = Object.keys(monthlyReturns).map(month => {
      const monthNum = parseInt(month);
      const avgReturn = mean(monthlyReturns[monthNum]);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      return {
        period: monthNames[monthNum],
        avgReturn,
        significance: Math.abs(avgReturn) * 100
      };
    });
    
    // Calculate pattern strength
    const avgReturns = periods.map(p => p.avgReturn);
    const strength = Math.abs(mean(avgReturns)) * 10;
    
    return {
      periods,
      strength: Math.min(1.0, strength)
    };
  }

  /**
   * Analyze weekly seasonal patterns
   */
  private analyzeWeeklyPattern(data: OHLCV[]): SeasonalPattern {
    const weeklyReturns: { [key: number]: number[] } = {};
    
    // Group returns by day of week
    for (let i = 1; i < data.length; i++) {
      const date = new Date(data[i].date);
      const dayOfWeek = date.getDay();
      const ret = (data[i].close - data[i - 1].close) / data[i - 1].close;
      
      if (!weeklyReturns[dayOfWeek]) {
        weeklyReturns[dayOfWeek] = [];
      }
      weeklyReturns[dayOfWeek].push(ret);
    }
    
    // Calculate average returns per day
    const periods = Object.keys(weeklyReturns).map(day => {
      const dayNum = parseInt(day);
      const avgReturn = mean(weeklyReturns[dayNum]);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      return {
        period: dayNames[dayNum],
        avgReturn,
        significance: Math.abs(avgReturn) * 100
      };
    });
    
    const avgReturns = periods.map(p => p.avgReturn);
    const strength = Math.abs(mean(avgReturns)) * 10;
    
    return {
      periods,
      strength: Math.min(1.0, strength)
    };
  }

  /**
   * Analyze daily patterns (intraday not available, return placeholder)
   */
  private analyzeDailyPattern(data: OHLCV[]): SeasonalPattern {
    return {
      periods: [],
      strength: 0
    };
  }

  /**
   * Calculate overall seasonality score
   */
  private calculateOverallSeasonality(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    // Simple measure: coefficient of variation
    const avg = mean(returns);
    const variance = mean(returns.map(r => Math.pow(r - avg, 2)));
    const std = Math.sqrt(variance);
    
    if (Math.abs(avg) < 0.0001) return 0;
    
    return Math.min(1.0, std / Math.abs(avg));
  }

  /**
   * Get seasonality-based recommendations
   */
  private getSeasonalityRecommendations(data: OHLCV[]): string[] {
    const recommendations: string[] = [];
    
    if (data.length < 20) {
      recommendations.push('Insufficient data for seasonality analysis');
      return recommendations;
    }
    
    recommendations.push('Monitor seasonal patterns for entry/exit timing');
    recommendations.push('Consider cycle phase when making trading decisions');
    
    return recommendations;
  }

  /**
   * Predict future prices based on cycles
   */
  predictFromCycles(data: OHLCV[], horizon: number = 5): CycleBasedPrediction {
    const cycles = this.detectPriceCycles(data);
    const currentPhase = cycles.phase;
    const predictions: CyclePrediction[] = [];
    
    for (let t = 1; t <= horizon; t++) {
      const futurePhase = (currentPhase + (2 * Math.PI * t) / cycles.dominantCycle.period) % (2 * Math.PI);
      const cycleContribution = cycles.dominantCycle.amplitude * Math.sin(futurePhase);
      
      predictions.push({
        step: t,
        phase: futurePhase,
        expectedChange: cycleContribution,
        confidence: this.calculatePredictionConfidence(cycles, t)
      });
    }
    
    return {
      symbol: data[0]?.symbol || 'UNKNOWN',
      horizon,
      predictions,
      dominantCycle: cycles.dominantCycle,
      confidence: this.calculateOverallPredictionConfidence(predictions),
      timestamp: new Date()
    };
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(cycles: CycleDetectionResult, step: number): number {
    const baseConfidence = cycles.cycleStrength;
    // Confidence decreases with prediction horizon
    const decay = Math.exp(-step / 10);
    return baseConfidence * decay;
  }

  /**
   * Calculate overall prediction confidence
   */
  private calculateOverallPredictionConfidence(predictions: CyclePrediction[]): number {
    if (predictions.length === 0) return 0;
    return mean(predictions.map(p => p.confidence));
  }

  /**
   * Detect cycle turning points
   */
  detectCycleTurningPoints(data: OHLCV[]): TurningPoint[] {
    const cycles = this.detectPriceCycles(data);
    const turningPoints: TurningPoint[] = [];
    
    // Look for phase transitions near 0 (bottom) or π (top)
    for (let i = 1; i < data.length; i++) {
      const phase = this.calculatePhaseAtIndex(data, i, cycles);
      const prevPhase = this.calculatePhaseAtIndex(data, i - 1, cycles);
      
      // Detect bottom (phase crossing 0)
      if (prevPhase > 1.5 * Math.PI && phase < 0.5 * Math.PI) {
        turningPoints.push({
          timestamp: new Date(data[i].date),
          price: data[i].close,
          type: 'CYCLE_BOTTOM',
          cycle: cycles.dominantCycle,
          confidence: cycles.cycleStrength
        });
      }
      
      // Detect top (phase crossing π)
      if (prevPhase < Math.PI && phase > Math.PI) {
        turningPoints.push({
          timestamp: new Date(data[i].date),
          price: data[i].close,
          type: 'CYCLE_TOP',
          cycle: cycles.dominantCycle,
          confidence: cycles.cycleStrength
        });
      }
    }
    
    return turningPoints;
  }

  /**
   * Calculate phase at specific index
   */
  private calculatePhaseAtIndex(data: OHLCV[], index: number, cycles: CycleDetectionResult): number {
    if (cycles.dominantCycle.period === 0) return 0;
    const position = index % cycles.dominantCycle.period;
    return (2 * Math.PI * position) / cycles.dominantCycle.period;
  }
}

/**
 * Create default cycle analyzer configuration
 */
export function createDefaultCycleConfig(): CycleConfig {
  return {
    fft: {
      minCycleLength: 5,
      maxCycleLength: 100,
      significanceThreshold: 0.01
    },
    seasonal: {
      periodsToAnalyze: 12,
      confidenceLevel: 0.95
    }
  };
}
