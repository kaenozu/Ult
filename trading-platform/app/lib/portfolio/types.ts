import { PORTFOLIO_OPTIMIZATION_DEFAULTS, PORTFOLIO_CONSTRAINTS } from '@/app/constants/portfolio';

export interface OptimizationConstraints {
  minWeight: number;
  maxWeight: number;
  targetReturn?: number;
  maxRisk?: number;
  sectorLimits?: Map<string, number>;
  minReturnThreshold?: number;
}

export interface OptimizationResult {
  weights: Map<string, number>;
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  informationRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  efficientFrontier: EfficientFrontierPoint[];
  optimizationType: 'MAX_SHARPE' | 'MIN_VARIANCE' | 'RISK_PARITY' | 'TARGET_RETURN';
  confidence: number;
}

export interface EfficientFrontierPoint {
  return: number;
  volatility: number;
  sharpeRatio: number;
  weights: Map<string, number>;
}

export interface AssetData {
  symbol: string;
  sector?: string;
  returns: number[];
  currentPrice?: number;
  companyName?: string;
}

export interface CovarianceOptions {
  lookbackPeriod?: number;
  tradingDaysPerYear?: number;
  riskFreeRate?: number;
  l2Regularization?: number;
}

export interface PortfolioRiskMetrics {
  portfolioReturn: number;
  portfolioVolatility: number;
  excessReturn: number;
  sharpeRatio: number;
  downsideRisk: number;
  sortinoRatio: number;
  maxDrawdown: number;
  valueAtRisk: Map<number, number>;
  conditionalVaR: Map<number, number>;
  beta?: number;
  alpha?: number;
}

export interface OptimizerConfig {
  riskFreeRate: number;
  tradingDaysPerYear: number;
  maxIterations: number;
  convergenceThreshold: number;
  maxCorrelation: number;
  sectorConcentrationLimit: number;
}

export const DEFAULT_CONFIG: OptimizerConfig = {
  riskFreeRate: PORTFOLIO_OPTIMIZATION_DEFAULTS.RISK_FREE_RATE,
  tradingDaysPerYear: PORTFOLIO_OPTIMIZATION_DEFAULTS.TRADING_DAYS_PER_YEAR,
  maxIterations: PORTFOLIO_OPTIMIZATION_DEFAULTS.MAX_ITERATIONS,
  convergenceThreshold: PORTFOLIO_OPTIMIZATION_DEFAULTS.CONVERGENCE_THRESHOLD,
  maxCorrelation: 0.99,
  sectorConcentrationLimit: 0.4,
};

export const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  minWeight: PORTFOLIO_CONSTRAINTS.DEFAULT_MIN_WEIGHTS / 100,
  maxWeight: PORTFOLIO_CONSTRAINTS.DEFAULT_MAX_WEIGHTS / 100,
  minReturnThreshold: -10,
};
