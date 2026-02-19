/**
 * Returns Calculator
 * 
 * Calculates expected returns using various methods:
 * - Historical mean returns
 * - Exponentially weighted returns
 * - CAPM-based returns
 */

import type { Asset, ReturnsConfig } from './types';

export class ReturnsCalculator {
  private config: Required<ReturnsConfig>;

  constructor(config: ReturnsConfig = {}) {
    this.config = {
      method: config.method || 'historical',
      lookbackPeriod: config.lookbackPeriod || 252,
      halfLife: config.halfLife || 60,
    };
  }

  /**
   * Calculate expected returns for assets
   */
  calculateExpectedReturns(assets: Asset[]): number[] {
    switch (this.config.method) {
      case 'exponential':
        return assets.map(a => this.exponentialWeightedReturn(a.returns));
      case 'capm':
        return this.capmReturns(assets);
      case 'historical':
      default:
        return assets.map(a => this.historicalMeanReturn(a.returns));
    }
  }

  /**
   * Historical mean return (annualized)
   */
  private historicalMeanReturn(returns: number[]): number {
    const recentReturns = returns.slice(-this.config.lookbackPeriod);
    const mean = this.mean(recentReturns);
    return mean * 252; // Annualize assuming 252 trading days
  }

  /**
   * Exponentially weighted return
   */
  private exponentialWeightedReturn(returns: number[]): number {
    const recentReturns = returns.slice(-this.config.lookbackPeriod);
    const n = recentReturns.length;
    
    if (n === 0) return 0;

    const lambda = Math.exp(-Math.log(2) / this.config.halfLife);
    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < n; i++) {
      const weight = Math.pow(lambda, n - 1 - i);
      weightedSum += weight * recentReturns[i];
      weightSum += weight;
    }

    const ewma = weightedSum / weightSum;
    return ewma * 252; // Annualize
  }

  /**
   * CAPM-based returns (simplified)
   */
  private capmReturns(assets: Asset[]): number[] {
    // Simplified CAPM: requires market returns
    // For now, use historical with adjustment
    return assets.map(a => {
      const volatility = this.calculateVolatility(a.returns);
      
      // Apply risk adjustment (simplified)
      const riskFreeRate = 0.02; // 2% risk-free rate
      const marketRiskPremium = 0.08; // 8% market risk premium
      const beta = volatility / 0.15; // Normalized beta
      
      return riskFreeRate + beta * marketRiskPremium;
    });
  }

  /**
   * Calculate annualized volatility
   */
  private calculateVolatility(returns: number[]): number {
    const recentReturns = returns.slice(-this.config.lookbackPeriod);
    const mean = this.mean(recentReturns);
    
    const variance = recentReturns.reduce((sum, r) => {
      return sum + Math.pow(r - mean, 2);
    }, 0) / (recentReturns.length - 1);

    return Math.sqrt(variance * 252); // Annualize
  }

  /**
   * Helper: Calculate mean
   */
  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate return from prices
   */
  calculateReturnsFromPrices(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  /**
   * Calculate cumulative return
   */
  calculateCumulativeReturn(returns: number[]): number {
    return returns.reduce((cum, r) => cum * (1 + r), 1) - 1;
  }

  /**
   * Calculate annualized return from cumulative return
   */
  annualizeReturn(cumulativeReturn: number, days: number): number {
    const years = days / 252;
    return Math.pow(1 + cumulativeReturn, 1 / years) - 1;
  }
}
