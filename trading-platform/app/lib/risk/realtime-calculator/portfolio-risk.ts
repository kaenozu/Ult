import { Portfolio, RiskCalculationConfig, RiskAlert } from './types';

export function calculateHistoricalVaR(
  returns: number[],
  totalValue: number,
  calculateParametricVaR: () => { var95: number; var99: number; cvar95: number }
): { var95: number; var99: number; cvar95: number } {
  if (returns.length < 30) {
    return calculateParametricVaR();
  }
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index95 = Math.floor(returns.length * 0.05);
  const index99 = Math.floor(returns.length * 0.01);
  const var95 = -sortedReturns[index95] * totalValue;
  const var99 = -sortedReturns[index99] * totalValue;
  const tailReturns = sortedReturns.slice(0, index95);
  const avgTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  const cvar95 = -avgTailReturn * totalValue;
  return { var95, var99, cvar95 };
}

export function calculateParametricVaR(
  totalValue: number,
  volatility: number,
  timeHorizon: number
): { var95: number; var99: number; cvar95: number } {
  const vol = volatility / 100;
  const z95 = 1.645;
  const z99 = 2.326;
  const var95 = totalValue * vol * z95 * Math.sqrt(timeHorizon);
  const var99 = totalValue * vol * z99 * Math.sqrt(timeHorizon);
  const cvar95 = var95 * (Math.exp(0.5 * z95 * z95) / (1 - 0.95)) / z95;
  return { var95, var99, cvar95 };
}

export function calculatePortfolioVolatility(
  returns: number[],
  calculateStandardDeviation: (values: number[]) => number
): number {
  if (returns.length < 2) return 15;
  const stdDev = calculateStandardDeviation(returns);
  return stdDev * Math.sqrt(252) * 100;
}

export function calculateWeightedVolatility(
  portfolio: Portfolio,
  returnsHistory: Map<string, number[]>,
  calculateStandardDeviation: (values: number[]) => number
): number {
  const totalValue = portfolio.totalValue;
  if (totalValue === 0 || portfolio.positions.length === 0) return 0;
  let weightedVol = 0;
  for (const position of portfolio.positions) {
    const positionValue = position.currentPrice * position.quantity;
    const weight = positionValue / totalValue;
    const returns = returnsHistory.get(position.symbol) || [];
    const volatility = calculateStandardDeviation(returns) * Math.sqrt(252) * 100;
    weightedVol += weight * volatility;
  }
  return weightedVol;
}

export function calculateConcentrationRisk(
  portfolio: Portfolio
): { concentrationRisk: number; largestPositionPercent: number } {
  const totalValue = portfolio.totalValue;
  if (totalValue === 0 || portfolio.positions.length === 0) {
    return { concentrationRisk: 0, largestPositionPercent: 0 };
  }
  let hhi = 0;
  let largestPositionPercent = 0;
  for (const position of portfolio.positions) {
    const positionValue = position.currentPrice * position.quantity;
    const weight = (positionValue / totalValue) * 100;
    hhi += weight * weight;
    largestPositionPercent = Math.max(largestPositionPercent, weight);
  }
  const n = portfolio.positions.length;
  const minHHI = 10000 / n;
  const maxHHI = 10000;
  if (n === 1) return { concentrationRisk: 1, largestPositionPercent: 100 };
  const concentrationRisk = Math.min(1, Math.max(0, (hhi - minHHI) / (maxHHI - minHHI)));
  return { concentrationRisk, largestPositionPercent };
}

export function calculateCorrelationRisk(
  portfolio: Portfolio,
  returnsHistory: Map<string, number[]>,
  calculateCorrelation: (v1: number[], v2: number[]) => number
): { correlationRisk: number; avgCorrelation: number } {
  const positions = portfolio.positions;
  if (positions.length < 2) return { correlationRisk: 0, avgCorrelation: 0 };
  let sumCorrelation = 0;
  let count = 0;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const returns1 = returnsHistory.get(positions[i].symbol) || [];
      const returns2 = returnsHistory.get(positions[j].symbol) || [];
      if (returns1.length > 20 && returns2.length > 20) {
        const correlation = calculateCorrelation(returns1, returns2);
        sumCorrelation += Math.abs(correlation);
        count++;
      }
    }
  }
  const avgCorrelation = count > 0 ? sumCorrelation / count : 0;
  const correlationRisk = Math.min(1, avgCorrelation);
  return { correlationRisk, avgCorrelation };
}

export function calculateMaxDrawdown(history: number[]): number {
  if (history.length < 2) return 0;
  let peak = history[0];
  let maxDD = 0;
  for (let i = 1; i < history.length; i++) {
    const value = history[i];
    if (value > peak) peak = value;
    const dd = ((peak - value) / peak) * 100;
    maxDD = Math.max(maxDD, dd);
  }
  return maxDD;
}

export function calculateTotalRisk(params: {
  usedCapitalPercent: number;
  portfolioVolatility: number;
  concentrationRisk: number;
  correlationRisk: number;
  currentDrawdown: number;
}): number {
  const weights = { capital: 0.3, volatility: 0.25, concentration: 0.2, correlation: 0.15, drawdown: 0.1 };
  const normalizedRisk = 
    (params.usedCapitalPercent / 100) * weights.capital +
    (params.portfolioVolatility / 50) * weights.volatility +
    params.concentrationRisk * weights.concentration +
    params.correlationRisk * weights.correlation +
    (params.currentDrawdown / 30) * weights.drawdown;
  return Math.min(100, normalizedRisk * 100);
}

export function determineRiskLevel(
  totalRisk: number,
  config: RiskCalculationConfig
): 'safe' | 'caution' | 'warning' | 'danger' | 'critical' {
  if (totalRisk >= config.dangerThreshold) return 'critical';
  if (totalRisk >= config.warningThreshold) return 'danger';
  if (totalRisk >= config.cautionThreshold) return 'warning';
  if (totalRisk >= config.safeThreshold) return 'caution';
  return 'safe';
}

export function generateAlerts(
  params: {
    totalRiskPercent: number;
    currentDrawdown: number;
    maxDrawdown: number;
    dailyLossPercent: number;
    concentrationRisk: number;
    correlationRisk: number;
    largestPositionPercent: number;
  },
  config: RiskCalculationConfig
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const timestamp = Date.now();
  if (params.totalRiskPercent >= config.dangerThreshold) {
    alerts.push({
      id: `risk-total-${timestamp}`, type: 'max_loss', severity: 'critical',
      message: `総合リスクが危険水準に達しています (${params.totalRiskPercent.toFixed(1)}%)`,
      currentValue: params.totalRiskPercent, thresholdValue: config.dangerThreshold, timestamp,
      actionRequired: '新規注文を停止し、ポジションの縮小を検討してください',
    });
  } else if (params.totalRiskPercent >= config.warningThreshold) {
    alerts.push({
      id: `risk-total-${timestamp}`, type: 'max_loss', severity: 'high',
      message: `総合リスクが警告水準に達しています (${params.totalRiskPercent.toFixed(1)}%)`,
      currentValue: params.totalRiskPercent, thresholdValue: config.warningThreshold, timestamp,
      actionRequired: 'リスク管理を強化してください',
    });
  }
  if (params.currentDrawdown >= config.maxDrawdownPercent) {
    alerts.push({
      id: `drawdown-${timestamp}`, type: 'drawdown', severity: 'critical',
      message: `最大ドローダウン制限を超過しています (${params.currentDrawdown.toFixed(1)}%)`,
      currentValue: params.currentDrawdown, thresholdValue: config.maxDrawdownPercent, timestamp,
      actionRequired: '緊急ポジション縮小が必要です',
    });
  } else if (params.currentDrawdown >= config.maxDrawdownPercent * 0.8) {
    alerts.push({
      id: `drawdown-${timestamp}`, type: 'drawdown', severity: 'high',
      message: `ドローダウンが制限に近づいています (${params.currentDrawdown.toFixed(1)}%)`,
      currentValue: params.currentDrawdown, thresholdValue: config.maxDrawdownPercent, timestamp,
    });
  }
  if (params.dailyLossPercent >= config.maxDailyLossPercent) {
    alerts.push({
      id: `daily-loss-${timestamp}`, type: 'max_loss', severity: 'critical',
      message: `本日の損失が制限を超えています (${params.dailyLossPercent.toFixed(1)}%)`,
      currentValue: params.dailyLossPercent, thresholdValue: config.maxDailyLossPercent, timestamp,
      actionRequired: '本日の取引を停止してください',
    });
  }
  if (params.largestPositionPercent >= config.maxPositionPercent) {
    alerts.push({
      id: `concentration-${timestamp}`, type: 'concentration', severity: 'high',
      message: `最大ポジション比率を超えています (${params.largestPositionPercent.toFixed(1)}%)`,
      currentValue: params.largestPositionPercent, thresholdValue: config.maxPositionPercent, timestamp,
      actionRequired: 'ポジションサイズを調整してください',
    });
  }
  if (params.correlationRisk >= 0.7) {
    alerts.push({
      id: `correlation-${timestamp}`, type: 'correlation', severity: 'medium',
      message: `ポジション間の相関が高すぎます (${params.correlationRisk.toFixed(2)})`,
      currentValue: params.correlationRisk, thresholdValue: config.maxCorrelation, timestamp,
      actionRequired: '分散を改善してください',
    });
  }
  return alerts;
}
