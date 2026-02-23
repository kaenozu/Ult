import { OHLCV } from '@/app/types';
import { calculateStandardDeviation } from './utils';

export function calculateZigZag(prices: number[], threshold: number): { trend: number; strength: number; reversalProb: number } {
  if (prices.length < 3) {
    return { trend: 0, strength: 0, reversalProb: 0.5 };
  }

  let direction = 0;
  let lastPeak = prices[0];
  let swingCount = 0;

  for (let i = 1; i < prices.length; i++) {
    const change = (prices[i] - lastPeak) / lastPeak;
    
    if (change > threshold) {
      direction = 1;
      lastPeak = prices[i];
      swingCount++;
    } else if (change < -threshold) {
      direction = -1;
      lastPeak = prices[i];
      swingCount++;
    }
  }

  const currentPrice = prices[prices.length - 1];
  const recentRange = Math.max(...prices.slice(-10)) - Math.min(...prices.slice(-10));
  const strength = recentRange > 0 ? Math.abs(currentPrice - prices[prices.length - 10]) / recentRange : 0;
  
  const reversalProb = Math.min(swingCount / 10, 0.9);

  return { trend: direction, strength, reversalProb };
}

export function calculateSMA(values: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(undefined);
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}

export function calculateTrendConsistency(prices: number[]): number {
  if (prices.length < 5) return 0;

  const sma = calculateSMA(prices, 5);
  let consistentCount = 0;
  let totalCount = 0;

  for (let i = 5; i < prices.length; i++) {
    if (sma[i] !== undefined && sma[i - 1] !== undefined) {
      const priceAboveSma = prices[i] > (sma[i] ?? 0);
      const prevPriceAboveSma = prices[i - 1] > (sma[i - 1] ?? 0);
      
      if (priceAboveSma === prevPriceAboveSma) {
        consistentCount++;
      }
      totalCount++;
    }
  }

  return totalCount > 0 ? consistentCount / totalCount : 0;
}

export function calculateTrendAcceleration(prices: number[]): number {
  if (prices.length < 10) return 0;

  const recentPrices = prices.slice(-10);
  const firstHalf = recentPrices.slice(0, 5);
  const secondHalf = recentPrices.slice(5);

  const firstChange = (firstHalf[firstHalf.length - 1] - firstHalf[0]) / firstHalf[0];
  const secondChange = (secondHalf[secondHalf.length - 1] - secondHalf[0]) / secondHalf[0];

  return secondChange - firstChange;
}

export function calculateSupportResistance(data: OHLCV[]): { level: number; support: number; resistance: number } {
  if (data.length < 20) {
    const price = data[data.length - 1].close;
    return { level: price, support: price * 0.95, resistance: price * 1.05 };
  }

  const recentData = data.slice(-20);
  const lows = recentData.map(d => d.low);
  const highs = recentData.map(d => d.high);

  const support = Math.min(...lows);
  const resistance = Math.max(...highs);
  const currentPrice = data[data.length - 1].close;

  return { level: currentPrice, support, resistance };
}

export function detectConsolidation(prices: number[]): number {
  if (prices.length < 10) return 0;

  const recentPrices = prices.slice(-10);
  const high = Math.max(...recentPrices);
  const low = Math.min(...recentPrices);
  const range = high - low;
  const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

  return range / avgPrice < 0.02 ? 1 : 0;
}

export function calculateBreakoutPotential(data: OHLCV[]): number {
  if (data.length < 20) return 0;

  const recentData = data.slice(-20);
  const volumes = recentData.map(d => d.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const currentVolume = volumes[volumes.length - 1];

  const volumeRatio = currentVolume / (avgVolume || 1);
  const prices = recentData.map(d => d.close);
  const volatility = calculateStandardDeviation(prices) / (prices[prices.length - 1] || 1);

  return Math.min((volumeRatio - 1) * volatility * 10, 1);
}
