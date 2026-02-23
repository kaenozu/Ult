import { BacktestResult } from '@/app/types';
import { AdvancedMetrics } from './types';
import {
  calculateEquityCurve,
  calculateUlcerIndex,
  calculateConsecutiveTrades,
  analyzeDrawdowns,
} from './calculators';
import { calculateBenchmarkMetrics } from './distribution';

export function calculateBasicMetrics(
  result: BacktestResult,
  returns: number[]
): Partial<AdvancedMetrics> {
  const totalReturn = result.totalReturn;
  const startDate = new Date(result.startDate);
  const endDate = new Date(result.endDate);
  const years = Math.max(
    0.1,
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
  );
  const annualizedReturn = (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;

  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  return {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
  };
}

export function calculateRiskMetrics(
  result: BacktestResult,
  returns: number[],
  equity: number[],
  benchmarkReturns?: number[]
): Partial<AdvancedMetrics> {
  const riskFreeRate = 2;
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 0
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio =
    stdDev > 0 ? ((avgReturn - riskFreeRate / 252) / stdDev) * Math.sqrt(252) : 0;

  const downsideReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    downsideReturns.length > 0
      ? downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
      : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio =
    downsideDeviation > 0
      ? (avgReturn * 252 - riskFreeRate) / (downsideDeviation * Math.sqrt(252))
      : 0;

  const drawdownAnalysis = analyzeDrawdowns(equity, result.trades);
  const calmarRatio =
    drawdownAnalysis.maxDrawdown > 0 ? result.totalReturn / drawdownAnalysis.maxDrawdown : 0;
  const recoveryFactor =
    drawdownAnalysis.maxDrawdown > 0 ? result.totalReturn / drawdownAnalysis.maxDrawdown : 0;

  const ulcerIndex = calculateUlcerIndex(equity);
  const painRatio = ulcerIndex > 0 ? result.totalReturn / ulcerIndex : 0;

  const threshold = 0;
  const gains = returns.filter((r) => r > threshold).reduce((sum, r) => sum + r - threshold, 0);
  const losses = returns.filter((r) => r < threshold).reduce((sum, r) => sum + threshold - r, 0);
  const omegaRatio = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;

  let alpha = 0, beta = 0, informationRatio = 0, trackingError = 0;
  if (benchmarkReturns && benchmarkReturns.length === returns.length) {
    const benchmarkStats = calculateBenchmarkMetrics(returns, benchmarkReturns);
    alpha = benchmarkStats.alpha;
    beta = benchmarkStats.beta;
    informationRatio = benchmarkStats.informationRatio;
    trackingError = benchmarkStats.trackingError;
  }

  return {
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    calmarRatio: parseFloat(calmarRatio.toFixed(2)),
    informationRatio: parseFloat(informationRatio.toFixed(2)),
    treynorRatio: beta > 0 ? parseFloat((result.totalReturn / beta).toFixed(2)) : 0,
    omegaRatio: parseFloat(omegaRatio.toFixed(2)),
    maxDrawdown: parseFloat(drawdownAnalysis.maxDrawdown.toFixed(2)),
    maxDrawdownDuration: drawdownAnalysis.maxDrawdownDuration,
    averageDrawdown: parseFloat(drawdownAnalysis.averageDrawdown.toFixed(2)),
    recoveryFactor: parseFloat(recoveryFactor.toFixed(2)),
    ulcerIndex: parseFloat(ulcerIndex.toFixed(2)),
    painRatio: parseFloat(painRatio.toFixed(2)),
    alpha: parseFloat(alpha.toFixed(2)),
    beta: parseFloat(beta.toFixed(2)),
    trackingError: parseFloat(trackingError.toFixed(2)),
  };
}

export function calculateTradeMetrics(result: BacktestResult): Partial<AdvancedMetrics> {
  const trades = result.trades;
  const winningTrades = trades.filter((t) => (t.profitPercent || 0) > 0);
  const losingTrades = trades.filter((t) => (t.profitPercent || 0) <= 0);

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losingTrades.length / totalTrades) * 100 : 0;

  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0));

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const lossFactor = grossProfit > 0 ? grossLoss / grossProfit : grossLoss > 0 ? Infinity : 0;

  const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const payoffRatio = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;

  const averageTrade =
    totalTrades > 0 ? trades.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / totalTrades : 0;

  const expectancy = (winRate / 100) * averageWin - (lossRate / 100) * Math.abs(averageLoss);
  const expectedValue = expectancy * totalTrades;

  const largestWin =
    winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.profitPercent || 0)) : 0;
  const largestLoss =
    losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.profitPercent || 0)) : 0;

  const holdingPeriods = trades.map((t) => {
    const entry = new Date(t.entryDate);
    const exit = t.exitDate ? new Date(t.exitDate) : new Date();
    return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  });

  const winHoldingPeriods = winningTrades.map((t) => {
    const entry = new Date(t.entryDate);
    const exit = t.exitDate ? new Date(t.exitDate) : new Date();
    return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  });

  const lossHoldingPeriods = losingTrades.map((t) => {
    const entry = new Date(t.entryDate);
    const exit = t.exitDate ? new Date(t.exitDate) : new Date();
    return Math.max(1, (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  });

  const averageHoldingPeriod =
    holdingPeriods.length > 0 ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length : 0;
  const averageWinHoldingPeriod =
    winHoldingPeriods.length > 0
      ? winHoldingPeriods.reduce((a, b) => a + b, 0) / winHoldingPeriods.length
      : 0;
  const averageLossHoldingPeriod =
    lossHoldingPeriods.length > 0
      ? lossHoldingPeriods.reduce((a, b) => a + b, 0) / lossHoldingPeriods.length
      : 0;

  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveTrades(trades);
  const gainToPainRatio = grossLoss > 0 ? result.totalReturn / grossLoss : result.totalReturn;

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: parseFloat(winRate.toFixed(1)),
    lossRate: parseFloat(lossRate.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    lossFactor: parseFloat(lossFactor.toFixed(2)),
    payoffRatio: parseFloat(payoffRatio.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    expectedValue: parseFloat(expectedValue.toFixed(2)),
    averageTrade: parseFloat(averageTrade.toFixed(2)),
    averageWin: parseFloat(averageWin.toFixed(2)),
    averageLoss: parseFloat(averageLoss.toFixed(2)),
    averageHoldingPeriod: parseFloat(averageHoldingPeriod.toFixed(1)),
    averageWinHoldingPeriod: parseFloat(averageWinHoldingPeriod.toFixed(1)),
    averageLossHoldingPeriod: parseFloat(averageLossHoldingPeriod.toFixed(1)),
    largestWin: parseFloat(largestWin.toFixed(2)),
    largestLoss: parseFloat(largestLoss.toFixed(2)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    gainToPainRatio: parseFloat(gainToPainRatio.toFixed(2)),
  };
}

export function calculateDistributionMetrics(returns: number[]): Partial<AdvancedMetrics> {
  if (returns.length === 0) {
    return {
      skewness: 0, kurtosis: 0, valueAtRisk95: 0, valueAtRisk99: 0, conditionalVaR95: 0,
      kRatio: 0, rSquared: 0, upCaptureRatio: 0, downCaptureRatio: 0,
    };
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
  const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(sortedReturns.length * 0.05);
  const var99Index = Math.floor(sortedReturns.length * 0.01);
  const valueAtRisk95 = sortedReturns[var95Index] || 0;
  const valueAtRisk99 = sortedReturns[var99Index] || 0;

  const cvar95Returns = sortedReturns.slice(0, var95Index);
  const conditionalVaR95 =
    cvar95Returns.length > 0 ? cvar95Returns.reduce((a, b) => a + b, 0) / cvar95Returns.length : 0;

  return {
    skewness: parseFloat(skewness.toFixed(2)),
    kurtosis: parseFloat(kurtosis.toFixed(2)),
    valueAtRisk95: parseFloat(valueAtRisk95.toFixed(2)),
    valueAtRisk99: parseFloat(valueAtRisk99.toFixed(2)),
    conditionalVaR95: parseFloat(conditionalVaR95.toFixed(2)),
    kRatio: 0, rSquared: 0, upCaptureRatio: 0, downCaptureRatio: 0,
  };
}
