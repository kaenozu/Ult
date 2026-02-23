import { OHLCV, BacktestResult, BacktestTrade } from '@/app/types';
import { technicalIndicatorService } from '../../TechnicalIndicatorService';
import { RSI_CONFIG, BACKTEST_CONFIG } from '@/app/constants';
import {
  CorrelationMatrix,
  PortfolioSnapshot,
  PortfolioPosition,
  PortfolioPerformanceMetrics,
  MonthlyReturn,
  YearlyReturn,
} from './types';

export function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const sumXY = xSlice.reduce((sum, xi, i) => sum + xi * ySlice[i], 0);
  const sumX2 = xSlice.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = ySlice.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

export function buildCorrelationMatrix(
  symbols: string[],
  data: Map<string, OHLCV[]>
): CorrelationMatrix {
  const returns: Map<string, number[]> = new Map();

  for (const symbol of symbols) {
    const symbolData = data.get(symbol)!;
    const symbolReturns: number[] = [];

    for (let i = 1; i < symbolData.length; i++) {
      const dailyReturn = (symbolData[i].close - symbolData[i - 1].close) / symbolData[i - 1].close;
      symbolReturns.push(dailyReturn);
    }

    returns.set(symbol, symbolReturns);
  }

  const matrix: number[][] = [];

  for (let i = 0; i < symbols.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        matrix[i][j] = calculateCorrelation(
          returns.get(symbols[i])!,
          returns.get(symbols[j])!
        );
      }
    }
  }

  return { symbols, matrix };
}

export function calculateAverageCorrelation(matrix: number[][]): number {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      sum += Math.abs(matrix[i][j]);
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

export function calculatePortfolioMetrics(
  snapshots: PortfolioSnapshot[],
  trades: BacktestTrade[],
  correlationMatrix: CorrelationMatrix,
  positions: Map<string, PortfolioPosition>,
  rebalanceEvents: { trades: unknown[] }[],
  symbolsCount: number
): PortfolioPerformanceMetrics {
  const values = snapshots.map(s => s.totalValue);
  const returns = values.slice(1).map((v, i) => (v - values[i]) / values[i]);

  const initialValue = values[0];
  const finalValue = values[values.length - 1];
  const totalReturn = ((finalValue - initialValue) / initialValue) * 100;

  const days = values.length;
  const annualizedReturn = (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

  const riskFreeRate = 0.02;
  const sharpeRatio = volatility === 0 ? 0 : (annualizedReturn - riskFreeRate * 100) / volatility;

  const downsideReturns = returns.filter(r => r < 0);
  const downsideDeviation = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length) * Math.sqrt(252) * 100
    : 0;
  const sortinoRatio = downsideDeviation === 0 ? 0 : (annualizedReturn - riskFreeRate * 100) / downsideDeviation;

  let maxDrawdown = 0;
  let maxDrawdownDuration = 0;
  let peak = values[0];
  let peakIndex = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      peakIndex = i;
    }
    const drawdown = (peak - values[i]) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDuration = i - peakIndex;
    }
  }

  const calmarRatio = maxDrawdown === 0 ? 0 : annualizedReturn / (maxDrawdown * 100);

  const winningTrades = trades.filter(t => (t.profitPercent || 0) > 0);
  const losingTrades = trades.filter(t => (t.profitPercent || 0) <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0));
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

  const averageTrade = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / trades.length
    : 0;

  const monthlyReturns = calculateMonthlyReturns(snapshots, trades);
  const yearlyReturns = calculateYearlyReturns(snapshots, trades);

  const avgCorrelation = calculateAverageCorrelation(correlationMatrix.matrix);
  const diversificationRatio = 1 - avgCorrelation;

  const weights = Array.from(positions.values()).map(p => p.weight / 100);
  const concentrationRisk = weights.reduce((sum, w) => sum + w * w, 0);

  const turnoverRate = rebalanceEvents.length > 0
    ? (rebalanceEvents.reduce((sum, e) => sum + e.trades.length, 0) / symbolsCount) * 100
    : 0;

  return {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
    maxDrawdownDuration,
    calmarRatio: parseFloat(calmarRatio.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    averageTrade: parseFloat(averageTrade.toFixed(2)),
    totalTrades: trades.length,
    beta: 0,
    alpha: 0,
    informationRatio: 0,
    trackingError: 0,
    diversificationRatio: parseFloat(diversificationRatio.toFixed(2)),
    concentrationRisk: parseFloat(concentrationRisk.toFixed(2)),
    turnoverRate: parseFloat(turnoverRate.toFixed(2)),
    monthlyReturns,
    yearlyReturns,
  };
}

export function calculateMonthlyReturns(
  snapshots: PortfolioSnapshot[],
  trades: BacktestTrade[]
): MonthlyReturn[] {
  const monthlyMap = new Map<string, { return: number; trades: number }>();

  for (let i = 1; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = snapshots[i - 1];
    const date = new Date(current.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { return: 0, trades: 0 });
    }

    const data = monthlyMap.get(key)!;
    data.return += (current.totalValue - previous.totalValue) / previous.totalValue;
  }

  for (const trade of trades) {
    if (!trade.exitDate) continue;
    const date = new Date(trade.exitDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (monthlyMap.has(key)) {
      monthlyMap.get(key)!.trades++;
    }
  }

  return Array.from(monthlyMap.entries())
    .map(([key, data]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year,
        month,
        return: parseFloat((data.return * 100).toFixed(2)),
        trades: data.trades,
      };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

export function calculateYearlyReturns(
  snapshots: PortfolioSnapshot[],
  trades: BacktestTrade[]
): YearlyReturn[] {
  const yearlyMap = new Map<number, { return: number; trades: number }>();

  for (let i = 1; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = snapshots[i - 1];
    const year = new Date(current.date).getFullYear();

    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, { return: 0, trades: 0 });
    }

    const data = yearlyMap.get(year)!;
    data.return += (current.totalValue - previous.totalValue) / previous.totalValue;
  }

  for (const trade of trades) {
    if (!trade.exitDate) continue;
    const year = new Date(trade.exitDate).getFullYear();

    if (yearlyMap.has(year)) {
      yearlyMap.get(year)!.trades++;
    }
  }

  return Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      return: parseFloat((data.return * 100).toFixed(2)),
      trades: data.trades,
    }))
    .sort((a, b) => a.year - b.year);
}

export function generateSignal(
  data: OHLCV[],
  rsiPeriod: number,
  smaPeriod: number
): 'BUY' | 'SELL' | 'HOLD' {
  const closes = data.map(d => d.close);
  const rsi = technicalIndicatorService.calculateRSI(closes, rsiPeriod);
  const sma = technicalIndicatorService.calculateSMA(closes, smaPeriod);

  const currentRSI = rsi[rsi.length - 1];
  const currentSMA = sma[sma.length - 1];
  const currentPrice = closes[closes.length - 1];

  if (currentPrice > currentSMA && currentRSI < RSI_CONFIG.OVERSOLD + 10) {
    return 'BUY';
  } else if (currentPrice < currentSMA && currentRSI > RSI_CONFIG.OVERBOUGHT) {
    return 'SELL';
  }

  return 'HOLD';
}

export async function runIndividualBacktest(
  symbol: string,
  data: OHLCV[],
  rsiPeriod: number,
  smaPeriod: number
): Promise<BacktestResult> {
  const trades: BacktestTrade[] = [];
  let currentPosition: { type: 'BUY' | 'SELL'; price: number; date: string } | null = null;

  const closes = data.map(d => d.close);
  const rsiValues = technicalIndicatorService.calculateRSI(closes, rsiPeriod);
  const smaValues = technicalIndicatorService.calculateSMA(closes, smaPeriod);

  const minPeriod = Math.max(rsiPeriod, smaPeriod) + 10;

  for (let i = minPeriod; i < data.length - 1; i++) {
    const currentRSI = rsiValues[i];
    const currentSMA = smaValues[i];
    const currentPrice = closes[i];
    const nextDay = data[i + 1];

    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (currentPrice > currentSMA && currentRSI < RSI_CONFIG.OVERSOLD + 10) {
      signalType = 'BUY';
    } else if (currentPrice < currentSMA && currentRSI > RSI_CONFIG.OVERBOUGHT) {
      signalType = 'SELL';
    }

    if (!currentPosition) {
      if (signalType === 'BUY' || signalType === 'SELL') {
        currentPosition = {
          type: signalType,
          price: nextDay.open,
          date: nextDay.date,
        };
      }
    } else {
      const change = (nextDay.close - currentPosition.price) / (currentPosition.price || 1);
      let shouldExit = false;
      let exitReason = '';

      if (currentPosition.type === 'BUY') {
        if (signalType === 'SELL') {
          shouldExit = true;
          exitReason = 'Signal Reversal';
        } else if (change > BACKTEST_CONFIG.BULL_TAKE_PROFIT) {
          shouldExit = true;
          exitReason = 'Take Profit';
        } else if (change < -BACKTEST_CONFIG.BULL_STOP_LOSS) {
          shouldExit = true;
          exitReason = 'Stop Loss';
        }
      } else {
        if (signalType === 'BUY') {
          shouldExit = true;
          exitReason = 'Signal Reversal';
        } else if (change < -BACKTEST_CONFIG.BEAR_TAKE_PROFIT) {
          shouldExit = true;
          exitReason = 'Take Profit';
        } else if (change > BACKTEST_CONFIG.BEAR_STOP_LOSS) {
          shouldExit = true;
          exitReason = 'Stop Loss';
        }
      }

      if (shouldExit) {
        const exitPrice = nextDay.close;
        const rawProfit = currentPosition.type === 'BUY'
          ? (exitPrice - currentPosition.price) / (currentPosition.price || 1)
          : (currentPosition.price - exitPrice) / (currentPosition.price || 1);

        trades.push({
          symbol,
          entryDate: currentPosition.date,
          exitDate: nextDay.date,
          entryPrice: currentPosition.price,
          exitPrice,
          profitPercent: parseFloat((rawProfit * 100).toFixed(2)),
          exitReason,
          type: currentPosition.type,
        });

        currentPosition = null;
      }
    }
  }

  const winningTrades = trades.filter(t => (t.profitPercent || 0) > 0).length;
  const losingTrades = trades.filter(t => (t.profitPercent || 0) <= 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalReturn = trades.reduce((sum, t) => sum + (t.profitPercent || 0), 0);

  const winningTradesData = trades.filter(t => (t.profitPercent || 0) > 0);
  const losingTradesData = trades.filter(t => (t.profitPercent || 0) <= 0);

  const avgProfit = winningTradesData.length > 0
    ? winningTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / winningTradesData.length
    : 0;
  const avgLoss = losingTradesData.length > 0
    ? losingTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / losingTradesData.length
    : 0;

  const grossProfit = winningTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
  const grossLoss = Math.abs(losingTradesData.reduce((sum, t) => sum + (t.profitPercent || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  let peak = 0;
  let maxDrawdown = 0;
  let equity = 100;

  for (const trade of trades) {
    equity *= (1 + (trade.profitPercent || 0) / 100);
    if (equity > peak) peak = equity;
    const drawdown = (peak - equity) / peak * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const returns = trades.map(t => t.profitPercent || 0);
  const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  return {
    symbol,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: parseFloat(winRate.toFixed(1)),
    totalReturn: parseFloat(totalReturn.toFixed(1)),
    avgProfit: parseFloat(avgProfit.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    trades: [...trades].reverse(),
    startDate: data[0]?.date || '',
    endDate: data[data.length - 1]?.date || '',
  };
}
