/**
 * Modern Portfolio Theory (MPT)
 * 
 * Implements core MPT concepts:
 * - Efficient Frontier
 * - Minimum Variance Portfolio
 * - Maximum Sharpe Ratio Portfolio
 * - Capital Market Line
 */

import { QuadraticOptimizer } from './QuadraticOptimizer';
import { CovarianceCalculator } from './CovarianceCalculator';
import { ReturnsCalculator } from './ReturnsCalculator';
import type { 
  Asset, 
  MPTConfig, 
  EfficientFrontier, 
  Portfolio,
  CapitalMarketLine 
} from './types';

export class ModernPortfolioTheory {
  private optimizer: QuadraticOptimizer;
  private covarianceCalculator: CovarianceCalculator;
  private returnsCalculator: ReturnsCalculator;
  private config: MPTConfig;

  constructor(config: MPTConfig) {
    this.config = config;
    this.optimizer = new QuadraticOptimizer(config.optimizer);
    this.covarianceCalculator = new CovarianceCalculator(config.covariance);
    this.returnsCalculator = new ReturnsCalculator(config.returns);
  }

  /**
   * Calculate efficient frontier
   */
  calculateEfficientFrontier(
    assets: Asset[],
    numPortfolios: number = 100
  ): EfficientFrontier {
    // Calculate expected returns and covariance matrix
    const expectedReturns = this.returnsCalculator.calculateExpectedReturns(assets);
    const covarianceMatrix = this.covarianceCalculator.calculateCovarianceMatrix(assets);

    // Calculate minimum variance portfolio
    const minVarPortfolio = this.calculateMinimumVariancePortfolio(
      expectedReturns,
      covarianceMatrix
    );

    // Calculate maximum Sharpe ratio portfolio
    const maxSharpePortfolio = this.calculateMaximumSharpePortfolio(
      expectedReturns,
      covarianceMatrix,
      this.config.riskFreeRate
    );

    // Generate portfolios along the efficient frontier
    const frontierPortfolios: Portfolio[] = [];
    const minReturn = minVarPortfolio.expectedReturn;
    const maxReturn = maxSharpePortfolio.expectedReturn;

    for (let i = 0; i < numPortfolios; i++) {
      const targetReturn = minReturn + (maxReturn - minReturn) * (i / (numPortfolios - 1));

      const portfolio = this.optimizeForTargetReturn(
        expectedReturns,
        covarianceMatrix,
        targetReturn
      );

      frontierPortfolios.push(portfolio);
    }

    // Calculate Capital Market Line
    const capitalMarketLine = this.calculateCapitalMarketLine(
      maxSharpePortfolio,
      this.config.riskFreeRate
    );

    return {
      portfolios: frontierPortfolios,
      minimumVariance: minVarPortfolio,
      maximumSharpe: maxSharpePortfolio,
      capitalMarketLine,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate minimum variance portfolio
   */
  private calculateMinimumVariancePortfolio(
    expectedReturns: number[],
    covarianceMatrix: number[][]
  ): Portfolio {
    const weights = this.optimizer.minimizeVariance(covarianceMatrix, {
      sumToOne: true,
      longOnly: true,
      minWeight: 0,
      maxWeight: 1,
    });

    const expectedReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const variance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const standardDeviation = Math.sqrt(variance);

    return {
      weights,
      expectedReturn,
      variance,
      standardDeviation,
      sharpeRatio: (expectedReturn - this.config.riskFreeRate) / standardDeviation,
    };
  }

  /**
   * Calculate maximum Sharpe ratio portfolio
   */
  private calculateMaximumSharpePortfolio(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    riskFreeRate: number
  ): Portfolio {
    const weights = this.optimizer.maximizeSharpeRatio(
      expectedReturns,
      covarianceMatrix,
      riskFreeRate,
      {
        sumToOne: true,
        longOnly: true,
        minWeight: 0,
        maxWeight: 1,
      }
    );

    const expectedReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const variance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const standardDeviation = Math.sqrt(variance);

    return {
      weights,
      expectedReturn,
      variance,
      standardDeviation,
      sharpeRatio: (expectedReturn - riskFreeRate) / standardDeviation,
    };
  }

  /**
   * Optimize for target return
   */
  private optimizeForTargetReturn(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    targetReturn: number
  ): Portfolio {
    const weights = this.optimizer.optimizeForTargetReturn(
      expectedReturns,
      covarianceMatrix,
      targetReturn,
      {
        sumToOne: true,
        longOnly: true,
        minWeight: 0,
        maxWeight: 1,
      }
    );

    const expectedReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const variance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const standardDeviation = Math.sqrt(variance);

    return {
      weights,
      expectedReturn,
      variance,
      standardDeviation,
      sharpeRatio: (expectedReturn - this.config.riskFreeRate) / standardDeviation,
    };
  }

  /**
   * Calculate Capital Market Line
   */
  private calculateCapitalMarketLine(
    marketPortfolio: Portfolio,
    riskFreeRate: number
  ): CapitalMarketLine {
    const slope = (marketPortfolio.expectedReturn - riskFreeRate) / marketPortfolio.standardDeviation;
    const intercept = riskFreeRate;

    // Generate points along the CML
    const points: Array<{ risk: number; return: number }> = [];
    const maxRisk = marketPortfolio.standardDeviation * 2;

    for (let i = 0; i <= 20; i++) {
      const risk = (maxRisk / 20) * i;
      const expectedReturn = intercept + slope * risk;
      points.push({ risk, return: expectedReturn });
    }

    return {
      slope,
      intercept,
      points,
    };
  }

  /**
   * Calculate portfolio return
   */
  private calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
    let portfolioReturn = 0;
    for (let i = 0; i < weights.length; i++) {
      portfolioReturn += weights[i] * expectedReturns[i];
    }
    return portfolioReturn;
  }

  /**
   * Calculate portfolio variance
   */
  private calculatePortfolioVariance(weights: number[], covarianceMatrix: number[][]): number {
    const n = weights.length;
    let variance = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }

    return variance;
  }

  /**
   * Optimize portfolio with custom constraints
   */
  optimizePortfolio(
    assets: Asset[],
    targetReturn?: number,
    maxRisk?: number
  ): Portfolio {
    const expectedReturns = this.returnsCalculator.calculateExpectedReturns(assets);
    const covarianceMatrix = this.covarianceCalculator.calculateCovarianceMatrix(assets);

    if (targetReturn !== undefined) {
      return this.optimizeForTargetReturn(expectedReturns, covarianceMatrix, targetReturn);
    } else if (maxRisk !== undefined) {
      return this.calculateMaximumSharpePortfolio(expectedReturns, covarianceMatrix, this.config.riskFreeRate);
    } else {
      return this.calculateMaximumSharpePortfolio(expectedReturns, covarianceMatrix, this.config.riskFreeRate);
    }
  }
}
