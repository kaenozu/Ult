/**
 * Base Strategy Class
 * 
 * Abstract base class for all trading strategies with common functionality
 */

import type { OHLCV } from '@/app/types';
import type {
  Strategy,
  StrategyConfig,
  StrategySignal,
  StrategyPerformance,
  BacktestConfig,
  StrategyParameterValue
} from './types';
import { TRADING_DAYS, RISK_FREE_RATE, BACKTEST } from '@/app/constants/trading';

export abstract class BaseStrategy implements Strategy {
  config: StrategyConfig;
  protected indicators: Record<string, number[]> = {};

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  abstract initialize(data: OHLCV[]): Promise<void>;
  abstract generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal>;
  abstract calculateIndicators(data: OHLCV[]): Promise<Record<string, number[]>>;

  async backtest(data: OHLCV[], config: BacktestConfig): Promise<StrategyPerformance> {
    await this.initialize(data);
    
    let capital = config.initialCapital;
    let position = 0;
    let entryPrice = 0;
    const trades: Array<{ pnl: number; type: 'win' | 'loss' }> = [];
    const equityCurve: number[] = [capital];
    
    for (let i = 50; i < data.length; i++) {
      const historicalData = data.slice(0, i + 1);
      const currentData = data[i];
      const signal = await this.generateSignal(currentData, historicalData);
      
      if (signal.signal === 'BUY' && position === 0) {
        position = Math.floor((capital * config.maxPositionSize) / currentData.close);
        entryPrice = currentData.close * (1 + config.slippage);
        capital -= position * entryPrice * (1 + config.commission);
      } else if (signal.signal === 'SELL' && position > 0) {
        const exitPrice = currentData.close * (1 - config.slippage);
        const proceeds = position * exitPrice * (1 + config.commission);
        const pnl = proceeds - (position * entryPrice);
        capital += proceeds;
        trades.push({ pnl, type: pnl > 0 ? 'win' : 'loss' });
        position = 0;
      }
      
      if (position > 0) {
        const currentPnL = (currentData.close - entryPrice) / entryPrice;
        if (config.stopLoss && currentPnL <= -config.stopLoss) {
          const exitPrice = currentData.close * (1 - config.slippage);
          const proceeds = position * exitPrice * (1 + config.commission);
          const pnl = proceeds - (position * entryPrice);
          capital += proceeds;
          trades.push({ pnl, type: 'loss' });
          position = 0;
        } else if (config.takeProfit && currentPnL >= config.takeProfit) {
          const exitPrice = currentData.close * (1 - config.slippage);
          const proceeds = position * exitPrice * (1 + config.commission);
          const pnl = proceeds - (position * entryPrice);
          capital += proceeds;
          trades.push({ pnl, type: 'win' });
          position = 0;
        }
      }
      
      const currentEquity = capital + (position > 0 ? position * currentData.close : 0);
      equityCurve.push(currentEquity);
    }
    
    if (position > 0) {
      const lastPrice = data[data.length - 1].close;
      const exitPrice = lastPrice * (1 - config.slippage);
      const proceeds = position * exitPrice * (1 + config.commission);
      const pnl = proceeds - (position * entryPrice);
      capital += proceeds;
      trades.push({ pnl, type: pnl > 0 ? 'win' : 'loss' });
    }
    
    return this.calculatePerformanceMetrics(
      config.initialCapital,
      capital,
      trades,
      equityCurve,
      data
    );
  }

  async optimize(
    data: OHLCV[],
    objectiveFunction: (perf: StrategyPerformance) => number
  ): Promise<StrategyConfig> {
    const originalParams = { ...this.config.parameters };
    let bestScore = -Infinity;
    let bestParams = originalParams;
    
    for (let i = 0; i < 10; i++) {
      const testParams = this.randomizeParameters(originalParams);
      this.config.parameters = testParams;
      
      const performance = await this.backtest(data, {
        initialCapital: BACKTEST.DEFAULT_INITIAL_CAPITAL,
        commission: BACKTEST.DEFAULT_COMMISSION,
        slippage: BACKTEST.DEFAULT_SLIPPAGE,
        maxPositionSize: BACKTEST.DEFAULT_MAX_POSITION
      });
      
      const score = objectiveFunction(performance);
      if (score > bestScore) {
        bestScore = score;
        bestParams = testParams;
      }
    }
    
    this.config.parameters = bestParams;
    return { ...this.config };
  }

  protected calculatePerformanceMetrics(
    initialCapital: number,
    finalCapital: number,
    trades: Array<{ pnl: number; type: 'win' | 'loss' }>,
    equityCurve: number[],
    data: OHLCV[]
  ): StrategyPerformance {
    const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
    const days = data.length;
    const years = days / TRADING_DAYS.PER_YEAR;
    const annualizedReturn = (Math.pow(finalCapital / initialCapital, 1 / years) - 1) * 100;
    const cagr = annualizedReturn;
    
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * TRADING_DAYS.PER_YEAR) * 100;
    
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    const sharpeRatio = volatility > 0 ? (annualizedReturn - RISK_FREE_RATE.ANNUAL * 100) / volatility : 0;
    const sortinoRatio = this.calculateSortinoRatio(returns, RISK_FREE_RATE.DAILY);
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.type === 'win').length;
    const losingTrades = trades.filter(t => t.type === 'loss').length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const wins = trades.filter(t => t.type === 'win');
    const losses = trades.filter(t => t.type === 'loss');
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades) / (avgLoss * losingTrades) : 0;
    
    return {
      strategyName: this.config.name,
      strategyType: this.config.type,
      totalReturn,
      annualizedReturn,
      cagr,
      volatility,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      totalTrades,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      alpha: annualizedReturn - 8,
      beta: 1.0,
      informationRatio: sharpeRatio,
      trackingError: volatility,
      period: {
        start: data[0].date,
        end: data[data.length - 1].date,
        days
      }
    };
  }

  protected calculateSortinoRatio(returns: number[], targetReturn: number): number {
    const downside = returns.filter(r => r < targetReturn);
    if (downside.length === 0) return 0;
    
    const downsideVariance = downside.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0) / downside.length;
    const downsideDeviation = Math.sqrt(downsideVariance * TRADING_DAYS.PER_YEAR);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const annualizedReturn = avgReturn * TRADING_DAYS.PER_YEAR;
    return downsideDeviation > 0 ? (annualizedReturn - targetReturn * TRADING_DAYS.PER_YEAR) / downsideDeviation : 0;
  }

  protected abstract randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue>;

  protected calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  }

  protected calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    let sum = 0;
    for (let i = 0; i < period && i < prices.length; i++) {
      sum += prices[i];
      if (i < period - 1) {
        ema.push(NaN);
      } else {
        ema.push(sum / period);
      }
    }
    
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(currentEMA);
    }
    
    return ema;
  }

  protected calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = [];
    const changes: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    for (let i = 0; i < changes.length; i++) {
      if (i < period) {
        rsi.push(NaN);
      } else {
        const recentChanges = changes.slice(i - period, i);
        const gains = recentChanges.filter(c => c > 0).reduce((sum, c) => sum + c, 0);
        const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((sum, c) => sum + c, 0));
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsiValue = 100 - (100 / (1 + rs));
        rsi.push(rsiValue);
      }
    }
    
    rsi.unshift(NaN);
    
    return rsi;
  }

  protected calculateATR(data: OHLCV[], period: number): number[] {
    const atr: number[] = [];
    const trueRanges: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    atr.push(NaN);
    for (let i = 0; i < trueRanges.length; i++) {
      if (i < period - 1) {
        atr.push(NaN);
      } else if (i === period - 1) {
        const sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
      } else {
        const prevATR = atr[atr.length - 1];
        const currentATR = (prevATR * (period - 1) + trueRanges[i]) / period;
        atr.push(currentATR);
      }
    }
    
    return atr;
  }
}
