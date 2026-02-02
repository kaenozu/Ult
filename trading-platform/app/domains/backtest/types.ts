/**
 * Backtest Types
 */

export interface BacktestParams {
  initialCapital: number;
  positionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxPositions: number;
}

export interface BacktestTrade {
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  type: 'long' | 'short';
}

export interface BacktestResult {
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equityCurve: { date: Date; equity: number }[];
}

export interface BacktestMetrics {
  totalReturn: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
}
