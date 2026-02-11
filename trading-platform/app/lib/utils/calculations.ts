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
export function memoizeArray<TArgs extends (number | string | boolean)[], TReturn extends number>(
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
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] !== 0) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

// ============================================================================
// テクニカル指標計算（純粋関数）
// ============================================================================

/**
 * SMA（単純移動平均）を計算
 */
export function calculateSMA(prices: number[] | Float64Array, period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sumValue = sum(prices.slice(i - period + 1, i + 1));
      sma.push(sumValue / period);
    }
  }
  return sma;
}

/**
 * EMA（指数平滑移動平均）を計算
 */
export function calculateEMA(prices: number[] | Float64Array, period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let currentEMA = 0;
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
      if (i === period - 2) {
        currentEMA = mean(prices.slice(0, period));
      }
    } else if (i === period - 1) {
      ema.push(currentEMA);
    } else {
      currentEMA = (prices[i] - currentEMA) * multiplier + currentEMA;
      ema.push(currentEMA);
    }
  }
  
  return ema;
}

/**
 * RSI（相対力指数）を計算
 */
export function calculateRSI(prices: number[] | Float64Array, period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i-1];
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));
  }
  
  let avgGain = mean(gains.slice(0, period));
  let avgLoss = mean(losses.slice(0, period));
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    } else {
      avgGain = (avgGain * (period - 1) + gains[i-1]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i-1]) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
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
 * メモ化されたボラティリティ計算
 */
export const calculateVolatilityMemoized = memoizeArray(calculateVolatility);

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