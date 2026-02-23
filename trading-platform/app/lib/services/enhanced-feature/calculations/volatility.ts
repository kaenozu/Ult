import { OHLCV } from '@/app/types';
import { PORTFOLIO_OPTIMIZATION_DEFAULTS } from '@/app/constants/portfolio';
import { calculateStandardDeviation, calculateCorrelation, calculateAutocorrelation } from './utils';

export function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return returns;
}

export function calculateHistoricalVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const stdDev = calculateStandardDeviation(returns);
  return stdDev * Math.sqrt(PORTFOLIO_OPTIMIZATION_DEFAULTS.TRADING_DAYS_PER_YEAR) * 100;
}

export function calculateRealizedVolatility(data: OHLCV[]): number {
  if (data.length < 2) return 0;

  let sumSquares = 0;
  
  for (const candle of data) {
    if (candle.low > 0) {
      const ratio = Math.log(candle.high / candle.low);
      sumSquares += ratio * ratio;
    }
  }

  const variance = sumSquares / (4 * data.length * Math.log(2));
  return Math.sqrt(variance * PORTFOLIO_OPTIMIZATION_DEFAULTS.TRADING_DAYS_PER_YEAR) * 100;
}

export function calculateSkewness(values: number[]): number {
  if (values.length < 3) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);
  
  if (stdDev === 0) return 0;

  const n = values.length;
  const skew = values.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0);
  
  return (n / ((n - 1) * (n - 2))) * skew;
}

export function calculateKurtosis(values: number[]): number {
  if (values.length < 4) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);
  
  if (stdDev === 0) return 0;

  const n = values.length;
  const kurt = values.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0);
  
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurt - 
         (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}

export function classifyVolatilityRegime(volatility: number): 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' {
  if (volatility < 10) return 'LOW';
  if (volatility < 20) return 'NORMAL';
  if (volatility < 40) return 'HIGH';
  return 'EXTREME';
}

export function calculateRegimeChangeProb(returns: number[]): number {
  if (returns.length < 20) return 0.5;

  const recentReturns = returns.slice(-20);
  const olderReturns = returns.slice(-40, -20);
  
  if (olderReturns.length === 0) return 0.5;

  const recentVol = calculateStandardDeviation(recentReturns);
  const olderVol = calculateStandardDeviation(olderReturns);

  const volChange = Math.abs(recentVol - olderVol) / (olderVol || 1);
  
  return Math.min(volChange, 1);
}

export function estimateGarchVolatility(returns: number[]): number {
  if (returns.length < 10) return 0;

  const omega = 0.000001;
  const alpha = 0.1;
  const beta = 0.85;

  let variance = calculateStandardDeviation(returns) ** 2;
  
  for (const ret of returns.slice(-10)) {
    variance = omega + alpha * (ret * ret) + beta * variance;
  }

  return Math.sqrt(variance * PORTFOLIO_OPTIMIZATION_DEFAULTS.TRADING_DAYS_PER_YEAR) * 100;
}

export function calculateVolatilityMomentum(returns: number[]): number {
  if (returns.length < 20) return 0;

  const recentVol = calculateStandardDeviation(returns.slice(-10));
  const olderVol = calculateStandardDeviation(returns.slice(-20, -10));

  return olderVol > 0 ? (recentVol - olderVol) / olderVol : 0;
}

export function calculateVolatilityClustering(returns: number[]): number {
  if (returns.length < 10) return 0;

  const absReturns = returns.map(r => Math.abs(r));
  return calculateAutocorrelation(absReturns, 1);
}
