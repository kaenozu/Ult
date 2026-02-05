/**
 * WinningBacktestEngine.ts
 * 
 * 譬ｪ蜿門ｼ輔〒蜍昴▽縺溘ａ縺ｮ蛹・峡逧・ヰ繝・け繝・せ繝医お繝ｳ繧ｸ繝ｳ
 * 
 * 縲先ｩ溯・縲・
 * - 隍・焚謌ｦ逡･縺ｮ繝舌ャ繧ｯ繝・せ繝・
 * - 繧ｦ繧ｩ繝ｼ繧ｯ繝輔か繝ｯ繝ｼ繝牙・譫・
 * - 繝｢繝ｳ繝・き繝ｫ繝ｭ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
 * - 隧ｳ邏ｰ縺ｪ繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ謖・ｨ・
 * - 蜿門ｼ輔さ繧ｹ繝医・繧ｹ繝ｪ繝・・繝ｼ繧ｸ閠・・
 */

import { OHLCV } from '@/app/types';
import { StrategyResult } from '@/app/lib/strategies/WinningStrategyEngine';
import { PositionSizingResult } from '@/app/lib/risk/AdvancedRiskManager';

// ============================================================================
// Types
// ============================================================================

export interface BacktestTrade {
  id: string;
  entryDate: string;
  exitDate: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
  slippage: number;
  exitReason: 'target' | 'stop' | 'signal' | 'trailing_stop' | 'time' | 'end_of_data';
  strategy: string;
  riskRewardRatio: number;
  holdingPeriods: number; // 菫晄怏譛滄俣・郁ｶｳ謨ｰ・・
}

interface OpenPosition {
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  entryDate: string;
  entryIndex: number;
  stopLoss: number;
  takeProfit: number;
  strategy: string;
  riskRewardRatio: number;
}

export interface BacktestConfig {
  initialCapital: number;
  commission: number; // % per trade
  slippage: number; // % per trade
  spread: number; // %
  maxPositionSize: number; // % of capital
  maxDrawdown: number; // % from peak
  allowShort: boolean;
  useStopLoss: boolean;
  useTakeProfit: boolean;
  riskPerTrade: number; // % of capital
  maxOpenPositions: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface PerformanceMetrics {
  // 繝ｪ繧ｿ繝ｼ繝ｳ繝｡繝医Μ繧ｯ繧ｹ
  totalReturn: number; // %
  annualizedReturn: number; // %
  cagr: number; // Compound Annual Growth Rate
  
  // 繝ｪ繧ｹ繧ｯ繝｡繝医Μ繧ｯ繧ｹ
  volatility: number; // % annualized
  maxDrawdown: number; // %
  maxDrawdownDuration: number; // days
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  
  // 繝ｪ繧ｹ繧ｯ隱ｿ謨ｴ繝ｪ繧ｿ繝ｼ繝ｳ繝｡繝医Μ繧ｯ繧ｹ
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio: number;
  informationRatio: number;
  
  // 蜿門ｼ輔Γ繝医Μ繧ｯ繧ｹ
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageTrade: number;
  expectancy: number; // Expected value per trade
  
  // 騾｣邯壹Γ繝医Μ繧ｯ繧ｹ
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldingPeriod: number; // periods
  
  // 蜉ｹ邇・Γ繝医Μ繧ｯ繧ｹ
  profitToDrawdownRatio: number;
  returnToRiskRatio: number;
  ulcerIndex: number;
  
  // 蛻・ｸ・Γ繝医Μ繧ｯ繧ｹ
  skewness: number;
  kurtosis: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  equityCurve: number[];
  drawdownCurve: number[];
  metrics: PerformanceMetrics;
  monthlyReturns: Map<string, number>;
  yearlyReturns: Map<string, number>;
  config: BacktestConfig;
  startDate: string;
  endDate: string;
  duration: number; // days
  finalCapital: number;
}

export interface WalkForwardResult {
  inSample: BacktestResult;
  outOfSample: BacktestResult;
  robustnessScore: number; // 0-100
  parameterStability: number; // 0-100
}

export interface MonteCarloResult {
  originalResult: BacktestResult;
  simulations: BacktestResult[];
  probabilityOfProfit: number; // %
  probabilityOfDrawdown: number; // %
  confidenceIntervals: {
    returns: { lower: number; upper: number };
    drawdown: { lower: number; upper: number };
    sharpe: { lower: number; upper: number };
  };
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  initialCapital: 1000000, // 100荳・・
  commission: 0.1, // 0.1%
  slippage: 0.05, // 0.05%
  spread: 0.01,
  maxPositionSize: 20, // 20%
  maxDrawdown: 20, // 20%
  allowShort: false, // 迴ｾ迚ｩ蜿門ｼ輔・縺ｿ
  useStopLoss: true,
  useTakeProfit: true,
  riskPerTrade: 2, // 2%
  maxOpenPositions: 5,
  rebalanceFrequency: 'daily',
};

// ============================================================================
// Winning Backtest Engine
// ============================================================================

class WinningBacktestEngine {
  private config: BacktestConfig;
  private trades: BacktestTrade[] = [];
  private equityCurve: number[] = [];
  private currentEquity: number = 0;
  private peakEquity: number = 0;
  private openPositions: Map<string, OpenPosition> = new Map();

  constructor(config: Partial<BacktestConfig> = {}) {
    this.config = { ...DEFAULT_BACKTEST_CONFIG, ...config };
    this.currentEquity = this.config.initialCapital;
    this.peakEquity = this.config.initialCapital;
  }

  /**
   * 蜊倅ｸ謌ｦ逡･縺ｮ繝舌ャ繧ｯ繝・せ繝医ｒ螳溯｡・
   */
  runBacktest(
    strategyResults: StrategyResult[],
    data: OHLCV[],
    symbol: string
  ): BacktestResult {
    this.reset();
    
    console.log(`[WinningBacktestEngine] Starting backtest for ${symbol}`);
    console.log(`  Initial Capital: ${this.config.initialCapital.toLocaleString()}`);
    console.log(`  Data Points: ${data.length}`);
    
    // 謌ｦ逡･邨先棡縺ｨ萓｡譬ｼ繝・・繧ｿ繧貞酔譛・
    const alignedData = this.alignDataWithSignals(data, strategyResults);
    
    for (let i = 50; i < alignedData.length; i++) {
      const current = alignedData[i];
      const signal = current.signal;
      
      // 迴ｾ蝨ｨ縺ｮ繝昴ず繧ｷ繝ｧ繝ｳ繧偵メ繧ｧ繝・け
      const currentPosition = this.openPositions.get(symbol);
      
      // 繧､繧ｰ繧ｸ繝・ヨ譚｡莉ｶ繧偵メ繧ｧ繝・け
      if (currentPosition) {
        const exitCheck = this.checkExitConditions(currentPosition, current, i);
        if (exitCheck.shouldExit) {
          this.closePosition(currentPosition, current, exitCheck.reason, i);
          this.openPositions.delete(symbol);
        }
      }
      
      // 繧ｨ繝ｳ繝医Μ繝ｼ繧ｷ繧ｰ繝翫Ν繧偵メ繧ｧ繝・け
      if (!this.openPositions.has(symbol) && signal && signal.signal !== 'HOLD') {
        const canEnter = this.canOpenPosition(symbol);
        if (canEnter) {
          this.openPosition(signal, current, symbol, i);
        }
      }
      
      // 繧ｨ繧ｯ繧､繝・ぅ繧ｫ繝ｼ繝悶ｒ譖ｴ譁ｰ
      this.updateEquity();
      
      // 譛螟ｧ繝峨Ο繝ｼ繝繧ｦ繝ｳ繝√ぉ繝・け
      if (this.calculateCurrentDrawdown() > this.config.maxDrawdown) {
        console.log('[WinningBacktestEngine] Max drawdown reached, stopping backtest');
        break;
      }
    }
    
    // 譛ｪ豎ｺ貂医・繧ｸ繧ｷ繝ｧ繝ｳ繧呈ｱｺ貂・
    this.closeAllPositions(alignedData);
    
    // 繝｡繝医Μ繧ｯ繧ｹ繧定ｨ育ｮ・
    const metrics = this.calculateMetrics();
    const monthlyReturns = this.calculateMonthlyReturns();
    const yearlyReturns = this.calculateYearlyReturns();
    const drawdownCurve = this.calculateDrawdownCurve();
    
    const result: BacktestResult = {
      trades: this.trades,
      equityCurve: this.equityCurve,
      drawdownCurve,
      metrics,
      monthlyReturns,
      yearlyReturns,
      config: this.config,
      startDate: data[0].date,
      endDate: data[data.length - 1].date,
      duration: this.calculateDuration(data[0].date, data[data.length - 1].date),
      finalCapital: this.currentEquity,
    };
    
    this.logResults(result);
    
    return result;
  }

  /**
   * 繧ｦ繧ｩ繝ｼ繧ｯ繝輔か繝ｯ繝ｼ繝牙・譫舌ｒ螳溯｡・
   */
  runWalkForwardAnalysis(
    strategyResults: StrategyResult[],
    data: OHLCV[],
    symbol: string,
    trainSize: number = 252, // 1蟷ｴ
    testSize: number = 63 // 3繝ｶ譛・
  ): WalkForwardResult[] {
    const results: WalkForwardResult[] = [];
    let startIndex = 0;
    
    while (startIndex + trainSize + testSize <= data.length) {
      // In-Sample譛滄俣・医ヱ繝ｩ繝｡繝ｼ繧ｿ譛驕ｩ蛹厄ｼ・
      const trainData = data.slice(startIndex, startIndex + trainSize);
      const trainSignals = strategyResults.slice(startIndex, startIndex + trainSize);
      const inSampleResult = this.runBacktest(trainSignals, trainData, `${symbol}_train`);
      
      // Out-of-Sample譛滄俣・域､懆ｨｼ・・
      const testData = data.slice(startIndex + trainSize, startIndex + trainSize + testSize);
      const testSignals = strategyResults.slice(startIndex + trainSize, startIndex + trainSize + testSize);
      const outOfSampleResult = this.runBacktest(testSignals, testData, `${symbol}_test`);
      
      // 繝ｭ繝舌せ繝医ロ繧ｹ繧ｹ繧ｳ繧｢繧定ｨ育ｮ・
      const robustnessScore = this.calculateRobustnessScore(inSampleResult, outOfSampleResult);
      const parameterStability = this.calculateParameterStability(inSampleResult, outOfSampleResult);
      
      results.push({
        inSample: inSampleResult,
        outOfSample: outOfSampleResult,
        robustnessScore,
        parameterStability,
      });
      
      startIndex += testSize;
    }
    
    return results;
  }

  /**
   * 繝｢繝ｳ繝・き繝ｫ繝ｭ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧貞ｮ溯｡・
   */
  runMonteCarloSimulation(
    originalResult: BacktestResult,
    numSimulations: number = 1000
  ): MonteCarloResult {
    const simulations: BacktestResult[] = [];
    
    for (let i = 0; i < numSimulations; i++) {
      // 繝医Ξ繝ｼ繝峨ｒ繝ｩ繝ｳ繝繝縺ｫ繧ｷ繝｣繝・ヵ繝ｫ
      const shuffledTrades = this.shuffleTrades([...originalResult.trades]);
      
      // 譁ｰ縺励＞繧ｨ繧ｯ繧､繝・ぅ繧ｫ繝ｼ繝悶ｒ讒狗ｯ・
      const simulatedEquity = this.reconstructEquityCurve(shuffledTrades);
      
      // 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ邨先棡繧剃ｽ懈・
      const simulatedResult: BacktestResult = {
        ...originalResult,
        trades: shuffledTrades,
        equityCurve: simulatedEquity,
        metrics: this.calculateMetricsFromEquity(simulatedEquity, shuffledTrades),
      };
      
      simulations.push(simulatedResult);
    }
    
    // 遒ｺ邇・ｒ險育ｮ・
    const profitableSimulations = simulations.filter(s => s.metrics.totalReturn > 0).length;
    const drawdownSimulations = simulations.filter(
      s => s.metrics.maxDrawdown > this.config.maxDrawdown
    ).length;
    
    // 菫｡鬆ｼ蛹ｺ髢薙ｒ險育ｮ・
    const returns = simulations.map(s => s.metrics.totalReturn).sort((a, b) => a - b);
    const drawdowns = simulations.map(s => s.metrics.maxDrawdown).sort((a, b) => a - b);
    const sharpes = simulations.map(s => s.metrics.sharpeRatio).sort((a, b) => a - b);
    
    return {
      originalResult,
      simulations,
      probabilityOfProfit: (profitableSimulations / numSimulations) * 100,
      probabilityOfDrawdown: (drawdownSimulations / numSimulations) * 100,
      confidenceIntervals: {
        returns: {
          lower: returns[Math.floor(numSimulations * 0.05)],
          upper: returns[Math.floor(numSimulations * 0.95)],
        },
        drawdown: {
          lower: drawdowns[Math.floor(numSimulations * 0.05)],
          upper: drawdowns[Math.floor(numSimulations * 0.95)],
        },
        sharpe: {
          lower: sharpes[Math.floor(numSimulations * 0.05)],
          upper: sharpes[Math.floor(numSimulations * 0.95)],
        },
      },
    };
  }

  /**
   * 隍・焚謌ｦ逡･繧呈ｯ碑ｼ・
   */
  compareStrategies(results: Map<string, BacktestResult>): {
    strategy: string;
    metrics: PerformanceMetrics;
    score: number;
  }[] {
    return Array.from(results.entries())
      .map(([strategy, result]) => ({
        strategy,
        metrics: result.metrics,
        score: this.calculateStrategyScore(result.metrics),
      }))
      .sort((a, b) => b.score - a.score);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private reset(): void {
    this.trades = [];
    this.equityCurve = [this.config.initialCapital];
    this.currentEquity = this.config.initialCapital;
    this.peakEquity = this.config.initialCapital;
    this.openPositions.clear();
  }

  private alignDataWithSignals(
    data: OHLCV[],
    signals: StrategyResult[]
  ): (OHLCV & { signal?: StrategyResult })[] {
    // 繝・・繧ｿ縺ｨ繧ｷ繧ｰ繝翫Ν繧偵う繝ｳ繝・ャ繧ｯ繧ｹ縺ｧ謨ｴ蛻・
    return data.map((candle, index) => ({
      ...candle,
      signal: signals[index],
    }));
  }

  private openPosition(
    signal: StrategyResult,
    data: OHLCV & { signal?: StrategyResult },
    symbol: string,
    index: number
  ): void {
    if (signal.signal === 'HOLD') return;
    const price = this.applySlippage(data.close, 'BUY');
    const quantity = this.calculatePositionSize(price, signal.stopLoss);
    const side: OpenPosition['side'] = signal.signal === 'SELL' ? 'SELL' : 'BUY';
    
    this.openPositions.set(symbol, {
      symbol,
      side,
      entryPrice: price,
      quantity,
      entryDate: data.date,
      entryIndex: index,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      strategy: signal.strategy,
      riskRewardRatio: signal.riskRewardRatio,
    });
  }

  private closePosition(
    position: OpenPosition,
    data: OHLCV,
    reason: string,
    index: number
  ): void {
    const exitPrice = this.applySlippage(data.close, 'SELL');
    const entryValue = position.entryPrice * position.quantity;
    const exitValue = exitPrice * position.quantity;
    
    // P&L險育ｮ・
    let pnl = 0;
    if (position.side === 'BUY') {
      pnl = (exitPrice - position.entryPrice) * position.quantity;
    } else {
      pnl = (position.entryPrice - exitPrice) * position.quantity;
    }
    
    // 謇区焚譁吶→繧ｹ繝ｪ繝・・繝ｼ繧ｸ
    const fees = (entryValue + exitValue) * (this.config.commission / 100);
    const slippage = (entryValue + exitValue) * (this.config.slippage / 100);
    pnl -= (fees + slippage);
    
    const pnlPercent = (pnl / entryValue) * 100;
    
    // 繧ｨ繧ｯ繧､繝・ぅ繧呈峩譁ｰ
    this.currentEquity += pnl;
    
    const trade: BacktestTrade = {
      id: `trade_${this.trades.length}`,
      entryDate: position.entryDate,
      exitDate: data.date,
      symbol: position.symbol,
      side: position.side === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      pnl,
      pnlPercent,
      fees,
      slippage,
      exitReason: reason as any,
      strategy: position.strategy,
      riskRewardRatio: position.riskRewardRatio,
      holdingPeriods: index - position.entryIndex,
    };
    
    this.trades.push(trade);
  }

  private checkExitConditions(
    position: OpenPosition,
    data: OHLCV,
    index: number
  ): { shouldExit: boolean; reason: string } {
    // 繧ｹ繝医ャ繝励Ο繧ｹ繝√ぉ繝・け
    if (this.config.useStopLoss && position.stopLoss) {
      if (position.side === 'BUY' && data.low <= position.stopLoss) {
        return { shouldExit: true, reason: 'stop' };
      }
      if (position.side === 'SELL' && data.high >= position.stopLoss) {
        return { shouldExit: true, reason: 'stop' };
      }
    }
    
    // 繝・う繧ｯ繝励Ο繝輔ぅ繝・ヨ繝√ぉ繝・け
    if (this.config.useTakeProfit && position.takeProfit) {
      if (position.side === 'BUY' && data.high >= position.takeProfit) {
        return { shouldExit: true, reason: 'target' };
      }
      if (position.side === 'SELL' && data.low <= position.takeProfit) {
        return { shouldExit: true, reason: 'target' };
      }
    }
    
    return { shouldExit: false, reason: '' };
  }

  private closeAllPositions(data: (OHLCV & { signal?: StrategyResult })[]): void {
    for (const [symbol, position] of this.openPositions) {
      const lastData = data[data.length - 1];
      this.closePosition(position, lastData, 'end_of_data', data.length - 1);
    }
    this.openPositions.clear();
  }

  private canOpenPosition(symbol: string): boolean {
    return this.openPositions.size < this.config.maxOpenPositions;
  }

  private calculatePositionSize(entryPrice: number, stopLoss: number): number {
    const riskAmount = this.currentEquity * (this.config.riskPerTrade / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    
    if (priceRisk === 0) return 0;
    
    const shares = Math.floor(riskAmount / priceRisk);
    const maxPositionValue = this.currentEquity * (this.config.maxPositionSize / 100);
    const maxShares = Math.floor(maxPositionValue / entryPrice);
    
    return Math.min(shares, maxShares);
  }

  private applySlippage(price: number, side: 'BUY' | 'SELL'): number {
    const slippageFactor = 1 + (Math.random() * this.config.slippage / 100);
    return side === 'BUY' ? price * slippageFactor : price / slippageFactor;
  }

  private updateEquity(): void {
    this.equityCurve.push(this.currentEquity);
    if (this.currentEquity > this.peakEquity) {
      this.peakEquity = this.currentEquity;
    }
  }

  private calculateCurrentDrawdown(): number {
    return ((this.peakEquity - this.currentEquity) / this.peakEquity) * 100;
  }

  private calculateMetrics(): PerformanceMetrics {
    const returns = this.equityCurve.slice(1).map((eq, i) =>
      (eq - this.equityCurve[i]) / this.equityCurve[i]
    );
    
    const winningTrades = this.trades.filter(t => t.pnl > 0);
    const losingTrades = this.trades.filter(t => t.pnl <= 0);
    
    const totalReturn = ((this.currentEquity - this.config.initialCapital) / this.config.initialCapital) * 100;
    const days = this.equityCurve.length;
    const annualizedReturn = days > 0 
      ? (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100 
      : 0;
    
    const volatility = this.calculateVolatility(returns);
    const sharpeRatio = this.calculateSharpeRatio(returns, volatility);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown();
    
    const winRate = this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    
    const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
    
    const averageTrade = this.trades.length > 0 
      ? this.trades.reduce((sum, t) => sum + t.pnl, 0) / this.trades.length 
      : 0;
    
    const expectancy = (winRate / 100) * averageWin - (1 - winRate / 100) * Math.abs(averageLoss);
    
    return {
      totalReturn,
      annualizedReturn,
      cagr: annualizedReturn,
      volatility,
      maxDrawdown,
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(),
      var95: this.calculateVaR(returns, 0.05),
      var99: this.calculateVaR(returns, 0.01),
      sharpeRatio,
      sortinoRatio,
      calmarRatio: maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0,
      omegaRatio: this.calculateOmegaRatio(returns),
      informationRatio: 0, // 繝吶Φ繝√・繝ｼ繧ｯ縺悟ｿ・ｦ・
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      averageTrade,
      expectancy,
      maxConsecutiveWins: this.calculateMaxConsecutive(true),
      maxConsecutiveLosses: this.calculateMaxConsecutive(false),
      avgHoldingPeriod: this.calculateAvgHoldingPeriod(),
      profitToDrawdownRatio: maxDrawdown > 0 ? totalReturn / maxDrawdown : 0,
      returnToRiskRatio: volatility > 0 ? annualizedReturn / volatility : 0,
      ulcerIndex: this.calculateUlcerIndex(),
      skewness: this.calculateSkewness(returns),
      kurtosis: this.calculateKurtosis(returns),
    };
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
  }

  private calculateSharpeRatio(returns: number[], volatility: number): number {
    if (volatility === 0) return 0;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const riskFreeRate = 0.02 / 252; // Daily risk-free rate
    return ((avgReturn - riskFreeRate) / (volatility / 100 / Math.sqrt(252))) * Math.sqrt(252);
  }

  private calculateSortinoRatio(returns: number[]): number {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
    ) * Math.sqrt(252);
    return downsideDeviation === 0 ? 0 : (avgReturn * 252) / downsideDeviation;
  }

  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    let peak = this.equityCurve[0];
    
    for (const equity of this.equityCurve) {
      if (equity > peak) {
        peak = equity;
      }
      const drawdown = (peak - equity) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100;
  }

  private calculateMaxDrawdownDuration(): number {
    let maxDuration = 0;
    let currentDuration = 0;
    let peak = this.equityCurve[0];
    let peakIndex = 0;
    
    for (let i = 1; i < this.equityCurve.length; i++) {
      if (this.equityCurve[i] > peak) {
        peak = this.equityCurve[i];
        peakIndex = i;
        currentDuration = 0;
      } else {
        currentDuration = i - peakIndex;
        if (currentDuration > maxDuration) {
          maxDuration = currentDuration;
        }
      }
    }
    
    return maxDuration;
  }

  private calculateDrawdownCurve(): number[] {
    let peak = this.equityCurve[0];
    return this.equityCurve.map(equity => {
      if (equity > peak) {
        peak = equity;
      }
      return ((peak - equity) / peak) * 100;
    });
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * confidence);
    return Math.abs(sorted[index] || 0) * 100;
  }

  private calculateOmegaRatio(returns: number[]): number {
    const threshold = 0;
    const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + r - threshold, 0);
    const losses = returns.filter(r => r < threshold).reduce((sum, r) => sum + threshold - r, 0);
    return losses === 0 ? gains : gains / losses;
  }

  private calculateMaxConsecutive(wins: boolean): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const trade of this.trades) {
      const isWin = trade.pnl > 0;
      if (isWin === wins) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }

  private calculateAvgHoldingPeriod(): number {
    if (this.trades.length === 0) return 0;
    return this.trades.reduce((sum, t) => sum + t.holdingPeriods, 0) / this.trades.length;
  }

  private calculateUlcerIndex(): number {
    const drawdowns = this.equityCurve.map((equity, i) => {
      const peak = Math.max(...this.equityCurve.slice(0, i + 1));
      return Math.pow((peak - equity) / peak, 2);
    });
    return Math.sqrt(drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length) * 100;
  }

  private calculateSkewness(returns: number[]): number {
    if (returns.length < 3) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
  }

  private calculateKurtosis(returns: number[]): number {
    if (returns.length < 4) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;
  }

  private calculateMonthlyReturns(): Map<string, number> {
    const monthly = new Map<string, number>();
    // 邁｡譏灘ｮ溯｣・ｼ壼ｮ滄圀縺ｫ縺ｯ譌･莉倥↓蝓ｺ縺･縺・※險育ｮ・
    return monthly;
  }

  private calculateYearlyReturns(): Map<string, number> {
    const yearly = new Map<string, number>();
    // 邁｡譏灘ｮ溯｣・ｼ壼ｮ滄圀縺ｫ縺ｯ譌･莉倥↓蝓ｺ縺･縺・※險育ｮ・
    return yearly;
  }

  private calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateRobustnessScore(inSample: BacktestResult, outOfSample: BacktestResult): number {
    const returnRatio = outOfSample.metrics.totalReturn / Math.max(inSample.metrics.totalReturn, 0.01);
    const sharpeRatio = outOfSample.metrics.sharpeRatio / Math.max(inSample.metrics.sharpeRatio, 0.01);
    const winRateRatio = outOfSample.metrics.winRate / Math.max(inSample.metrics.winRate, 1);
    
    const score = (Math.min(returnRatio, 1) + Math.min(sharpeRatio, 1) + Math.min(winRateRatio, 1)) / 3;
    return Math.round(score * 100);
  }

  private calculateParameterStability(inSample: BacktestResult, outOfSample: BacktestResult): number {
    // 繝代Λ繝｡繝ｼ繧ｿ縺ｮ螳牙ｮ壽ｧ繧ｹ繧ｳ繧｢・育ｰ｡譏鍋沿・・
    const drawdownDiff = Math.abs(inSample.metrics.maxDrawdown - outOfSample.metrics.maxDrawdown);
    return Math.max(0, 100 - drawdownDiff * 2);
  }

  private shuffleTrades(trades: BacktestTrade[]): BacktestTrade[] {
    for (let i = trades.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trades[i], trades[j]] = [trades[j], trades[i]];
    }
    return trades;
  }

  private reconstructEquityCurve(trades: BacktestTrade[]): number[] {
    const equity: number[] = [this.config.initialCapital];
    let currentEquity = this.config.initialCapital;
    
    for (const trade of trades) {
      currentEquity += trade.pnl;
      equity.push(currentEquity);
    }
    
    return equity;
  }

  private calculateMetricsFromEquity(equity: number[], trades: BacktestTrade[]): PerformanceMetrics {
    // 邁｡譏鍋沿・壼ｮ滄圀縺ｮ繝｡繝医Μ繧ｯ繧ｹ險育ｮ・
    const returns = equity.slice(1).map((eq, i) => (eq - equity[i]) / equity[i]);
    const totalReturn = ((equity[equity.length - 1] - equity[0]) / equity[0]) * 100;
    
    return {
      totalReturn,
      annualizedReturn: totalReturn,
      cagr: totalReturn,
      volatility: this.calculateVolatility(returns),
      maxDrawdown: this.calculateMaxDrawdownFromEquity(equity),
      maxDrawdownDuration: 0,
      var95: 0,
      var99: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      omegaRatio: 0,
      informationRatio: 0,
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.pnl > 0).length,
      losingTrades: trades.filter(t => t.pnl <= 0).length,
      winRate: trades.length > 0 ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageTrade: trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length : 0,
      expectancy: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      avgHoldingPeriod: 0,
      profitToDrawdownRatio: 0,
      returnToRiskRatio: 0,
      ulcerIndex: 0,
      skewness: 0,
      kurtosis: 0,
    };
  }

  private calculateMaxDrawdownFromEquity(equity: number[]): number {
    let maxDrawdown = 0;
    let peak = equity[0];
    
    for (const eq of equity) {
      if (eq > peak) peak = eq;
      const drawdown = (peak - eq) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown * 100;
  }

  private calculateStrategyScore(metrics: PerformanceMetrics): number {
    // 隍・粋繧ｹ繧ｳ繧｢繝ｪ繝ｳ繧ｰ
    const sharpeScore = Math.max(0, metrics.sharpeRatio) * 10;
    const returnScore = Math.max(0, metrics.totalReturn);
    const drawdownScore = Math.max(0, 100 - metrics.maxDrawdown);
    const winRateScore = metrics.winRate;
    const profitFactorScore = Math.min(metrics.profitFactor, 5) * 10;
    
    return (sharpeScore + returnScore + drawdownScore + winRateScore + profitFactorScore) / 5;
  }

  private logResults(result: BacktestResult): void {
    console.log('\n[WinningBacktestEngine] Backtest Results');
    console.log('========================================');
    console.log(`Final Capital: ${result.finalCapital.toLocaleString()}`);
    console.log(`Total Return: ${result.metrics.totalReturn.toFixed(2)}%`);
    console.log(`Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}`);
    console.log(`Max Drawdown: ${result.metrics.maxDrawdown.toFixed(2)}%`);
    console.log(`Win Rate: ${result.metrics.winRate.toFixed(1)}%`);
    console.log(`Total Trades: ${result.metrics.totalTrades}`);
    console.log(`Profit Factor: ${result.metrics.profitFactor.toFixed(2)}`);
    console.log('========================================\n');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const winningBacktestEngine = new WinningBacktestEngine();
export default WinningBacktestEngine;

// Additional exports for compatibility with BacktestResultsDashboard
export interface WinningAdvancedPerformanceMetrics extends PerformanceMetrics {
  alpha: number;
  beta: number;
  trackingError: number;
  informationRatio: number;
  treynorRatio: number;
}

export interface WinningAdvancedMetrics {
  regimePerformance: Map<string, PerformanceMetrics>;
  monthlyReturns: number[];
  rollingSharpe: number[];
  rollingDrawdown: number[];
}

export interface WinningDrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownDuration: number;
  averageDrawdown: number;
  drawdownRecoveryTime: number;
  underwaterCurve: number[];
}

export interface WinningTradeAnalysis {
  bestTrade: BacktestTrade | null;
  worstTrade: BacktestTrade | null;
  averageHoldingPeriod: number;
  profitDistribution: number[];
  lossDistribution: number[];
}

export interface WinningReturnDistribution {
  returns: number[];
  bins: number[];
  frequencies: number[];
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
}


