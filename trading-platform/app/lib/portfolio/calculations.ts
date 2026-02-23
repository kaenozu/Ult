import type { AssetData, CovarianceOptions } from './types';

export function calculatePairwiseCovariance(returns1: number[], returns2: number[]): number {
  const len = Math.min(returns1.length, returns2.length);
  if (len === 0) return 0;

  const slice1 = returns1.slice(-len);
  const slice2 = returns2.slice(-len);

  const mean1 = slice1.reduce((a, b) => a + b, 0) / len;
  const mean2 = slice2.reduce((a, b) => a + b, 0) / len;

  let covariance = 0;
  for (let i = 0; i < len; i++) {
    covariance += (slice1[i] - mean1) * (slice2[i] - mean2);
  }

  return covariance / (len - 1);
}

export function calculateCovarianceMatrix(
  assets: AssetData[],
  options: CovarianceOptions,
  cache?: Map<string, Map<string, Map<string, number>>>
): Map<string, Map<string, number>> {
  const cacheKey = assets.map(a => a.symbol).join('_');

  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const lookback = options.lookbackPeriod || Math.min(...assets.map(a => a.returns.length));
  const l2Reg = options.l2Regularization || 0;

  const covarianceMatrix = new Map<string, Map<string, number>>();

  for (const asset1 of assets) {
    covarianceMatrix.set(asset1.symbol, new Map());

    for (const asset2 of assets) {
      const covariance = calculatePairwiseCovariance(
        asset1.returns.slice(-lookback),
        asset2.returns.slice(-lookback)
      );

      const regularizedCovariance = asset1.symbol === asset2.symbol
        ? covariance + l2Reg
        : covariance;

      covarianceMatrix.get(asset1.symbol)!.set(asset2.symbol, regularizedCovariance);
    }
  }

  cache?.set(cacheKey, covarianceMatrix);
  return covarianceMatrix;
}

export function calculateAnnualizedReturn(dailyReturns: number[], tradingDaysPerYear: number): number {
  if (dailyReturns.length === 0) return 0;

  let product = 1;
  for (const r of dailyReturns) {
    if (r > -1) {
      product *= (1 + r);
    }
  }

  const annualizedReturn = (Math.pow(product, tradingDaysPerYear / dailyReturns.length) - 1) * 100;
  return isNaN(annualizedReturn) || !isFinite(annualizedReturn) ? 0 : annualizedReturn;
}

export function calculateAnnualizedVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const squaredDiffs = dailyReturns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (dailyReturns.length - 1);

  const dailyVol = Math.sqrt(variance);
  return dailyVol * Math.sqrt(252) * 100;
}

export function calculateExpectedReturns(
  assets: AssetData[],
  options: CovarianceOptions
): Map<string, number> {
  const returns = new Map<string, number>();
  const tradingDays = options.tradingDaysPerYear || 252;

  for (const asset of assets) {
    const annualReturn = calculateAnnualizedReturn(asset.returns, tradingDays);
    returns.set(asset.symbol, annualReturn);
  }

  return returns;
}

export function calculatePortfolioReturn(
  weights: Map<string, number>,
  expectedReturns: Map<string, number>
): number {
  let return_ = 0;
  weights.forEach((weight, symbol) => {
    const expReturn = expectedReturns.get(symbol) || 0;
    return_ += weight * expReturn;
  });
  return return_;
}

export function calculatePortfolioVolatility(
  weights: Map<string, number>,
  covarianceMatrix: Map<string, Map<string, number>>
): number {
  let variance = 0;

  weights.forEach((weight1, symbol1) => {
    weights.forEach((weight2, symbol2) => {
      const cov = covarianceMatrix.get(symbol1)?.get(symbol2) || 0;
      variance += weight1 * weight2 * cov;
    });
  });

  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function calculateDownsideRisk(assets: AssetData[], weights: Map<string, number>): number {
  let downsideVariance = 0;
  let totalWeight = 0;

  weights.forEach((weight, symbol) => {
    const asset = assets.find(a => a.symbol === symbol);
    if (asset && weight > 0) {
      const meanReturn = asset.returns.reduce((a, b) => a + b, 0) / asset.returns.length;

      for (const r of asset.returns) {
        if (r < meanReturn) {
          downsideVariance += weight * Math.pow(r - meanReturn, 2);
        }
      }
      totalWeight += weight;
    }
  });

  if (totalWeight === 0 || downsideVariance === 0) return 0;

  return Math.sqrt(downsideVariance / totalWeight) * Math.sqrt(252) * 100;
}

export function calculateMaxDrawdown(assets: AssetData[], weights: Map<string, number>): number {
  let portfolioValue = 100;
  let peak = 100;
  let maxDrawdown = 0;

  const numDays = assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0;

  for (let i = 0; i < numDays; i++) {
    let dailyReturn = 0;
    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset && asset.returns[i] !== undefined) {
        dailyReturn += weight * asset.returns[i];
      }
    });

    portfolioValue *= (1 + dailyReturn);
    peak = Math.max(peak, portfolioValue);
    const drawdown = (peak - portfolioValue) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown * 100;
}

export function calculateVaR(
  assets: AssetData[],
  weights: Map<string, number>,
  confidence: number
): number {
  const returns: number[] = [];
  const numDays = assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0;

  for (let i = 0; i < numDays; i++) {
    let dailyReturn = 0;
    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset && asset.returns[i] !== undefined) {
        dailyReturn += weight * asset.returns[i];
      }
    });
    returns.push(dailyReturn);
  }

  returns.sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * returns.length);
  return returns[index] * 100 * Math.sqrt(252);
}

export function calculateCVaR(
  assets: AssetData[],
  weights: Map<string, number>,
  confidence: number
): number {
  const returns: number[] = [];
  const numDays = assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0;

  for (let i = 0; i < numDays; i++) {
    let dailyReturn = 0;
    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset && asset.returns[i] !== undefined) {
        dailyReturn += weight * asset.returns[i];
      }
    });
    returns.push(dailyReturn);
  }

  returns.sort((a, b) => a - b);
  const cutoffIndex = Math.floor((1 - confidence) * returns.length);
  const tailReturns = returns.slice(0, cutoffIndex);

  if (tailReturns.length === 0) return 0;

  const avgTailReturn = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
  return avgTailReturn * 100 * Math.sqrt(252);
}

export function calculateBeta(
  assets: AssetData[],
  weights: Map<string, number>,
  benchmarkReturns: number[],
  riskFreeRate: number
): { beta: number; alpha: number } {
  const portfolioReturns: number[] = [];
  const numDays = Math.min(...assets.map(a => a.returns.length), benchmarkReturns.length);

  for (let i = 0; i < numDays; i++) {
    let dailyReturn = 0;
    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset && asset.returns[i] !== undefined) {
        dailyReturn += weight * asset.returns[i];
      }
    });
    portfolioReturns.push(dailyReturn);
  }

  const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length;
  const benchmarkVar = benchmarkReturns.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / benchmarkReturns.length;

  let covariance = 0;
  const portfolioMean = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
  for (let i = 0; i < portfolioReturns.length; i++) {
    covariance += (portfolioReturns[i] - portfolioMean) * (benchmarkReturns[i] - benchmarkMean);
  }
  covariance /= portfolioReturns.length;

  const beta = benchmarkVar > 0 ? covariance / benchmarkVar : 1;

  const riskFreeRateDaily = riskFreeRate / 252;
  const alpha = (portfolioMean - riskFreeRateDaily) - beta * (benchmarkMean - riskFreeRateDaily);

  return { beta, alpha };
}
