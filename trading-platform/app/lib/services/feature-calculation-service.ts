/**
 * 予測特徴量計算サービス
 * 
 * このモジュールは、MLモデルの入力となる特徴量を計算する機能を提供します。
 */

import { OHLCV } from '../../types';
import { RSI_CONFIG, SMA_CONFIG, VOLATILITY } from '@/app/lib/constants';
import { EnhancedPredictionFeatures } from '../types/prediction-types';
import { enhancedFeatureService } from './enhanced-feature-service';
import { OHLCVData, OHLCVConverter, OHLCVIterators, DataPipeline } from '@/app/types/optimized-data';
import type { ExtendedTechnicalIndicator } from '@/app/types';

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
    indicators: ExtendedTechnicalIndicator
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
   * OHLCVデータから予測に必要な特徴量を計算（最適化版）
   * TypedArrayを使用してメモリ効率とパフォーマンスを向上
   */
  calculateFeaturesOptimized(
    data: OHLCVData,
    indicators: ExtendedTechnicalIndicator
  ): PredictionFeatures {
    // 最後の価格と出来高を取得（配列コピーなし）
    const currentPrice = data.closes[data.length - 1];
    const currentVolume = data.volumes[data.length - 1];
    
    // イテレータを使用して平均出来高を一度の走査で計算
    const avgVol = DataPipeline.average(OHLCVIterators.volumes(data));

    // ボラティリティ計算用のスライスウィンドウ（ゼロコピー）
    const recentPrices = OHLCVConverter.slice(
      data,
      Math.max(0, data.length - VOLATILITY.CALCULATION_PERIOD),
      data.length
    );

    return {
      rsi: this.getLastValue(indicators.rsi, 0),
      rsiChange: this.calculateRsiChange(indicators.rsi),
      sma5: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma5, currentPrice)),
      sma20: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma20, currentPrice)),
      sma50: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma50, currentPrice)),
      priceMomentum: this.calculatePriceMomentumOptimized(data, 10),
      volumeRatio: currentVolume / (avgVol || 1),
      volatility: this.calculateVolatilityOptimized(recentPrices),
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
   * 価格モメンタムを計算（最適化版）
   * TypedArrayを使用して直接アクセス
   */
  private calculatePriceMomentumOptimized(data: OHLCVData, period: number = 10): number {
    if (data.length < period + 1) {
      return 0;
    }
    const currentIndex = data.length - 1;
    const pastIndex = currentIndex - period;
    if (pastIndex < 0) {
      return 0;
    }
    const currentPrice = data.closes[currentIndex];
    const pastPrice = data.closes[pastIndex];
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
   * ボラティリティを計算（最適化版）
   * イテレータとWelfordのアルゴリズムで一度の走査で計算
   */
  private calculateVolatilityOptimized(data: OHLCVData): number {
    if (data.length < 2) return 0;
    
    // イテレータを使用してリターンを計算し、平均と標準偏差を一度の走査で取得
    const returns = OHLCVIterators.returns(data);
    const { stdDev } = DataPipeline.meanStdDev(returns);
    
    // 年率換算
    return stdDev * Math.sqrt(252) * 100;
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
    indicators: ExtendedTechnicalIndicator
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