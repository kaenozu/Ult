/**
 * time-series-calculator.ts
 * 
 * 時系列データ（ラグ、移動統計、周期性）の計算専門クラス
 */

import { OHLCV } from '@/app/types';
import { TimeSeriesFeatures } from '../feature-types';
import { calculateSMA } from '../../../utils/technical-analysis';

export class TimeSeriesCalculator {
  public calculate(data: OHLCV[]): TimeSeriesFeatures {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    const lastDate = new Date(data[data.length - 1].date);
    const dayOfWeek = lastDate.getDay();
    const monthOfYear = lastDate.getMonth();

    const last = (arr: number[]) => {
      const valid = arr.filter(v => !isNaN(v));
      return valid.length > 0 ? valid[valid.length - 1] : 0;
    };

    // Advanced features
    const rollingMean5 = this.calculateRollingMean(prices, 5);
    const rollingMean20 = this.calculateRollingMean(prices, 20);
    const rollingStd5 = this.calculateRollingStd(prices, 5);
    const rollingStd20 = this.calculateRollingStd(prices, 20);
    const exponentialMA = this.calculateEMA(prices, 12);
    
    const momentum10 = this.calculateLag(prices, 10);
    const momentum5 = this.calculateLag(prices, 5);
    const momentumChange = momentum10 - momentum5;

    const priceAcceleration = this.calculateAcceleration(prices, 3);
    const volumeAcceleration = this.calculateAcceleration(volumes, 3);
    const autocorrelation = this.calculateAutocorrelation(prices, 1);
    const fourier = this.applyFourierTransform(prices.slice(-50));

    return {
      lag1: this.calculateLag(prices, 1),
      lag5: this.calculateLag(prices, 5),
      lag10: momentum10,
      lag20: this.calculateLag(prices, 20),
      ma5: last(calculateSMA(prices, 5)),
      ma10: last(calculateSMA(prices, 10)),
      ma20: last(calculateSMA(prices, 20)),
      ma50: last(calculateSMA(prices, 50)),
      dayOfWeek,
      dayOfWeekReturn: this.calculateDayOfWeekReturn(data, dayOfWeek),
      monthOfYear,
      monthEffect: this.calculateMonthEffect(data, monthOfYear),
      trendStrength: this.calculateTrendStrength(prices.slice(-50)),
      trendDirection: this.classifyTrendDirection(prices.slice(-50)),
      cyclicality: this.calculateCyclicality(prices.slice(-50)),
      rollingMean5, rollingMean20, rollingStd5, rollingStd20,
      exponentialMA, momentumChange,
      priceAcceleration, volumeAcceleration,
      autocorrelation,
      fourierDominantFreq: fourier.dominantFreq,
      fourierAmplitude: fourier.amplitude,
    };
  }

  private calculateLag(prices: number[], lag: number): number {
    if (prices.length < lag + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - lag];
    return ((current - past) / (past || 1)) * 100;
  }

  private calculateRollingMean(values: number[], window: number): number {
    if (values.length < window) return values[values.length - 1] || 0;
    const slice = values.slice(-window);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  }

  private calculateRollingStd(values: number[], window: number): number {
    if (values.length < window) return 0;
    const slice = values.slice(-window);
    const mean = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / slice.length;
    return Math.sqrt(variance);
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length < period) return values[values.length - 1];
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private calculateDayOfWeekReturn(data: OHLCV[], dayOfWeek: number): number {
    const sameDayData = data.filter(d => new Date(d.date).getDay() === dayOfWeek);
    if (sameDayData.length < 2) return 0;
    let totalReturn = 0;
    for (let i = 1; i < sameDayData.length; i++) {
      totalReturn += (sameDayData[i].close - sameDayData[i - 1].close) / (sameDayData[i - 1].close || 1);
    }
    return (totalReturn / sameDayData.length) * 100;
  }

  private calculateMonthEffect(data: OHLCV[], month: number): number {
    const sameMonthData = data.filter(d => new Date(d.date).getMonth() === month);
    if (sameMonthData.length < 2) return 0;
    const firstPrice = sameMonthData[0].close;
    const lastPrice = sameMonthData[sameMonthData.length - 1].close;
    return ((lastPrice - firstPrice) / (firstPrice || 1)) * 100;
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 10) return 0;
    const n = prices.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = prices;
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const yMean = sumY / n;
    let ssTotal = 0; let ssResidual = 0;
    for (let i = 0; i < n; i++) {
      const yPredicted = slope * xValues[i] + intercept;
      ssTotal += Math.pow(yValues[i] - yMean, 2);
      ssResidual += Math.pow(yValues[i] - yPredicted, 2);
    }
    return ssTotal > 0 ? Math.max(0, Math.min(1, 1 - ssResidual / ssTotal)) : 0;
  }

  private classifyTrendDirection(prices: number[]): 'UP' | 'DOWN' | 'NEUTRAL' {
    if (prices.length < 10) return 'NEUTRAL';
    const mid = Math.floor(prices.length / 2);
    const firstAvg = prices.slice(0, mid).reduce((a,b)=>a+b,0)/mid;
    const secondAvg = prices.slice(mid).reduce((a,b)=>a+b,0)/(prices.length-mid);
    const change = (secondAvg - firstAvg) / (firstAvg || 1);
    if (change > 0.02) return 'UP';
    if (change < -0.02) return 'DOWN';
    return 'NEUTRAL';
  }

  private calculateCyclicality(prices: number[]): number {
    if (prices.length < 20) return 0;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / (prices[i - 1] || 1));
    }
    const autocorrelations = [];
    for (let lag = 1; lag <= Math.min(5, Math.floor(returns.length / 2)); lag++) {
      const corr = this.calculateAutocorrelation(returns, lag);
      autocorrelations.push(Math.abs(corr));
    }
    return autocorrelations.reduce((sum, corr) => sum + corr, 0) / (autocorrelations.length || 1);
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length < lag + 10) return 0;
    const n = values.length - lag;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    let numerator = 0; let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    return denominator !== 0 ? numerator / denominator : 0;
  }

  private calculateAcceleration(prices: number[], period: number): number {
    if (prices.length < period + 2) return 0;
    const recent = prices.slice(-period);
    const velocities = [];
    for (let i = 1; i < recent.length; i++) {
      velocities.push((recent[i] - recent[i - 1]) / (recent[i - 1] || 1));
    }
    if (velocities.length < 2) return 0;
    return (velocities[velocities.length - 1] - velocities[0]) * 100;
  }

  private applyFourierTransform(values: number[]): { dominantFreq: number; amplitude: number } {
    if (values.length < 8) return { dominantFreq: 0, amplitude: 0 };
    const N = Math.min(values.length, 50);
    const frequencies = [];
    for (let k = 1; k < N / 2; k++) {
      let real = 0; let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += values[n] * Math.cos(angle);
        imag += values[n] * Math.sin(angle);
      }
      const amplitude = Math.sqrt(real * real + imag * imag) / N;
      frequencies.push({ freq: k / N, amplitude });
    }
    frequencies.sort((a, b) => b.amplitude - a.amplitude);
    return {
      dominantFreq: frequencies[0]?.freq || 0,
      amplitude: frequencies[0]?.amplitude || 0,
    };
  }
}
