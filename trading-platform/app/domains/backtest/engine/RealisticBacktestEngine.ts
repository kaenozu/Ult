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
  AdvancedBacktestEngine,
  BacktestConfig,
  BacktestResult,
  Strategy,
  Trade,
  StrategyContext
} from './AdvancedBacktestEngine';
import { SlippagePredictionService, OrderBook, OrderBookLevel } from '@/app/lib/execution/SlippagePredictionService';

// ============================================================================
// Extended Types for Realistic Simulation
// ============================================================================

export interface RealisticBacktestConfig extends BacktestConfig {
  // Market Impact
  useRealisticSlippage?: boolean;
  averageDailyVolume?: number;
  marketImpactCoefficient?: number; // Kyle's lambda parameter
  
  // Time-based slippage
  useTimeOfDaySlippage?: boolean;
  marketOpenSlippageMultiplier?: number;
  marketCloseSlippageMultiplier?: number;
  
  // Volatility-based slippage
  useVolatilitySlippage?: boolean;
  volatilityWindow?: number;
  volatilitySlippageMultiplier?: number;
  
  // Commission structure
  useTieredCommissions?: boolean;
  commissionTiers?: Array<{
    volumeThreshold: number;
    rate: number;
  }>;
  
  // Order book simulation
  simulateOrderBook?: boolean;
  orderBookDepth?: number;
}

export interface RealisticTradeMetrics extends Trade {
  marketImpact: number;
  effectiveSlippage: number;
  commissionTier?: number;
  timeOfDayFactor?: number;
  volatilityFactor?: number;
}

export interface RealisticBacktestResult extends BacktestResult {
  trades: RealisticTradeMetrics[];
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

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_REALISTIC_CONFIG: Partial<RealisticBacktestConfig> = {
  initialCapital: 100000,
  commission: 0.1,
  slippage: 0.05,
  spread: 0.01,
  maxPositionSize: 20,
  maxDrawdown: 50,
  allowShort: true,
  useStopLoss: true,
  useTakeProfit: true,
  riskPerTrade: 2,
  useRealisticSlippage: true,
  averageDailyVolume: 1000000,
  marketImpactCoefficient: 0.1,
  useTimeOfDaySlippage: true,
  marketOpenSlippageMultiplier: 1.5,
  marketCloseSlippageMultiplier: 1.3,
  useVolatilitySlippage: true,
  volatilityWindow: 20,
  volatilitySlippageMultiplier: 2.0,
  useTieredCommissions: true,
  commissionTiers: [
    { volumeThreshold: 0, rate: 0.1 },      // 0.1% for low volume
    { volumeThreshold: 100000, rate: 0.08 }, // 0.08% for medium volume
    { volumeThreshold: 500000, rate: 0.05 }, // 0.05% for high volume
    { volumeThreshold: 1000000, rate: 0.03 } // 0.03% for very high volume
  ],
  simulateOrderBook: false,
  orderBookDepth: 10
};

// ============================================================================
// Realistic Backtest Engine
// ============================================================================

export class RealisticBacktestEngine extends AdvancedBacktestEngine {
  private realisticConfig: RealisticBacktestConfig;
  private slippageService: SlippagePredictionService;
  private cumulativeVolume: number = 0;
  private volatilityCache: Map<number, number> = new Map();
  private tradeTimestamps: number[] = [];

  constructor(config: Partial<RealisticBacktestConfig> = {}) {
    const mergedConfig = { ...DEFAULT_REALISTIC_CONFIG, ...config } as BacktestConfig;
    super(mergedConfig);
    this.realisticConfig = { ...(DEFAULT_REALISTIC_CONFIG as RealisticBacktestConfig), ...config } as RealisticBacktestConfig;
    this.slippageService = new SlippagePredictionService();
  }

  /**
   * Override runBacktest to add realistic simulation
   */
  async runBacktest(strategy: Strategy, symbol: string): Promise<RealisticBacktestResult> {
    // Reset realistic tracking
    this.cumulativeVolume = 0;
    this.volatilityCache.clear();
    this.tradeTimestamps = [];

    // Run base backtest
    const baseResult = await super.runBacktest(strategy, symbol);

    // Calculate enhanced metrics
    const trades = baseResult.trades as RealisticTradeMetrics[];
    const transactionCosts = this.calculateTransactionCosts(trades);
    const executionQuality = this.calculateExecutionQuality(trades);

    return {
      ...baseResult,
      trades,
      transactionCosts,
      executionQuality
    };
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
   * Enhanced position opening with realistic costs
   */
  protected openPositionRealistic(
    side: 'LONG' | 'SHORT',
    data: OHLCV,
    quantity: number,
    index: number,
    historicalData: OHLCV[]
  ): RealisticTradeMetrics {
    const basePrice = data.close;
    
    // Calculate realistic slippage
    const { slippage, marketImpact, timeOfDayFactor, volatilityFactor } = 
      this.calculateRealisticSlippage(basePrice, quantity, side === 'LONG' ? 'BUY' : 'SELL', data, index, historicalData);
    
    // Apply slippage to price
    const slippageFactor = side === 'LONG' ? (1 + slippage / 100) : (1 - slippage / 100);
    const executionPrice = basePrice * slippageFactor;
    
    // Calculate tiered commission
    const orderValue = executionPrice * quantity;
    const { rate: commissionRate, tier: commissionTier } = this.calculateTieredCommission(orderValue);
    const commission = orderValue * (commissionRate / 100);

    // Record trade timestamp
    this.tradeTimestamps.push(Date.now());

    return {
      id: `trade_${this.tradeTimestamps.length}`,
      entryDate: data.date,
      symbol: '',
      side,
      entryPrice: executionPrice,
      quantity,
      pnl: 0,
      pnlPercent: 0,
      fees: commission,
      exitReason: 'signal',
      marketImpact,
      effectiveSlippage: slippage,
      commissionTier,
      timeOfDayFactor,
      volatilityFactor
    } as RealisticTradeMetrics;
  }

  /**
   * Get realistic simulation statistics
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

import { createSingleton } from '@/app/lib/utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<RealisticBacktestConfig>) => new RealisticBacktestEngine(config)
);

export const getRealisticBacktestEngine = getInstance;
export const resetRealisticBacktestEngine = resetInstance;

export default RealisticBacktestEngine;
