import { OHLCV } from './types';

export function calculateReturnsMatrix(
  symbols: string[],
  priceHistory: Record<string, OHLCV[]>
): number[][] {
  const returnsMatrix: number[][] = [];
  const maxPeriod = Math.max(...Object.values(priceHistory).map(history => history.length));

  for (const symbol of symbols) {
    const history = priceHistory[symbol];
    if (!history) continue;

    const assetReturns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const returnVal = (history[i].close - history[i - 1].close) / history[i - 1].close;
      assetReturns.push(returnVal);
    }

    while (assetReturns.length < maxPeriod - 1) {
      assetReturns.unshift(0);
    }

    returnsMatrix.push(assetReturns);
  }

  return returnsMatrix;
}

export function calculatePortfolioReturns(returnsMatrix: number[][], weights: number[]): number[] {
  if (returnsMatrix.length === 0) return [];

  const portfolioReturns: number[] = [];

  for (let i = 0; i < returnsMatrix[0].length; i++) {
    let portfolioReturn = 0;
    for (let j = 0; j < returnsMatrix.length; j++) {
      portfolioReturn += returnsMatrix[j][i] * weights[j];
    }
    portfolioReturns.push(portfolioReturn);
  }

  return portfolioReturns;
}

export function calculateAssetReturns(symbol: string, priceHistory: Record<string, OHLCV[]>): number[] {
  const history = priceHistory[symbol];
  if (!history) return [];

  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const returnVal = (history[i].close - history[i - 1].close) / history[i - 1].close;
    returns.push(returnVal);
  }

  return returns;
}

export function calculateStandardDeviation(data: number[]): number {
  if (data.length === 0) return 0;

  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;

  return Math.sqrt(variance);
}

export function calculateValueAtRisk(returns: number[], confidenceLevel: number): number {
  if (returns.length === 0) return 0;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * returns.length);

  return -sortedReturns[Math.max(0, index)];
}

export function calculateExpectedShortfall(returns: number[], confidenceLevel: number): number {
  if (returns.length === 0) return 0;

  const varValue = calculateValueAtRisk(returns, confidenceLevel);
  const extremeLosses = returns.filter(r => r < -varValue);
  if (extremeLosses.length === 0) return varValue;

  const avgExtremeLoss = extremeLosses.reduce((sum, val) => sum + val, 0) / extremeLosses.length;

  return -avgExtremeLoss;
}

export function calculateMaxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;

  let peak = 1;
  let maxDrawdown = 0;
  let currentEquity = 1;

  for (const returnVal of returns) {
    currentEquity *= 1 + returnVal;

    if (currentEquity > peak) {
      peak = currentEquity;
    }

    const drawdown = (peak - currentEquity) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

export function calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const volatility = calculateStandardDeviation(returns);

  if (volatility === 0) return 0;

  return (meanReturn - riskFreeRate) / volatility;
}

export function calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
  if (returns.length === 0) return 0;

  const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < 0);
  if (downsideReturns.length === 0) return 0;

  const downsideDeviation = calculateStandardDeviation(downsideReturns);

  if (downsideDeviation === 0) return 0;

  return (meanReturn - riskFreeRate) / downsideDeviation;
}

export function calculateCorrelationMatrix(returnsMatrix: number[][]): number[][] {
  const n = returnsMatrix.length;
  const correlationMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        correlationMatrix[i][j] = 1;
      } else {
        correlationMatrix[i][j] = calculateCorrelation(returnsMatrix[i], returnsMatrix[j]);
      }
    }
  }

  return correlationMatrix;
}

export function calculateCorrelation(series1: number[], series2: number[]): number {
  if (series1.length !== series2.length || series1.length === 0) return 0;

  const n = series1.length;
  const sum1 = series1.reduce((sum, val) => sum + val, 0);
  const sum2 = series2.reduce((sum, val) => sum + val, 0);
  const sum1Sq = series1.reduce((sum, val) => sum + val * val, 0);
  const sum2Sq = series2.reduce((sum, val) => sum + val * val, 0);
  const pSum = series1.reduce((sum, val, idx) => sum + val * series2[idx], 0);

  const num = pSum - (sum1 * sum2) / n;
  const den = Math.sqrt((sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n));

  if (den === 0) return 0;

  return num / den;
}

export function calculateDiversificationRatio(returnsMatrix: number[][], weights: number[]): number {
  if (returnsMatrix.length === 0) return 0;

  const portfolioVol = calculateStandardDeviation(calculatePortfolioReturns(returnsMatrix, weights));

  let weightedIndividualVol = 0;
  for (let i = 0; i < returnsMatrix.length; i++) {
    const assetVol = calculateStandardDeviation(returnsMatrix[i]);
    weightedIndividualVol += weights[i] * assetVol;
  }

  if (weightedIndividualVol === 0) return 0;

  return portfolioVol / weightedIndividualVol;
}

export function calculateBeta(assetReturns: number[], benchmarkReturns: number[]): number {
  if (assetReturns.length !== benchmarkReturns.length || assetReturns.length === 0) return 0;

  const n = assetReturns.length;
  const assetMean = assetReturns.reduce((sum, val) => sum + val, 0) / n;
  const benchMean = benchmarkReturns.reduce((sum, val) => sum + val, 0) / n;

  let covariance = 0;
  let benchmarkVariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (assetReturns[i] - assetMean) * (benchmarkReturns[i] - benchMean);
    benchmarkVariance += Math.pow(benchmarkReturns[i] - benchMean, 2);
  }

  if (benchmarkVariance === 0) return 0;

  return covariance / benchmarkVariance;
}

export function getDefaultRiskMetrics(): import('./types').PortfolioRiskMetrics {
  return {
    valueAtRisk: 0,
    expectedShortfall: 0,
    maxDrawdown: 0,
    volatility: 0,
    beta: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    correlationMatrix: [],
    concentrationRisk: 0,
    diversificationRatio: 1,
    marginUtilization: 0
  };
}
