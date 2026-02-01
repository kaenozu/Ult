/**
 * Quadratic Optimizer
 * 
 * Solves quadratic optimization problems for portfolio optimization.
 * Implements methods for:
 * - Minimum variance
 * - Maximum Sharpe ratio
 * - Target return optimization
 */

import type { OptimizerConfig, OptimizationConstraints, OptimizationResult } from './types';

export class QuadraticOptimizer {
  private config: Required<OptimizerConfig>;

  constructor(config: OptimizerConfig = {}) {
    this.config = {
      maxIterations: config.maxIterations || 1000,
      convergenceTolerance: config.convergenceTolerance || 1e-8,
      method: config.method || 'quadratic',
    };
  }

  /**
   * Minimize portfolio variance subject to constraints
   */
  minimizeVariance(
    covMatrix: number[][],
    constraints: OptimizationConstraints = {}
  ): number[] {
    const n = covMatrix.length;
    
    // Start with equal weights
    let weights = Array(n).fill(1 / n);
    
    // Apply gradient descent
    const learningRate = 0.01;
    let iteration = 0;
    let converged = false;

    while (iteration < this.config.maxIterations && !converged) {
      const gradient = this.calculateVarianceGradient(weights, covMatrix);
      const newWeights = Array(n);
      
      // Update weights
      for (let i = 0; i < n; i++) {
        newWeights[i] = weights[i] - learningRate * gradient[i];
      }

      // Project onto constraints
      this.projectOntoConstraints(newWeights, constraints);

      // Check convergence
      const change = this.euclideanDistance(weights, newWeights);
      if (change < this.config.convergenceTolerance) {
        converged = true;
      }

      weights = newWeights;
      iteration++;
    }

    return weights;
  }

  /**
   * Maximize Sharpe ratio
   */
  maximizeSharpeRatio(
    expectedReturns: number[],
    covMatrix: number[][],
    riskFreeRate: number,
    constraints: OptimizationConstraints = {}
  ): number[] {
    const n = expectedReturns.length;
    
    // Transform to minimize -Sharpe ratio
    let weights = Array(n).fill(1 / n);
    const learningRate = 0.01;
    let iteration = 0;
    let converged = false;

    while (iteration < this.config.maxIterations && !converged) {
      const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
      const portfolioVolatility = this.calculatePortfolioVolatility(weights, covMatrix);
      
      if (portfolioVolatility === 0) break;

      const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioVolatility;
      
      // Gradient of -Sharpe ratio
      const gradient = this.calculateSharpeGradient(
        weights,
        expectedReturns,
        covMatrix,
        riskFreeRate,
        portfolioReturn,
        portfolioVolatility
      );

      const newWeights = Array(n);
      for (let i = 0; i < n; i++) {
        newWeights[i] = weights[i] - learningRate * gradient[i];
      }

      this.projectOntoConstraints(newWeights, constraints);

      const change = this.euclideanDistance(weights, newWeights);
      if (change < this.config.convergenceTolerance) {
        converged = true;
      }

      weights = newWeights;
      iteration++;
    }

    return weights;
  }

  /**
   * Optimize for target return
   */
  optimizeForTargetReturn(
    expectedReturns: number[],
    covMatrix: number[][],
    targetReturn: number,
    constraints: OptimizationConstraints = {}
  ): number[] {
    const n = expectedReturns.length;
    
    // Use Lagrange multiplier approach
    let weights = Array(n).fill(1 / n);
    let lambda = 0; // Lagrange multiplier for return constraint
    
    const learningRate = 0.01;
    let iteration = 0;
    let converged = false;

    while (iteration < this.config.maxIterations && !converged) {
      // Calculate gradients
      const varianceGrad = this.calculateVarianceGradient(weights, covMatrix);
      const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
      
      // Update weights with constraint
      const newWeights = Array(n);
      for (let i = 0; i < n; i++) {
        newWeights[i] = weights[i] - learningRate * (varianceGrad[i] - lambda * expectedReturns[i]);
      }

      this.projectOntoConstraints(newWeights, constraints);

      // Update lambda to enforce return constraint
      const newReturn = this.calculatePortfolioReturn(newWeights, expectedReturns);
      lambda += learningRate * (targetReturn - newReturn);

      const change = this.euclideanDistance(weights, newWeights);
      if (change < this.config.convergenceTolerance) {
        converged = true;
      }

      weights = newWeights;
      iteration++;
    }

    return weights;
  }

  /**
   * Calculate variance gradient
   */
  private calculateVarianceGradient(weights: number[], covMatrix: number[][]): number[] {
    const n = weights.length;
    const gradient = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        gradient[i] += 2 * covMatrix[i][j] * weights[j];
      }
    }

    return gradient;
  }

  /**
   * Calculate Sharpe ratio gradient
   */
  private calculateSharpeGradient(
    weights: number[],
    expectedReturns: number[],
    covMatrix: number[][],
    riskFreeRate: number,
    portfolioReturn: number,
    portfolioVolatility: number
  ): number[] {
    const n = weights.length;
    const gradient = Array(n).fill(0);
    const excessReturn = portfolioReturn - riskFreeRate;

    const varianceGrad = this.calculateVarianceGradient(weights, covMatrix);

    for (let i = 0; i < n; i++) {
      const returnGrad = expectedReturns[i];
      const volGrad = varianceGrad[i] / (2 * portfolioVolatility);
      
      // d(Sharpe)/d(w_i) = (return_grad * vol - excess_return * vol_grad) / vol^2
      gradient[i] = -(returnGrad * portfolioVolatility - excessReturn * volGrad) / 
                    (portfolioVolatility * portfolioVolatility);
    }

    return gradient;
  }

  /**
   * Project weights onto constraints
   */
  private projectOntoConstraints(weights: number[], constraints: OptimizationConstraints): void {
    const n = weights.length;

    // Apply weight bounds
    const minWeight = constraints.minWeight ?? 0;
    const maxWeight = constraints.maxWeight ?? 1;

    for (let i = 0; i < n; i++) {
      weights[i] = Math.max(minWeight, Math.min(maxWeight, weights[i]));
    }

    // Normalize to sum to 1
    if (constraints.sumToOne !== false) {
      const sum = weights.reduce((s, w) => s + w, 0);
      if (sum > 0) {
        for (let i = 0; i < n; i++) {
          weights[i] /= sum;
        }
      }
    }

    // Apply long-only constraint
    if (constraints.longOnly) {
      for (let i = 0; i < n; i++) {
        weights[i] = Math.max(0, weights[i]);
      }
    }
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
   * Calculate portfolio volatility
   */
  private calculatePortfolioVolatility(weights: number[], covMatrix: number[][]): number {
    const n = weights.length;
    let variance = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covMatrix[i][j];
      }
    }

    return Math.sqrt(variance);
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
}
