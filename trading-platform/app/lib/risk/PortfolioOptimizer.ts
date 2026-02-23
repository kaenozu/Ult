/**
 * PortfolioOptimizer.ts
 * 
 * ポートフォリオ最適化（現代ポートフォリオ理論）の計算専門クラス
 */

import { PortfolioOptimizationParams, OptimizationResult } from './types';

export class PortfolioOptimizer {
  /**
   * ポートフォリオを最適化
   */
  optimizePortfolio(params: PortfolioOptimizationParams): OptimizationResult {
    const { symbols, expectedReturns, covariances } = params;
    const n = symbols.length;

    // Initialize equal weights
    const weights = new Map<string, number>();
    symbols.forEach((s) => weights.set(s, 1 / n));

    // Calculate expected portfolio return
    let expectedReturn = 0;
    symbols.forEach((s) => {
      expectedReturn += (expectedReturns.get(s) || 0) * (weights.get(s) || 0);
    });

    // Calculate portfolio risk
    let portfolioVariance = 0;
    symbols.forEach((s1) => {
      symbols.forEach((s2) => {
        const w1 = weights.get(s1) || 0;
        const w2 = weights.get(s2) || 0;
        const cov = covariances.get(s1)?.get(s2) || 0;
        portfolioVariance += w1 * w2 * cov;
      });
    });
    const expectedRisk = Math.sqrt(portfolioVariance);

    // Calculate Sharpe ratio
    const riskFreeRate = 0.02;
    const sharpeRatio = expectedRisk === 0 ? 0 : (expectedReturn - riskFreeRate) / expectedRisk;

    // Generate efficient frontier
    const efficientFrontier = this.calculateEfficientFrontier(params);

    return {
      weights,
      expectedReturn,
      expectedRisk,
      sharpeRatio,
      efficientFrontier,
    };
  }

  /**
   * 効率的フロンティアを計算
   */
  private calculateEfficientFrontier(params: PortfolioOptimizationParams): Array<{ return: number; risk: number }> {
    const frontier: Array<{ return: number; risk: number }> = [];
    const { symbols, expectedReturns, covariances } = params;

    // Generate portfolio combinations
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const targetReturn = (i / steps) * 0.3; // 0% to 30%
      
      let minRisk = Infinity;
      
      for (let j = 0; j < 100; j++) {
        const weights = this.generateRandomWeights(symbols.length);
        const portfolioReturn = symbols.reduce((sum, s, idx) => 
          sum + (expectedReturns.get(s) || 0) * weights[idx], 0);
        
        if (Math.abs(portfolioReturn - targetReturn) < 0.01) {
          const risk = this.calculatePortfolioRisk(weights, symbols, covariances);
          if (risk < minRisk) minRisk = risk;
        }
      }

      if (minRisk !== Infinity) {
        frontier.push({ return: targetReturn, risk: minRisk });
      }
    }

    return frontier;
  }

  /**
   * ランダムな重みを生成
   */
  private generateRandomWeights(n: number): number[] {
    const weights = Array(n).fill(0).map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => w / sum);
  }

  /**
   * ポートフォリオリスクを計算
   */
  private calculatePortfolioRisk(
    weights: number[],
    symbols: string[],
    covariances: Map<string, Map<string, number>>
  ): number {
    let variance = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        const cov = covariances.get(symbols[i])?.get(symbols[j]) || 0;
        variance += weights[i] * weights[j] * cov;
      }
    }
    return Math.sqrt(variance);
  }
}
