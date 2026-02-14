/**
 * AdvancedBacktestEngine.ts
 *
 * 高度なバックテストエンジン。複数の戦略、リスク管理、取引コストを考慮した
 * 包括的なバックテスト機能を提供します。
 */

import { OHLCV } from '@/app/types';
import {
  Trade,
  BacktestConfig,
  BacktestResult,
  PerformanceMetrics,
  Strategy,
  StrategyContext,
  StrategyAction
} from './types';
import { BaseBacktestEngine, DEFAULT_BACKTEST_CONFIG } from './BaseBacktestEngine';
import { SlippageModel } from './SlippageModel';
import { CommissionCalculator } from './CommissionCalculator';
import { PartialFillSimulator } from './PartialFillSimulator';
import { LatencySimulator } from './LatencySimulator';

// Re-export types for backward compatibility
export type { OHLCV, Trade, BacktestConfig, BacktestResult, PerformanceMetrics, Strategy, StrategyContext, StrategyAction };
export { DEFAULT_BACKTEST_CONFIG };

// ============================================================================
// Advanced Backtest Engine
// ============================================================================

export class AdvancedBacktestEngine extends BaseBacktestEngine {
  // Realistic mode components
  protected slippageModel?: SlippageModel;
  protected commissionCalculator?: CommissionCalculator;
  protected partialFillSimulator?: PartialFillSimulator;
  protected latencySimulator?: LatencySimulator;

  constructor(config: Partial<BacktestConfig> = {}) {
    super(config);
    
    // Initialize realistic components if enabled
    if (this.config.realisticMode || this.config.slippageEnabled) {
      this.slippageModel = new SlippageModel({
        baseSlippage: this.config.slippage,
        spread: this.config.spread,
        averageDailyVolume: this.config.averageDailyVolume,
      });
    }
    
    if (this.config.realisticMode || this.config.commissionEnabled) {
      this.commissionCalculator = new CommissionCalculator(
        this.config.market || 'japan'
      );
    }
    
    if (this.config.realisticMode || this.config.partialFillEnabled) {
      this.partialFillSimulator = new PartialFillSimulator();
    }
    
    if (this.config.realisticMode || this.config.latencyEnabled) {
      this.latencySimulator = new LatencySimulator();
    }
  }

  /**
   * バックテストを実行
   */
  async runBacktest(strategy: Strategy, symbol: string): Promise<BacktestResult> {
    const data = this.data.get(symbol);
    if (!data || data.length === 0) {
      throw new Error(`No data loaded for symbol: ${symbol}`);
    }

    // Initialize
    this.resetState();
    strategy.onInit?.();

    const context: StrategyContext = {
      currentPosition: null,
      entryPrice: 0,
      equity: this.currentEquity,
      data: [],
      indicators: this.indicators,
    };

    // O(N) optimization: Pre-populate and grow incrementally
    const historicalData: OHLCV[] = [];
    // Pre-populate with initial data (indices 0-49)
    for (let j = 0; j < Math.min(50, data.length); j++) {
      historicalData.push(data[j]);
    }
    
    // Run through data
    for (let i = 50; i < data.length; i++) {
      const currentData = data[i];
      
      // Grow historical data array instead of slicing each time - O(1) amortized
      historicalData.push(currentData);
      context.data = historicalData;
      context.currentPosition = this.currentPosition;
      context.entryPrice = this.entryPrice;
      context.equity = this.currentEquity;

      // Check exit conditions first
      if (this.currentPosition) {
        const exitAction = this.checkExitConditions(currentData);
        if (exitAction) {
          this.closePosition(currentData, exitAction.exitReason, i);
          continue;
        }
      }

      // Get strategy action
      const action = strategy.onData(currentData, i, context);

      // Execute action
      await this.executeAction(action, currentData, i);

      // Record equity
      this.equityCurve.push(this.currentEquity);

      // Check max drawdown
      const currentDrawdown = this.calculateCurrentDrawdown();
      if (currentDrawdown > this.config.maxDrawdown) {
        break;
      }
    }

    // Close any open position at the end
    if (this.currentPosition) {
      const lastData = data[data.length - 1];
      this.closePosition(lastData, 'end_of_data', data.length - 1);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics();

    const result: BacktestResult = {
      trades: this.trades,
      equityCurve: this.equityCurve,
      metrics,
      config: this.config,
      startDate: data[0].date,
      endDate: data[data.length - 1].date,
      duration: Math.floor((new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / (1000 * 60 * 60 * 24)),
    };

    strategy.onEnd?.(result);
    this.emit('backtest_complete', result);

    return result;
  }

  /**
   * 複数シンボルでバックテストを実行
   */
  async runMultiSymbolBacktest(strategy: Strategy, symbols: string[]): Promise<Map<string, BacktestResult>> {
    const results = new Map<string, BacktestResult>();

    for (const symbol of symbols) {
      const result = await this.runBacktest(strategy, symbol);
      results.set(symbol, result);
    }

    return results;
  }

  /**
   * ウォークフォワード分析を実行
   */
  async runWalkForwardAnalysis(
    strategy: Strategy,
    symbol: string,
    trainSize: number,
    testSize: number
  ): Promise<Array<{ train: BacktestResult; test: BacktestResult }>> {
    const data = this.data.get(symbol);
    if (!data) throw new Error(`No data for ${symbol}`);

    const results: Array<{ train: BacktestResult; test: BacktestResult }> = [];
    let startIndex = 0;

    while (startIndex + trainSize + testSize <= data.length) {
      // Training period
      const trainData = data.slice(startIndex, startIndex + trainSize);
      this.data.set(`${symbol}_train`, trainData);
      const trainResult = await this.runBacktest(strategy, `${symbol}_train`);

      // Test period
      const testData = data.slice(startIndex + trainSize, startIndex + trainSize + testSize);
      this.data.set(`${symbol}_test`, testData);
      const testResult = await this.runBacktest(strategy, `${symbol}_test`);

      results.push({ train: trainResult, test: testResult });

      // Move window
      startIndex += testSize;
    }

    return results;
  }

  // ============================================================================
  // Private/Protected Methods
  // ============================================================================

  protected async executeAction(action: StrategyAction, data: OHLCV, index: number = 0): Promise<void> {
    switch (action.action) {
      case 'BUY':
        if (!this.currentPosition && this.config.allowShort !== false) {
          this.openPosition('LONG', data, action, index);
        } else if (this.currentPosition === 'SHORT') {
          this.closePosition(data, 'signal', index);
          this.openPosition('LONG', data, action, index);
        }
        break;
      case 'SELL':
        if (!this.currentPosition && this.config.allowShort) {
          this.openPosition('SHORT', data, action, index);
        } else if (this.currentPosition === 'LONG') {
          this.closePosition(data, 'signal', index);
          if (this.config.allowShort) {
            this.openPosition('SHORT', data, action, index);
          }
        }
        break;
      case 'CLOSE':
        if (this.currentPosition) {
          this.closePosition(data, 'signal', index);
        }
        break;
      case 'HOLD':
      default:
        // Do nothing
        break;
    }
  }

  protected openPosition(side: 'LONG' | 'SHORT', data: OHLCV, action: StrategyAction, index: number = 0): void {
    const quantity = this.calculatePositionSize(data.close, action.quantity);
    let price = this.applySlippage(data.close, side === 'LONG' ? 'BUY' : 'SELL', data, quantity);
    
    // Apply partial fill if enabled
    let actualQuantity = quantity;
    let partialFills: Trade['partialFills'] = undefined;
    
    if (this.partialFillSimulator && data.volume) {
      const fillResult = this.partialFillSimulator.simulateFill(
        price,
        quantity,
        side === 'LONG' ? 'BUY' : 'SELL',
        data,
        index
      );
      actualQuantity = fillResult.filledQuantity;
      price = fillResult.fillPrice;
      
      if (fillResult.fills.length > 0) {
        partialFills = fillResult.fills;
      }
    }

    this.currentPosition = side;
    this.entryPrice = price;
    this.entryDate = data.date;
    this.stopLoss = action.stopLoss || 0;
    this.takeProfit = action.takeProfit || 0;

    this.emit('position_opened', { side, price, quantity: actualQuantity, date: data.date });
  }

  protected closePosition(data: OHLCV, reason: Trade['exitReason'], index: number = 0): void {
    if (!this.currentPosition) return;

    const quantity = this.calculatePositionSize(this.entryPrice);
    const exitPrice = this.applySlippage(
      data.close, 
      this.currentPosition === 'LONG' ? 'SELL' : 'BUY',
      data,
      quantity
    );

    // Calculate P&L
    let pnl = 0;
    if (this.currentPosition === 'LONG') {
      pnl = (exitPrice - this.entryPrice) * quantity;
    } else {
      pnl = (this.entryPrice - exitPrice) * quantity;
    }

    // Apply fees using commission calculator if available
    let fees = 0;
    let commissionBreakdown: Trade['commissionBreakdown'] | undefined;
    
    if (this.commissionCalculator) {
      const roundTrip = this.commissionCalculator.calculateRoundTripCommission(
        this.entryPrice,
        exitPrice,
        quantity
      );
      fees = roundTrip.totalCommission;
      commissionBreakdown = {
        entryCommission: roundTrip.entryCommission.commission,
        exitCommission: roundTrip.exitCommission.commission,
      };
    } else {
      // Fallback to simple percentage
      const entryValue = this.entryPrice * quantity;
      const exitValue = exitPrice * quantity;
      fees = (entryValue + exitValue) * (this.config.commission / 100);
    }
    
    pnl -= fees;

    const pnlPercent = (pnl / (this.entryPrice * quantity)) * 100;

    // Update equity
    this.currentEquity += pnl;
    this.peakEquity = Math.max(this.peakEquity, this.currentEquity);

    const trade: Trade = {
      id: `trade_${this.trades.length}`,
      entryDate: this.entryDate,
      exitDate: data.date,
      symbol: '', // Will be set by caller? Or inherited?
      side: this.currentPosition,
      entryPrice: this.entryPrice,
      exitPrice,
      quantity,
      pnl,
      pnlPercent,
      fees,
      exitReason: reason,
      commissionBreakdown,
      partialFills: undefined, // Type requires this if not optional? It is optional.
    };

    this.trades.push(trade);
    this.emit('position_closed', trade);

    // Reset position
    this.currentPosition = null;
    this.entryPrice = 0;
    this.stopLoss = 0;
    this.takeProfit = 0;
  }

  protected applySlippage(price: number, side: 'BUY' | 'SELL', data?: OHLCV, quantity?: number): number {
    // Use advanced slippage model if enabled
    if (this.slippageModel && data && quantity) {
      const result = this.slippageModel.calculateSlippage(
        price,
        side,
        quantity,
        data
      );
      return result.adjustedPrice;
    }
    
    // Fallback to simple slippage
    const slippageFactor = 1 + (Math.random() * this.config.slippage / 100);
    return side === 'BUY' ? price * slippageFactor : price / slippageFactor;
  }

  protected calculateMetrics(): PerformanceMetrics {
    const returns = this.equityCurve.map((eq, i) =>
      i === 0 ? 0 : (eq - this.equityCurve[i - 1]) / this.equityCurve[i - 1]
    ).slice(1);

    const winningTrades = this.trades.filter((t) => t.pnl > 0);
    const losingTrades = this.trades.filter((t) => t.pnl <= 0);

    const totalReturn = ((this.currentEquity - this.config.initialCapital) / this.config.initialCapital) * 100;
    const days = this.equityCurve.length;
    const annualizedReturn = days > 0 ? (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100 : 0;

    // Volatility (annualized)
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1);
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    const riskFreeRate = 0.02 / 252;
    const sharpeRatio = volatility === 0 ? 0 : ((avgReturn - riskFreeRate) / (volatility / 100 / Math.sqrt(252))) * Math.sqrt(252);

    const downsideReturns = returns.filter((r) => r < 0);
    const downsideVariance = downsideReturns.reduce((sum, r) => sum + r * r, 0) / (downsideReturns.length || 1);
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252); // Annualized (decimal)
    const sortinoRatio = downsideDeviation === 0 ? 0 : ((avgReturn - riskFreeRate) * 252) / (downsideDeviation); // downsideDeviation is already annualized? Sortino usually uses daily deviation * sqrt(252). Wait.
    // Usually Sortino = (Annualized Return - Rf) / Annualized Downside Deviation.
    // Here downsideDeviation is annualized. So this is correct-ish.

    // Max drawdown
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let peak = this.equityCurve[0];
    let peakIndex = 0;

    for (let i = 1; i < this.equityCurve.length; i++) {
      if (this.equityCurve[i] > peak) {
        peak = this.equityCurve[i];
        peakIndex = i;
      }
      const drawdown = (peak - this.equityCurve[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDuration = i - peakIndex;
      }
    }

    const winRate = this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl)) : 0;

    const averageTrade = this.trades.length > 0 ? this.trades.reduce((sum, t) => sum + t.pnl, 0) / this.trades.length : 0;

    const calmarRatio = maxDrawdown === 0 ? 0 : annualizedReturn / (maxDrawdown * 100);

    // Omega ratio
    const threshold = 0;
    const gains = returns.filter((r) => r > threshold).reduce((sum, r) => sum + r - threshold, 0);
    const losses = returns.filter((r) => r < threshold).reduce((sum, r) => sum + threshold - r, 0);
    const omegaRatio = losses === 0 ? gains : gains / losses;

    // Value at Risk (95%)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(0.05 * sortedReturns.length);
    const valueAtRisk = sortedReturns.length > 0 ? Math.abs(sortedReturns[varIndex]) : 0;

    // Kelly Criterion
    const winRateDecimal = winRate / 100;
    const winLossRatio = averageLoss === 0 ? 0 : averageWin / averageLoss;
    const kellyCriterion = averageLoss === 0 ? 0 : (winRateDecimal - ((1 - winRateDecimal) / winLossRatio));

    // SQN
    const tradePnls = this.trades.map(t => t.pnl);
    const meanPnl = averageTrade;
    const variancePnl = tradePnls.reduce((sum, pnl) => sum + Math.pow(pnl - meanPnl, 2), 0) / (tradePnls.length || 1);
    const stdDevPnl = Math.sqrt(variancePnl);
    const SQN = stdDevPnl === 0 ? 0 : (meanPnl / stdDevPnl) * Math.sqrt(this.trades.length);

    // Expectancy
    const expectancy = (winRateDecimal * averageWin) - ((1 - winRateDecimal) * averageLoss);

    // Holding Period
    const avgHoldingPeriod = this.trades.length > 0
      ? this.trades.reduce((sum, t) => {
          if (t.entryDate && t.exitDate) {
              const start = new Date(t.entryDate).getTime();
              const end = new Date(t.exitDate).getTime();
              return sum + (end - start) / (1000 * 60 * 60 * 24);
          }
          return sum;
        }, 0) / this.trades.length
      : 0;

    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown: maxDrawdown * 100,
      maxDrawdownDuration,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      averageTrade,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      calmarRatio,
      omegaRatio,

      // New required fields
      valueAtRisk,
      conditionalValueAtRisk: 0, // Simplified default
      downsideDeviation: parseFloat((downsideDeviation * 100).toFixed(4)), // Match volatility scale?
      averageWinLossRatio: winLossRatio,
      averageHoldingPeriod: avgHoldingPeriod,
      averageDrawdown: 0, // Simplified default
      averageRMultiple: 0, // Simplified default
      expectancy,
      kellyCriterion,
      riskOfRuin: 0, // Simplified default
      SQN,
      treynorRatio: 0,
      informationRatio: 0,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * テクニカル指標を計算
   */
  calculateIndicator(name: string, data: OHLCV[], calculator: (data: OHLCV[]) => number[]): number[] {
    const values = calculator(data);
    this.indicators.set(name, values);
    return values;
  }

  /**
   * 結果をエクスポート
   */
  exportResults(result: BacktestResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * 複数戦略を比較
   */
  compareStrategies(results: Map<string, BacktestResult>): Array<{ strategy: string; metrics: PerformanceMetrics }> {
    return Array.from(results.entries())
      .map(([strategy, result]) => ({ strategy, metrics: result.metrics }))
      .sort((a, b) => b.metrics.sharpeRatio - a.metrics.sharpeRatio);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<BacktestConfig>) => new AdvancedBacktestEngine(config)
);

export const getGlobalBacktestEngine = getInstance;
export const resetGlobalBacktestEngine = resetInstance;

export default AdvancedBacktestEngine;
