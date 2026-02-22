/**
 * Risk Management Types
 */

import { Position, Portfolio } from '@/app/types';

export interface RiskMetrics {
  var: number; // Value at Risk
  cvar: number; // Conditional VaR
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  correlationMatrix: Map<string, Map<string, number>>;
  concentrationRisk: number;
  leverage: number;
}

export interface PositionSizingParams {
  capital: number;
  entryPrice: number;
  stopLossPrice?: number;
  riskPercent?: number;
  method: 'fixed' | 'kelly' | 'optimal_f' | 'fixed_ratio' | 'volatility_based';
  volatility?: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
}

export interface PositionSizingResult {
  recommendedSize: number;
  riskAmount: number;
  riskPercent: number;
  positionValue: number;
  maxPositionSize: number;
  reasoning: string[];
}

export interface RiskLimits {
  maxPositionSize: number; // Max position as % of portfolio
  maxSectorExposure: number; // Max sector exposure as %
  maxSingleTradeRisk: number; // Max risk per trade as %
  maxDailyLoss: number; // Max daily loss as %
  maxDrawdown: number; // Max drawdown before trading halt
  maxLeverage: number; // Max leverage ratio
  minCashReserve: number; // Minimum cash reserve as %
}

export interface RiskAlert {
  type: 'position_limit' | 'drawdown' | 'correlation' | 'volatility' | 'concentration' | 'margin' | 'daily_loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  symbol?: string;
  currentValue: number;
  limitValue: number;
  timestamp: number;
}

export interface OrderValidationResult {
  allowed: boolean;
  reasons: string[];
  violations: RiskAlert[];
  action: 'allow' | 'alert' | 'reject' | 'halt';
}

export interface OrderRequest {
  symbol: string;
  quantity: number;
  price: number;
  side: 'BUY' | 'SELL';
  stopLoss?: number;
  type: 'MARKET' | 'LIMIT' | 'STOP';
}

export interface PortfolioOptimizationParams {
  symbols: string[];
  expectedReturns: Map<string, number>;
  covariances: Map<string, Map<string, number>>;
  constraints: {
    minWeight?: number;
    maxWeight?: number;
    targetReturn?: number;
    maxRisk?: number;
  };
}

export interface OptimizationResult {
  weights: Map<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  efficientFrontier: Array<{ return: number; risk: number }>;
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxPositionSize: 20, // 20% of portfolio
  maxSectorExposure: 30, // 30% per sector
  maxSingleTradeRisk: 2, // 2% per trade
  maxDailyLoss: 5, // 5% daily loss limit
  maxDrawdown: 15, // 15% max drawdown
  maxLeverage: 2, // 2x leverage
  minCashReserve: 10, // 10% cash reserve
};
