import { Position, PositionRisk } from './types';

export function calculatePositionRisk(
  position: Position,
  portfolioValue: number,
  returnsHistory: Map<string, number[]>,
  calculateStandardDeviation: (values: number[]) => number
): PositionRisk {
  const positionValue = position.currentPrice * position.quantity;
  const positionPercent = portfolioValue > 0 ? (positionValue / portfolioValue) * 100 : 0;
  
  const unrealizedPnL = position.side === 'LONG'
    ? (position.currentPrice - position.avgPrice) * position.quantity
    : (position.avgPrice - position.currentPrice) * position.quantity;
  
  const unrealizedPnLPercent = position.avgPrice > 0
    ? (unrealizedPnL / (position.avgPrice * position.quantity)) * 100
    : 0;
  
  const returns = returnsHistory.get(position.symbol) || [];
  const volatility = calculateStandardDeviation(returns) * Math.sqrt(252) * 100;
  
  const var95 = volatility * 1.645 * positionValue / 100;
  
  const riskContribution = positionPercent * volatility / 100;
  
  const pos = position as Position & { stopLoss?: number };
  const stopLossDistance = pos.stopLoss
    ? Math.abs((position.currentPrice - pos.stopLoss) / position.currentPrice) * 100
    : 0;
  
  return {
    symbol: position.symbol,
    positionValue,
    positionPercent,
    unrealizedPnL,
    unrealizedPnLPercent,
    volatility,
    var95,
    riskContribution,
    stopLossDistance,
  };
}

export function calculateCovarianceMatrix(
  positions: Position[],
  returnsHistory: Map<string, number[]>,
  calculateStandardDeviation: (values: number[]) => number,
  calculateCorrelation: (v1: number[], v2: number[]) => number
): number[][] {
  const n = positions.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const returns1 = returnsHistory.get(positions[i].symbol) || [];
      const returns2 = returnsHistory.get(positions[j].symbol) || [];
      
      if (i === j) {
        const variance = Math.pow(calculateStandardDeviation(returns1), 2);
        matrix[i][j] = variance;
      } else {
        const correlation = calculateCorrelation(returns1, returns2);
        const stdDev1 = calculateStandardDeviation(returns1);
        const stdDev2 = calculateStandardDeviation(returns2);
        matrix[i][j] = correlation * stdDev1 * stdDev2;
      }
    }
  }
  
  return matrix;
}
