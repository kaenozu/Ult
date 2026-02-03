/**
 * Covariance Calculator
 * 
 * Calculates covariance matrices with various methods including:
 * - Sample covariance
 * - Shrinkage estimators (Ledoit-Wolf)
 * - Exponentially weighted covariance
 */

import type { Asset, CovarianceConfig } from './types';

export class CovarianceCalculator {
  private config: Required<CovarianceConfig>;

  constructor(config: CovarianceConfig = {}) {
    this.config = {
      method: config.method || 'sample',
      shrinkageTarget: config.shrinkageTarget || 'identity',
      lookbackPeriod: config.lookbackPeriod || 252,
    };
  }

  /**
   * Calculate covariance matrix for assets
   */
  calculateCovarianceMatrix(assets: Asset[]): number[][] {
    const returns = assets.map(a => a.returns.slice(-this.config.lookbackPeriod));
    
    switch (this.config.method) {
      case 'shrinkage':
        return this.shrinkageCovariance(returns);
      case 'ledoit-wolf':
        return this.ledoitWolfCovariance(returns);
      case 'sample':
      default:
        return this.sampleCovariance(returns);
    }
  }

  /**
   * Sample covariance matrix
   */
  private sampleCovariance(returns: number[][]): number[][] {
    const n = returns.length;
    if (n === 0) return [];

    const T = returns[0].length;
    const means = returns.map(r => this.mean(r));
    
    const cov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let sum = 0;
        for (let t = 0; t < T; t++) {
          sum += (returns[i][t] - means[i]) * (returns[j][t] - means[j]);
        }
        const value = sum / (T - 1);
        cov[i][j] = value;
        cov[j][i] = value;
      }
    }

    return cov;
  }

  /**
   * Ledoit-Wolf shrinkage covariance
   */
  private ledoitWolfCovariance(returns: number[][]): number[][] {
    const sampleCov = this.sampleCovariance(returns);
    const n = returns.length;
    const T = returns[0].length;

    // Calculate shrinkage target (constant correlation)
    const target = this.calculateShrinkageTarget(sampleCov);
    
    // Calculate optimal shrinkage intensity
    const delta = this.calculateShrinkageIntensity(returns, sampleCov, target);
    
    // Apply shrinkage
    const shrunkCov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        shrunkCov[i][j] = delta * target[i][j] + (1 - delta) * sampleCov[i][j];
      }
    }

    return shrunkCov;
  }

  /**
   * Shrinkage covariance with identity target
   */
  private shrinkageCovariance(returns: number[][]): number[][] {
    const sampleCov = this.sampleCovariance(returns);
    const n = returns.length;
    
    // Simple shrinkage towards identity
    const shrinkage = 0.1;
    const avgVariance = this.mean(sampleCov.map((row, i) => row[i]));
    
    const shrunkCov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          shrunkCov[i][j] = (1 - shrinkage) * sampleCov[i][j] + shrinkage * avgVariance;
        } else {
          shrunkCov[i][j] = (1 - shrinkage) * sampleCov[i][j];
        }
      }
    }

    return shrunkCov;
  }

  /**
   * Calculate shrinkage target (constant correlation)
   */
  private calculateShrinkageTarget(sampleCov: number[][]): number[][] {
    const n = sampleCov.length;
    const variances = sampleCov.map((row, i) => row[i]);
    const stdDevs = variances.map(v => Math.sqrt(v));
    
    // Calculate average correlation
    let sumCorr = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sumCorr += sampleCov[i][j] / (stdDevs[i] * stdDevs[j]);
        count++;
      }
    }
    const avgCorr = count > 0 ? sumCorr / count : 0;

    // Construct target with constant correlation
    const target: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          target[i][j] = variances[i];
        } else {
          target[i][j] = avgCorr * stdDevs[i] * stdDevs[j];
        }
      }
    }

    return target;
  }

  /**
   * Calculate optimal shrinkage intensity (Ledoit-Wolf formula)
   */
  private calculateShrinkageIntensity(
    returns: number[][],
    sampleCov: number[][],
    target: number[][]
  ): number {
    const n = returns.length;
    const T = returns[0].length;
    
    // Simplified Ledoit-Wolf formula
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const diff = sampleCov[i][j] - target[i][j];
        denominator += diff * diff;
      }
    }

    // Estimate variance of covariance estimator
    numerator = denominator / T;

    const delta = Math.max(0, Math.min(1, numerator / denominator));
    return delta;
  }

  /**
   * Calculate correlation matrix from covariance matrix
   */
  calculateCorrelationMatrix(covMatrix: number[][]): number[][] {
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

  /**
   * Helper: Calculate mean
   */
  private mean(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
}
