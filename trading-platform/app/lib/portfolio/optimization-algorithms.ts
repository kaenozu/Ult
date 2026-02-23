import type {
  AssetData,
  EfficientFrontierPoint,
  OptimizationConstraints,
  OptimizationResult,
  OptimizerConfig,
} from './types';
import {
  calculateAnnualizedReturn,
  calculateAnnualizedVolatility,
  calculateCovarianceMatrix,
  calculateExpectedReturns,
  calculatePortfolioReturn,
  calculatePortfolioVolatility,
} from './calculations';

export function generateEfficientFrontier(
  assets: AssetData[],
  config: OptimizerConfig,
  points: number = 50,
  constraints: OptimizationConstraints
): EfficientFrontierPoint[] {
  if (assets.length === 0) return [];

  const tradingDays = config.tradingDaysPerYear;
  const covarianceMatrix = calculateCovarianceMatrix(assets, { tradingDaysPerYear: tradingDays });
  const expectedReturns = calculateExpectedReturns(assets, { tradingDaysPerYear: tradingDays });

  const returns = assets.map(a => calculateAnnualizedReturn(a.returns, tradingDays));
  let minReturn = Infinity;
  let maxReturn = -Infinity;
  for (const ret of returns) {
    if (ret < minReturn) minReturn = ret;
    if (ret > maxReturn) maxReturn = ret;
  }

  const frontier: EfficientFrontierPoint[] = [];
  const step = (maxReturn - minReturn) / (points - 1);

  for (let i = 0; i < points; i++) {
    const targetReturn = minReturn + step * i;

    const result = optimizeTargetReturn(
      assets,
      covarianceMatrix,
      expectedReturns,
      { ...constraints, targetReturn },
      config
    );

    frontier.push({
      return: targetReturn,
      volatility: result.expectedVolatility,
      sharpeRatio: result.sharpeRatio,
      weights: result.weights,
    });
  }

  return frontier;
}

export function optimizeMaxSharpe(
  assets: AssetData[],
  covarianceMatrix: Map<string, Map<string, number>>,
  expectedReturns: Map<string, number>,
  constraints: OptimizationConstraints,
  config: OptimizerConfig
): OptimizationResult {
  const frontier = generateEfficientFrontier(assets, config, 50, constraints);

  let bestSharpe = -Infinity;
  let bestPoint = frontier[0];
  const weights = new Map<string, number>();

  for (const point of frontier) {
    if (point.sharpeRatio > bestSharpe) {
      bestSharpe = point.sharpeRatio;
      bestPoint = point;
      point.weights.forEach((w, s) => weights.set(s, w));
    }
  }

  const adjustedWeights = applyConstraints(weights, assets, constraints);

  return {
    weights: adjustedWeights,
    expectedReturn: calculatePortfolioReturn(adjustedWeights, expectedReturns),
    expectedVolatility: calculatePortfolioVolatility(adjustedWeights, covarianceMatrix),
    sharpeRatio: bestSharpe,
    efficientFrontier: frontier,
    optimizationType: 'MAX_SHARPE',
    confidence: 0.85,
  };
}

export function optimizeMinVariance(
  assets: AssetData[],
  covarianceMatrix: Map<string, Map<string, number>>,
  expectedReturns: Map<string, number>,
  constraints: OptimizationConstraints,
  config: OptimizerConfig
): OptimizationResult {
  const frontier = generateEfficientFrontier(assets, config, 50, constraints);

  let minVol = Infinity;
  let bestPoint = frontier[0];
  const weights = new Map<string, number>();

  for (const point of frontier) {
    if (point.volatility < minVol) {
      minVol = point.volatility;
      bestPoint = point;
      point.weights.forEach((w, s) => weights.set(s, w));
    }
  }

  const adjustedWeights = applyConstraints(weights, assets, constraints);

  return {
    weights: adjustedWeights,
    expectedReturn: calculatePortfolioReturn(adjustedWeights, expectedReturns),
    expectedVolatility: minVol,
    sharpeRatio: minVol > 0
      ? (calculatePortfolioReturn(adjustedWeights, expectedReturns) - config.riskFreeRate) / minVol
      : 0,
    efficientFrontier: frontier,
    optimizationType: 'MIN_VARIANCE',
    confidence: 0.85,
  };
}

export function optimizeRiskParity(
  assets: AssetData[],
  covarianceMatrix: Map<string, Map<string, number>>,
  constraints: OptimizationConstraints,
  config: OptimizerConfig
): OptimizationResult {
  const weights = new Map<string, number>();
  const symbolList = assets.map(a => a.symbol);
  const n = symbolList.length;

  const initialWeight = 1 / n;
  symbolList.forEach(s => weights.set(s, initialWeight));

  for (let iter = 0; iter < config.maxIterations; iter++) {
    const marginalRisks = new Map<string, number>();
    let totalRisk = 0;

    weights.forEach((w1, s1) => {
      let marginalRisk = 0;
      weights.forEach((w2, s2) => {
        const cov = covarianceMatrix.get(s1)?.get(s2) || 0;
        marginalRisk += w2 * cov;
      });
      marginalRisks.set(s1, marginalRisk);
      totalRisk += w1 * marginalRisk;
    });

    const newWeights = new Map<string, number>();
    let weightSum = 0;

    weights.forEach((w, s) => {
      const targetRisk = totalRisk / n;
      const mr = marginalRisks.get(s) || 1;
      let newWeight = w * (targetRisk / mr);

      newWeight = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, newWeight));
      newWeights.set(s, newWeight);
      weightSum += newWeight;
    });

    newWeights.forEach((w, s) => {
      newWeights.set(s, w / weightSum);
    });

    let maxDiff = 0;
    weights.forEach((w, s) => {
      const diff = Math.abs(w - (newWeights.get(s) || 0));
      maxDiff = Math.max(maxDiff, diff);
    });

    if (maxDiff < config.convergenceThreshold) break;

    weights.forEach((_, s) => weights.set(s, newWeights.get(s) || 0));
  }

  const frontier = generateEfficientFrontier(assets, config, 50, constraints);
  const avgSharpe = frontier.reduce((sum, p) => sum + p.sharpeRatio, 0) / frontier.length;

  return {
    weights,
    expectedReturn: 0,
    expectedVolatility: calculatePortfolioVolatility(weights, covarianceMatrix),
    sharpeRatio: avgSharpe,
    efficientFrontier: frontier,
    optimizationType: 'RISK_PARITY',
    confidence: 0.8,
  };
}

export function optimizeTargetReturn(
  assets: AssetData[],
  covarianceMatrix: Map<string, Map<string, number>>,
  expectedReturns: Map<string, number>,
  constraints: OptimizationConstraints,
  config: OptimizerConfig
): OptimizationResult {
  const targetReturn = constraints.targetReturn || 0;
  const frontier = generateEfficientFrontier(assets, config, 50, constraints);

  let closestPoint = frontier[0];
  let minDiff = Infinity;

  for (const point of frontier) {
    const diff = Math.abs(point.return - targetReturn);
    if (diff < minDiff) {
      minDiff = diff;
      closestPoint = point;
    }
  }

  const adjustedWeights = applyConstraints(closestPoint.weights, assets, constraints);

  return {
    weights: adjustedWeights,
    expectedReturn: closestPoint.return,
    expectedVolatility: closestPoint.volatility,
    sharpeRatio: closestPoint.sharpeRatio,
    efficientFrontier: frontier,
    optimizationType: 'TARGET_RETURN',
    confidence: 0.8,
  };
}

export function optimizeSingleAsset(asset: AssetData, riskFreeRate: number): OptimizationResult {
  const weights = new Map<string, number>();
  weights.set(asset.symbol, 1);

  const returns = asset.returns;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualizedReturn = avgReturn * 252 * 100;

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const annualizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;

  return {
    weights,
    expectedReturn: annualizedReturn,
    expectedVolatility: annualizedVol,
    sharpeRatio: annualizedVol > 0 ? (annualizedReturn - riskFreeRate) / annualizedVol : 0,
    efficientFrontier: [],
    optimizationType: 'MIN_VARIANCE',
    confidence: 1.0,
  };
}

export function createEmptyResult(): OptimizationResult {
  return {
    weights: new Map(),
    expectedReturn: 0,
    expectedVolatility: 0,
    sharpeRatio: 0,
    efficientFrontier: [],
    optimizationType: 'MAX_SHARPE',
    confidence: 0,
  };
}

export function applyConstraints(
  weights: Map<string, number>,
  assets: AssetData[],
  constraints: OptimizationConstraints
): Map<string, number> {
  const result = new Map<string, number>();
  let totalWeight = 0;

  for (const asset of assets) {
    const currentWeight = weights.get(asset.symbol) || 0;
    const newWeight = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, currentWeight));
    result.set(asset.symbol, newWeight);
    totalWeight += newWeight;
  }

  if (constraints.sectorLimits && constraints.sectorLimits.size > 0) {
    const sectorWeights = aggregateBySector(assets, result);

    for (const [sector, weight] of sectorWeights) {
      const limit = constraints.sectorLimits!.get(sector);
      if (limit && weight > limit) {
        const excessRatio = limit / weight;
        assets.filter(a => a.sector === sector).forEach(asset => {
          const currentW = result.get(asset.symbol) || 0;
          result.set(asset.symbol, currentW * excessRatio);
        });
      }
    }
  }

  let newTotal = 0;
  result.forEach(w => newTotal += w);

  if (newTotal > 0) {
    result.forEach((w, s) => result.set(s, w / newTotal));
  } else {
    const equalWeight = 1 / assets.length;
    assets.forEach(a => result.set(a.symbol, equalWeight));
  }

  return result;
}

export function aggregateBySector(assets: AssetData[], weights: Map<string, number>): Map<string, number> {
  const sectorWeights = new Map<string, number>();

  for (const asset of assets) {
    const sector = asset.sector || 'Unknown';
    const weight = weights.get(asset.symbol) || 0;
    sectorWeights.set(sector, (sectorWeights.get(sector) || 0) + weight);
  }

  return sectorWeights;
}

export function calculateDiversificationRatio(
  assets: AssetData[],
  weights: Map<string, number>
): number {
  const covarianceMatrix = calculateCovarianceMatrix(assets, { tradingDaysPerYear: 252 });
  const portfolioVol = calculatePortfolioVolatility(weights, covarianceMatrix);

  let weightedVolSum = 0;
  weights.forEach((weight, symbol) => {
    const asset = assets.find(a => a.symbol === symbol);
    if (asset) {
      const vol = calculateAnnualizedVolatility(asset.returns);
      weightedVolSum += weight * vol;
    }
  });

  return portfolioVol > 0 ? weightedVolSum / portfolioVol : 1;
}
