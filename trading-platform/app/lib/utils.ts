import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: 'JPY' | 'USD' = 'JPY'): string {
  if (currency === 'JPY') {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
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
  if (change > 0) return 'text-green-500';
  if (change < 0) return 'text-red-500';
  return 'text-gray-400';
}

export function getSignalColor(signal: 'BUY' | 'SELL' | 'HOLD'): string {
  switch (signal) {
    case 'BUY':
      return 'text-green-500 bg-green-500/10';
    case 'SELL':
      return 'text-red-500 bg-red-500/10';
    case 'HOLD':
      return 'text-gray-400 bg-gray-400/10';
  }
}

export function getSignalBgColor(signal: 'BUY' | 'SELL' | 'HOLD'): string {
  switch (signal) {
    case 'BUY':
      return 'bg-green-500/20 border-green-500';
    case 'SELL':
      return 'bg-red-500/20 border-red-500';
    case 'HOLD':
      return 'bg-gray-500/20 border-gray-500';
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-500';
  if (confidence >= 60) return 'text-yellow-500';
  return 'text-red-500';
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
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export function getTickSize(price: number): number {
  if (price <= 3000) return 1;
  if (price <= 5000) return 5;
  if (price <= 10000) return 10;
  if (price <= 30000) return 50;
  if (price <= 50000) return 100;
  if (price <= 100000) return 500;
  if (price <= 300000) return 1000;
  if (price <= 500000) return 5000;
  if (price <= 1000000) return 10000;
  if (price <= 3000000) return 50000;
  if (price <= 5000000) return 100000;
  return 500000;
}

export function roundToTickSize(price: number, market: 'japan' | 'usa' = 'japan'): number {
  if (market === 'usa') {
    return Number(price.toFixed(2));
  }
  const tickSize = getTickSize(price);
  return Math.round(price / tickSize) * tickSize;
}

export function getPriceLimit(referencePrice: number): number {
  if (referencePrice < 100) return 30;
  if (referencePrice < 200) return 50;
  if (referencePrice < 500) return 80;
  if (referencePrice < 700) return 100;
  if (referencePrice < 1000) return 150;
  if (referencePrice < 1500) return 300;
  if (referencePrice < 2000) return 400;
  if (referencePrice < 3000) return 500;
  if (referencePrice < 5000) return 700;
  if (referencePrice < 7000) return 1000;
  if (referencePrice < 10000) return 1500;
  if (referencePrice < 15000) return 3000;
  if (referencePrice < 20000) return 4000;
  if (referencePrice < 30000) return 5000;
  if (referencePrice < 50000) return 7000;
  if (referencePrice < 70000) return 10000;
  if (referencePrice < 100000) return 15000;
  if (referencePrice < 150000) return 30000;
  if (referencePrice < 200000) return 40000;
  if (referencePrice < 300000) return 50000;
  if (referencePrice < 500000) return 70000;
  if (referencePrice < 700000) return 100000;
  if (referencePrice < 1000000) return 150000;
  return 300000;
}

/**
 * Get the WebSocket URL based on the current environment.
 * Prioritizes process.env.NEXT_PUBLIC_WS_URL, then falls back to window location or localhost.
 * Ensures the protocol matches the current page's security (wss: for https:).
 *
 * @param path - The path to append to the base URL (e.g. '/ws/signals')
 * @returns The complete WebSocket URL
 */
export function getWebSocketUrl(path: string = '/ws/signals'): string {
  // Use environment variable if available (e.g. in production build)
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) {
    // Remove trailing slash if present to avoid double slashes
    const baseUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  // Fallback for development or when env var is not set
  if (typeof window !== 'undefined') {
    // If on client, use secure protocol if page is https
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Default to localhost:8000 for development as backend is often separate
    // In a proxied environment (like production often is), one might use window.location.host
    // But without explicit config, localhost:8000 is the assumed dev default from legacy code.
    return `${protocol}//localhost:8000${path}`;
  }

  return `ws://localhost:8000${path}`;
}

// ============================================
// Technical Indicator Functions
// ============================================

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, p) => sum + p, 0) / period;
      result.push(avg);
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
    changes.push(prices[i] - prices[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Initialize with first period
  for (let i = 0; i < period && i < changes.length; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < prices.length; i++) {
    if (i <= period) {
      result.push(NaN);
    } else if (i === period + 1) {
      const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
      result.push(rsi);
    } else {
      const change = changes[i - 1];
      const gain = change >= 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
      result.push(rsi);
    }
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
function calculateEMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
    result.push(NaN);
  }

  const sma = sum / period;
  result[period - 1] = sma;

  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    const ema = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
    result.push(ema);
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
  signalPeriod: number = 9
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
  standardDeviations: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
      const stdDev = Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / period);

      upper.push(mean + standardDeviations * stdDev);
      lower.push(mean - standardDeviations * stdDev);
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
  period: number = 14
): number[] {
  const trueRanges: number[] = [];

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      trueRanges.push(highs[i] - lows[i]);
    } else {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
  }

  const result: number[] = [];
  let atr = 0;

  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period) {
      atr += trueRanges[i];
      result.push(NaN);
      if (i === period - 1) {
        result[i] = atr / period;
      }
    } else {
      atr = (result[i - 1] * (period - 1) + trueRanges[i]) / period;
      result.push(atr);
    }
  }

  return result;
}