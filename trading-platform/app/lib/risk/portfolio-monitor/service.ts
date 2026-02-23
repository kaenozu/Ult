import { Portfolio } from '@/app/types';
import {
  VaRResult,
  SectorExposure,
  CorrelationPair,
  StressTestResult,
  RiskContribution,
  PortfolioRiskReport,
} from './types';
import {
  MAX_HISTORY_DAYS,
  MIN_HISTORY_FOR_HISTORICAL_VAR,
  MIN_HISTORY_FOR_VAR,
  MIN_POSITIONS_FOR_PARAMETRIC,
} from './thresholds';
import {
  calculateHistoricalVaR,
  calculateParametricVaR,
  calculateMonteCarloVaR,
} from './calculations';
import {
  calculateSectorExposure,
  calculateConcentrationRisk,
  calculateCorrelationPairs,
  calculateAverageCorrelation,
  calculateMaxCorrelation,
  calculateRiskContributions,
  runStressTests,
  calculatePortfolioBeta,
  calculateSystemicRisk,
  calculateOverallRiskScore,
  determineRiskLevel,
  generateWarningsAndRecommendations,
  createSectorMap,
} from './risk-metrics';

export class PortfolioRiskMonitor {
  private returnsHistory: Map<string, number[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private portfolioHistory: number[] = [];
  private sectorMap: Map<string, string>;

  constructor() {
    this.sectorMap = createSectorMap();
  }

  generateRiskReport(portfolio: Portfolio, confidence: number = 95): PortfolioRiskReport {
    const dailyVar = this.calculateVaR(portfolio, confidence, 1);
    const weeklyVar = this.calculateVaR(portfolio, confidence, 5);

    const sectorExposures = calculateSectorExposure(portfolio, this.sectorMap);
    const concentrationRisk = calculateConcentrationRisk(sectorExposures);

    const correlationPairs = calculateCorrelationPairs(portfolio, this.returnsHistory);
    const avgCorrelation = calculateAverageCorrelation(correlationPairs);
    const maxCorrelation = calculateMaxCorrelation(correlationPairs);

    const riskContributions = calculateRiskContributions(portfolio, dailyVar, this.returnsHistory);

    const stressTestResults = runStressTests(portfolio, this.returnsHistory);

    const portfolioBeta = calculatePortfolioBeta(portfolio, this.returnsHistory);
    const systemicRisk = calculateSystemicRisk(correlationPairs);

    const overallRiskScore = calculateOverallRiskScore({
      dailyVar,
      concentrationRisk,
      avgCorrelation,
      systemicRisk,
      stressTestResults,
    });

    const riskLevel = determineRiskLevel(overallRiskScore);

    const { warnings, recommendations } = generateWarningsAndRecommendations({
      dailyVar,
      sectorExposures,
      correlationPairs,
      stressTestResults,
      overallRiskScore,
    });

    return {
      dailyVar,
      weeklyVar,
      sectorExposures,
      concentrationRisk,
      correlationPairs,
      avgCorrelation,
      maxCorrelation,
      riskContributions,
      stressTestResults,
      portfolioBeta,
      systemicRisk,
      overallRiskScore,
      riskLevel,
      warnings,
      recommendations,
    };
  }

  private calculateVaR(
    portfolio: Portfolio,
    _confidence: number,
    timeHorizon: number
  ): VaRResult {
    const method = this.selectVaRMethod(portfolio);
    let var95: number;
    let var99: number;
    let cvar95: number;
    let cvar99: number;

    if (method === 'historical') {
      ({ var95, var99, cvar95, cvar99 } = calculateHistoricalVaR(this.portfolioHistory, portfolio));
    } else if (method === 'parametric') {
      ({ var95, var99, cvar95, cvar99 } = calculateParametricVaR(portfolio));
    } else {
      ({ var95, var99, cvar95, cvar99 } = calculateMonteCarloVaR(portfolio, this.returnsHistory));
    }

    const timeAdjustment = Math.sqrt(timeHorizon);
    var95 *= timeAdjustment;
    var99 *= timeAdjustment;
    cvar95 *= timeAdjustment;
    cvar99 *= timeAdjustment;

    return { var95, var99, cvar95, cvar99, method, timeHorizon };
  }

  private selectVaRMethod(portfolio: Portfolio): 'historical' | 'parametric' | 'montecarlo' {
    const historyLength = this.portfolioHistory.length;

    if (historyLength >= MIN_HISTORY_FOR_HISTORICAL_VAR) {
      return 'historical';
    } else if (portfolio.positions.length >= MIN_POSITIONS_FOR_PARAMETRIC && historyLength >= MIN_HISTORY_FOR_VAR) {
      return 'parametric';
    } else {
      return 'parametric';
    }
  }

  updateReturns(symbol: string, returns: number[]): void {
    this.returnsHistory.set(symbol, returns);
  }

  updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);

    if (prices.length > MAX_HISTORY_DAYS) {
      prices.shift();
    }

    if (prices.length > 1) {
      const returns = this.returnsHistory.get(symbol) || [];
      const returnValue = (price - prices[prices.length - 2]) / prices[prices.length - 2];
      returns.push(returnValue);

      if (returns.length > MAX_HISTORY_DAYS - 1) {
        returns.shift();
      }

      this.returnsHistory.set(symbol, returns);
    }
  }

  updatePortfolioHistory(totalValue: number): void {
    this.portfolioHistory.push(totalValue);

    if (this.portfolioHistory.length > MAX_HISTORY_DAYS) {
      this.portfolioHistory.shift();
    }
  }

  clearHistory(): void {
    this.returnsHistory.clear();
    this.priceHistory.clear();
    this.portfolioHistory = [];
  }
}

export function createPortfolioRiskMonitor(): PortfolioRiskMonitor {
  return new PortfolioRiskMonitor();
}

export default PortfolioRiskMonitor;
