/**
 * Risk Parity
 * 
 * Implements risk parity portfolio optimization:
 * - Equal risk contribution from all assets
 * - Hierarchical Risk Parity (HRP)
 * - Dynamic risk parity with rebalancing
 */

import { CovarianceCalculator } from './CovarianceCalculator';
import type {
  Asset,
  RiskParityConfig,
  RiskParityPortfolio,
  RiskContribution,
  PortfolioStats,
  RiskBudget,
  HRPPortfolio,
  Cluster,
  DendrogramNode,
  DynamicRiskParityResult,
  PerformanceMetrics,
} from './types';

export class RiskParity {
  private covarianceCalculator: CovarianceCalculator;
  private config: RiskParityConfig;

  constructor(config: RiskParityConfig) {
    this.config = config;
    this.covarianceCalculator = new CovarianceCalculator(config.covariance);
  }

  /**
   * Calculate risk parity portfolio
   */
  calculateRiskParityPortfolio(assets: Asset[]): RiskParityPortfolio {
    const covarianceMatrix = this.covarianceCalculator.calculateCovarianceMatrix(assets);

    // Calculate risk parity weights
    const weights = this.calculateRiskParityWeights(covarianceMatrix);

    // Calculate risk contributions
    const riskContributions = this.calculateRiskContributions(weights, covarianceMatrix);

    // Calculate portfolio statistics
    const portfolioStats = this.calculatePortfolioStats(weights, covarianceMatrix, assets);

    // Calculate risk budget
    const riskBudget = this.calculateRiskBudget(riskContributions);

    return {
      weights,
      riskContributions,
      portfolioStats,
      riskBudget,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate risk parity weights
   * Weights such that each asset contributes equally to portfolio risk
   */
  private calculateRiskParityWeights(covMatrix: number[][]): number[] {
    const n = covMatrix.length;
    
    // Start with equal weights
    let weights = Array(n).fill(1 / n);
    
    const maxIterations = this.config.optimizer.maxIterations || 1000;
    const tolerance = this.config.optimizer.convergenceTolerance || 1e-8;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const portfolioVol = Math.sqrt(this.calculatePortfolioVariance(weights, covMatrix));
      const marginalRisk = this.calculateMarginalRisk(weights, covMatrix);
      
      // Calculate risk contributions
      const riskContributions = weights.map((w, i) => w * marginalRisk[i]);
      const totalRiskContribution = riskContributions.reduce((sum, rc) => sum + rc, 0);
      
      // Target risk contribution (equal for all assets)
      const targetRC = totalRiskContribution / n;
      
      // Update weights to equalize risk contributions
      const newWeights = weights.map((w, i) => {
        const currentRC = riskContributions[i];
        const adjustment = targetRC / currentRC;
        return w * adjustment;
      });
      
      // Normalize weights
      const sum = newWeights.reduce((s, w) => s + w, 0);
      for (let i = 0; i < n; i++) {
        newWeights[i] /= sum;
      }
      
      // Check convergence
      const change = this.euclideanDistance(weights, newWeights);
      if (change < tolerance) {
        weights = newWeights;
        break;
      }
      
      weights = newWeights;
    }
    
    return weights;
  }

  /**
   * Calculate risk contributions for each asset
   */
  private calculateRiskContributions(
    weights: number[],
    covMatrix: number[][]
  ): RiskContribution[] {
    const portfolioVariance = this.calculatePortfolioVariance(weights, covMatrix);
    const portfolioVol = Math.sqrt(portfolioVariance);
    const marginalRisk = this.calculateMarginalRisk(weights, covMatrix);

    return weights.map((w, i) => ({
      asset: i,
      weight: w,
      marginalRisk: marginalRisk[i],
      riskContribution: w * marginalRisk[i],
      riskPercentage: (w * marginalRisk[i]) / portfolioVol,
    }));
  }

  /**
   * Calculate marginal risk contribution for each asset
   * Marginal risk = (Σ * w) / σ_portfolio
   */
  private calculateMarginalRisk(weights: number[], covMatrix: number[][]): number[] {
    const n = weights.length;
    const portfolioVol = Math.sqrt(this.calculatePortfolioVariance(weights, covMatrix));
    
    const marginalRisk: number[] = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        marginalRisk[i] += covMatrix[i][j] * weights[j];
      }
      marginalRisk[i] /= portfolioVol;
    }
    
    return marginalRisk;
  }

  /**
   * Calculate portfolio statistics
   */
  private calculatePortfolioStats(
    weights: number[],
    covMatrix: number[][],
    assets: Asset[]
  ): PortfolioStats {
    const variance = this.calculatePortfolioVariance(weights, covMatrix);
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate expected return (simple historical mean)
    const returns = assets.map(a => this.calculateMeanReturn(a.returns));
    const expectedReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
    
    // Calculate diversification ratio
    const assetVols = assets.map(a => Math.sqrt(this.calculateVariance(a.returns)));
    const weightedAvgVol = weights.reduce((sum, w, i) => sum + w * assetVols[i], 0);
    const diversificationRatio = weightedAvgVol / standardDeviation;

    return {
      expectedReturn: expectedReturn * 252, // Annualize
      variance: variance * 252, // Annualize
      standardDeviation: standardDeviation * Math.sqrt(252), // Annualize
      diversificationRatio,
    };
  }

  /**
   * Calculate risk budget
   */
  private calculateRiskBudget(riskContributions: RiskContribution[]): RiskBudget {
    const n = riskContributions.length;
    const targetRisk = 1 / n; // Equal risk for all assets

    const deviations = riskContributions.map(rc => ({
      asset: rc.asset,
      target: targetRisk,
      actual: rc.riskPercentage,
      deviation: rc.riskPercentage - targetRisk,
    }));

    const isBalanced = deviations.every(d => Math.abs(d.deviation) < 0.05);

    return {
      targetRisk,
      deviations,
      isBalanced,
    };
  }

  /**
   * Hierarchical Risk Parity (HRP)
   */
  calculateHierarchicalRiskParity(
    assets: Asset[],
    linkageMethod: string = 'ward'
  ): HRPPortfolio {
    const n = assets.length;
    const covMatrix = this.covarianceCalculator.calculateCovarianceMatrix(assets);
    const corrMatrix = this.covarianceCalculator.calculateCorrelationMatrix(covMatrix);
    
    // Perform hierarchical clustering
    const clusters = this.performHierarchicalClustering(corrMatrix);
    
    // Generate dendrogram
    const dendrogram = this.generateDendrogram(clusters);
    
    // Calculate HRP weights
    const weights = this.calculateHRPWeights(dendrogram, covMatrix);

    return {
      weights,
      clusters,
      dendrogram,
      timestamp: new Date(),
    };
  }

  /**
   * Perform hierarchical clustering on correlation matrix
   */
  private performHierarchicalClustering(corrMatrix: number[][]): Cluster[] {
    const n = corrMatrix.length;
    const clusters: Cluster[] = [];
    
    // Initialize: each asset is its own cluster
    for (let i = 0; i < n; i++) {
      clusters.push({
        id: i,
        assets: [i],
        variance: 1 - corrMatrix[i][i], // Use correlation distance
      });
    }
    
    // Merge clusters iteratively
    while (clusters.length > 1) {
      // Find two closest clusters
      let minDistance = Infinity;
      let mergeI = 0;
      let mergeJ = 1;
      
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.clusterDistance(clusters[i], clusters[j], corrMatrix);
          if (distance < minDistance) {
            minDistance = distance;
            mergeI = i;
            mergeJ = j;
          }
        }
      }
      
      // Merge clusters
      const merged: Cluster = {
        id: clusters.length + n,
        assets: [...clusters[mergeI].assets, ...clusters[mergeJ].assets],
        variance: minDistance,
      };
      
      // Remove old clusters and add merged one
      clusters.splice(Math.max(mergeI, mergeJ), 1);
      clusters.splice(Math.min(mergeI, mergeJ), 1);
      clusters.push(merged);
    }
    
    return clusters;
  }

  /**
   * Calculate distance between two clusters
   */
  private clusterDistance(
    cluster1: Cluster,
    cluster2: Cluster,
    corrMatrix: number[][]
  ): number {
    let sumDistance = 0;
    let count = 0;
    
    for (const i of cluster1.assets) {
      for (const j of cluster2.assets) {
        sumDistance += 1 - corrMatrix[i][j]; // Correlation distance
        count++;
      }
    }
    
    return count > 0 ? sumDistance / count : 0;
  }

  /**
   * Generate dendrogram from clusters
   */
  private generateDendrogram(clusters: Cluster[]): DendrogramNode {
    // For simplicity, return a basic structure
    // In a full implementation, this would track the merge history
    const finalCluster = clusters[clusters.length - 1];
    
    return {
      id: finalCluster.id,
      distance: finalCluster.variance,
      assets: finalCluster.assets,
    };
  }

  /**
   * Calculate HRP weights recursively
   */
  private calculateHRPWeights(dendrogram: DendrogramNode, covMatrix: number[][]): number[] {
    const n = covMatrix.length;
    const weights = Array(n).fill(0);
    
    // Simplified HRP: use inverse volatility weighting within clusters
    const clusterWeights = this.calculateInverseVolatilityWeights(covMatrix);
    
    dendrogram.assets.forEach((assetIdx, i) => {
      weights[assetIdx] = clusterWeights[i];
    });
    
    return weights;
  }

  /**
   * Calculate inverse volatility weights
   */
  private calculateInverseVolatilityWeights(covMatrix: number[][]): number[] {
    const n = covMatrix.length;
    const volatilities = covMatrix.map((row, i) => Math.sqrt(row[i]));
    const inverseVols = volatilities.map(v => 1 / v);
    const sum = inverseVols.reduce((s, iv) => s + iv, 0);
    
    return inverseVols.map(iv => iv / sum);
  }

  /**
   * Dynamic risk parity with rebalancing
   */
  calculateDynamicRiskParity(
    assets: Asset[],
    lookbackPeriod: number = 252,
    rebalanceFrequency: number = 20
  ): DynamicRiskParityResult {
    const portfolios: RiskParityPortfolio[] = [];
    const rebalancePoints: Date[] = [];
    
    // Get historical data length
    const dataLength = Math.min(...assets.map(a => a.returns.length));
    
    // Calculate portfolios at rebalance points
    for (let t = lookbackPeriod; t < dataLength; t += rebalanceFrequency) {
      // Get data window
      const windowAssets = assets.map(asset => ({
        ...asset,
        returns: asset.returns.slice(t - lookbackPeriod, t),
      }));
      
      // Calculate risk parity portfolio for this window
      const portfolio = this.calculateRiskParityPortfolio(windowAssets);
      portfolios.push(portfolio);
      rebalancePoints.push(new Date(Date.now() - (dataLength - t) * 24 * 60 * 60 * 1000));
    }
    
    // Calculate performance
    const performance = this.calculatePerformance(portfolios, assets);

    return {
      portfolios,
      rebalancePoints,
      performance,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformance(
    portfolios: RiskParityPortfolio[],
    assets: Asset[]
  ): PerformanceMetrics {
    if (portfolios.length === 0) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        calmarRatio: 0,
      };
    }

    // Calculate cumulative returns
    const returns = portfolios.map(p => p.portfolioStats.expectedReturn / 252);
    const cumulativeReturn = returns.reduce((cum, r) => cum * (1 + r), 1) - 1;
    const days = returns.length;
    const years = days / 252;
    const annualizedReturn = Math.pow(1 + cumulativeReturn, 1 / years) - 1;

    // Calculate volatility
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance * 252);

    // Calculate Sharpe ratio
    const sharpeRatio = volatility > 0 ? annualizedReturn / volatility : 0;

    // Calculate max drawdown
    let peak = 1;
    let maxDrawdown = 0;
    let cum = 1;
    
    for (const r of returns) {
      cum *= (1 + r);
      if (cum > peak) peak = cum;
      const drawdown = (peak - cum) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Calculate Calmar ratio
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

    return {
      totalReturn: cumulativeReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      calmarRatio,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

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

  private calculateMeanReturn(returns: number[]): number {
    return returns.reduce((sum, r) => sum + r, 0) / returns.length;
  }

  private calculateVariance(returns: number[]): number {
    const mean = this.calculateMeanReturn(returns);
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return variance;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
}
