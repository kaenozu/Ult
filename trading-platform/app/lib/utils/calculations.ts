/**
 * 計算ユーティリティ（純粋関数・メモ化対応）
 * 
 * このモジュールは、アプリケーション全体で共有される計算ロジックを提供します。
 * (#524: 計算ロジック重複排除)
 */

import { OHLCV } from '../../types';

// ============================================================================
// メモ化ユーティリティ
// ============================================================================

/**
 * 単純なメモ化関数
 */
export function memoize<T extends (...args: number[]) => number>(
  fn: T,
  keyGenerator?: (...args: number[]) => string
): T {
  const cache = new Map<string, number>();

  return ((...args: number[]): number => {
    const key = keyGenerator ? keyGenerator(...args) : args.join(',');
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * 配列用メモ化関数
 */
export function memoizeArray<T extends (arr: number[] | Float64Array, ...args: any[]) => number>(
  fn: T,
  maxCacheSize: number = 100
): T {
  const cache = new Map<string, number>();

  return ((arr: number[] | Float64Array, ...args: number[]): number => {
    // 配列の内容をハッシュ化（最初の10要素と長さを使用）
    const sample = arr.slice(0, 10).join(',');
    const key = `${sample}|${arr.length}|${args.join(',')}`;
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(arr, ...args);

    // キャッシュサイズ制限
     if (cache.size >= maxCacheSize) {
       const firstKey = cache.keys().next().value;
       cache.delete(firstKey!);
     }

    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================================================
// 基本計算関数（純粋関数）
// ============================================================================

/**
 * 配列の合計を計算
 */
export function sum(arr: number[] | Float64Array): number {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}

/**
 * 配列の平均を計算
 */
export function mean(arr: number[] | Float64Array): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/**
 * 配列の分散を計算
 */
export function variance(arr: number[] | Float64Array): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const diff = arr[i] - m;
    sum += diff * diff;
  }
  return sum / arr.length;
}

/**
 * 標準偏差を計算
 */
export function stdDev(arr: number[] | Float64Array): number {
  return Math.sqrt(variance(arr));
}

/**
 * 配列の最大値を計算
 */
export function max(arr: number[] | Float64Array): number {
  if (arr.length === 0) return -Infinity;
  let maximum = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maximum) maximum = arr[i];
  }
  return maximum;
}

/**
 * 配列の最小値を計算
 */
export function min(arr: number[] | Float64Array): number {
  if (arr.length === 0) return Infinity;
  let minimum = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < minimum) minimum = arr[i];
  }
  return minimum;
}

/**
 * 配列の最後の値を取得
 */
export function lastValue<T>(arr: T[], fallback: T): T {
  return arr.length > 0 ? arr[arr.length - 1] : fallback;
}

// ============================================================================
// 金融計算関数（純粋関数）
// ============================================================================

/**
 * 価格リターンを計算
 */
export function calculateReturns(prices: number[] | Float64Array): Float64Array {
  if (prices.length < 2) return new Float64Array(0);

  const result = new Float64Array(prices.length - 1);
  for (let i = 1; i < prices.length; i++) {
    result[i - 1] = (prices[i] - prices[i - 1]) / prices[i - 1];
  }

  return result;
}

/**
 * 価格モメンタムを計算（パーセント変化）
 */
export function calculatePriceMomentum(
  prices: number[] | Float64Array,
  period: number
): number {
  if (prices.length < period + 1) {
    return 0;
  }

  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - period];

  if (pastPrice === 0) return 0;

  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

/**
 * メモ化された価格モメンタム計算
 */
export const calculatePriceMomentumMemoized = memoizeArray(calculatePriceMomentum);

/**
 * SMAからの乖離率を計算
 */
export function calculateSmaDeviation(
  currentPrice: number,
  smaValue: number
): number {
  if (smaValue === 0 || currentPrice === 0) {
    return 0;
  }
  return ((currentPrice - smaValue) / currentPrice) * 100;
}

/**
 * RSIの変化量を計算
 */
export function calculateRsiChange(rsiValues: number[]): number {
  if (rsiValues.length < 2) {
    return 0;
  }
  return rsiValues[rsiValues.length - 1] - rsiValues[rsiValues.length - 2];
}

/**
 * ボラティリティを計算（年率換算）
 */
export function calculateVolatility(
  prices: number[] | Float64Array,
  annualize: boolean = true
): number {
  if (prices.length < 2) return 0;

  const returns = calculateReturns(prices);
  if (returns.length === 0) return 0;

  const vol = stdDev(returns);

  if (annualize) {
    return vol * Math.sqrt(252) * 100;
  }

  return vol * 100;
}

/**
 * メモ化されたボラティリティ計算
 */
export const calculateVolatilityMemoized = memoizeArray(calculateVolatility);

/**
 * 移動平均を計算
 */
export function calculateMovingAverage(
  data: number[] | Float64Array,
  period: number
): Float64Array {
  if (period <= 0 || period > data.length) {
    return new Float64Array(0);
  }

  const result = new Float64Array(data.length - period + 1);
  let sum = 0;

  // 最初のウィンドウ
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[0] = sum / period;

  // スライディングウィンドウ
  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result[i - period + 1] = sum / period;
  }

  return result;
}

/**
 * ボリンジャーバンドの現在位置（％）を計算
 */
export function calculateBollingerPosition(
  currentPrice: number,
  upper: number,
  lower: number
): number {
  if (upper === lower || currentPrice === 0) {
    return 0;
  }
  return ((currentPrice - lower) / (upper - lower)) * 100;
}

/**
 * MACDとシグナルの差を計算
 */
export function calculateMacdSignalDifference(
  macd: number,
  signal: number
): number {
  return macd - signal;
}

/**
 * 出来高比率を計算
 */
export function calculateVolumeRatio(
  currentVolume: number,
  averageVolume: number
): number {
  if (averageVolume === 0) return 0;
  return currentVolume / averageVolume;
}

// ============================================================================
// OHLCV固有の計算
// ============================================================================

/**
 * OHLCVから価格配列を抽出
 */
export function extractPrices(data: OHLCV[]): number[] {
  return data.map(d => d.close);
}

/**
 * OHLCVから出来高配列を抽出
 */
export function extractVolumes(data: OHLCV[]): number[] {
  return data.map(d => d.volume);
}

/**
 * OHLCVからリターンを計算
 */
export function calculateReturnsFromOHLCV(data: OHLCV[]): Float64Array {
  if (data.length < 2) return new Float64Array(0);

  const result = new Float64Array(data.length - 1);
  for (let i = 1; i < data.length; i++) {
    result[i - 1] = (data[i].close - data[i - 1].close) / data[i - 1].close;
  }

  return result;
}

// ============================================================================
// 統計計算
// ============================================================================

/**
 * 相関係数を計算
 */
export function calculateCorrelation(
  arr1: number[] | Float64Array,
  arr2: number[] | Float64Array
): number {
  if (arr1.length !== arr2.length || arr1.length === 0) {
    return 0;
  }

  const n = arr1.length;
  const mean1 = mean(arr1);
  const mean2 = mean(arr2);

  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(denom1 * denom2);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * シャープレシオを計算
 */
export function calculateSharpeRatio(
  returns: number[] | Float64Array,
  riskFreeRate: number = 0
): number {
  if (returns.length === 0) return 0;

  const avgReturn = mean(returns) - riskFreeRate;
  const volatility = stdDev(returns);

  if (volatility === 0) return 0;

  return avgReturn / volatility;
}

/**
 * 最大ドローダウンを計算
 */
export function calculateMaxDrawdown(prices: number[] | Float64Array): number {
  if (prices.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = prices[0];

  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) {
      peak = prices[i];
    } else {
      const drawdown = (peak - prices[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown * 100;
}

// ============================================================================
// エクスポート
// ============================================================================

export const Calculations = {
  // 基本統計
  sum,
  mean,
  variance,
  stdDev,
  max,
  min,
  lastValue,

  // 金融計算
  calculateReturns,
  calculatePriceMomentum,
  calculatePriceMomentumMemoized,
  calculateSmaDeviation,
  calculateRsiChange,
  calculateVolatility,
  calculateVolatilityMemoized,
  calculateMovingAverage,
  calculateBollingerPosition,
  calculateMacdSignalDifference,
  calculateVolumeRatio,

  // OHLCV計算
  extractPrices,
  extractVolumes,
  calculateReturnsFromOHLCV,

  // 統計計算
  calculateCorrelation,
  calculateSharpeRatio,
  calculateMaxDrawdown,

  // メモ化ユーティリティ
  memoize,
  memoizeArray,
};
