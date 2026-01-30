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
  // 有効な数値のみを含む配列を作成（NaN、null、undefined、負の値を除外）
  const validPrices = prices.map(p => (p != null && typeof p === 'number' && !isNaN(p) && p > 0) ? p : NaN);
  
  for (let i = 0; i < validPrices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = validPrices.slice(i - period + 1, i + 1);
      // 有効な値のみを合計
      const validValues = slice.filter(val => !isNaN(val));
      if (validValues.length < period) {
        // 期間内のデータが不足している場合はNaNを返す
        result.push(NaN);
      } else {
        const avg = validValues.reduce((sum, p) => sum + p, 0) / period;
        result.push(avg);
      }
    }
  }
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  // 有効な数値のみを含む配列を作成（NaN、null、undefined、負の値を除外）
  const validPrices = prices.map(p => (p != null && typeof p === 'number' && !isNaN(p) && p > 0) ? p : NaN);
  const result: number[] = [];
  const changes: number[] = [];

  for (let i = 1; i < validPrices.length; i++) {
    // 有効な価格データのみで変化量を計算
    if (!isNaN(validPrices[i]) && !isNaN(validPrices[i - 1])) {
      changes.push(validPrices[i] - validPrices[i - 1]);
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

  for (let i = 0; i < validPrices.length; i++) {
    if (i <= period) {
      result.push(NaN);
    } else if (i === period + 1) {
      const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
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

        const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
        result.push(isFinite(rsi) ? rsi : NaN);
      }
    }
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
function calculateEMA(prices: number[], period: number): number[] {
  // 有効な数値のみを含む配列を作成（NaN、null、undefined、負の値を除外）
  const validPrices = prices.map(p => (p != null && typeof p === 'number' && !isNaN(p) && p > 0) ? p : NaN);
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // 有効な価格データのみでSMAを計算
  let sum = 0;
  let validCount = 0;
  for (let i = 0; i < period && i < validPrices.length; i++) {
    if (!isNaN(validPrices[i])) {
      sum += validPrices[i];
      validCount++;
    }
    result.push(NaN);
  }

  // 有効なデータが十分にある場合のみSMAを計算
  if (validCount >= period) {
    const sma = sum / validCount;
    result[period - 1] = sma;

    // Calculate EMA
    for (let i = period; i < validPrices.length; i++) {
      if (isNaN(validPrices[i])) {
        result.push(NaN);
      } else if (!isNaN(result[i - 1])) {
        const ema = (validPrices[i] - result[i - 1]) * multiplier + result[i - 1];
        result.push(ema);
      } else {
        result.push(NaN);
      }
    }
  } else {
    // 有効なデータが不足している場合はすべてNaN
    for (let i = period; i < validPrices.length; i++) {
      result.push(NaN);
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

  // 有効な数値のみを含む配列を作成
  const validPrices = prices.map(p => (p != null && typeof p === 'number' && !isNaN(p) && p > 0) ? p : NaN);

  for (let i = 0; i < validPrices.length; i++) {
    if (i < period - 1 || isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = validPrices.slice(i - period + 1, i + 1);
      const mean = middle[i];
      
      // 有効な価格データのみで標準偏差を計算
      const validSlice = slice.filter(p => !isNaN(p));
      if (validSlice.length < period) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const squaredDiffs = validSlice.map(p => Math.pow(p - mean, 2));
        const stdDev = Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / period);

        upper.push(mean + standardDeviations * stdDev);
        lower.push(mean - standardDeviations * stdDev);
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
  period: number = 14
): number[] {
  // 有効な数値のみを含む配列を作成（NaN、null、undefined、負の値を除外）
  const validHighs = highs.map(h => (h != null && typeof h === 'number' && !isNaN(h) && h > 0) ? h : NaN);
  const validLows = lows.map(l => (l != null && typeof l === 'number' && !isNaN(l) && l > 0) ? l : NaN);
  const validCloses = closes.map(c => (c != null && typeof c === 'number' && !isNaN(c) && c > 0) ? c : NaN);

  const trueRanges: number[] = [];

  for (let i = 0; i < validHighs.length; i++) {
    if (i === 0) {
      // 初期値：high - low（ただし、有効な値のみ使用）
      if (!isNaN(validHighs[i]) && !isNaN(validLows[i])) {
        trueRanges.push(validHighs[i] - validLows[i]);
      } else {
        trueRanges.push(NaN);
      }
    } else {
      // 有効な値がない場合はNaN
      if (!isNaN(validHighs[i]) && !isNaN(validLows[i]) && !isNaN(validCloses[i - 1])) {
        const tr = Math.max(
          validHighs[i] - validLows[i],
          Math.abs(validHighs[i] - validCloses[i - 1]),
          Math.abs(validLows[i] - validCloses[i - 1])
        );
        trueRanges.push(tr);
      } else {
        trueRanges.push(NaN);
      }
    }
  }

  const result: number[] = [];
  let sum = 0;
  let validCount = 0;

  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period) {
      // 有効なTrue Rangeのみを合計
      if (!isNaN(trueRanges[i])) {
        sum += trueRanges[i];
        validCount++;
      }
      result.push(NaN);
      
      // 有効なデータが十分に蓄積されたら初期ATRを計算
      if (i === period - 1) {
        if (validCount >= period) {
          result[i] = sum / validCount;
        } else {
          // 有効なデータが不足している場合はNaN
          result[i] = NaN;
        }
      }
    } else {
      // 有効なTrue Rangeがある場合のみ計算を継続
      if (isNaN(trueRanges[i])) {
        result.push(NaN);
      } else if (!isNaN(result[i - 1])) {
        // ATR = [(Prior ATR × (period-1)) + Current TR] / period
        const atr = (result[i - 1] * (period - 1) + trueRanges[i]) / period;
        result.push(atr);
      } else {
        // 以前のATRが無効な場合は現在のTRもNaNにする
        result.push(NaN);
      }
    }
  }

  return result;
}
