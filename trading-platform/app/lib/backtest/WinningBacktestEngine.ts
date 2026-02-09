/**
 * WinningBacktestEngine.ts
 * 
 * 株取引で勝つための包括的バックテストエンジン
 * 
 * 【機能】
 * - 複数戦略のバックテスト
 * - ウォークフォワード分析
 * - モンテカルロシミュレーション
 * - 詳細なパフォーマンス指標
 * - 取引コスト・スリッページ考慮
 */


import { OHLCV } from '@/app/types';
import type { StrategyResult } from '../strategies/WinningStrategyEngine';
import type { PositionSizingResult } from '../risk/AdvancedRiskManager';
import { BACKTEST_DEFAULTS } from '../constants/backtest-config';

// ============================================================================
// Types
// ============================================================================

/**
 * Open position in backtest
 */
export interface BacktestPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryDate: string;
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  strategy: string;
  trailingStop?: number;
}

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
  holdingPeriods: number; // 保有期間（足数）
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
  // リターンメトリクス
  totalReturn: number; // %
  annualizedReturn: number; // %
  cagr: number; // Compound Annual Growth Rate

  // リスクメトリクス
  volatility: number; // % annualized
  maxDrawdown: number; // %
  maxDrawdownDuration: number; // days
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%

  // リスク調整リターンメトリクス
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio: number;
  informationRatio: number;

  // 取引メトリクス
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

  // 連続メトリクス
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldingPeriod: number; // periods

  // 効率メトリクス
  profitToDrawdownRatio: number;
  returnToRiskRatio: number;
  ulcerIndex: number;

  // 分布メトリクス
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

export interface WinningMonteCarloResult {
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
  initialCapital: BACKTEST_DEFAULTS.LARGE_INITIAL_CAPITAL, // 100万円
  commission: BACKTEST_DEFAULTS.DEFAULT_COMMISSION, // 0.1%
  slippage: 0.05, // 0.05% - model-specific
  spread: BACKTEST_DEFAULTS.DEFAULT_SPREAD,
  maxPositionSize: BACKTEST_DEFAULTS.MAX_POSITION_SIZE, // 20%
  maxDrawdown: BACKTEST_DEFAULTS.CONSERVATIVE_MAX_DRAWDOWN, // 20%
  allowShort: BACKTEST_DEFAULTS.ALLOW_SHORT, // 現物取引のみ
  useStopLoss: true,
  useTakeProfit: true,
  riskPerTrade: 2, // 2% - strategy-specific
  maxOpenPositions: 5,
  rebalanceFrequency: 'daily',
};

// ============================================================================
// Winning Backtest Engine
// ============================================================================

interface TradePosition {
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  entryDate: string;
  entryIndex: number;
  stopLoss?: number;
  takeProfit?: number;
  strategy: string;
  riskRewardRatio: number;
}

class WinningBacktestEngine {
  private config: BacktestConfig;
  private trades: BacktestTrade[] = [];
  private equityCurve: number[] = [];
  private currentEquity: number = 0;
  private peakEquity: number = 0;
  private openPositions: Map<string, TradePosition> = new Map();

  constructor(config: Partial<BacktestConfig> = {}) {
    this.config = { ...DEFAULT_BACKTEST_CONFIG, ...config };
    this.currentEquity = this.config.initialCapital;
    this.peakEquity = this.config.initialCapital;
  }

  /**
   * 単一戦略のバックテストを実行
   */
  runBacktest(
    strategyResults: StrategyResult[],
    data: OHLCV[],
    symbol: string
  ): BacktestResult {
    this.reset();


    // 戦略結果と価格データを同期
    const alignedData = this.alignDataWithSignals(data, strategyResults);

    for (let i = 50; i < alignedData.length; i++) {
      const current = alignedData[i];
      const signal = current.signal;

      // 現在のポジションをチェック
      const currentPosition = this.openPositions.get(symbol);

      // イグジット条件をチェック
      if (currentPosition) {
        const exitCheck = this.checkExitConditions(currentPosition, current, i);
        if (exitCheck.shouldExit) {
          this.closePosition(currentPosition, current, exitCheck.reason, i);
          this.openPositions.delete(symbol);
        }
      }

      // エントリーシグナルをチェック
      if (!this.openPositions.has(symbol) && signal && signal.signal !== 'HOLD') {
        const canEnter = this.canOpenPosition(symbol);
        if (canEnter) {
          this.openPosition(signal, current, symbol, i);
        }
      }

      // エクイティカーブを更新
      this.updateEquity();

      // 最大ドローダウンチェック
      if (this.calculateCurrentDrawdown() > this.config.maxDrawdown) {
        break;
      }
    }

    // 未決済ポジションを決済
    this.closeAllPositions(alignedData);

    // メトリクスを計算
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
   * ウォークフォワード分析を実行
   */
  runWalkForwardAnalysis(
    strategyResults: StrategyResult[],
    data: OHLCV[],
    symbol: string,
    trainSize: number = 252, // 1年
    testSize: number = 63 // 3ヶ月
  ): WalkForwardResult[] {
    const results: WalkForwardResult[] = [];
    let startIndex = 0;

    while (startIndex + trainSize + testSize <= data.length) {
      // In-Sample期間（パラメータ最適化）
      const trainData = data.slice(startIndex, startIndex + trainSize);
      const trainSignals = strategyResults.slice(startIndex, startIndex + trainSize);
      const inSampleResult = this.runBacktest(trainSignals, trainData, `${symbol}_train`);

      // Out-of-Sample期間（検証）
      const testData = data.slice(startIndex + trainSize, startIndex + trainSize + testSize);
      const testSignals = strategyResults.slice(startIndex + trainSize, startIndex + trainSize + testSize);
      const outOfSampleResult = this.runBacktest(testSignals, testData, `${symbol}_test`);

      // ロバストネススコアを計算
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
   * モンテカルロシミュレーションを実行
   */
  runMonteCarloSimulation(
    originalResult: BacktestResult,
    numSimulations: number = 1000
  ): WinningMonteCarloResult {
    const simulations: BacktestResult[] = [];

    for (let i = 0; i < numSimulations; i++) {
      // トレードをランダムにシャッフル
      const shuffledTrades = this.shuffleTrades([...originalResult.trades]);

      // 新しいエクイティカーブを構築
      const simulatedEquity = this.reconstructEquityCurve(shuffledTrades);

      // シミュレーション結果を作成
      const simulatedResult: BacktestResult = {
        ...originalResult,
        trades: shuffledTrades,
        equityCurve: simulatedEquity,
        metrics: this.calculateMetricsFromEquity(simulatedEquity, shuffledTrades),
      };

      simulations.push(simulatedResult);
    }

    // 確率を計算
    const profitableSimulations = simulations.filter(s => s.metrics.totalReturn > 0).length;
    const drawdownSimulations = simulations.filter(
      s => s.metrics.maxDrawdown > this.config.maxDrawdown
    ).length;

    // 信頼区間を計算
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
   * 複数戦略を比較
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
    // データとシグナルをインデックスで整列
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
    const price = this.applySlippage(data.close, 'BUY');
    const quantity = this.calculatePositionSize(price, signal.stopLoss);

    // signal.signalが'HOLD'の場合はポジションを開かない
    if (signal.signal === 'HOLD') {
      return;
    }

    this.openPositions.set(symbol, {
      symbol,
      side: signal.signal as 'BUY' | 'SELL',
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
    position: TradePosition,
    data: OHLCV,
    reason: string,
    index: number
  ): void {
    const exitPrice = this.applySlippage(data.close, 'SELL');
    const entryValue = position.entryPrice * position.quantity;
    const exitValue = exitPrice * position.quantity;

    // P&L計算
    let pnl = 0;
    if (position.side === 'BUY') {
      pnl = (exitPrice - position.entryPrice) * position.quantity;
    } else {
      pnl = (position.entryPrice - exitPrice) * position.quantity;
    }

    // 手数料とスリッページ
    const fees = (entryValue + exitValue) * (this.config.commission / 100);
    const slippage = (entryValue + exitValue) * (this.config.slippage / 100);
    pnl -= (fees + slippage);

    const pnlPercent = (pnl / entryValue) * 100;

    // エクイティを更新
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
      exitReason: reason as 'target' | 'stop' | 'signal' | 'trailing_stop' | 'time' | 'end_of_data',
      strategy: position.strategy,
      riskRewardRatio: position.riskRewardRatio,
      holdingPeriods: index - position.entryIndex,
    };

    this.trades.push(trade);
  }

  private checkExitConditions(
    position: TradePosition,
    data: OHLCV,
    index: number
  ): { shouldExit: boolean; reason: string } {
    // ストップロスチェック
    if (this.config.useStopLoss && position.stopLoss) {
      if (position.side === 'BUY' && data.low <= position.stopLoss) {
        return { shouldExit: true, reason: 'stop' };
      }
      if (position.side === 'SELL' && data.high >= position.stopLoss) {
        return { shouldExit: true, reason: 'stop' };
      }
    }

    // テイクプロフィットチェック
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
      informationRatio: 0, // ベンチマークが必要
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
    // 簡易実装：実際には日付に基づいて計算
    return monthly;
  }

  private calculateYearlyReturns(): Map<string, number> {
    const yearly = new Map<string, number>();
    // 簡易実装：実際には日付に基づいて計算
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
    // パラメータの安定性スコア（簡易版）
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
    // 簡易版：実際のメトリクス計算
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
    // 複合スコアリング
    const sharpeScore = Math.max(0, metrics.sharpeRatio) * 10;
    const returnScore = Math.max(0, metrics.totalReturn);
    const drawdownScore = Math.max(0, 100 - metrics.maxDrawdown);
    const winRateScore = metrics.winRate;
    const profitFactorScore = Math.min(metrics.profitFactor, 5) * 10;

    return (sharpeScore + returnScore + drawdownScore + winRateScore + profitFactorScore) / 5;
  }

  private logResults(result: BacktestResult): void {
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
