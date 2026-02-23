import { OHLCV } from '@/app/types';
import { TimeSeriesFeatures, TrendDirection } from './types';
import { calculateSimpleSMA, lastValue } from './utils';

export function calculateTimeSeriesFeatures(data: OHLCV[]): TimeSeriesFeatures {
  const prices = data.map(d => d.close);

  const lag1 = calculateLag(prices, 1);
  const lag5 = calculateLag(prices, 5);
  const lag10 = calculateLag(prices, 10);
  const lag20 = calculateLag(prices, 20);

  const ma5 = calculateSimpleSMA(prices, 5);
  const ma10 = calculateSimpleSMA(prices, 10);
  const ma20 = calculateSimpleSMA(prices, 20);
  const ma50 = calculateSimpleSMA(prices, 50);

  const lastDate = new Date(data[data.length - 1].date);
  const dayOfWeek = lastDate.getDay();
  const dayOfWeekReturn = calculateDayOfWeekReturn(data, dayOfWeek);
  const monthOfYear = lastDate.getMonth();
  const monthEffect = calculateMonthEffect(data, monthOfYear);

  const trendStrength = calculateTrendStrength(prices.slice(-50));
  const trendDirection = classifyTrendDirection(prices.slice(-50));
  const cyclicality = calculateCyclicality(prices.slice(-50));

  return {
    lag1,
    lag5,
    lag10,
    lag20,
    ma5: lastValue(ma5),
    ma10: lastValue(ma10),
    ma20: lastValue(ma20),
    ma50: lastValue(ma50),
    dayOfWeek,
    dayOfWeekReturn,
    monthOfYear,
    monthEffect,
    trendStrength,
    trendDirection,
    cyclicality,
  };
}

export function calculateLag(prices: number[], lag: number): number {
  if (prices.length < lag + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - lag];
  return ((current - past) / past) * 100;
}

export function calculateDayOfWeekReturn(data: OHLCV[], dayOfWeek: number): number {
  const sameDayData = data.filter(d => new Date(d.date).getDay() === dayOfWeek);
  if (sameDayData.length < 2) return 0;

  let totalReturn = 0;
  for (let i = 1; i < sameDayData.length; i++) {
    totalReturn += (sameDayData[i].close - sameDayData[i - 1].close) / sameDayData[i - 1].close;
  }
  return (totalReturn / sameDayData.length) * 100;
}

export function calculateMonthEffect(data: OHLCV[], month: number): number {
  const sameMonthData = data.filter(d => new Date(d.date).getMonth() === month);
  if (sameMonthData.length < 2) return 0;

  const firstPrice = sameMonthData[0].close;
  const lastPrice = sameMonthData[sameMonthData.length - 1].close;
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

export function calculateTrendStrength(prices: number[]): number {
  if (prices.length < 10) return 0;

  const n = prices.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = prices;

  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const yPredicted = slope * xValues[i] + intercept;
    ssTotal += Math.pow(yValues[i] - yMean, 2);
    ssResidual += Math.pow(yValues[i] - yPredicted, 2);
  }

  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  return Math.max(0, Math.min(1, rSquared));
}

export function classifyTrendDirection(prices: number[]): TrendDirection {
  if (prices.length < 10) return 'NEUTRAL';

  const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
  const secondHalf = prices.slice(Math.floor(prices.length / 2));

  const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;

  const change = (secondAvg - firstAvg) / firstAvg;

  if (change > 0.02) return 'UP';
  if (change < -0.02) return 'DOWN';
  return 'NEUTRAL';
}

export function calculateCyclicality(prices: number[]): number {
  if (prices.length < 20) return 0;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const autocorrelations: number[] = [];
  for (let lag = 1; lag <= Math.min(5, Math.floor(returns.length / 2)); lag++) {
    const corr = calculateAutocorrelation(returns, lag);
    autocorrelations.push(Math.abs(corr));
  }

  return autocorrelations.reduce((sum, corr) => sum + corr, 0) / autocorrelations.length;
}

export function calculateAutocorrelation(returns: number[], lag: number): number {
  const n = returns.length - lag;
  if (n < 2) return 0;

  const mean = returns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const deviation = returns[i] - mean;
    const laggedDeviation = returns[i + lag] - mean;
    numerator += deviation * laggedDeviation;
    denominator += deviation * deviation;
  }

  return denominator > 0 ? numerator / denominator : 0;
}
