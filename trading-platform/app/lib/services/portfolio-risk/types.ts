import { Position, Stock, OHLCV } from '@/app/types';

export interface PortfolioRiskMetrics {
  valueAtRisk: number;
  expectedShortfall: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  correlationMatrix: number[][];
  concentrationRisk: number;
  diversificationRatio: number;
  marginUtilization: number;
}

export interface RiskLimits {
  maxVaR: number;
  maxDrawdown: number;
  maxPositionConcentration: number;
  maxSectorExposure: number;
  maxBeta: number;
  minDiversificationRatio: number;
}

export interface PositionRisk {
  symbol: string;
  value: number;
  contributionToVaR: number;
  contributionToVolatility: number;
  beta: number;
  correlationToPortfolio: number;
  riskMetrics: {
    volatility: number;
    beta: number;
    valueAtRisk: number;
  };
}

export interface RiskCheckResult {
  isWithinLimits: boolean;
  violations: string[];
  recommendations: string[];
}

export interface PositionAdjustment {
  symbol: string;
  currentSize: number;
  suggestedSize: number;
  reason: string;
}

export type { Position, Stock, OHLCV };
