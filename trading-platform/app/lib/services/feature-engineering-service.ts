/**
 * FeatureEngineeringService.ts
 *
 * Unified Feature Engineering Service
 * Consolidates logic from ML, AI Analytics, and Prediction domains.
 */

import { OHLCV } from '@/app/types';
import { MLFeatures } from '../ml/types';
import { PredictionFeatures } from '@/app/domains/prediction/types';
export type { PredictionFeatures }; // Re-export for compatibility
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateADX,
} from '../utils/technical-analysis';
import { RSI_CONFIG, SMA_CONFIG, MACD_CONFIG, BOLLINGER_BANDS } from '@/app/constants';
import { candlestickPatternService } from './candlestick-pattern-service';

// --- Interfaces from ML Domain ---

export interface TechnicalFeatures {
  // Basic Indicators
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma10: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;

  // MACD
  macd: number;
  macdSignal: number;
  macdHistogram: number;

  // Bollinger Bands
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPosition: number;
  bbWidth: number;

  // ATR
  atr: number;
  atrPercent: number;
  atrRatio: number;
  adx: number;

  // Momentum
  momentum10: number;
  momentum20: number;
  rateOfChange12: number;
  rateOfChange25: number;

  // Oscillators
  stochasticK: number;
  stochasticD: number;
  williamsR: number;
  cci: number;
  aroonUp: number;
  aroonDown: number;

  // Volume
  volumeRatio: number;
  volumeMA5: number;
  volumeMA20: number;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'NEUTRAL';

  // Price
  pricePosition: number;
  priceVelocity: number;
  priceAcceleration: number;
}

export interface MacroEconomicFeatures {
  interestRate: number;
  interestRateTrend: 'RISING' | 'FALLING' | 'STABLE';
  gdpGrowth: number;
  gdpTrend: 'EXPANDING' | 'CONTRACTING' | 'STABLE';
  cpi: number;
  cpiTrend: 'RISING' | 'FALLING' | 'STABLE';
  inflationRate: number;
  usdjpy?: number;
  usdjpyTrend?: 'APPRECIATING' | 'DEPRECIATING' | 'STABLE';
  macroScore: number;
}

export interface SentimentFeatures {
  newsSentiment: number;
  newsVolume: number;
  newsTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  socialSentiment: number;
  socialVolume: number;
  socialBuzz: number;
  analystRating: number;
  ratingChange: number;
  sentimentScore: number;
}

export interface TimeSeriesFeatures {
  lag1: number;
  lag5: number;
  lag10: number;
  lag20: number;
  ma5: number;
  ma10: number;
  ma20: number;
  ma50: number;
  dayOfWeek: number;
  dayOfWeekReturn: number;
  monthOfYear: number;
  monthEffect: number;
  trendStrength: number;
  trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  cyclicality: number;

  // From AI Analytics extension
  rollingMean5?: number;
  rollingMean20?: number;
  rollingStd5?: number;
  rollingStd20?: number;
  exponentialMA?: number;
  momentumChange?: number;
  priceAcceleration?: number;
  volumeAcceleration?: number;
  autocorrelation?: number;
  fourierDominantFreq?: number;
  fourierAmplitude?: number;
}

export interface AllFeatures {
  technical: TechnicalFeatures;
  macro: MacroEconomicFeatures | null;
  sentiment: SentimentFeatures | null;
  timeSeries: TimeSeriesFeatures;
  featureCount: number;
  lastUpdate: string;
  dataQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

// --- Interfaces from AI Analytics Domain ---

export interface MacroIndicators {
  vix?: number;
  interestRate?: number;
  dollarIndex?: number;
  bondYield?: number;
  sectorPerformance?: { [sector: string]: number };
}

export interface NewsSentimentData {
  positive: number;
  negative: number;
  neutral: number;
  overall: number;
  confidence: number;
}

export interface ExtendedTechnicalFeatures {
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  bollingerPosition: number;
  atrPercent: number;
  momentum: number;
  rateOfChange: number;
  stochasticRSI: number;
  williamsR: number;
  cci: number;
  atrRatio: number;
  volumeProfile: number;
  pricePosition: number;
  momentumTrend: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN';
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH';
  macroIndicators?: MacroIndicators;
  sentiment?: NewsSentimentData;
  timeSeriesFeatures?: Partial<TimeSeriesFeatures>;
}

export interface FeatureImportance {
  name: string;
  score: number;
  rank: number;
  category: 'trend' | 'momentum' | 'volatility' | 'volume';
}

export class FeatureEngineeringService {
  // --- Core Methods ---

  /**
   * Calculate all features (Unified method for ML domain compatibility)
   */
  public calculateAllFeatures(
    data: OHLCV[],
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): AllFeatures {
    if (data.length < 200) {
      throw new Error('Insufficient data for feature calculation (minimum 200 data points required)');
    }

    const technical = this.calculateTechnicalFeatures(data);
    const timeSeries = this.calculateTimeSeriesFeatures(data);

    const macro = macroData || this.getDefaultMacroFeatures();
    const sentiment = sentimentData || this.getDefaultSentimentFeatures();
    const dataQuality = this.assessDataQuality(data);
    const featureCount = this.countFeatures(technical, macro, sentiment, timeSeries);

    return {
      technical,
      macro,
      sentiment,
      timeSeries,
      featureCount,
      lastUpdate: new Date().toISOString(),
      dataQuality,
    };
  }

  /**
   * Calculate extended features (AI Analytics domain compatibility)
   */
  public calculateExtendedFeatures(
    data: OHLCV[],
    currentPrice: number,
    averageVolume: number,
    macroIndicators?: MacroIndicators,
    newsTexts?: string[]
  ): ExtendedTechnicalFeatures {
    if (data.length < 50) {
      throw new Error('Insufficient data for feature calculation (minimum 50 data points required)');
    }

    const technical = this.calculateTechnicalFeatures(data);
    const timeSeries = this.generateTimeSeriesFeatures(data); // Use advanced generation

    // Derived values mapping
    const volatility = this.calculateVolatility(data.map(d => d.close), 20);
    const momentum = this.calculateMomentum(data.map(d => d.close), 10);
    const rateOfChange = this.calculateROC(data.map(d => d.close), 12);

    const prices = data.map(d => d.close);
    const rsiArray = calculateRSI(prices, RSI_CONFIG.DEFAULT_PERIOD);
    const stochasticRSI = this.calculateStochasticRSI(rsiArray, 14);

    // Map to ExtendedTechnicalFeatures structure
    const features: ExtendedTechnicalFeatures = {
      rsi: technical.rsi,
      rsiChange: technical.rsiChange,
      sma5: technical.sma5,
      sma20: technical.sma20,
      sma50: technical.sma50,
      priceMomentum: technical.momentum10,
      volumeRatio: technical.volumeRatio,
      volatility: volatility,
      macdSignal: technical.macdSignal,
      bollingerPosition: technical.bbPosition,
      atrPercent: technical.atrPercent,
      momentum: momentum,
      rateOfChange: rateOfChange,
      stochasticRSI: stochasticRSI,
      williamsR: technical.williamsR,
      cci: technical.cci,
      atrRatio: technical.atrRatio,
      volumeProfile: 1, // Still a placeholder, but improving others
      pricePosition: technical.pricePosition,
      momentumTrend: this.classifyMomentumTrend(momentum, rateOfChange),
      volatilityRegime: this.classifyVolatilityRegime(volatility),
      macroIndicators: macroIndicators, // Pass through
      sentiment: newsTexts && newsTexts.length > 0 ? this.quantifyTextData(newsTexts) : undefined,
      timeSeriesFeatures: timeSeries,
    };

    return features;
  }

  /**
   * Calculate basic features (Prediction domain compatibility)
   */
  public calculateBasicFeatures(data: OHLCV[]): PredictionFeatures {
     const technical = this.calculateTechnicalFeatures(data);
     const closes = data.map(d => d.close);
     const volatility = this.calculateVolatility(closes, 20);

     // Calculate raw SMAs for Prediction domain compatibility
     const sma5 = this.lastValue(calculateSMA(closes, 5));
     const sma20 = this.lastValue(calculateSMA(closes, 20));
     const sma50 = this.lastValue(calculateSMA(closes, 50));

     return {
       rsi: technical.rsi,
       rsiChange: technical.rsiChange,
       sma5: sma5,
       sma20: sma20,
       sma50: sma50,
       priceMomentum: technical.momentum10,
       volumeRatio: technical.volumeRatio,
       volatility: volatility,
       macdSignal: technical.macdSignal,
       bollingerPosition: technical.bbPosition,
       atrPercent: technical.atrPercent,
     };
  }

  // NOTE: I need to fix `calculateTechnicalFeatures` to optionally return raw values or split it.
  // The ML implementation returned DEVIATIONS for SMAs.
  // I will refactor `calculateTechnicalFeatures` to return both or Raw values, and let consumers compute deviations.

  /**
   * Refactored calculateTechnicalFeatures to support all domains
   */
  public calculateTechnicalFeatures(data: OHLCV[]): TechnicalFeatures {
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // Basic Indicators
    const rsi = calculateRSI(prices, RSI_CONFIG.DEFAULT_PERIOD);
    const sma5 = calculateSMA(prices, 5);
    const sma10 = calculateSMA(prices, 10);
    const sma20 = calculateSMA(prices, SMA_CONFIG.SHORT_PERIOD);
    const sma50 = calculateSMA(prices, SMA_CONFIG.MEDIUM_PERIOD);
    const sma200 = calculateSMA(prices, SMA_CONFIG.LONG_PERIOD);
    const ema12 = calculateEMA(prices, MACD_CONFIG.FAST_PERIOD);
    const ema26 = calculateEMA(prices, MACD_CONFIG.SLOW_PERIOD);

    // MACD
    const macd = calculateMACD(prices, MACD_CONFIG.FAST_PERIOD, MACD_CONFIG.SLOW_PERIOD, MACD_CONFIG.SIGNAL_PERIOD);

    // Bollinger Bands
    const bb = calculateBollingerBands(prices, BOLLINGER_BANDS.PERIOD, BOLLINGER_BANDS.STD_DEVIATION);

    // ADX
    const adxArray = calculateADX(data, 14);
    const adxValue = last(adxArray, 20);

    // Current Values
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    // Helpers
    const last = (arr: number[], fallback: number) => arr.length > 0 ? arr[arr.length - 1] : fallback;
    const prev = (arr: number[], idx: number, fallback: number) => idx >= 0 && idx < arr.length ? arr[idx] : fallback;

    // Derived Values
    const rsiValue = last(rsi, 50);
    const rsiChange = rsiValue - prev(rsi, rsi.length - 2, 50);

    // SMA Deviations (for ML)
    // Note: The ML interface expects deviations. I will keep it this way for TechnicalFeatures interface compliance.
    // For BasicFeatures, I will need to access the raw SMA values. I'll re-calculate or handle it there.
    const sma5Dev = (currentPrice - last(sma5, currentPrice)) / currentPrice * 100;
    const sma10Dev = (currentPrice - last(sma10, currentPrice)) / currentPrice * 100;
    const sma20Dev = (currentPrice - last(sma20, currentPrice)) / currentPrice * 100;
    const sma50Dev = (currentPrice - last(sma50, currentPrice)) / currentPrice * 100;
    const sma200Dev = (currentPrice - last(sma200, currentPrice)) / currentPrice * 100;
    const ema12Dev = (currentPrice - last(ema12, currentPrice)) / currentPrice * 100;
    const ema26Dev = (currentPrice - last(ema26, currentPrice)) / currentPrice * 100;

    // MACD
    const macdValue = last(macd.macd, 0);
    const macdSignalValue = last(macd.signal, 0);
    const macdHistogramValue = last(macd.histogram, 0);

    // Bollinger
    const bbUpper = last(bb.upper, currentPrice);
    const bbMiddle = last(bb.middle, currentPrice);
    const bbLower = last(bb.lower, currentPrice);
    const bbPosition = ((currentPrice - bbLower) / (bbUpper - bbLower || 1)) * 100;
    const bbWidth = ((bbUpper - bbLower) / bbMiddle) * 100;

    // ATR
    const atr = calculateATR(highs, lows, prices, RSI_CONFIG.DEFAULT_PERIOD);
    const atrValue = last(atr, currentPrice * 0.02);
    const atrPercent = (atrValue / currentPrice) * 100;
    const atrArray = atr.filter(v => !isNaN(v));
    const atrAvg = atrArray.length > 0 ? atrArray.reduce((sum, v) => sum + v, 0) / atrArray.length : atrValue;
    const atrRatio = atrValue / (atrAvg || 1);

    // Momentum & ROC
    const momentum10 = this.calculateMomentum(prices, 10);
    const momentum20 = this.calculateMomentum(prices, 20);
    const roc12 = this.calculateROC(prices, 12);
    const roc25 = this.calculateROC(prices, 25);

    // Stochastic
    const stoch = this.calculateStochastic(highs, lows, prices, 14);

    // Williams %R
    const williamsR = this.calculateWilliamsR(highs, lows, prices, 14);

    // CCI
    const cci = this.calculateCCI(highs, lows, prices, 20);

    // Aroon
    const aroon = this.calculateAroon(highs, lows, 14);

    // Volume
    const volumeMA5 = this.calculateSMA_Internal(volumes, 5);
    const volumeMA20 = this.calculateSMA_Internal(volumes, 20);
    const volumeRatio = currentVolume / (last(volumeMA20, currentVolume) || 1);
    const volumeTrend = this.classifyVolumeTrend(volumes.slice(-5));

    // Price Position/Velocity
    const pricePosition = this.calculatePricePosition(prices.slice(-50));
    const priceVelocity = this.calculateVelocity(prices, 5);
    const priceAcceleration = this.calculateAcceleration(prices, 5);

    return {
      rsi: rsiValue,
      rsiChange,
      sma5: isNaN(sma5Dev) ? 0 : sma5Dev,
      sma10: isNaN(sma10Dev) ? 0 : sma10Dev,
      sma20: isNaN(sma20Dev) ? 0 : sma20Dev,
      sma50: isNaN(sma50Dev) ? 0 : sma50Dev,
      sma200: isNaN(sma200Dev) ? 0 : sma200Dev,
      ema12: isNaN(ema12Dev) ? 0 : ema12Dev,
      ema26: isNaN(ema26Dev) ? 0 : ema26Dev,
      macd: macdValue,
      macdSignal: macdSignalValue,
      macdHistogram: macdHistogramValue,
      bbUpper,
      bbMiddle,
      bbLower,
      bbPosition: isNaN(bbPosition) ? 50 : bbPosition,
      bbWidth: isNaN(bbWidth) ? 0 : bbWidth,
      atr: atrValue,
      atrPercent: isNaN(atrPercent) ? 0 : atrPercent,
      atrRatio: isNaN(atrRatio) ? 1 : atrRatio,
      adx: adxValue,
      momentum10,
      momentum20,
      rateOfChange12: roc12,
      rateOfChange25: roc25,
      stochasticK: stoch.k,
      stochasticD: stoch.d,
      williamsR,
      cci,
      aroonUp: aroon.up,
      aroonDown: aroon.down,
      volumeRatio: isNaN(volumeRatio) ? 1 : volumeRatio,
      volumeMA5: last(volumeMA5, currentVolume),
      volumeMA20: last(volumeMA20, currentVolume),
      volumeTrend,
      pricePosition,
      priceVelocity,
      priceAcceleration,
    };
  }

  private calculateAroon(highs: number[], lows: number[], period: number): { up: number; down: number } {
    if (highs.length < period + 1) return { up: 50, down: 50 };
    const recentHighs = highs.slice(-(period + 1));
    const recentLows = lows.slice(-(period + 1));
    
    let daysSinceMax = 0;
    let maxVal = -Infinity;
    for (let i = 0; i <= period; i++) {
      if (recentHighs[i] >= maxVal) {
        maxVal = recentHighs[i];
        daysSinceMax = period - i;
      }
    }
    
    let daysSinceMin = 0;
    let minVal = Infinity;
    for (let i = 0; i <= period; i++) {
      if (recentLows[i] <= minVal) {
        minVal = recentLows[i];
        daysSinceMin = period - i;
      }
    }
    
    return {
      up: ((period - daysSinceMax) / period) * 100,
      down: ((period - daysSinceMin) / period) * 100
    };
  }

  private calculateStochasticRSI(rsiValues: number[], period: number): number {
    if (rsiValues.length < period) return 50;
    const slice = rsiValues.slice(-period).filter(v => !isNaN(v));
    if (slice.length < 2) return 50;
    
    const minRSI = Math.min(...slice);
    const maxRSI = Math.max(...slice);
    const currentRSI = rsiValues[rsiValues.length - 1];
    
    if (maxRSI === minRSI) return 50;
    return ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
  }

  // --- Helpers ---

  public calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    return ((current - past) / past) * 100;
  }

  public calculateROC(prices: number[], period: number): number {
    return this.calculateMomentum(prices, period); // ROC is essentially Momentum in %
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number; d: number } {
    const start = Math.max(0, highs.length - period);
    const recentHighs = highs.slice(start);
    const recentLows = lows.slice(start);
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = closes[closes.length - 1];
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow || 1)) * 100;
    return { k, d: k }; // Simplified
  }

  private calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number {
    const start = Math.max(0, highs.length - period);
    const recentHighs = highs.slice(start);
    const recentLows = lows.slice(start);
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = closes[closes.length - 1];
    return ((highestHigh - currentClose) / (highestHigh - lowestLow || 1)) * -100;
  }

  private calculateCCI(highs: number[], lows: number[], closes: number[], period: number): number {
    const start = Math.max(0, highs.length - period);
    const typicalPrices: number[] = [];
    for (let i = start; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    if (typicalPrices.length === 0) return 0;
    const sma = typicalPrices.reduce((sum, tp) => sum + tp, 0) / typicalPrices.length;
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / typicalPrices.length;
    const currentTP = typicalPrices[typicalPrices.length - 1];
    return (currentTP - sma) / (0.015 * meanDeviation || 1);
  }

  private calculateSMA_Internal(values: number[], period: number): number[] {
    // Re-implementation of simple SMA for internal use (e.g. Volume) or use shared util
    // Since shared util returns NaN padded array, it works fine.
    return calculateSMA(values, period);
  }

  private classifyVolumeTrend(volumes: number[]): 'INCREASING' | 'DECREASING' | 'NEUTRAL' {
    if (volumes.length < 2) return 'NEUTRAL';
    const mid = Math.floor(volumes.length / 2);
    const firstHalf = volumes.slice(0, mid);
    const secondHalf = volumes.slice(mid);
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    const ratio = (secondAvg - firstAvg) / (firstAvg || 1);
    if (ratio > 0.1) return 'INCREASING';
    if (ratio < -0.1) return 'DECREASING';
    return 'NEUTRAL';
  }

  private calculatePricePosition(prices: number[]): number {
    if (prices.length === 0) return 50;
    const currentPrice = prices[prices.length - 1];
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);
    if (highestPrice === lowestPrice) return 50;
    return ((currentPrice - lowestPrice) / (highestPrice - lowestPrice)) * 100;
  }

  private calculateVelocity(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const recent = prices.slice(-period);
    let velocity = 0;
    for (let i = 1; i < recent.length; i++) {
      velocity += (recent[i] - recent[i - 1]) / (recent[i - 1] || 1);
    }
    return velocity * 100;
  }

  private calculateAcceleration(prices: number[], period: number): number {
    if (prices.length < period + 2) return 0;
    const recent = prices.slice(-period);
    const velocities: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      velocities.push((recent[i] - recent[i - 1]) / (recent[i - 1] || 1));
    }
    if (velocities.length < 2) return 0;
    return (velocities[velocities.length - 1] - velocities[0]) * 100;
  }

  // --- Time Series Helpers ---

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

  public calculateTimeSeriesFeatures(data: OHLCV[]): TimeSeriesFeatures {
    const prices = data.map(d => d.close);
    // ... Implementation from ML domain ...
    const lag1 = this.calculateLag(prices, 1);
    const lag5 = this.calculateLag(prices, 5);
    const lag10 = this.calculateLag(prices, 10);
    const lag20 = this.calculateLag(prices, 20);
    const ma5 = this.lastValue(calculateSMA(prices, 5));
    const ma10 = this.lastValue(calculateSMA(prices, 10));
    const ma20 = this.lastValue(calculateSMA(prices, 20));
    const ma50 = this.lastValue(calculateSMA(prices, 50));
    const lastDate = new Date(data[data.length - 1].date);
    const dayOfWeek = lastDate.getDay();
    const dayOfWeekReturn = this.calculateDayOfWeekReturn(data, dayOfWeek);
    const monthOfYear = lastDate.getMonth();
    const monthEffect = this.calculateMonthEffect(data, monthOfYear);
    const trendStrength = this.calculateTrendStrength(prices.slice(-50));
    const trendDirection = this.classifyTrendDirection(prices.slice(-50));
    const cyclicality = this.calculateCyclicality(prices.slice(-50));

    // Advanced features (merged from AI Analytics)
    const advanced = this.generateTimeSeriesFeatures(data);

    return {
      lag1, lag5, lag10, lag20,
      ma5, ma10, ma20, ma50,
      dayOfWeek, dayOfWeekReturn,
      monthOfYear, monthEffect,
      trendStrength, trendDirection,
      cyclicality,
      ...advanced // Merge advanced features
    };
  }

  private calculateLag(prices: number[], lag: number): number {
    if (prices.length < lag + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - lag];
    return ((current - past) / past) * 100;
  }

  private calculateDayOfWeekReturn(data: OHLCV[], dayOfWeek: number): number {
    const sameDayData = data.filter(d => new Date(d.date).getDay() === dayOfWeek);
    if (sameDayData.length < 2) return 0;
    let totalReturn = 0;
    for (let i = 1; i < sameDayData.length; i++) {
      totalReturn += (sameDayData[i].close - sameDayData[i - 1].close) / sameDayData[i - 1].close;
    }
    return (totalReturn / sameDayData.length) * 100;
  }

  private calculateMonthEffect(data: OHLCV[], month: number): number {
    const sameMonthData = data.filter(d => new Date(d.date).getMonth() === month);
    if (sameMonthData.length < 2) return 0;
    const firstPrice = sameMonthData[0].close;
    const lastPrice = sameMonthData[sameMonthData.length - 1].close;
    return ((lastPrice - firstPrice) / firstPrice) * 100;
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
    let ssTotal = 0;
    let ssResidual = 0;

    for (let i = 0; i < n; i++) {
      const yPredicted = slope * xValues[i] + intercept;
      ssTotal += Math.pow(yValues[i] - yMean, 2);
      ssResidual += Math.pow(yValues[i] - yPredicted, 2);
    }

    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    return Math.max(0, Math.min(1, rSquared));
  }

  private classifyTrendDirection(prices: number[]): 'UP' | 'DOWN' | 'NEUTRAL' {
    if (prices.length < 10) return 'NEUTRAL';
    const mid = Math.floor(prices.length / 2);
    const firstAvg = prices.slice(0, mid).reduce((a,b)=>a+b,0)/mid;
    const secondAvg = prices.slice(mid).reduce((a,b)=>a+b,0)/(prices.length-mid);
    const change = (secondAvg - firstAvg) / firstAvg;
    if (change > 0.02) return 'UP';
    if (change < -0.02) return 'DOWN';
    return 'NEUTRAL';
  }

  private calculateCyclicality(prices: number[]): number {
    if (prices.length < 20) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const autocorrelations: number[] = [];
    for (let lag = 1; lag <= Math.min(5, Math.floor(returns.length / 2)); lag++) {
      const corr = this.calculateAutocorrelation(returns, lag);
      autocorrelations.push(Math.abs(corr));
    }

    return autocorrelations.reduce((sum, corr) => sum + corr, 0) / autocorrelations.length;
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length < lag + 10) return 0;
    const n = values.length - lag;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    return denominator !== 0 ? numerator / denominator : 0;
  }

  // --- Advanced Time Series (AI Analytics) ---

  public generateTimeSeriesFeatures(data: OHLCV[]): Partial<TimeSeriesFeatures> {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    // Rolling stats
    const rollingMean5 = this.calculateRollingMean(prices, 5);
    const rollingMean20 = this.calculateRollingMean(prices, 20);
    const rollingStd5 = this.calculateRollingStd(prices, 5);
    const rollingStd20 = this.calculateRollingStd(prices, 20);

    // Exponential MA
    const exponentialMA = this.calculateEMA(prices, 12);

    // Momentum Change
    const momentum10 = this.calculateMomentum(prices, 10);
    const momentum5 = this.calculateMomentum(prices, 5);
    const momentumChange = momentum10 - momentum5;

    // Acceleration
    const priceAcceleration = this.calculateAcceleration(prices, 3); // approximate
    const volumeAcceleration = this.calculateAcceleration(volumes, 3);

    // Autocorrelation
    const autocorrelation = this.calculateAutocorrelation(prices, 1);

    // Fourier
    const fourier = this.applyFourierTransform(prices.slice(-50));

    return {
      rollingMean5,
      rollingMean20,
      rollingStd5,
      rollingStd20,
      exponentialMA,
      momentumChange,
      priceAcceleration,
      volumeAcceleration,
      autocorrelation,
      fourierDominantFreq: fourier.dominantFreq,
      fourierAmplitude: fourier.amplitude,
    };
  }

  private applyFourierTransform(values: number[]): { dominantFreq: number; amplitude: number } {
    if (values.length < 8) return { dominantFreq: 0, amplitude: 0 };
    const N = Math.min(values.length, 50);
    const frequencies: { freq: number; amplitude: number }[] = [];
    for (let k = 1; k < N / 2; k++) {
      let real = 0;
      let imag = 0;
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

  // --- Feature Importance (AI Analytics) ---

  public analyzeFeatureImportance(features: ExtendedTechnicalFeatures): FeatureImportance[] {
    const scoreFeature = (val: number, min: number, max: number) => Math.min(Math.max((val - min) / (max - min), 0), 1);

    const importance: FeatureImportance[] = [
      // Trend
      { name: 'sma20', score: scoreFeature(Math.abs(features.sma20), 0, 10), rank: 0, category: 'trend' },
      { name: 'sma50', score: scoreFeature(Math.abs(features.sma50), 0, 15), rank: 0, category: 'trend' },
      { name: 'pricePosition', score: scoreFeature(Math.abs(features.pricePosition - 50), 0, 50), rank: 0, category: 'trend' },

      // Momentum
      { name: 'rsi', score: scoreFeature(Math.abs(features.rsi - 50), 0, 50), rank: 0, category: 'momentum' },
      { name: 'momentum', score: scoreFeature(Math.abs(features.momentum), 0, 10), rank: 0, category: 'momentum' },
      { name: 'rateOfChange', score: scoreFeature(Math.abs(features.rateOfChange), 0, 10), rank: 0, category: 'momentum' },
      { name: 'macdSignal', score: scoreFeature(Math.abs(features.macdSignal), 0, 5), rank: 0, category: 'momentum' },

      // Volatility
      { name: 'volatility', score: scoreFeature(features.volatility, 0, 50), rank: 0, category: 'volatility' },
      { name: 'atrPercent', score: scoreFeature(features.atrPercent, 0, 5), rank: 0, category: 'volatility' },
      { name: 'atrRatio', score: scoreFeature(Math.abs(features.atrRatio - 1), 0, 1), rank: 0, category: 'volatility' },

      // Volume
      { name: 'volumeRatio', score: scoreFeature(Math.abs(features.volumeRatio - 1), 0, 2), rank: 0, category: 'volume' },
      { name: 'volumeProfile', score: scoreFeature(Math.abs(features.volumeProfile - 1), 0, 2), rank: 0, category: 'volume' },
    ];
    importance.sort((a, b) => b.score - a.score);
    importance.forEach((item, index) => item.rank = index + 1);
    return importance;
  }

  // --- Other Helpers ---

  private getDefaultMacroFeatures(): MacroEconomicFeatures {
    return {
      interestRate: 0, interestRateTrend: 'STABLE',
      gdpGrowth: 0, gdpTrend: 'STABLE',
      cpi: 0, cpiTrend: 'STABLE',
      inflationRate: 0, macroScore: 0
    };
  }

  private getDefaultSentimentFeatures(): SentimentFeatures {
    return {
      newsSentiment: 0, newsVolume: 0, newsTrend: 'STABLE',
      socialSentiment: 0, socialVolume: 0, socialBuzz: 0,
      analystRating: 3, ratingChange: 0, sentimentScore: 0
    };
  }

  private assessDataQuality(data: OHLCV[]): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (data.length >= 252) return 'EXCELLENT';
    if (data.length >= 100) return 'GOOD';
    if (data.length >= 50) return 'FAIR';
    return 'POOR';
  }

  private countFeatures(t: any, m: any, s: any, ts: any): number {
    let count = Object.keys(t).length + Object.keys(ts).length;
    if (m) count += Object.keys(m).length;
    if (s) count += Object.keys(s).length;
    return count;
  }

  private lastValue(arr: number[]): number {
    const valid = arr.filter(v => !isNaN(v));
    return valid.length > 0 ? valid[valid.length - 1] : 0;
  }

  private quantifyTextData(newsTexts: string[]): NewsSentimentData {
    if (newsTexts.length === 0) {
      return { positive: 0.5, negative: 0.5, neutral: 1, overall: 0, confidence: 0 };
    }

    const positiveKeywords = ['上昇', '好調', '成長', '利益', '増加', 'bull', 'rally', 'gain', 'profit', 'growth'];
    const negativeKeywords = ['下落', '不調', '減少', '損失', '危機', 'bear', 'decline', 'loss', 'risk', 'crisis'];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const text of newsTexts) {
      const lowerText = text.toLowerCase();
      for (const keyword of positiveKeywords) {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        positiveScore += matches;
      }
      for (const keyword of negativeKeywords) {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        negativeScore += matches;
      }
    }

    const totalKeywords = positiveScore + negativeScore;
    const positive = totalKeywords > 0 ? positiveScore / totalKeywords : 0.5;
    const negative = totalKeywords > 0 ? negativeScore / totalKeywords : 0.5;
    const neutral = 1 - (positive + negative);
    const overall = positive - negative;
    const confidence = Math.min(totalKeywords / (newsTexts.length * 3), 1);

    return {
      positive,
      negative,
      neutral: Math.max(neutral, 0),
      overall,
      confidence,
    };
  }

  private integrateMacroIndicators(macro: MacroIndicators, micro: any): MacroIndicators {
    return { ...macro };
  }

  private classifyMomentumTrend(momentum: number, roc: number): 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN' {
    const avg = (momentum + roc) / 2;
    if (avg > 5) return 'STRONG_UP';
    if (avg > 2) return 'UP';
    if (avg < -5) return 'STRONG_DOWN';
    if (avg < -2) return 'DOWN';
    return 'NEUTRAL';
  }

  private classifyVolatilityRegime(vol: number): 'LOW' | 'NORMAL' | 'HIGH' {
    if (vol < 15) return 'LOW';
    if (vol > 30) return 'HIGH';
    return 'NORMAL';
  }

  private calculateVolatility(prices: number[], period: number): number {
    if (prices.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  private calculateATRRatio(atr: number[], currentPrice: number): number {
      // Placeholder logic
      return 1;
  }

  // Method to extract raw ML Features (for compatibility with extractFeatures from ML domain)
  // The ML domain had `extractFeatures(data, lookback)` which returned `MLFeatures[]`
  /**
   * Normalize features for ML models
   */
  public normalizeFeatures(features: MLFeatures[]): { normalized: MLFeatures[]; scalers: Record<string, { min: number; max: number }> } {
    if (features.length === 0) return { normalized: [], scalers: {} };

    const keys = Object.keys(features[0]) as Array<keyof MLFeatures>;
    const scalers: Record<string, { min: number; max: number }> = {};
    const normalized = features.map(f => ({ ...f })); // Shallow copy

    for (const key of keys) {
      // Skip non-numeric fields if any (though MLFeatures assumes numbers)
      const values = features.map(f => f[key] as number).filter(v => typeof v === 'number' && !isNaN(v));
      if (values.length === 0) continue;

      const min = Math.min(...values);
      const max = Math.max(...values);
      scalers[key] = { min, max };

      if (max === min) {
        normalized.forEach(f => (f as any)[key] = 0.5); // Avoid division by zero
      } else {
        normalized.forEach(f => (f as any)[key] = ((f as any)[key] - min) / (max - min));
      }
    }

    return { normalized, scalers };
  }

  public extractFeatures(data: OHLCV[], lookback: number): MLFeatures[] {
    // This replicates the `extractFeatures` logic from app/lib/ml/FeatureEngineering.ts
    // We can reuse calculateTechnicalFeatures but need to wrap it in a loop
    if (data.length <= lookback) return [];

    const features: MLFeatures[] = [];
    const startIndex = Math.max(lookback, 1);

    const calcStd = (values: number[]): number => {
      if (values.length === 0) return 0;
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      return Math.sqrt(variance);
    };

    for (let i = startIndex; i <= data.length; i++) {
      const window = data.slice(i - lookback, i);
      const current = window[window.length - 1];
      const technical = this.calculateTechnicalFeatures(window);
      const timeSeries = this.calculateTimeSeriesFeatures(window);
      const prices = window.map(d => d.close);
      const volumes = window.map(d => d.volume);

      const obv = window.reduce((sum, d, idx) => {
        if (idx === 0) return sum;
        const prev = window[idx - 1].close;
        if (d.close > prev) return sum + d.volume;
        if (d.close < prev) return sum - d.volume;
        return sum;
      }, 0);

      const vwap = (() => {
        const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
        if (totalVolume === 0) return current.close;
        const totalValue = window.reduce((sum, d) => sum + d.close * d.volume, 0);
        return totalValue / totalVolume;
      })();

      const momentum5 = this.calculateMomentum(prices, 5);
      const supportLevel = Math.min(...prices);
      const resistanceLevel = Math.max(...prices);
      const volumeStd = calcStd(volumes);

      const returns = prices.slice(1).map((price, idx) => (price - prices[idx]) / (prices[idx] || 1));
      const historicalVolatility = calcStd(returns) * Math.sqrt(252) * 100;

      const parkinsonVolatility = (() => {
        if (window.length === 0) return 0;
        const logRatios = window.map(d => Math.log((d.high || 1) / (d.low || 1)));
        const meanSquare = logRatios.reduce((sum, v) => sum + v * v, 0) / logRatios.length;
        return Math.sqrt(meanSquare) * Math.sqrt(252) * 100;
      })();

      const garmanKlassVolatility = (() => {
        if (window.length === 0) return 0;
        const values = window.map(d => {
          const logHL = Math.log((d.high || 1) / (d.low || 1));
          const logCO = Math.log((d.close || 1) / (d.open || 1));
          return 0.5 * logHL * logHL - (2 * Math.log(2) - 1) * logCO * logCO;
        });
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        return Math.sqrt(Math.max(mean, 0)) * Math.sqrt(252) * 100;
      })();

      const adxHistory = calculateADX(window, 14);
      const adx = adxHistory[adxHistory.length - 1] || 20;
      const prevADX = adxHistory[adxHistory.length - 2] || adx;
      const adxTrend = adx - prevADX;

      const aroon = this.calculateAroon(window.map(d => d.high), window.map(d => d.low), 14);
      const candlePatternFeatures = candlestickPatternService.calculatePatternFeatures(window);
      const candlePattern = candlestickPatternService.getPatternSignal(candlePatternFeatures);

      const currentDate = new Date(current.date);
      const weekOfMonth = Math.floor((currentDate.getDate() - 1) / 7) + 1;

      // Construct MLFeatures object
      features.push({
        close: current.close,
        open: current.open,
        high: current.high,
        low: current.low,
        rsi: technical.rsi,
        rsiChange: technical.rsiChange,
        sma5: technical.sma5, // Deviation
        sma20: technical.sma20,
        sma50: technical.sma50,
        sma200: technical.sma200,
        ema12: technical.ema12,
        ema26: technical.ema26,
        priceMomentum: technical.momentum10,
        volumeRatio: technical.volumeRatio,
        volatility: technical.atrPercent,
        macdSignal: technical.macdSignal,
        macdHistogram: technical.macdHistogram,
        bollingerPosition: technical.bbPosition,
        atrPercent: technical.atrPercent,
        stochasticK: technical.stochasticK,
        stochasticD: technical.stochasticD,
        williamsR: technical.williamsR,
        adx,
        cci: technical.cci,
        roc: technical.rateOfChange12,
        obv,
        vwap,
        volumeProfile: [current.volume],
        priceLevel: current.close,
        momentum5,
        momentum10: technical.momentum10,
        momentum20: technical.momentum20,
        historicalVolatility,
        parkinsonVolatility,
        garmanKlassVolatility,
        adxTrend,
        aroonUp: aroon.up,
        aroonDown: aroon.down,
        volumeSMA: technical.volumeMA5,
        volumeStd,
        volumeTrend: technical.volumeTrend === 'INCREASING' ? 1 : -1,
        candlePattern,
        supportLevel,
        resistanceLevel,
        marketCorrelation: 0,
        sectorCorrelation: 0,
        dayOfWeek: timeSeries.dayOfWeek,
        weekOfMonth,
        monthOfYear: timeSeries.monthOfYear,
        timestamp: data.length > 1 ? (i - 1) / (data.length - 1) : 0,
      });
    }
    return features;
  }
}

export const featureEngineeringService = new FeatureEngineeringService();
