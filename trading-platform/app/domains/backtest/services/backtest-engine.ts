/**
 * Backtest Engine
 * 
 * バックテスト実行エンジン
 */

import { OHLCV, Signal } from '../../../lib/types';
import { BacktestParams, BacktestResult, BacktestTrade, BacktestMetrics } from '../types';

export class BacktestEngine {
  async runBacktest(
    signals: Signal[],
    data: OHLCV[],
    params: BacktestParams
  ): Promise<BacktestResult> {
    const trades: BacktestTrade[] = [];
    const equityCurve: { date: Date; equity: number }[] = [];
    let currentEquity = params.initialCapital;
    let maxEquity = currentEquity;
    let maxDrawdown = 0;

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      const entryData = data.find(d => d.timestamp >= signal.timestamp);
      
      if (!entryData) continue;

      const positionSize = Math.min(
        params.positionSize,
        (currentEquity * params.positionSize) / entryData.close
      );

      const stopLoss = signal.type === 'buy' 
        ? entryData.close * (1 - params.stopLossPercent / 100)
        : entryData.close * (1 + params.stopLossPercent / 100);

      const takeProfit = signal.type === 'buy'
        ? entryData.close * (1 + params.takeProfitPercent / 100)
        : entryData.close * (1 - params.takeProfitPercent / 100);

      // シンプルな exit ロジック（次のデータポイントで判定）
      const exitData = data[data.indexOf(entryData) + 1];
      if (!exitData) continue;

      let exitPrice = exitData.close;
      let exitReason: 'stop' | 'profit' | 'signal' = 'signal';

      if (signal.type === 'buy') {
        if (exitData.low <= stopLoss) {
          exitPrice = stopLoss;
          exitReason = 'stop';
        } else if (exitData.high >= takeProfit) {
          exitPrice = takeProfit;
          exitReason = 'profit';
        }
      } else {
        if (exitData.high >= stopLoss) {
          exitPrice = stopLoss;
          exitReason = 'stop';
        } else if (exitData.low <= takeProfit) {
          exitPrice = takeProfit;
          exitReason = 'profit';
        }
      }

      const pnl = signal.type === 'buy'
        ? (exitPrice - entryData.close) * positionSize
        : (entryData.close - exitPrice) * positionSize;

      const pnlPercent = (pnl / currentEquity) * 100;
      currentEquity += pnl;

      if (currentEquity > maxEquity) {
        maxEquity = currentEquity;
      } else {
        const drawdown = maxEquity - currentEquity;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      trades.push({
        entryDate: new Date(entryData.timestamp),
        exitDate: new Date(exitData.timestamp),
        entryPrice: entryData.close,
        exitPrice,
        size: positionSize,
        pnl,
        pnlPercent,
        type: signal.type === 'buy' ? 'long' : 'short',
      });

      equityCurve.push({
        date: new Date(exitData.timestamp),
        equity: currentEquity,
      });
    }

    const metrics = this.calculateMetrics(trades, params.initialCapital, maxDrawdown);

    return {
      trades,
      metrics,
      equityCurve,
    };
  }

  private calculateMetrics(
    trades: BacktestTrade[],
    initialCapital: number,
    maxDrawdown: number
  ): BacktestMetrics {
    if (trades.length === 0) {
      return {
        totalReturn: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        maxDrawdown,
        maxDrawdownPercent: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
      };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Sortino用（負のリターンのみ）
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDeviation = negativeReturns.length > 0
      ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length)
      : 0;

    const finalEquity = initialCapital + trades.reduce((sum, t) => sum + t.pnl, 0);

    return {
      totalReturn: ((finalEquity - initialCapital) / initialCapital) * 100,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: winningTrades.length / trades.length,
      averageWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
      maxDrawdown,
      maxDrawdownPercent: (maxDrawdown / initialCapital) * 100,
      sharpeRatio: stdDev > 0 ? avgReturn / stdDev : 0,
      sortinoRatio: downsideDeviation > 0 ? avgReturn / downsideDeviation : 0,
    };
  }
}

export const backtestEngine = new BacktestEngine();
