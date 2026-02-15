/**
 * Strategy Catalog
.ts
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
  MLAlphaStrategyParams,
  StrategyParameterValue
} from './types';
import { isString, isStringArray } from './types';
import { TRADING_DAYS, RISK_FREE_RATE, BACKTEST } from '../constants/trading';

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
    
    // Calculate volatility
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * TRADING_DAYS.PER_YEAR) * 100;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    // Risk-adjusted returns
    const sharpeRatio = volatility > 0 ? (annualizedReturn - RISK_FREE_RATE.ANNUAL * 100) / volatility : 0;
    const sortinoRatio = this.calculateSortinoRatio(returns, RISK_FREE_RATE.DAILY);
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
      timestamp: currentData.date,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue> {
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
      timestamp: currentData.date,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue> {
    return {
      bollingerPeriod: Math.floor(15 + Math.random() * 15), // 15-30
      bollingerStdDev: 1.5 + Math.random() * 1, // 1.5-2.5
      rsiPeriod: Math.floor(10 + Math.random() * 10), // 10-20
      rsiOversold: 25 + Math.random() * 10, // 25-35
      rsiOverbought: 65 + Math.random() * 10 // 65-75
    };
  }
}

// ============================================================================
// Breakout Strategy
// ============================================================================

export class BreakoutStrategy extends BaseStrategy {
  constructor(params: Partial<BreakoutStrategyParams> = {}) {
    super({
      name: 'Breakout Strategy',
      type: 'breakout',
      description: 'Breakout strategy using price action and volume',
      parameters: {
        breakoutPeriod: 20,
        volumeConfirmation: true,
        volumeThreshold: 1.5,
        atrMultiplier: 2.0,
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
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);
    const period = this.config.parameters.breakoutPeriod as number;
    
    const atr = this.calculateATR(data, 14);
    const avgVolume = this.calculateSMA(volumes, period);
    
    // Calculate resistance and support levels
    const resistance: number[] = [];
    const support: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        resistance.push(NaN);
        support.push(NaN);
      } else {
        const recentHighs = highs.slice(i - period, i);
        const recentLows = lows.slice(i - period, i);
        resistance.push(Math.max(...recentHighs));
        support.push(Math.min(...recentLows));
      }
    }
    
    return { closes, highs, lows, volumes, atr, avgVolume, resistance, support };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const currentVolume = currentData.volume;
    const resistance = indicators.resistance[lastIndex];
    const support = indicators.support[lastIndex];
    const atr = indicators.atr[lastIndex];
    const avgVolume = indicators.avgVolume[lastIndex];
    
    const volumeConfirmation = this.config.parameters.volumeConfirmation as boolean;
    const volumeThreshold = this.config.parameters.volumeThreshold as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(resistance) && !isNaN(support) && !isNaN(atr)) {
      const volumeConfirmed = !volumeConfirmation || 
        (currentVolume > avgVolume * volumeThreshold);
      
      // Upward breakout
      if (currentPrice > resistance && volumeConfirmed) {
        const breakoutStrength = (currentPrice - resistance) / atr;
        signal = 'BUY';
        strength = Math.min(1, breakoutStrength);
        confidence = volumeConfirmed ? 0.8 : 0.6;
        reason = `Upward breakout above resistance ${resistance.toFixed(2)}${volumeConfirmed ? ' with volume confirmation' : ''}`;
      }
      // Downward breakout (or breakdown)
      else if (currentPrice < support && volumeConfirmed) {
        const breakoutStrength = (support - currentPrice) / atr;
        signal = 'SELL';
        strength = Math.min(1, breakoutStrength);
        confidence = volumeConfirmed ? 0.8 : 0.6;
        reason = `Downward breakout below support ${support.toFixed(2)}${volumeConfirmed ? ' with volume confirmation' : ''}`;
      }
    }
    
    return {
      timestamp: currentData.date,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue> {
    return {
      breakoutPeriod: Math.floor(10 + Math.random() * 30), // 10-40
      volumeConfirmation: Math.random() > 0.3, // 70% true
      volumeThreshold: 1.2 + Math.random() * 0.8, // 1.2-2.0
      atrMultiplier: 1.5 + Math.random() * 1.0 // 1.5-2.5
    };
  }
}

// ============================================================================
// Statistical Arbitrage Strategy (Simplified Pairs Trading)
// ============================================================================

export class StatArbStrategy extends BaseStrategy {
  constructor(params: Partial<StatArbStrategyParams> = {}) {
    super({
      name: 'Statistical Arbitrage Strategy',
      type: 'stat_arb',
      description: 'Statistical arbitrage based on mean reversion of spread',
      parameters: {
        pairSymbol: 'SPY', // Example pair
        lookbackPeriod: 30,
        entryZScore: 2.0,
        exitZScore: 0.5,
        hedgeRatio: 1.0,
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
    const period = this.config.parameters.lookbackPeriod as number;
    const hedgeRatio = this.config.parameters.hedgeRatio as number;
    
    // Simplified: assume we have pair prices (in real implementation, fetch pair data)
    // For now, create synthetic pair prices
    const pairPrices = closes.map(c => c * (0.95 + Math.random() * 0.1));
    
    // Calculate spread
    const spread: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      spread.push(closes[i] - hedgeRatio * pairPrices[i]);
    }
    
    // Calculate z-score of spread
    const zScore: number[] = [];
    for (let i = 0; i < spread.length; i++) {
      if (i < period) {
        zScore.push(NaN);
      } else {
        const recentSpread = spread.slice(i - period, i + 1);
        const mean = recentSpread.reduce((sum, s) => sum + s, 0) / recentSpread.length;
        const variance = recentSpread.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / recentSpread.length;
        const std = Math.sqrt(variance);
        
        if (std === 0) {
          zScore.push(0);
        } else {
          zScore.push((spread[i] - mean) / std);
        }
      }
    }
    
    return { closes, pairPrices, spread, zScore };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const zScore = indicators.zScore[lastIndex];
    const entryZScore = this.config.parameters.entryZScore as number;
    const exitZScore = this.config.parameters.exitZScore as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(zScore)) {
      // Spread too wide (negative z-score): buy the spread
      if (zScore < -entryZScore) {
        signal = 'BUY';
        strength = Math.min(1, Math.abs(zScore) / (entryZScore * 2));
        confidence = 0.75;
        reason = `Spread z-score ${zScore.toFixed(2)} below -${entryZScore}, mean reversion expected`;
      }
      // Spread too narrow (positive z-score): sell the spread
      else if (zScore > entryZScore) {
        signal = 'SELL';
        strength = Math.min(1, zScore / (entryZScore * 2));
        confidence = 0.75;
        reason = `Spread z-score ${zScore.toFixed(2)} above ${entryZScore}, mean reversion expected`;
      }
      // Exit when spread normalizes
      else if (Math.abs(zScore) < exitZScore) {
        signal = 'SELL'; // Close position
        strength = 0.5;
        confidence = 0.7;
        reason = `Spread normalized (z-score ${zScore.toFixed(2)}), taking profit`;
      }
    }
    
    return {
      timestamp: currentData.date,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue> {
    const pairSymbol = isString(originalParams.pairSymbol) 
      ? originalParams.pairSymbol 
      : 'SPY';
    return {
      pairSymbol,
      lookbackPeriod: Math.floor(20 + Math.random() * 40), // 20-60
      entryZScore: 1.5 + Math.random() * 1.0, // 1.5-2.5
      exitZScore: 0.3 + Math.random() * 0.5, // 0.3-0.8
      hedgeRatio: 0.8 + Math.random() * 0.4 // 0.8-1.2
    };
  }
}

// ============================================================================
// Market Making Strategy (Simplified)
// ============================================================================

export class MarketMakingStrategy extends BaseStrategy {
  constructor(params: Partial<MarketMakingStrategyParams> = {}) {
    super({
      name: 'Market Making Strategy',
      type: 'market_making',
      description: 'Provides liquidity by quoting bid-ask spreads',
      parameters: {
        spreadBps: 10, // 10 basis points
        inventoryLimit: 1000,
        skewFactor: 0.1,
        minOrderSize: 100,
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
    const volumes = data.map(d => d.volume);
    
    const volatility = this.calculateRollingVolatility(closes, 20);
    const avgVolume = this.calculateSMA(volumes, 20);
    
    return { closes, volumes, volatility, avgVolume };
  }

  private calculateRollingVolatility(prices: number[], period: number): number[] {
    const volatility: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        volatility.push(NaN);
      } else {
        const returns = [];
        for (let j = i - period + 1; j <= i; j++) {
          returns.push((prices[j] - prices[j - 1]) / prices[j - 1]);
        }
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        volatility.push(Math.sqrt(variance));
      }
    }
    
    return volatility;
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const currentPrice = currentData.close;
    const volatility = indicators.volatility[lastIndex];
    const spreadBps = this.config.parameters.spreadBps as number;
    const skewFactor = this.config.parameters.skewFactor as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const strength = 0.5; // Market making is neutral
    const confidence = 0.6;
    let reason = '';
    
    if (!isNaN(volatility)) {
      // Adjust spread based on volatility
      const adjustedSpread = spreadBps * (1 + volatility * 10);
      const bidPrice = currentPrice * (1 - adjustedSpread / 10000);
      const askPrice = currentPrice * (1 + adjustedSpread / 10000);
      
      // Simplified: alternate between buying and selling to provide liquidity
      // In real implementation, would manage inventory and adjust quotes
      const shouldBuy = Math.random() > 0.5;
      
      if (shouldBuy) {
        signal = 'BUY';
        reason = `Market making: bid at ${bidPrice.toFixed(2)} (spread: ${adjustedSpread.toFixed(1)}bps)`;
      } else {
        signal = 'SELL';
        reason = `Market making: ask at ${askPrice.toFixed(2)} (spread: ${adjustedSpread.toFixed(1)}bps)`;
      }
    }
    
    return {
      timestamp: currentData.date,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue> {
    return {
      spreadBps: 5 + Math.random() * 15, // 5-20 bps
      inventoryLimit: 500 + Math.random() * 1000, // 500-1500
      skewFactor: 0.05 + Math.random() * 0.15, // 0.05-0.2
      minOrderSize: 50 + Math.random() * 100 // 50-150
    };
  }
}

// ============================================================================
// ML-Based Alpha Strategy (Simplified)
// ============================================================================

export class MLAlphaStrategy extends BaseStrategy {
  constructor(params: Partial<MLAlphaStrategyParams> = {}) {
    super({
      name: 'ML-Based Alpha Strategy',
      type: 'ml_alpha',
      description: 'Machine learning-based alpha generation',
      parameters: {
        model: 'gradient_boosting',
        features: ['price_momentum', 'volume_trend', 'volatility', 'rsi', 'macd'],
        lookbackPeriod: 30,
        retrainFrequency: 30,
        predictionThreshold: 0.6,
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
    const volumes = data.map(d => d.volume);
    const lookback = this.config.parameters.lookbackPeriod as number;
    
    // Calculate features
    const priceMomentum: number[] = [];
    const volumeTrend: number[] = [];
    const volatility: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < lookback) {
        priceMomentum.push(NaN);
        volumeTrend.push(NaN);
        volatility.push(NaN);
      } else {
        // Price momentum
        const priceChange = (closes[i] - closes[i - lookback]) / closes[i - lookback];
        priceMomentum.push(priceChange);
        
        // Volume trend
        const recentVolume = volumes.slice(i - lookback, i + 1);
        const volumeChange = (volumes[i] - recentVolume.reduce((sum, v) => sum + v, 0) / recentVolume.length) / volumes[i];
        volumeTrend.push(volumeChange);
        
        // Volatility
        const returns = [];
        for (let j = i - lookback + 1; j <= i; j++) {
          returns.push((closes[j] - closes[j - 1]) / closes[j - 1]);
        }
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        volatility.push(Math.sqrt(variance));
      }
    }
    
    const rsi = this.calculateRSI(closes, 14);
    
    return { closes, priceMomentum, volumeTrend, volatility, rsi };
  }

  async generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal> {
    const indicators = await this.calculateIndicators(historicalData);
    const lastIndex = indicators.closes.length - 1;
    
    const priceMomentum = indicators.priceMomentum[lastIndex];
    const volumeTrend = indicators.volumeTrend[lastIndex];
    const volatility = indicators.volatility[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    const predictionThreshold = this.config.parameters.predictionThreshold as number;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;
    let confidence = 0;
    let reason = '';
    
    if (!isNaN(priceMomentum) && !isNaN(volumeTrend) && !isNaN(volatility) && !isNaN(rsi)) {
      // Simplified ML prediction: weighted combination of features
      const prediction = 
        0.4 * Math.tanh(priceMomentum * 10) +
        0.2 * Math.tanh(volumeTrend * 10) +
        0.2 * (50 - rsi) / 50 +
        0.2 * (1 - Math.min(volatility * 100, 1));
      
      if (prediction > predictionThreshold) {
        signal = 'BUY';
        strength = Math.min(1, (prediction - predictionThreshold) / (1 - predictionThreshold));
        confidence = 0.65 + strength * 0.15;
        reason = `ML prediction: ${(prediction * 100).toFixed(1)}% bullish (momentum: ${(priceMomentum * 100).toFixed(1)}%)`;
      } else if (prediction < -predictionThreshold) {
        signal = 'SELL';
        strength = Math.min(1, (Math.abs(prediction) - predictionThreshold) / (1 - predictionThreshold));
        confidence = 0.65 + strength * 0.15;
        reason = `ML prediction: ${(prediction * 100).toFixed(1)}% bearish (momentum: ${(priceMomentum * 100).toFixed(1)}%)`;
      }
    }
    
    return {
      timestamp: currentData.date,
      signal,
      strength,
      confidence,
      reason
    };
  }

  protected randomizeParameters(originalParams: Record<string, StrategyParameterValue>): Record<string, StrategyParameterValue> {
    const model = isString(originalParams.model) 
      ? originalParams.model 
      : 'gradient_boosting';
    const features = isStringArray(originalParams.features)
      ? originalParams.features
      : ['price_momentum', 'volume_trend', 'volatility', 'rsi', 'macd'];
    return {
      model,
      features,
      lookbackPeriod: Math.floor(20 + Math.random() * 30), // 20-50
      retrainFrequency: Math.floor(20 + Math.random() * 40), // 20-60
      predictionThreshold: 0.5 + Math.random() * 0.3 // 0.5-0.8
    };
  }
}

// Export catalog
export const StrategyCatalog = {
  momentum: MomentumStrategy,
  meanReversion: MeanReversionStrategy,
  breakout: BreakoutStrategy,
  statArb: StatArbStrategy,
  marketMaking: MarketMakingStrategy,
  mlAlpha: MLAlphaStrategy,
};

export default StrategyCatalog;
