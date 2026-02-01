/**
 * Optimized Backtest Engine
 * 
 * O(N) optimized simulation engine for fast backtesting
 * with pre-calculated indicators and efficient trade simulation.
 */

import { OHLCV, BacktestResult, BacktestTrade, Signal } from '../types';
import { calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateATR } from './utils';

export interface BacktestConfig {
  minDataPeriod: number;
  minSignalConfidence: number;
  bullTakeProfit: number;
  bullStopLoss: number;
  bearTakeProfit: number;
  bearStopLoss: number;
  optimizationInterval: number;
}

export interface PreCalculatedIndicators {
  sma: Map<number, number[]>;
  rsi: Map<number, number[]>;
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bollingerBands: { upper: number[]; middle: number[]; lower: number[] };
  atr: number[];
  ema: Map<number, number[]>;
}

export interface SimulationResult {
  won: boolean;
  directionalHit: boolean;
  exitPrice: number;
  exitReason: string;
  barsHeld: number;
}

// Default configuration
const DEFAULT_CONFIG: BacktestConfig = {
  minDataPeriod: 50,
  minSignalConfidence: 60,
  bullTakeProfit: 0.05, // 5%
  bullStopLoss: -0.03, // -3%
  bearTakeProfit: 0.05, // 5%
  bearStopLoss: 0.03, // 3%
  optimizationInterval: 30
};

class OptimizedBacktestEngine {
  /**
   * Pre-calculate all indicators for the entire dataset (O(N))
   */
  preCalculateIndicators(data: OHLCV[]): PreCalculatedIndicators {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Pre-calculate SMAs for multiple periods
    const sma = new Map<number, number[]>();
    const smaPeriods = [5, 10, 20, 50];
    for (const period of smaPeriods) {
      sma.set(period, calculateSMA(closes, period));
    }

    // Pre-calculate RSIs for multiple periods
    const rsi = new Map<number, number[]>();
    const rsiPeriods = [14, 21, 30];
    for (const period of rsiPeriods) {
      rsi.set(period, calculateRSI(closes, period));
    }

    // Pre-calculate EMAs for multiple periods
    const ema = new Map<number, number[]>();
    const emaPeriods = [12, 26];
    for (const period of emaPeriods) {
      ema.set(period, this.calculateEMA(closes, period));
    }

    // Pre-calculate MACD
    const macd = calculateMACD(closes);

    // Pre-calculate Bollinger Bands
    const bollingerBands = calculateBollingerBands(closes);

    // Pre-calculate ATR using optimized batch method
    const atr = this.calculateBatchATR(highs, lows, closes, 14);

    return {
      sma,
      rsi,
      macd,
      bollingerBands,
      atr,
      ema
    };
  }

  /**
   * Optimized EMA calculation
   */
  private calculateEMA(prices: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        ema = prices[0];
      } else {
        ema = (prices[i] - ema) * multiplier + ema;
      }
      result.push(ema);
    }

    return result;
  }

  /**
   * Optimized batch ATR calculation (O(N))
   */
  private calculateBatchATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number[] {
    const results: number[] = new Array(highs.length).fill(0);
    const trueRange: number[] = new Array(highs.length).fill(0);

    // Calculate True Range for each bar
    for (let i = 0; i < highs.length; i++) {
      if (i === 0) {
        trueRange[i] = highs[i] - lows[i];
      } else {
        const highLowRange = highs[i] - lows[i];
        const highCloseGap = Math.abs(highs[i] - closes[i - 1]);
        const lowCloseGap = Math.abs(lows[i] - closes[i - 1]);
        trueRange[i] = Math.max(highLowRange, highCloseGap, lowCloseGap);
      }
    }

    // Calculate ATR using moving average
    let sum = 0;
    for (let i = 0; i < trueRange.length; i++) {
      if (i < period) {
        sum += trueRange[i];
        results[i] = 0;
      } else if (i === period) {
        sum += trueRange[i];
        results[i] = sum / period;
      } else {
        // Use exponential smoothing for ATR
        results[i] = (results[i - 1] * (period - 1) + trueRange[i]) / period;
      }
    }

    return results;
  }

  /**
   * Optimized trade simulation (O(1) per trade)
   */
  simulateTrade(
    data: OHLCV[],
    startIndex: number,
    type: 'BUY' | 'SELL',
    entryPrice: number,
    config: BacktestConfig
  ): SimulationResult {
    const maxBars = Math.min(startIndex + 20, data.length - 1);
    const takeProfit = type === 'BUY'
      ? entryPrice * (1 + config.bullTakeProfit)
      : entryPrice * (1 - config.bearTakeProfit);
    const stopLoss = type === 'BUY'
      ? entryPrice * (1 + config.bullStopLoss)
      : entryPrice * (1 - config.bearStopLoss);

    for (let i = startIndex + 1; i <= maxBars; i++) {
      const candle = data[i];

      if (type === 'BUY') {
        if (candle.low <= stopLoss) {
          return {
            won: false,
            directionalHit: candle.close > entryPrice,
            exitPrice: stopLoss,
            exitReason: 'Stop Loss',
            barsHeld: i - startIndex
          };
        }
        if (candle.high >= takeProfit) {
          return {
            won: true,
            directionalHit: true,
            exitPrice: takeProfit,
            exitReason: 'Take Profit',
            barsHeld: i - startIndex
          };
        }
      } else {
        if (candle.high >= stopLoss) {
          return {
            won: false,
            directionalHit: candle.close < entryPrice,
            exitPrice: stopLoss,
            exitReason: 'Stop Loss',
            barsHeld: i - startIndex
          };
        }
        if (candle.low <= takeProfit) {
          return {
            won: true,
            directionalHit: true,
            exitPrice: takeProfit,
            exitReason: 'Take Profit',
            barsHeld: i - startIndex
          };
        }
      }
    }

    // Exit at end of period
    const finalPrice = data[maxBars].close;
    return {
      won: type === 'BUY' ? finalPrice > entryPrice : finalPrice < entryPrice,
      directionalHit: type === 'BUY' ? finalPrice > entryPrice : finalPrice < entryPrice,
      exitPrice: finalPrice,
      exitReason: 'Time Exit',
      barsHeld: maxBars - startIndex
    };
  }

  /**
   * Generate signal from pre-calculated indicators
   */
  generateSignal(
    data: OHLCV[],
    index: number,
    indicators: PreCalculatedIndicators,
    config: BacktestConfig
  ): Signal | null {
    if (index < config.minDataPeriod) return null;

    const currentPrice = data[index].close;
    const atr = indicators.atr[index] || (currentPrice * 0.02);

    // Get indicator values at current index
    const rsi14 = indicators.rsi.get(14)?.[index] || 50;
    const sma20 = indicators.sma.get(20)?.[index] || currentPrice;
    const sma50 = indicators.sma.get(50)?.[index] || currentPrice;
    const macdLine = indicators.macd.macd[index] || 0;
    const macdSignal = indicators.macd.signal[index] || 0;
    const bbUpper = indicators.bollingerBands.upper[index] || currentPrice;
    const bbLower = indicators.bollingerBands.lower[index] || currentPrice;

    // Calculate signal strength
    let strength = 0;

    // RSI signal
    if (rsi14 < 30) strength += 2;
    else if (rsi14 < 40) strength += 1;
    else if (rsi14 > 70) strength -= 2;
    else if (rsi14 > 60) strength -= 1;

    // SMA trend
    if (sma20 > sma50) strength += 1;
    else if (sma20 < sma50) strength -= 1;

    // MACD signal
    if (macdLine > macdSignal) strength += 1;
    else if (macdLine < macdSignal) strength -= 1;

    // Bollinger Bands position
    if (currentPrice < bbLower) strength += 1;
    else if (currentPrice > bbUpper) strength -= 1;

    // Determine signal type
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;

    if (strength >= 3) {
      type = 'BUY';
      confidence = 60 + strength * 5;
    } else if (strength <= -3) {
      type = 'SELL';
      confidence = 60 + Math.abs(strength) * 5;
    }

    confidence = Math.min(95, Math.max(50, confidence));

    if (confidence < config.minSignalConfidence) {
      type = 'HOLD';
    }

    // Calculate target and stop loss
    const priceMove = atr * 1.5;
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type === 'BUY') {
      targetPrice = currentPrice + priceMove;
      stopLoss = currentPrice - priceMove / 2;
    } else if (type === 'SELL') {
      targetPrice = currentPrice - priceMove;
      stopLoss = currentPrice + priceMove / 2;
    }

    return {
      symbol: data[0].symbol,
      type,
      confidence,
      accuracy: 0,
      atr,
      targetPrice,
      stopLoss,
      reason: `RSI: ${rsi14.toFixed(1)}, SMA20: ${sma20.toFixed(2)}, MACD: ${(macdLine - macdSignal).toFixed(4)}`,
      predictedChange: type === 'BUY' ? priceMove / currentPrice * 100 : type === 'SELL' ? -priceMove / currentPrice * 100 : 0,
      predictionDate: data[index].date,
      marketContext: undefined,
      optimizedParams: { rsiPeriod: 14, smaPeriod: 20 },
      predictionError: 1.0,
      volumeResistance: []
    };
  }

  /**
   * Run optimized backtest (O(N))
   */
  runBacktest(
    symbol: string,
    data: OHLCV[],
    config: BacktestConfig = DEFAULT_CONFIG
  ): BacktestResult {
    if (data.length < config.minDataPeriod) {
      return this.getEmptyResult(symbol, data);
    }

    const trades: BacktestTrade[] = [];
    let currentPosition: { type: 'BUY' | 'SELL', price: number, date: string, index: number } | null = null;

    // Pre-calculate all indicators once
    const indicators = this.preCalculateIndicators(data);

    // Walk-forward optimization cache
    let cachedParams: { rsiPeriod: number; smaPeriod: number } | undefined;
    let lastOptimizationIndex = -config.optimizationInterval;

    for (let i = config.minDataPeriod; i < data.length - 1; i++) {
      const nextDay = data[i + 1];

      // Check if we need to re-optimize
      const shouldReoptimize = i - lastOptimizationIndex >= config.optimizationInterval;

      // Generate signal
      const signal = this.generateSignal(data, i, indicators, config);

      if (!signal || signal.type === 'HOLD') {
        // Check if we should exit current position
        if (currentPosition) {
          const exitReason = this.checkExitCondition(currentPosition, signal, data, i, config);
          if (exitReason) {
            trades.push(this.createTrade(currentPosition, nextDay, exitReason));
            currentPosition = null;
          }
        }
        continue;
      }

      // Enter new position
      if (!currentPosition && signal.confidence >= config.minSignalConfidence) {
        currentPosition = {
          type: signal.type,
          price: nextDay.open,
          date: nextDay.date,
          index: i + 1
        };
        lastOptimizationIndex = i;
      }
      // Exit current position
      else if (currentPosition) {
        const exitReason = this.checkExitCondition(currentPosition, signal, data, i, config);
        if (exitReason) {
          trades.push(this.createTrade(currentPosition, nextDay, exitReason));
          currentPosition = null;
        }
      }
    }

    return this.calculateStats(trades, symbol, data[0].date, data[data.length - 1].date);
  }

  /**
   * Check if we should exit current position
   */
  private checkExitCondition(
    position: { type: 'BUY' | 'SELL', price: number, date: string, index: number },
    signal: Signal | null,
    data: OHLCV[],
    currentIndex: number,
    config: BacktestConfig
  ): string | null {
    const currentPrice = data[currentIndex].close;
    const change = (currentPrice - position.price) / position.price;

    if (position.type === 'BUY') {
      if (signal && signal.type === 'SELL') return 'Signal Reversal';
      if (change > config.bullTakeProfit) return `Take Profit (+${(config.bullTakeProfit * 100).toFixed(1)}%)`;
      if (change < config.bullStopLoss) return `Stop Loss (${(config.bullStopLoss * 100).toFixed(1)}%)`;
    } else {
      if (signal && signal.type === 'BUY') return 'Signal Reversal';
      if (change < -config.bearTakeProfit) return `Take Profit (+${(config.bearTakeProfit * 100).toFixed(1)}%)`;
      if (change > config.bearStopLoss) return `Stop Loss (${(config.bearStopLoss * 100).toFixed(1)}%)`;
    }

    return null;
  }

  /**
   * Create trade object
   */
  private createTrade(
    position: { type: 'BUY' | 'SELL', price: number, date: string, index: number },
    exitDay: OHLCV,
    reason: string
  ): BacktestTrade {
    const profitPercent = position.type === 'BUY'
      ? (exitDay.close - position.price) / position.price * 100
      : (position.price - exitDay.close) / position.price * 100;

    return {
      symbol: '',
      type: position.type,
      entryPrice: position.price,
      exitPrice: exitDay.close,
      entryDate: position.date,
      exitDate: exitDay.date,
      profitPercent,
      reason
    };
  }

  /**
   * Calculate backtest statistics
   */
  private calculateStats(
    trades: BacktestTrade[],
    symbol: string,
    startDate: string,
    endDate: string
  ): BacktestResult {
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

    // Max Drawdown calculation
    let peak = 0;
    let maxDrawdown = 0;
    let equity = 100;

    for (const trade of trades) {
      equity *= (1 + (trade.profitPercent || 0) / 100);
      if (equity > peak) peak = equity;
      const drawdown = (peak - equity) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Simplified Sharpe Ratio calculation
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
      startDate,
      endDate
    };
  }

  /**
   * Get empty result
   */
  private getEmptyResult(symbol: string, data: OHLCV[]): BacktestResult {
    const startDate = data[0]?.date || new Date().toISOString();
    const endDate = data[data.length - 1]?.date || new Date().toISOString();

    return {
      symbol,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalReturn: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      trades: [],
      startDate,
      endDate
    };
  }
}

export const optimizedBacktestEngine = new OptimizedBacktestEngine();
export { DEFAULT_CONFIG };
