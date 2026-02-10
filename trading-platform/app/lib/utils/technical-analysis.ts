/**
 * Technical Analysis Utilities
 * 
 * Pure functional implementations of technical indicators.
 * Optimized for performance and accuracy.
 */

import { OHLCV } from '@/app/types';

/**
 * Internal helper to validate a price value.
 */
export function _getValidPrice(p: number | null | undefined): number {
  return p != null && typeof p === "number" && !isNaN(p) && p > 0 ? p : NaN;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  let sum = 0;
  let validCount = 0;

  for (let i = 0; i < prices.length; i++) {
    const val = _getValidPrice(prices[i]);
    if (!isNaN(val)) {
      sum += val;
      validCount++;
    }

    if (i >= period) {
      const oldVal = _getValidPrice(prices[i - period]);
      if (!isNaN(oldVal)) {
        sum -= oldVal;
        validCount--;
      }
    }

    if (i < period - 1) {
      result.push(NaN);
    } else {
      result.push(validCount === period ? sum / period : NaN);
    }
  }
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let sum = 0;
  let validCount = 0;
  let initialized = false;

  for (let i = 0; i < prices.length; i++) {
    const val = _getValidPrice(prices[i]);

    if (!initialized) {
      if (!isNaN(val)) {
        sum += val;
        validCount++;
      }
      if (validCount === period && !isNaN(val)) {
        result.push(sum / period);
        initialized = true;
      } else {
        result.push(NaN);
      }
    } else {
      if (!isNaN(val) && !isNaN(result[i - 1])) {
        result.push((val - result[i - 1]) * multiplier + result[i - 1]);
      } else {
        result.push(NaN);
      }
    }
  }
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = [];
  const changes: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const valCurrent = _getValidPrice(prices[i]);
    const valPrev = _getValidPrice(prices[i - 1]);
    changes.push(!isNaN(valCurrent) && !isNaN(valPrev) ? valCurrent - valPrev : NaN);
  }

  let avgGain = 0;
  let avgLoss = 0;
  let validChangesCount = 0;

  for (let i = 0; i < period && i < changes.length; i++) {
    if (!isNaN(changes[i])) {
      if (changes[i] >= 0) avgGain += changes[i];
      else avgLoss += Math.abs(changes[i]);
      validChangesCount++;
    }
  }

  if (validChangesCount > 0) {
    avgGain /= validChangesCount;
    avgLoss /= validChangesCount;
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(NaN);
    } else if (i === period) {
      const rs = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    } else {
      const change = changes[i - 1];
      if (isNaN(change)) {
        result.push(NaN);
      } else {
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  return result;
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA.map((f, i) => (isNaN(f) || isNaN(slowEMA[i]) ? NaN : f - slowEMA[i]));
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((m, i) => (isNaN(m) || isNaN(signalLine[i]) ? NaN : m - signalLine[i]));

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  standardDeviations: number = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  let sum = 0;
  let sumSq = 0;
  let validCount = 0;

  for (let i = 0; i < prices.length; i++) {
    const val = _getValidPrice(prices[i]);
    if (!isNaN(val)) {
      sum += val;
      sumSq += val * val;
      validCount++;
    }

    if (i >= period) {
      const oldVal = _getValidPrice(prices[i - period]);
      if (!isNaN(oldVal)) {
        sum -= oldVal;
        sumSq -= oldVal * oldVal;
        validCount--;
      }
    }

    if (i < period - 1 || validCount !== period) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
    } else {
      const mean = sum / period;
      const variance = Math.max(0, sumSq / period - mean * mean);
      const stdDev = Math.sqrt(variance);
      middle.push(mean);
      upper.push(mean + standardDeviations * stdDev);
      lower.push(mean - standardDeviations * stdDev);
    }
  }
  return { upper, middle, lower };
}

/**
 * Calculate Average True Range (ATR)
 * Supports two signatures:
 * 1. (data: OHLCV[], period?: number)
 * 2. (highs: number[], lows: number[], closes: number[], period?: number)
 */
export function calculateATR(dataOrHighs: OHLCV[] | number[], periodOrLows?: number | number[], maybeCloses?: number[], maybePeriod?: number): number[] {
  let highs: number[];
  let lows: number[];
  let closes: number[];
  let period: number;

  if (Array.isArray(dataOrHighs) && typeof dataOrHighs[0] === 'object') {
    // Signature 1: (data: OHLCV[], period?: number)
    const data = dataOrHighs as OHLCV[];
    highs = data.map(d => d.high);
    lows = data.map(d => d.low);
    closes = data.map(d => d.close);
    period = (periodOrLows as number) ?? 14;
  } else {
    // Signature 2: (highs: number[], lows: number[], closes: number[], period?: number)
    highs = dataOrHighs as number[];
    lows = periodOrLows as number[];
    closes = maybeCloses as number[];
    period = maybePeriod ?? 14;
  }

  const result: number[] = [];
  let sum = 0;
  let validCount = 0;
  const trueRanges: number[] = [];

  for (let i = 0; i < highs.length; i++) {
    let tr = NaN;
    if (i === 0) {
      tr = highs[i] - lows[i];
    } else {
      tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
    }
    trueRanges.push(tr);

    if (i < period) {
      if (!isNaN(tr)) {
        sum += tr;
        validCount++;
      }
      result.push(NaN);
      if (i === period - 1) {
        result[i] = validCount === period ? sum / period : NaN;
      }
    } else {
      if (!isNaN(tr) && !isNaN(result[i - 1])) {
        result.push((result[i - 1] * (period - 1) + tr) / period);
      } else {
        result.push(NaN);
      }
    }
  }
  return result;
}

/**
 * Calculate Average Directional Index (ADX)
 */
export function calculateADX(data: OHLCV[], period: number = 14): number[] {
  const adx: number[] = [];
  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  const tr: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;
    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    ));
  }
  
  let avgTR = 0, avgDMPlus = 0, avgDMMinus = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period) {
      avgTR += tr[i];
      avgDMPlus += dmPlus[i];
      avgDMMinus += dmMinus[i];
      adx.push(NaN);
    } else if (i === period) {
      const diPlus = (avgDMPlus / avgTR) * 100;
      const diMinus = (avgDMMinus / avgTR) * 100;
      adx.push((Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100);
    } else {
      avgTR = avgTR - (avgTR / period) + tr[i];
      avgDMPlus = avgDMPlus - (avgDMPlus / period) + dmPlus[i];
      avgDMMinus = avgDMMinus - (avgDMMinus / period) + dmMinus[i];
      const diPlus = (avgDMPlus / avgTR) * 100;
      const diMinus = (avgDMMinus / avgTR) * 100;
      const dx = (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
      adx.push((adx[adx.length - 1] * (period - 1) + dx) / period);
    }
  }
  adx.unshift(NaN);
  return adx;
}