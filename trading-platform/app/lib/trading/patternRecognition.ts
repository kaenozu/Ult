/**
 * Pattern Recognition Engine for AI Trade Advisor
 * 
 * Analyzes trading journal entries to identify winning patterns
 * and provides statistical reports for trading decisions.
 */

import { JournalEntry } from '@/app/types';

/**
 * Pattern condition for matching market data
 */
export interface PatternCondition {
  type: 'indicator' | 'market' | 'time';
  indicator?: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
}

/**
 * Pattern factor types
 */
export type PatternFactor = string | number | boolean | Date;

/**
 * Trade pattern with statistical metrics
 */
export interface TradePattern {
  id: string;
  name: string;
  description: string;
  conditions: PatternCondition[];
  winRate: number;
  avgProfit: number;
  avgProfitPercent: number;
  sampleSize: number;
  totalProfit: number;
  confidence: number;
  factors: Record<string, PatternFactor>;
}

/**
 * Market data for pattern matching
 */
export interface MarketData {
  symbol: string;
  price: number;
  indicators: Record<string, number>;
  timestamp: Date;
}

/**
 * Pattern report with aggregated statistics
 */
export interface PatternReport {
  totalPatterns: number;
  topPatterns: TradePattern[];
  avgWinRate: number;
  totalAnalyzedTrades: number;
  generatedAt: Date;
}

/**
 * Pattern recognition engine class
 */
export class PatternRecognitionEngine {
  private patterns: Map<string, TradePattern> = new Map();
  private journal: JournalEntry[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 60 seconds

  /**
   * Initialize the pattern recognition engine
   */
  constructor() {
    // Initialize with empty state
  }

  /**
   * Add journal entries for analysis
   */
  addJournalEntries(entries: JournalEntry[]): void {
    this.journal = [...this.journal, ...entries];
    this.invalidateCache();
  }

  /**
   * Clear all journal entries and patterns
   */
  clear(): void {
    this.journal = [];
    this.patterns.clear();
    this.invalidateCache();
  }

  /**
   * Learn patterns from trading journal
   */
  learnFromJournal(): void {
    const closedTrades = this.journal.filter(entry => entry.status === 'CLOSED');
    
    if (closedTrades.length < 3) {
      return; // Need minimum sample size
    }

    // Analyze patterns by different factors
    this.analyzeTimePatterns(closedTrades);
    this.analyzeSymbolPatterns(closedTrades);
    this.analyzeSignalTypePatterns(closedTrades);
  }

  /**
   * Match current market data against known patterns
   */
  matchPattern(marketData: MarketData): TradePattern | null {
    for (const pattern of this.patterns.values()) {
      if (this.checkConditions(pattern.conditions, marketData)) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Generate statistical report
   */
  generateReport(): PatternReport {
    const patternsArray = Array.from(this.patterns.values());
    
    return {
      totalPatterns: this.patterns.size,
      topPatterns: patternsArray
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10),
      avgWinRate: this.calculateAvgWinRate(patternsArray),
      totalAnalyzedTrades: this.journal.filter(e => e.status === 'CLOSED').length,
      generatedAt: new Date(),
    };
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): TradePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by ID
   */
  getPatternById(id: string): TradePattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Analyze patterns by time of day
   */
  private analyzeTimePatterns(trades: JournalEntry[]): void {
    const hourlyStats = new Map<number, {
      trades: JournalEntry[];
      wins: number;
      totalProfit: number;
      totalProfitPercent: number;
    }>();

    for (const trade of trades) {
      const date = new Date(trade.date);
      const hour = date.getHours();

      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, {
          trades: [],
          wins: 0,
          totalProfit: 0,
          totalProfitPercent: 0,
        });
      }

      const stats = hourlyStats.get(hour)!;
      stats.trades.push(trade);
      stats.totalProfit += trade.profit || 0;
      stats.totalProfitPercent += trade.profitPercent || 0;

      if ((trade.profit || 0) > 0) {
        stats.wins++;
      }
    }

    // Create patterns for high-performing hours
    for (const [hour, stats] of hourlyStats) {
      if (stats.trades.length >= 3) {
        const winRate = (stats.wins / stats.trades.length) * 100;
        
        if (winRate >= 50) {
          const period = this.getTimePeriod(hour);
          const patternId = `time_${hour}`;
          
          this.patterns.set(patternId, {
            id: patternId,
            name: `${period} Trading Pattern`,
            description: `Trading during ${period} (${hour}:00-${hour + 1}:00)`,
            conditions: [
              {
                type: 'time',
                operator: '==',
                value: hour,
              },
            ],
            winRate,
            avgProfit: stats.totalProfit / stats.trades.length,
            avgProfitPercent: stats.totalProfitPercent / stats.trades.length,
            sampleSize: stats.trades.length,
            totalProfit: stats.totalProfit,
            confidence: Math.min(stats.trades.length / 10, 1.0),
            factors: {
              timePeriod: period,
              hour: hour,
            },
          });
        }
      }
    }
  }

  /**
   * Analyze patterns by symbol
   */
  private analyzeSymbolPatterns(trades: JournalEntry[]): void {
    const symbolStats = new Map<string, {
      trades: JournalEntry[];
      wins: number;
      totalProfit: number;
      totalProfitPercent: number;
    }>();

    for (const trade of trades) {
      if (!symbolStats.has(trade.symbol)) {
        symbolStats.set(trade.symbol, {
          trades: [],
          wins: 0,
          totalProfit: 0,
          totalProfitPercent: 0,
        });
      }

      const stats = symbolStats.get(trade.symbol)!;
      stats.trades.push(trade);
      stats.totalProfit += trade.profit || 0;
      stats.totalProfitPercent += trade.profitPercent || 0;

      if ((trade.profit || 0) > 0) {
        stats.wins++;
      }
    }

    // Create patterns for high-performing symbols
    for (const [symbol, stats] of symbolStats) {
      if (stats.trades.length >= 3) {
        const winRate = (stats.wins / stats.trades.length) * 100;
        
        if (winRate >= 50) {
          const patternId = `symbol_${symbol}`;
          
          this.patterns.set(patternId, {
            id: patternId,
            name: `${symbol} Trading Pattern`,
            description: `Trading ${symbol} with historical win rate`,
            conditions: [
              {
                type: 'market',
                operator: '==',
                value: 1, // Placeholder for symbol match
              },
            ],
            winRate,
            avgProfit: stats.totalProfit / stats.trades.length,
            avgProfitPercent: stats.totalProfitPercent / stats.trades.length,
            sampleSize: stats.trades.length,
            totalProfit: stats.totalProfit,
            confidence: Math.min(stats.trades.length / 10, 1.0),
            factors: {
              symbol: symbol,
            },
          });
        }
      }
    }
  }

  /**
   * Analyze patterns by signal type
   */
  private analyzeSignalTypePatterns(trades: JournalEntry[]): void {
    const signalStats = new Map<string, {
      trades: JournalEntry[];
      wins: number;
      totalProfit: number;
      totalProfitPercent: number;
    }>();

    for (const trade of trades) {
      const signalType = trade.signalType;
      
      if (!signalStats.has(signalType)) {
        signalStats.set(signalType, {
          trades: [],
          wins: 0,
          totalProfit: 0,
          totalProfitPercent: 0,
        });
      }

      const stats = signalStats.get(signalType)!;
      stats.trades.push(trade);
      stats.totalProfit += trade.profit || 0;
      stats.totalProfitPercent += trade.profitPercent || 0;

      if ((trade.profit || 0) > 0) {
        stats.wins++;
      }
    }

    // Create patterns for high-performing signal types
    for (const [signalType, stats] of signalStats) {
      if (stats.trades.length >= 3) {
        const winRate = (stats.wins / stats.trades.length) * 100;
        
        if (winRate >= 50) {
          const patternId = `signal_${signalType}`;
          
          this.patterns.set(patternId, {
            id: patternId,
            name: `${signalType} Signal Pattern`,
            description: `${signalType} signals with historical win rate`,
            conditions: [
              {
                type: 'indicator',
                indicator: 'signalType',
                operator: '==',
                value: signalType === 'BUY' ? 1 : signalType === 'SELL' ? -1 : 0,
              },
            ],
            winRate,
            avgProfit: stats.totalProfit / stats.trades.length,
            avgProfitPercent: stats.totalProfitPercent / stats.trades.length,
            sampleSize: stats.trades.length,
            totalProfit: stats.totalProfit,
            confidence: Math.min(stats.trades.length / 10, 1.0),
            factors: {
              signalType: signalType,
            },
          });
        }
      }
    }
  }

  /**
   * Check if market data matches pattern conditions
   */
  private checkConditions(conditions: PatternCondition[], data: MarketData): boolean {
    return conditions.every(cond => {
      const value = this.getConditionValue(cond, data);
      switch (cond.operator) {
        case '>': return value > cond.value;
        case '<': return value < cond.value;
        case '>=': return value >= cond.value;
        case '<=': return value <= cond.value;
        case '==': return value === cond.value;
        default: return false;
      }
    });
  }

  /**
   * Get condition value from market data
   */
  private getConditionValue(condition: PatternCondition, data: MarketData): number {
    if (condition.type === 'indicator' && condition.indicator) {
      return data.indicators[condition.indicator] || 0;
    } else if (condition.type === 'time') {
      return data.timestamp.getHours();
    } else if (condition.type === 'market') {
      return data.price;
    }
    return 0;
  }

  /**
   * Calculate average win rate across all patterns
   */
  private calculateAvgWinRate(patterns: TradePattern[]): number {
    if (patterns.length === 0) return 0;
    const winRates = patterns.map(p => p.winRate);
    return winRates.reduce((sum, r) => sum + r, 0) / winRates.length;
  }

  /**
   * Get time period description from hour
   */
  private getTimePeriod(hour: number): string {
    if (6 <= hour && hour < 12) return 'Morning';
    if (12 <= hour && hour < 17) return 'Afternoon';
    if (17 <= hour && hour < 21) return 'Evening';
    return 'Night';
  }

  /**
   * Invalidate pattern cache
   */
  private invalidateCache(): void {
    this.cacheTimestamp = Date.now();
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }
}

// Singleton instance
let patternEngineInstance: PatternRecognitionEngine | null = null;

/**
 * Get or create pattern recognition engine instance
 */
export function getPatternRecognitionEngine(): PatternRecognitionEngine {
  if (!patternEngineInstance) {
    patternEngineInstance = new PatternRecognitionEngine();
  }
  return patternEngineInstance;
}
