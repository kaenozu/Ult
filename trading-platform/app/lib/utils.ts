import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatSymbol(symbol: string, market?: string): string {
  if (symbol.startsWith('^')) {
    return symbol;
  }
  if (market === 'japan' || (symbol.match(/^\d{4}$/) && !symbol.endsWith('.T'))) {
    return symbol.endsWith('.T') ? symbol : `${symbol}.T`;
  }
  return symbol;
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
 * 価格配列からリターン（騰落率）の配列を計算する
 */
export function calculateReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev === 0 || isNaN(prev) || isNaN(curr)) {
      returns.push(0);
    } else {
      returns.push((curr - prev) / prev);
    }
  }
  return returns;
}

// Re-export core technical analysis functions for backward compatibility
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateADX
} from './utils/technical-analysis';
