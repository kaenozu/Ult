import { Position, Stock, OHLCV, PortfolioRiskMetrics, RiskLimits, PositionRisk, RiskCheckResult, PositionAdjustment } from './types';
import {
  calculateReturnsMatrix,
  calculatePortfolioReturns,
  calculateAssetReturns,
  calculateStandardDeviation,
  calculateValueAtRisk,
  calculateExpectedShortfall,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCorrelationMatrix,
  calculateCorrelation,
  calculateDiversificationRatio,
  calculateBeta,
  getDefaultRiskMetrics
} from './calculators';

export class PortfolioRiskManagementService {
  private riskFreeRate: number = 0.01;

  calculatePortfolioRiskMetrics(
    positions: Position[],
    stocks: Stock[],
    priceHistory: Record<string, OHLCV[]>,
    benchmarkReturns: number[] = []
  ): PortfolioRiskMetrics {
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentPrice * pos.quantity, 0);

    if (totalValue === 0 || positions.length === 0) {
      return getDefaultRiskMetrics();
    }

    const weights = positions.map(pos => (pos.currentPrice * pos.quantity) / totalValue);
    const symbols = positions.map(p => p.symbol);
    const returnsMatrix = calculateReturnsMatrix(symbols, priceHistory);
    const portfolioReturns = calculatePortfolioReturns(returnsMatrix, weights);

    const volatility = calculateStandardDeviation(portfolioReturns);
    const valueAtRisk = calculateValueAtRisk(portfolioReturns, 0.95);
    const expectedShortfall = calculateExpectedShortfall(portfolioReturns, 0.95);
    const maxDrawdown = calculateMaxDrawdown(portfolioReturns);
    const sharpeRatio = calculateSharpeRatio(portfolioReturns, this.riskFreeRate);
    const sortinoRatio = calculateSortinoRatio(portfolioReturns, this.riskFreeRate);
    const correlationMatrix = calculateCorrelationMatrix(returnsMatrix);

    const maxPositionWeight = Math.max(...weights);
    const concentrationRisk = maxPositionWeight;

    const diversificationRatio = calculateDiversificationRatio(returnsMatrix, weights);

    let beta = 0;
    if (benchmarkReturns.length > 0) {
      beta = calculateBeta(portfolioReturns, benchmarkReturns);
    }

    const marginUtilization = positions.reduce((sum, pos) => sum + pos.quantity, 0) / positions.length;

    return {
      valueAtRisk,
      expectedShortfall,
      maxDrawdown,
      volatility,
      beta,
      sharpeRatio,
      sortinoRatio,
      correlationMatrix,
      concentrationRisk,
      diversificationRatio,
      marginUtilization
    };
  }

  calculatePositionRisk(
    position: Position,
    positions: Position[],
    priceHistory: Record<string, OHLCV[]>
  ): PositionRisk {
    const totalValue = positions.reduce((sum, pos) => sum + pos.currentPrice * pos.quantity, 0);
    const positionValue = position.currentPrice * position.quantity;
    const weight = positionValue / totalValue;

    const symbols = positions.map(p => p.symbol);
    const returnsMatrix = calculateReturnsMatrix(symbols, priceHistory);
    const weights = positions.map(pos => (pos.currentPrice * pos.quantity) / totalValue);

    const portfolioReturns = calculatePortfolioReturns(returnsMatrix, weights);
    const positionReturns = calculateAssetReturns(position.symbol, priceHistory);
    const correlationToPortfolio = calculateCorrelation(positionReturns, portfolioReturns);

    const portfolioVol = calculateStandardDeviation(portfolioReturns);
    const portfolioVaR = calculateValueAtRisk(portfolioReturns, 0.95);

    const contributionToVaR = weight * correlationToPortfolio * portfolioVaR;
    const contributionToVolatility = weight * correlationToPortfolio * portfolioVol;

    const assetVol = calculateStandardDeviation(positionReturns);
    const assetBeta = calculateBeta(positionReturns, portfolioReturns);

    return {
      symbol: position.symbol,
      value: positionValue,
      contributionToVaR,
      contributionToVolatility,
      beta: assetBeta,
      correlationToPortfolio,
      riskMetrics: {
        volatility: assetVol,
        beta: assetBeta,
        valueAtRisk: calculateValueAtRisk(positionReturns, 0.95)
      }
    };
  }

  checkRiskLimits(
    portfolioRiskMetrics: PortfolioRiskMetrics,
    riskLimits: RiskLimits
  ): RiskCheckResult {
    const violations: string[] = [];
    const recommendations: string[] = [];

    if (portfolioRiskMetrics.valueAtRisk > riskLimits.maxVaR) {
      violations.push(`VaR exceeds limit: ${portfolioRiskMetrics.valueAtRisk.toFixed(2)} > ${riskLimits.maxVaR}`);
      recommendations.push('Reduce position sizes or hedge with derivatives');
    }

    if (portfolioRiskMetrics.maxDrawdown > riskLimits.maxDrawdown) {
      violations.push(`Max Drawdown exceeds limit: ${portfolioRiskMetrics.maxDrawdown.toFixed(2)} > ${riskLimits.maxDrawdown}`);
      recommendations.push('Implement tighter stop losses or reduce leverage');
    }

    if (portfolioRiskMetrics.concentrationRisk > riskLimits.maxPositionConcentration) {
      violations.push(`Concentration risk exceeds limit: ${portfolioRiskMetrics.concentrationRisk.toFixed(2)} > ${riskLimits.maxPositionConcentration}`);
      recommendations.push('Diversify portfolio by reducing largest positions');
    }

    if (portfolioRiskMetrics.diversificationRatio < riskLimits.minDiversificationRatio) {
      violations.push(`Diversification ratio below minimum: ${portfolioRiskMetrics.diversificationRatio.toFixed(2)} < ${riskLimits.minDiversificationRatio}`);
      recommendations.push('Add uncorrelated assets to increase diversification');
    }

    if (portfolioRiskMetrics.beta > riskLimits.maxBeta) {
      violations.push(`Beta exceeds limit: ${portfolioRiskMetrics.beta.toFixed(2)} > ${riskLimits.maxBeta}`);
      recommendations.push('Reduce exposure to high-beta assets');
    }

    return {
      isWithinLimits: violations.length === 0,
      violations,
      recommendations
    };
  }

  suggestPositionAdjustments(
    positions: Position[],
    riskLimits: RiskLimits,
    portfolioRiskMetrics: PortfolioRiskMetrics
  ): PositionAdjustment[] {
    const suggestions: PositionAdjustment[] = [];

    if (portfolioRiskMetrics.concentrationRisk > riskLimits.maxPositionConcentration) {
      const maxValue = Math.max(...positions.map(p => p.currentPrice * p.quantity));
      const maxPosition = positions.find(p => p.currentPrice * p.quantity === maxValue);

      if (maxPosition) {
        const currentSize = maxPosition.currentPrice * maxPosition.quantity;
        const suggestedSize = riskLimits.maxPositionConcentration *
          positions.reduce((sum, pos) => sum + pos.currentPrice * pos.quantity, 0);

        suggestions.push({
          symbol: maxPosition.symbol,
          currentSize,
          suggestedSize,
          reason: 'High concentration risk - reducing position size'
        });
      }
    }

    return suggestions;
  }
}

export const portfolioRiskManagementService = new PortfolioRiskManagementService();
