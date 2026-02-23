import { Portfolio } from '@/app/types';
import { VaRResult } from './types';

export function calculateHistoricalVaR(
  returns: number[],
  totalValue: number,
  lastUpdate: Date = new Date()
): VaRResult {
  if (returns.length < 30) {
    return {
      var95: 0.05 * totalValue,
      var99: 0.10 * totalValue,
      lastUpdate,
      confidence: 0.5
    };
  }

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(returns.length * 0.05);
  const var99Index = Math.floor(returns.length * 0.01);

  const var95 = Math.abs(sortedReturns[var95Index] || 0) * totalValue;
  const var99 = Math.abs(sortedReturns[var99Index] || 0) * totalValue;

  const confidence = Math.min(1, returns.length / 100);

  return {
    var95,
    var99,
    lastUpdate,
    confidence
  };
}

export function calculateParametricVaR(
  mean: number,
  stdDev: number,
  totalValue: number,
  confidence: number = 0.95
): number {
  const zScores: { [key: number]: number } = {
    0.90: 1.282,
    0.95: 1.645,
    0.99: 2.326
  };

  const z = zScores[confidence] || 1.645;
  return (mean - z * stdDev) * totalValue;
}

export function calculateConditionalVaR(
  returns: number[],
  totalValue: number,
  confidence: number = 0.95
): number {
  if (returns.length < 30) {
    return 0.07 * totalValue;
  }

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const tailIndex = Math.floor(returns.length * (1 - confidence));
  const tailReturns = sortedReturns.slice(0, tailIndex + 1);

  if (tailReturns.length === 0) {
    return 0.07 * totalValue;
  }

  const expectedTailLoss = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  return Math.abs(expectedTailLoss) * totalValue;
}

export function calculatePortfolioReturns(
  portfolio: Portfolio,
  priceHistory: Map<string, Map<string, number[]>>
): number[] {
  if (portfolio.positions.length === 0) return [];

  const symbols = portfolio.positions.map(p => p.symbol);
  const totalValue = portfolio.totalValue;

  if (totalValue <= 0) return [];

  const weights = new Map<string, number>();
  for (const position of portfolio.positions) {
    const value = position.currentPrice * position.quantity;
    weights.set(position.symbol, value / totalValue);
  }

  let minLength = Infinity;
  for (const symbol of symbols) {
    const history = priceHistory.get(symbol);
    if (history) {
      const closes = history.get('close');
      if (closes && closes.length > 1) {
        minLength = Math.min(minLength, closes.length);
      }
    }
  }

  if (minLength === Infinity || minLength < 2) return [];

  const returns: number[] = [];

  for (let i = 1; i < minLength; i++) {
    let portfolioReturn = 0;

    for (const symbol of symbols) {
      const history = priceHistory.get(symbol);
      const weight = weights.get(symbol) || 0;

      if (history) {
        const closes = history.get('close');
        if (closes && closes.length > i) {
          const currentPrice = closes[i];
          const previousPrice = closes[i - 1];

          if (previousPrice > 0) {
            const assetReturn = (currentPrice - previousPrice) / previousPrice;
            portfolioReturn += assetReturn * weight;
          }
        }
      }
    }

    returns.push(portfolioReturn);
  }

  return returns;
}

export function calculateVolatility(returns: number[], annualize: boolean = true): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  return annualize ? stdDev * Math.sqrt(252) : stdDev;
}

export function calculateMaxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;

  let peak = 1;
  let maxDrawdown = 0;
  let cumulative = 1;

  for (const ret of returns) {
    cumulative *= (1 + ret);
    peak = Math.max(peak, cumulative);
    const drawdown = (peak - cumulative) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown * 100;
}

export function calculateCurrentDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;

  let peak = 1;
  let cumulative = 1;

  for (const ret of returns) {
    cumulative *= (1 + ret);
    peak = Math.max(peak, cumulative);
  }

  return ((peak - cumulative) / peak) * 100;
}
