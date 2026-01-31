/**
 * BacktestVisualizationUtils
 *
 * 取引統計の可視化用ユーティリティ
 * バックテスト結果のグラフやチャート用データを生成
 */

import { BacktestResult, BacktestTrade } from '../types';

export interface CumulativeReturnDataPoint {
  index: number;
  date: string;
  equity: number;
  returnPercent: number;
  drawdown: number;
}

export interface TradeDistribution {
  bins: { range: string; count: number }[];
  avg: number;
  median: number;
  stdDev: number;
}

export interface MonthlyPerformance {
  month: string;
  returnPercent: number;
  trades: number;
  winRate: number;
}

export class BacktestVisualizationUtils {
  /**
   * 累積リターン曲線とドローダウンを計算
   */
  static calculateCumulativeReturns(result: BacktestResult): CumulativeReturnDataPoint[] {
    const data: CumulativeReturnDataPoint[] = [];
    let equity = 100;
    let peak = 100;
    let initialEquity = 100;

    result.trades.forEach((trade, index) => {
      equity *= (1 + (trade.profitPercent || 0) / 100);
      if (equity > peak) peak = equity;

      const drawdown = ((peak - equity) / peak) * 100;
      const returnPercent = ((equity - initialEquity) / initialEquity) * 100;

      data.push({
        index,
        date: trade.exitDate || '',
        equity: parseFloat(equity.toFixed(2)),
        returnPercent: parseFloat(returnPercent.toFixed(2)),
        drawdown: parseFloat(drawdown.toFixed(2)),
      });
    });

    return data;
  }

  /**
   * 取引結果のヒストグラムデータを生成
   */
  static calculateTradeDistribution(result: BacktestResult, binCount: number = 20): TradeDistribution {
    const profits = result.trades.map(t => t.profitPercent || 0);
    if (profits.length === 0) {
      return { bins: [], avg: 0, median: 0, stdDev: 0 };
    }

    const min = Math.min(...profits);
    const max = Math.max(...profits);
    const binWidth = (max - min) / binCount;

    // Calculate bins
    const bins = Array.from({ length: binCount }, (_, i) => {
      const binMin = min + i * binWidth;
      const binMax = binMin + binWidth;
      const count = profits.filter(p => p >= binMin && (i === binCount - 1 ? p <= binMax : p < binMax)).length;
      return {
        range: `${binMin.toFixed(1)}% - ${binMax.toFixed(1)}%`,
        count,
      };
    });

    // Calculate statistics
    const avg = profits.reduce((sum, p) => sum + p, 0) / profits.length;
    const sortedProfits = [...profits].sort((a, b) => a - b);
    const median = sortedProfits.length % 2 === 0
      ? (sortedProfits[sortedProfits.length / 2 - 1] + sortedProfits[sortedProfits.length / 2]) / 2
      : sortedProfits[Math.floor(sortedProfits.length / 2)];
    const variance = profits.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / profits.length;
    const stdDev = Math.sqrt(variance);

    return {
      bins,
      avg: parseFloat(avg.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
    };
  }

  /**
   * 月次パフォーマンスを計算
   */
  static calculateMonthlyPerformance(result: BacktestResult): MonthlyPerformance[] {
    const monthlyMap = new Map<string, { return: number; trades: number; wins: number }>();

    result.trades.forEach(trade => {
      if (!trade.exitDate) return;
      const exitDate = new Date(trade.exitDate);
      const monthKey = `${exitDate.getFullYear()}-${String(exitDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { return: 0, trades: 0, wins: 0 });
      }

      const data = monthlyMap.get(monthKey)!;
      data.return += (trade.profitPercent || 0);
      data.trades++;
      if ((trade.profitPercent || 0) > 0) data.wins++;
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        returnPercent: parseFloat(data.return.toFixed(2)),
        trades: data.trades,
        winRate: parseFloat((data.trades > 0 ? (data.wins / data.trades) * 100 : 0).toFixed(1)),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * トレード別のエクイティカーブを生成
   */
  static generateEquityCurve(result: BacktestResult): number[] {
    const equity = [100];
    let currentEquity = 100;

    result.trades.forEach(trade => {
      currentEquity *= (1 + (trade.profitPercent || 0) / 100);
      equity.push(parseFloat(currentEquity.toFixed(2)));
    });

    return equity;
  }

  /**
   * ドローダウン配列を生成
   */
  static generateDrawdownCurve(result: BacktestResult): number[] {
    const drawdowns: number[] = [];
    let peak = 100;
    let equity = 100;

    result.trades.forEach(trade => {
      equity *= (1 + (trade.profitPercent || 0) / 100);
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      drawdowns.push(parseFloat(drawdown.toFixed(2)));
    });

    return drawdowns;
  }

  /**
   * ROE（Return on Equity）曲線を生成
   */
  static generateROECurve(result: BacktestResult): number[] {
    const roe: number[] = [0];
    const equity = this.generateEquityCurve(result);

    for (let i = 1; i < equity.length; i++) {
      roe.push(parseFloat((equity[i] - 100).toFixed(2)));
    }

    return roe;
  }

  /**
   * 勝率と損益の推移を計算
   */
  static calculateRollingPerformance(result: BacktestResult, windowSize: number = 10): {
    index: number;
    winRate: number;
    avgReturn: number;
  }[] {
    const rolling: { index: number; winRate: number; avgReturn: number }[] = [];

    for (let i = windowSize; i < result.trades.length; i++) {
      const windowTrades = result.trades.slice(i - windowSize, i);
      const wins = windowTrades.filter(t => (t.profitPercent || 0) > 0).length;
      const avgReturn = windowTrades.reduce((sum, t) => sum + (t.profitPercent || 0), 0) / windowSize;

      rolling.push({
        index: i,
        winRate: parseFloat((wins / windowSize * 100).toFixed(1)),
        avgReturn: parseFloat(avgReturn.toFixed(2)),
      });
    }

    return rolling;
  }

  /**
   * サマリー統計を生成
   */
  static generateSummaryStats(result: BacktestResult): {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
  } {
    const returns = result.trades.map(t => t.profitPercent || 0);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
    const volatility = Math.sqrt(variance);

    // 年率リターン（簡易計算：取引期間に基づく）
    const startDate = new Date(result.startDate);
    const endDate = new Date(result.endDate);
    const years = Math.max(0.1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const annualizedReturn = (Math.pow(1 + result.totalReturn / 100, 1 / years) - 1) * 100;

    return {
      totalReturn: result.totalReturn,
      annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      maxDrawdown: result.maxDrawdown,
      sharpeRatio: result.sharpeRatio || 0,
      sortinoRatio: result.sortinoRatio || 0,
      calmarRatio: result.calmarRatio || 0,
      winRate: result.winRate,
      profitFactor: result.profitFactor,
      expectancy: result.expectancy || 0,
    };
  }
}
