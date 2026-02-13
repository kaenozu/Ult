/**
 * Feature Calculation Service
 * 
 * 特徴量計算サービス
 */

import { OHLCV } from '@/app/types';
import { PredictionFeatures } from '../types';
import { calculateATR, calculateSMA } from '@/app/lib/utils/technical-analysis';

export class FeatureCalculationService {
  calculateFeatures(data: OHLCV[]): PredictionFeatures {
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    const rsi = this.calculateRSI(closes, 14);
    const rsiValues = rsi.length > 1 ? rsi : [rsi[0], rsi[0]];
    const rsiChange = rsiValues[rsiValues.length - 1] - rsiValues[rsiValues.length - 2];
    const sma5 = calculateSMA(closes, 5);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const priceMomentum = this.calculateMomentum(closes, 5);
    const volumeRatio = this.calculateVolumeRatio(volumes, 5);
    const volatility = this.calculateVolatility(closes, 20);
    const macdSignal = this.calculateMACD(closes);
    const bollingerPosition = this.calculateBollingerPosition(closes, 20);
    const atrPercent = this.calculateATR(highs, lows, closes, 14) / closes[closes.length - 1] * 100;

    return {
      rsi: rsi[rsi.length - 1] || 50,
      rsiChange,
      sma5: sma5[sma5.length - 1] || 0,
      sma20: sma20[sma20.length - 1] || 0,
      sma50: sma50[sma50.length - 1] || 0,
      priceMomentum,
      volumeRatio,
      volatility,
      macdSignal,
      bollingerPosition,
      atrPercent,
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

  private calculateVolumeRatio(volumes: number[], period: number): number {
    if (volumes.length < period) return 1;
    const recent = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avg = volumes.slice(-period * 2, -period).reduce((a, b) => a + b, 0) / period;
    return avg === 0 ? 1 : recent / avg;
  }

  private calculateMACD(closes: number[]): number {
    if (closes.length < 26) return 0;
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
    const macdHistory = closes.map((_, i) => {
      if (i < 26) return 0;
      const e12 = this.calculateEMA(closes.slice(0, i + 1), 12);
      const e26 = this.calculateEMA(closes.slice(0, i + 1), 26);
      return e12[e12.length - 1] - e26[e26.length - 1];
    });
    const signalLine = this.calculateEMA(macdHistory, 9);
    return signalLine[signalLine.length - 1];
  }

  private calculateBollingerPosition(closes: number[], period: number): number {
    if (closes.length < period) return 0.5;
    const sma = calculateSMA(closes, period);
    const std = this.calculateVolatility(closes, period);
    const current = closes[closes.length - 1];
    const upper = sma[sma.length - 1] + 2 * std;
    const lower = sma[sma.length - 1] - 2 * std;
    if (upper === lower) return 0.5;
    return (current - lower) / (upper - lower);
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    const atr = calculateATR(highs, lows, closes, period);
    return atr[atr.length - 1];
  }

  private calculateEMA(values: number[], period: number): number[] {
    const ema: number[] = [];
    const k = 2 / (period + 1);
    ema[0] = values[0];
    for (let i = 1; i < values.length; i++) {
      ema[i] = values[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
  }
}

export const featureCalculationService = new FeatureCalculationService();
