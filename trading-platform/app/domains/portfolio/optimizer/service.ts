import { EventEmitter } from 'events';
import {
  AssetData,
  OptimizationConstraints,
  OptimizationResult,
  EfficientFrontierPoint,
  CovarianceOptions,
  PortfolioRiskMetrics,
  OptimizerConfig,
  DEFAULT_CONFIG,
  DEFAULT_CONSTRAINTS,
} from './types';
import { OptimizationAlgorithms } from './algorithms';
import { ConstraintHandler } from './constraints';
import { CalculationUtils } from './calculations';

export class PortfolioOptimizer extends EventEmitter {
  private config: OptimizerConfig;
  private cachedCovarianceMatrices: Map<string, Map<string, Map<string, number>>> = new Map();
  private algorithms: OptimizationAlgorithms;
  private constraintHandler: ConstraintHandler;

  constructor(config: Partial<OptimizerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.algorithms = new OptimizationAlgorithms(this.config);
    this.constraintHandler = new ConstraintHandler();
  }

  optimize(assets: AssetData[], constraints: Partial<OptimizationConstraints> = {}, options: Partial<CovarianceOptions> = {}): OptimizationResult {
    if (assets.length === 0) return this.createEmptyResult();
    if (assets.length === 1) return this.optimizeSingleAsset(assets[0]);

    const mergedConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };
    const covarianceMatrix = this.getCachedCovarianceMatrix(assets, mergedOptions);
    const expectedReturns = CalculationUtils.calculateExpectedReturns(assets, mergedOptions.tradingDaysPerYear!);
    const optimizationType = this.constraintHandler.determineOptimizationType(mergedConstraints);
    const frontier = this.buildEfficientFrontier(assets, 50);

    const boundApply = this.constraintHandler.applyConstraints.bind(this.constraintHandler);
    const boundReturn = (w: Map<string, number>) => CalculationUtils.calculatePortfolioReturn(w, expectedReturns);
    const boundVol = (w: Map<string, number>) => CalculationUtils.calculatePortfolioVolatility(w, covarianceMatrix);

    switch (optimizationType) {
      case 'MAX_SHARPE':
        return this.algorithms.optimizeMaxSharpe(assets, covarianceMatrix, expectedReturns, mergedConstraints, frontier, boundApply, boundReturn, boundVol);
      case 'MIN_VARIANCE':
        return this.algorithms.optimizeMinVariance(assets, covarianceMatrix, expectedReturns, mergedConstraints, frontier, boundApply, boundReturn);
      case 'RISK_PARITY':
        return this.algorithms.optimizeRiskParity(assets, covarianceMatrix, mergedConstraints, frontier, boundVol);
      case 'TARGET_RETURN':
        return this.algorithms.optimizeTargetReturn(assets, mergedConstraints, frontier, boundApply);
      default:
        return this.algorithms.optimizeMaxSharpe(assets, covarianceMatrix, expectedReturns, mergedConstraints, frontier, boundApply, boundReturn, boundVol);
    }
  }

  generateEfficientFrontier(assets: AssetData[], points = 50, _options: Partial<CovarianceOptions> = {}): EfficientFrontierPoint[] {
    if (assets.length === 0) return [];
    return this.buildEfficientFrontier(assets, points);
  }

  private buildEfficientFrontier(assets: AssetData[], points: number): EfficientFrontierPoint[] {
    const returns = assets.map(a => CalculationUtils.calculateAnnualizedReturn(a.returns, 252));
    let minReturn = Infinity, maxReturn = -Infinity;
    for (const ret of returns) { if (ret < minReturn) minReturn = ret; if (ret > maxReturn) maxReturn = ret; }

    const frontier: EfficientFrontierPoint[] = [];
    const step = (maxReturn - minReturn) / (points - 1);
    const boundApply = this.constraintHandler.applyConstraints.bind(this.constraintHandler);

    for (let i = 0; i < points; i++) {
      const targetReturn = minReturn + step * i;
      const weights = boundApply(new Map(assets.map(a => [a.symbol, 1 / assets.length])), assets, { ...DEFAULT_CONSTRAINTS, targetReturn });
      const covarianceMatrix = this.getCachedCovarianceMatrix(assets, { tradingDaysPerYear: 252 });
      const expectedReturns = CalculationUtils.calculateExpectedReturns(assets, 252);
      frontier.push({
        return: targetReturn,
        volatility: CalculationUtils.calculatePortfolioVolatility(weights, covarianceMatrix),
        sharpeRatio: this.calculateSharpe(weights, covarianceMatrix, expectedReturns),
        weights,
      });
    }
    return frontier;
  }

  private calculateSharpe(weights: Map<string, number>, cov: Map<string, Map<string, number>>, expRet: Map<string, number>): number {
    const vol = CalculationUtils.calculatePortfolioVolatility(weights, cov);
    return vol > 0 ? (CalculationUtils.calculatePortfolioReturn(weights, expRet) - this.config.riskFreeRate) / vol : 0;
  }

  calculateRiskMetrics(assets: AssetData[], weights: Map<string, number>, benchmarkReturns?: number[], options: Partial<CovarianceOptions> = {}): PortfolioRiskMetrics {
    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };
    const covarianceMatrix = this.getCachedCovarianceMatrix(assets, mergedOptions);
    const expectedReturns = CalculationUtils.calculateExpectedReturns(assets, mergedOptions.tradingDaysPerYear!);

    const portfolioReturn = CalculationUtils.calculatePortfolioReturn(weights, expectedReturns);
    const portfolioVolatility = CalculationUtils.calculatePortfolioVolatility(weights, covarianceMatrix);
    const excessReturn = portfolioReturn - mergedOptions.riskFreeRate!;
    const sharpeRatio = portfolioVolatility > 0 ? excessReturn / portfolioVolatility : 0;
    const downsideRisk = CalculationUtils.calculateDownsideRisk(assets, weights);
    const sortinoRatio = downsideRisk > 0 ? excessReturn / downsideRisk : 0;
    const maxDrawdown = CalculationUtils.calculateMaxDrawdown(assets, weights);

    const valueAtRisk = new Map<number, number>();
    const conditionalVaR = new Map<number, number>();
    for (const confidence of [0.95, 0.99]) {
      valueAtRisk.set(confidence, CalculationUtils.calculateVaR(assets, weights, confidence));
      conditionalVaR.set(confidence, CalculationUtils.calculateCVaR(assets, weights, confidence));
    }

    let beta: number | undefined, alpha: number | undefined;
    if (benchmarkReturns?.length) {
      const result = CalculationUtils.calculateBeta(assets, weights, benchmarkReturns, mergedOptions.riskFreeRate!);
      beta = result.beta; alpha = result.alpha;
    }

    return { portfolioReturn, portfolioVolatility, excessReturn, sharpeRatio, downsideRisk, sortinoRatio, maxDrawdown, valueAtRisk, conditionalVaR, beta, alpha };
  }

  aggregateBySector(assets: AssetData[], weights: Map<string, number>): Map<string, number> {
    return this.constraintHandler.aggregateBySector(assets, weights);
  }

  calculateDiversificationRatio(assets: AssetData[], weights: Map<string, number>): number {
    const covarianceMatrix = this.getCachedCovarianceMatrix(assets, { tradingDaysPerYear: 252 });
    const portfolioVol = CalculationUtils.calculatePortfolioVolatility(weights, covarianceMatrix);
    let weightedVolSum = 0;
    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset) weightedVolSum += weight * CalculationUtils.calculateAnnualizedVolatility(asset.returns);
    });
    return portfolioVol > 0 ? weightedVolSum / portfolioVol : 1;
  }

  updateConfig(updates: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.algorithms = new OptimizationAlgorithms(this.config);
  }

  private getCachedCovarianceMatrix(assets: AssetData[], options: CovarianceOptions): Map<string, Map<string, number>> {
    const cacheKey = assets.map(a => a.symbol).join('_');
    if (!this.cachedCovarianceMatrices.has(cacheKey)) {
      this.cachedCovarianceMatrices.set(cacheKey, CalculationUtils.calculateCovarianceMatrix(assets, options));
    }
    return this.cachedCovarianceMatrices.get(cacheKey)!;
  }

  private optimizeSingleAsset(asset: AssetData): OptimizationResult {
    const result = CalculationUtils.optimizeSingleAsset(asset, this.config.riskFreeRate);
    return {
      weights: new Map([[asset.symbol, 1]]),
      expectedReturn: result.return,
      expectedVolatility: result.volatility,
      sharpeRatio: result.sharpe,
      efficientFrontier: [],
      optimizationType: 'MIN_VARIANCE',
      confidence: 1.0,
    };
  }

  private createEmptyResult(): OptimizationResult {
    return { weights: new Map(), expectedReturn: 0, expectedVolatility: 0, sharpeRatio: 0, efficientFrontier: [], optimizationType: 'MAX_SHARPE', confidence: 0 };
  }
}

export const portfolioOptimizer = new PortfolioOptimizer();
