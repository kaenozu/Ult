/**
 * PerformanceAnalyzer.ts
 * 
 * Detailed performance analysis for trading systems.
 * Analyzes time-based patterns, symbol-specific performance, and provides recommendations.
 */

import {
  Trade,
  TradePair,
  Portfolio,
  AnalysisResult,
  TimeAnalysis,
  SymbolAnalysis,
} from '@/app/types/performance';

export class PerformanceAnalyzer {
  /**
   * Perform comprehensive analysis on trading data
   */
  analyze(trades: Trade[], portfolio: Portfolio): AnalysisResult {
    const tradePairs = this.pairTrades(trades);
    const timeAnalysis = this.analyzeTime(tradePairs);
    const symbolAnalysis = this.analyzeSymbols(tradePairs);
    const patterns = this.analyzePatterns(tradePairs, timeAnalysis);

    const summary = {
      totalTrades: tradePairs.length,
      winRate: this.calculateWinRate(tradePairs),
      profitFactor: this.calculateProfitFactor(tradePairs),
      expectancy: this.calculateExpectancy(tradePairs),
    };

    const recommendations = this.generateRecommendations(
      summary,
      timeAnalysis,
      symbolAnalysis,
      patterns
    );

    return {
      summary,
      timeAnalysis,
      symbolAnalysis,
      patterns,
      recommendations,
    };
  }

  /**
   * Pair buy and sell trades
   */
  private pairTrades(trades: Trade[]): TradePair[] {
    const pairs: TradePair[] = [];
    const openPositions: Map<string, Trade> = new Map();

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        openPositions.set(trade.symbol, trade);
      } else if (trade.type === 'SELL') {
        const entry = openPositions.get(trade.symbol);
        if (entry) {
          const profit = (trade.price - entry.price) * entry.quantity - entry.commission - trade.commission;
          pairs.push({
            profit,
            entryTime: entry.timestamp,
            exitTime: trade.timestamp,
            initialRisk: entry.stopLoss ? Math.abs(entry.price - entry.stopLoss) * entry.quantity : 0,
            entryPrice: entry.price,
            exitPrice: trade.price,
            symbol: entry.symbol,
          });
          openPositions.delete(trade.symbol);
        }
      }
    }

    return pairs;
  }

  /**
   * Analyze time-based patterns
   */
  private analyzeTime(tradePairs: TradePair[]): TimeAnalysis {
    const hourlyPerformance = new Map<number, number>();
    const dailyPerformance = new Map<string, number>();
    const monthlyPerformance = new Map<string, number>();
    const weekdayPerformance = new Map<string, number>();

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const pair of tradePairs) {
      const entryDate = new Date(pair.entryTime);
      
      // Hourly performance
      const hour = entryDate.getHours();
      hourlyPerformance.set(hour, (hourlyPerformance.get(hour) || 0) + pair.profit);

      // Daily performance
      const dateKey = entryDate.toISOString().split('T')[0];
      dailyPerformance.set(dateKey, (dailyPerformance.get(dateKey) || 0) + pair.profit);

      // Monthly performance
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyPerformance.set(monthKey, (monthlyPerformance.get(monthKey) || 0) + pair.profit);

      // Weekday performance
      const weekday = weekdays[entryDate.getDay()];
      weekdayPerformance.set(weekday, (weekdayPerformance.get(weekday) || 0) + pair.profit);
    }

    return {
      hourlyPerformance,
      dailyPerformance,
      monthlyPerformance,
      weekdayPerformance,
    };
  }

  /**
   * Analyze performance by symbol
   */
  private analyzeSymbols(tradePairs: TradePair[]): SymbolAnalysis[] {
    const symbolMap = new Map<string, TradePair[]>();

    // Group trades by symbol
    for (const pair of tradePairs) {
      if (!symbolMap.has(pair.symbol)) {
        symbolMap.set(pair.symbol, []);
      }
      symbolMap.get(pair.symbol)!.push(pair);
    }

    // Calculate metrics for each symbol
    const analyses: SymbolAnalysis[] = [];
    for (const [symbol, pairs] of symbolMap) {
      const totalTrades = pairs.length;
      const winningTrades = pairs.filter(p => p.profit > 0).length;
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
      
      const grossProfit = pairs.filter(p => p.profit > 0).reduce((sum, p) => sum + p.profit, 0);
      const grossLoss = Math.abs(pairs.filter(p => p.profit < 0).reduce((sum, p) => sum + p.profit, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
      
      const totalProfit = pairs.reduce((sum, p) => sum + p.profit, 0);
      const averageReturn = totalTrades > 0 ? totalProfit / totalTrades : 0;

      analyses.push({
        symbol,
        totalTrades,
        winRate,
        profitFactor,
        totalProfit,
        averageReturn,
      });
    }

    // Sort by total profit descending
    return analyses.sort((a, b) => b.totalProfit - a.totalProfit);
  }

  /**
   * Analyze trading patterns
   */
  private analyzePatterns(tradePairs: TradePair[], timeAnalysis: TimeAnalysis): {
    consecutiveWins: number;
    consecutiveLosses: number;
    bestTradingHour: number;
    worstTradingHour: number;
    bestTradingDay: string;
    worstTradingDay: string;
  } {
    // Find consecutive wins and losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const pair of tradePairs) {
      if (pair.profit > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
      } else if (pair.profit < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
      }
    }

    // Find best and worst trading hours
    let bestTradingHour = 0;
    let bestHourProfit = -Infinity;
    let worstTradingHour = 0;
    let worstHourProfit = Infinity;

    for (const [hour, profit] of timeAnalysis.hourlyPerformance) {
      if (profit > bestHourProfit) {
        bestHourProfit = profit;
        bestTradingHour = hour;
      }
      if (profit < worstHourProfit) {
        worstHourProfit = profit;
        worstTradingHour = hour;
      }
    }

    // Find best and worst trading days
    let bestTradingDay = '';
    let bestDayProfit = -Infinity;
    let worstTradingDay = '';
    let worstDayProfit = Infinity;

    for (const [day, profit] of timeAnalysis.weekdayPerformance) {
      if (profit > bestDayProfit) {
        bestDayProfit = profit;
        bestTradingDay = day;
      }
      if (profit < worstDayProfit) {
        worstDayProfit = profit;
        worstTradingDay = day;
      }
    }

    return {
      consecutiveWins,
      consecutiveLosses,
      bestTradingHour,
      worstTradingHour,
      bestTradingDay,
      worstTradingDay,
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    summary: { totalTrades: number; winRate: number; profitFactor: number; expectancy: number },
    timeAnalysis: TimeAnalysis,
    symbolAnalysis: SymbolAnalysis[],
    patterns: {
      consecutiveWins: number;
      consecutiveLosses: number;
      bestTradingHour: number;
      worstTradingHour: number;
      bestTradingDay: string;
      worstTradingDay: string;
    }
  ): string[] {
    const recommendations: string[] = [];

    // Win rate recommendations
    if (summary.winRate < 0.4) {
      recommendations.push(
        'Win rate is below 40%. Consider reviewing entry criteria and risk management.'
      );
    } else if (summary.winRate > 0.6) {
      recommendations.push(
        'Excellent win rate above 60%. Focus on maintaining consistency.'
      );
    }

    // Profit factor recommendations
    if (summary.profitFactor < 1.5) {
      recommendations.push(
        'Profit factor is below 1.5. Work on improving average win size or reducing average loss.'
      );
    } else if (summary.profitFactor > 2.0) {
      recommendations.push(
        'Strong profit factor above 2.0. Current strategy is performing well.'
      );
    }

    // Expectancy recommendations
    if (summary.expectancy < 0) {
      recommendations.push(
        'Negative expectancy detected. Strategy needs significant improvement or replacement.'
      );
    } else if (summary.expectancy > 0 && summary.expectancy < 10) {
      recommendations.push(
        'Low positive expectancy. Consider increasing position sizes or improving trade selection.'
      );
    }

    // Time-based recommendations
    if (patterns.bestTradingHour !== patterns.worstTradingHour) {
      recommendations.push(
        `Best trading hour: ${patterns.bestTradingHour}:00. Worst: ${patterns.worstTradingHour}:00. ` +
        `Consider focusing on high-performing hours.`
      );
    }

    if (patterns.bestTradingDay !== patterns.worstTradingDay) {
      recommendations.push(
        `Best trading day: ${patterns.bestTradingDay}. Worst: ${patterns.worstTradingDay}. ` +
        `Consider adjusting trading schedule.`
      );
    }

    // Symbol-based recommendations
    if (symbolAnalysis.length > 0) {
      const bestSymbol = symbolAnalysis[0];
      const worstSymbol = symbolAnalysis[symbolAnalysis.length - 1];

      if (bestSymbol.totalProfit > 0) {
        recommendations.push(
          `Best performing symbol: ${bestSymbol.symbol} with ${bestSymbol.totalProfit.toFixed(2)} profit.`
        );
      }

      if (worstSymbol.totalProfit < 0) {
        recommendations.push(
          `Worst performing symbol: ${worstSymbol.symbol} with ${worstSymbol.totalProfit.toFixed(2)} loss. ` +
          `Consider avoiding or revising strategy for this symbol.`
        );
      }
    }

    // Consecutive loss recommendations
    if (patterns.consecutiveLosses >= 5) {
      recommendations.push(
        `Maximum consecutive losses: ${patterns.consecutiveLosses}. ` +
        `Consider implementing stricter risk management and daily loss limits.`
      );
    }

    // Trade count recommendations
    if (summary.totalTrades < 30) {
      recommendations.push(
        'Insufficient trade sample size. Collect more data for reliable analysis (minimum 30 trades recommended).'
      );
    }

    return recommendations;
  }

  /**
   * Calculate win rate
   */
  private calculateWinRate(tradePairs: TradePair[]): number {
    if (tradePairs.length === 0) return 0;
    const winningTrades = tradePairs.filter(t => t.profit > 0).length;
    return winningTrades / tradePairs.length;
  }

  /**
   * Calculate profit factor
   */
  private calculateProfitFactor(tradePairs: TradePair[]): number {
    const grossProfit = tradePairs.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(tradePairs.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
    return grossLoss > 0 ? grossProfit / grossLoss : 0;
  }

  /**
   * Calculate expectancy
   */
  private calculateExpectancy(tradePairs: TradePair[]): number {
    if (tradePairs.length === 0) return 0;
    const totalProfit = tradePairs.reduce((sum, t) => sum + t.profit, 0);
    return totalProfit / tradePairs.length;
  }
}

// Export singleton instance
export const performanceAnalyzer = new PerformanceAnalyzer();
