/**
 * Backtest Related Type Definitions
 */

export interface BacktestTrade {
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  profitPercent?: number;
  status?: 'OPEN' | 'CLOSED';
  reason?: string;
  exitReason?: string;
}

export interface BacktestResult {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  expectancy?: number;
  trades: BacktestTrade[];
  startDate: string;
  endDate: string;
  warning?: string;
  // Walk-Forward Analysis metrics
  walkForwardMetrics?: {
    inSampleAccuracy: number;  // Average accuracy during training
    outOfSampleAccuracy: number;  // Average accuracy during validation
    overfitScore: number;  // Ratio of OOS/IS accuracy (closer to 1.0 = less overfitting)
    parameterStability: number;  // Standard deviation of parameters across windows
  };
}

/**
 * Backtest position state
 */
export interface BacktestPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  entryDate: string;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  reason?: string;
  value: number; // ポジションの初期価値（quantity × entryPrice）
}
