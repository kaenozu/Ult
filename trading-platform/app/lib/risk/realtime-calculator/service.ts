import { Position, Portfolio, RealTimeRiskMetrics, PositionRisk, RiskCalculationConfig, DEFAULT_RISK_CONFIG } from './types';
import { calculatePositionRisk, calculateCovarianceMatrix } from './position-risk';
import {
  calculateHistoricalVaR,
  calculateParametricVaR,
  calculatePortfolioVolatility,
  calculateWeightedVolatility,
  calculateConcentrationRisk,
  calculateCorrelationRisk,
  calculateMaxDrawdown,
  calculateTotalRisk,
  determineRiskLevel,
  generateAlerts,
} from './portfolio-risk';

export class RealTimeRiskCalculator {
  private config: RiskCalculationConfig;
  private returnsHistory: Map<string, number[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private portfolioHistory: number[] = [];
  private peakValue: number = 0;
  private dailyStartValue: number = 0;
  private weeklyStartValue: number = 0;

  constructor(config: Partial<RiskCalculationConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  calculatePortfolioRisk(portfolio: Portfolio): RealTimeRiskMetrics {
    const totalValue = portfolio.totalValue + portfolio.cash;
    const positionValue = portfolio.totalValue;
    
    const usedCapitalPercent = totalValue > 0 ? (positionValue / totalValue) * 100 : 0;
    const unrealizedPnL = portfolio.totalProfit;
    const unrealizedPnLPercent = positionValue > 0 ? (unrealizedPnL / positionValue) * 100 : 0;
    
    if (totalValue > this.peakValue) {
      this.peakValue = totalValue;
    }
    const currentDrawdown = this.peakValue > 0 
      ? ((this.peakValue - totalValue) / this.peakValue) * 100 
      : 0;
    const maxDrawdown = calculateMaxDrawdown(this.portfolioHistory);
    
    const { var95, var99, cvar95 } = this.calculateVaR(portfolio);
    
    const portfolioVolatility = calculatePortfolioVolatility(
      this.portfolioHistory,
      this.calculateStandardDeviation.bind(this)
    );
    const weightedVolatility = calculateWeightedVolatility(
      portfolio,
      this.returnsHistory,
      this.calculateStandardDeviation.bind(this)
    );
    
    const { concentrationRisk, largestPositionPercent } = calculateConcentrationRisk(portfolio);
    
    const { correlationRisk, avgCorrelation } = calculateCorrelationRisk(
      portfolio,
      this.returnsHistory,
      this.calculateCorrelation.bind(this)
    );
    
    const dailyLoss = this.dailyStartValue > 0 ? this.dailyStartValue - totalValue : 0;
    const dailyLossPercent = this.dailyStartValue > 0 
      ? (dailyLoss / this.dailyStartValue) * 100 
      : 0;
    
    const totalRiskPercent = calculateTotalRisk({
      usedCapitalPercent,
      portfolioVolatility,
      concentrationRisk,
      correlationRisk,
      currentDrawdown,
    });
    
    const riskLevel = determineRiskLevel(totalRiskPercent, this.config);
    
    const alerts = generateAlerts({
      totalRiskPercent,
      currentDrawdown,
      maxDrawdown,
      dailyLossPercent,
      concentrationRisk,
      correlationRisk,
      largestPositionPercent,
    }, this.config);
    
    return {
      totalRiskPercent,
      usedCapitalPercent,
      unrealizedPnL,
      unrealizedPnLPercent,
      currentDrawdown,
      maxDrawdown,
      peakValue: this.peakValue,
      var95,
      var99,
      cvar95,
      portfolioVolatility,
      weightedVolatility,
      concentrationRisk,
      largestPositionPercent,
      correlationRisk,
      avgCorrelation,
      dailyLoss,
      dailyLossPercent,
      riskLevel,
      alerts,
    };
  }

  calculatePositionRisk(position: Position, portfolioValue: number): PositionRisk {
    return calculatePositionRisk(
      position,
      portfolioValue,
      this.returnsHistory,
      this.calculateStandardDeviation.bind(this)
    );
  }

  calculateCovarianceMatrix(positions: Position[]): number[][] {
    return calculateCovarianceMatrix(
      positions,
      this.returnsHistory,
      this.calculateStandardDeviation.bind(this),
      this.calculateCorrelation.bind(this)
    );
  }

  private calculateVaR(portfolio: Portfolio): { var95: number; var99: number; cvar95: number } {
    const totalValue = portfolio.totalValue + portfolio.cash;
    
    if (this.config.varMethod === 'historical') {
      return calculateHistoricalVaR(
        this.portfolioHistory,
        totalValue,
        () => this.calculateParametricVaRInternal(portfolio, totalValue)
      );
    } else if (this.config.varMethod === 'parametric') {
      return this.calculateParametricVaRInternal(portfolio, totalValue);
    }
    
    return this.calculateParametricVaRInternal(portfolio, totalValue);
  }

  private calculateParametricVaRInternal(
    portfolio: Portfolio,
    totalValue: number
  ): { var95: number; var99: number; cvar95: number } {
    const volatility = calculatePortfolioVolatility(
      this.portfolioHistory,
      this.calculateStandardDeviation.bind(this)
    );
    return calculateParametricVaR(totalValue, volatility, this.config.varTimeHorizon);
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
    
    return Math.sqrt(variance);
  }

  private calculateCorrelation(values1: number[], values2: number[]): number {
    const n = Math.min(values1.length, values2.length);
    
    if (n < 2) {
      return 0;
    }
    
    const mean1 = values1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const mean2 = values2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    
    return denominator > 0 ? numerator / denominator : 0;
  }

  updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);
    
    if (prices.length > this.config.historicalPeriod) {
      prices.shift();
    }
    
    if (prices.length > 1) {
      const returns = this.returnsHistory.get(symbol) || [];
      const lastPrice = prices[prices.length - 2];
      const returnValue = (price - lastPrice) / lastPrice;
      returns.push(returnValue);
      
      if (returns.length > this.config.historicalPeriod) {
        returns.shift();
      }
      
      this.returnsHistory.set(symbol, returns);
    }
  }

  updatePortfolioHistory(totalValue: number): void {
    this.portfolioHistory.push(totalValue);
    
    if (this.portfolioHistory.length > this.config.historicalPeriod) {
      this.portfolioHistory.shift();
    }
  }

  setDailyStartValue(value: number): void {
    this.dailyStartValue = value;
  }

  setWeeklyStartValue(value: number): void {
    this.weeklyStartValue = value;
  }

  resetPeakValue(): void {
    this.peakValue = 0;
  }

  updateConfig(config: Partial<RiskCalculationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clearHistory(): void {
    this.returnsHistory.clear();
    this.priceHistory.clear();
    this.portfolioHistory = [];
    this.peakValue = 0;
  }
}

export function createRealTimeRiskCalculator(
  config?: Partial<RiskCalculationConfig>
): RealTimeRiskCalculator {
  return new RealTimeRiskCalculator(config);
}

export default RealTimeRiskCalculator;
