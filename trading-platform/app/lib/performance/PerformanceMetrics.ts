/**
 * PerformanceMetrics.ts
 * 
 * Advanced performance metrics calculator for trading systems.
 * Calculates risk-adjusted returns, drawdown metrics, trade quality metrics, and efficiency metrics.
 */

import {
  Trade,
  TradePair,
  Portfolio,
  PerformanceMetrics,
} from '@/app/types/performance';
import { calculateMaxDrawdownFlexible } from '@/app/lib/utils/calculations';

export class PerformanceMetricsCalculator {
  private riskFreeRate = 0.02; // 2% annual risk-free rate

  /**
   * Calculate all performance metrics for a portfolio
   */
  calculateMetrics(trades: Trade[], portfolio: Portfolio): PerformanceMetrics {
    const tradePairs = this.pairTrades(trades);
    const returns = this.calculateReturns(tradePairs, portfolio);

    return {
      // Basic Metrics
      totalReturn: this.calculateTotalReturn(portfolio),
      annualizedReturn: this.calculateAnnualizedReturn(portfolio, returns),
      totalTrades: tradePairs.length,
      winningTrades: tradePairs.filter(t => t.profit > 0).length,
      losingTrades: tradePairs.filter(t => t.profit < 0).length,
      winRate: this.calculateWinRate(tradePairs),

      // Risk-Adjusted Metrics
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(portfolio, returns),
      omegaRatio: this.calculateOmegaRatio(returns, 0),
      informationRatio: this.calculateInformationRatio(returns, this.riskFreeRate),
      treynorRatio: this.calculateTreynorRatio(returns, this.calculateBeta(returns)),

      // Risk Metrics
      maxDrawdown: this.calculateMaxDrawdown(portfolio),
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(portfolio),
      averageDrawdown: this.calculateAverageDrawdown(portfolio),
      volatility: this.calculateVolatility(returns),
      downsideDeviation: this.calculateDownsideDeviation(returns),
      valueAtRisk: this.calculateVaR(returns, 0.95),
      conditionalValueAtRisk: this.calculateCVaR(returns, 0.95),

      // Trade Quality Metrics
      profitFactor: this.calculateProfitFactor(tradePairs),
      averageWin: this.calculateAverageWin(tradePairs),
      averageLoss: this.calculateAverageLoss(tradePairs),
      averageTrade: this.calculateAverageTrade(tradePairs),
      averageWinLossRatio: this.calculateAverageWinLossRatio(tradePairs),
      largestWin: this.calculateLargestWin(tradePairs),
      largestLoss: this.calculateLargestLoss(tradePairs),
      averageHoldingPeriod: this.calculateAverageHoldingPeriod(tradePairs),
      averageRMultiple: this.calculateAverageRMultiple(tradePairs),

      // Efficiency Metrics
      expectancy: this.calculateExpectancy(tradePairs),
      kellyCriterion: this.calculateKellyCriterion(tradePairs),
      riskOfRuin: this.calculateRiskOfRuin(tradePairs),
      SQN: this.calculateSQN(tradePairs),
    };
  }

  /**
   * Pair buy and sell trades together
   */
  private pairTrades(trades: Trade[]): TradePair[] {
    const pairs: TradePair[] = [];
    let entry: Trade | null = null;

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        entry = trade;
      } else if (trade.type === 'SELL' && entry) {
        const profit = (trade.price - entry.price) * entry.quantity - entry.commission - trade.commission;
        pairs.push({
          profit,
          entryTime: entry.timestamp,
          exitTime: trade.timestamp,
          initialRisk: entry.stopLoss ? Math.abs(entry.price - entry.stopLoss) * entry.quantity : 0,
          entryPrice: entry.price,
          exitPrice: trade.price,
          symbol: entry.symbol,
        });
        entry = null;
      }
    }

    return pairs;
  }

  /**
   * Calculate returns for each trade pair
   */
  private calculateReturns(tradePairs: TradePair[], portfolio: Portfolio): number[] {
    return tradePairs.map(t => t.profit / portfolio.initialValue);
  }

  /**
   * Calculate total return percentage
   */
  private calculateTotalReturn(portfolio: Portfolio): number {
    return (portfolio.currentValue - portfolio.initialValue) / portfolio.initialValue;
  }

  /**
   * Calculate annualized return
   */
  private calculateAnnualizedReturn(portfolio: Portfolio, returns: number[]): number {
    const totalReturn = this.calculateTotalReturn(portfolio);
    const days = (Date.now() - portfolio.createdAt) / (1000 * 60 * 60 * 24);
    const years = days / 365;

    if (years <= 0) return 0;

    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }

  /**
   * Calculate win rate
   */
  private calculateWinRate(tradePairs: TradePair[]): number {
    if (tradePairs.length === 0) return 0;
    const winningTrades = tradePairs.filter(t => t.profit > 0).length;
    return winningTrades / tradePairs.length;
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const excessReturns = returns.map(r => r - this.riskFreeRate / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const stdDev = this.calculateStandardDeviation(excessReturns);

    return stdDev > 0 ? (avgExcessReturn / stdDev) * Math.sqrt(252) : 0;
  }

  /**
   * Calculate Sortino Ratio
   */
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const excessReturns = returns.map(r => r - this.riskFreeRate / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const downsideReturns = excessReturns.filter(r => r < 0);
    const downsideDeviation = this.calculateStandardDeviation(downsideReturns);

    return downsideDeviation > 0 ? (avgExcessReturn / downsideDeviation) * Math.sqrt(252) : 0;
  }

  /**
   * Calculate Calmar Ratio
   */
  private calculateCalmarRatio(portfolio: Portfolio, returns: number[]): number {
    const annualizedReturn = this.calculateAnnualizedReturn(portfolio, returns);
    const maxDrawdown = this.calculateMaxDrawdown(portfolio);

    return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  }

  /**
   * Calculate Information Ratio
   */
  private calculateInformationRatio(returns: number[], benchmarkReturn: number): number {
    if (returns.length === 0) return 0;

    const excessReturns = returns.map(r => r - benchmarkReturn / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const trackingError = this.calculateStandardDeviation(excessReturns);

    return trackingError > 0 ? (avgExcessReturn / trackingError) * Math.sqrt(252) : 0;
  }

  /**
   * Calculate Treynor Ratio
   */
  private calculateTreynorRatio(returns: number[], beta: number): number {
    if (beta === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const excessReturn = avgReturn - this.riskFreeRate / 252;

    return (excessReturn / beta) * 252;
  }

  /**
   * Calculate Omega Ratio
   */
  private calculateOmegaRatio(returns: number[], threshold: number): number {
    const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + (r - threshold), 0);
    const losses = Math.abs(returns.filter(r => r < threshold).reduce((sum, r) => sum + (threshold - r), 0));

    return losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;
  }

  /**
   * Calculate Maximum Drawdown
   */
  private calculateMaxDrawdown(portfolio: Portfolio): number {
    const equityCurve = portfolio.history.map(s => s.value);
    return calculateMaxDrawdownFlexible(equityCurve, false);
  }

  /**
   * Calculate Maximum Drawdown Duration (in days)
   */
  private calculateMaxDrawdownDuration(portfolio: Portfolio): number {
    let maxDuration = 0;
    let peak = portfolio.initialValue;
    let peakTime = portfolio.createdAt;

    for (const snapshot of portfolio.history) {
      if (snapshot.value > peak) {
        peak = snapshot.value;
        peakTime = snapshot.timestamp;
      }

      const duration = (snapshot.timestamp - peakTime) / (1000 * 60 * 60 * 24);
      maxDuration = Math.max(maxDuration, duration);
    }

    return maxDuration;
  }

  /**
   * Calculate Average Drawdown
   */
  private calculateAverageDrawdown(portfolio: Portfolio): number {
    const drawdowns: number[] = [];
    let peak = portfolio.initialValue;

    for (const snapshot of portfolio.history) {
      peak = Math.max(peak, snapshot.value);
      const drawdown = (peak - snapshot.value) / peak;
      if (drawdown > 0) {
        drawdowns.push(drawdown);
      }
    }

    return drawdowns.length > 0
      ? drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length
      : 0;
  }

  /**
   * Calculate Volatility (annualized)
   */
  private calculateVolatility(returns: number[]): number {
    return this.calculateStandardDeviation(returns) * Math.sqrt(252);
  }

  /**
   * Calculate Downside Deviation
   */
  private calculateDownsideDeviation(returns: number[]): number {
    const downsideReturns = returns.filter(r => r < 0);
    return this.calculateStandardDeviation(downsideReturns) * Math.sqrt(252);
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (1 - confidence));

    return index >= 0 && index < sorted.length ? -sorted[index] : 0;
  }

  /**
   * Calculate Conditional Value at Risk (CVaR)
   */
  private calculateCVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (1 - confidence));
    const tail = sorted.slice(0, Math.max(1, index));

    return tail.length > 0
      ? -tail.reduce((sum, r) => sum + r, 0) / tail.length
      : 0;
  }

  /**
   * Calculate Profit Factor
   */
  private calculateProfitFactor(tradePairs: TradePair[]): number {
    const grossProfit = tradePairs.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(tradePairs.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));

    return grossLoss > 0 ? grossProfit / grossLoss : 0;
  }

  /**
   * Calculate Average Win
   */
  private calculateAverageWin(tradePairs: TradePair[]): number {
    const wins = tradePairs.filter(t => t.profit > 0);
    return wins.length > 0
      ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length
      : 0;
  }

  /**
   * Calculate Average Loss
   */
  private calculateAverageLoss(tradePairs: TradePair[]): number {
    const losses = tradePairs.filter(t => t.profit < 0);
    return losses.length > 0
      ? losses.reduce((sum, t) => sum + t.profit, 0) / losses.length
      : 0;
  }

  /**
   * Calculate Average Trade (Expectancy)
   */
  private calculateAverageTrade(tradePairs: TradePair[]): number {
    if (tradePairs.length === 0) return 0;
    const totalProfit = tradePairs.reduce((sum, t) => sum + t.profit, 0);
    return totalProfit / tradePairs.length;
  }

  /**
   * Calculate Average Win/Loss Ratio
   */
  private calculateAverageWinLossRatio(tradePairs: TradePair[]): number {
    const avgWin = this.calculateAverageWin(tradePairs);
    const avgLoss = Math.abs(this.calculateAverageLoss(tradePairs));

    return avgLoss > 0 ? avgWin / avgLoss : 0;
  }

  /**
   * Calculate Largest Win
   */
  private calculateLargestWin(tradePairs: TradePair[]): number {
    return tradePairs.length > 0 ? Math.max(...tradePairs.map(t => t.profit), 0) : 0;
  }

  /**
   * Calculate Largest Loss
   */
  private calculateLargestLoss(tradePairs: TradePair[]): number {
    return tradePairs.length > 0 ? Math.min(...tradePairs.map(t => t.profit), 0) : 0;
  }

  /**
   * Calculate Average Holding Period (in days)
   */
  private calculateAverageHoldingPeriod(tradePairs: TradePair[]): number {
    if (tradePairs.length === 0) return 0;

    const totalHoldingTime = tradePairs.reduce(
      (sum, t) => sum + (t.exitTime - t.entryTime),
      0
    );

    return totalHoldingTime / tradePairs.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  /**
   * Calculate Average R-Multiple
   */
  private calculateAverageRMultiple(tradePairs: TradePair[]): number {
    const rMultiples = tradePairs
      .filter(t => t.initialRisk > 0)
      .map(t => t.profit / t.initialRisk);

    return rMultiples.length > 0
      ? rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length
      : 0;
  }

  /**
   * Calculate Expectancy
   */
  private calculateExpectancy(tradePairs: TradePair[]): number {
    if (tradePairs.length === 0) return 0;

    const totalProfit = tradePairs.reduce((sum, t) => sum + t.profit, 0);
    return totalProfit / tradePairs.length;
  }

  /**
   * Calculate Kelly Criterion
   */
  private calculateKellyCriterion(tradePairs: TradePair[]): number {
    const winRate = this.calculateWinRate(tradePairs);
    const avgWin = this.calculateAverageWin(tradePairs);
    const avgLoss = Math.abs(this.calculateAverageLoss(tradePairs));

    if (avgLoss === 0) return 0;

    const winLossRatio = avgWin / avgLoss;
    return winRate - ((1 - winRate) / winLossRatio);
  }

  /**
   * Calculate Risk of Ruin
   */
  private calculateRiskOfRuin(tradePairs: TradePair[]): number {
    const winRate = this.calculateWinRate(tradePairs);
    const avgWin = this.calculateAverageWin(tradePairs);
    const avgLoss = Math.abs(this.calculateAverageLoss(tradePairs));

    if (avgLoss === 0) return 0;

    const q = 1 - winRate;
    const p = winRate;
    const payoffRatio = avgWin / avgLoss;

    if (p * payoffRatio > q) {
      return 0; // Positive expectancy = zero risk of ruin
    }

    return Math.pow((q / p) / payoffRatio, 10); // 10 units of capital
  }

  /**
   * Calculate System Quality Number (SQN)
   */
  private calculateSQN(tradePairs: TradePair[]): number {
    if (tradePairs.length === 0) return 0;

    const expectancy = this.calculateExpectancy(tradePairs);
    const stdDev = this.calculateStandardDeviation(tradePairs.map(t => t.profit));

    return stdDev > 0 ? (expectancy / stdDev) * Math.sqrt(tradePairs.length) : 0;
  }

  /**
   * Calculate Beta (simplified version)
   */
  private calculateBeta(returns: number[]): number {
    // Simplified beta calculation (assumes market beta = 1)
    // In production, this should use market index returns for proper calculation
    return 1;
  }

  /**
   * Calculate Standard Deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Set risk-free rate for calculations
   */
  setRiskFreeRate(rate: number): void {
    this.riskFreeRate = rate;
  }

  /**
   * Get current risk-free rate
   */
  getRiskFreeRate(): number {
    return this.riskFreeRate;
  }
}

// Export singleton instance
export const performanceMetricsCalculator = new PerformanceMetricsCalculator();
