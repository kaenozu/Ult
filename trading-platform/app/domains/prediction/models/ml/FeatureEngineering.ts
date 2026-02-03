/**
 * FeatureEngineering.ts
 *
 * 高度な特徴量エンジニアリングクラス
 * テクニカル指標の拡張、マクロ経済指標の統合、センチメント分析、時系列特徴量を提供します。
 */

import { OHLCV } from '@/app/types';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateATR } from '@/app/lib/utils';
import { RSI_CONFIG, SMA_CONFIG, MACD_CONFIG, BOLLINGER_BANDS } from '@/app/lib/constants/technical-indicators';

/**
 * テクニカル指標の拡張特徴量
 */
export interface TechnicalFeatures {
  // 基本指標
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma10: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;

  // MACD系
  macd: number;
  macdSignal: number;
  macdHistogram: number;

  // ボリンジャーバンド
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPosition: number;
  bbWidth: number;

  // ATR系
  atr: number;
  atrPercent: number;
  atrRatio: number;

  // モメンタム系
  momentum10: number;
  momentum20: number;
  rateOfChange12: number;
  rateOfChange25: number;

  // オシレーター系
  stochasticK: number;
  stochasticD: number;
  williamsR: number;
  cci: number;

  // ボリューム系
  volumeRatio: number;
  volumeMA5: number;
  volumeMA20: number;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'NEUTRAL';

  // 価格系
  pricePosition: number;
  priceVelocity: number;
  priceAcceleration: number;
}

/**
 * マクロ経済指標
 */
export interface MacroEconomicFeatures {
  // 金利
  interestRate: number;
  interestRateTrend: 'RISING' | 'FALLING' | 'STABLE';

  // GDP成長率
  gdpGrowth: number;
  gdpTrend: 'EXPANDING' | 'CONTRACTING' | 'STABLE';

  // CPI（消費者物価指数）
  cpi: number;
  cpiTrend: 'RISING' | 'FALLING' | 'STABLE';
  inflationRate: number;

  // 為替レート（日本市場用）
  usdjpy?: number;
  usdjpyTrend?: 'APPRECIATING' | 'DEPRECIATING' | 'STABLE';

  // 総合的なマクロスコア
  macroScore: number; // -1 (bearish) to 1 (bullish)
}

/**
 * センチメント分析特徴量
 */
export interface SentimentFeatures {
  // ニュースセンチメント
  newsSentiment: number; // -1 (negative) to 1 (positive)
  newsVolume: number; // 0 to 1 (normalized)
  newsTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';

  // SNSセンチメント
  socialSentiment: number; // -1 to 1
  socialVolume: number; // 0 to 1
  socialBuzz: number; // 0 to 1 (attention level)

  // アナリスト予想
  analystRating: number; // 1 (strong sell) to 5 (strong buy)
  ratingChange: number; // change in rating

  // 総合センチメントスコア
  sentimentScore: number; // -1 to 1
}

/**
 * 時系列特徴量
 */
export interface TimeSeriesFeatures {
  // ラグ特徴量
  lag1: number;
  lag5: number;
  lag10: number;
  lag20: number;

  // 移動平均
  ma5: number;
  ma10: number;
  ma20: number;
  ma50: number;

  // 季節性（曜日効果、月効果）
  dayOfWeek: number; // 0-6
  dayOfWeekReturn: number;
  monthOfYear: number; // 0-11
  monthEffect: number;

  // トレンド強度
  trendStrength: number; // 0 to 1
  trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';

  // 周期性
  cyclicality: number; // 0 to 1
}

/**
 * すべての特徴量を統合したインターフェース
 */
export interface AllFeatures {
  technical: TechnicalFeatures;
  macro: MacroEconomicFeatures | null;
  sentiment: SentimentFeatures | null;
  timeSeries: TimeSeriesFeatures;

  // 特徴量のメタデータ
  featureCount: number;
  lastUpdate: string;
  dataQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

/**
 * 特徴量エンジニアリングクラス
 */
export class FeatureEngineering {
  /**
   * Security: Validate OHLCV data to prevent invalid inputs
   */
  private validateOHLCVData(data: OHLCV[]): void {
    if (!Array.isArray(data)) {
      throw new Error('Invalid data: must be an array');
    }

    const MAX_DATA_POINTS = 100000; // Security: Prevent memory exhaustion
    const MIN_DATA_POINTS = 200;

    if (data.length < MIN_DATA_POINTS) {
      throw new Error(`Insufficient data: minimum ${MIN_DATA_POINTS} data points required, got ${data.length}`);
    }

    if (data.length > MAX_DATA_POINTS) {
      throw new Error(`Data too large: maximum ${MAX_DATA_POINTS} data points allowed, got ${data.length}`);
    }

    // Validate each OHLCV entry
    for (let i = 0; i < data.length; i++) {
      const point = data[i];

      if (!point || typeof point !== 'object') {
        throw new Error(`Invalid data point at index ${i}: must be an object`);
      }

      // Validate required fields
      const requiredFields = ['open', 'high', 'low', 'close', 'volume', 'date'];
      for (const field of requiredFields) {
        if (!(field in point)) {
          throw new Error(`Missing required field '${field}' at index ${i}`);
        }
      }

      // Validate numeric fields are positive and finite
      const numericFields: Array<keyof OHLCV> = ['open', 'high', 'low', 'close', 'volume'];
      for (const field of numericFields) {
        const value = point[field];
        if (typeof value !== 'number' || !isFinite(value) || value < 0) {
          throw new Error(
            `Invalid ${field} at index ${i}: must be a positive finite number, got ${value}`
          );
        }
      }

      // Validate price relationships
      if (point.high < point.low) {
        throw new Error(`Invalid price data at index ${i}: high (${point.high}) cannot be less than low (${point.low})`);
      }

      if (point.close < point.low || point.close > point.high) {
        throw new Error(`Invalid price data at index ${i}: close (${point.close}) must be between low (${point.low}) and high (${point.high})`);
      }

      if (point.open < point.low || point.open > point.high) {
        throw new Error(`Invalid price data at index ${i}: open (${point.open}) must be between low (${point.low}) and high (${point.high})`);
      }

      // Validate date
      if (typeof point.date !== 'string' || point.date.length === 0) {
        throw new Error(`Invalid date at index ${i}: must be a non-empty string`);
      }

      // Check for reasonable price values (not too extreme)
      const MAX_PRICE = 1e10; // Prevent overflow issues
      const MIN_PRICE = 1e-10; // Prevent division by zero
      if (point.close > MAX_PRICE || point.close < MIN_PRICE) {
        throw new Error(
          `Unreasonable price value at index ${i}: ${point.close} is outside acceptable range`
        );
      }
    }
  }

  /**
   * Security: Validate sentiment features to prevent injection
   */
  private validateSentimentFeatures(sentiment: SentimentFeatures): void {
    // Validate sentiment scores are in valid range [-1, 1]
    const sentimentFields: Array<keyof SentimentFeatures> = [
      'newsSentiment',
      'socialSentiment',
      'sentimentScore'
    ];

    for (const field of sentimentFields) {
      const value = sentiment[field];
      if (typeof value !== 'number' || !isFinite(value) || value < -1 || value > 1) {
        throw new Error(`Invalid ${field}: must be a number between -1 and 1, got ${value}`);
      }
    }

    // Validate volume scores [0, 1]
    const volumeFields: Array<keyof SentimentFeatures> = [
      'newsVolume',
      'socialVolume',
      'socialBuzz'
    ];

    for (const field of volumeFields) {
      const value = sentiment[field];
      if (typeof value !== 'number' || !isFinite(value) || value < 0 || value > 1) {
        throw new Error(`Invalid ${field}: must be a number between 0 and 1, got ${value}`);
      }
    }

    // Validate analyst rating [1, 5]
    if (typeof sentiment.analystRating !== 'number' ||
        !isFinite(sentiment.analystRating) ||
        sentiment.analystRating < 1 ||
        sentiment.analystRating > 5) {
      throw new Error(`Invalid analystRating: must be a number between 1 and 5, got ${sentiment.analystRating}`);
    }
  }

  /**
   * Security: Validate macro features
   */
  private validateMacroFeatures(macro: MacroEconomicFeatures): void {
    // Validate macroScore is in valid range [-1, 1]
    if (typeof macro.macroScore !== 'number' ||
        !isFinite(macro.macroScore) ||
        macro.macroScore < -1 ||
        macro.macroScore > 1) {
      throw new Error(`Invalid macroScore: must be a number between -1 and 1, got ${macro.macroScore}`);
    }

    // Validate numeric fields are finite
    const numericFields: Array<keyof MacroEconomicFeatures> = [
      'interestRate',
      'gdpGrowth',
      'cpi',
      'inflationRate'
    ];

    for (const field of numericFields) {
      const value = macro[field];
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error(`Invalid ${field}: must be a finite number, got ${value}`);
      }
    }
  }

  /**
   * すべての特徴量を計算
   */
  calculateAllFeatures(
    data: OHLCV[],
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): AllFeatures {
    // Security: Validate input data
    this.validateOHLCVData(data);

    if (macroData) {
      this.validateMacroFeatures(macroData);
    }

    if (sentimentData) {
      this.validateSentimentFeatures(sentimentData);
    }

    const technical = this.calculateTechnicalFeatures(data);
    const timeSeries = this.calculateTimeSeriesFeatures(data);

    // マクロ経済データとセンチメントデータはオプション
    const macro = macroData || this.getDefaultMacroFeatures();
    const sentiment = sentimentData || this.getDefaultSentimentFeatures();

    // データ品質を評価
    const dataQuality = this.assessDataQuality(data);

    // 特徴量の総数を計算
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
   * テクニカル指標の拡張特徴量を計算
   */
  calculateTechnicalFeatures(data: OHLCV[]): TechnicalFeatures {
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // 基本指標
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

    // ボリンジャーバンド
    const bb = calculateBollingerBands(prices, BOLLINGER_BANDS.PERIOD, BOLLINGER_BANDS.STD_DEVIATION);

    // ATR
    const atr = calculateATR(highs, lows, prices, RSI_CONFIG.DEFAULT_PERIOD);

    // 現在値
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    // 値取得ヘルパー
    const last = (arr: number[], fallback: number) => arr.length > 0 ? arr[arr.length - 1] : fallback;
    const prev = (arr: number[], idx: number, fallback: number) => idx >= 0 && idx < arr.length ? arr[idx] : fallback;

    // 基本指標値
    const rsiValue = last(rsi, 50);
    const rsiChange = rsiValue - prev(rsi, rsi.length - 2, 50);

    // 移動平均乖離率
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

    // ボリンジャーバンド
    const bbUpper = last(bb.upper, currentPrice);
    const bbMiddle = last(bb.middle, currentPrice);
    const bbLower = last(bb.lower, currentPrice);
    const bbPosition = ((currentPrice - bbLower) / (bbUpper - bbLower || 1)) * 100;
    const bbWidth = ((bbUpper - bbLower) / bbMiddle) * 100;

    // ATR
    const atrValue = last(atr, currentPrice * 0.02);
    const atrPercent = (atrValue / currentPrice) * 100;
    const atrArray = atr.filter(v => !isNaN(v));
    const atrAvg = atrArray.reduce((sum, v) => sum + v, 0) / atrArray.length;
    const atrRatio = atrValue / (atrAvg || 1);

    // モメンタム
    const momentum10 = this.calculateMomentum(prices, 10);
    const momentum20 = this.calculateMomentum(prices, 20);

    // 変化率
    const roc12 = this.calculateROC(prices, 12);
    const roc25 = this.calculateROC(prices, 25);

    // ストキャスティクス
    const stoch = this.calculateStochastic(highs, lows, prices, 14);
    const stochasticK = stoch.k;
    const stochasticD = stoch.d;

    // Williams %R
    const williamsR = this.calculateWilliamsR(highs, lows, prices, 14);

    // CCI
    const cci = this.calculateCCI(highs, lows, prices, 20);

    // ボリューム
    const volumeMA5 = this.calculateSMA(volumes, 5);
    const volumeMA20 = this.calculateSMA(volumes, 20);
    const volumeRatio = currentVolume / (last(volumeMA20, currentVolume) || 1);
    const volumeTrend = this.classifyVolumeTrend(volumes.slice(-5));

    // 価格系
    const pricePosition = this.calculatePricePosition(prices.slice(-50));
    const priceVelocity = this.calculateVelocity(prices, 5);
    const priceAcceleration = this.calculateAcceleration(prices, 5);

    return {
      rsi: rsiValue,
      rsiChange,
      sma5: sma5Dev,
      sma10: sma10Dev,
      sma20: sma20Dev,
      sma50: sma50Dev,
      sma200: sma200Dev,
      ema12: ema12Dev,
      ema26: ema26Dev,
      macd: macdValue,
      macdSignal: macdSignalValue,
      macdHistogram: macdHistogramValue,
      bbUpper,
      bbMiddle,
      bbLower,
      bbPosition,
      bbWidth,
      atr: atrValue,
      atrPercent,
      atrRatio,
      momentum10,
      momentum20,
      rateOfChange12: roc12,
      rateOfChange25: roc25,
      stochasticK,
      stochasticD,
      williamsR,
      cci,
      volumeRatio,
      volumeMA5: last(volumeMA5, currentVolume),
      volumeMA20: last(volumeMA20, currentVolume),
      volumeTrend,
      pricePosition,
      priceVelocity,
      priceAcceleration,
    };
  }

  /**
   * 時系列特徴量を計算
   */
  calculateTimeSeriesFeatures(data: OHLCV[]): TimeSeriesFeatures {
    const prices = data.map(d => d.close);

    // ラグ特徴量
    const lag1 = this.calculateLag(prices, 1);
    const lag5 = this.calculateLag(prices, 5);
    const lag10 = this.calculateLag(prices, 10);
    const lag20 = this.calculateLag(prices, 20);

    // 移動平均
    const ma5 = this.calculateSMA(prices, 5);
    const ma10 = this.calculateSMA(prices, 10);
    const ma20 = this.calculateSMA(prices, 20);
    const ma50 = this.calculateSMA(prices, 50);

    // 季節性
    const lastDate = new Date(data[data.length - 1].date);
    const dayOfWeek = lastDate.getDay();
    const dayOfWeekReturn = this.calculateDayOfWeekReturn(data, dayOfWeek);
    const monthOfYear = lastDate.getMonth();
    const monthEffect = this.calculateMonthEffect(data, monthOfYear);

    // トレンド強度と方向
    const trendStrength = this.calculateTrendStrength(prices.slice(-50));
    const trendDirection = this.classifyTrendDirection(prices.slice(-50));

    // 周期性
    const cyclicality = this.calculateCyclicality(prices.slice(-50));

    return {
      lag1,
      lag5,
      lag10,
      lag20,
      ma5: this.lastValue(ma5),
      ma10: this.lastValue(ma10),
      ma20: this.lastValue(ma20),
      ma50: this.lastValue(ma50),
      dayOfWeek,
      dayOfWeekReturn,
      monthOfYear,
      monthEffect,
      trendStrength,
      trendDirection,
      cyclicality,
    };
  }

  /**
   * モメンタムを計算
   */
  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    return ((current - past) / past) * 100;
  }

  /**
   * 変化率（ROC）を計算
   */
  private calculateROC(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    return ((current - past) / past) * 100;
  }

  /**
   * ストキャスティクスを計算
   */
  private calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): { k: number; d: number } {
    const start = Math.max(0, highs.length - period);
    const recentHighs = highs.slice(start);
    const recentLows = lows.slice(start);

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = closes[closes.length - 1];

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow || 1)) * 100;

    // %Dは%Kの3期間SMA
    // 簡略化のため、ここでは現在の%Kを返す
    return { k, d: k };
  }

  /**
   * Williams %Rを計算
   */
  private calculateWilliamsR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number {
    const start = Math.max(0, highs.length - period);
    const recentHighs = highs.slice(start);
    const recentLows = lows.slice(start);

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = closes[closes.length - 1];

    return ((highestHigh - currentClose) / (highestHigh - lowestLow || 1)) * -100;
  }

  /**
   * CCIを計算
   */
  private calculateCCI(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number {
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

  /**
   * SMAを計算
   */
  private calculateSMA(values: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += values[i - j];
        }
        result.push(sum / period);
      }
    }
    return result;
  }

  /**
   * ボリュームトレンドを分類
   */
  private classifyVolumeTrend(volumes: number[]): 'INCREASING' | 'DECREASING' | 'NEUTRAL' {
    if (volumes.length < 2) return 'NEUTRAL';

    const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
    const secondHalf = volumes.slice(Math.floor(volumes.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const ratio = (secondAvg - firstAvg) / (firstAvg || 1);

    if (ratio > 0.1) return 'INCREASING';
    if (ratio < -0.1) return 'DECREASING';
    return 'NEUTRAL';
  }

  /**
   * 価格ポジションを計算
   */
  private calculatePricePosition(prices: number[]): number {
    if (prices.length === 0) return 50;

    const currentPrice = prices[prices.length - 1];
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);

    if (highestPrice === lowestPrice) return 50;
    return ((currentPrice - lowestPrice) / (highestPrice - lowestPrice)) * 100;
  }

  /**
   * 価格の速度を計算
   */
  private calculateVelocity(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const recent = prices.slice(-period);
    let velocity = 0;
    for (let i = 1; i < recent.length; i++) {
      velocity += (recent[i] - recent[i - 1]) / (recent[i - 1] || 1);
    }
    return velocity * 100;
  }

  /**
   * 価格の加速度を計算
   */
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

  /**
   * ラグ特徴量を計算
   */
  private calculateLag(prices: number[], lag: number): number {
    if (prices.length < lag + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - lag];
    return ((current - past) / past) * 100;
  }

  /**
   * 曜日効果を計算
   */
  private calculateDayOfWeekReturn(data: OHLCV[], dayOfWeek: number): number {
    const sameDayData = data.filter(d => new Date(d.date).getDay() === dayOfWeek);
    if (sameDayData.length < 2) return 0;

    let totalReturn = 0;
    for (let i = 1; i < sameDayData.length; i++) {
      totalReturn += (sameDayData[i].close - sameDayData[i - 1].close) / sameDayData[i - 1].close;
    }
    return (totalReturn / sameDayData.length) * 100;
  }

  /**
   * 月効果を計算
   */
  private calculateMonthEffect(data: OHLCV[], month: number): number {
    const sameMonthData = data.filter(d => new Date(d.date).getMonth() === month);
    if (sameMonthData.length < 2) return 0;

    const firstPrice = sameMonthData[0].close;
    const lastPrice = sameMonthData[sameMonthData.length - 1].close;
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }

  /**
   * トレンド強度を計算（0-1）
   */
  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 10) return 0;

    // 線形回帰でトレンド強度を計算
    const n = prices.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = prices;

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    // R²を計算
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

  /**
   * トレンド方向を分類
   */
  private classifyTrendDirection(prices: number[]): 'UP' | 'DOWN' | 'NEUTRAL' {
    if (prices.length < 10) return 'NEUTRAL';

    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.02) return 'UP';
    if (change < -0.02) return 'DOWN';
    return 'NEUTRAL';
  }

  /**
   * 周期性を計算（0-1）
   */
  private calculateCyclicality(prices: number[]): number {
    if (prices.length < 20) return 0;

    // 自己相関を使用して周期性を検出
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    // ラグ5までの自己相関の平均
    const autocorrelations: number[] = [];
    for (let lag = 1; lag <= Math.min(5, Math.floor(returns.length / 2)); lag++) {
      const corr = this.calculateAutocorrelation(returns, lag);
      autocorrelations.push(Math.abs(corr));
    }

    return autocorrelations.reduce((sum, corr) => sum + corr, 0) / autocorrelations.length;
  }

  /**
   * 自己相関を計算
   */
  private calculateAutocorrelation(returns: number[], lag: number): number {
    const n = returns.length - lag;
    if (n < 2) return 0;

    const mean = returns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const deviation = returns[i] - mean;
      const laggedDeviation = returns[i + lag] - mean;
      numerator += deviation * laggedDeviation;
      denominator += deviation * deviation;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * デフォルトのマクロ経済特徴量を生成
   */
  private getDefaultMacroFeatures(): MacroEconomicFeatures {
    return {
      interestRate: 0,
      interestRateTrend: 'STABLE',
      gdpGrowth: 0,
      gdpTrend: 'STABLE',
      cpi: 0,
      cpiTrend: 'STABLE',
      inflationRate: 0,
      macroScore: 0,
    };
  }

  /**
   * デフォルトのセンチメント特徴量を生成
   */
  private getDefaultSentimentFeatures(): SentimentFeatures {
    return {
      newsSentiment: 0,
      newsVolume: 0,
      newsTrend: 'STABLE',
      socialSentiment: 0,
      socialVolume: 0,
      socialBuzz: 0,
      analystRating: 3,
      ratingChange: 0,
      sentimentScore: 0,
    };
  }

  /**
   * データ品質を評価
   */
  private assessDataQuality(data: OHLCV[]): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    const dataPoints = data.length;
    const recentData = data.slice(-20);

    // 欠損データのチェック
    let missingDataCount = 0;
    for (const d of recentData) {
      if (d.high === 0 || d.low === 0 || d.close === 0 || d.volume === 0) {
        missingDataCount++;
      }
    }

    const missingDataRatio = missingDataCount / recentData.length;

    if (dataPoints >= 252 && missingDataRatio === 0) return 'EXCELLENT';
    if (dataPoints >= 100 && missingDataRatio < 0.05) return 'GOOD';
    if (dataPoints >= 50 && missingDataRatio < 0.2) return 'FAIR';
    return 'POOR';
  }

  /**
   * 特徴量の総数を計算
   */
  private countFeatures(
    technical: TechnicalFeatures,
    macro: MacroEconomicFeatures | null,
    sentiment: SentimentFeatures | null,
    timeSeries: TimeSeriesFeatures
  ): number {
    let count = Object.keys(technical).length + Object.keys(timeSeries).length;
    if (macro) count += Object.keys(macro).length;
    if (sentiment) count += Object.keys(sentiment).length;
    return count;
  }

  /**
   * 配列の最後の有効な値を取得
   */
  private lastValue(arr: number[]): number {
    const validValues = arr.filter(v => !isNaN(v) && v !== 0);
    return validValues.length > 0 ? validValues[validValues.length - 1] : 0;
  }
}

export const featureEngineering = new FeatureEngineering();
