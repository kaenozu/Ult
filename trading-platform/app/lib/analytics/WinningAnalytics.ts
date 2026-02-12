/**
 * WinningAnalytics.ts
 * 
 * 株取引で勝つためのデータ分析・可視化エンジン
 * 
 * 【機能】
 * - 勝率分析
 * - 損益分析
 * - 取引パターン分析
 * - 市場レジーム検出
 * - パフォーマンスレポート生成
 */

import { OHLCV } from '@/app/types';
import { RealisticTradeMetrics, RealisticBacktestResult } from '../backtest/RealisticBacktestEngine';
import type { PerformanceMetrics } from '@/app/types/performance';

// Type aliases for backward compatibility
type BacktestTrade = RealisticTradeMetrics;
type BacktestResult = RealisticBacktestResult;

// Helper function to safely get holding periods from trade
function getHoldingPeriods(trade: RealisticTradeMetrics): number {
  return trade.holdingPeriods ?? 0;
}

// ============================================================================
// Types
// ============================================================================

export interface WinRateAnalysis {
  overallWinRate: number;
  winRateByStrategy: Map<string, number>;
  winRateByMarketCondition: Map<string, number>;
  winRateByTimeOfDay: Map<number, number>; // hour -> win rate
  winRateByDayOfWeek: Map<number, number>; // 0-6 -> win rate
  winRateTrend: { period: string; winRate: number }[];
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface ProfitLossAnalysis {
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  profitByMonth: Map<string, number>;
  profitByStrategy: Map<string, number>;
  equityCurve: number[];
  drawdownCurve: number[];
  recoveryFactor: number;
}

export interface TradePattern {
  patternName: string;
  frequency: number;
  winRate: number;
  avgProfit: number;
  avgHoldingPeriod: number;
  confidence: number;
}

export interface TradePatternAnalysis {
  patterns: TradePattern[];
  bestPattern: TradePattern | null;
  worstPattern: TradePattern | null;
  patternStability: number; // 0-100
}

export interface MarketRegime {
  regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' | 'UNKNOWN';
  startDate: string;
  endDate: string;
  duration: number; // days
  performance: {
    return: number;
    volatility: number;
    maxDrawdown: number;
  };
  optimalStrategy: string;
}

export interface PerformanceReport {
  summary: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalReturn: number;
  };
  winRateAnalysis: WinRateAnalysis;
  plAnalysis: ProfitLossAnalysis;
  patternAnalysis: TradePatternAnalysis;
  marketRegimes: MarketRegime[];
  recommendations: string[];
  riskAssessment: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    var95: number;
    var99: number;
    maxConsecutiveLosses: number;
    riskOfRuin: number;
  };
}

export interface ComparativeAnalysis {
  strategyComparison: {
    strategy: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    score: number;
  }[];
  benchmarkComparison: {
    strategy: string;
    alpha: number;
    beta: number;
    correlation: number;
    outperformance: number;
  }[];
  bestPerformingPeriods: {
    period: string;
    strategy: string;
    return: number;
  }[];
}

// ============================================================================
// Winning Analytics
// ============================================================================

class WinningAnalytics {
  /**
   * 包括的パフォーマンスレポートを生成
   */
  generatePerformanceReport(trades: BacktestTrade[], equityCurve: number[]): PerformanceReport {
    const metrics = this.calculateMetrics(trades, equityCurve);
    
    return {
      summary: {
        totalTrades: metrics.totalTrades,
        winRate: metrics.winRate,
        profitFactor: metrics.profitFactor,
        sharpeRatio: metrics.sharpeRatio,
        maxDrawdown: metrics.maxDrawdown,
        totalReturn: metrics.totalReturn,
      },
      winRateAnalysis: this.analyzeWinRate(trades),
      plAnalysis: this.analyzeProfitLoss(trades, equityCurve),
      patternAnalysis: this.analyzeTradePatterns(trades),
      marketRegimes: this.detectMarketRegimes(equityCurve),
      recommendations: this.generateRecommendations(trades, metrics),
      riskAssessment: this.assessRisk(trades, equityCurve),
    };
  }

  /**
   * 勝率分析
   */
  analyzeWinRate(trades: BacktestTrade[]): WinRateAnalysis {
    if (trades.length === 0) {
      return this.createEmptyWinRateAnalysis();
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const overallWinRate = (winningTrades.length / trades.length) * 100;

    // 戦略別勝率
    const winRateByStrategy = new Map<string, { wins: number; total: number }>();
    for (const trade of trades) {
      const current = winRateByStrategy.get(trade.strategy) || { wins: 0, total: 0 };
      current.total++;
      if (trade.pnl > 0) current.wins++;
      winRateByStrategy.set(trade.strategy, current);
    }

    const winRateByStrategyMap = new Map<string, number>();
    for (const [strategy, stats] of winRateByStrategy) {
      winRateByStrategyMap.set(strategy, (stats.wins / stats.total) * 100);
    }

    // 時間帯別勝率
    const winRateByTimeOfDay = this.calculateWinRateByHour(trades);
    
    // 曜日別勝率
    const winRateByDayOfWeek = this.calculateWinRateByDayOfWeek(trades);

    // 連勝・連敗
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutive(trades);

    return {
      overallWinRate,
      winRateByStrategy: winRateByStrategyMap,
      winRateByMarketCondition: new Map(), // 市場データが必要
      winRateByTimeOfDay,
      winRateByDayOfWeek,
      winRateTrend: this.calculateWinRateTrend(trades),
      consecutiveWins,
      consecutiveLosses,
    };
  }

  /**
   * 損益分析
   */
  analyzeProfitLoss(trades: BacktestTrade[], equityCurve: number[]): ProfitLossAnalysis {
    if (trades.length === 0) {
      return this.createEmptyPLAnalysis();
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const netProfit = totalProfit - totalLoss;

    const averageProfit = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const expectancy = (winRate * averageProfit) - ((1 - winRate) * averageLoss);

    // ドローダウンカーブ
    const drawdownCurve = this.calculateDrawdownCurve(equityCurve);

    // リカバリーファクター
    const maxDrawdown = Math.max(...drawdownCurve);
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;

    return {
      totalProfit,
      totalLoss,
      netProfit,
      averageProfit,
      averageLoss,
      profitFactor,
      expectancy,
      profitByMonth: this.calculateProfitByMonth(trades),
      profitByStrategy: this.calculateProfitByStrategy(trades),
      equityCurve,
      drawdownCurve,
      recoveryFactor,
    };
  }

  /**
   * 取引パターン分析
   */
  analyzeTradePatterns(trades: BacktestTrade[]): TradePatternAnalysis {
    if (trades.length < 10) {
      return {
        patterns: [],
        bestPattern: null,
        worstPattern: null,
        patternStability: 0,
      };
    }

    const patterns: TradePattern[] = [];

    // 戦略別パターン
    const strategyGroups = this.groupBy(trades, 'strategy');
    for (const [strategy, strategyTrades] of strategyGroups) {
      const winning = strategyTrades.filter((t: BacktestTrade) => t.pnl > 0);
      const winRate = (winning.length / strategyTrades.length) * 100;
      const avgProfit = strategyTrades.reduce((sum: number, t: BacktestTrade) => sum + t.pnl, 0) / strategyTrades.length;
      const avgHolding = strategyTrades.reduce((sum: number, t: BacktestTrade) => sum + getHoldingPeriods(t), 0) / strategyTrades.length;

      patterns.push({
        patternName: strategy,
        frequency: strategyTrades.length,
        winRate,
        avgProfit,
        avgHoldingPeriod: avgHolding,
        confidence: Math.min(100, strategyTrades.length * 5),
      });
    }

    // 保有期間別パターン
    const shortTerm = trades.filter(t => getHoldingPeriods(t) <= 5);
    const mediumTerm = trades.filter(t => getHoldingPeriods(t) > 5 && getHoldingPeriods(t) <= 20);
    const longTerm = trades.filter(t => getHoldingPeriods(t) > 20);

    if (shortTerm.length > 5) {
      patterns.push(this.createHoldingPattern('Short Term (<=5)', shortTerm));
    }
    if (mediumTerm.length > 5) {
      patterns.push(this.createHoldingPattern('Medium Term (6-20)', mediumTerm));
    }
    if (longTerm.length > 5) {
      patterns.push(this.createHoldingPattern('Long Term (>20)', longTerm));
    }

    // イグジット理由別パターン
    const exitGroups = this.groupBy(trades, 'exitReason');
    for (const [reason, reasonTrades] of exitGroups) {
      if (reasonTrades.length >= 5) {
        patterns.push(this.createExitPattern(reason, reasonTrades));
      }
    }

    // ベスト・ワーストパターン
    const sortedPatterns = [...patterns].sort((a, b) => b.avgProfit - a.avgProfit);
    const bestPattern = sortedPatterns[0] || null;
    const worstPattern = sortedPatterns[sortedPatterns.length - 1] || null;

    // パターン安定性
    const patternStability = this.calculatePatternStability(patterns);

    return {
      patterns,
      bestPattern,
      worstPattern,
      patternStability,
    };
  }

  /**
   * 市場レジーム検出
   */
  detectMarketRegimes(equityCurve: number[]): MarketRegime[] {
    const regimes: MarketRegime[] = [];
    const windowSize = 20;

    if (equityCurve.length < windowSize * 2) {
      return [{
        regime: 'UNKNOWN',
        startDate: '',
        endDate: '',
        duration: equityCurve.length,
        performance: { return: 0, volatility: 0, maxDrawdown: 0 },
        optimalStrategy: 'UNKNOWN',
      }];
    }

    let currentRegime: MarketRegime['regime'] = 'UNKNOWN';
    let regimeStart = 0;

    for (let i = windowSize; i < equityCurve.length; i++) {
      const window = equityCurve.slice(i - windowSize, i);
      const returns = window.slice(1).map((eq, idx) => (eq - window[idx]) / window[idx]);
      
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
      
      let detectedRegime: MarketRegime['regime'];
      if (volatility > 0.03) {
        detectedRegime = 'VOLATILE';
      } else if (avgReturn > 0.001) {
        detectedRegime = 'TRENDING_UP';
      } else if (avgReturn < -0.001) {
        detectedRegime = 'TRENDING_DOWN';
      } else {
        detectedRegime = 'RANGING';
      }

      if (detectedRegime !== currentRegime) {
        if (currentRegime !== 'UNKNOWN') {
          regimes.push(this.createMarketRegime(currentRegime, regimeStart, i, equityCurve));
        }
        currentRegime = detectedRegime;
        regimeStart = i - windowSize;
      }
    }

    // 最後のレジームを追加
    if (currentRegime !== 'UNKNOWN') {
      regimes.push(this.createMarketRegime(currentRegime, regimeStart, equityCurve.length, equityCurve));
    }

    return regimes;
  }

  /**
   * 戦略比較分析
   */
  compareStrategies(results: Map<string, BacktestResult>): ComparativeAnalysis {
    const strategyComparison: ComparativeAnalysis['strategyComparison'] = [];
    
    for (const [strategy, result] of results) {
      const score = this.calculateStrategyScore(result.metrics);
      strategyComparison.push({
        strategy,
        totalReturn: result.metrics.totalReturn,
        sharpeRatio: result.metrics.sharpeRatio,
        maxDrawdown: result.metrics.maxDrawdown,
        winRate: result.metrics.winRate,
        score,
      });
    }

    strategyComparison.sort((a, b) => b.score - a.score);

    return {
      strategyComparison,
      benchmarkComparison: [], // ベンチマークデータが必要
      bestPerformingPeriods: this.findBestPeriods(results),
    };
  }

  /**
   * リスク評価
   */
  assessRisk(trades: BacktestTrade[], equityCurve: number[]): PerformanceReport['riskAssessment'] {
    const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);
    
    // VaR計算
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95 = Math.abs(sortedReturns[Math.floor(sortedReturns.length * 0.05)] || 0) * 100;
    const var99 = Math.abs(sortedReturns[Math.floor(sortedReturns.length * 0.01)] || 0) * 100;

    // 最大連続損失
    let maxConsecutiveLosses = 0;
    let currentConsecutive = 0;
    for (const trade of trades) {
      if (trade.pnl <= 0) {
        currentConsecutive++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    // 破産リスク（簡易版）
    const winRate = trades.filter(t => t.pnl > 0).length / trades.length;
    const avgWin = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / trades.filter(t => t.pnl > 0).length || 1;
    const avgLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0)) / trades.filter(t => t.pnl <= 0).length || 1;
    const riskOfRuin = Math.pow((1 - winRate) / winRate, Math.log(0.5) / Math.log(avgLoss / avgWin)) * 100;

    // リスクレベル
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (var95 < 2 && maxConsecutiveLosses < 5) {
      riskLevel = 'LOW';
    } else if (var95 > 5 || maxConsecutiveLosses > 10) {
      riskLevel = 'HIGH';
    }

    return {
      riskLevel,
      var95,
      var99,
      maxConsecutiveLosses,
      riskOfRuin: Math.min(100, riskOfRuin),
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateMetrics(trades: BacktestTrade[], equityCurve: number[]): PerformanceMetrics {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);
    
    const totalReturn = ((equityCurve[equityCurve.length - 1] - equityCurve[0]) / equityCurve[0]) * 100;
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) * Math.sqrt(252) * 100;
    const sharpeRatio = volatility > 0 ? (avgReturn * 252) / (volatility / 100) : 0;

    const maxDrawdown = Math.max(...this.calculateDrawdownCurve(equityCurve));

    const metrics: PerformanceMetrics = {
      totalReturn,
      annualizedReturn: totalReturn,
      volatility: volatility / 100, // Convert to decimal
      sharpeRatio,
      sortinoRatio: 0,
      maxDrawdown: maxDrawdown / 100, // Convert to decimal
      maxDrawdownDuration: 0,
      averageDrawdown: 0,
      winRate: winRate / 100, // Convert to decimal
      profitFactor,
      averageWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
      averageLoss: trades.filter(t => t.pnl <= 0).length > 0 ? totalLoss / trades.filter(t => t.pnl <= 0).length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: trades.filter(t => t.pnl <= 0).length > 0 ? Math.min(...trades.filter(t => t.pnl <= 0).map(t => t.pnl)) : 0,
      averageTrade: trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length : 0,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: trades.length - winningTrades.length,
      calmarRatio: maxDrawdown > 0 ? (totalReturn / 100) / (maxDrawdown / 100) : 0,
      omegaRatio: 0,
      valueAtRisk: 0,
      informationRatio: 0,
      treynorRatio: 0,
      conditionalValueAtRisk: 0,
      downsideDeviation: 0
    };

    // Add extended properties as optional
    metrics.avgHoldingPeriod = trades.length > 0 ? trades.reduce((sum, t) => sum + getHoldingPeriods(t), 0) / trades.length : 0;
    metrics.profitToDrawdownRatio = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;
    metrics.returnToRiskRatio = volatility > 0 ? totalReturn / volatility : 0;
    metrics.skewness = 0;
    metrics.kurtosis = 0;
    metrics.ulcerIndex = 0;

    return metrics;
  }

  private calculateDrawdownCurve(equityCurve: number[]): number[] {
    let peak = equityCurve[0];
    return equityCurve.map(eq => {
      if (eq > peak) peak = eq;
      return ((peak - eq) / peak) * 100;
    });
  }

  private calculateWinRateByHour(trades: BacktestTrade[]): Map<number, number> {
    const hourStats = new Map<number, { wins: number; total: number }>();
    
    for (const trade of trades) {
      const hour = new Date(trade.entryDate).getHours();
      const stats = hourStats.get(hour) || { wins: 0, total: 0 };
      stats.total++;
      if (trade.pnl > 0) stats.wins++;
      hourStats.set(hour, stats);
    }

    const result = new Map<number, number>();
    for (const [hour, stats] of hourStats) {
      result.set(hour, (stats.wins / stats.total) * 100);
    }
    return result;
  }

  private calculateWinRateByDayOfWeek(trades: BacktestTrade[]): Map<number, number> {
    const dayStats = new Map<number, { wins: number; total: number }>();
    
    for (const trade of trades) {
      const day = new Date(trade.entryDate).getDay();
      const stats = dayStats.get(day) || { wins: 0, total: 0 };
      stats.total++;
      if (trade.pnl > 0) stats.wins++;
      dayStats.set(day, stats);
    }

    const result = new Map<number, number>();
    for (const [day, stats] of dayStats) {
      result.set(day, (stats.wins / stats.total) * 100);
    }
    return result;
  }

  private calculateWinRateTrend(trades: BacktestTrade[]): { period: string; winRate: number }[] {
    const trend: { period: string; winRate: number }[] = [];
    const windowSize = Math.max(10, Math.floor(trades.length / 10));

    for (let i = windowSize; i <= trades.length; i += windowSize) {
      const window = trades.slice(i - windowSize, i);
      const wins = window.filter(t => t.pnl > 0).length;
      trend.push({
        period: `Period ${Math.floor(i / windowSize)}`,
        winRate: (wins / window.length) * 100,
      });
    }

    return trend;
  }

  private calculateConsecutive(trades: BacktestTrade[]): { consecutiveWins: number; consecutiveLosses: number } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const trade of trades) {
      if (trade.pnl > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      }
    }

    return { consecutiveWins: maxWins, consecutiveLosses: maxLosses };
  }

  private calculateProfitByMonth(trades: BacktestTrade[]): Map<string, number> {
    const monthly = new Map<string, number>();
    
    for (const trade of trades) {
      const month = trade.entryDate.substring(0, 7); // YYYY-MM
      monthly.set(month, (monthly.get(month) || 0) + trade.pnl);
    }

    return monthly;
  }

  private calculateProfitByStrategy(trades: BacktestTrade[]): Map<string, number> {
    const byStrategy = new Map<string, number>();
    
    for (const trade of trades) {
      byStrategy.set(trade.strategy, (byStrategy.get(trade.strategy) || 0) + trade.pnl);
    }

    return byStrategy;
  }

  private groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    
    for (const item of array) {
      const value = String(item[key]);
      const group = groups.get(value) || [];
      group.push(item);
      groups.set(value, group);
    }

    return groups;
  }

  private createHoldingPattern(name: string, trades: BacktestTrade[]): TradePattern {
    const winning = trades.filter(t => t.pnl > 0);
    return {
      patternName: name,
      frequency: trades.length,
      winRate: (winning.length / trades.length) * 100,
      avgProfit: trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length,
      avgHoldingPeriod: trades.reduce((sum, t) => sum + getHoldingPeriods(t), 0) / trades.length,
      confidence: Math.min(100, trades.length * 5),
    };
  }

  private createExitPattern(reason: string, trades: BacktestTrade[]): TradePattern {
    const winning = trades.filter(t => t.pnl > 0);
    return {
      patternName: `Exit: ${reason}`,
      frequency: trades.length,
      winRate: (winning.length / trades.length) * 100,
      avgProfit: trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length,
      avgHoldingPeriod: trades.reduce((sum, t) => sum + getHoldingPeriods(t), 0) / trades.length,
      confidence: Math.min(100, trades.length * 5),
    };
  }

  private calculatePatternStability(patterns: TradePattern[]): number {
    if (patterns.length < 2) return 0;
    
    const winRates = patterns.map(p => p.winRate);
    const avg = winRates.reduce((a, b) => a + b, 0) / winRates.length;
    const variance = winRates.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / winRates.length;
    const stdDev = Math.sqrt(variance);
    
    // 標準偏差が小さいほど安定性が高い
    return Math.max(0, 100 - stdDev);
  }

  private createMarketRegime(
    regime: MarketRegime['regime'],
    start: number,
    end: number,
    equityCurve: number[]
  ): MarketRegime {
    const window = equityCurve.slice(start, end);
    const returns = window.slice(1).map((eq, i) => (eq - window[i]) / window[i]);
    
    const totalReturn = ((window[window.length - 1] - window[0]) / window[0]) * 100;
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - returns.reduce((a, b) => a + b, 0) / returns.length, 2), 0) / returns.length) * 100;
    const maxDrawdown = Math.max(...this.calculateDrawdownCurve(window));

    return {
      regime,
      startDate: '',
      endDate: '',
      duration: end - start,
      performance: {
        return: totalReturn,
        volatility,
        maxDrawdown,
      },
      optimalStrategy: this.getOptimalStrategyForRegime(regime),
    };
  }

  private getOptimalStrategyForRegime(regime: MarketRegime['regime']): string {
    switch (regime) {
      case 'TRENDING_UP':
        return 'TREND_FOLLOWING';
      case 'TRENDING_DOWN':
        return 'MEAN_REVERSION';
      case 'RANGING':
        return 'MEAN_REVERSION';
      case 'VOLATILE':
        return 'BREAKOUT';
      default:
        return 'COMPOSITE';
    }
  }

  private calculateStrategyScore(metrics: PerformanceMetrics): number {
    const sharpeScore = Math.max(0, metrics.sharpeRatio) * 10;
    const returnScore = Math.max(0, metrics.totalReturn);
    const drawdownScore = Math.max(0, 100 - metrics.maxDrawdown);
    const winRateScore = metrics.winRate;
    const profitFactorScore = Math.min(metrics.profitFactor, 5) * 10;
    
    return (sharpeScore + returnScore + drawdownScore + winRateScore + profitFactorScore) / 5;
  }

  private findBestPeriods(results: Map<string, BacktestResult>): { period: string; strategy: string; return: number }[] {
    const periods: { period: string; strategy: string; return: number }[] = [];
    
    for (const [strategy, result] of results) {
      // 簡易版：実際には期間ごとに分解して分析
      periods.push({
        period: `${result.startDate} - ${result.endDate}`,
        strategy,
        return: result.metrics.totalReturn,
      });
    }

    return periods.sort((a, b) => b.return - a.return).slice(0, 5);
  }

  private generateRecommendations(trades: BacktestTrade[], metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.winRate < 40) {
      recommendations.push('勝率が低いです。エントリー条件を厳しくするか、戦略の見直しを検討してください。');
    }

    if (metrics.profitFactor < 1.5) {
      recommendations.push('プロフィットファクターが低いです。損切りを早めるか、利確を伸ばすことを検討してください。');
    }

    if (metrics.maxDrawdown > 20) {
      recommendations.push('最大ドローダウンが大きいです。ポジションサイズを小さくするか、リスク管理を強化してください。');
    }

    if (metrics.sharpeRatio < 1) {
      recommendations.push('シャープレシオが低いです。リスク調整後リターンを改善するため、ボラティリティを考慮した戦略を検討してください。');
    }

    if (recommendations.length === 0) {
      recommendations.push('全体的に良好なパフォーマンスです。現在の戦略を継続してください。');
    }

    return recommendations;
  }

  private createEmptyWinRateAnalysis(): WinRateAnalysis {
    return {
      overallWinRate: 0,
      winRateByStrategy: new Map(),
      winRateByMarketCondition: new Map(),
      winRateByTimeOfDay: new Map(),
      winRateByDayOfWeek: new Map(),
      winRateTrend: [],
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };
  }

  private createEmptyPLAnalysis(): ProfitLossAnalysis {
    return {
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      averageProfit: 0,
      averageLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      profitByMonth: new Map(),
      profitByStrategy: new Map(),
      equityCurve: [],
      drawdownCurve: [],
      recoveryFactor: 0,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const winningAnalytics = new WinningAnalytics();
export default WinningAnalytics;
