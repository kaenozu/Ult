import { Portfolio, OHLCV } from '@/app/types';
import { calculateMaxDrawdownFromReturns, calculateVolatilityFlexible } from '@/app/lib/utils/calculations';
import { RiskAlert, SectorMapping, EnhancedRiskMetrics } from './types';
import { calculateHistoricalVaR } from './var-calculator';
import { generateAllRiskAlerts } from './stress-test';
import {
  calculatePearsonCorrelation,
  calculateBeta,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCurrentDrawdownFromReturns
} from './calculations';
import {
  calculateSectorExposures,
  calculateConcentrationMetrics,
  calculateMarketExposures,
  calculateLiquidityScore,
  calculateStyleExposure
} from './portfolio-metrics';

const DEFAULT_SECTOR_MAPPING: SectorMapping = {
  'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology',
  'AMZN': 'Consumer Cyclical', 'TSLA': 'Consumer Cyclical',
  'JPM': 'Financial', 'BAC': 'Financial',
  'JNJ': 'Healthcare', 'PFE': 'Healthcare',
  'XOM': 'Energy', 'CVX': 'Energy',
};

export class EnhancedPortfolioRiskMonitor {
  private portfolio: Portfolio;
  private priceHistory: Map<string, OHLCV[]> = new Map();
  private benchmarkReturns: number[] = [];
  private alerts: RiskAlert[] = [];
  private lastVaRUpdate: Date = new Date();
  private varUpdateInterval: number = 60000;
  private sectorMapping: SectorMapping;

  constructor(portfolio: Portfolio, sectorMapping?: SectorMapping) {
    this.portfolio = portfolio;
    this.sectorMapping = sectorMapping || DEFAULT_SECTOR_MAPPING;
  }

  calculateEnhancedRiskMetrics(): EnhancedRiskMetrics {
    const sectorExposures = calculateSectorExposures(this.portfolio, this.sectorMapping);
    const marketExposures = calculateMarketExposures(this.portfolio);
    const liquidity = calculateLiquidityScore(this.portfolio);
    const concentration = calculateConcentrationMetrics(this.portfolio);
    const realTimeVaR = this.calculateRealTimeVaR();
    const enhancedBeta = this.calculateEnhancedBeta();

    const returns = this.calculatePortfolioReturns();
    const volatility = calculateVolatilityFlexible(returns, true, true);
    const maxDrawdown = calculateMaxDrawdownFromReturns(returns, true);
    const currentDrawdown = calculateCurrentDrawdownFromReturns(returns);
    const sharpeRatio = calculateSharpeRatio(returns, volatility);
    const sortinoRatio = calculateSortinoRatio(returns);

    const correlationMatrix = this.calculateCorrelationMatrix();

    return {
      var95: realTimeVaR.var95,
      cvar95: realTimeVaR.var99 * 1.3,
      beta: enhancedBeta.market,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      currentDrawdown,
      volatility,
      correlationMatrix,
      alpha: 0,
      sectorExposures,
      marketExposures,
      liquidity,
      concentration,
      realTimeVaR,
      enhancedBeta
    };
  }

  private calculateRealTimeVaR() {
    const now = new Date();
    const returns = this.calculatePortfolioReturns();
    const result = calculateHistoricalVaR(returns, this.portfolio.totalValue, now);
    this.lastVaRUpdate = now;
    return result;
  }

  private calculateEnhancedBeta() {
    const portfolioReturns = this.calculatePortfolioReturns();

    if (portfolioReturns.length < 20 || this.benchmarkReturns.length < 20) {
      return { market: 1.0, sector: 1.0, style: 0 };
    }

    const marketBeta = calculateBeta(portfolioReturns, this.benchmarkReturns);
    const styleExposure = calculateStyleExposure(this.portfolio, this.sectorMapping);

    return { market: marketBeta, sector: marketBeta * 1.1, style: styleExposure };
  }

  generateRiskAlerts(limits: {
    maxSectorExposure?: number;
    maxVaR95?: number;
    maxBeta?: number;
    minLiquidity?: number;
  }): RiskAlert[] {
    const metrics = this.calculateEnhancedRiskMetrics();
    const newAlerts = generateAllRiskAlerts(metrics, limits, this.sectorMapping);
    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  private calculatePortfolioReturns(): number[] {
    if (this.portfolio.positions.length === 0) return [];

    const symbols = this.portfolio.positions.map(p => p.symbol);
    const totalValue = this.portfolio.totalValue;

    if (totalValue <= 0) return [];

    const weights = new Map<string, number>();
    for (const position of this.portfolio.positions) {
      const value = position.currentPrice * position.quantity;
      weights.set(position.symbol, value / totalValue);
    }

    let minLength = Infinity;
    for (const symbol of symbols) {
      const history = this.priceHistory.get(symbol);
      if (history && history.length > 1) {
        minLength = Math.min(minLength, history.length);
      }
    }

    if (minLength === Infinity || minLength < 2) return [];

    const returns: number[] = [];

    for (let i = 1; i < minLength; i++) {
      let portfolioReturn = 0;

      for (const symbol of symbols) {
        const history = this.priceHistory.get(symbol);
        const weight = weights.get(symbol) || 0;

        if (history && history.length > i) {
          const currentPrice = history[i].close;
          const previousPrice = history[i - 1].close;

          if (previousPrice > 0) {
            portfolioReturn += ((currentPrice - previousPrice) / previousPrice) * weight;
          }
        }
      }

      returns.push(portfolioReturn);
    }

    return returns;
  }

  private calculateCorrelationMatrix(): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    const symbols = this.portfolio.positions.map(p => p.symbol);

    const returnsMap = new Map<string, number[]>();

    for (const symbol of symbols) {
      const history = this.priceHistory.get(symbol);
      if (history && history.length > 1) {
        const returns: number[] = [];
        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1].close;
          const curr = history[i].close;
          if (prev > 0) returns.push((curr - prev) / prev);
        }
        returnsMap.set(symbol, returns);
      }
    }

    for (const symbol1 of symbols) {
      const row = new Map<string, number>();
      const returns1 = returnsMap.get(symbol1);

      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          row.set(symbol2, 1);
        } else {
          const returns2 = returnsMap.get(symbol2);

          if (returns1 && returns2 && returns1.length > 1 && returns2.length > 1) {
            const minLen = Math.min(returns1.length, returns2.length);
            row.set(symbol2, calculatePearsonCorrelation(returns1.slice(-minLen), returns2.slice(-minLen)));
          } else {
            row.set(symbol2, 0);
          }
        }
      }

      matrix.set(symbol1, row);
    }

    return matrix;
  }

  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
  }

  updatePriceHistory(symbol: string, history: OHLCV[]): void {
    this.priceHistory.set(symbol, history);
  }

  updateBenchmarkReturns(returns: number[]): void {
    this.benchmarkReturns = returns;
  }

  getAlerts(): RiskAlert[] {
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

export const createEnhancedPortfolioRiskMonitor = (
  portfolio: Portfolio,
  sectorMapping?: SectorMapping
): EnhancedPortfolioRiskMonitor => {
  return new EnhancedPortfolioRiskMonitor(portfolio, sectorMapping);
};
