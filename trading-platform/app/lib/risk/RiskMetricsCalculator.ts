/**
 * RiskMetricsCalculator.ts
 * 
 * リスク指標（VaR, CVaR, Volatility等）の計算専門クラス
 */

import { RiskMetrics, Portfolio } from './types';

export class RiskMetricsCalculator {
  /**
   * リスクメトリクスを計算
   */
  calculate(
    portfolio: Portfolio,
    priceHistory: Map<string, number[]>,
    returnsHistory: Map<string, number[]>
  ): RiskMetrics {
    const portfolioReturns = this.calculatePortfolioReturns(priceHistory);
    
    // VaR and CVaR
    const var95 = this.calculateVaR(portfolioReturns, 0.95, portfolio.totalValue);
    const cvar95 = this.calculateCVaR(portfolioReturns, 0.95, portfolio.totalValue);

    // Volatility
    const volatility = this.calculateVolatility(portfolioReturns);

    // Drawdown
    const { maxDrawdown, currentDrawdown } = this.calculateDrawdown(priceHistory);

    // Correlation matrix
    const correlationMatrix = this.calculateCorrelationMatrix(returnsHistory);

    // Concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(portfolio);

    // Leverage
    const positionsValue = portfolio.positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);
    const leverage = positionsValue / (portfolio.totalValue || 1);

    // Sharpe and Sortino ratios
    const sharpeRatio = this.calculateSharpeRatio(portfolioReturns);
    const sortinoRatio = this.calculateSortinoRatio(portfolioReturns);

    return {
      var: var95,
      cvar: cvar95,
      beta: 1, // Beta calculation simplified
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      currentDrawdown,
      volatility,
      correlationMatrix,
      concentrationRisk,
      leverage,
    };
  }

  /**
   * VaRを計算
   */
  private calculateVaR(returns: number[], confidence: number, totalValue: number): number {
    if (returns.length < 30) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return -sorted[index] * totalValue;
  }

  /**
   * CVaR (Expected Shortfall) を計算
   */
  private calculateCVaR(returns: number[], confidence: number, totalValue: number): number {
    if (returns.length < 30) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, varIndex);
    
    if (tailReturns.length === 0) return 0;
    
    const avgTailReturn = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
    return -avgTailReturn * totalValue;
  }

  /**
   * ボラティリティを計算
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  /**
   * ドローダウンを計算
   */
  private calculateDrawdown(priceHistory: Map<string, number[]>): { maxDrawdown: number; currentDrawdown: number } {
    const values = priceHistory.get('portfolio') || [];
    if (values.length < 2) return { maxDrawdown: 0, currentDrawdown: 0 };

    let peak = values[0];
    let maxDrawdown = 0;

    for (const value of values) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const currentDrawdown = (peak - values[values.length - 1]) / peak;

    return { maxDrawdown, currentDrawdown };
  }

  /**
   * ポートフォリオリターンを計算
   */
  private calculatePortfolioReturns(priceHistory: Map<string, number[]>): number[] {
    const values = priceHistory.get('portfolio') || [];
    const returns: number[] = [];

    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }

    return returns;
  }

  /**
   * 相関行列を計算
   */
  private calculateCorrelationMatrix(returnsHistory: Map<string, number[]>): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    const symbols = Array.from(returnsHistory.keys());

    for (const symbol1 of symbols) {
      const row = new Map<string, number>();
      const returns1 = returnsHistory.get(symbol1) || [];

      for (const symbol2 of symbols) {
        const returns2 = returnsHistory.get(symbol2) || [];
        const correlation = this.calculateCorrelation(returns1, returns2);
        row.set(symbol2, correlation);
      }

      matrix.set(symbol1, row);
    }

    return matrix;
  }

  /**
   * 相関係数を計算
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 集中度リスクを計算
   */
  private calculateConcentrationRisk(portfolio: Portfolio): number {
    const totalValue = portfolio.totalValue;
    if (totalValue === 0) return 0;

    let hhi = 0;
    for (const position of portfolio.positions) {
      const weight = (position.currentPrice * position.quantity) / totalValue;
      hhi += weight * weight;
    }
    if (!isFinite(hhi)) return 0;

    const n = portfolio.positions.length || 1;
    return (hhi - 1 / n) / (1 - 1 / n);
  }

  /**
   * シャープレシオを計算
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const riskFreeRate = 0.02 / 252;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = this.calculateVolatility(returns) / Math.sqrt(252);
    
    return volatility === 0 ? 0 : (avgReturn - riskFreeRate) / volatility;
  }

  /**
   * ソルティノレシオを計算
   */
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const riskFreeRate = 0.02 / 252;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    const downsideReturns = returns.filter((r) => r < 0);
    if (downsideReturns.length === 0) return 0;

    const downsideDeviation = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
    );
    
    return downsideDeviation === 0 ? 0 : (avgReturn - riskFreeRate) / downsideDeviation;
  }
}
