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

export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  let initialSMA = sum / period;
  ema.push(initialSMA);

  for (let i = period; i < prices.length; i++) {
    const emaValue = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(emaValue);
  }

  while (ema.length < prices.length) {
    ema.unshift(NaN);
  }

  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(NaN);
    } else if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / (avgLoss || 0.0001);
      rsi.push(100 - 100 / (1 + rs));
    } else {
      const prevRSI = rsi[i - 1];
      const currentGain = gains[i - 1];
      const currentLoss = losses[i - 1];
      const avgGain = (gains.slice(i - period, i).reduce((a, b) => a + b, 0) + currentGain) / period;
      const avgLoss = (losses.slice(i - period, i).reduce((a, b) => a + b, 0) + currentLoss) / period;
      const rs = avgGain / (avgLoss || 0.0001);
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  rsi.unshift(NaN);
  return rsi;
}

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

  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalEMA = calculateEMA(validMacd, signalPeriod);

  const signal: number[] = [];
  const histogram: number[] = [];
  let signalIndex = 0;

  for (let i = 0; i < prices.length; i++) {
    if (isNaN(macdLine[i])) {
      signal.push(NaN);
      histogram.push(NaN);
    } else {
      const sigValue = signalEMA[signalIndex];
      signal.push(sigValue);
      histogram.push(macdLine[i] - sigValue);
      signalIndex++;
    }
  }

  return { macd: macdLine, signal, histogram };
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
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
      const std = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }

  return { upper, middle, lower };
}

export function calculateATR(
  ohlcv: { high: number; low: number; close: number }[],
  period: number = 14
): number[] {
  const tr: number[] = [ohlcv[0].high - ohlcv[0].low];
  
  for (let i = 1; i < ohlcv.length; i++) {
    const hl = ohlcv[i].high - ohlcv[i].low;
    const hpc = Math.abs(ohlcv[i].high - ohlcv[i - 1].close);
    const lpc = Math.abs(ohlcv[i].low - ohlcv[i - 1].close);
    tr.push(Math.max(hl, hpc, lpc));
  }

  const atr: number[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    } else {
      const prevATR = atr[i - 1];
      atr.push((prevATR * (period - 1) + tr[i]) / period);
    }
  }

  return atr;
}
