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
 *
 * Japanese stock tick sizes follow Tokyo Stock Exchange rules:
 * - Price ≤ ¥3,000: ¥1
 * - Price ≤ ¥5,000: ¥5
 * - Price ≤ ¥10,000: ¥10
 * - Price ≤ ¥30,000: ¥50
 * - Price ≤ ¥50,000: ¥100
 * - Price ≤ ¥100,000: ¥500
 * - Price ≤ ¥300,000: ¥1,000
 * - Price ≤ ¥500,000: ¥5,000
 * - Price ≤ ¥1,000,000: ¥10,000
 * - Price ≤ ¥3,000,000: ¥50,000
 * - Price ≤ ¥5,000,000: ¥100,000
 * - Price > ¥5,000,000: ¥500,000
 *
 * US stocks typically use $0.01 (1 cent) tick size
 */
// Threshold configuration for tick sizes (TSE rules)
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
  if (market === "usa") {
    return Math.round(price / tickSize) * tickSize;
  }
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
    // Add new value (check validity inline)
    const p = prices[i];
    const val =
      p != null && typeof p === "number" && !isNaN(p) && p > 0 ? p : NaN;

    if (!isNaN(val)) {
      sum += val;
      validCount++;
    }

    // Remove old value
    if (i >= period) {
      const oldP = prices[i - period];
      const oldVal =
        oldP != null && typeof oldP === "number" && !isNaN(oldP) && oldP > 0
          ? oldP
          : NaN;
      if (!isNaN(oldVal)) {
        sum -= oldVal;
        validCount--;
      }
    }

    if (i < period - 1) {
      result.push(NaN);
    } else {
      // Check if we have enough valid values (must have NO NaNs in the window)
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
    // 有効な価格データのみで変化量を計算
    const pCurrent = prices[i];
    const valCurrent =
      pCurrent != null &&
      typeof pCurrent === "number" &&
      !isNaN(pCurrent) &&
      pCurrent > 0
        ? pCurrent
        : NaN;

    const pPrev = prices[i - 1];
    const valPrev =
      pPrev != null && typeof pPrev === "number" && !isNaN(pPrev) && pPrev > 0
        ? pPrev
        : NaN;

    if (!isNaN(valCurrent) && !isNaN(valPrev)) {
      changes.push(valCurrent - valPrev);
    } else {
      changes.push(NaN); // 無効なデータの場合はNaNを挿入
    }
  }

  let avgGain = 0;
  let avgLoss = 0;

  // 有効な変化量のみを使用して初期化
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

  // 有効な変化量がある場合のみ平均を計算
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

      // 無効な変化量の場合はNaNを返す
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
    const p = prices[i];
    const val =
      p != null && typeof p === "number" && !isNaN(p) && p > 0 ? p : NaN;

    if (!initialized) {
      // Not initialized yet, try to build SMA
      if (!isNaN(val)) {
        sum += val;
        validCount++;
      }

      // We push NaN until we hit the 'period'-th valid value
      if (validCount === period && !isNaN(val)) {
        // Note: validCount increments even if we don't push value, but we only init when we have 'period' valid values
        // Wait, if we have [10, NaN, 20]. period=2.
        // i=0: sum=10. count=1.
        // i=1: sum=10. count=1.
        // i=2: sum=30. count=2. Init!
        const sma = sum / period;
        result.push(sma);
        initialized = true;
      } else {
        result.push(NaN);
      }
    } else {
      // Initialized
      if (!isNaN(val) && !isNaN(result[i - 1])) {
        const ema = (val - result[i - 1]) * multiplier + result[i - 1];
        result.push(ema);
      } else {
        // If current value is invalid, we can't update EMA properly.
        // Option: Propagate NaN, or hold previous value.
        // Propagating NaN is safer to indicate missing data.
        result.push(NaN);
        // NOTE: Once NaN is pushed, next iteration result[i-1] is NaN, so it propagates NaN forever?
        // This might be undesirable if data comes back.
        // If data comes back, maybe we should re-initialize?
        // For now, let's just push NaN. Robust re-init is complex.
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
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  standardDeviations: number = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1 || isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const mean = middle[i];
      let sumSq = 0;
      let validCount = 0;

      // Calculate variance directly without array allocation
      for (let j = 0; j < period; j++) {
        const p = prices[i - j];
        const val =
          p != null && typeof p === "number" && !isNaN(p) && p > 0 ? p : NaN;
        if (!isNaN(val)) {
          const diff = val - mean;
          sumSq += diff * diff;
          validCount++;
        }
      }

      if (validCount < period) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const stdDev = Math.sqrt(sumSq / period);
        upper.push(mean + standardDeviations * stdDev);
        lower.push(mean - standardDeviations * stdDev);
      }
    }
  }

  return { upper, middle, lower };
}

/**
 * Calculate Average True Range (ATR)
 * Optimized to reduce memory allocation by performing inline validation and calculation.
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
    // 1. Validate inputs inline
    const h = highs[i];
    const valHigh =
      h != null && typeof h === "number" && !isNaN(h) && h > 0 ? h : NaN;

    const l = lows[i];
    const valLow =
      l != null && typeof l === "number" && !isNaN(l) && l > 0 ? l : NaN;

    // Previous close is needed for i > 0
    let valPrevClose = NaN;
    if (i > 0) {
      const cPrev = closes[i - 1];
      valPrevClose =
        cPrev != null && typeof cPrev === "number" && !isNaN(cPrev) && cPrev > 0
          ? cPrev
          : NaN;
    }

    // 2. Calculate True Range
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

    // 3. Calculate ATR
    if (i < period) {
      // Accumulate for initial SMA
      if (!isNaN(tr)) {
        sum += tr;
        validCount++;
      }
      result.push(NaN);

      // Check if we can initialize at period-1
      if (i === period - 1) {
        if (validCount >= period) {
          result[i] = sum / validCount;
        } else {
          result[i] = NaN;
        }
      }
    } else {
      // Smoothing: (Prior ATR * (period-1) + Current TR) / period
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
