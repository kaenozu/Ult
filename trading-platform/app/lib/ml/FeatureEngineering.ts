/**
 * Feature Engineering for ML Models
 * 
 * This service extracts and calculates 60+ technical and market structure
 * features for machine learning models.
 */

import { OHLCV } from '@/app/types';
import { MLFeatures } from './types';
import {
  calculateRSI,
  calculateSMA,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateEMA,
} from '../utils';

export class FeatureEngineeringService {
  /**
   * Extract all features from OHLCV data
   */
  extractFeatures(data: OHLCV[], lookbackPeriod = 200): MLFeatures[] {
    if (data.length < lookbackPeriod) {
      throw new Error(`Insufficient data: need at least ${lookbackPeriod} data points`);
    }

    const features: MLFeatures[] = [];
    
    // Calculate all indicators upfront
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const opens = data.map(d => d.open);
    const volumes = data.map(d => d.volume);
    
    const rsi = calculateRSI(prices, 14);
    const sma5 = calculateSMA(prices, 5);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macd = calculateMACD(prices);
    const bollingerBands = calculateBollingerBands(prices, 20, 2);
    const atr = calculateATR(highs, lows, prices, 14);
    
    // Additional indicators
    const stochastic = this.calculateStochastic(highs, lows, prices, 14);
    const williamsR = this.calculateWilliamsR(highs, lows, prices, 14);
    const adx = this.calculateADX(highs, lows, prices, 14);
    const cci = this.calculateCCI(highs, lows, prices, 20);
    const roc = this.calculateROC(prices, 12);
    const obv = this.calculateOBV(prices, volumes);
    
    // Volume indicators
    const volumeSMA = calculateSMA(volumes, 20);
    
    // Extract features for each data point
    for (let i = lookbackPeriod; i < data.length; i++) {
      const currentPrice = prices[i];
      const currentVolume = volumes[i];
      
      features.push({
        // Basic OHLC
        close: currentPrice,
        open: opens[i],
        high: highs[i],
        low: lows[i],
        
        // RSI
        rsi: this.getValue(rsi, i, 50),
        rsiChange: this.getValue(rsi, i, 50) - this.getValue(rsi, i - 1, 50),
        
        // Moving averages
        sma5: this.getDeviation(currentPrice, sma5, i),
        sma20: this.getDeviation(currentPrice, sma20, i),
        sma50: this.getDeviation(currentPrice, sma50, i),
        sma200: this.getDeviation(currentPrice, sma200, i),
        ema12: this.getDeviation(currentPrice, ema12, i),
        ema26: this.getDeviation(currentPrice, ema26, i),
        
        // MACD
        macdSignal: this.getValue(macd.macd, i, 0) - this.getValue(macd.signal, i, 0),
        macdHistogram: this.getValue(macd.histogram, i, 0),
        
        // Bollinger Bands
        bollingerPosition: this.calculateBollingerPosition(
          currentPrice,
          bollingerBands.upper[i],
          bollingerBands.lower[i]
        ),
        
        // ATR
        atrPercent: (this.getValue(atr, i, 0) / currentPrice) * 100,
        
        // Momentum
        priceMomentum: this.calculateMomentum(prices, i, 10),
        momentum5: this.calculateMomentum(prices, i, 5),
        momentum10: this.calculateMomentum(prices, i, 10),
        momentum20: this.calculateMomentum(prices, i, 20),
        
        // Volume
        volumeRatio: currentVolume / (this.getValue(volumeSMA, i, 1) || 1),
        volumeSMA: this.getValue(volumeSMA, i, currentVolume),
        volumeStd: this.calculateStdDev(volumes.slice(Math.max(0, i - 20), i + 1)),
        volumeTrend: this.calculateTrend(volumes, i, 20),
        
        // Volatility
        volatility: this.calculateHistoricalVolatility(prices.slice(Math.max(0, i - 20), i + 1)),
        historicalVolatility: this.calculateHistoricalVolatility(prices.slice(Math.max(0, i - 20), i + 1)),
        parkinsonVolatility: this.calculateParkinsonVolatility(
          highs.slice(Math.max(0, i - 20), i + 1),
          lows.slice(Math.max(0, i - 20), i + 1)
        ),
        garmanKlassVolatility: this.calculateGarmanKlassVolatility(
          highs.slice(Math.max(0, i - 20), i + 1),
          lows.slice(Math.max(0, i - 20), i + 1),
          opens.slice(Math.max(0, i - 20), i + 1),
          prices.slice(Math.max(0, i - 20), i + 1)
        ),
        
        // Oscillators
        stochasticK: this.getValue(stochastic.k, i, 50),
        stochasticD: this.getValue(stochastic.d, i, 50),
        williamsR: this.getValue(williamsR, i, -50),
        adx: this.getValue(adx, i, 25),
        cci: this.getValue(cci, i, 0),
        roc: this.getValue(roc, i, 0),
        obv: this.getValue(obv, i, 0),
        
        // Trend
        adxTrend: this.getValue(adx, i, 25),
        aroonUp: this.calculateAroonUp(highs, i, 25),
        aroonDown: this.calculateAroonDown(lows, i, 25),
        
        // VWAP
        vwap: this.calculateVWAP(data.slice(Math.max(0, i - 20), i + 1)),
        
        // Price levels
        volumeProfile: this.calculateVolumeProfile(data.slice(Math.max(0, i - 50), i + 1), 10),
        priceLevel: this.normalizePriceLevel(currentPrice, highs.slice(Math.max(0, i - 50), i + 1), lows.slice(Math.max(0, i - 50), i + 1)),
        
        // Support/Resistance
        candlePattern: this.detectCandlePattern(data.slice(Math.max(0, i - 5), i + 1)),
        supportLevel: this.findSupportLevel(lows.slice(Math.max(0, i - 50), i + 1), currentPrice),
        resistanceLevel: this.findResistanceLevel(highs.slice(Math.max(0, i - 50), i + 1), currentPrice),
        
        // Correlation (placeholder - needs index data)
        marketCorrelation: 0,
        sectorCorrelation: 0,
        
        // Time features
        dayOfWeek: data[i].date ? new Date(data[i].date).getDay() : 0,
        weekOfMonth: data[i].date ? Math.floor(new Date(data[i].date).getDate() / 7) : 0,
        monthOfYear: data[i].date ? new Date(data[i].date).getMonth() : 0,
        timestamp: i / data.length,
      });
    }
    
    return features;
  }

  /**
   * Normalize features for model input
   */
  normalizeFeatures(features: MLFeatures[]): { normalized: number[][]; scalers: Record<string, { mean: number; std: number }> } {
    const scalers: Record<string, { mean: number; std: number }> = {};
    const keys = Object.keys(features[0]) as (keyof MLFeatures)[];
    
    // Calculate mean and std for each feature
    for (const key of keys) {
      if (key === 'volumeProfile') continue; // Skip array features
      
      const values = features.map(f => {
        const val = f[key];
        return typeof val === 'number' ? val : 0;
      });
      
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance) || 1;
      
      scalers[key] = { mean, std };
    }
    
    // Normalize each feature
    const normalized = features.map(feature => {
      return keys
        .filter(k => k !== 'volumeProfile')
        .map(key => {
          const val = feature[key];
          const numVal = typeof val === 'number' ? val : 0;
          const scaler = scalers[key];
          const normalized = (numVal - scaler.mean) / scaler.std;
          // Handle NaN and Infinity
          if (!isFinite(normalized)) return 0;
          return normalized;
        });
    });
    
    return { normalized, scalers };
  }

  // Helper methods

  private getValue(array: number[], index: number, fallback: number): number {
    return array[index] !== undefined ? array[index] : fallback;
  }

  private getDeviation(price: number, smaArray: number[], index: number): number {
    const smaValue = this.getValue(smaArray, index, price);
    return ((price - smaValue) / smaValue) * 100;
  }

  private calculateBollingerPosition(price: number, upper: number, lower: number): number {
    if (upper === lower || upper === undefined || lower === undefined) return 50;
    const position = ((price - lower) / (upper - lower)) * 100;
    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, position));
  }

  private calculateMomentum(prices: number[], index: number, period: number): number {
    const prevIndex = index - period;
    if (prevIndex < 0) return 0;
    return ((prices[index] - prices[prevIndex]) / prices[prevIndex]) * 100;
  }

  private calculateHistoricalVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252) * 100; // Annualized
  }

  private calculateParkinsonVolatility(highs: number[], lows: number[]): number {
    if (highs.length < 2) return 0;
    const sum = highs.reduce((s, h, i) => {
      if (lows[i] === 0) return s;
      return s + Math.pow(Math.log(h / lows[i]), 2);
    }, 0);
    return Math.sqrt(sum / (4 * Math.log(2) * highs.length) * 252) * 100;
  }

  private calculateGarmanKlassVolatility(highs: number[], lows: number[], opens: number[], closes: number[]): number {
    if (highs.length < 2) return 0;
    const n = highs.length;
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
      if (lows[i] === 0 || opens[i] === 0) continue;
      const hl = Math.log(highs[i] / lows[i]);
      const co = Math.log(closes[i] / opens[i]);
      sum += 0.5 * Math.pow(hl, 2) - (2 * Math.log(2) - 1) * Math.pow(co, 2);
    }
    
    return Math.sqrt((sum / n) * 252) * 100;
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number[]; d: number[] } {
    const k: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        k.push(50);
        continue;
      }
      
      const periodHighs = highs.slice(i - period + 1, i + 1);
      const periodLows = lows.slice(i - period + 1, i + 1);
      const highestHigh = Math.max(...periodHighs);
      const lowestLow = Math.min(...periodLows);
      
      if (highestHigh === lowestLow) {
        k.push(50);
      } else {
        k.push(((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
      }
    }
    
    const d = calculateSMA(k, 3);
    
    return { k, d };
  }

  private calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const wr: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        wr.push(-50);
        continue;
      }
      
      const periodHighs = highs.slice(i - period + 1, i + 1);
      const periodLows = lows.slice(i - period + 1, i + 1);
      const highestHigh = Math.max(...periodHighs);
      const lowestLow = Math.min(...periodLows);
      
      if (highestHigh === lowestLow) {
        wr.push(-50);
      } else {
        wr.push(((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100);
      }
    }
    
    return wr;
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const adx: number[] = [];
    const trueRanges: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    
    // Calculate True Range and Directional Movements
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
      
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    
    // Calculate smoothed values and ADX
    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        adx.push(25);
      } else {
        const avgTR = trueRanges.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgPlusDM = plusDM.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgMinusDM = minusDM.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        
        const plusDI = avgTR === 0 ? 0 : (avgPlusDM / avgTR) * 100;
        const minusDI = avgTR === 0 ? 0 : (avgMinusDM / avgTR) * 100;
        const dx = plusDI + minusDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
        
        adx.push(dx);
      }
    }
    
    return adx;
  }

  private calculateCCI(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const cci: number[] = [];
    const typicalPrices = highs.map((h, i) => (h + lows[i] + closes[i]) / 3);
    const sma = calculateSMA(typicalPrices, period);
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        cci.push(0);
      } else {
        const tp = typicalPrices[i];
        const smaValue = sma[i];
        const meanDeviation = typicalPrices
          .slice(i - period + 1, i + 1)
          .reduce((sum, price) => sum + Math.abs(price - smaValue), 0) / period;
        
        cci.push(meanDeviation === 0 ? 0 : (tp - smaValue) / (0.015 * meanDeviation));
      }
    }
    
    return cci;
  }

  private calculateROC(prices: number[], period: number): number[] {
    return prices.map((price, i) => {
      if (i < period) return 0;
      const prevPrice = prices[i - period];
      return prevPrice === 0 ? 0 : ((price - prevPrice) / prevPrice) * 100;
    });
  }

  private calculateOBV(prices: number[], volumes: number[]): number[] {
    const obv: number[] = [volumes[0] || 0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        obv.push(obv[i - 1] + volumes[i]);
      } else if (prices[i] < prices[i - 1]) {
        obv.push(obv[i - 1] - volumes[i]);
      } else {
        obv.push(obv[i - 1]);
      }
    }
    
    return obv;
  }

  private calculateVWAP(data: OHLCV[]): number {
    let sumPV = 0;
    let sumV = 0;
    
    for (const d of data) {
      const typical = (d.high + d.low + d.close) / 3;
      sumPV += typical * d.volume;
      sumV += d.volume;
    }
    
    return sumV === 0 ? data[data.length - 1].close : sumPV / sumV;
  }

  private calculateVolumeProfile(data: OHLCV[], bins: number): number[] {
    const prices = data.map(d => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const binSize = (maxPrice - minPrice) / bins;
    
    const profile = new Array(bins).fill(0);
    
    for (const d of data) {
      const binIndex = Math.min(Math.floor((d.close - minPrice) / binSize), bins - 1);
      profile[binIndex] += d.volume;
    }
    
    return profile;
  }

  private normalizePriceLevel(price: number, highs: number[], lows: number[]): number {
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    if (maxHigh === minLow) return 0.5;
    return (price - minLow) / (maxHigh - minLow);
  }

  private detectCandlePattern(data: OHLCV[]): number {
    // Simplified candle pattern detection
    // Returns a score from -1 (bearish) to 1 (bullish)
    if (data.length < 3) return 0;
    
    const last = data[data.length - 1];
    const bodySize = Math.abs(last.close - last.open);
    const rangeSize = last.high - last.low;
    
    if (rangeSize === 0) return 0;
    
    const bodyRatio = bodySize / rangeSize;
    const isBullish = last.close > last.open;
    
    return isBullish ? bodyRatio : -bodyRatio;
  }

  private findSupportLevel(lows: number[], currentPrice: number): number {
    const belowCurrent = lows.filter(l => l < currentPrice);
    if (belowCurrent.length === 0) return 0;
    
    // Find the highest low below current price
    const support = Math.max(...belowCurrent);
    return ((currentPrice - support) / currentPrice) * 100;
  }

  private findResistanceLevel(highs: number[], currentPrice: number): number {
    const aboveCurrent = highs.filter(h => h > currentPrice);
    if (aboveCurrent.length === 0) return 0;
    
    // Find the lowest high above current price
    const resistance = Math.min(...aboveCurrent);
    return ((resistance - currentPrice) / currentPrice) * 100;
  }

  private calculateAroonUp(highs: number[], index: number, period: number): number {
    if (index < period) return 50;
    
    const periodHighs = highs.slice(index - period + 1, index + 1);
    const highestIndex = periodHighs.indexOf(Math.max(...periodHighs));
    return ((period - (period - highestIndex - 1)) / period) * 100;
  }

  private calculateAroonDown(lows: number[], index: number, period: number): number {
    if (index < period) return 50;
    
    const periodLows = lows.slice(index - period + 1, index + 1);
    const lowestIndex = periodLows.indexOf(Math.min(...periodLows));
    return ((period - (period - lowestIndex - 1)) / period) * 100;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(values: number[], index: number, period: number): number {
    if (index < period) return 0;
    const recent = values.slice(index - period + 1, index + 1);
    const sma = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    return values[index] / sma - 1;
  }
}

export const featureEngineeringService = new FeatureEngineeringService();
