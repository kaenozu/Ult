/**
 * Technical Analysis Utilities
 * 
 * Pure functional implementations of technical indicators.
 * Optimized for performance and accuracy.
 */

import { OHLCV } from '../../types';

/**
 * Internal helper to validate a price value.
 */
export function _getValidPrice(p: number | null | undefined): number {
  return p != null && typeof p === "number" && !isNaN(p) && p >= 0 ? p : NaN;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const length = prices.length;
  // Pre-allocate array for performance
  const result: number[] = new Array(length);
  let sum = 0;
  let validCount = 0;

  // 1. Initial window (0 to period - 1)
  for (let i = 0; i < period && i < length; i++) {
    const val = _getValidPrice(prices[i]);
    if (!isNaN(val)) {
      sum += val;
      validCount++;
    }

    if (i < period - 1) {
      result[i] = NaN;
    } else {
      // i == period - 1
      result[i] = validCount === period ? sum / period : NaN;
    }
  }

  // 2. Main loop (period to end)
  for (let i = period; i < length; i++) {
    // Add new value
    const val = _getValidPrice(prices[i]);
    if (!isNaN(val)) {
      sum += val;
      validCount++;
    }

    // Remove old value
    const oldVal = _getValidPrice(prices[i - period]);
    if (!isNaN(oldVal)) {
      sum -= oldVal;
      validCount--;
    }

    result[i] = validCount === period ? sum / period : NaN;
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const length = prices.length;
  // Pre-allocate array for performance
  const result: number[] = new Array(length);
  const multiplier = 2 / (period + 1);
  let sum = 0;
  let validCount = 0;
  let initialized = false;

  for (let i = 0; i < length; i++) {
    const val = _getValidPrice(prices[i]);

    if (!initialized) {
      if (!isNaN(val)) {
        sum += val;
        validCount++;
      }

      if (validCount === period && !isNaN(val)) {
        result[i] = sum / period;
        initialized = true;
      } else {
        result[i] = NaN;
      }
    } else {
      // Optimization: access previous result directly from array (or use a local var if desired, but array access is fast enough here)
      const prevEMA = result[i - 1];

      if (!isNaN(val) && !isNaN(prevEMA)) {
        result[i] = (val - prevEMA) * multiplier + prevEMA;
      } else {
        result[i] = NaN;
      }
    }
  }
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const length = prices.length;
  // Pre-allocate array for performance (~30% boost)
  const result: number[] = new Array(length);

  if (length <= period) {
    // Fill with NaN if not enough data
    for (let i = 0; i < length; i++) result[i] = NaN;
    return result;
  }

  // 1. Initialize first 'period' elements with NaN
  for (let i = 0; i < period; i++) {
    result[i] = NaN;
  }

  let avgGain = 0;
  let avgLoss = 0;
  let validChangesCount = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const valCurrent = _getValidPrice(prices[i]);
    const valPrev = _getValidPrice(prices[i - 1]);

    if (!isNaN(valCurrent) && !isNaN(valPrev)) {
      const change = valCurrent - valPrev;
      if (change >= 0) avgGain += change;
      else avgLoss += Math.abs(change);
      validChangesCount++;
    }
  }

  if (validChangesCount > 0) {
    avgGain /= validChangesCount;
    avgLoss /= validChangesCount;
  }

  // Handle the first RSI point (at index = period)
  const rsInitial = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : avgGain / avgLoss;
  result[period] = 100 - (100 / (1 + rsInitial));

  // 2. Main loop from period + 1 to end
  for (let i = period + 1; i < length; i++) {
    const valCurrent = _getValidPrice(prices[i]);
    const valPrev = _getValidPrice(prices[i - 1]);

    if (isNaN(valCurrent) || isNaN(valPrev)) {
      result[i] = NaN;
    } else {
      const change = valCurrent - valPrev;
      const gain = change >= 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? (avgGain === 0 ? 0 : 100) : avgGain / avgLoss;

      if (avgLoss === 0 && avgGain === 0) {
        result[i] = 50;
      } else {
        result[i] = 100 - (100 / (1 + rs));
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
  const length = prices.length;
  // Pre-allocate arrays for better performance
  const upper: number[] = new Array(length);
  const middle: number[] = new Array(length);
  const lower: number[] = new Array(length);

  let sum = 0;
  let sumSq = 0;
  let validCount = 0;

  // Initial window loop
  const initialLimit = Math.min(length, period);
  for (let i = 0; i < initialLimit; i++) {
    const val = _getValidPrice(prices[i]);
    if (!isNaN(val)) {
      sum += val;
      sumSq += val * val;
      validCount++;
    }

    if (i === period - 1 && validCount === period) {
      const mean = sum / period;
      const variance = Math.max(0, sumSq / period - mean * mean);
      const stdDev = Math.sqrt(variance);
      middle[i] = mean;
      upper[i] = mean + standardDeviations * stdDev;
      lower[i] = mean - standardDeviations * stdDev;
    } else {
      middle[i] = NaN;
      upper[i] = NaN;
      lower[i] = NaN;
    }
  }

  // Rolling window loop
  for (let i = period; i < length; i++) {
    const val = _getValidPrice(prices[i]);
    if (!isNaN(val)) {
      sum += val;
      sumSq += val * val;
      validCount++;
    }

    const oldVal = _getValidPrice(prices[i - period]);
    if (!isNaN(oldVal)) {
      sum -= oldVal;
      sumSq -= oldVal * oldVal;
      validCount--;
    }

    if (validCount === period) {
      const mean = sum / period;
      const variance = Math.max(0, sumSq / period - mean * mean);
      const stdDev = Math.sqrt(variance);
      middle[i] = mean;
      upper[i] = mean + standardDeviations * stdDev;
      lower[i] = mean - standardDeviations * stdDev;
    } else {
      middle[i] = NaN;
      upper[i] = NaN;
      lower[i] = NaN;
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
  let period: number;
  let isObjectArray = false;
  let data: OHLCV[] = [];
  let highs: number[] = [];
  let lows: number[] = [];
  let closes: number[] = [];

  if (Array.isArray(dataOrHighs) && typeof dataOrHighs[0] === 'object') {
    // Signature 1: (data: OHLCV[], period?: number)
    isObjectArray = true;
    data = dataOrHighs as OHLCV[];
    period = (periodOrLows as number) ?? 14;
  } else {
    // Signature 2: (highs: number[], lows: number[], closes: number[], period?: number)
    highs = dataOrHighs as number[];
    lows = periodOrLows as number[];
    closes = maybeCloses as number[];
    period = maybePeriod ?? 14;
  }

  const length = isObjectArray ? data.length : highs.length;
  // Pre-allocate array for performance (~30% boost)
  const result: number[] = new Array(length);
  let sum = 0;
  let validCount = 0;

  if (isObjectArray) {
    // Initial loop
    for (let i = 0; i < length && i < period; i++) {
      const currentHigh = data[i].high;
      const currentLow = data[i].low;
      let tr = NaN;

      if (i === 0) {
        tr = currentHigh - currentLow;
      } else {
        const prevClose = data[i - 1].close;
        tr = Math.max(
          currentHigh - currentLow,
          Math.abs(currentHigh - prevClose),
          Math.abs(currentLow - prevClose)
        );
      }

      if (!isNaN(tr)) {
        sum += tr;
        validCount++;
      }
      result[i] = NaN;

      if (i === period - 1) {
        result[i] = validCount === period ? sum / period : NaN;
      }
    }

    // Remaining loop
    for (let i = period; i < length; i++) {
      const currentHigh = data[i].high;
      const currentLow = data[i].low;
      const prevClose = data[i - 1].close;
      const tr = Math.max(
        currentHigh - currentLow,
        Math.abs(currentHigh - prevClose),
        Math.abs(currentLow - prevClose)
      );

      const prevResult = result[i - 1];
      if (!isNaN(tr) && !isNaN(prevResult)) {
        result[i] = (prevResult * (period - 1) + tr) / period;
      } else {
        result[i] = NaN;
      }
    }
  } else {
    // Initial loop
    for (let i = 0; i < length && i < period; i++) {
      const currentHigh = highs[i];
      const currentLow = lows[i];
      let tr = NaN;

      if (i === 0) {
        tr = currentHigh - currentLow;
      } else {
        const prevClose = closes[i - 1];
        tr = Math.max(
          currentHigh - currentLow,
          Math.abs(currentHigh - prevClose),
          Math.abs(currentLow - prevClose)
        );
      }

      if (!isNaN(tr)) {
        sum += tr;
        validCount++;
      }
      result[i] = NaN;

      if (i === period - 1) {
        result[i] = validCount === period ? sum / period : NaN;
      }
    }

    // Remaining loop
    for (let i = period; i < length; i++) {
      const currentHigh = highs[i];
      const currentLow = lows[i];
      const prevClose = closes[i - 1];

      const tr = Math.max(
        currentHigh - currentLow,
        Math.abs(currentHigh - prevClose),
        Math.abs(currentLow - prevClose)
      );

      const prevResult = result[i - 1];
      if (!isNaN(tr) && !isNaN(prevResult)) {
        result[i] = (prevResult * (period - 1) + tr) / period;
      } else {
        result[i] = NaN;
      }
    }
  }

  return result;
}

/**
 * Calculate Average Directional Index (ADX)
 */
export function calculateADX(data: OHLCV[], period: number = 14): number[] {
  const adx: number[] = [NaN];
  let avgTR = 0, avgDMPlus = 0, avgDMMinus = 0;

  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;

    const dmPlus = upMove > downMove && upMove > 0 ? upMove : 0;
    const dmMinus = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );

    if (i <= period) {
      avgTR += tr;
      avgDMPlus += dmPlus;
      avgDMMinus += dmMinus;
      adx.push(NaN);
    } else if (i === period + 1) {
      const diPlus = (avgDMPlus / avgTR) * 100;
      const diMinus = (avgDMMinus / avgTR) * 100;
      const dx = (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
      adx.push(dx);
      // Note: In original implementation, tr[period] (which corresponds to i=period+1 here)
      // was skipped from average updates. Preserving this behavior.
    } else {
      avgTR = avgTR - (avgTR / period) + tr;
      avgDMPlus = avgDMPlus - (avgDMPlus / period) + dmPlus;
      avgDMMinus = avgDMMinus - (avgDMMinus / period) + dmMinus;
      const diPlus = (avgDMPlus / avgTR) * 100;
      const diMinus = (avgDMMinus / avgTR) * 100;
      const dx = (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
      adx.push((adx[adx.length - 1] * (period - 1) + dx) / period);
    }
  }
  return adx;
}
