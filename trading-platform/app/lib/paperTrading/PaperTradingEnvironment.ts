/**
 * PaperTradingEnvironment.ts
 * 
 * ペーパートレーディング環境。リアルタイム市場データを使用した
 * シミュレーション取引で戦略を検証できます。
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface PaperPosition {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  entryTime: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PaperTrade {
  id: string;
  positionId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price: number;
  totalValue: number;
  fees: number;
  timestamp: number;
  status: 'pending' | 'filled' | 'partial' | 'cancelled';
}

export interface PaperPortfolio {
  cash: number;
  initialCapital: number;
  positions: PaperPosition[];
  closedTrades: ClosedTrade[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  buyingPower: number;
  marginUsed: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: number;
  exitTime: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  fees: number;
  exitReason: 'manual' | 'stop_loss' | 'take_profit' | 'strategy';
  holdingPeriod: number; // hours
}

export interface PaperTradingConfig {
  initialCapital: number;
  commissionRate: number;
  slippageRate: number;
  allowShortSelling: boolean;
  useMargin: boolean;
  marginRatio: number;
  maxPositionSize: number; // percentage of portfolio
  maxDrawdown: number; // percentage
  enableAutoStopLoss: boolean;
  defaultStopLossPercent: number;
  enableAutoTakeProfit: boolean;
  defaultTakeProfitPercent: number;
}

export interface StrategyPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PAPER_TRADING_CONFIG: PaperTradingConfig = {
  initialCapital: 1000000,
  commissionRate: 0.1, // 0.1%
  slippageRate: 0.05, // 0.05%
  allowShortSelling: true,
  useMargin: false,
  marginRatio: 2,
  maxPositionSize: 20, // 20%
  maxDrawdown: 20, // 20%
  enableAutoStopLoss: true,
  defaultStopLossPercent: 5, // 5%
  enableAutoTakeProfit: true,
  defaultTakeProfitPercent: 10, // 10%
};

// ============================================================================
// Paper Trading Environment
// ============================================================================

export class PaperTradingEnvironment extends EventEmitter {
  private config: PaperTradingConfig;
  private portfolio: PaperPortfolio;
  private pendingOrders: Map<string, PaperTrade> = new Map();
  private tradeHistory: ClosedTrade[] = [];
  private equityCurve: Array<{ timestamp: number; value: number }> = [];
  private isRunning: boolean = false;
  private peakValue: number = 0;

  constructor(config: Partial<PaperTradingConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PAPER_TRADING_CONFIG, ...config };
    
    this.portfolio = {
      cash: this.config.initialCapital,
      initialCapital: this.config.initialCapital,
      positions: [],
      closedTrades: [],
      totalValue: this.config.initialCapital,
      totalPnL: 0,
      totalPnLPercent: 0,
      dailyPnL: 0,
      buyingPower: this.config.initialCapital,
      marginUsed: 0,
    };

    this.peakValue = this.config.initialCapital;
    this.equityCurve.push({ timestamp: Date.now(), value: this.config.initialCapital });
  }

  /**
   * ペーパートレーディングを開始
   */
  start(): void {
    this.isRunning = true;
    console.log('[PaperTrading] Started with capital:', this.config.initialCapital);
    this.emit('started', this.portfolio);
  }

  /**
   * ペーパートレーディングを停止
   */
  stop(): void {
    this.isRunning = false;
    console.log('[PaperTrading] Stopped');
    this.emit('stopped', this.getPerformanceReport());
  }

  /**
   * リセット
   */
  reset(): void {
    this.portfolio = {
      cash: this.config.initialCapital,
      initialCapital: this.config.initialCapital,
      positions: [],
      closedTrades: [],
      totalValue: this.config.initialCapital,
      totalPnL: 0,
      totalPnLPercent: 0,
      dailyPnL: 0,
      buyingPower: this.config.initialCapital,
      marginUsed: 0,
    };
    this.pendingOrders.clear();
    this.tradeHistory = [];
    this.equityCurve = [{ timestamp: Date.now(), value: this.config.initialCapital }];
    this.peakValue = this.config.initialCapital;
    this.emit('reset');
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  /**
   * 買い注文を送信
   */
  async buy(
    symbol: string,
    quantity: number,
    price?: number,
    options: {
      stopLoss?: number;
      takeProfit?: number;
      type?: 'MARKET' | 'LIMIT';
    } = {}
  ): Promise<PaperTrade | null> {
    if (!this.isRunning) {
      console.warn('[PaperTrading] Trading not started');
      return null;
    }

    const currentPrice = price || this.getCurrentPrice(symbol);
    if (!currentPrice) {
      console.warn('[PaperTrading] No price available for', symbol);
      return null;
    }

    const totalValue = currentPrice * quantity;
    const fees = totalValue * (this.config.commissionRate / 100);
    const totalCost = totalValue + fees;

    // Check buying power
    if (totalCost > this.portfolio.buyingPower) {
      console.warn('[PaperTrading] Insufficient buying power');
      this.emit('order_rejected', { reason: 'insufficient_funds', symbol, quantity });
      return null;
    }

    // Check position size limit
    const positionValue = totalValue;
    const portfolioValue = this.portfolio.totalValue;
    if ((positionValue / portfolioValue) * 100 > this.config.maxPositionSize) {
      console.warn('[PaperTrading] Position size exceeds limit');
      this.emit('order_rejected', { reason: 'position_size_limit', symbol, quantity });
      return null;
    }

    // Create and fill order
    const trade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      positionId: '',
      symbol,
      side: 'BUY',
      type: options.type || 'MARKET',
      quantity,
      price: currentPrice,
      totalValue,
      fees,
      timestamp: Date.now(),
      status: 'filled',
    };

    // Update portfolio
    this.portfolio.cash -= totalCost;
    this.updateBuyingPower();

    // Create or update position
    const existingPosition = this.portfolio.positions.find((p) => p.symbol === symbol);
    
    if (existingPosition) {
      // Average down/up
      const totalQuantity = existingPosition.quantity + quantity;
      const newEntryPrice = ((existingPosition.entryPrice * existingPosition.quantity) + (currentPrice * quantity)) / totalQuantity;
      
      existingPosition.quantity = totalQuantity;
      existingPosition.entryPrice = newEntryPrice;
      existingPosition.currentPrice = currentPrice;
      existingPosition.marketValue = totalQuantity * currentPrice;
      
      if (options.stopLoss) existingPosition.stopLoss = options.stopLoss;
      if (options.takeProfit) existingPosition.takeProfit = options.takeProfit;
      
      trade.positionId = existingPosition.id;
    } else {
      // New position
      const position: PaperPosition = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: 'LONG',
        quantity,
        entryPrice: currentPrice,
        currentPrice,
        marketValue: totalValue,
        unrealizedPnL: -fees,
        unrealizedPnLPercent: -(fees / totalValue) * 100,
        entryTime: Date.now(),
        stopLoss: options.stopLoss || (this.config.enableAutoStopLoss 
          ? currentPrice * (1 - this.config.defaultStopLossPercent / 100) 
          : undefined),
        takeProfit: options.takeProfit || (this.config.enableAutoTakeProfit
          ? currentPrice * (1 + this.config.defaultTakeProfitPercent / 100)
          : undefined),
      };
      
      this.portfolio.positions.push(position);
      trade.positionId = position.id;
    }

    this.emit('order_filled', trade);
    this.emit('position_updated', this.portfolio.positions);

    return trade;
  }

  /**
   * 売り注文を送信
   */
  async sell(
    symbol: string,
    quantity?: number,
    price?: number,
    options: { type?: 'MARKET' | 'LIMIT' } = {}
  ): Promise<PaperTrade | null> {
    if (!this.isRunning) {
      console.warn('[PaperTrading] Trading not started');
      return null;
    }

    const position = this.portfolio.positions.find((p) => p.symbol === symbol);
    if (!position) {
      console.warn('[PaperTrading] No position to sell for', symbol);
      return null;
    }

    const sellQuantity = quantity || position.quantity;
    if (sellQuantity > position.quantity) {
      console.warn('[PaperTrading] Cannot sell more than position size');
      return null;
    }

    const currentPrice = price || this.getCurrentPrice(symbol);
    if (!currentPrice) {
      console.warn('[PaperTrading] No price available for', symbol);
      return null;
    }

    const totalValue = currentPrice * sellQuantity;
    const fees = totalValue * (this.config.commissionRate / 100);

    // Create trade
    const trade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      positionId: position.id,
      symbol,
      side: 'SELL',
      type: options.type || 'MARKET',
      quantity: sellQuantity,
      price: currentPrice,
      totalValue,
      fees,
      timestamp: Date.now(),
      status: 'filled',
    };

    // Calculate P&L
    const entryValue = position.entryPrice * sellQuantity;
    const realizedPnL = totalValue - entryValue - fees;
    const realizedPnLPercent = (realizedPnL / entryValue) * 100;

    // Close trade record
    const closedTrade: ClosedTrade = {
      id: `closed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice: currentPrice,
      quantity: sellQuantity,
      entryTime: position.entryTime,
      exitTime: Date.now(),
      realizedPnL,
      realizedPnLPercent,
      fees,
      exitReason: 'manual',
      holdingPeriod: (Date.now() - position.entryTime) / (1000 * 60 * 60), // hours
    };

    this.portfolio.closedTrades.push(closedTrade);
    this.tradeHistory.push(closedTrade);

    // Update portfolio
    this.portfolio.cash += totalValue - fees;
    this.updateBuyingPower();

    // Update or remove position
    if (sellQuantity === position.quantity) {
      this.portfolio.positions = this.portfolio.positions.filter((p) => p.id !== position.id);
    } else {
      position.quantity -= sellQuantity;
      position.marketValue = position.quantity * currentPrice;
    }

    this.emit('order_filled', trade);
    this.emit('trade_closed', closedTrade);
    this.emit('position_updated', this.portfolio.positions);

    return trade;
  }

  /**
   * 空売り注文を送信
   */
  async short(
    symbol: string,
    quantity: number,
    price?: number,
    options: {
      stopLoss?: number;
      takeProfit?: number;
    } = {}
  ): Promise<PaperTrade | null> {
    if (!this.config.allowShortSelling) {
      console.warn('[PaperTrading] Short selling not allowed');
      return null;
    }

    // Implementation similar to buy but for short positions
    console.log('[PaperTrading] Short selling not yet implemented');
    return null;
  }

  /**
   * ポジションを決済
   */
  async closePosition(symbol: string, reason: ClosedTrade['exitReason'] = 'manual'): Promise<ClosedTrade | null> {
    const position = this.portfolio.positions.find((p) => p.symbol === symbol);
    if (!position) return null;

    const trade = await this.sell(symbol, position.quantity);
    if (!trade) return null;

    const closedTrade = this.portfolio.closedTrades[this.portfolio.closedTrades.length - 1];
    closedTrade.exitReason = reason;

    return closedTrade;
  }

  // ============================================================================
  // Market Data Processing
  // ============================================================================

  /**
   * マーケットデータを処理
   */
  processMarketData(data: MarketData): void {
    if (!this.isRunning) return;

    // Update positions
    this.portfolio.positions.forEach((position) => {
      if (position.symbol === data.symbol) {
        position.currentPrice = data.price;
        position.marketValue = position.quantity * data.price;

        // Calculate unrealized P&L
        if (position.side === 'LONG') {
          position.unrealizedPnL = (data.price - position.entryPrice) * position.quantity;
        } else {
          position.unrealizedPnL = (position.entryPrice - data.price) * position.quantity;
        }
        
        position.unrealizedPnLPercent = (position.unrealizedPnL / (position.entryPrice * position.quantity)) * 100;

        // Check stop loss
        if (position.stopLoss && this.config.enableAutoStopLoss) {
          if ((position.side === 'LONG' && data.price <= position.stopLoss) ||
              (position.side === 'SHORT' && data.price >= position.stopLoss)) {
            this.closePosition(position.symbol, 'stop_loss');
          }
        }

        // Check take profit
        if (position.takeProfit && this.config.enableAutoTakeProfit) {
          if ((position.side === 'LONG' && data.price >= position.takeProfit) ||
              (position.side === 'SHORT' && data.price <= position.takeProfit)) {
            this.closePosition(position.symbol, 'take_profit');
          }
        }
      }
    });

    // Update portfolio value
    this.updatePortfolioValue();

    // Check max drawdown
    this.checkDrawdown();
  }

  /**
   * 現在価格を取得（シミュレーション用）
   */
  private getCurrentPrice(symbol: string): number | null {
    // In real implementation, this would fetch from market data feed
    // For now, return a simulated price
    return 100;
  }

  // ============================================================================
  // Portfolio Management
  // ============================================================================

  private updatePortfolioValue(): void {
    const positionsValue = this.portfolio.positions.reduce((sum, p) => sum + p.marketValue, 0);
    this.portfolio.totalValue = this.portfolio.cash + positionsValue;
    this.portfolio.totalPnL = this.portfolio.totalValue - this.portfolio.initialCapital;
    this.portfolio.totalPnLPercent = (this.portfolio.totalPnL / this.portfolio.initialCapital) * 100;

    // Update peak value
    if (this.portfolio.totalValue > this.peakValue) {
      this.peakValue = this.portfolio.totalValue;
    }

    // Record equity curve
    this.equityCurve.push({
      timestamp: Date.now(),
      value: this.portfolio.totalValue,
    });

    this.emit('portfolio_updated', this.portfolio);
  }

  private updateBuyingPower(): void {
    if (this.config.useMargin) {
      this.portfolio.buyingPower = this.portfolio.cash * this.config.marginRatio;
    } else {
      this.portfolio.buyingPower = this.portfolio.cash;
    }
  }

  private checkDrawdown(): void {
    const drawdown = ((this.peakValue - this.portfolio.totalValue) / this.peakValue) * 100;
    
    if (drawdown > this.config.maxDrawdown) {
      console.warn('[PaperTrading] Max drawdown reached! Stopping trading.');
      this.emit('max_drawdown_reached', { drawdown, maxDrawdown: this.config.maxDrawdown });
      this.stop();
    }
  }

  // ============================================================================
  // Performance Analysis
  // ============================================================================

  /**
   * パフォーマンスレポートを取得
   */
  getPerformanceReport(): StrategyPerformance {
    const trades = this.tradeHistory;
    const winningTrades = trades.filter((t) => t.realizedPnL > 0);
    const losingTrades = trades.filter((t) => t.realizedPnL <= 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.realizedPnL, 0));

    // Calculate returns for Sharpe ratio
    const returns = this.equityCurve.map((eq, i) => 
      i === 0 ? 0 : (eq.value - this.equityCurve[i - 1].value) / this.equityCurve[i - 1].value
    ).slice(1);

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

    const riskFreeRate = 0.02 / 252;
    const sharpeRatio = volatility === 0 ? 0 : ((avgReturn - riskFreeRate) * 252) / (volatility / 100);

    // Max drawdown
    let maxDrawdown = 0;
    let peak = this.equityCurve[0]?.value || this.config.initialCapital;
    
    for (const eq of this.equityCurve) {
      if (eq.value > peak) peak = eq.value;
      const dd = (peak - eq.value) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const totalReturn = ((this.portfolio.totalValue - this.config.initialCapital) / this.config.initialCapital) * 100;
    const days = Math.max(1, this.equityCurve.length);
    const annualizedReturn = (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      averageWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      profitFactor: totalLoss === 0 ? totalProfit : totalProfit / totalLoss,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100,
      totalReturn,
      annualizedReturn,
      volatility,
    };
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getPortfolio(): PaperPortfolio {
    return this.portfolio;
  }

  getPositions(): PaperPosition[] {
    return this.portfolio.positions;
  }

  getTradeHistory(): ClosedTrade[] {
    return this.tradeHistory;
  }

  getEquityCurve(): Array<{ timestamp: number; value: number }> {
    return this.equityCurve;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<PaperTradingConfig>) => new PaperTradingEnvironment(config)
);

export const getGlobalPaperTrading = getInstance;
export const resetGlobalPaperTrading = resetInstance;

export default PaperTradingEnvironment;
