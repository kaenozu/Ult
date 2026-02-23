import { OHLCV } from '@/app/types';
import { calculateCorrelation } from './utils';

export function calculateVolumeTrend(volumes: number[]): number {
  if (volumes.length < 10) return 0;

  const recentVolumes = volumes.slice(-10);
  const firstHalf = recentVolumes.slice(0, 5);
  const secondHalf = recentVolumes.slice(5);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
}

export function calculateVolumeAcceleration(volumes: number[]): number {
  if (volumes.length < 5) return 0;

  const recent = volumes.slice(-5);
  const changes = [];
  
  for (let i = 1; i < recent.length; i++) {
    changes.push(recent[i] - recent[i - 1]);
  }

  return changes.reduce((a, b) => a + b, 0) / changes.length;
}

export function detectVolumeSurge(volumes: number[]): number {
  if (volumes.length < 10) return 0;

  const avgVolume = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
  const currentVolume = volumes[volumes.length - 1];

  return currentVolume > avgVolume * 2 ? 1 : 0;
}

export function calculateVolumeAtPriceExtremes(data: OHLCV[]): { volumeAtHighPrice: number; volumeAtLowPrice: number } {
  if (data.length < 10) {
    return { volumeAtHighPrice: 0, volumeAtLowPrice: 0 };
  }

  const recentData = data.slice(-10);
  const highPrice = Math.max(...recentData.map(d => d.high));
  const lowPrice = Math.min(...recentData.map(d => d.low));

  let highVolumeSum = 0;
  let lowVolumeSum = 0;
  let totalVolume = 0;

  for (const candle of recentData) {
    totalVolume += candle.volume;
    
    if (candle.high >= highPrice * 0.99) {
      highVolumeSum += candle.volume;
    }
    if (candle.low <= lowPrice * 1.01) {
      lowVolumeSum += candle.volume;
    }
  }

  return {
    volumeAtHighPrice: totalVolume > 0 ? highVolumeSum / totalVolume : 0,
    volumeAtLowPrice: totalVolume > 0 ? lowVolumeSum / totalVolume : 0
  };
}

export function calculatePriceVolumeCorrelation(prices: number[], volumes: number[]): number {
  return calculateCorrelation(prices, volumes);
}
