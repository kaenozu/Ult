import { EventEmitter } from 'events';
import { OHLCV, BacktestResult, BacktestTrade } from '@/app/types';
import { RSI_CONFIG } from '@/app/constants';
import { createSingleton } from '../../utils/singleton';
import {
  MultiAssetBacktestConfig,
  PortfolioPosition,
  PortfolioSnapshot,
  CorrelationMatrix,
  RebalanceEvent,
  RebalanceTrade,
  MultiAssetBacktestResult,
  PortfolioPerformanceMetrics,
} from './types';
import {
  DEFAULT_PORTFOLIO_CONFIG,
  DEFAULT_MULTI_ASSET_CONFIG,
} from './constants';
import {
  buildCorrelationMatrix,
  calculatePortfolioMetrics,
  generateSignal,
  runIndividualBacktest,
} from './PortfolioCalculator';

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

  loadData(symbol: string, data: OHLCV[]): void {
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

  async runBacktest(): Promise<MultiAssetBacktestResult> {
    for (const symbol of this.config.symbols) {
      if (!this.data.has(symbol) || this.data.get(symbol)!.length === 0) {
        throw new Error(`No data loaded for symbol: ${symbol}`);
      }
    }

    this.resetState();
    this.correlationMatrix = buildCorrelationMatrix(this.config.symbols, this.data);
    const allDates = this.getAllDates();

    for (let i = 0; i < allDates.length; i++) {
      const currentDate = allDates[i];

      this.updatePositions(currentDate);
      await this.processSignals(currentDate, i);

      if (this.shouldRebalance(currentDate, i)) {
        this.rebalancePortfolio(currentDate);
      }

      this.recordSnapshot(currentDate);

      this.emit('progress', {
        current: i + 1,
        total: allDates.length,
        date: currentDate,
        portfolioValue: this.portfolioValue,
      });
    }

    const metrics = calculatePortfolioMetrics(
      this.snapshots,
      this.trades,
      this.correlationMatrix,
      this.positions,
      this.rebalanceEvents,
      this.config.symbols.length
    );

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

  private getAllDates(): string[] {
    const dateSet = new Set<string>();

    for (const data of this.data.values()) {
      for (const candle of data) {
        dateSet.add(candle.date);
      }
    }

    return Array.from(dateSet).sort();
  }

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

    for (const position of this.positions.values()) {
      position.weight = this.portfolioValue > 0 ? (position.marketValue / this.portfolioValue) * 100 : 0;
    }
  }

  private async processSignals(date: string, index: number): Promise<void> {
    for (const symbol of this.config.symbols) {
      const data = this.data.get(symbol);
      if (!data) continue;

      const candleIndex = data.findIndex(d => d.date === date);
      if (candleIndex < this.config.strategy.smaPeriod + 10) continue;

      const historicalData = data.slice(0, candleIndex + 1);
      const signal = generateSignal(
        historicalData,
        this.config.strategy.rsiPeriod,
        this.config.strategy.smaPeriod
      );

      if (signal === 'BUY' && !this.positions.has(symbol)) {
        if (this.canAddPosition(symbol)) {
          await this.openPosition(symbol, data[candleIndex]);
        }
      } else if (signal === 'SELL' && this.positions.has(symbol)) {
        await this.closePosition(symbol, data[candleIndex], 'signal');
      }
    }
  }

  private canAddPosition(newSymbol: string): boolean {
    if (this.positions.size >= this.config.portfolio.maxPositions) {
      return false;
    }

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

  private async closePosition(symbol: string, candle: OHLCV, reason: string): Promise<void> {
    const position = this.positions.get(symbol);
    if (!position) return;

    const proceeds = position.quantity * candle.close;
    const pnl = proceeds - (position.entryPrice * position.quantity);
    const pnlPercent = (pnl / (position.entryPrice * position.quantity)) * 100;

    this.cash += proceeds;

    const trade: BacktestTrade = {
      symbol,
      type: 'BUY',
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

  private calculatePositionSize(): number {
    const portfolio = this.config.portfolio;

    if (portfolio.useEqualWeight) {
      return this.portfolioValue / portfolio.maxPositions;
    }

    if (portfolio.useRiskParity) {
      return this.portfolioValue / portfolio.maxPositions;
    }

    return this.portfolioValue * (portfolio.maxPositionSize / 100);
  }

  private shouldRebalance(date: string, index: number): boolean {
    if (this.config.portfolio.rebalanceFrequency === 'none') {
      return false;
    }

    for (const position of this.positions.values()) {
      const targetWeight = 100 / this.config.portfolio.maxPositions;
      const deviation = Math.abs(position.weight - targetWeight);

      if (deviation > this.config.portfolio.rebalanceThreshold) {
        return true;
      }
    }

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

  private rebalancePortfolio(date: string): void {
    const targetWeight = 100 / this.config.portfolio.maxPositions;
    const trades: RebalanceTrade[] = [];
    const beforeWeights = new Map<string, number>();

    for (const [symbol, position] of this.positions) {
      beforeWeights.set(symbol, position.weight);
    }

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

          if (diff > 0) {
            const cost = quantity * candle.close;
            if (this.cash >= cost) {
              this.cash -= cost;
              position.quantity += quantity;
            }
          } else {
            const proceeds = quantity * candle.close;
            this.cash += proceeds;
            position.quantity -= quantity;
          }
        }
      }
    }

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

  private async runIndividualBacktests(): Promise<Map<string, BacktestResult>> {
    const results = new Map<string, BacktestResult>();

    for (const symbol of this.config.symbols) {
      const data = this.data.get(symbol);
      if (!data) continue;

      const result = await runIndividualBacktest(
        symbol,
        data,
        this.config.strategy.rsiPeriod,
        this.config.strategy.smaPeriod
      );
      results.set(symbol, result);
    }

    return results;
  }

  private resetState(): void {
    this.positions.clear();
    this.cash = this.config.portfolio.initialCapital;
    this.portfolioValue = this.config.portfolio.initialCapital;
    this.snapshots = [];
    this.rebalanceEvents = [];
    this.trades = [];
  }
}

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<MultiAssetBacktestConfig>) => new MultiAssetBacktestEngine(config)
);

export const getGlobalMultiAssetBacktestEngine = getInstance;
export const resetGlobalMultiAssetBacktestEngine = resetInstance;

export default MultiAssetBacktestEngine;
