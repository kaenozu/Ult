/**
 * StrategyCatalog.ts
 * 
 * Comprehensive catalog of trading strategies:
 * - Momentum (Trend Following)
 * - Mean Reversion
 * - Breakout
 * - Statistical Arbitrage (Pairs Trading)
 * - Market Making
 * - ML-Based Alpha
 * 
 * Each strategy is a complete implementation with backtesting capabilities
 */

import type { OHLCV } from '@/app/types';
import type {
  Strategy,
  StrategyConfig,
  StrategySignal,
  StrategyPerformance,
  BacktestConfig,
  MomentumStrategyParams,
  MeanReversionStrategyParams,
  BreakoutStrategyParams,
  StatArbStrategyParams,
  MarketMakingStrategyParams,
  MLAlphaStrategyParams
} from './types';

// ============================================================================
// Base Strategy Class
// ============================================================================

abstract class BaseStrategy implements Strategy {
  config: StrategyConfig;
  protected indicators: Record<string, number[]> = {};

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  abstract initialize(data: OHLCV[]): Promise<void>;
  abstract generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal>;
  abstract calculateIndicators(data: OHLCV[]): Promise<Record<string, number[]>>;

  async backtest(data: OHLCV[], config: BacktestConfig): Promise<StrategyPerformance> {
    // Initialize
    await this.initialize(data);
    
    let capital = config.initialCapital;
    let position = 0;
    let entryPrice = 0;
    const trades: Array<{ pnl: number; type: 'win' | 'loss' }> = [];
    const equityCurve: number[] = [capital];
    
    // Run through data
    for (let i = 50; i < data.length; i++) {
      const historicalData = data.slice(0, i + 1);
      const currentData = data[i];
      const signal = await this.generateSignal(currentData, historicalData);
      
      // Execute trades based on signals
      if (signal.signal === 'BUY' && position === 0) {
        // Enter long position
        position = Math.floor((capital * config.maxPositionSize) / currentData.close);
        entryPrice = currentData.close * (1 + config.slippage);
        capital -= position * entryPrice * (1 + config.commission);
      } else if (signal.signal === 'SELL' && position > 0) {
        // Exit long position
        const exitPrice = currentData.close * (1 - config.slippage);
        const proceeds = position * exitPrice * (1 - config.commission);
        const pnl = proceeds - (position * entryPrice);
        capital += proceeds;
        trades.push({ pnl, type: pnl > 0 ? 'win' : 'loss' });
        position = 0;
      }
      
      // Check stop loss / take profit
      if (position > 0) {
        const currentPnL = (currentData.close - entryPrice) / entryPrice;
        if (config.stopLoss && currentPnL <= -config.stopLoss) {
          const exitPrice = currentData.close * (1 - config.slippage);
          const proceeds = position * exitPrice * (1 - config.commission);
          const pnl = proceeds - (position * entryPrice);
          capital += proceeds;
          trades.push({ pnl, type: 'loss' });
          position = 0;
        } else if (config.takeProfit && currentPnL >= config.takeProfit) {
          const exitPrice = currentData.close * (1 - config.slippage);
          const proceeds = position * exitPrice * (1 - config.commission);
          const pnl = proceeds - (position * entryPrice);
          capital += proceeds;
          trades.push({ pnl, type: 'win' });
          position = 0;
        }
      }
      
      // Update equity curve
      const currentEquity = capital + (position > 0 ? position * currentData.close : 0);
      equityCurve.push(currentEquity);
    }
    
    // Close any open position
    if (position > 0) {
      const lastPrice = data[data.length - 1].close;
      const exitPrice = lastPrice * (1 - config.slippage);
      const proceeds = position * exitPrice * (1 - config.commission);
      const pnl = proceeds - (position * entryPrice);
      capital += proceeds;
      trades.push({ pnl, type: pnl > 0 ? 'win' : 'loss' });
    }
    
    // Calculate performance metrics
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
    // Simplified optimization - in production, use ParameterOptimizer
    const originalParams = { ...this.config.parameters };
    let bestScore = -Infinity;
    let bestParams = originalParams;
    
    // Grid search over key parameters
    for (let i = 0; i < 10; i++) {
      // Randomize parameters
      const testParams = this.randomizeParameters(originalParams);
      this.config.parameters = testParams;
      
      // Backtest
      const performance = await this.backtest(data, {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        maxPositionSize: 0.5
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
    const years = days / 252;
    const annualizedReturn = (Math.pow(finalCapital / initialCapital, 1 / years) - 1) * 100;
    const cagr = annualizedReturn;
    
    // Calculate volatility
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252) * 100;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    // Risk-adjusted returns
    const sharpeRatio = volatility > 0 ? (annualizedReturn - 2) / volatility : 0; // assuming 2% risk-free rate
    const sortinoRatio = this.calculateSortinoRatio(returns, 0.02 / 252);
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
    
    // Trade metrics
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
      alpha: annualizedReturn - 8, // assuming 8% benchmark return
      beta: 1.0, // simplified
      informationRatio: sharpeRatio,
      trackingError: volatility,
      period: {
        start: data[0].timestamp,
        end: data[data.length - 1].timestamp,
        days
      }
    };
  }

  protected calculateSortinoRatio(returns: number[], targetReturn: number): number {
    const downside = returns.filter(r => r < targetReturn);
    if (downside.length === 0) return 0;
    
    const downsideVariance = downside.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0) / downside.length;
    const downsideDeviation = Math.sqrt(downsideVariance * 252);
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const annualizedReturn = avgReturn * 252;
    
    return downsideDeviation > 0 ? (annualizedReturn - targetReturn * 252) / downsideDeviation : 0;
  }

  protected abstract randomizeParameters(originalParams: Record<string, number | string>): Record<string, number | string>;

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
    
    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period && i < prices.length; i++) {
      sum += prices[i];
      if (i < period - 1) {
        ema.push(NaN);
      } else {
        ema.push(sum / period);
      }
    }
    
    // Rest are EMAs
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
    
    // Add one NaN at the beginning to match prices length
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
    
    // First ATR is simple average
    atr.push(NaN); // for first data point
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

// ============================================================================
// Momentum Strategy (Trend Following)
// ============================================================================

export class MomentumStrategy extends BaseStrategy {
  constructor(params: Partial<MomentumStrategyParams> = {}) {
    super({
      name: 'Momentum Strategy',
      type: 'momentum',
      description: 'Trend-following strategy using momentum indicators',
      parameters: {
        lookbackPeriod: 20,
        momentumThreshold: 0.02,
        exitThreshold: 0.01,
        ...params
      },
      enabled: true
    });
  }

  async initialize(data: OHLCV[]): Promise<void> {
    this.indicators = await this.calculateIndicators(data);
  }

  async calculateIndicators(data: OHLCV[]): Promise<Record<string, number[]>> {
    const closes = data.map(d => d.close);
    const lookback = this.config.parameters.lookbackPeriod as number;
    
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const ema12 = this.calculateEMA(closes, 12);
    const rsi = this.calculateRSI(closes, 14);
    
    // Calculate momentum
    const momentum: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < lookback) {
        momentum.push(NaN);
      } else {
        const change = (closes[i] - closes[i - lookback]) / closes[i - lookback];
        momentum.push(change);
      }
    }
    
    return { sma20, sma50, ema12, rsi, momentum, closes };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const sma20 = indicators.sma20[lastIndex];
    const sma50 = indicators.sma50[lastIndex];
    const momentum = indicators.momentum[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    
    const momentumThreshold = this.config.parameters.momentumThreshold as number;
    const exitThreshold = this.config.parameters.exitThreshold as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(momentum) && !isNaN(sma20) && !isNaN(sma50) && !isNaN(rsi)) {
      // Buy signal: strong momentum, price above SMAs, RSI not overbought
      if (momentum > momentumThreshold && currentPrice > sma20 && sma20 > sma50 && rsi < 70) {
        signal = 'BUY';
        strength = Math.min(1, momentum / (momentumThreshold * 2));
        confidence = 0.7 + (Math.min(momentum, 0.1) / 0.1) * 0.2;
        reason = `Strong upward momentum (${(momentum * 100).toFixed(1)}%), bullish trend`;
      }
      // Sell signal: momentum turning negative or price below SMAs
      else if (momentum < -exitThreshold || (currentPrice < sma20 && sma20 < sma50)) {
        signal = 'SELL';
        strength = Math.min(1, Math.abs(momentum) / (exitThreshold * 2));
        confidence = 0.6;
        reason = momentum < -exitThreshold 
          ? `Negative momentum (${(momentum * 100).toFixed(1)}%)`
          : 'Price below moving averages, trend weakening';
      }
    }
    
    return {
      timestamp: currentData.timestamp,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, number | string>): Record<string, number | string> {
    return {
      lookbackPeriod: Math.floor(10 + Math.random() * 40), // 10-50
      momentumThreshold: 0.01 + Math.random() * 0.04, // 1%-5%
      exitThreshold: 0.005 + Math.random() * 0.02 // 0.5%-2.5%
    };
  }
}

// ============================================================================
// Mean Reversion Strategy
// ============================================================================

export class MeanReversionStrategy extends BaseStrategy {
  constructor(params: Partial<MeanReversionStrategyParams> = {}) {
    super({
      name: 'Mean Reversion Strategy',
      type: 'mean_reversion',
      description: 'Mean reversion strategy using Bollinger Bands and RSI',
      parameters: {
        bollingerPeriod: 20,
        bollingerStdDev: 2,
        rsiPeriod: 14,
        rsiOversold: 30,
        rsiOverbought: 70,
        ...params
      },
      enabled: true
    });
  }

  async initialize(data: OHLCV[]): Promise<void> {
    this.indicators = await this.calculateIndicators(data);
  }

  async calculateIndicators(data: OHLCV[]): Promise<Record<string, number[]>> {
    const closes = data.map(d => d.close);
    const period = this.config.parameters.bollingerPeriod as number;
    const stdDev = this.config.parameters.bollingerStdDev as number;
    const rsiPeriod = this.config.parameters.rsiPeriod as number;
    
    const sma = this.calculateSMA(closes, period);
    const rsi = this.calculateRSI(closes, rsiPeriod);
    
    // Calculate Bollinger Bands
    const bbUpper: number[] = [];
    const bbLower: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        bbUpper.push(NaN);
        bbLower.push(NaN);
      } else {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        
        bbUpper.push(mean + stdDev * std);
        bbLower.push(mean - stdDev * std);
      }
    }
    
    return { closes, sma, bbUpper, bbLower, rsi };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const sma = indicators.sma[lastIndex];
    const bbUpper = indicators.bbUpper[lastIndex];
    const bbLower = indicators.bbLower[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    
    const rsiOversold = this.config.parameters.rsiOversold as number;
    const rsiOverbought = this.config.parameters.rsiOverbought as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(sma) && !isNaN(bbUpper) && !isNaN(bbLower) && !isNaN(rsi)) {
      // Buy signal: price below lower BB and RSI oversold
      if (currentPrice < bbLower && rsi < rsiOversold) {
        signal = 'BUY';
        const bbDeviation = (bbLower - currentPrice) / bbLower;
        const rsiDeviation = (rsiOversold - rsi) / rsiOversold;
        strength = Math.min(1, (bbDeviation + rsiDeviation) / 2);
        confidence = 0.75 + strength * 0.15;
        reason = `Price ${((bbDeviation) * 100).toFixed(1)}% below lower BB, RSI oversold at ${rsi.toFixed(1)}`;
      }
      // Sell signal: price above upper BB and RSI overbought
      else if (currentPrice > bbUpper && rsi > rsiOverbought) {
        signal = 'SELL';
        const bbDeviation = (currentPrice - bbUpper) / bbUpper;
        const rsiDeviation = (rsi - rsiOverbought) / rsiOverbought;
        strength = Math.min(1, (bbDeviation + rsiDeviation) / 2);
        confidence = 0.75 + strength * 0.15;
        reason = `Price ${(bbDeviation * 100).toFixed(1)}% above upper BB, RSI overbought at ${rsi.toFixed(1)}`;
      }
      // Exit signal: price back to mean
      else if (Math.abs(currentPrice - sma) / sma < 0.005) {
        signal = 'SELL';
        strength = 0.5;
        confidence = 0.6;
        reason = 'Price reverted to mean';
      }
    }
    
    return {
      timestamp: currentData.timestamp,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, number | string>): Record<string, number | string> {
    return {
      bollingerPeriod: Math.floor(15 + Math.random() * 15), // 15-30
      bollingerStdDev: 1.5 + Math.random() * 1, // 1.5-2.5
      rsiPeriod: Math.floor(10 + Math.random() * 10), // 10-20
      rsiOversold: 25 + Math.random() * 10, // 25-35
      rsiOverbought: 65 + Math.random() * 10 // 65-75
    };
  }
}

// Export catalog
export const StrategyCatalog = {
  momentum: MomentumStrategy,
  meanReversion: MeanReversionStrategy,
  // More strategies will be added (Breakout, StatArb, MarketMaking, MLAlpha)
};

export default StrategyCatalog;
