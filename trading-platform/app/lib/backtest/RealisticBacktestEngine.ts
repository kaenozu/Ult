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

import { OHLCV } from '@/app/types';
import {
  BacktestConfig,
  Trade,
  Strategy,
  PerformanceMetrics,
  BacktestResult,
  StrategyAction,
  RealisticBacktestResult,
} from './types';
import { AdvancedBacktestEngine } from './AdvancedBacktestEngine';
import { REALISTIC_BACKTEST_DEFAULTS, TIERED_COMMISSIONS } from '../constants/backtest-config';
import { DEFAULT_BACKTEST_CONFIG } from './BaseBacktestEngine';
import MonteCarloSimulator, { MonteCarloResult } from './MonteCarloSimulator';

// Re-export types for backward compatibility
export type RealisticTradeMetrics = Trade;
export type RealisticBacktestConfig = BacktestConfig;
export type { RealisticBacktestResult };

// Renamed to avoid conflict with Orchestrator
export const DEFAULT_REALISTIC_ENGINE_CONFIG: BacktestConfig = {
  ...DEFAULT_BACKTEST_CONFIG,
  useRealisticSlippage: REALISTIC_BACKTEST_DEFAULTS.USE_REALISTIC_SLIPPAGE,
  averageDailyVolume: REALISTIC_BACKTEST_DEFAULTS.AVERAGE_DAILY_VOLUME,
  marketImpactCoefficient: REALISTIC_BACKTEST_DEFAULTS.MARKET_IMPACT_COEFFICIENT,
  useVolatilitySlippage: REALISTIC_BACKTEST_DEFAULTS.USE_VOLATILITY_SLIPPAGE,
  volatilityWindow: REALISTIC_BACKTEST_DEFAULTS.VOLATILITY_WINDOW,
  volatilitySlippageMultiplier: REALISTIC_BACKTEST_DEFAULTS.VOLATILITY_SLIPPAGE_MULTIPLIER,
  orderBookDepth: REALISTIC_BACKTEST_DEFAULTS.ORDER_BOOK_LEVELS,
  commissionTiers: [...TIERED_COMMISSIONS.TIERS],
  realisticMode: true,
};

export class RealisticBacktestEngine extends AdvancedBacktestEngine {
  private cumulativeVolume: number = 0;
  private volatilityCache: Map<number, number> = new Map();
  private tradeTimestamps: number[] = [];
  
  // Temporary trade data for position tracking (extended from base)
  private realisticOpenTrade: Trade | null = null;
  private currentSymbol: string = '';

  constructor(config: Partial<BacktestConfig> = {}) {
    super(config);
    // Ensure realistic defaults are applied if not present
    this.config = {
        ...this.config,
        useRealisticSlippage: config.useRealisticSlippage ?? REALISTIC_BACKTEST_DEFAULTS.USE_REALISTIC_SLIPPAGE,
        marketImpactCoefficient: config.marketImpactCoefficient ?? REALISTIC_BACKTEST_DEFAULTS.MARKET_IMPACT_COEFFICIENT,
        useVolatilitySlippage: config.useVolatilitySlippage ?? REALISTIC_BACKTEST_DEFAULTS.USE_VOLATILITY_SLIPPAGE,
        volatilityWindow: config.volatilityWindow ?? REALISTIC_BACKTEST_DEFAULTS.VOLATILITY_WINDOW,
        volatilitySlippageMultiplier: config.volatilitySlippageMultiplier ?? REALISTIC_BACKTEST_DEFAULTS.VOLATILITY_SLIPPAGE_MULTIPLIER,
        orderBookDepth: config.orderBookDepth ?? REALISTIC_BACKTEST_DEFAULTS.ORDER_BOOK_LEVELS,
        commissionTiers: config.commissionTiers || [...TIERED_COMMISSIONS.TIERS],
    };
  }

  /**
   * Reset state including realistic specific properties
   */
  protected resetState(): void {
    super.resetState();
    this.cumulativeVolume = 0;
    this.volatilityCache.clear();
    this.tradeTimestamps = [];
    this.realisticOpenTrade = null;
  }

  async runBacktest(strategy: Strategy, symbol: string): Promise<BacktestResult> {
      this.currentSymbol = symbol;
      const result = await super.runBacktest(strategy, symbol);

      // Calculate enhanced metrics
      const transactionCosts = this.calculateTransactionCosts(this.trades);
      const executionQuality = this.calculateExecutionQuality(this.trades);

      return {
          ...result,
          transactionCosts,
          executionQuality
      };
  }

  /**
   * Calculate comprehensive transaction costs
   */
   private calculateTransactionCosts(trades: Trade[]): NonNullable<BacktestResult['transactionCosts']> {
     const totalCommissions = trades.reduce((sum, t) => sum + t.fees, 0);
     const totalSlippage = trades.reduce((sum, t) => {
       const slippageCost = (t.effectiveSlippage || 0) / 100 * t.entryPrice * t.quantity;
       return sum + slippageCost;
     }, 0);
     const totalMarketImpact = trades.reduce((sum, t) => {
       const impactCost = (t.marketImpact || 0) / 100 * t.entryPrice * t.quantity;
       return sum + impactCost;
     }, 0);
     const totalSpread = trades.reduce((sum, t) => {
       const spreadCost = (this.config.spread || 0) / 100 * t.entryPrice * t.quantity;
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
   private calculateExecutionQuality(trades: Trade[]): NonNullable<BacktestResult['executionQuality']> {
     if (trades.length === 0) {
       return {
         avgExecutionTime: 0,
         worstSlippage: 0,
         bestSlippage: 0,
         slippageStdDev: 0
       };
     }

     const slippages = trades.map(t => t.effectiveSlippage || 0);
     const avgSlippage = slippages.reduce((sum, s) => sum + s, 0) / slippages.length;
     const variance = slippages.reduce((sum, s) => sum + Math.pow(s - avgSlippage, 2), 0) / slippages.length;

     return {
       avgExecutionTime: 0, // Would need actual execution timestamps
       worstSlippage: Math.max(...slippages),
       bestSlippage: Math.min(...slippages),
       slippageStdDev: Math.sqrt(variance)
     };
   }

  protected override openPosition(side: 'LONG' | 'SHORT', data: OHLCV, action: StrategyAction, index: number = 0): void {
     // Custom implementation for Realistic Engine
     const quantity = this.calculatePositionSize(data.close, action.quantity);
     const basePrice = data.close;
     
     const historicalData = this.data.get(this.currentSymbol) || [];

     // Calculate realistic slippage
     const { slippage, marketImpact, timeOfDayFactor, volatilityFactor } = 
       this.calculateRealisticSlippage(basePrice, quantity, side === 'LONG' ? 'BUY' : 'SELL', data, index, historicalData);
     
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

     // Create enhanced trade record
     const trade: Trade = {
       id: `trade_${this.trades.length}`,
       entryDate: data.date,
       symbol: this.currentSymbol,
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
       volatilityFactor,
       commissionBreakdown: {
           entryCommission,
           exitCommission: 0
       }
     };
     
     // Store temporary trade data for closing
     this.realisticOpenTrade = trade;

     this.emit('position_opened', { side, price: executionPrice, quantity, date: data.date });
   }

   protected override closePosition(data: OHLCV, reason: Trade['exitReason'], index: number = 0): void {
     if (!this.currentPosition || !this.realisticOpenTrade) {
         // Fallback if realisticOpenTrade is missing (shouldn't happen in realistic mode)
         if (this.currentPosition) super.closePosition(data, reason, index);
         return;
     }

     const quantity = this.calculatePositionSize(this.entryPrice);

     // Slippage for exit
     const historicalData = this.data.get(this.currentSymbol) || [];
     const { slippage } = this.calculateRealisticSlippage(
        data.close,
        quantity,
        this.currentPosition === 'LONG' ? 'SELL' : 'BUY',
        data,
        index,
        historicalData
     );

     const slippageFactor = this.currentPosition === 'LONG' ? (1 - slippage / 100) : (1 + slippage / 100); // Sell/Cover
     const exitPrice = data.close * slippageFactor;

     // Calculate exit commission
     const exitValue = exitPrice * quantity;
     const { rate: exitCommissionRate } = this.calculateTieredCommission(exitValue);
     const exitCommission = exitValue * (exitCommissionRate / 100);
     
     // Entry commission from stored trade
     const openTrade = this.realisticOpenTrade;
     const entryCommission = openTrade.fees; // This was stored as entryCommission
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
     const trade: Trade = {
       ...openTrade,
       exitDate: data.date,
       exitPrice,
       pnl,
       pnlPercent,
       fees: totalCommission,
       exitReason: reason,
       commissionBreakdown: {
           entryCommission,
           exitCommission
       }
     };

     this.trades.push(trade);
     this.emit('position_closed', trade);

     // Reset position
     this.currentPosition = null;
     this.entryPrice = 0;
     this.stopLoss = 0;
     this.takeProfit = 0;
     this.realisticOpenTrade = null;
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
     let totalSlippage = this.config.slippage || 0.05;
     let marketImpact = 0;
     let timeOfDayFactor = 1.0;
     let volatilityFactor = 1.0;

     // 1. Market Impact (volume-based)
     if (this.config.useRealisticSlippage && this.config.averageDailyVolume) {
       const orderValue = price * quantity;
       const avgDailyValue = this.config.averageDailyVolume * price;
       const orderSizeRatio = orderValue / avgDailyValue;
       
       const lambda = this.config.marketImpactCoefficient || 0.1;
       marketImpact = lambda * Math.sqrt(orderSizeRatio) * 100;
       totalSlippage += marketImpact;
     }

     // 2. Time-of-day slippage
     if (this.config.useTimeOfDaySlippage) {
       timeOfDayFactor = this.calculateTimeOfDayFactor(data.date);
       totalSlippage *= timeOfDayFactor;
     }

     // 3. Volatility-based slippage
     if (this.config.useVolatilitySlippage) {
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

   private calculateTimeOfDayFactor(dateStr: string): number {
     const date = new Date(dateStr);
     const hour = date.getUTCHours();
     const minute = date.getUTCMinutes();
     const timeInMinutes = hour * 60 + minute;
     const marketOpen = 9 * 60 + 30; // 9:30 AM
     const marketClose = 16 * 60; // 4:00 PM

     if (timeInMinutes <= marketOpen + 30) {
       return this.config.marketOpenSlippageMultiplier || 1.5;
     }
     if (timeInMinutes >= marketClose - 30) {
       return this.config.marketCloseSlippageMultiplier || 1.3;
     }
     return 1.0;
   }

   private calculateVolatilityFactor(index: number, historicalData: OHLCV[]): number {
     if (this.volatilityCache.has(index)) {
       return this.volatilityCache.get(index)!;
     }

     const window = this.config.volatilityWindow || 20;
     if (index < window) {
       return 1.0;
     }

     const windowData = historicalData.slice(index - window, index);
     const returns = windowData.slice(1).map((d, i) => {
       const prevClose = windowData[i].close;
       return prevClose === 0 ? 0 : (d.close - prevClose) / prevClose;
     });

     const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
     const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
     const volatility = Math.sqrt(variance);

     const normalizedVol = volatility / 0.015;
     const multiplier = this.config.volatilitySlippageMultiplier || 2.0;
     const factor = 1.0 + (normalizedVol - 1.0) * (multiplier - 1.0);

     const result = Math.max(0.5, Math.min(3.0, factor));
     this.volatilityCache.set(index, result);
     return result;
   }

   protected calculateTieredCommission(orderValue: number): { rate: number; tier: number } {
     if (!this.config.useTieredCommissions || !this.config.commissionTiers) {
       return { rate: this.config.commission || 0.1, tier: 0 };
     }

     const tiers = this.config.commissionTiers;
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

   // ============================================================================
   // Advanced Metrics Calculation
   // ============================================================================

   protected override calculateMetrics(): PerformanceMetrics {
       // Get basic metrics from base class
       const basicMetrics = super.calculateMetrics();

       const returns = this.equityCurve.slice(1).map((eq, i) =>
        i === 0 ? 0 : (eq - this.equityCurve[i - 1]) / this.equityCurve[i - 1]
       ).slice(1);

       const skewness = this.calculateSkewness(returns);
       const kurtosis = this.calculateKurtosis(returns);
       const ulcerIndex = this.calculateUlcerIndex(this.equityCurve);
       const profitToDrawdownRatio = basicMetrics.maxDrawdown > 0 ? (basicMetrics.totalReturn / 100) / (basicMetrics.maxDrawdown / 100) : 0;
       const volatility = basicMetrics.volatility / 100; // Convert back to decimal? No, volatility is percentage in base.
       const returnToRiskRatio = volatility > 0 ? (basicMetrics.annualizedReturn / 100) / volatility : 0;

       const { maxConsecutiveWins, maxConsecutiveLosses } = this.calculateMaxConsecutive(this.trades);

       // Merge
       return {
           ...basicMetrics,
           skewness: parseFloat(skewness.toFixed(4)),
           kurtosis: parseFloat(kurtosis.toFixed(4)),
           maxConsecutiveWins,
           maxConsecutiveLosses,
           profitToDrawdownRatio: parseFloat(profitToDrawdownRatio.toFixed(4)),
           returnToRiskRatio: parseFloat(returnToRiskRatio.toFixed(4)),
           ulcerIndex: parseFloat(ulcerIndex.toFixed(4)),
       };
   }

   private calculateMaxConsecutive(trades: Trade[]): { maxConsecutiveWins: number; maxConsecutiveLosses: number } {
     let maxWins = 0, maxLosses = 0, currentWins = 0, currentLosses = 0;
     for (const trade of trades) {
       if (trade.pnl > 0) {
         currentWins++;
         currentLosses = 0;
         maxWins = Math.max(maxWins, currentWins);
       } else {
         currentLosses++;
         currentWins = 0;
         maxLosses = Math.max(maxLosses, currentLosses);
       }
     }
     return { maxConsecutiveWins: maxWins, maxConsecutiveLosses: maxLosses };
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

   private calculateUlcerIndex(equityCurve: number[]): number {
     if (equityCurve.length === 0) return 0;
     
     let peak = -Infinity;
     const drawdowns = equityCurve.map((equity) => {
       peak = Math.max(peak, equity);
       return Math.pow((peak - equity) / peak, 2);
     });
     return Math.sqrt(drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length) * 100;
   }

   /**
    * Run Monte Carlo simulation
    */
   async runMonteCarloSimulation(
     originalResult: RealisticBacktestResult,
     numSimulations: number = 1000
   ): Promise<MonteCarloResult> {
     const simulator = new MonteCarloSimulator({
         numSimulations,
     });
     
     return await simulator.runSimulation(originalResult);
   }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<BacktestConfig>) => new RealisticBacktestEngine(config)
);

export const getRealisticBacktestEngine = getInstance;
export const resetRealisticBacktestEngine = resetInstance;

export default RealisticBacktestEngine;
