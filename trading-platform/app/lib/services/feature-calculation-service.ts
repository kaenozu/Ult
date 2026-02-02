/**
 * 予測特徴量計算サービス（重複排除版）
 * 
 * このモジュールは、MLモデルの入力となる特徴量を計算する機能を提供します。
 * (#524: 計算ロジック重複排除 - utils/calculations.tsを使用)
 */

import { OHLCV } from '../../types';
import { VOLATILITY } from '@/app/lib/constants';
import {
  lastValue,
  calculateRsiChange,
  calculateSmaDeviation,
  calculatePriceMomentumMemoized,
  calculateVolatilityMemoized,
  calculateBollingerPosition,
  calculateMacdSignalDifference,
  calculateVolumeRatio,
  extractPrices,
  extractVolumes,
  mean,
} from '../utils/calculations';

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
 * 予測特徴量計算サービス（重複排除版）
 */
export class FeatureCalculationService {
  /**
   * OHLCVデータから予測に必要な特徴量を計算
   */
  calculateFeatures(
    data: OHLCV[],
    indicators: any // TechnicalIndicator & { atr: number[] }
  ): PredictionFeatures {
    // utils/calculationsから純粋関数を使用
    const prices = extractPrices(data);
    const volumes = extractVolumes(data);
    const currentPrice = lastValue(prices, 0);
    const currentVolume = lastValue(volumes, 0);
    
    // 平均出来高を計算（純粋関数使用）
    const avgVol = mean(volumes);

    return {
      rsi: lastValue(indicators.rsi, 0),
      rsiChange: calculateRsiChange(indicators.rsi),
      sma5: calculateSmaDeviation(currentPrice, lastValue(indicators.sma5, currentPrice)),
      sma20: calculateSmaDeviation(currentPrice, lastValue(indicators.sma20, currentPrice)),
      sma50: calculateSmaDeviation(currentPrice, lastValue(indicators.sma50, currentPrice)),
      // メモ化された計算を使用
      priceMomentum: calculatePriceMomentumMemoized(prices, 10),
      volumeRatio: calculateVolumeRatio(currentVolume, avgVol),
      // メモ化されたボラティリティ計算
      volatility: calculateVolatilityMemoized(
        new Float64Array(prices.slice(-VOLATILITY.CALCULATION_PERIOD)),
        true
      ),
      macdSignal: calculateMacdSignalDifference(
        lastValue(indicators.macd.macd, 0),
        lastValue(indicators.macd.signal, 0)
      ),
      bollingerPosition: calculateBollingerPosition(
        currentPrice,
        lastValue(indicators.bollingerBands.upper, 0),
        lastValue(indicators.bollingerBands.lower, 0)
      ),
      atrPercent: (lastValue(indicators.atr, 0) / currentPrice) * 100,
    };
  }

  /**
   * @deprecated utils/calculations.calculatePriceMomentumMemoizedを使用してください
   */
  calculatePriceMomentum(prices: number[], period: number = 10): number {
    return calculatePriceMomentumMemoized(prices, period);
  }
}

export const featureCalculationService = new FeatureCalculationService();

// utils/calculationsから再エクスポート
export {
  lastValue,
  calculateRsiChange,
  calculateSmaDeviation,
  calculatePriceMomentumMemoized as calculatePriceMomentum,
  calculateVolatilityMemoized as calculateVolatility,
  calculateBollingerPosition,
  calculateMacdSignalDifference,
  calculateVolumeRatio,
  extractPrices,
  extractVolumes,
} from '../utils/calculations';