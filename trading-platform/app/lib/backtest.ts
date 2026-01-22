import { OHLCV, Signal, Stock } from '@/app/types';
import { mlPredictionService } from './mlPrediction';

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
  let currentPosition: { 
    type: 'BUY' | 'SELL', 
    price: number, 
    date: string, 
    stopLoss: number,
    highestPrice: number, // For trailing stop
    lowestPrice: number   // For trailing stop
  } | null = null;
  
  const minPeriod = 50;
  if (data.length < minPeriod) {
    return createEmptyResult();
  }

  const mockStock: Stock = { 
    symbol, 
    market, 
    name: symbol, 
    price: data[minPeriod].close,
    sector: 'Unknown',
    change: 0,
    changePercent: 0,
    volume: 0
  };

  for (let i = minPeriod; i < data.length - 1; i++) {
    const currentDay = data[i];
    const nextDay = data[i + 1];
    
    const historicalWindow = data.slice(0, i + 1);
    const indicators = mlPredictionService.calculateIndicators(historicalWindow);
    const prediction = mlPredictionService.predict(mockStock, historicalWindow, indicators);
    const signal = mlPredictionService.generateSignal(mockStock, historicalWindow, prediction, indicators);

    if (!currentPosition) {
      if ((signal.type === 'BUY' || signal.type === 'SELL') && signal.confidence >= 60) {
        currentPosition = {
          type: signal.type,
          price: nextDay.open,
          date: nextDay.date,
          stopLoss: signal.stopLoss,
          highestPrice: nextDay.open,
          lowestPrice: nextDay.open
        };
      }
    } else {
      // Update highest/lowest for trailing stop
      currentPosition.highestPrice = Math.max(currentPosition.highestPrice, nextDay.high);
      currentPosition.lowestPrice = Math.min(currentPosition.lowestPrice, nextDay.low);

      // Trailing Stop Logic: Pull up stop loss as price moves in favor
      // Simple ATR-based trail (approximate)
      const trailBuffer = (currentPosition.highestPrice - currentPosition.price) * 0.3; // Lock in 30% of max gains
      
      let shouldExit = false;
      let exitReason = '';
      let exitPrice = nextDay.close;

      // 1. Signal Reversal
      if (currentPosition.type === 'BUY' && signal.type === 'SELL') {
        shouldExit = true;
        exitReason = 'Signal Reversal';
      } else if (currentPosition.type === 'SELL' && signal.type === 'BUY') {
        shouldExit = true;
        exitReason = 'Signal Reversal';
      } 
      // 2. Trailing Stop or Original Stop Loss
      else if (currentPosition.type === 'BUY') {
        const dynamicStop = Math.max(currentPosition.stopLoss, currentPosition.highestPrice * 0.95); // 5% trail or original stop
        if (nextDay.low <= dynamicStop) {
          shouldExit = true;
          exitPrice = dynamicStop;
          exitReason = 'Trailing Stop Triggered';
        }
      } else if (currentPosition.type === 'SELL') {
        const dynamicStop = Math.min(currentPosition.stopLoss, currentPosition.lowestPrice * 1.05); // 5% trail or original stop
        if (nextDay.high >= dynamicStop) {
          shouldExit = true;
          exitPrice = dynamicStop;
          exitReason = 'Trailing Stop Triggered';
        }
      }

      if (shouldExit) {
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
