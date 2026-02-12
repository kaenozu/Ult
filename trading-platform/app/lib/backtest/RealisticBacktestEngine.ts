/**
 * RealisticBacktestEngine.ts
 * 
 * Enhanced backtest engine with realistic trading simulation:
 * - Volume-based market impact
 * - Dynamic slippage based on order size, time-of-day, and volatility
 * - Tiered commission structure
 * - Bid-ask spread modeling
 * 
 * Addresses: リアルなバックテスト環境と戦略最適化
 */

import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types';
import {
  BacktestConfig,
  Strategy,
  Trade,
  StrategyContext,
  StrategyAction
} from './AdvancedBacktestEngine';
import { PerformanceMetrics } from '@/app/types/performance';
import { SlippagePredictionService, OrderBook, OrderBookLevel } from '../execution/SlippagePredictionService';
import { BACKTEST_DEFAULTS, REALISTIC_BACKTEST_DEFAULTS, TIERED_COMMISSIONS } from '../constants/backtest-config';

export interface CommissionTier {
  volumeThreshold: number;
  rate: number;
}

export interface RealisticBacktestConfig extends BacktestConfig {
  useRealisticSlippage?: boolean;
  averageDailyVolume?: number;
  marketImpactCoefficient?: number;
  useTimeOfDaySlippage?: boolean;
  marketOpenSlippageMultiplier?: number;
  marketCloseSlippageMultiplier?: number;
  useVolatilitySlippage?: boolean;
  volatilityWindow?: number;
  volatilitySlippageMultiplier?: number;
  useTieredCommissions?: boolean;
  commissionTiers?: CommissionTier[];
  orderBookDepth?: number;
}

export interface RealisticTradeMetrics extends Trade {
  marketImpact: number;
  effectiveSlippage: number;
  commissionTier?: number;
  timeOfDayFactor?: number;
  volatilityFactor?: number;
}

export interface RealisticBacktestResult {
  trades: RealisticTradeMetrics[];
  equityCurve: number[];
  metrics: PerformanceMetrics;
  config: RealisticBacktestConfig;
  startDate: string;
  endDate: string;
  duration: number;
  transactionCosts: {
    totalCommissions: number;
    totalSlippage: number;
    totalMarketImpact: number;
    totalSpread: number;
    avgCommissionPerTrade: number;
    avgSlippagePerTrade: number;
    avgMarketImpactPerTrade: number;
  };
  executionQuality: {
    avgExecutionTime: number;
    worstSlippage: number;
    bestSlippage: number;
    slippageStdDev: number;
  };
}

export const DEFAULT_REALISTIC_CONFIG: RealisticBacktestConfig = {
  initialCapital: BACKTEST_DEFAULTS.INITIAL_CAPITAL,
  commission: BACKTEST_DEFAULTS.DEFAULT_COMMISSION,
  slippage: 0.05, // model-specific
  spread: BACKTEST_DEFAULTS.DEFAULT_SPREAD,
  maxPositionSize: BACKTEST_DEFAULTS.MAX_POSITION_SIZE,
  maxDrawdown: BACKTEST_DEFAULTS.MAX_DRAWDOWN,
  allowShort: BACKTEST_DEFAULTS.ALLOW_SHORT,
  useStopLoss: true,
  useTakeProfit: true,
  riskPerTrade: 2, // strategy-specific
  useRealisticSlippage: REALISTIC_BACKTEST_DEFAULTS.USE_REALISTIC_SLIPPAGE,
  averageDailyVolume: undefined,
  marketImpactCoefficient: REALISTIC_BACKTEST_DEFAULTS.MARKET_IMPACT_COEFFICIENT,
  useTimeOfDaySlippage: false,
  marketOpenSlippageMultiplier: 1.5, // time-specific, not consolidated
  marketCloseSlippageMultiplier: 1.3, // time-specific, not consolidated
  useVolatilitySlippage: REALISTIC_BACKTEST_DEFAULTS.USE_VOLATILITY_SLIPPAGE,
  volatilityWindow: REALISTIC_BACKTEST_DEFAULTS.VOLATILITY_WINDOW,
  volatilitySlippageMultiplier: REALISTIC_BACKTEST_DEFAULTS.VOLATILITY_SLIPPAGE_MULTIPLIER,
  useTieredCommissions: false,
  commissionTiers: [...TIERED_COMMISSIONS.TIERS],
  orderBookDepth: REALISTIC_BACKTEST_DEFAULTS.ORDER_BOOK_LEVELS,
};

export class RealisticBacktestEngine extends EventEmitter {
  private config: RealisticBacktestConfig;
  private data: Map<string, OHLCV[]> = new Map();
  private trades: RealisticTradeMetrics[] = [];
  private equityCurve: number[] = [];
  private currentPosition: 'LONG' | 'SHORT' | null = null;
  private entryPrice: number = 0;
  private entryDate: string = '';
  private currentEquity: number = 0;
  private stopLoss: number = 0;
  private takeProfit: number = 0;
  private indicators: Map<string, number[]> = new Map();
  
  private realisticConfig: RealisticBacktestConfig;
  private slippageService: SlippagePredictionService;
  private cumulativeVolume: number = 0;
  private volatilityCache: Map<number, number> = new Map();
  private tradeTimestamps: number[] = [];
  
  // Temporary trade data for position tracking
  private openTrade: RealisticTradeMetrics | null = null;
  private entryCommission: number = 0;

  constructor(config: Partial<RealisticBacktestConfig> = {}) {
    super();
    this.config = { ...DEFAULT_REALISTIC_CONFIG, ...config };
    this.realisticConfig = this.config;
    this.slippageService = new SlippagePredictionService();
    this.currentEquity = this.config.initialCapital;
  }

  /**
   * Load data for backtesting
   */
  loadData(symbol: string, data: OHLCV[]): void {
    this.data.set(symbol, data);
  }

  /**
   * Run backtest with realistic simulation
   */
   async runBacktest(strategy: Strategy, symbol: string): Promise<RealisticBacktestResult> {
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
           this.closePosition(currentData, exitAction.exitReason, i);
           continue;
         }
       }

       // Get strategy action
       const action = strategy.onData(currentData, i, context);

       // Execute action with realistic tracking
       await this.executeAction(action, currentData, i, symbol);

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

     // Calculate enhanced metrics
     const transactionCosts = this.calculateTransactionCosts(this.trades);
     const executionQuality = this.calculateExecutionQuality(this.trades);

     const totalReturn = ((this.currentEquity - this.config.initialCapital) / this.config.initialCapital) * 100;
     const days = this.equityCurve.length;
     const annualizedReturn = (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100;

     const metrics = this.calculateMetrics(this.trades, this.equityCurve, totalReturn, days, annualizedReturn);

     const result: RealisticBacktestResult = {
       trades: this.trades,
       equityCurve: this.equityCurve,
       metrics,
       config: this.config,
       startDate: data[0].date,
       endDate: data[data.length - 1].date,
       duration: Math.floor((new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / (1000 * 60 * 60 * 24)),
       transactionCosts,
       executionQuality
     };

     strategy.onEnd?.(result);
     if (this.emit instanceof Function) {
       this.emit('backtest_complete', result);
     }

     return result;
   }

  /**
   * Execute strategy action with realistic tracking
   */
   private async executeAction(action: StrategyAction, data: OHLCV, index: number, symbol: string): Promise<void> {
     switch (action.action) {
       case 'BUY':
         if (!this.currentPosition && this.config.allowShort !== false) {
           this.openPosition('LONG', data, action, index, symbol);
         } else if (this.currentPosition === 'SHORT') {
           this.closePosition(data, 'signal', index);
           this.openPosition('LONG', data, action, index, symbol);
         }
         break;
       case 'SELL':
         if (!this.currentPosition && this.config.allowShort) {
           this.openPosition('SHORT', data, action, index, symbol);
         } else if (this.currentPosition === 'LONG') {
           this.closePosition(data, 'signal', index);
           if (this.config.allowShort) {
             this.openPosition('SHORT', data, action, index, symbol);
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

  /**
   * Open a position with realistic metrics
   */
   private openPosition(side: 'LONG' | 'SHORT', data: OHLCV, action: StrategyAction, index: number, symbol: string): void {
     const quantity = this.calculatePositionSize(data.close, action.quantity);
     const basePrice = data.close;
     
     // Calculate realistic slippage
     const { slippage, marketImpact, timeOfDayFactor, volatilityFactor } = 
       this.calculateRealisticSlippage(basePrice, quantity, side === 'LONG' ? 'BUY' : 'SELL', data, index, this.data.get(symbol) || []);
     
     // Apply slippage to price
     const slippageFactor = side === 'LONG' ? (1 + slippage / 100) : (1 - slippage / 100);
     const executionPrice = basePrice * slippageFactor;
     
     // Calculate entry commission
     const orderValue = executionPrice * quantity;
     const { rate: commissionRate, tier: commissionTier } = this.calculateTieredCommission(orderValue);
     const entryCommission = orderValue * (commissionRate / 100);

     // Record trade timestamp
     this.tradeTimestamps.push(Date.now());

     this.currentPosition = side;
     this.entryPrice = executionPrice;
     this.entryDate = data.date;
     this.stopLoss = action.stopLoss || 0;
     this.takeProfit = action.takeProfit || 0;

     // Create enhanced trade record with entry data (will be finalized on close)
     const trade: RealisticTradeMetrics = {
       id: `trade_${this.trades.length}`,
       entryDate: data.date,
       symbol: symbol,
       side,
       entryPrice: executionPrice,
       quantity,
       pnl: 0,
       pnlPercent: 0,
       fees: entryCommission, // Will add exit commission later
       exitReason: 'signal',
       marketImpact,
       effectiveSlippage: slippage,
       commissionTier,
       timeOfDayFactor,
       volatilityFactor
     };
     
     // Store temporary trade data for closing
     this.openTrade = trade;
     this.entryCommission = entryCommission;
   }

  /**
   * Close position and finalize trade metrics
   */
   private closePosition(data: OHLCV, reason: Trade['exitReason'], index: number = 0): void {
     if (!this.currentPosition || !this.openTrade) return;

     const quantity = this.calculatePositionSize(this.entryPrice);
     const exitPrice = this.applySlippage(
       data.close, 
       this.currentPosition === 'LONG' ? 'SELL' : 'BUY',
       data,
       quantity
     );

     // Calculate exit commission
     const exitValue = exitPrice * quantity;
     const { rate: exitCommissionRate } = this.calculateTieredCommission(exitValue);
     const exitCommission = exitValue * (exitCommissionRate / 100);
     
     // Entry commission from stored trade
     const openTrade = this.openTrade;
     const entryCommission = openTrade.fees;
     const totalCommission = entryCommission + exitCommission;

     // Calculate P&L
     let pnl = 0;
     if (this.currentPosition === 'LONG') {
       pnl = (exitPrice - this.entryPrice) * quantity;
     } else {
       pnl = (this.entryPrice - exitPrice) * quantity;
     }

     pnl -= totalCommission;

     const pnlPercent = (pnl / (this.entryPrice * quantity)) * 100;

     // Update equity
     this.currentEquity += pnl;

     // Finalize trade
     const trade: RealisticTradeMetrics = {
       ...openTrade,
       exitDate: data.date,
       exitPrice,
       pnl,
       pnlPercent,
       fees: totalCommission,
     };

     this.trades.push(trade);
     if (this.emit instanceof Function) {
       this.emit('position_closed', trade);
     }

     // Reset position
     this.currentPosition = null;
     this.entryPrice = 0;
     this.stopLoss = 0;
     this.takeProfit = 0;
     this.openTrade = null;
     this.entryCommission = 0;
   }


  /**
   * Calculate realistic slippage based on multiple factors
   */
   protected calculateRealisticSlippage(
     price: number,
     quantity: number,
     side: 'BUY' | 'SELL',
     data: OHLCV,
     index: number,
     historicalData: OHLCV[]
   ): {
     slippage: number;
     marketImpact: number;
     timeOfDayFactor: number;
     volatilityFactor: number;
   } {
     let totalSlippage = this.realisticConfig.slippage || 0.05;
     let marketImpact = 0;
     let timeOfDayFactor = 1.0;
     let volatilityFactor = 1.0;

     // 1. Market Impact (volume-based)
     if (this.realisticConfig.useRealisticSlippage && this.realisticConfig.averageDailyVolume) {
       const orderValue = price * quantity;
       const avgDailyValue = this.realisticConfig.averageDailyVolume * price;
       const orderSizeRatio = orderValue / avgDailyValue;
       
       // Kyle's lambda model: market impact is proportional to square root of order size
       const lambda = this.realisticConfig.marketImpactCoefficient || 0.1;
       marketImpact = lambda * Math.sqrt(orderSizeRatio) * 100; // Convert to percentage
       totalSlippage += marketImpact;
     }

     // 2. Time-of-day slippage
     if (this.realisticConfig.useTimeOfDaySlippage) {
       timeOfDayFactor = this.calculateTimeOfDayFactor(data.date);
       totalSlippage *= timeOfDayFactor;
     }

     // 3. Volatility-based slippage
     if (this.realisticConfig.useVolatilitySlippage) {
       volatilityFactor = this.calculateVolatilityFactor(index, historicalData);
       totalSlippage *= volatilityFactor;
     }

     return {
       slippage: totalSlippage,
       marketImpact,
       timeOfDayFactor,
       volatilityFactor
     };
   }

  /**
   * Calculate time-of-day slippage multiplier
   * Market open and close typically have higher slippage
   */
   private calculateTimeOfDayFactor(dateStr: string): number {
     const date = new Date(dateStr);
     const hour = date.getUTCHours();
     const minute = date.getUTCMinutes();
     const timeInMinutes = hour * 60 + minute;

     // Market hours: 9:30 AM - 4:00 PM EST (in UTC: 14:30 - 21:00 for EST)
     // Adjust for JST if needed
     const marketOpen = 9 * 60 + 30; // 9:30 AM
     const marketClose = 16 * 60; // 4:00 PM

     // First 30 minutes and last 30 minutes have higher slippage
     if (timeInMinutes <= marketOpen + 30) {
       return this.realisticConfig.marketOpenSlippageMultiplier || 1.5;
     }
     if (timeInMinutes >= marketClose - 30) {
       return this.realisticConfig.marketCloseSlippageMultiplier || 1.3;
     }

     return 1.0; // Normal hours
   }

  /**
   * Calculate volatility-based slippage multiplier
   * Higher volatility = higher slippage
   */
   private calculateVolatilityFactor(index: number, historicalData: OHLCV[]): number {
     // Check cache first
     if (this.volatilityCache.has(index)) {
       return this.volatilityCache.get(index)!;
     }

     const window = this.realisticConfig.volatilityWindow || 20;
     if (index < window) {
       return 1.0;
     }

     // Calculate rolling volatility
     const windowData = historicalData.slice(index - window, index);
     const returns = windowData.slice(1).map((d, i) => {
       const prevClose = windowData[i].close;
       return prevClose === 0 ? 0 : (d.close - prevClose) / prevClose;
     });

     const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
     const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
     const volatility = Math.sqrt(variance);

     // Normalize volatility (typical daily vol is around 0.01-0.02)
     const normalizedVol = volatility / 0.015;
     const multiplier = this.realisticConfig.volatilitySlippageMultiplier || 2.0;
     const factor = 1.0 + (normalizedVol - 1.0) * (multiplier - 1.0);

     // Cache the result
     this.volatilityCache.set(index, Math.max(0.5, Math.min(3.0, factor)));
     return this.volatilityCache.get(index)!;
   }

  /**
   * Calculate tiered commission based on cumulative volume
   */
   protected calculateTieredCommission(orderValue: number): { rate: number; tier: number } {
     if (!this.realisticConfig.useTieredCommissions || !this.realisticConfig.commissionTiers) {
       return { rate: this.realisticConfig.commission || 0.1, tier: 0 };
     }

     const tiers = this.realisticConfig.commissionTiers;
     let selectedTier = 0;
     let selectedRate = tiers[0].rate;

     for (let i = 0; i < tiers.length; i++) {
       if (this.cumulativeVolume >= tiers[i].volumeThreshold) {
         selectedTier = i;
         selectedRate = tiers[i].rate;
       }
     }

     this.cumulativeVolume += orderValue;

     return { rate: selectedRate, tier: selectedTier };
   }

  /**
   * Simulate order book for more realistic execution
   */
   private simulateOrderBook(price: number, side: 'BUY' | 'SELL'): OrderBook {
     const depth = this.realisticConfig.orderBookDepth || 10;
     const spread = this.realisticConfig.spread || 0.01;
     const halfSpread = (spread / 100) * price / 2;

     const bids: OrderBookLevel[] = [];
     const asks: OrderBookLevel[] = [];

     // Generate realistic order book
     for (let i = 0; i < depth; i++) {
       const bidPrice = price - halfSpread - (i * price * 0.001);
       const askPrice = price + halfSpread + (i * price * 0.001);
       const size = 100 * Math.exp(-i * 0.3); // Exponential decay

       bids.push({ price: bidPrice, size });
       asks.push({ price: askPrice, size });
     }

     return {
       symbol: 'SYMBOL',
       bids,
       asks,
       timestamp: Date.now(),
       spread: spread,
       midPrice: price
     };
   }

  /**
   * Calculate comprehensive transaction costs
   */
   private calculateTransactionCosts(trades: RealisticTradeMetrics[]): RealisticBacktestResult['transactionCosts'] {
     const totalCommissions = trades.reduce((sum, t) => sum + t.fees, 0);
     const totalSlippage = trades.reduce((sum, t) => {
       const slippageCost = (t.effectiveSlippage / 100) * t.entryPrice * t.quantity;
       return sum + slippageCost;
     }, 0);
     const totalMarketImpact = trades.reduce((sum, t) => {
       const impactCost = (t.marketImpact / 100) * t.entryPrice * t.quantity;
       return sum + impactCost;
     }, 0);
     const totalSpread = trades.reduce((sum, t) => {
       const spreadCost = (this.realisticConfig.spread || 0) / 100 * t.entryPrice * t.quantity;
       return sum + spreadCost;
     }, 0);

     return {
       totalCommissions,
       totalSlippage,
       totalMarketImpact,
       totalSpread,
       avgCommissionPerTrade: trades.length > 0 ? totalCommissions / trades.length : 0,
       avgSlippagePerTrade: trades.length > 0 ? totalSlippage / trades.length : 0,
       avgMarketImpactPerTrade: trades.length > 0 ? totalMarketImpact / trades.length : 0
     };
   }

  /**
   * Calculate execution quality metrics
   */
   private calculateExecutionQuality(trades: RealisticTradeMetrics[]): RealisticBacktestResult['executionQuality'] {
     if (trades.length === 0) {
       return {
         avgExecutionTime: 0,
         worstSlippage: 0,
         bestSlippage: 0,
         slippageStdDev: 0
       };
     }

     const slippages = trades.map(t => t.effectiveSlippage);
     const avgSlippage = slippages.reduce((sum, s) => sum + s, 0) / slippages.length;
     const variance = slippages.reduce((sum, s) => sum + Math.pow(s - avgSlippage, 2), 0) / slippages.length;

     return {
       avgExecutionTime: 0, // Would need actual execution timestamps
       worstSlippage: Math.max(...slippages),
       bestSlippage: Math.min(...slippages),
       slippageStdDev: Math.sqrt(variance)
     };
   }

  /**
   * Apply slippage to price
   */
   private applySlippage(price: number, side: 'BUY' | 'SELL', data?: OHLCV, quantity?: number): number {
     // Use realistic slippage model if enabled
     if (this.realisticConfig.useRealisticSlippage && data && quantity) {
       const result = this.calculateRealisticSlippage(
         price,
         quantity,
         side,
         data,
         0,
         []
       );
       const slippageFactor = side === 'BUY' ? (1 + result.slippage / 100) : (1 - result.slippage / 100);
       return price * slippageFactor;
     }
     
     // Fallback to simple slippage
     const slippageFactor = 1 + (Math.random() * this.config.slippage / 100);
     return side === 'BUY' ? price * slippageFactor : price / slippageFactor;
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

  private calculateValueAtRisk(returns: number[], confidence: number = 0.95): number {
    if (returns.length === 0) return 0;
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    // VaR is usually expressed as a positive number (loss amount/percentage)
    return Math.abs(sortedReturns[index]);
  }

  /**
   * Calculate performance metrics
   */
   private calculateMetrics(
     trades: RealisticTradeMetrics[],
     equityCurve: number[],
     totalReturn: number,
     days: number,
     annualizedReturn: number
   ): PerformanceMetrics {
     const returns = equityCurve.slice(1).map((eq, i) =>
       i === 0 ? 0 : (eq - equityCurve[i - 1]) / equityCurve[i - 1]
     ).slice(1);

     // Optimized single-pass calculation for trade stats
     let grossProfit = 0;
     let grossLoss = 0;
     let winningTradesCount = 0;
     let losingTradesCount = 0;
     let largestWin = 0;
     let largestLoss = 0;
     let totalPnl = 0;

     for (const t of trades) {
       totalPnl += t.pnl;
       if (t.pnl > 0) {
         grossProfit += t.pnl;
         winningTradesCount++;
         if (t.pnl > largestWin) largestWin = t.pnl;
       } else {
         grossLoss += Math.abs(t.pnl);
         losingTradesCount++;
         if (t.pnl < largestLoss) largestLoss = t.pnl;
       }
     }

     const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
     const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
     const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility (decimal)

     const riskFreeRate = 0.02 / 252;
     // Daily Sharpe = (Daily Excess / Daily Vol)
     // Annualized Sharpe = Daily Sharpe * sqrt(252)
     const dailyVol = Math.sqrt(variance);
     const sharpeRatio = dailyVol === 0 ? 0 : ((avgReturn - riskFreeRate) / dailyVol) * Math.sqrt(252);

     const downsideReturns = returns.filter((r) => r < 0);
     const downsideVariance = downsideReturns.length > 0
       ? downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
       : 0;
     const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252); // Annualized Downside Vol (decimal)
     const dailyDownsideDev = Math.sqrt(downsideVariance);
     const sortinoRatio = dailyDownsideDev === 0 ? 0 : ((avgReturn - riskFreeRate) / dailyDownsideDev) * Math.sqrt(252);

     // Max drawdown and average drawdown
     let maxDrawdown = 0;
     let maxDrawdownDuration = 0;
     let peak = equityCurve[0];
     let peakIndex = 0;
     let totalDrawdown = 0;
     let drawdownCount = 0;

     for (let i = 1; i < equityCurve.length; i++) {
       if (equityCurve[i] > peak) {
         peak = equityCurve[i];
         peakIndex = i;
       }
       const drawdown = (peak - equityCurve[i]) / peak;
       if (drawdown > 0) {
         totalDrawdown += drawdown;
         drawdownCount++;
       }
       if (drawdown > maxDrawdown) {
         maxDrawdown = drawdown;
         maxDrawdownDuration = i - peakIndex;
       }
     }
     const averageDrawdown = drawdownCount > 0 ? (totalDrawdown / drawdownCount) : 0; // Decimal

     const winRate = trades.length > 0 ? (winningTradesCount / trades.length) : 0; // Decimal

     const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

     const averageWin = winningTradesCount > 0 ? grossProfit / winningTradesCount : 0;
     const averageLoss = losingTradesCount > 0 ? grossLoss / losingTradesCount : 0;

     const averageTrade = trades.length > 0 ? totalPnl / trades.length : 0;

     const calmarRatio = maxDrawdown === 0 ? 0 : (annualizedReturn / 100) / maxDrawdown; // annualizedReturn passed in is %, convert to decimal

     // Omega ratio (simplified)
     const threshold = 0;
     const gains = returns.filter((r) => r > threshold).reduce((sum, r) => sum + r - threshold, 0);
     const losses = returns.filter((r) => r < threshold).reduce((sum, r) => sum + threshold - r, 0);
     const omegaRatio = losses === 0 ? gains : gains / losses;

     const valueAtRisk = this.calculateValueAtRisk(returns);
     // Annualized Information Ratio = Annualized Return / Annualized Risk
     // Assuming Benchmark Return = 0 (Risk Free Rate handled in Sharpe)
     const informationRatio = volatility > 0 ? (avgReturn * 252) / volatility : 0;

     return {
       totalReturn: parseFloat((totalReturn / 100).toFixed(4)), // Convert % to decimal
       annualizedReturn: parseFloat((annualizedReturn / 100).toFixed(4)), // Convert % to decimal
       volatility: parseFloat(volatility.toFixed(4)),
       sharpeRatio: parseFloat(sharpeRatio.toFixed(4)),
       sortinoRatio: parseFloat(sortinoRatio.toFixed(4)),
       maxDrawdown: parseFloat(maxDrawdown.toFixed(4)),
       maxDrawdownDuration,
       averageDrawdown: parseFloat(averageDrawdown.toFixed(4)),
       winRate: parseFloat(winRate.toFixed(4)),
       profitFactor: parseFloat(profitFactor.toFixed(4)),
       averageWin: parseFloat(averageWin.toFixed(2)),
       averageLoss: parseFloat(averageLoss.toFixed(2)),
       largestWin: parseFloat(largestWin.toFixed(2)),
       largestLoss: parseFloat(largestLoss.toFixed(2)),
       averageTrade: parseFloat(averageTrade.toFixed(2)),
       totalTrades: trades.length,
       winningTrades: winningTradesCount,
       losingTrades: losingTradesCount,
       calmarRatio: parseFloat(calmarRatio.toFixed(4)),
       omegaRatio: parseFloat(omegaRatio.toFixed(4)),
       valueAtRisk: parseFloat(valueAtRisk.toFixed(4)),
       informationRatio: parseFloat(informationRatio.toFixed(4)),
       treynorRatio: 0,
       conditionalValueAtRisk: 0,
       downsideDeviation: parseFloat(downsideDeviation.toFixed(4)),
       averageWinLossRatio: averageLoss > 0 ? averageWin / averageLoss : 0,
       averageHoldingPeriod: 0,
       averageRMultiple: 0,
       expectancy: 0,
       kellyCriterion: 0,
       riskOfRuin: 0,
       SQN: 0
     };
   }

  /**
   * Reset state
   */
  private resetState(): void {
    this.trades = [];
    this.equityCurve = [this.config.initialCapital];
    this.currentPosition = null;
    this.entryPrice = 0;
    this.entryDate = '';
    this.currentEquity = this.config.initialCapital;
    this.stopLoss = 0;
    this.takeProfit = 0;
    this.cumulativeVolume = 0;
    this.volatilityCache.clear();
    this.tradeTimestamps = [];
    this.openTrade = null;
    this.entryCommission = 0;
  }

  /**
   * Check exit conditions
   */
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

  /**
   * Get simulation statistics
   */
   getSimulationStats(): {
     totalVolume: number;
     avgSlippage: number;
     avgMarketImpact: number;
     avgCommissionRate: number;
   } {
     return {
       totalVolume: this.cumulativeVolume,
       avgSlippage: this.realisticConfig.slippage || 0,
       avgMarketImpact: 0,
       avgCommissionRate: this.realisticConfig.commission || 0
     };
   }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<RealisticBacktestConfig>) => new RealisticBacktestEngine(config)
);

export const getRealisticBacktestEngine = getInstance;
export const resetRealisticBacktestEngine = resetInstance;

export default RealisticBacktestEngine;
