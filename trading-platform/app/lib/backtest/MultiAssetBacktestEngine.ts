/**
 * MultiAssetBacktestEngine.ts
 *
 * マルチアセットバックテストエンジン
 * 複数銘柄同時のバックテスト、ポートフォリオレベルのパフォーマンス計算、
 * 資産間の相関を考慮したリスク評価、リバランス戦略のシミュレーションを提供します。
 */

import { EventEmitter } from 'events';
import { OHLCV, BacktestResult, BacktestTrade } from '@/app/types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { 
  RSI_CONFIG, 
  SMA_CONFIG, 
  BACKTEST_CONFIG,
  RISK_MANAGEMENT 
} from '@/app/constants';

// ============================================================================
// Types
// ============================================================================

export interface PortfolioConfig {
  initialCapital: number;
  maxPositions: number;
  maxPositionSize: number; // percentage of portfolio
  minPositionSize: number; // percentage of portfolio
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'none';
  rebalanceThreshold: number; // percentage deviation to trigger rebalance
  correlationThreshold: number; // max correlation between positions
  useEqualWeight: boolean;
  useRiskParity: boolean;
}

export interface MultiAssetBacktestConfig {
  symbols: string[];
  startDate: string;
  endDate: string;
  portfolio: PortfolioConfig;
  strategy: {
    rsiPeriod: number;
    smaPeriod: number;
    useTrailingStop: boolean;
    trailingStopPercent: number;
  };
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  weight: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  entryDate: string;
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  cash: number;
  positions: PortfolioPosition[];
  weights: Map<string, number>;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

export interface RebalanceEvent {
  date: string;
  reason: 'scheduled' | 'threshold' | 'signal';
  trades: RebalanceTrade[];
  beforeWeights: Map<string, number>;
  afterWeights: Map<string, number>;
}

export interface RebalanceTrade {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  value: number;
}

export interface MultiAssetBacktestResult {
  config: MultiAssetBacktestConfig;
  portfolioSnapshots: PortfolioSnapshot[];
  individualResults: Map<string, BacktestResult>;
  correlationMatrix: CorrelationMatrix;
  rebalanceEvents: RebalanceEvent[];
  metrics: PortfolioPerformanceMetrics;
  trades: BacktestTrade[];
  startDate: string;
  endDate: string;
}

export interface PortfolioPerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
  totalTrades: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  trackingError: number;
  diversificationRatio: number;
  concentrationRisk: number;
  turnoverRate: number;
  // 月次/年次パフォーマンス
  monthlyReturns: MonthlyReturn[];
  yearlyReturns: YearlyReturn[];
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
  trades: number;
}

export interface YearlyReturn {
  year: number;
  return: number;
  trades: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PORTFOLIO_CONFIG: PortfolioConfig = {
  initialCapital: 100000,
  maxPositions: 10,
  maxPositionSize: 20, // 20%
  minPositionSize: 5,  // 5%
  rebalanceFrequency: 'monthly',
  rebalanceThreshold: 5, // 5% deviation triggers rebalance
  correlationThreshold: 0.8,
  useEqualWeight: false,
  useRiskParity: true,
};

export const DEFAULT_MULTI_ASSET_CONFIG: MultiAssetBacktestConfig = {
  symbols: [],
  startDate: '',
  endDate: '',
  portfolio: DEFAULT_PORTFOLIO_CONFIG,
  strategy: {
    rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD,
    smaPeriod: SMA_CONFIG.MEDIUM_PERIOD,
    useTrailingStop: true,
    trailingStopPercent: 5,
  },
};

// ============================================================================
// Multi-Asset Backtest Engine
// ============================================================================

export class MultiAssetBacktestEngine extends EventEmitter {
  private config: MultiAssetBacktestConfig;
  private data: Map<string, OHLCV[]> = new Map();
  private positions: Map<string, PortfolioPosition> = new Map();
  private cash: number = 0;
  private portfolioValue: number = 0;
  private snapshots: PortfolioSnapshot[] = [];
  private rebalanceEvents: RebalanceEvent[] = [];
  private trades: BacktestTrade[] = [];
  private correlationMatrix: CorrelationMatrix = { symbols: [], matrix: [] };

  constructor(config: Partial<MultiAssetBacktestConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MULTI_ASSET_CONFIG, ...config };
    this.cash = this.config.portfolio.initialCapital;
    this.portfolioValue = this.config.portfolio.initialCapital;
  }

  /**
   * データをロード
   */
  loadData(symbol: string, data: OHLCV[]): void {
    // Filter data by date range if specified
    let filteredData = data;
    if (this.config.startDate) {
      filteredData = filteredData.filter(d => d.date >= this.config.startDate);
    }
    if (this.config.endDate) {
      filteredData = filteredData.filter(d => d.date <= this.config.endDate);
    }
    this.data.set(symbol, filteredData);
    this.emit('data_loaded', symbol, filteredData.length);
  }

  /**
   * マルチアセットバックテストを実行
   */
  async runBacktest(): Promise<MultiAssetBacktestResult> {
    
    // Validate data
    for (const symbol of this.config.symbols) {
      if (!this.data.has(symbol) || this.data.get(symbol)!.length === 0) {
        throw new Error(`No data loaded for symbol: ${symbol}`);
      }
    }

    // Reset state
    this.resetState();

    // Calculate correlation matrix
    this.correlationMatrix = this.calculateCorrelationMatrix();

    // Get all unique dates
    const allDates = this.getAllDates();
    
    // Run simulation
    for (let i = 0; i < allDates.length; i++) {
      const currentDate = allDates[i];
      
      // Update positions with current prices
      this.updatePositions(currentDate);
      
      // Check for signals and execute trades
      await this.processSignals(currentDate, i);
      
      // Check for rebalancing
      if (this.shouldRebalance(currentDate, i)) {
        this.rebalancePortfolio(currentDate);
      }
      
      // Record snapshot
      this.recordSnapshot(currentDate);
      
      // Emit progress
      this.emit('progress', {
        current: i + 1,
        total: allDates.length,
        date: currentDate,
        portfolioValue: this.portfolioValue,
      });
    }

    // Calculate final metrics
    const metrics = this.calculatePortfolioMetrics();

    // Run individual backtests for comparison
    const individualResults = await this.runIndividualBacktests();

    const result: MultiAssetBacktestResult = {
      config: this.config,
      portfolioSnapshots: this.snapshots,
      individualResults,
      correlationMatrix: this.correlationMatrix,
      rebalanceEvents: this.rebalanceEvents,
      metrics,
      trades: this.trades,
      startDate: allDates[0],
      endDate: allDates[allDates.length - 1],
    };

    this.emit('backtest_complete', result);
    return result;
  }

  /**
   * 相関行列を計算
   */
  private calculateCorrelationMatrix(): CorrelationMatrix {
    const symbols = this.config.symbols;
    const returns: Map<string, number[]> = new Map();

    // Calculate daily returns for each symbol
    for (const symbol of symbols) {
      const data = this.data.get(symbol)!;
      const symbolReturns: number[] = [];
      
      for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close;
        symbolReturns.push(dailyReturn);
      }
      
      returns.set(symbol, symbolReturns);
    }

    // Calculate correlation matrix
    const matrix: number[][] = [];
    
    for (let i = 0; i < symbols.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < symbols.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this.calculateCorrelation(
            returns.get(symbols[i])!,
            returns.get(symbols[j])!
          );
        }
      }
    }

    return { symbols, matrix };
  }

  /**
   * 2つの配列の相関係数を計算
   */
  private calculateCorrelation(x: number[], y: number[]): number {
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

  /**
   * 全シンボルの日付を取得
   */
  private getAllDates(): string[] {
    const dateSet = new Set<string>();
    
    for (const data of this.data.values()) {
      for (const candle of data) {
        dateSet.add(candle.date);
      }
    }
    
    return Array.from(dateSet).sort();
  }

  /**
   * ポジションを更新
   */
  private updatePositions(date: string): void {
    this.portfolioValue = this.cash;

    for (const [symbol, position] of this.positions) {
      const data = this.data.get(symbol);
      if (!data) continue;

      const candle = data.find(d => d.date === date);
      if (candle) {
        position.currentPrice = candle.close;
        position.marketValue = position.quantity * candle.close;
        position.unrealizedPnL = position.marketValue - (position.entryPrice * position.quantity);
        position.unrealizedPnLPercent = (position.unrealizedPnL / (position.entryPrice * position.quantity)) * 100;
        
        this.portfolioValue += position.marketValue;
      }
    }

    // Update weights
    for (const position of this.positions.values()) {
      position.weight = this.portfolioValue > 0 ? (position.marketValue / this.portfolioValue) * 100 : 0;
    }
  }

  /**
   * シグナルを処理
   */
  private async processSignals(date: string, index: number): Promise<void> {
    for (const symbol of this.config.symbols) {
      const data = this.data.get(symbol);
      if (!data) continue;

      const candleIndex = data.findIndex(d => d.date === date);
      if (candleIndex < this.config.strategy.smaPeriod + 10) continue;

      const historicalData = data.slice(0, candleIndex + 1);
      const signal = this.generateSignal(symbol, historicalData);

      if (signal === 'BUY' && !this.positions.has(symbol)) {
        // Check correlation with existing positions
        if (this.canAddPosition(symbol)) {
          await this.openPosition(symbol, data[candleIndex]);
        }
      } else if (signal === 'SELL' && this.positions.has(symbol)) {
        await this.closePosition(symbol, data[candleIndex], 'signal');
      }
    }
  }

  /**
   * シグナルを生成
   */
  private generateSignal(symbol: string, data: OHLCV[]): 'BUY' | 'SELL' | 'HOLD' {
    const closes = data.map(d => d.close);
    const rsi = technicalIndicatorService.calculateRSI(closes, this.config.strategy.rsiPeriod);
    const sma = technicalIndicatorService.calculateSMA(closes, this.config.strategy.smaPeriod);

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

  /**
   * ポジションを追加可能かチェック
   */
  private canAddPosition(newSymbol: string): boolean {
    if (this.positions.size >= this.config.portfolio.maxPositions) {
      return false;
    }

    // Check correlation with existing positions
    const newSymbolIndex = this.config.symbols.indexOf(newSymbol);
    
    for (const existingSymbol of this.positions.keys()) {
      const existingIndex = this.config.symbols.indexOf(existingSymbol);
      const correlation = this.correlationMatrix.matrix[newSymbolIndex]?.[existingIndex] ?? 0;
      
      if (Math.abs(correlation) > this.config.portfolio.correlationThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * ポジションを開く
   */
  private async openPosition(symbol: string, candle: OHLCV): Promise<void> {
    const positionSize = this.calculatePositionSize();
    const quantity = Math.floor(positionSize / candle.close);
    
    if (quantity <= 0) return;

    const cost = quantity * candle.close;
    if (cost > this.cash) return;

    this.cash -= cost;

    const position: PortfolioPosition = {
      symbol,
      quantity,
      entryPrice: candle.close,
      currentPrice: candle.close,
      marketValue: cost,
      weight: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      entryDate: candle.date,
    };

    this.positions.set(symbol, position);
    this.emit('position_opened', position);
  }

  /**
   * ポジションを閉じる
   */
  private async closePosition(symbol: string, candle: OHLCV, reason: string): Promise<void> {
    const position = this.positions.get(symbol);
    if (!position) return;

    const proceeds = position.quantity * candle.close;
    const pnl = proceeds - (position.entryPrice * position.quantity);
    const pnlPercent = (pnl / (position.entryPrice * position.quantity)) * 100;

    this.cash += proceeds;

    const trade: BacktestTrade = {
      symbol,
      type: 'BUY', // Assuming long positions for simplicity
      entryPrice: position.entryPrice,
      exitPrice: candle.close,
      entryDate: position.entryDate,
      exitDate: candle.date,
      profitPercent: parseFloat(pnlPercent.toFixed(2)),
      reason,
      exitReason: reason,
    };

    this.trades.push(trade);
    this.positions.delete(symbol);
    this.emit('position_closed', trade);
  }

  /**
   * ポジションサイズを計算
   */
  private calculatePositionSize(): number {
    const portfolio = this.config.portfolio;
    
    if (portfolio.useEqualWeight) {
      return this.portfolioValue / portfolio.maxPositions;
    }
    
    if (portfolio.useRiskParity) {
      // Risk parity: allocate based on inverse volatility
      // Simplified version: equal weight for now
      return this.portfolioValue / portfolio.maxPositions;
    }
    
    // Default: use max position size
    return this.portfolioValue * (portfolio.maxPositionSize / 100);
  }

  /**
   * リバランスが必要かチェック
   */
  private shouldRebalance(date: string, index: number): boolean {
    if (this.config.portfolio.rebalanceFrequency === 'none') {
      return false;
    }

    // Check threshold-based rebalance
    for (const position of this.positions.values()) {
      const targetWeight = 100 / this.config.portfolio.maxPositions;
      const deviation = Math.abs(position.weight - targetWeight);
      
      if (deviation > this.config.portfolio.rebalanceThreshold) {
        return true;
      }
    }

    // Check scheduled rebalance
    if (index === 0) return false;

    const prevDate = this.snapshots[this.snapshots.length - 1]?.date;
    if (!prevDate) return false;

    const current = new Date(date);
    const previous = new Date(prevDate);

    switch (this.config.portfolio.rebalanceFrequency) {
      case 'daily':
        return current.getDate() !== previous.getDate();
      case 'weekly':
        return current.getDay() < previous.getDay();
      case 'monthly':
        return current.getMonth() !== previous.getMonth();
      default:
        return false;
    }
  }

  /**
   * ポートフォリオをリバランス
   */
  private rebalancePortfolio(date: string): void {
    const targetWeight = 100 / this.config.portfolio.maxPositions;
    const trades: RebalanceTrade[] = [];
    const beforeWeights = new Map<string, number>();
    
    // Record before weights
    for (const [symbol, position] of this.positions) {
      beforeWeights.set(symbol, position.weight);
    }

    // Calculate target values
    for (const [symbol, position] of this.positions) {
      const targetValue = this.portfolioValue * (targetWeight / 100);
      const currentValue = position.marketValue;
      const diff = targetValue - currentValue;

      if (Math.abs(diff) > this.config.portfolio.rebalanceThreshold * this.portfolioValue / 100) {
        const data = this.data.get(symbol);
        if (!data) continue;

        const candle = data.find(d => d.date === date);
        if (!candle) continue;

        const quantity = Math.floor(Math.abs(diff) / candle.close);
        
        if (quantity > 0) {
          trades.push({
            symbol,
            action: diff > 0 ? 'BUY' : 'SELL',
            quantity,
            price: candle.close,
            value: quantity * candle.close,
          });

          // Update position
          if (diff > 0) {
            // Buy more
            const cost = quantity * candle.close;
            if (this.cash >= cost) {
              this.cash -= cost;
              position.quantity += quantity;
            }
          } else {
            // Sell some
            const proceeds = quantity * candle.close;
            this.cash += proceeds;
            position.quantity -= quantity;
          }
        }
      }
    }

    // Record after weights
    const afterWeights = new Map<string, number>();
    for (const [symbol, position] of this.positions) {
      afterWeights.set(symbol, position.weight);
    }

    if (trades.length > 0) {
      this.rebalanceEvents.push({
        date,
        reason: 'threshold',
        trades,
        beforeWeights,
        afterWeights,
      });
    }
  }

  /**
   * スナップショットを記録
   */
  private recordSnapshot(date: string): void {
    const snapshot: PortfolioSnapshot = {
      date,
      totalValue: this.portfolioValue,
      cash: this.cash,
      positions: Array.from(this.positions.values()),
      weights: new Map(),
    };

    for (const [symbol, position] of this.positions) {
      snapshot.weights.set(symbol, position.weight);
    }

    this.snapshots.push(snapshot);
  }

  /**
   * ポートフォリオメトリクスを計算
   */
  private calculatePortfolioMetrics(): PortfolioPerformanceMetrics {
    const values = this.snapshots.map(s => s.totalValue);
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

    // Max drawdown
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

    // Trade metrics
    const winningTrades = this.trades.filter(t => (t.profitPercent || 0) > 0);
    const losingTrades = this.trades.filter(t => (t.profitPercent || 0) <= 0);
    const winRate = this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const averageTrade = this.trades.length > 0 
      ? this.trades.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / this.trades.length
      : 0;

    // Monthly and yearly returns
    const monthlyReturns = this.calculateMonthlyReturns();
    const yearlyReturns = this.calculateYearlyReturns();

    // Diversification metrics
    const avgCorrelation = this.calculateAverageCorrelation();
    const diversificationRatio = 1 - avgCorrelation;
    
    // Concentration risk (Herfindahl index)
    const weights = Array.from(this.positions.values()).map(p => p.weight / 100);
    const concentrationRisk = weights.reduce((sum, w) => sum + w * w, 0);

    // Turnover rate (simplified)
    const turnoverRate = this.rebalanceEvents.length > 0 
      ? (this.rebalanceEvents.reduce((sum, e) => sum + e.trades.length, 0) / this.config.symbols.length) * 100
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
      totalTrades: this.trades.length,
      beta: 0, // Would require benchmark data
      alpha: 0, // Would require benchmark data
      informationRatio: 0, // Would require benchmark data
      trackingError: 0, // Would require benchmark data
      diversificationRatio: parseFloat(diversificationRatio.toFixed(2)),
      concentrationRisk: parseFloat(concentrationRisk.toFixed(2)),
      turnoverRate: parseFloat(turnoverRate.toFixed(2)),
      monthlyReturns,
      yearlyReturns,
    };
  }

  /**
   * 月次リターンを計算
   */
  private calculateMonthlyReturns(): MonthlyReturn[] {
    const monthlyMap = new Map<string, { return: number; trades: number }>();

    for (let i = 1; i < this.snapshots.length; i++) {
      const current = this.snapshots[i];
      const previous = this.snapshots[i - 1];
      const date = new Date(current.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { return: 0, trades: 0 });
      }

      const data = monthlyMap.get(key)!;
      data.return += (current.totalValue - previous.totalValue) / previous.totalValue;
    }

    // Count trades per month
    for (const trade of this.trades) {
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

  /**
   * 年次リターンを計算
   */
  private calculateYearlyReturns(): YearlyReturn[] {
    const yearlyMap = new Map<number, { return: number; trades: number }>();

    for (let i = 1; i < this.snapshots.length; i++) {
      const current = this.snapshots[i];
      const previous = this.snapshots[i - 1];
      const year = new Date(current.date).getFullYear();

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { return: 0, trades: 0 });
      }

      const data = yearlyMap.get(year)!;
      data.return += (current.totalValue - previous.totalValue) / previous.totalValue;
    }

    // Count trades per year
    for (const trade of this.trades) {
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

  /**
   * 平均相関を計算
   */
  private calculateAverageCorrelation(): number {
    const matrix = this.correlationMatrix.matrix;
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

  /**
   * 個別バックテストを実行
   */
  private async runIndividualBacktests(): Promise<Map<string, BacktestResult>> {
    const results = new Map<string, BacktestResult>();

    for (const symbol of this.config.symbols) {
      const data = this.data.get(symbol);
      if (!data) continue;

      // Use OptimizedAccuracyService logic for individual backtest
      const trades: BacktestTrade[] = [];
      let currentPosition: { type: 'BUY' | 'SELL'; price: number; date: string } | null = null;

      const closes = data.map(d => d.close);
      const rsiValues = technicalIndicatorService.calculateRSI(closes, this.config.strategy.rsiPeriod);
      const smaValues = technicalIndicatorService.calculateSMA(closes, this.config.strategy.smaPeriod);

      const minPeriod = Math.max(this.config.strategy.rsiPeriod, this.config.strategy.smaPeriod) + 10;

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

      // Calculate stats
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

      // Max drawdown
      let peak = 0;
      let maxDrawdown = 0;
      let equity = 100;

      for (const trade of trades) {
        equity *= (1 + (trade.profitPercent || 0) / 100);
        if (equity > peak) peak = equity;
        const drawdown = (peak - equity) / peak * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      // Sharpe ratio
      const returns = trades.map(t => t.profitPercent || 0);
      const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
      const variance = returns.length > 0
        ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
        : 0;
      const stdDev = Math.sqrt(variance);
      const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

      const result: BacktestResult = {
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

      results.set(symbol, result);
    }

    return results;
  }

  /**
   * 状態をリセット
   */
  private resetState(): void {
    this.positions.clear();
    this.cash = this.config.portfolio.initialCapital;
    this.portfolioValue = this.config.portfolio.initialCapital;
    this.snapshots = [];
    this.rebalanceEvents = [];
    this.trades = [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<MultiAssetBacktestConfig>) => new MultiAssetBacktestEngine(config)
);

export const getGlobalMultiAssetBacktestEngine = getInstance;
export const resetGlobalMultiAssetBacktestEngine = resetInstance;

export default MultiAssetBacktestEngine;
