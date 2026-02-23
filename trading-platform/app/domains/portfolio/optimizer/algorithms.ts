import {
  AssetData,
  OptimizationConstraints,
  OptimizationResult,
  EfficientFrontierPoint,
  OptimizerConfig,
} from './types';

export class OptimizationAlgorithms {
  constructor(private config: OptimizerConfig) {}

  optimizeMaxSharpe(
    assets: AssetData[],
    covarianceMatrix: Map<string, Map<string, number>>,
    expectedReturns: Map<string, number>,
    constraints: OptimizationConstraints,
    frontier: EfficientFrontierPoint[],
    applyConstraints: (w: Map<string, number>, a: AssetData[], c: OptimizationConstraints) => Map<string, number>,
    calculatePortfolioReturn: (w: Map<string, number>, e: Map<string, number>) => number,
    calculatePortfolioVolatility: (w: Map<string, number>, c: Map<string, Map<string, number>>) => number
  ): OptimizationResult {
    let bestSharpe = -Infinity;
    const weights = new Map<string, number>();

    for (const point of frontier) {
      if (point.sharpeRatio > bestSharpe) {
        bestSharpe = point.sharpeRatio;
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

  optimizeMinVariance(
    assets: AssetData[],
    covarianceMatrix: Map<string, Map<string, number>>,
    expectedReturns: Map<string, number>,
    constraints: OptimizationConstraints,
    frontier: EfficientFrontierPoint[],
    applyConstraints: (w: Map<string, number>, a: AssetData[], c: OptimizationConstraints) => Map<string, number>,
    calculatePortfolioReturn: (w: Map<string, number>, e: Map<string, number>) => number
  ): OptimizationResult {
    let minVol = Infinity;
    const weights = new Map<string, number>();

    for (const point of frontier) {
      if (point.volatility < minVol) {
        minVol = point.volatility;
        point.weights.forEach((w, s) => weights.set(s, w));
      }
    }

    const adjustedWeights = applyConstraints(weights, assets, constraints);
    const portfolioReturn = calculatePortfolioReturn(adjustedWeights, expectedReturns);

    return {
      weights: adjustedWeights,
      expectedReturn: portfolioReturn,
      expectedVolatility: minVol,
      sharpeRatio: minVol > 0 ? (portfolioReturn - this.config.riskFreeRate) / minVol : 0,
      efficientFrontier: frontier,
      optimizationType: 'MIN_VARIANCE',
      confidence: 0.85,
    };
  }

  optimizeRiskParity(
    assets: AssetData[],
    covarianceMatrix: Map<string, Map<string, number>>,
    constraints: OptimizationConstraints,
    frontier: EfficientFrontierPoint[],
    calculatePortfolioVolatility: (w: Map<string, number>, c: Map<string, Map<string, number>>) => number
  ): OptimizationResult {
    const weights = new Map<string, number>();
    const symbolList = assets.map(a => a.symbol);
    const n = symbolList.length;
    const initialWeight = 1 / n;
    symbolList.forEach(s => weights.set(s, initialWeight));

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
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

      newWeights.forEach((w, s) => newWeights.set(s, w / weightSum));

      let maxDiff = 0;
      weights.forEach((w, s) => {
        const diff = Math.abs(w - (newWeights.get(s) || 0));
        maxDiff = Math.max(maxDiff, diff);
      });

      if (maxDiff < this.config.convergenceThreshold) break;
      weights.forEach((_, s) => weights.set(s, newWeights.get(s) || 0));
    }

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

  optimizeTargetReturn(
    assets: AssetData[],
    constraints: OptimizationConstraints,
    frontier: EfficientFrontierPoint[],
    applyConstraints: (w: Map<string, number>, a: AssetData[], c: OptimizationConstraints) => Map<string, number>
  ): OptimizationResult {
    const targetReturn = constraints.targetReturn || 0;
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
}
