/**
 * Factor Modeling
 * 
 * Implements factor-based portfolio analysis:
 * - PCA-based factor extraction
 * - Predefined factor models (market, size, value, momentum)
 * - Factor regression and risk attribution
 */

import type {
  Asset,
  FactorModelingConfig,
  Factor,
  FactorExtractionResult,
  FactorModel,
  RiskAttributionResult,
} from './types';

export class FactorModeling {
  private config: FactorModelingConfig;

  constructor(config: FactorModelingConfig) {
    this.config = config;
  }

  /**
   * Extract factors from asset returns
   */
  extractFactors(assets: Asset[]): FactorExtractionResult {
    const returns = assets.map(a => a.returns);

    // Extract PCA factors
    const pcaFactors = this.extractPCAFactors(returns);

    // Extract predefined factors if configured
    const predefinedFactors = this.extractPredefinedFactors(assets);

    // Combine all factors
    const allFactors = [...pcaFactors, ...predefinedFactors];

    // Calculate factor returns
    const factorReturns = allFactors.map(f => f.returns);

    // Calculate factor correlations
    const factorCorrelations = this.calculateCorrelationMatrix(factorReturns);

    return {
      factors: allFactors,
      factorReturns,
      factorCorrelations,
      timestamp: new Date(),
    };
  }

  /**
   * Extract factors using PCA (Principal Component Analysis)
   */
  private extractPCAFactors(returns: number[][]): Factor[] {
    const n = returns.length; // Number of assets
    const T = returns[0].length; // Number of time periods

    // Center the data
    const means = returns.map(r => this.mean(r));
    const centered = returns.map((r, i) => r.map(val => val - means[i]));

    // Calculate covariance matrix
    const covMatrix = this.calculateCovarianceMatrix(centered);

    // Perform eigenvalue decomposition (simplified)
    const { eigenvalues, eigenvectors } = this.eigenDecomposition(covMatrix);

    // Sort by eigenvalue (descending)
    const sorted = eigenvalues
      .map((val, idx) => ({ value: val, vector: eigenvectors[idx] }))
      .sort((a, b) => b.value - a.value);

    // Determine number of factors to keep
    const numFactors = this.determineNumFactors(sorted.map(s => s.value));

    // Extract top factors
    const factors: Factor[] = [];
    for (let i = 0; i < numFactors; i++) {
      const eigenvector = sorted[i].vector;
      
      // Calculate factor returns as weighted sum
      const factorReturns: number[] = [];
      for (let t = 0; t < T; t++) {
        let factorReturn = 0;
        for (let j = 0; j < n; j++) {
          factorReturn += eigenvector[j] * centered[j][t];
        }
        factorReturns.push(factorReturn);
      }

      factors.push({
        id: `PC${i + 1}`,
        name: `Principal Component ${i + 1}`,
        returns: factorReturns,
        type: 'custom',
        loadings: eigenvector,
      });
    }

    return factors;
  }

  /**
   * Determine number of factors to keep based on variance explained
   */
  private determineNumFactors(eigenvalues: number[]): number {
    const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0);
    const threshold = this.config.factorExtractor.varianceThreshold || 0.95;
    
    let cumulativeVariance = 0;
    let numFactors = 0;

    for (const eigenvalue of eigenvalues) {
      cumulativeVariance += eigenvalue / totalVariance;
      numFactors++;
      
      if (cumulativeVariance >= threshold) {
        break;
      }
    }

    // Limit by configured number
    const maxFactors = this.config.factorExtractor.numPCAFactors || 5;
    return Math.min(numFactors, maxFactors);
  }

  /**
   * Extract predefined factors (simplified)
   */
  private extractPredefinedFactors(assets: Asset[]): Factor[] {
    const factors: Factor[] = [];
    const predefined = this.config.factorExtractor.predefinedFactors || [];

    if (predefined.includes('market')) {
      factors.push(this.createMarketFactor(assets));
    }

    if (predefined.includes('size')) {
      factors.push(this.createSizeFactor(assets));
    }

    if (predefined.includes('value')) {
      factors.push(this.createValueFactor(assets));
    }

    if (predefined.includes('momentum')) {
      factors.push(this.createMomentumFactor(assets));
    }

    return factors;
  }

  /**
   * Create market factor (equal-weighted or cap-weighted index)
   */
  private createMarketFactor(assets: Asset[]): Factor {
    const T = assets[0].returns.length;
    const n = assets.length;
    
    // Use equal weights for simplicity
    const weights = Array(n).fill(1 / n);
    
    const marketReturns: number[] = [];
    for (let t = 0; t < T; t++) {
      let marketReturn = 0;
      for (let i = 0; i < n; i++) {
        marketReturn += weights[i] * assets[i].returns[t];
      }
      marketReturns.push(marketReturn);
    }

    return {
      id: 'MKT',
      name: 'Market Factor',
      returns: marketReturns,
      type: 'market',
    };
  }

  /**
   * Create size factor (SMB - Small Minus Big)
   */
  private createSizeFactor(assets: Asset[]): Factor {
    const T = assets[0].returns.length;
    
    // Sort by market cap
    const sorted = [...assets].sort((a, b) => (a.marketCap || 0) - (b.marketCap || 0));
    const mid = Math.floor(sorted.length / 2);
    
    const smallCap = sorted.slice(0, mid);
    const bigCap = sorted.slice(mid);
    
    const smbReturns: number[] = [];
    for (let t = 0; t < T; t++) {
      const smallReturn = smallCap.reduce((sum, a) => sum + a.returns[t], 0) / smallCap.length;
      const bigReturn = bigCap.reduce((sum, a) => sum + a.returns[t], 0) / bigCap.length;
      smbReturns.push(smallReturn - bigReturn);
    }

    return {
      id: 'SMB',
      name: 'Size Factor (Small Minus Big)',
      returns: smbReturns,
      type: 'size',
    };
  }

  /**
   * Create value factor (HML - High Minus Low book-to-market)
   */
  private createValueFactor(assets: Asset[]): Factor {
    const T = assets[0].returns.length;
    
    // Simplified: use first half as "value" and second half as "growth"
    const mid = Math.floor(assets.length / 2);
    const value = assets.slice(0, mid);
    const growth = assets.slice(mid);
    
    const hmlReturns: number[] = [];
    for (let t = 0; t < T; t++) {
      const valueReturn = value.reduce((sum, a) => sum + a.returns[t], 0) / value.length;
      const growthReturn = growth.reduce((sum, a) => sum + a.returns[t], 0) / growth.length;
      hmlReturns.push(valueReturn - growthReturn);
    }

    return {
      id: 'HML',
      name: 'Value Factor (High Minus Low)',
      returns: hmlReturns,
      type: 'value',
    };
  }

  /**
   * Create momentum factor (UMD - Up Minus Down)
   */
  private createMomentumFactor(assets: Asset[]): Factor {
    const T = assets[0].returns.length;
    const lookback = 12; // 12-month momentum
    
    const umdReturns: number[] = [];
    
    for (let t = lookback; t < T; t++) {
      // Calculate past returns for each asset
      const pastReturns = assets.map(a => {
        const returns = a.returns.slice(t - lookback, t);
        return returns.reduce((cum, r) => cum * (1 + r), 1) - 1;
      });
      
      // Split into winners and losers
      const sorted = assets.map((a, i) => ({ asset: a, pastReturn: pastReturns[i] }))
        .sort((a, b) => b.pastReturn - a.pastReturn);
      
      const mid = Math.floor(sorted.length / 2);
      const winners = sorted.slice(0, mid);
      const losers = sorted.slice(mid);
      
      const winnerReturn = winners.reduce((sum, w) => sum + w.asset.returns[t], 0) / winners.length;
      const loserReturn = losers.reduce((sum, l) => sum + l.asset.returns[t], 0) / losers.length;
      
      umdReturns.push(winnerReturn - loserReturn);
    }
    
    // Pad with zeros for initial periods
    const paddedReturns = Array(lookback).fill(0).concat(umdReturns);

    return {
      id: 'UMD',
      name: 'Momentum Factor (Up Minus Down)',
      returns: paddedReturns,
      type: 'momentum',
    };
  }

  /**
   * Estimate factor model for an asset
   */
  estimateFactorModel(asset: Asset, factors: Factor[]): FactorModel {
    const assetReturns = asset.returns;
    const factorReturns = factors.map(f => f.returns);

    // Perform multiple regression
    const regression = this.multipleRegression(assetReturns, factorReturns);

    return {
      assetId: asset.id,
      factorSensitivities: regression.coefficients,
      alpha: regression.intercept,
      rSquared: regression.rSquared,
      standardError: regression.standardError,
      timestamp: new Date(),
    };
  }

  /**
   * Perform multiple linear regression
   */
  private multipleRegression(
    y: number[],
    X: number[][]
  ): {
    intercept: number;
    coefficients: number[];
    rSquared: number;
    standardError: number;
  } {
    const n = y.length;
    const k = X.length; // Number of factors

    // Add intercept column
    const XWithIntercept = [Array(n).fill(1), ...X];
    const XT = this.transpose(XWithIntercept);
    
    // Calculate (X'X)^{-1} * X'y
    const XTX = this.matrixMultiply(XT, XWithIntercept);
    const XTXInv = this.matrixInverse(XTX);
    const XTy = this.matrixVectorMultiply(XT, y);
    const beta = this.matrixVectorMultiply(XTXInv, XTy);

    const intercept = beta[0];
    const coefficients = beta.slice(1);

    // Calculate R-squared
    const yMean = this.mean(y);
    const yPred = y.map((_, i) => {
      let pred = intercept;
      for (let j = 0; j < k; j++) {
        pred += coefficients[j] * X[j][i];
      }
      return pred;
    });

    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - yPred[i], 2), 0);
    const rSquared = 1 - ssRes / ssTot;

    // Calculate standard error
    const standardError = Math.sqrt(ssRes / (n - k - 1));

    return {
      intercept,
      coefficients,
      rSquared,
      standardError,
    };
  }

  /**
   * Perform risk attribution analysis
   */
  performRiskAttribution(
    portfolio: { weights: number[] },
    factorModels: Map<string, FactorModel>,
    factors: Factor[]
  ): RiskAttributionResult {
    const k = factors.length;

    // Calculate factor exposures for the portfolio
    const portfolioFactorExposures: number[] = Array(k).fill(0);
    
    const assetIds = Array.from(factorModels.keys());
    assetIds.forEach((assetId, i) => {
      const model = factorModels.get(assetId);
      if (model) {
        model.factorSensitivities.forEach((beta, j) => {
          portfolioFactorExposures[j] += portfolio.weights[i] * beta;
        });
      }
    });

    // Calculate factor covariance matrix
    const factorReturns = factors.map(f => f.returns);
    const factorCovMatrix = this.calculateCovarianceMatrix(factorReturns);

    // Calculate factor risk contributions
    const factorRisk = new Map<string, number>();
    let totalFactorVariance = 0;

    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        totalFactorVariance += portfolioFactorExposures[i] * factorCovMatrix[i][j] * portfolioFactorExposures[j];
      }
    }

    factors.forEach((factor, i) => {
      let riskContribution = 0;
      for (let j = 0; j < k; j++) {
        riskContribution += portfolioFactorExposures[i] * factorCovMatrix[i][j] * portfolioFactorExposures[j];
      }
      factorRisk.set(factor.id, riskContribution);
    });

    // Calculate specific risk (idiosyncratic)
    const specificRisk = Array.from(factorModels.values()).reduce((sum, model, i) => {
      return sum + Math.pow(portfolio.weights[i] * model.standardError, 2);
    }, 0);

    const totalRisk = Math.sqrt(totalFactorVariance + specificRisk);

    // Calculate marginal contributions
    const marginalContributions = new Map<string, number>();
    factors.forEach((factor, i) => {
      let mc = 0;
      for (let j = 0; j < k; j++) {
        mc += factorCovMatrix[i][j] * portfolioFactorExposures[j];
      }
      marginalContributions.set(factor.id, mc / totalRisk);
    });

    // Diversification effect
    const sumOfIndividualRisks = Math.sqrt(totalFactorVariance) + Math.sqrt(specificRisk);
    const diversificationEffect = sumOfIndividualRisks - totalRisk;

    return {
      totalRisk,
      factorRisk,
      specificRisk: Math.sqrt(specificRisk),
      diversificationEffect,
      marginalContributions,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // Matrix Operations
  // ============================================================================

  private mean(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private calculateCovarianceMatrix(data: number[][]): number[][] {
    const n = data.length;
    const T = data[0].length;
    const means = data.map(r => this.mean(r));
    
    const cov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let sum = 0;
        for (let t = 0; t < T; t++) {
          sum += (data[i][t] - means[i]) * (data[j][t] - means[j]);
        }
        const value = sum / (T - 1);
        cov[i][j] = value;
        cov[j][i] = value;
      }
    }

    return cov;
  }

  private calculateCorrelationMatrix(data: number[][]): number[][] {
    const covMatrix = this.calculateCovarianceMatrix(data);
    const n = covMatrix.length;
    const stdDevs = covMatrix.map((row, i) => Math.sqrt(row[i]));
    
    const corrMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        corrMatrix[i][j] = covMatrix[i][j] / (stdDevs[i] * stdDevs[j]);
      }
    }

    return corrMatrix;
  }

  private eigenDecomposition(matrix: number[][]): {
    eigenvalues: number[];
    eigenvectors: number[][];
  } {
    // Simplified power iteration for dominant eigenvector
    // In production, use a proper linear algebra library
    const n = matrix.length;
    const eigenvalues: number[] = [];
    const eigenvectors: number[][] = [];

    // For simplicity, return diagonal elements as "eigenvalues"
    for (let i = 0; i < n; i++) {
      eigenvalues.push(matrix[i][i]);
      const eigenvector = Array(n).fill(0);
      eigenvector[i] = 1;
      eigenvectors.push(eigenvector);
    }

    return { eigenvalues, eigenvectors };
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

  private matrixMultiply(a: number[][], b: number[][] | number[]): number[][] {
    const isVector = !Array.isArray(b[0]);
    
    if (isVector) {
      // Matrix-vector multiplication
      const vector = b as number[];
      const result: number[][] = Array(a.length).fill(null).map(() => [0]);
      
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < vector.length; j++) {
          result[i][0] += a[i][j] * vector[j];
        }
      }
      
      return result;
    } else {
      // Matrix-matrix multiplication
      const matrix = b as number[][];
      const rowsA = a.length;
      const colsA = a[0].length;
      const colsB = matrix[0].length;
      const result: number[][] = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));
      
      for (let i = 0; i < rowsA; i++) {
        for (let j = 0; j < colsB; j++) {
          for (let k = 0; k < colsA; k++) {
            result[i][j] += a[i][k] * matrix[k][j];
          }
        }
      }
      
      return result;
    }
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    const result: number[] = Array(matrix.length).fill(0);
    
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < vector.length; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }
    
    return result;
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
        // Singular matrix, return identity
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
}
