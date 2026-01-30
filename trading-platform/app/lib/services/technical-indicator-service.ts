/**
 * テクニカル指標計算サービス
 * 
 * このモジュールは、OHLCVデータから各種テクニカル指標を計算する機能を提供します。
 */

import { OHLCV, TechnicalIndicator } from '../types';
import { calculateRSI, calculateSMA, calculateMACD, calculateBollingerBands, calculateATR } from '@/app/lib/utils';

/**
 * テクニカル指標計算サービス
 */
export class TechnicalIndicatorService {
  /**
   * OHLCVデータからすべてのテクニカル指標を計算
   */
  calculateIndicators(data: OHLCV[]): TechnicalIndicator & { atr: number[] } {
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);

    return {
      symbol: '',
      sma5: calculateSMA(prices, 5),
      sma20: calculateSMA(prices, 20),
      sma50: calculateSMA(prices, 50),
      rsi: calculateRSI(prices, 14),
      macd: calculateMACD(prices),
      bollingerBands: calculateBollingerBands(prices),
      atr: calculateATR(highs, lows, closes, 14),
    };
  }

  /**
   * 特定の期間の価格変動率を計算
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
   * 平均出来高を計算
   */
  calculateAverageVolume(volumes: number[]): number {
    if (volumes.length === 0) {
      return 0;
    }
    const sum = volumes.reduce((acc, vol) => acc + vol, 0);
    return sum / volumes.length;
  }

  /**
   * 現在の出来高が平均に対してどの程度かを計算
   */
  calculateVolumeRatio(currentVolume: number, averageVolume: number): number {
    if (averageVolume === 0) {
      return 0;
    }
    return currentVolume / averageVolume;
  }

  /**
   * 価格のボラティリティを計算（簡易版）
   */
  calculateVolatility(prices: number[]): number {
    if (prices.length < 2) {
      return 0;
    }
    const returns = this.calculateReturns(prices);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // 年率化ボラティリティ
  }

  /**
   * 価格リターンを計算
   */
  private calculateReturns(prices: number[]): number[] {
    if (prices.length < 2) {
      return [];
    }
    return prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  }

  /**
   * ボリンジャーバンドの現在位置（％）を計算
   */
  calculateBollingerPosition(currentPrice: number, upper: number, lower: number): number {
    if (upper === lower) {
      return 0;
    }
    return ((currentPrice - lower) / (upper - lower)) * 100;
  }

  /**
   * MACDとシグナルラインの差を計算
   */
  calculateMacdSignalDifference(macd: number[], signal: number[]): number[] {
    if (macd.length !== signal.length) {
      throw new Error('MACD and signal arrays must have the same length');
    }
    return macd.map((val, i) => val - signal[i]);
  }
}

export const technicalIndicatorService = new TechnicalIndicatorService();