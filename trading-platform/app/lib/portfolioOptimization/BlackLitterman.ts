/**
 * Black-Litterman Model
 * 
 * Implements the Black-Litterman asset allocation model which:
 * - Combines market equilibrium with investor views
 * - Produces more stable and intuitive portfolios than classical MPT
 * - Allows for incorporating subjective views with confidence levels
 */

import { ModernPortfolioTheory } from './ModernPortfolioTheory';
import { CovarianceCalculator } from './CovarianceCalculator';
import type {
  Asset,
  BlackLittermanConfig,
  BlackLittermanResult,
  View,
  ProcessedViews,
  Portfolio,
  SensitivityAnalysisResult,
  SensitivityMetric,
} from './types';

export class BlackLitterman {
  private mpt: ModernPortfolioTheory;
  private covarianceCalculator: CovarianceCalculator;
  private config: BlackLittermanConfig;
  private tau: number;

  constructor(config: BlackLittermanConfig) {
    this.config = config;
    this.mpt = new ModernPortfolioTheory(config.mptConfig);
    this.covarianceCalculator = new CovarianceCalculator(config.mptConfig.covariance);
    this.tau = config.tau || 0.05;
  }

  /**
   * Optimize portfolio with Black-Litterman model
   */
  optimizeWithBlackLitterman(
    assets: Asset[],
    views: View[]
  ): BlackLittermanResult {
    // Calculate market equilibrium returns
    const marketReturns = this.calculateEquilibriumReturns(assets);

    // Process views
    const processedViews = this.processViews(views, assets);

    // Adjust returns using Black-Litterman formula
    const adjustedReturns = this.adjustReturns(
      marketReturns,
      processedViews,
      assets
    );

    // Get covariance matrix
    const covarianceMatrix = this.covarianceCalculator.calculateCovarianceMatrix(assets);

    // Optimize portfolio with adjusted returns
    const portfolio = this.optimizePortfolio(adjustedReturns, covarianceMatrix);

    return {
      marketReturns,
      adjustedReturns,
      views: processedViews,
      portfolio,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate market equilibrium returns (implied returns)
   * Using reverse optimization: Π = λ * Σ * w_market
   */
  private calculateEquilibriumReturns(assets: Asset[]): number[] {
    const n = assets.length;
    
    // Get market cap weights (or equal weights if not available)
    const marketWeights = this.getMarketWeights(assets);
    
    // Get covariance matrix
    const covarianceMatrix = this.covarianceCalculator.calculateCovarianceMatrix(assets);
    
    // Risk aversion parameter (typical value: 2.5)
    const lambda = this.config.riskAversion || 2.5;

    // Π = λ * Σ * w
    const equilibriumReturns: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        equilibriumReturns[i] += lambda * covarianceMatrix[i][j] * marketWeights[j];
      }
    }

    return equilibriumReturns;
  }

  /**
   * Get market capitalization weights
   */
  private getMarketWeights(assets: Asset[]): number[] {
    const n = assets.length;
    
    // If market cap is available, use it
    const hasMarketCap = assets.every(a => a.marketCap !== undefined && a.marketCap > 0);
    
    if (hasMarketCap) {
      const totalMarketCap = assets.reduce((sum, a) => sum + (a.marketCap || 0), 0);
      return assets.map(a => (a.marketCap || 0) / totalMarketCap);
    }
    
    // Otherwise, use equal weights
    return Array(n).fill(1 / n);
  }

  /**
   * Process investor views into matrix form
   */
  private processViews(views: View[], assets: Asset[]): ProcessedViews {
    const n = assets.length;
    const k = views.length;

    // Pick matrix P (k x n)
    const pickMatrix: number[][] = Array(k).fill(null).map(() => Array(n).fill(0));
    
    // View returns Q (k x 1)
    const viewReturns: number[] = Array(k).fill(0);
    
    // View uncertainty Ω (k x k)
    const viewUncertainty: number[][] = Array(k).fill(null).map(() => Array(k).fill(0));

    // Build asset symbol to index map
    const assetIndexMap = new Map<string, number>();
    assets.forEach((asset, index) => {
      assetIndexMap.set(asset.symbol, index);
    });

    views.forEach((view, i) => {
      viewReturns[i] = view.expectedReturn;

      if (view.type === 'absolute') {
        // Absolute view: asset will return X%
        const assetIdx = assetIndexMap.get(view.assets[0]);
        if (assetIdx !== undefined) {
          pickMatrix[i][assetIdx] = 1;
        }
      } else {
        // Relative view: asset A will outperform asset B by X%
        const assetAIdx = assetIndexMap.get(view.assets[0]);
        const assetBIdx = assetIndexMap.get(view.assets[1]);
        if (assetAIdx !== undefined && assetBIdx !== undefined) {
          pickMatrix[i][assetAIdx] = 1;
          pickMatrix[i][assetBIdx] = -1;
        }
      }

      // View uncertainty proportional to confidence
      // Lower confidence = higher uncertainty
      const baseUncertainty = 0.001; // Base uncertainty
      viewUncertainty[i][i] = baseUncertainty / view.confidence;
    });

    return {
      pickMatrix,
      viewReturns,
      viewUncertainty,
    };
  }

  /**
   * Adjust returns using Black-Litterman formula
   * E[R] = [(τΣ)^{-1} + P'Ω^{-1}P]^{-1} * [(τΣ)^{-1}Π + P'Ω^{-1}Q]
   */
  private adjustReturns(
    marketReturns: number[],
    views: ProcessedViews,
    assets: Asset[]
  ): number[] {
    const n = assets.length;
    const tau = this.tau;
    
    // Get covariance matrix Σ
    const covMatrix = this.covarianceCalculator.calculateCovarianceMatrix(assets);
    
    // Calculate τΣ
    const tauSigma = this.scalarMultiply(tau, covMatrix);
    
    // Calculate (τΣ)^{-1}
    const tauSigmaInv = this.matrixInverse(tauSigma);
    
    // Extract matrices from views
    const P = views.pickMatrix;
    const Q = views.viewReturns;
    const Omega = views.viewUncertainty;
    
    // Calculate Ω^{-1}
    const omegaInv = this.matrixInverse(Omega);
    
    // Calculate P'
    const PT = this.transpose(P);
    
    // Calculate P'Ω^{-1}
    const PTOmegaInv = this.matrixMultiply(PT, omegaInv);
    
    // Calculate P'Ω^{-1}P
    const PTOmegaInvP = this.matrixMultiply(PTOmegaInv, P);
    
    // Calculate [(τΣ)^{-1} + P'Ω^{-1}P]
    const term1 = this.matrixAdd(tauSigmaInv, PTOmegaInvP);
    
    // Calculate [(τΣ)^{-1} + P'Ω^{-1}P]^{-1}
    const term1Inv = this.matrixInverse(term1);
    
    // Calculate (τΣ)^{-1}Π
    const tauSigmaInvPi = this.matrixVectorMultiply(tauSigmaInv, marketReturns);
    
    // Calculate P'Ω^{-1}Q
    const PTOmegaInvQ = this.matrixVectorMultiply(PTOmegaInv, Q);
    
    // Calculate [(τΣ)^{-1}Π + P'Ω^{-1}Q]
    const term2 = this.vectorAdd(tauSigmaInvPi, PTOmegaInvQ);
    
    // Final: E[R] = [(τΣ)^{-1} + P'Ω^{-1}P]^{-1} * [(τΣ)^{-1}Π + P'Ω^{-1}Q]
    const adjustedReturns = this.matrixVectorMultiply(term1Inv, term2);
    
    return adjustedReturns;
  }

  /**
   * Optimize portfolio with adjusted returns
   */
  private optimizePortfolio(
    adjustedReturns: number[],
    covarianceMatrix: number[][]
  ): Portfolio {
    const n = adjustedReturns.length;
    
    // Simple mean-variance optimization
    // Maximize Sharpe ratio
    const weights = this.optimizeWeights(adjustedReturns, covarianceMatrix);
    
    const expectedReturn = this.calculatePortfolioReturn(weights, adjustedReturns);
    const variance = this.calculatePortfolioVariance(weights, covarianceMatrix);
    const standardDeviation = Math.sqrt(variance);
    const sharpeRatio = (expectedReturn - this.config.mptConfig.riskFreeRate) / standardDeviation;

    return {
      weights,
      expectedReturn,
      variance,
      standardDeviation,
      sharpeRatio,
    };
  }

  /**
   * Simple weight optimization
   */
  private optimizeWeights(expectedReturns: number[], covMatrix: number[][]): number[] {
    const n = expectedReturns.length;
    
    // Use gradient descent for simplicity
    let weights = Array(n).fill(1 / n);
    const learningRate = 0.01;
    const maxIter = 1000;
    
    for (let iter = 0; iter < maxIter; iter++) {
      const gradient = this.calculateSharpeGradient(weights, expectedReturns, covMatrix);
      
      for (let i = 0; i < n; i++) {
        weights[i] -= learningRate * gradient[i];
        weights[i] = Math.max(0, weights[i]); // Long-only
      }
      
      // Normalize
      const sum = weights.reduce((s, w) => s + w, 0);
      if (sum > 0) {
        weights = weights.map(w => w / sum);
      }
    }
    
    return weights;
  }

  /**
   * Calculate Sharpe ratio gradient
   */
  private calculateSharpeGradient(
    weights: number[],
    expectedReturns: number[],
    covMatrix: number[][]
  ): number[] {
    const n = weights.length;
    const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const portfolioVol = Math.sqrt(this.calculatePortfolioVariance(weights, covMatrix));
    const excessReturn = portfolioReturn - this.config.mptConfig.riskFreeRate;
    
    const gradient = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      let volGrad = 0;
      for (let j = 0; j < n; j++) {
        volGrad += covMatrix[i][j] * weights[j];
      }
      volGrad /= portfolioVol;
      
      gradient[i] = -(expectedReturns[i] * portfolioVol - excessReturn * volGrad) / 
                    (portfolioVol * portfolioVol);
    }
    
    return gradient;
  }

  /**
   * Perform sensitivity analysis
   */
  performSensitivityAnalysis(
    assets: Asset[],
    views: View[],
    sensitivity: number = 0.1
  ): SensitivityAnalysisResult {
    const baseResult = this.optimizeWithBlackLitterman(assets, views);
    const sensitivities: SensitivityMetric[] = [];

    // Analyze each view
    for (let i = 0; i < views.length; i++) {
      const perturbedViews = views.map((v, j) =>
        j === i 
          ? { ...v, expectedReturn: v.expectedReturn * (1 + sensitivity) }
          : v
      );

      const perturbedResult = this.optimizeWithBlackLitterman(assets, perturbedViews);
      
      const weightChange = perturbedResult.portfolio.weights.map(
        (w, idx) => w - baseResult.portfolio.weights[idx]
      );

      sensitivities.push({
        view: views[i],
        weightChange,
        sensitivity,
      });
    }

    return {
      baseResult,
      sensitivities,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // Matrix Operations
  // ============================================================================

  private scalarMultiply(scalar: number, matrix: number[][]): number[][] {
    return matrix.map(row => row.map(val => scalar * val));
  }

  private matrixAdd(a: number[][], b: number[][]): number[][] {
    const n = a.length;
    const m = a[0].length;
    const result: number[][] = Array(n).fill(null).map(() => Array(m).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        result[i][j] = a[i][j] + b[i][j];
      }
    }
    
    return result;
  }

  private transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result: number[][] = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j];
      }
    }
    
    return result;
  }

  private matrixMultiply(a: number[][], b: number[][]): number[][] {
    const rowsA = a.length;
    const colsA = a[0].length;
    const colsB = b[0].length;
    const result: number[][] = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));
    
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    
    return result;
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    const n = matrix.length;
    const result: number[] = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < vector.length; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }
    
    return result;
  }

  private vectorAdd(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + b[i]);
  }

  private matrixInverse(matrix: number[][]): number[][] {
    const n = matrix.length;
    
    // Create augmented matrix [A | I]
    const augmented: number[][] = matrix.map((row, i) => [
      ...row,
      ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))
    ]);

    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(augmented[j][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = j;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Scale pivot row
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) {
        // Matrix is singular, return identity
        return Array(n).fill(null).map((_, i) => 
          Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))
        );
      }

      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      // Eliminate column
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const factor = augmented[j][i];
          for (let k = 0; k < 2 * n; k++) {
            augmented[j][k] -= factor * augmented[i][k];
          }
        }
      }
    }

    // Extract inverse from right half
    return augmented.map(row => row.slice(n));
  }

  private calculatePortfolioReturn(weights: number[], returns: number[]): number {
    return weights.reduce((sum, w, i) => sum + w * returns[i], 0);
  }

  private calculatePortfolioVariance(weights: number[], covMatrix: number[][]): number {
    const n = weights.length;
    let variance = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covMatrix[i][j];
      }
    }
    
    return variance;
  }
}
