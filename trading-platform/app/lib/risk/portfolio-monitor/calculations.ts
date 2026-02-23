import { Portfolio } from '@/app/types';
import { VaR } from '@/app/constants/risk-management';

export function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumSqX += diffX * diffX;
    sumSqY += diffY * diffY;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  return denominator > 0 ? numerator / denominator : 0;
}

export function calculatePValue(correlation: number, n: number): number {
  if (n < 3) return 1;
  const t = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
  return Math.max(0, 1 - t / 10);
}

export function calculatePortfolioVolatility(portfolioHistory: number[]): number {
  if (portfolioHistory.length < 2) return 20;

  const returns = portfolioHistory;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function calculateHistoricalVaR(
  portfolioHistory: number[],
  portfolio: Portfolio
): { var95: number; var99: number; cvar95: number; cvar99: number } {
  const returns = portfolioHistory;

  if (returns.length < 30) {
    return calculateParametricVaR(portfolio);
  }

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const totalValue = portfolio.totalValue + portfolio.cash;

  const index95 = Math.floor(sortedReturns.length * 0.05);
  const var95 = Math.abs(sortedReturns[index95]) * totalValue;

  const index99 = Math.floor(sortedReturns.length * 0.01);
  const var99 = Math.abs(sortedReturns[index99]) * totalValue;

  const tailReturns95 = sortedReturns.slice(0, index95);
  const cvar95 = tailReturns95.length > 0
    ? Math.abs(tailReturns95.reduce((sum, r) => sum + r, 0) / tailReturns95.length) * totalValue
    : var95;

  const tailReturns99 = sortedReturns.slice(0, index99);
  const cvar99 = tailReturns99.length > 0
    ? Math.abs(tailReturns99.reduce((sum, r) => sum + r, 0) / tailReturns99.length) * totalValue
    : var99;

  return { var95, var99, cvar95, cvar99 };
}

export function calculateParametricVaR(
  portfolio: Portfolio
): { var95: number; var99: number; cvar95: number; cvar99: number } {
  const { positions } = portfolio;
  const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);

  if (totalValue === 0 || positions.length === 0) {
    return { var95: 0, var99: 0, cvar95: 0, cvar99: 0 };
  }

  const volatility = 0.2;
  const z95 = VaR.Z_SCORE_95;
  const z99 = VaR.Z_SCORE_99;

  const var95 = totalValue * volatility * z95;
  const var99 = totalValue * volatility * z99;

  const cvar95 = var95 * (Math.exp(0.5 * z95 * z95) / 0.05) / z95;
  const cvar99 = var99 * (Math.exp(0.5 * z99 * z99) / 0.01) / z99;

  return { var95, var99, cvar95, cvar99 };
}

export function calculateMonteCarloVaR(
  portfolio: Portfolio,
  returnsHistory: Map<string, number[]>
): { var95: number; var99: number; cvar95: number; cvar99: number } {
  const totalValue = portfolio.totalValue + portfolio.cash;
  const numSimulations = 10000;

  const simulatedReturns: number[] = [];

  for (let i = 0; i < numSimulations; i++) {
    let portfolioReturn = 0;

    for (const position of portfolio.positions) {
      const positionWeight = (position.currentPrice * position.quantity) / totalValue;
      const returns = returnsHistory.get(position.symbol) || [];

      if (returns.length > 0) {
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const std = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length);

        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

        const simulatedReturn = mean + std * z;
        portfolioReturn += positionWeight * simulatedReturn;
      }
    }

    simulatedReturns.push(portfolioReturn);
  }

  simulatedReturns.sort((a, b) => a - b);

  const index95 = Math.floor(simulatedReturns.length * 0.05);
  const index99 = Math.floor(simulatedReturns.length * 0.01);

  const var95 = Math.abs(simulatedReturns[index95]) * totalValue;
  const var99 = Math.abs(simulatedReturns[index99]) * totalValue;

  const tailReturns95 = simulatedReturns.slice(0, index95);
  const cvar95 = tailReturns95.reduce((sum, r) => sum + r, 0) / tailReturns95.length * -totalValue;

  const tailReturns99 = simulatedReturns.slice(0, index99);
  const cvar99 = tailReturns99.reduce((sum, r) => sum + r, 0) / tailReturns99.length * -totalValue;

  return { var95, var99, cvar95, cvar99 };
}
