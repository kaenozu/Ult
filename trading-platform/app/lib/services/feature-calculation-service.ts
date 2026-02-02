/**
 * 予測特徴量計算サービス（最適化版）
 * 
 * このモジュールは、MLモデルの入力となる特徴量を計算する機能を提供します。
 * (#526: データパイプライン最適化 - Float64Arrayと高速配列操作を使用)
 */

import { OHLCV } from '../../types';
import { RSI_CONFIG, SMA_CONFIG, VOLATILITY } from '@/app/lib/constants';
import {
  toColumnarOHLCV,
  ColumnarOHLCV,
  OptimizedArrays,
  Float64RingBuffer,
} from './data-pipeline-optimized';

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
 * 予測特徴量計算サービス（最適化版）
 */
export class FeatureCalculationService {
  private priceBuffer: Float64RingBuffer;
  private volumeBuffer: Float64RingBuffer;

  constructor(bufferSize: number = 100) {
    this.priceBuffer = new Float64RingBuffer(bufferSize);
    this.volumeBuffer = new Float64RingBuffer(bufferSize);
  }

  /**
   * OHLCVデータから予測に必要な特徴量を計算（最適化版）
   */
  calculateFeatures(
    data: OHLCV[],
    indicators: any // TechnicalIndicator & { atr: number[] }
  ): PredictionFeatures {
    // カラム指向構造に変換（Float64Array使用）
    const columnar = toColumnarOHLCV(data);
    const prices = columnar.closes;
    const volumes = columnar.volumes;
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    // 高速平均計算
    const avgVol = OptimizedArrays.average(volumes);

    return {
      rsi: this.getLastValue(indicators.rsi, 0),
      rsiChange: this.calculateRsiChange(indicators.rsi),
      sma5: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma5, currentPrice)),
      sma20: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma20, currentPrice)),
      sma50: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma50, currentPrice)),
      priceMomentum: this.calculatePriceMomentumOptimized(prices, 10),
      volumeRatio: currentVolume / (avgVol || 1),
      volatility: this.calculateVolatilityOptimized(prices, VOLATILITY.CALCULATION_PERIOD),
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
   * カラム指向データから直接特徴量を計算
   */
  calculateFeaturesFromColumnar(
    columnar: ColumnarOHLCV,
    indicators: any
  ): PredictionFeatures {
    const prices = columnar.closes;
    const volumes = columnar.volumes;
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    const avgVol = OptimizedArrays.average(volumes);

    return {
      rsi: this.getLastValue(indicators.rsi, 0),
      rsiChange: this.calculateRsiChange(indicators.rsi),
      sma5: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma5, currentPrice)),
      sma20: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma20, currentPrice)),
      sma50: this.calculateSmaDeviation(currentPrice, this.getLastValue(indicators.sma50, currentPrice)),
      priceMomentum: this.calculatePriceMomentumOptimized(prices, 10),
      volumeRatio: currentVolume / (avgVol || 1),
      volatility: this.calculateVolatilityOptimized(prices, VOLATILITY.CALCULATION_PERIOD),
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
  private getLastValue(arr: number[] | Float64Array, fallback: number): number {
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
   * 価格モメンタムを計算（最適化版）
   */
  calculatePriceMomentum(prices: number[], period: number = 10): number {
    return this.calculatePriceMomentumOptimized(
      new Float64Array(prices),
      period
    );
  }

  /**
   * 価格モメンタムを計算（Float64Array版）
   */
  private calculatePriceMomentumOptimized(prices: Float64Array, period: number): number {
    if (prices.length < period + 1) {
      return 0;
    }
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - period];
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  /**
   * ボラティリティを計算（最適化版）
   */
  private calculateVolatilityOptimized(prices: Float64Array, period: number): number {
    if (prices.length < 2) return 0;

    // 指定期間のデータを取得
    const startIndex = Math.max(0, prices.length - period);
    const periodPrices = prices.slice(startIndex);

    if (periodPrices.length < 2) return 0;

    // 高速リターン計算
    const returns = OptimizedArrays.returns(periodPrices);

    // 高速分散計算
    const variance = OptimizedArrays.variance(returns);

    return Math.sqrt(variance) * Math.sqrt(252) * 100;
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
   * データをバッファに追加
   */
  pushData(price: number, volume: number): void {
    this.priceBuffer.push(price);
    this.volumeBuffer.push(volume);
  }

  /**
   * バッファから移動平均を計算
   */
  getBufferedMovingAverage(period: number): number {
    return this.priceBuffer.movingAverage(period);
  }
}

export const featureCalculationService = new FeatureCalculationService();