import { OHLCV } from '@/app/types';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateATR } from '@/app/lib/utils';
import { RSI_CONFIG, SMA_CONFIG, MACD_CONFIG, BOLLINGER_BANDS } from '@/app/constants/technical';
import { TechnicalFeatures, VolumeTrend } from './types';

const last = (arr: number[], fallback: number) => arr.length > 0 ? arr[arr.length - 1] : fallback;
const prev = (arr: number[], idx: number, fallback: number) => idx >= 0 && idx < arr.length ? arr[idx] : fallback;

export function calculateTechnicalFeatures(data: OHLCV[]): TechnicalFeatures {
  const prices = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);

  const currentPrice = prices[prices.length - 1];
  const currentVolume = volumes[volumes.length - 1];

  const rsi = calculateRSI(prices, RSI_CONFIG.DEFAULT_PERIOD);
  const sma5 = calculateSMA(prices, 5);
  const sma10 = calculateSMA(prices, 10);
  const sma20 = calculateSMA(prices, SMA_CONFIG.SHORT_PERIOD);
  const sma50 = calculateSMA(prices, SMA_CONFIG.MEDIUM_PERIOD);
  const sma200 = calculateSMA(prices, SMA_CONFIG.LONG_PERIOD);
  const ema12 = calculateEMA(prices, MACD_CONFIG.FAST_PERIOD);
  const ema26 = calculateEMA(prices, MACD_CONFIG.SLOW_PERIOD);

  const macd = calculateMACD(prices, MACD_CONFIG.FAST_PERIOD, MACD_CONFIG.SLOW_PERIOD, MACD_CONFIG.SIGNAL_PERIOD);
  const bb = calculateBollingerBands(prices, BOLLINGER_BANDS.PERIOD, BOLLINGER_BANDS.STD_DEVIATION);
  const atr = calculateATR(highs, lows, prices, RSI_CONFIG.DEFAULT_PERIOD);

  const rsiValue = last(rsi, 50);
  const rsiChange = rsiValue - prev(rsi, rsi.length - 2, 50);

  const sma5Dev = (currentPrice - last(sma5, currentPrice)) / currentPrice * 100;
  const sma10Dev = (currentPrice - last(sma10, currentPrice)) / currentPrice * 100;
  const sma20Dev = (currentPrice - last(sma20, currentPrice)) / currentPrice * 100;
  const sma50Dev = (currentPrice - last(sma50, currentPrice)) / currentPrice * 100;
  const sma200Dev = (currentPrice - last(sma200, currentPrice)) / currentPrice * 100;
  const ema12Dev = (currentPrice - last(ema12, currentPrice)) / currentPrice * 100;
  const ema26Dev = (currentPrice - last(ema26, currentPrice)) / currentPrice * 100;

  const macdValue = last(macd.macd, 0);
  const macdSignalValue = last(macd.signal, 0);
  const macdHistogramValue = last(macd.histogram, 0);

  const bbUpper = last(bb.upper, currentPrice);
  const bbMiddle = last(bb.middle, currentPrice);
  const bbLower = last(bb.lower, currentPrice);
  const bbPosition = Math.max(0, Math.min(100, ((currentPrice - bbLower) / (bbUpper - bbLower || 1)) * 100));
  const bbWidth = ((bbUpper - bbLower) / bbMiddle) * 100;

  const atrValue = last(atr, currentPrice * 0.02);
  const atrPercent = (atrValue / currentPrice) * 100;
  const atrArray = atr.filter(v => !isNaN(v));
  const atrAvg = atrArray.reduce((sum, v) => sum + v, 0) / atrArray.length;
  const atrRatio = atrValue / (atrAvg || 1);

  const momentum10 = calculateMomentum(prices, 10);
  const momentum20 = calculateMomentum(prices, 20);
  const roc12 = calculateROC(prices, 12);
  const roc25 = calculateROC(prices, 25);

  const stoch = calculateStochastic(highs, lows, prices, 14);
  const williamsR = calculateWilliamsR(highs, lows, prices, 14);
  const cci = calculateCCI(highs, lows, prices, 20);

  const volumeMA5 = calculateSimpleSMA(volumes, 5);
  const volumeMA20 = calculateSimpleSMA(volumes, 20);
  const volumeRatio = currentVolume / (last(volumeMA20, currentVolume) || 1);
  const volumeTrend = classifyVolumeTrend(volumes.slice(-5));

  const pricePosition = calculatePricePosition(prices.slice(-50));
  const priceVelocity = calculateVelocity(prices, 5);
  const priceAcceleration = calculateAcceleration(prices, 5);

  return {
    rsi: rsiValue,
    rsiChange,
    sma5: sma5Dev,
    sma10: sma10Dev,
    sma20: sma20Dev,
    sma50: sma50Dev,
    sma200: sma200Dev,
    ema12: ema12Dev,
    ema26: ema26Dev,
    macd: macdValue,
    macdSignal: macdSignalValue,
    macdHistogram: macdHistogramValue,
    bbUpper,
    bbMiddle,
    bbLower,
    bbPosition,
    bbWidth,
    atr: atrValue,
    atrPercent,
    atrRatio,
    momentum10,
    momentum20,
    rateOfChange12: roc12,
    rateOfChange25: roc25,
    stochasticK: stoch.k,
    stochasticD: stoch.d,
    williamsR,
    cci,
    volumeRatio,
    volumeMA5: last(volumeMA5, currentVolume),
    volumeMA20: last(volumeMA20, currentVolume),
    volumeTrend,
    pricePosition,
    priceVelocity,
    priceAcceleration,
  };
}

export function calculateMomentum(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return ((current - past) / past) * 100;
}

export function calculateROC(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return ((current - past) / past) * 100;
}

export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): { k: number; d: number } {
  const start = Math.max(0, highs.length - period);
  const recentHighs = highs.slice(start);
  const recentLows = lows.slice(start);

  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  const currentClose = closes[closes.length - 1];

  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow || 1)) * 100;
  return { k, d: k };
}

export function calculateWilliamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number {
  const start = Math.max(0, highs.length - period);
  const recentHighs = highs.slice(start);
  const recentLows = lows.slice(start);

  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  const currentClose = closes[closes.length - 1];

  return ((highestHigh - currentClose) / (highestHigh - lowestLow || 1)) * -100;
}

export function calculateCCI(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number {
  const start = Math.max(0, highs.length - period);
  const typicalPrices: number[] = [];

  for (let i = start; i < closes.length; i++) {
    typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
  }

  if (typicalPrices.length === 0) return 0;

  const sma = typicalPrices.reduce((sum, tp) => sum + tp, 0) / typicalPrices.length;
  const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / typicalPrices.length;

  const currentTP = typicalPrices[typicalPrices.length - 1];
  return (currentTP - sma) / (0.015 * meanDeviation || 1);
}

export function calculateSimpleSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += values[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

export function classifyVolumeTrend(volumes: number[]): VolumeTrend {
  if (volumes.length < 2) return 'NEUTRAL';

  const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
  const secondHalf = volumes.slice(Math.floor(volumes.length / 2));

  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

  const ratio = (secondAvg - firstAvg) / (firstAvg || 1);

  if (ratio > 0.1) return 'INCREASING';
  if (ratio < -0.1) return 'DECREASING';
  return 'NEUTRAL';
}

export function calculatePricePosition(prices: number[]): number {
  if (prices.length === 0) return 50;

  const currentPrice = prices[prices.length - 1];
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);

  if (highestPrice === lowestPrice) return 50;
  return ((currentPrice - lowestPrice) / (highestPrice - lowestPrice)) * 100;
}

export function calculateVelocity(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0;
  const recent = prices.slice(-period);
  let velocity = 0;
  for (let i = 1; i < recent.length; i++) {
    velocity += (recent[i] - recent[i - 1]) / (recent[i - 1] || 1);
  }
  return velocity * 100;
}

export function calculateAcceleration(prices: number[], period: number): number {
  if (prices.length < period + 2) return 0;
  const recent = prices.slice(-period);
  const velocities: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    velocities.push((recent[i] - recent[i - 1]) / (recent[i - 1] || 1));
  }
  if (velocities.length < 2) return 0;
  return (velocities[velocities.length - 1] - velocities[0]) * 100;
}
