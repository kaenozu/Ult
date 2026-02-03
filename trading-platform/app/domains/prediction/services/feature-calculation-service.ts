/**
 * Feature Calculation Service
 * 
 * 特徴量計算サービス
 */

import { OHLCV } from '@/app/types';
import { PredictionFeatures } from '../types';

export class FeatureCalculationService {
  calculateFeatures(data: OHLCV[]): PredictionFeatures {
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const rsi = this.calculateRSI(closes, 14);
    const sma5 = this.calculateSMA(closes, 5);
    const sma20 = this.calculateSMA(closes, 20);
    const priceMomentum = this.calculateMomentum(closes, 5);
    const volatility = this.calculateVolatility(closes, 20);
    const volumeChange = this.calculateVolumeChange(volumes, 5);

    return {
      rsi: rsi[rsi.length - 1] || 50,
      sma5: sma5[sma5.length - 1] || 0,
      sma20: sma20[sma20.length - 1] || 0,
      priceMomentum,
      volatility,
      volumeChange,
    };
  }

  private calculateRSI(closes: number[], period: number): number[] {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
  }

  private calculateSMA(values: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateMomentum(closes: number[], period: number): number {
    if (closes.length < period + 1) return 0;
    const current = closes[closes.length - 1];
    const previous = closes[closes.length - period - 1];
    return previous === 0 ? 0 : (current - previous) / previous * 100;
  }

  private calculateVolatility(closes: number[], period: number): number {
    if (closes.length < period) return 0;
    const recent = closes.slice(-period);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    return Math.sqrt(variance);
  }

  private calculateVolumeChange(volumes: number[], period: number): number {
    if (volumes.length < period * 2) return 0;
    const recent = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const previous = volumes.slice(-period * 2, -period).reduce((a, b) => a + b, 0) / period;
    return previous === 0 ? 0 : (recent - previous) / previous * 100;
  }
}

export const featureCalculationService = new FeatureCalculationService();
