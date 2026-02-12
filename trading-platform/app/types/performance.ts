/**
 * Performance Monitoring Types
 * 
 * Type definitions for trading performance metrics, monitoring, and analysis
 */

// ============================================================================
// Trade Types
// ============================================================================

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: number;
  commission: number;
  stopLoss?: number;
  takeProfit?: number;
  profit?: number;
}

export interface TradePair {
  profit: number;
  entryTime: number;
  exitTime: number;
  initialRisk: number;
  entryPrice: number;
  exitPrice: number;
  symbol: string;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PortfolioSnapshot {
  timestamp: number;
  value: number;
  cash: number;
  positions: Record<string, PortfolioPosition>;
}

export interface DetailedPortfolio {
  id: string;
  initialValue: number;
  currentValue: number;
  cash: number;
  positions: Record<string, PortfolioPosition>;
  trades: Trade[];
  orders: Array<{
    id: string;
    symbol: string;
    type: 'MARKET' | 'LIMIT';
    side: 'BUY' | 'SELL';
    quantity: number;
    price?: number;
    status: 'OPEN' | 'FILLED' | 'CANCELLED';
  }>;
  history: PortfolioSnapshot[];
  createdAt: number;
}

export type { DetailedPortfolio as Portfolio };

// ============================================================================
// Performance Metrics Types
// ============================================================================

export interface PerformanceMetrics {
  // Basic Metrics
  totalReturn: number;
  annualizedReturn: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;

  // Risk-Adjusted Metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio: number;
  informationRatio: number;
  treynorRatio: number;

  // Risk Metrics
  maxDrawdown: number;
  maxDrawdownDuration: number;
  averageDrawdown: number;
  volatility: number;
  downsideDeviation: number;
  valueAtRisk: number;
  conditionalValueAtRisk: number;

  // Trade Quality Metrics
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  averageTrade: number;
  averageWinLossRatio: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingPeriod: number;
  averageRMultiple: number;

  // Efficiency Metrics
  expectancy: number;
  kellyCriterion: number;
  riskOfRuin: number;
  SQN: number; // System Quality Number

  // Extended Metrics (optional)
  skewness?: number;
  kurtosis?: number;
  maxConsecutiveWins?: number;
  maxConsecutiveLosses?: number;
  avgHoldingPeriod?: number;
  profitToDrawdownRatio?: number;
  returnToRiskRatio?: number;
  ulcerIndex?: number;
}

// ============================================================================
// Monitoring Types
// ============================================================================

export interface MonitoringAlert {
  level: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  timestamp: number;
  data?: unknown;
}

export interface MonitoringMetrics {
  timestamp: number;
  portfolioValue: number;
  dailyPnL: number;
  dailyReturn: number;
  openPositions: number;
  activeOrders: number;
  unrealizedPnL: number;
  riskExposure: number;
}

export interface MonitoringThresholds {
  maxDailyLoss: number;
  maxDrawdown: number;
  maxPositions: number;
  maxRiskExposure: number;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface TimeAnalysis {
  hourlyPerformance: Map<number, number>;
  dailyPerformance: Map<string, number>;
  monthlyPerformance: Map<string, number>;
  weekdayPerformance: Map<string, number>;
}

export interface SymbolAnalysis {
  symbol: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfit: number;
  averageReturn: number;
}

export interface AnalysisResult {
  summary: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
  };
  timeAnalysis: TimeAnalysis;
  symbolAnalysis: SymbolAnalysis[];
  patterns: {
    consecutiveWins: number;
    consecutiveLosses: number;
    bestTradingHour: number;
    worstTradingHour: number;
    bestTradingDay: string;
    worstTradingDay: string;
  };
  recommendations: string[];
}

// ============================================================================
// Report Types
// ============================================================================

export interface PerformanceReport {
  id: string;
  generatedAt: number;
  period: {
    start: number;
    end: number;
  };
  metrics: PerformanceMetrics;
  analysis: AnalysisResult;
  charts: {
    equityCurve: Array<{ timestamp: number; value: number }>;
    drawdownCurve: Array<{ timestamp: number; drawdown: number }>;
    returns: number[];
  };
}

export interface ReportConfig {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate?: number;
  endDate?: number;
  includeCharts: boolean;
  includeAnalysis: boolean;
  format: 'json' | 'html' | 'pdf';
}
