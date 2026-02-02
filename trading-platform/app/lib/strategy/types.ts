/**
 * types.ts
 * 
 * Type definitions for strategy catalog and composition
 */

import type { OHLCV } from '@/app/types';

// ============================================================================
// Strategy Types
// ============================================================================

export type StrategyType = 
  | 'momentum' 
  | 'mean_reversion' 
  | 'breakout' 
  | 'stat_arb' 
  | 'market_making' 
  | 'ml_alpha';

export interface StrategyConfig {
  name: string;
  type: StrategyType;
  description: string;
  parameters: Record<string, number | string>;
  enabled: boolean;
  weight?: number; // for portfolio composition (0-1)
}

export interface StrategySignal {
  timestamp: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-1
  confidence: number; // 0-1
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface StrategyPerformance {
  strategyName: string;
  strategyType: StrategyType;
  
  // Returns
  totalReturn: number;
  annualizedReturn: number;
  cagr: number;
  
  // Risk metrics
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Trade metrics
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  
  // Comparison to benchmark
  alpha: number; // excess return over benchmark
  beta: number; // sensitivity to benchmark
  informationRatio: number;
  trackingError: number;
  
  // Time analysis
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export interface Strategy {
  config: StrategyConfig;
  
  /**
   * Initialize strategy with historical data
   */
  initialize(data: OHLCV[]): Promise<void>;
  
  /**
   * Generate trading signal for current market state
   */
  generateSignal(currentData: OHLCV, historicalData: OHLCV[]): Promise<StrategySignal>;
  
  /**
   * Calculate indicators needed for this strategy
   */
  calculateIndicators(data: OHLCV[]): Promise<Record<string, number[]>>;
  
  /**
   * Backtest the strategy on historical data
   */
  backtest(data: OHLCV[], config: BacktestConfig): Promise<StrategyPerformance>;
  
  /**
   * Optimize strategy parameters
   */
  optimize(data: OHLCV[], objectiveFunction: (perf: StrategyPerformance) => number): Promise<StrategyConfig>;
}

export interface BacktestConfig {
  initialCapital: number;
  commission: number;
  slippage: number;
  maxPositionSize: number;
  stopLoss?: number;
  takeProfit?: number;
}

// ============================================================================
// Strategy Composition Types
// ============================================================================

export interface StrategyPortfolio {
  name: string;
  strategies: Array<{
    strategy: Strategy;
    weight: number;
    enabled: boolean;
  }>;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  correlationThreshold: number; // max correlation between strategies
}

export interface CorrelationMatrix {
  strategies: string[];
  matrix: number[][];
  avgCorrelation: number;
  maxCorrelation: number;
  minCorrelation: number;
}

export interface PortfolioPerformance {
  portfolioName: string;
  strategies: Array<{
    name: string;
    weight: number;
    contribution: number; // contribution to total return
  }>;
  
  // Aggregate performance
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // Diversification metrics
  diversificationRatio: number;
  correlationBenefit: number; // reduction in volatility due to diversification
  
  // vs single best strategy
  improvementOverBest: number;
}

// ============================================================================
// Strategy Template Types
// ============================================================================

export interface MomentumStrategyParams {
  lookbackPeriod: number;
  momentumThreshold: number;
  exitThreshold: number;
}

export interface MeanReversionStrategyParams {
  bollingerPeriod: number;
  bollingerStdDev: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
}

export interface BreakoutStrategyParams {
  breakoutPeriod: number;
  volumeConfirmation: boolean;
  volumeThreshold: number;
  atrMultiplier: number;
}

export interface StatArbStrategyParams {
  pairSymbol: string;
  lookbackPeriod: number;
  entryZScore: number;
  exitZScore: number;
  hedgeRatio: number;
}

export interface MarketMakingStrategyParams {
  spreadBps: number;
  inventoryLimit: number;
  skewFactor: number;
  minOrderSize: number;
}

export interface MLAlphaStrategyParams {
  model: 'random_forest' | 'gradient_boosting' | 'neural_network';
  features: string[];
  lookbackPeriod: number;
  retrainFrequency: number; // days
  predictionThreshold: number;
}
