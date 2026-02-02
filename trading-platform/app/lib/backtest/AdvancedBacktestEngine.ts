/**
 * AdvancedBacktestEngine.ts
 * 
 * 高度なバックテストエンジン。複数の戦略、リスク管理、取引コストを考慮した
 * 包括的なバックテスト機能を提供します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

// OHLCV type is now imported from '@/app/types' to avoid duplication
export type { OHLCV };

export interface Trade {
  id: string;
  entryDate: string;
  exitDate?: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
  exitReason: 'target' | 'stop' | 'signal' | 'end_of_data';
}

export interface BacktestConfig {
  initialCapital: number;
  commission: number; // percentage
  slippage: number; // percentage
  spread: number; // percentage
  maxPositionSize: number; // percentage of capital
  maxDrawdown: number; // percentage
  allowShort: boolean;
  useStopLoss: boolean;
  useTakeProfit: boolean;
  riskPerTrade: number; // percentage
  // Enhanced slippage model
  useRealisticSlippage?: boolean;
  averageDailyVolume?: number;
  useTimeOfDaySlippage?: boolean;
  useVolatilitySlippage?: boolean;
  useTieredCommissions?: boolean;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: number[];
  metrics: PerformanceMetrics;
  config: BacktestConfig;
  startDate: string;
  endDate: string;
  duration: number; // days
}

export interface PerformanceMetrics {
  totalReturn: number; // percentage
  annualizedReturn: number; // percentage
  volatility: number; // percentage
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number; // percentage
  maxDrawdownDuration: number; // days
  winRate: number; // percentage
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageTrade: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  calmarRatio: number;
  omegaRatio: number;
}

export interface Strategy {
  name: string;
  description: string;
  onData: (data: OHLCV, index: number, context: StrategyContext) => StrategyAction;
  onInit?: () => void;
  onEnd?: (result: BacktestResult) => void;
}

export interface StrategyContext {
  currentPosition: 'LONG' | 'SHORT' | null;
  entryPrice: number;
  equity: number;
  data: OHLCV[];
  indicators: Map<string, number[]>;
}

export interface StrategyAction {
  action: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
  quantity?: number;
  stopLoss?: number;
  takeProfit?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  initialCapital: 100000,
  commission: 0.1, // 0.1%
  slippage: 0.05, // 0.05%
  spread: 0.01, // 0.01%
  maxPositionSize: 20, // 20%
  maxDrawdown: 50, // 50%
  allowShort: true,
  useStopLoss: true,
  useTakeProfit: true,
  riskPerTrade: 2, // 2%
};

// ============================================================================
// Advanced Backtest Engine
// ============================================================================

export class AdvancedBacktestEngine extends EventEmitter {
  private config: BacktestConfig;
  private data: Map<string, OHLCV[]> = new Map();
  private trades: Trade[] = [];
  private equityCurve: number[] = [];
  private currentPosition: 'LONG' | 'SHORT' | null = null;
  private entryPrice: number = 0;
  private entryDate: string = '';
  private currentEquity: number = 0;
  private stopLoss: number = 0;
  private takeProfit: number = 0;
  private indicators: Map<string, number[]> = new Map();

  constructor(config: Partial<BacktestConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BACKTEST_CONFIG, ...config };
    this.currentEquity = this.config.initialCapital;
  }

  /**
   * データをロード
   */
  loadData(symbol: string, data: OHLCV[]): void {
    this.data.set(symbol, data);
    this.emit('data_loaded', symbol, data.length);
  }

  /**
   * バックテストを実行
   */
  async runBacktest(strategy: Strategy, symbol: string): Promise<BacktestResult> {
    const data = this.data.get(symbol);
    if (!data || data.length === 0) {
      throw new Error(`No data loaded for symbol: ${symbol}`);
    }

    console.log(`[BacktestEngine] Running backtest for ${symbol} with strategy: ${strategy.name}`);

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

    // Run through data
    for (let i = 50; i < data.length; i++) {
      const currentData = data[i];
      const historicalData = data.slice(0, i + 1);
      context.data = historicalData;
      context.currentPosition = this.currentPosition;
      context.entryPrice = this.entryPrice;
      context.equity = this.currentEquity;

      // Check exit conditions first
      if (this.currentPosition) {
        const exitAction = this.checkExitConditions(currentData);
        if (exitAction) {
          this.closePosition(currentData, exitAction.exitReason);
          continue;
        }
      }

      // Get strategy action
      const action = strategy.onData(currentData, i, context);

      // Execute action
      await this.executeAction(action, currentData);

      // Record equity
      this.equityCurve.push(this.currentEquity);

      // Check max drawdown
      const currentDrawdown = this.calculateCurrentDrawdown();
      if (currentDrawdown > this.config.maxDrawdown) {
        console.log('[BacktestEngine] Max drawdown reached, stopping backtest');
        break;
      }
    }

    // Close any open position at the end
    if (this.currentPosition) {
      const lastData = data[data.length - 1];
      this.closePosition(lastData, 'end_of_data');
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
  // Private Methods
  // ============================================================================

  private resetState(): void {
    this.trades = [];
    this.equityCurve = [this.config.initialCapital];
    this.currentPosition = null;
    this.entryPrice = 0;
    this.entryDate = '';
    this.currentEquity = this.config.initialCapital;
    this.stopLoss = 0;
    this.takeProfit = 0;
  }

  private checkExitConditions(data: OHLCV): { exitReason: Trade['exitReason'] } | null {
    if (!this.currentPosition) return null;

    const currentPrice = data.close;

    // Check stop loss
    if (this.config.useStopLoss && this.stopLoss > 0) {
      if (this.currentPosition === 'LONG' && currentPrice <= this.stopLoss) {
        return { exitReason: 'stop' };
      }
      if (this.currentPosition === 'SHORT' && currentPrice >= this.stopLoss) {
        return { exitReason: 'stop' };
      }
    }

    // Check take profit
    if (this.config.useTakeProfit && this.takeProfit > 0) {
      if (this.currentPosition === 'LONG' && currentPrice >= this.takeProfit) {
        return { exitReason: 'target' };
      }
      if (this.currentPosition === 'SHORT' && currentPrice <= this.takeProfit) {
        return { exitReason: 'target' };
      }
    }

    return null;
  }

  private async executeAction(action: StrategyAction, data: OHLCV): Promise<void> {
    switch (action.action) {
      case 'BUY':
        if (!this.currentPosition && this.config.allowShort !== false) {
          this.openPosition('LONG', data, action);
        } else if (this.currentPosition === 'SHORT') {
          this.closePosition(data, 'signal');
          this.openPosition('LONG', data, action);
        }
        break;
      case 'SELL':
        if (!this.currentPosition && this.config.allowShort) {
          this.openPosition('SHORT', data, action);
        } else if (this.currentPosition === 'LONG') {
          this.closePosition(data, 'signal');
          if (this.config.allowShort) {
            this.openPosition('SHORT', data, action);
          }
        }
        break;
      case 'CLOSE':
        if (this.currentPosition) {
          this.closePosition(data, 'signal');
        }
        break;
      case 'HOLD':
      default:
        // Do nothing
        break;
    }
  }

  private openPosition(side: 'LONG' | 'SHORT', data: OHLCV, action: StrategyAction): void {
    // Calculate quantity first based on current close price
    const quantity = this.calculatePositionSize(data.close, action.quantity);
    // Then apply slippage to get actual execution price
    const price = this.applySlippage(data.close, side === 'LONG' ? 'BUY' : 'SELL', data, quantity);

    this.currentPosition = side;
    this.entryPrice = price;
    this.entryDate = data.date;
    this.stopLoss = action.stopLoss || 0;
    this.takeProfit = action.takeProfit || 0;

    this.emit('position_opened', { side, price, quantity, date: data.date });
  }

  private closePosition(data: OHLCV, reason: Trade['exitReason']): void {
    if (!this.currentPosition) return;

    const quantity = this.calculatePositionSize(this.entryPrice);
    const exitPrice = this.applySlippage(data.close, this.currentPosition === 'LONG' ? 'SELL' : 'BUY', data, quantity);

    // Calculate P&L
    let pnl = 0;
    if (this.currentPosition === 'LONG') {
      pnl = (exitPrice - this.entryPrice) * quantity;
    } else {
      pnl = (this.entryPrice - exitPrice) * quantity;
    }

    // Apply fees (with tiered commissions if enabled)
    const entryValue = this.entryPrice * quantity;
    const exitValue = exitPrice * quantity;
    const totalVolume = this.trades.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);
    
    let fees: number;
    if (this.config.useTieredCommissions) {
      fees = this.calculateTieredCommission(entryValue, totalVolume) + 
             this.calculateTieredCommission(exitValue, totalVolume);
    } else {
      fees = (entryValue + exitValue) * (this.config.commission / 100);
    }
    pnl -= fees;

    const pnlPercent = (pnl / (this.entryPrice * quantity)) * 100;

    // Update equity
    this.currentEquity += pnl;

    const trade: Trade = {
      id: `trade_${this.trades.length}`,
      entryDate: this.entryDate,
      exitDate: data.date,
      symbol: '', // Will be set by caller
      side: this.currentPosition,
      entryPrice: this.entryPrice,
      exitPrice,
      quantity,
      pnl,
      pnlPercent,
      fees,
      exitReason: reason,
    };

    this.trades.push(trade);
    this.emit('position_closed', trade);

    // Reset position
    this.currentPosition = null;
    this.entryPrice = 0;
    this.stopLoss = 0;
    this.takeProfit = 0;
  }

  private applySlippage(price: number, side: 'BUY' | 'SELL', data?: OHLCV, quantity?: number): number {
    if (this.config.useRealisticSlippage) {
      return this.applyRealisticSlippage(price, side, data, quantity);
    }
    
    const slippageFactor = 1 + (Math.random() * this.config.slippage / 100);
    return side === 'BUY' ? price * slippageFactor : price / slippageFactor;
  }

  /**
   * Apply realistic slippage model considering:
   * - Order size vs average volume
   * - Bid-Ask spread
   * - Time of day
   * - Volatility
   */
  private applyRealisticSlippage(
    price: number,
    side: 'BUY' | 'SELL',
    data?: OHLCV,
    quantity?: number
  ): number {
    let slippageRate = this.config.slippage / 100; // Base slippage

    // 1. Order size impact (if quantity and average volume are known)
    if (quantity && this.config.averageDailyVolume) {
      const volumeRatio = quantity / this.config.averageDailyVolume;
      const volumeImpact = Math.sqrt(volumeRatio) * 0.5; // Square root model
      slippageRate += volumeImpact;
    }

    // 2. Bid-Ask spread impact
    const spreadImpact = (this.config.spread / 100) / 2; // Half of spread
    slippageRate += spreadImpact;

    // 3. Time of day impact (opening/closing hours have worse slippage)
    if (this.config.useTimeOfDaySlippage && data) {
      const timeSlippage = this.getTimeOfDaySlippage(data.date);
      slippageRate += timeSlippage;
    }

    // 4. Volatility-linked slippage
    if (this.config.useVolatilitySlippage && data) {
      const volatilitySlippage = this.getVolatilitySlippage(data);
      slippageRate += volatilitySlippage;
    }

    // Apply slippage
    const slippageFactor = 1 + slippageRate;
    return side === 'BUY' ? price * slippageFactor : price / slippageFactor;
  }

  /**
   * Calculate time-of-day slippage
   * Opening and closing hours have higher slippage
   */
  private getTimeOfDaySlippage(dateStr: string): number {
    const date = new Date(dateStr);
    const hour = date.getHours();
    const minute = date.getMinutes();

    // Market open (9:00-10:00): 50% higher slippage
    if (hour === 9 || (hour === 10 && minute === 0)) {
      return 0.025; // +2.5 bps
    }

    // Market close (15:00-16:00): 50% higher slippage
    if (hour === 15 || hour === 16) {
      return 0.025; // +2.5 bps
    }

    // Lunch time (11:30-12:30): 20% higher slippage
    if ((hour === 11 && minute >= 30) || (hour === 12 && minute <= 30)) {
      return 0.01; // +1 bps
    }

    return 0; // Normal hours
  }

  /**
   * Calculate volatility-linked slippage
   * Higher volatility = higher slippage
   */
  private getVolatilitySlippage(data: OHLCV): number {
    // Calculate intraday volatility as (high - low) / close
    const intradayVolatility = (data.high - data.low) / data.close;

    // Normal volatility is around 1-2%
    // High volatility (>3%) increases slippage
    if (intradayVolatility > 0.03) {
      return 0.02; // +2 bps for high volatility
    } else if (intradayVolatility > 0.02) {
      return 0.01; // +1 bps for medium volatility
    }

    return 0; // Normal volatility
  }

  /**
   * Calculate tiered commission based on volume
   * Higher volume = lower commission rate
   */
  private calculateTieredCommission(tradeValue: number, totalVolume: number): number {
    if (!this.config.useTieredCommissions) {
      return tradeValue * (this.config.commission / 100);
    }

    let commissionRate = this.config.commission / 100;

    // Volume tiers (example for US market)
    if (totalVolume > 10000000) {
      // $10M+ monthly: 0.05%
      commissionRate = 0.0005;
    } else if (totalVolume > 5000000) {
      // $5M-$10M monthly: 0.07%
      commissionRate = 0.0007;
    } else if (totalVolume > 1000000) {
      // $1M-$5M monthly: 0.08%
      commissionRate = 0.0008;
    }
    // else: default rate

    return tradeValue * commissionRate;
  }

  private calculatePositionSize(price: number, fixedQuantity?: number): number {
    if (fixedQuantity) return fixedQuantity;

    const maxPositionValue = this.currentEquity * (this.config.maxPositionSize / 100);
    return Math.floor(maxPositionValue / price);
  }

  private calculateCurrentDrawdown(): number {
    const peak = Math.max(...this.equityCurve);
    return ((peak - this.currentEquity) / peak) * 100;
  }

  private calculateMetrics(): PerformanceMetrics {
    const returns = this.equityCurve.map((eq, i) =>
      i === 0 ? 0 : (eq - this.equityCurve[i - 1]) / this.equityCurve[i - 1]
    ).slice(1);

    const winningTrades = this.trades.filter((t) => t.pnl > 0);
    const losingTrades = this.trades.filter((t) => t.pnl <= 0);

    const totalReturn = ((this.currentEquity - this.config.initialCapital) / this.config.initialCapital) * 100;
    const days = this.equityCurve.length;
    const annualizedReturn = (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100;

    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const riskFreeRate = 0.02 / 252;
    const sharpeRatio = volatility === 0 ? 0 : ((avgReturn - riskFreeRate) / (volatility / 100 / Math.sqrt(252))) * Math.sqrt(252);

    const downsideReturns = returns.filter((r) => r < 0);
    const downsideDeviation = Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length) * Math.sqrt(252);
    const sortinoRatio = downsideDeviation === 0 ? 0 : ((avgReturn - riskFreeRate) * 252) / (downsideDeviation * Math.sqrt(252));

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

    // Omega ratio (simplified)
    const threshold = 0;
    const gains = returns.filter((r) => r > threshold).reduce((sum, r) => sum + r - threshold, 0);
    const losses = returns.filter((r) => r < threshold).reduce((sum, r) => sum + threshold - r, 0);
    const omegaRatio = losses === 0 ? gains : gains / losses;

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
