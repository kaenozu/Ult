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
export function memoize<TArgs extends unknown[], TReturn extends number>(
  fn: (...args: TArgs) => TReturn,
  keyGenerator?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();

  return (...args: TArgs): TReturn => {
    const key = keyGenerator ? keyGenerator(...args) : args.map(arg => String(arg)).join(',');

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * 配列用メモ化関数
 */
export function memoizeArray<TArgs extends unknown[], TReturn extends number>(
  fn: (arr: number[] | Float64Array, ...args: TArgs) => TReturn,
  maxCacheSize: number = 100
): (arr: number[] | Float64Array, ...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();

  return ((arr: number[] | Float64Array, ...args: TArgs): TReturn => {
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
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, result);
    return result;
  });
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
 * 配列の標準偏差を計算
 */
export function stdDev(arr: number[] | Float64Array): number {
  return Math.sqrt(variance(arr));
}

/**
 * リターン（騰落率）を計算
 */
export function calculateReturns(prices: number[] | Float64Array): number[] {
  const len = prices.length;
  if (len === 0) return [];
  const returns: number[] = new Array(len - 1);
  for (let i = 1; i < len; i++) {
    const prev = prices[i-1];
    returns[i-1] = prev !== 0 ? (prices[i] - prev) / prev : 0;
  }
  return returns;
}

// ============================================================================
// テクニカル指標計算（純粋関数）
// ============================================================================

/**
 * SMA（単純移動平均）を計算
 * O(N) complexity using sliding window approach
 */
export function calculateSMA(prices: number[] | Float64Array, period: number): number[] {
  const len = prices.length;
  if (len < period || period <= 0) {
    const arr = new Array(len);
    for (let i = 0; i < len; i++) arr[i] = NaN;
    return arr;
  }
  
  const sma: number[] = new Array(len);
  for (let i = 0; i < period - 1; i++) {
    sma[i] = NaN;
  }
  
  let windowSum = 0;
  for (let i = 0; i < period; i++) {
    windowSum += prices[i];
  }
  sma[period - 1] = windowSum / period;

  for (let i = period; i < len; i++) {
    windowSum += prices[i] - prices[i - period];
    sma[i] = windowSum / period;
  }
  
  return sma;
}

/**
 * EMA（指数平滑移動平均）を計算
 */
export function calculateEMA(prices: number[] | Float64Array, period: number): number[] {
  const len = prices.length;
  if (len < period || period <= 0) {
    const arr = new Array(len);
    for (let i = 0; i < len; i++) arr[i] = NaN;
    return arr;
  }
  
  const ema: number[] = new Array(len);
  for (let i = 0; i < period - 1; i++) {
    ema[i] = NaN;
  }
  
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let currentEMA = sum / period;
  ema[period - 1] = currentEMA;

  for (let i = period; i < len; i++) {
    currentEMA = (prices[i] - currentEMA) * multiplier + currentEMA;
    ema[i] = currentEMA;
  }
  
  return ema;
}

/**
 * RSI（相対力指数）を計算
 */
export function calculateRSI(prices: number[] | Float64Array, period: number = 14): number[] {
  const len = prices.length;
  if (len <= period || period <= 0) {
    const arr = new Array(len);
    for (let i = 0; i < len; i++) arr[i] = NaN;
    return arr;
  }

  const rsi: number[] = new Array(len);
  for (let i = 0; i < period; i++) {
    rsi[i] = NaN;
  }
  
  let sumGain = 0;
  let sumLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i-1];
    if (diff > 0) sumGain += diff;
    else if (diff < 0) sumLoss -= diff;
  }
  
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < len; i++) {
    const diff = prices[i] - prices[i-1];
    let gain = 0;
    let loss = 0;
    if (diff > 0) gain = diff;
    else if (diff < 0) loss = -diff;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  
  return rsi;
}

/**
 * RSIの勢い（直近の変化）を計算
 */
export function calculateRSIMomentum(rsiValues: number[]): number {
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
 * ボラティリティを計算（柔軟版）
 * @param returns リターンの配列
 * @param annualize 年率換算するかどうか（デフォルト: true）
 * @param useSampleVariance 標本分散（n-1）を使うかどうか。falseの場合は母集団分散（n）を使用（デフォルト: false）
 * @returns ボラティリティ
 */
export function calculateVolatilityFlexible(
  returns: number[],
  annualize: boolean = true,
  useSampleVariance: boolean = false
): number {
  const len = returns ? returns.length : 0;
  if (len < 2) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += returns[i];
  }
  const mean = sum / len;

  let varSum = 0;
  for (let i = 0; i < len; i++) {
    const diff = returns[i] - mean;
    varSum += diff * diff;
  }
  const variance = varSum / (useSampleVariance ? (len - 1) : len);

  const vol = Math.sqrt(variance);

  if (annualize) {
    return vol * Math.sqrt(252) * 100;
  }

  return vol * 100;
}

/**
 * メモ化されたボラティリティ計算
 */
export const calculateVolatilityMemoized = memoizeArray(
  (prices: number[] | Float64Array, annualize: boolean = true): number => 
    calculateVolatility(prices, annualize)
);

/**
 * 最大ドローダウンを計算
 */
export function calculateMaxDrawdown(equityCurve: number[]): number {
  let maxDrawdown = 0;
  let peak = -Infinity;
  
  for (const value of equityCurve) {
    if (value > peak) {
      peak = value;
    }
    const dd = (peak - value) / peak;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  }
  
  return maxDrawdown * 100;
}

/**
 * 最大ドローダウンを計算（柔軟版）
 * @param equityCurve 資産曲線の配列
 * @param asPercentage trueの場合、パーセンテージで返す（デフォルト: true）
 * @returns 最大ドローダウン
 */
export function calculateMaxDrawdownFlexible(equityCurve: number[], asPercentage: boolean = true): number {
  if (!equityCurve || equityCurve.length === 0) {
    return 0;
  }

  let maxDrawdown = 0;
  let peak = equityCurve[0];

  for (const value of equityCurve) {
    if (value > peak) {
      peak = value;
    }
    if (peak !== 0) {
      const dd = (peak - value) / peak;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }
  }

  return asPercentage ? maxDrawdown * 100 : maxDrawdown;
}

/**
 * リターン配列から最大ドローダウンを計算
 * @param returns リターンの配列
 * @param asPercentage trueの場合、パーセンテージで返す（デフォルト: true）
 * @returns 最大ドローダウン
 */
export function calculateMaxDrawdownFromReturns(returns: number[], asPercentage: boolean = true): number {
  const len = returns ? returns.length : 0;
  if (len === 0) {
    return 0;
  }

  let peak = 1;
  let maxDD = 0;
  let cumulative = 1;

  for (let i = 0; i < len; i++) {
    cumulative *= (1 + returns[i]);
    if (cumulative > peak) {
      peak = cumulative;
    }
    if (peak !== 0) {
      const dd = (peak - cumulative) / peak;
      if (dd > maxDD) {
        maxDD = dd;
      }
    }
  }

  return asPercentage ? maxDD * 100 : maxDD;
}

/**
 * シャープレシオを計算
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  const annualReturn = mean(returns) * 252;
  const annualVol = stdDev(returns) * Math.sqrt(252);
  
  if (annualVol === 0) return 0;
  return (annualReturn - riskFreeRate) / annualVol;
}

/**
 * ケリー基準に基づくポジションサイズを計算
 */
export function calculateKellyCriterion(
  winRate: number,
  winLossRatio: number,
  fraction: number = 0.5
): number {
  if (winLossRatio <= 0) return 0;
  
  // f = w - (1-w)/r
  const kelly = winRate - (1 - winRate) / winLossRatio;
  return Math.max(0, kelly * fraction);
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
  if (arr1.length !== arr2.length || arr1.length === 0) return 0;
  
  const m1 = mean(arr1);
  const m2 = mean(arr2);
  
  let num = 0;
  let den1 = 0;
  let den2 = 0;
  
  for (let i = 0; i < arr1.length; i++) {
    const d1 = arr1[i] - m1;
    const d2 = arr2[i] - m2;
    num += d1 * d2;
    den1 += d1 * d1;
    den2 += d2 * d2;
  }
  
  const den = Math.sqrt(den1 * den2);
  if (den === 0) return 0;
  
  return num / den;
}

/**
 * 線形回帰（最小二乗法）を実行
 */
export function linearRegression(
  x: number[] | Float64Array,
  y: number[] | Float64Array
): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  if (n !== y.length || n === 0) return { slope: 0, intercept: 0, r2: 0 };
  
  const mx = mean(x);
  const my = mean(y);
  
  let num = 0;
  let den = 0;
  
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    den += (x[i] - mx) * (x[i] - mx);
  }
  
  if (den === 0) return { slope: 0, intercept: my, r2: 0 };
  
  const slope = num / den;
  const intercept = my - slope * mx;
  
  // R2計算
  const r = calculateCorrelation(x, y);
  const r2 = r * r;
  
  return { slope, intercept, r2 };
}