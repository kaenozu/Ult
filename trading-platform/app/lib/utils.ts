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