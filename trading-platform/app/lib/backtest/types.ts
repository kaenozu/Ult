import { OHLCV } from '@/app/types';
import { PerformanceMetrics } from '@/app/types/performance';

// Re-export PerformanceMetrics for consumers
export type { PerformanceMetrics };

// Commission Tier Interface (from Realistic)
export interface CommissionTier {
  volumeThreshold: number;
  rate: number;
}

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
  exitReason: 'target' | 'stop' | 'signal' | 'end_of_data' | 'time' | 'trailing_stop';

  // Realistic mode details (optional for backward compatibility)
  slippageAmount?: number;
  marketImpact?: number;
  effectiveSlippage?: number;
  commissionTier?: number;
  timeOfDayFactor?: number;
  volatilityFactor?: number;

  commissionBreakdown?: {
    entryCommission: number;
    exitCommission: number;
  };

  partialFills?: Array<{
    quantity: number;
    price: number;
    bar: number;
  }>;

  latencyMs?: number;

  // Extended properties for analytics compatibility
  strategy?: string;
  holdingPeriods?: number;
  riskRewardRatio?: number;
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

  // Realistic mode settings
  realisticMode?: boolean; // Enable realistic trading simulation
  market?: 'japan' | 'usa'; // Market for commission calculation
  averageDailyVolume?: number; // For partial fill simulation
  slippageEnabled?: boolean; // Use advanced slippage model
  commissionEnabled?: boolean; // Use market-specific commissions
  partialFillEnabled?: boolean; // Simulate partial fills
  latencyEnabled?: boolean; // Simulate execution latency
  latencyMs?: number; // Latency in milliseconds

  // Specific Realistic Engine Settings (merged from RealisticBacktestConfig)
  useRealisticSlippage?: boolean;
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

  // Transaction cost model settings
  transactionCostsEnabled?: boolean; // Enable transaction cost model
  transactionCostBroker?: string; // Broker name for cost calculation
  transactionCostMarketCondition?: 'normal' | 'volatile' | 'liquid'; // Market conditions
  transactionCostSettlementType?: 'same-day' | 't1' | 't2'; // Settlement type
  transactionCostDailyVolume?: number; // Daily volume for cost calculation
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: number[];
  metrics: PerformanceMetrics;
  config: BacktestConfig;
  startDate: string;
  endDate: string;
  duration: number; // days

  // Realistic specific metrics (optional)
  transactionCosts?: {
    totalCommissions: number;
    totalSlippage: number;
    totalMarketImpact: number;
    totalSpread: number;
    avgCommissionPerTrade: number;
    avgSlippagePerTrade: number;
    avgMarketImpactPerTrade: number;
  };
  executionQuality?: {
    avgExecutionTime: number;
    worstSlippage: number;
    bestSlippage: number;
    slippageStdDev: number;
  };
}

export type RealisticBacktestResult = BacktestResult;

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
