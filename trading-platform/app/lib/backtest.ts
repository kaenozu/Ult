import { OHLCV, Signal } from '@/app/types';
import { analyzeStock } from './analysis';

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfitPercent: number;
  maxDrawdown: number;
  profitFactor: number;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  profitPercent: number;
  reason: string;
}

export function runBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): BacktestResult {
  const trades: BacktestTrade[] = [];
  let currentPosition: { type: 'BUY' | 'SELL', price: number, date: string } | null = null;
  
  // Need at least 50 days for indicators
  const minPeriod = 50;
  if (data.length < minPeriod) {
    return createEmptyResult();
  }

  // Simulate trading day by day
  // We use a window of past data to generate a signal for "today"
  for (let i = minPeriod; i < data.length - 1; i++) {
    const nextDay = data[i + 1]; // Execution happens next open or close
    
    // Slice data up to current day for analysis
    const historicalWindow = data.slice(0, i + 1);
    
    // Generate signal
    const signal = analyzeStock(symbol, historicalWindow, market);

    // Logic: 
    // If NO position and signal is BUY/SELL -> Open Position
    // If HAS position and signal is OPPOSITE or HOLD (with stop/target logic) -> Close Position
    
    if (!currentPosition) {
      if (signal.type === 'BUY' || signal.type === 'SELL') {
        if (signal.confidence >= 60) { // Filter weak signals
          currentPosition = {
            type: signal.type,
            price: nextDay.open, // Assume execution at next open
            date: nextDay.date
          };
        }
      }
    } else {
      // Check for exit conditions
      // 1. Signal reversal
      // 2. Stop loss / Take profit (simplified)
      
      let shouldExit = false;
      let exitReason = '';

      if (currentPosition.type === 'BUY' && signal.type === 'SELL') {
        shouldExit = true;
        exitReason = 'Signal Reversal';
      } else if (currentPosition.type === 'SELL' && signal.type === 'BUY') {
        shouldExit = true;
        exitReason = 'Signal Reversal';
      } else {
        // Simple 5% stop/target for backtest simplicity if no signal reversal
        const change = (nextDay.close - currentPosition.price) / currentPosition.price;
        if (currentPosition.type === 'BUY') {
          if (change > 0.05) { shouldExit = true; exitReason = 'Take Profit (+5%)'; }
          if (change < -0.03) { shouldExit = true; exitReason = 'Stop Loss (-3%)'; }
        } else {
          if (change < -0.05) { shouldExit = true; exitReason = 'Take Profit (+5%)'; }
          if (change > 0.03) { shouldExit = true; exitReason = 'Stop Loss (-3%)'; }
        }
      }

      if (shouldExit) {
        const exitPrice = nextDay.close; // Assume exit at close
        const rawProfit = currentPosition.type === 'BUY' 
          ? (exitPrice - currentPosition.price) / currentPosition.price
          : (currentPosition.price - exitPrice) / currentPosition.price;
        
        trades.push({
          entryDate: currentPosition.date,
          exitDate: nextDay.date,
          type: currentPosition.type,
          entryPrice: currentPosition.price,
          exitPrice: exitPrice,
          profitPercent: rawProfit * 100,
          reason: exitReason
        });
        currentPosition = null;
      }
    }
  }

  return calculateStats(trades);
}

function createEmptyResult(): BacktestResult {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfitPercent: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    trades: []
  };
}

function calculateStats(trades: BacktestTrade[]): BacktestResult {
  const winningTrades = trades.filter(t => t.profitPercent > 0).length;
  const losingTrades = trades.filter(t => t.profitPercent <= 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  const totalProfitPercent = trades.reduce((sum, t) => sum + t.profitPercent, 0);
  
  const grossProfit = trades.filter(t => t.profitPercent > 0).reduce((sum, t) => sum + t.profitPercent, 0);
  const grossLoss = Math.abs(trades.filter(t => t.profitPercent < 0).reduce((sum, t) => sum + t.profitPercent, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Max Drawdown calculation (simplified based on cumulative equity curve)
  let peak = 0;
  let maxDrawdown = 0;
  let equity = 100; // Start at 100%
  
  for (const trade of trades) {
    equity *= (1 + trade.profitPercent / 100);
    if (equity > peak) peak = equity;
    const drawdown = (peak - equity) / peak * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: parseFloat(winRate.toFixed(1)),
    totalProfitPercent: parseFloat(totalProfitPercent.toFixed(1)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    trades: trades.reverse() // Newest first
  };
}
