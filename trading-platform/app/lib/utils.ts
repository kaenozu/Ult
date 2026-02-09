import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TECHNICAL_INDICATORS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyCode = "JPY" | "USD" | "EUR" | "GBP";

export function formatCurrency(
  value: number,
  currency: CurrencyCode = "JPY",
): string {
  const currencyConfig: Record<
    CurrencyCode,
    { locale: string; fractionDigits: number }
  > = {
    JPY: { locale: "ja-JP", fractionDigits: 0 },
    USD: { locale: "en-US", fractionDigits: 2 },
    EUR: { locale: "de-DE", fractionDigits: 2 },
    GBP: { locale: "en-GB", fractionDigits: 2 },
  };

  const config = currencyConfig[currency];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

export function getChangeColor(change: number): string {
  if (change > 0) return "text-green-500";
  if (change < 0) return "text-red-500";
  return "text-gray-400";
}

export function getSignalColor(signal: "BUY" | "SELL" | "HOLD"): string {
  switch (signal) {
    case "BUY":
      return "text-green-500 bg-green-500/10";
    case "SELL":
      return "text-red-500 bg-red-500/10";
    case "HOLD":
      return "text-gray-400 bg-gray-400/10";
  }
}

export function getSignalBgColor(signal: "BUY" | "SELL" | "HOLD"): string {
  switch (signal) {
    case "BUY":
      return "bg-green-500/20 border-green-500";
    case "SELL":
      return "bg-red-500/20 border-red-500";
    case "HOLD":
      return "bg-gray-500/20 border-gray-500";
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-green-500";
  if (confidence >= 60) return "text-yellow-500";
  return "text-red-500";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

export function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

export type MarketType = "japan" | "usa";

/**
 * Get the tick size for a given price
 * Supports both Japanese and US stock markets
 */
const TICK_SIZE_THRESHOLDS = [
  { max: 3000, value: 1 },
  { max: 5000, value: 5 },
  { max: 10000, value: 10 },
  { max: 30000, value: 50 },
  { max: 50000, value: 100 },
  { max: 100000, value: 500 },
  { max: 300000, value: 1000 },
  { max: 500000, value: 5000 },
  { max: 1000000, value: 10000 },
  { max: 3000000, value: 50000 },
  { max: 5000000, value: 100000 },
] as const;

const DEFAULT_LARGE_TICK_SIZE = 500000;

function getThresholdValue<T>(
  value: number,
  thresholds: readonly { max: number; value: T }[],
  defaultValue: T,
): T {
  for (const { max, value: threshold } of thresholds) {
    if (value <= max) return threshold;
  }
  return defaultValue;
}

export function getTickSize(
  price: number,
  market: MarketType = "japan",
): number {
  if (market === "usa") {
    return 0.01;
  }
  return getThresholdValue(
    price,
    TICK_SIZE_THRESHOLDS,
    DEFAULT_LARGE_TICK_SIZE,
  );
}

export function roundToTickSize(
  price: number,
  market: MarketType = "japan",
): number {
  const tickSize = getTickSize(price, market);
  return Math.round(price / tickSize) * tickSize;
}

// Threshold configuration for price limits
const PRICE_LIMIT_THRESHOLDS = [
  { max: 100, value: 30 },
  { max: 200, value: 50 },
  { max: 500, value: 80 },
  { max: 700, value: 100 },
  { max: 1000, value: 150 },
  { max: 1500, value: 300 },
  { max: 2000, value: 400 },
  { max: 3000, value: 500 },
  { max: 5000, value: 700 },
  { max: 7000, value: 1000 },
  { max: 10000, value: 1500 },
  { max: 15000, value: 3000 },
  { max: 20000, value: 4000 },
  { max: 30000, value: 5000 },
  { max: 50000, value: 7000 },
  { max: 70000, value: 10000 },
  { max: 100000, value: 15000 },
  { max: 150000, value: 30000 },
  { max: 200000, value: 40000 },
  { max: 300000, value: 50000 },
  { max: 500000, value: 70000 },
  { max: 700000, value: 100000 },
  { max: 1000000, value: 150000 },
] as const;

const DEFAULT_PRICE_LIMIT = 300000;

export function getPriceLimit(referencePrice: number): number {
  return getThresholdValue(
    referencePrice,
    PRICE_LIMIT_THRESHOLDS,
    DEFAULT_PRICE_LIMIT,
  );
}

/**
 * Internal helper to validate a price value.
 * Consistent with project-wide technical analysis logic.
 */
function _getValidPrice(p: number | null | undefined): number {
  return p != null && typeof p === "number" && !isNaN(p) && p > 0 ? p : NaN;
}

/**
 * Calculate returns from a series of prices
 */
export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0 && !isNaN(prices[i]) && !isNaN(prices[i - 1])) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(ret);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

// ============================================
// Technical Indicator Functions
// ============================================

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
      if (validCount === period) {
        result.push(sum / period);
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

    if (!isNaN(valCurrent) && !isNaN(valPrev)) {
      changes.push(valCurrent - valPrev);
    } else {
      changes.push(NaN);
    }
  }

  let avgGain = 0;
  let avgLoss = 0;

  let validChangesCount = 0;
  for (let i = 0; i < period && i < changes.length; i++) {
    if (!isNaN(changes[i])) {
      if (changes[i] >= 0) {
        avgGain += changes[i];
      } else {
        avgLoss += Math.abs(changes[i]);
      }
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
      let rsi;
      if (avgLoss === 0) {
        rsi = avgGain === 0 ? 50 : 100;
      } else {
        rsi = 100 - 100 / (1 + avgGain / avgLoss);
      }
      result.push(isFinite(rsi) ? rsi : NaN);
    } else {
      const change = changes[i - 1];

      if (isNaN(change)) {
        result.push(NaN);
      } else {
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        let rsi;
        if (avgLoss === 0) {
          rsi = avgGain === 0 ? 50 : 100;
        } else {
          rsi = 100 - 100 / (1 + avgGain / avgLoss);
        }
        result.push(isFinite(rsi) ? rsi : NaN);
      }
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
        const sma = sum / period;
        result.push(sma);
        initialized = true;
      } else {
        result.push(NaN);
      }
    } else {
      if (!isNaN(val) && !isNaN(result[i - 1])) {
        const ema = (val - result[i - 1]) * multiplier + result[i - 1];
        result.push(ema);
      } else {
        result.push(NaN);
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

  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);

  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Calculate Bollinger Bands
 * Optimized to use O(N) single-pass calculation for both SMA and Standard Deviation.
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

    if (i < period - 1) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
    } else {
      if (validCount === period) {
        const mean = sum / period;
        const variance = sumSq / period - mean * mean;
        const stdDev = Math.sqrt(Math.max(0, variance));

        middle.push(mean);
        upper.push(mean + standardDeviations * stdDev);
        lower.push(mean - standardDeviations * stdDev);
      } else {
        upper.push(NaN);
        middle.push(NaN);
        lower.push(NaN);
      }
    }
  }

  return { upper, middle, lower };
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
): number[] {
  const result: number[] = [];
  const length = highs.length;

  let sum = 0;
  let validCount = 0;

  for (let i = 0; i < length; i++) {
    const valHigh = _getValidPrice(highs[i]);
    const valLow = _getValidPrice(lows[i]);

    let valPrevClose = NaN;
    if (i > 0) {
      valPrevClose = _getValidPrice(closes[i - 1]);
    }

    let tr = NaN;
    if (i === 0) {
      if (!isNaN(valHigh) && !isNaN(valLow)) {
        tr = valHigh - valLow;
      }
    } else {
      if (!isNaN(valHigh) && !isNaN(valLow) && !isNaN(valPrevClose)) {
        tr = Math.max(
          valHigh - valLow,
          Math.abs(valHigh - valPrevClose),
          Math.abs(valLow - valPrevClose),
        );
      }
    }

    if (i < period) {
      if (!isNaN(tr)) {
        sum += tr;
        validCount++;
      }
      result.push(NaN);

      if (i === period - 1) {
        result[i] = validCount >= period ? sum / validCount : NaN;
      }
    } else {
      if (isNaN(tr)) {
        result.push(NaN);
      } else if (!isNaN(result[i - 1])) {
        const atr = (result[i - 1] * (period - 1) + tr) / period;
        result.push(atr);
      } else {
        result.push(NaN);
      }
    }
  }

  return result;
}