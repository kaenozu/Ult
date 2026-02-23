import { BacktestResult, BacktestTrade } from '@/app/types';

export interface PortfolioConfig {
  initialCapital: number;
  maxPositions: number;
  maxPositionSize: number;
  minPositionSize: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'none';
  rebalanceThreshold: number;
  correlationThreshold: number;
  useEqualWeight: boolean;
  useRiskParity: boolean;
}

export interface MultiAssetBacktestConfig {
  symbols: string[];
  startDate: string;
  endDate: string;
  portfolio: PortfolioConfig;
  strategy: {
    rsiPeriod: number;
    smaPeriod: number;
    useTrailingStop: boolean;
    trailingStopPercent: number;
  };
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  weight: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  entryDate: string;
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  cash: number;
  positions: PortfolioPosition[];
  weights: Map<string, number>;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
}

export interface RebalanceEvent {
  date: string;
  reason: 'scheduled' | 'threshold' | 'signal';
  trades: RebalanceTrade[];
  beforeWeights: Map<string, number>;
  afterWeights: Map<string, number>;
}

export interface RebalanceTrade {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  value: number;
}

export interface MultiAssetBacktestResult {
  config: MultiAssetBacktestConfig;
  portfolioSnapshots: PortfolioSnapshot[];
  individualResults: Map<string, BacktestResult>;
  correlationMatrix: CorrelationMatrix;
  rebalanceEvents: RebalanceEvent[];
  metrics: PortfolioPerformanceMetrics;
  trades: BacktestTrade[];
  startDate: string;
  endDate: string;
}

export interface PortfolioPerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
  totalTrades: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  trackingError: number;
  diversificationRatio: number;
  concentrationRisk: number;
  turnoverRate: number;
  monthlyReturns: MonthlyReturn[];
  yearlyReturns: YearlyReturn[];
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
  trades: number;
}

export interface YearlyReturn {
  year: number;
  return: number;
  trades: number;
}
