/**
 * 予測特徴量計算サービス
 * 
 * このモジュールは、MLモデルの入力となる特徴量を計算する機能を提供します。
 */

import { OHLCV, TechnicalIndicatorsWithATR } from '../../types';
import { RSI_CONFIG, SMA_CONFIG, VOLATILITY } from '@/app/lib/constants';
import { EnhancedPredictionFeatures } from '../types/prediction-types';
import { enhancedFeatureService } from './enhanced-feature-service';
import { OHLCVData, OHLCVConverter } from '../../types/optimized-data';

export interface PredictionFeatures {
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
}

/**
 * 予測特徴量計算サービス
 */
export class FeatureCalculationService {
  /**
   * OHLCVデータから予測に必要な特徴量を計算
   */
  calculateFeatures(
    data: OHLCV[],
    indicators: TechnicalIndicatorsWithATR
  ): PredictionFeatures {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];
    
    // 平均出来高を計算
    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    return {
      rsi: this.getLastValue(indicators.rsi, 0),
      rsiChange: this.calculateRsiChange(indicators.rsi),
      sma5: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma5, currentPrice)),
      sma20: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma20, currentPrice)),
      sma50: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma50, currentPrice)),
      priceMomentum: this.calculatePriceMomentum(prices, 10),
      volumeRatio: currentVolume / (avgVol || 1),
      volatility: this.calculateVolatility(prices.slice(-VOLATILITY.CALCULATION_PERIOD)),
      macdSignal: this.calculateMacdSignalDifference(
        this.getLastValue(indicators.macd.macd, 0),
        this.getLastValue(indicators.macd.signal, 0)
      ),
      bollingerPosition: this.calculateBollingerPosition(
        currentPrice,
        this.getLastValue(indicators.bollingerBands.upper, 0),
        this.getLastValue(indicators.bollingerBands.lower, 0)
      ),
      atrPercent: (this.getLastValue(indicators.atr, 0) / currentPrice) * 100,
    };
  }

  /**
   * Optimized feature calculation using TypedArray data
   * (High-performance variant)
   */
  calculateFeaturesOptimized(
    data: OHLCVData,
    indicators: TechnicalIndicatorsWithATR
  ): PredictionFeatures {
    // For now, convert back to standard objects to reuse existing logic
    const standardData = OHLCVConverter.fromTypedArray(data);
    return this.calculateFeatures(standardData as any, indicators);
  }

  /**
   * 配列の最後の値を取得
   */
  private getLastValue(arr: number[], fallback: number): number {
    return arr.length > 0 ? arr[arr.length - 1] : fallback;
  }

  /**
   * RSIの変化量を計算
   */
  private calculateRsiChange(rsiValues: number[]): number {
    if (rsiValues.length < 2) {
      return 0;
    }
    return rsiValues[rsiValues.length - 1] - rsiValues[rsiValues.length - 2];
  }

  /**
   * SMAからの乖離率を計算
   */
  private calculateSmaDeviation(currentPrice: number, smaValue: number): number {
    if (smaValue === 0) {
      return 0;
    }
    return ((currentPrice - smaValue) / currentPrice) * 100;
  }

  /**
   * 価格モメンタムを計算
   */
  calculatePriceMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period + 1) {
      return 0;
    }
    const currentIndex = prices.length - 1;
    const pastIndex = currentIndex - period;
    if (pastIndex < 0) {
      return 0;
    }
    const currentPrice = prices[currentIndex];
    const pastPrice = prices[pastIndex];
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  /**
   * ボラティリティを計算
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = this.calculateReturns(prices);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  /**
   * 価格リターンを計算
   */
  private calculateReturns(prices: number[]): number[] {
    return prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  }

  /**
   * MACDとシグナルの差を計算
   */
  private calculateMacdSignalDifference(macd: number, signal: number): number {
    return macd - signal;
  }

  /**
   * ボリンジャーバンドの現在位置（％）を計算
   */
  private calculateBollingerPosition(currentPrice: number, upper: number, lower: number): number {
    if (upper === lower) {
      return 0;
    }
    return ((currentPrice - lower) / (upper - lower)) * 100;
  }

  /**
   * 拡張特徴量を計算（Phase 1: 時系列特徴量）
   * 基本特徴量（11次元）+ 新規特徴量（40次元）= 51次元
   */
  calculateEnhancedFeatures(
    data: OHLCV[],
    indicators: TechnicalIndicatorsWithATR
  ): EnhancedPredictionFeatures {
    // 基本特徴量を計算
    const basicFeatures = this.calculateFeatures(data, indicators);

    // 拡張特徴量を計算
    const candlestickPatterns = enhancedFeatureService.calculateCandlestickPatterns(data);
    const priceTrajectory = enhancedFeatureService.calculatePriceTrajectory(data);
    const volumeProfile = enhancedFeatureService.calculateVolumeProfile(data);
    const volatilityRegime = enhancedFeatureService.calculateVolatilityRegime(data);

    return {
      // 基本特徴量（11次元）
      ...basicFeatures,
      
      // 拡張特徴量（40次元）
      candlestickPatterns,
      priceTrajectory,
      volumeProfile,
      volatilityRegime
    };
  }
}

export const featureCalculationService = new FeatureCalculationService();
