import { EventEmitter } from 'events';
import type {
  AssetData,
  CovarianceOptions,
  EfficientFrontierPoint,
  OptimizationConstraints,
  OptimizationResult,
  OptimizerConfig,
  PortfolioRiskMetrics,
} from './types';
import { DEFAULT_CONFIG, DEFAULT_CONSTRAINTS } from './types';
import {
  calculateBeta,
  calculateCovarianceMatrix,
  calculateCVaR,
  calculateDownsideRisk,
  calculateExpectedReturns,
  calculateMaxDrawdown,
  calculatePortfolioReturn,
  calculatePortfolioVolatility,
  calculateVaR,
} from './calculations';
import {
  aggregateBySector,
  calculateDiversificationRatio,
  createEmptyResult,
  generateEfficientFrontier,
  optimizeMaxSharpe,
  optimizeMinVariance,
  optimizeRiskParity,
  optimizeSingleAsset,
  optimizeTargetReturn,
} from './optimization-algorithms';

export class PortfolioOptimizer extends EventEmitter {
  private config: OptimizerConfig;
  private cachedCovarianceMatrices: Map<string, Map<string, Map<string, number>>> = new Map();

  constructor(config: Partial<OptimizerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  optimize(
    assets: AssetData[],
    constraints: Partial<OptimizationConstraints> = {},
    options: Partial<CovarianceOptions> = {}
  ): OptimizationResult {
    if (assets.length === 0) {
      return createEmptyResult();
    }

    if (assets.length === 1) {
      return optimizeSingleAsset(assets[0], this.config.riskFreeRate);
    }

    const mergedConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };

    const covarianceMatrix = calculateCovarianceMatrix(assets, mergedOptions, this.cachedCovarianceMatrices);
    const expectedReturns = calculateExpectedReturns(assets, mergedOptions);

    const optimizationType = this.determineOptimizationType(mergedConstraints);

    switch (optimizationType) {
      case 'MAX_SHARPE':
        return optimizeMaxSharpe(assets, covarianceMatrix, expectedReturns, mergedConstraints, this.config);
      case 'MIN_VARIANCE':
        return optimizeMinVariance(assets, covarianceMatrix, expectedReturns, mergedConstraints, this.config);
      case 'RISK_PARITY':
        return optimizeRiskParity(assets, covarianceMatrix, mergedConstraints, this.config);
      case 'TARGET_RETURN':
        return optimizeTargetReturn(assets, covarianceMatrix, expectedReturns, mergedConstraints, this.config);
      default:
        return optimizeMaxSharpe(assets, covarianceMatrix, expectedReturns, mergedConstraints, this.config);
    }
  }

  generateEfficientFrontier(
    assets: AssetData[],
    points: number = 50,
    options: Partial<CovarianceOptions> = {}
  ): EfficientFrontierPoint[] {
    if (assets.length === 0) return [];
    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };
    return generateEfficientFrontier(assets, this.config, points, { ...DEFAULT_CONSTRAINTS, ...mergedOptions });
  }

  calculateRiskMetrics(
    assets: AssetData[],
    weights: Map<string, number>,
    benchmarkReturns?: number[],
    options: Partial<CovarianceOptions> = {}
  ): PortfolioRiskMetrics {
    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };
    const covarianceMatrix = calculateCovarianceMatrix(assets, mergedOptions, this.cachedCovarianceMatrices);
    const expectedReturns = calculateExpectedReturns(assets, mergedOptions);

    const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
    const portfolioVolatility = calculatePortfolioVolatility(weights, covarianceMatrix);

    const excessReturn = portfolioReturn - mergedOptions.riskFreeRate;
    const sharpeRatio = portfolioVolatility > 0 ? excessReturn / portfolioVolatility : 0;

    const downsideRisk = calculateDownsideRisk(assets, weights);
    const sortinoRatio = downsideRisk > 0 ? excessReturn / downsideRisk : 0;

    const maxDrawdown = calculateMaxDrawdown(assets, weights);

    const valueAtRisk = new Map<number, number>();
    const conditionalVaR = new Map<number, number>();

    for (const confidence of [0.95, 0.99]) {
      const var95 = calculateVaR(assets, weights, confidence);
      const cvar95 = calculateCVaR(assets, weights, confidence);
      valueAtRisk.set(confidence, var95);
      conditionalVaR.set(confidence, cvar95);
    }

    let beta: number | undefined;
    let alpha: number | undefined;
    if (benchmarkReturns && benchmarkReturns.length > 0) {
      const betaResult = calculateBeta(assets, weights, benchmarkReturns, mergedOptions.riskFreeRate || 0);
      beta = betaResult.beta;
      alpha = betaResult.alpha;
    }

    return {
      portfolioReturn,
      portfolioVolatility,
      excessReturn,
      sharpeRatio,
      downsideRisk,
      sortinoRatio,
      maxDrawdown,
      valueAtRisk,
      conditionalVaR,
      beta,
      alpha,
    };
  }

  aggregateBySector(assets: AssetData[], weights: Map<string, number>): Map<string, number> {
    return aggregateBySector(assets, weights);
  }

  calculateDiversificationRatio(assets: AssetData[], weights: Map<string, number>): number {
    return calculateDiversificationRatio(assets, weights);
  }

  updateConfig(updates: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private determineOptimizationType(constraints: OptimizationConstraints): OptimizationResult['optimizationType'] {
    if (constraints.targetReturn !== undefined) {
      return 'TARGET_RETURN';
    }
    if (constraints.maxRisk !== undefined) {
      return 'TARGET_RETURN';
    }
    return 'MAX_SHARPE';
  }
}

export const portfolioOptimizer = new PortfolioOptimizer();

export type {
  AssetData,
  CovarianceOptions,
  EfficientFrontierPoint,
  OptimizationConstraints,
  OptimizationResult,
  OptimizerConfig,
  PortfolioRiskMetrics,
};
