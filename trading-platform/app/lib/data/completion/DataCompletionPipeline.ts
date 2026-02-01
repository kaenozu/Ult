/**
 * DataCompletionPipeline
 * 
 * Service for completing missing market data through various strategies.
 * Supports forward-fill, backward-fill, interpolation, and multi-source merging.
 */

import type { OHLCV } from '@/app/types/shared';
import type {
  CompletionResult,
  DataGap,
  CompletionStrategy,
  CompletionStrategyType,
  CompletionPipelineConfig,
  DataSource
} from '@/app/types/data-completion';

/**
 * Data Completion Pipeline
 * 
 * Automatically fills gaps in market data using configurable strategies.
 * Strategies are applied in priority order until gaps are filled.
 * 
 * @example
 * ```typescript
 * const pipeline = new DataCompletionPipeline();
 * const result = await pipeline.complete(dataWithGaps, 'AAPL');
 * console.log(`Completed ${result.completedCount} data points`);
 * ```
 */
export class DataCompletionPipeline {
  private strategies: Map<CompletionStrategyType, CompletionStrategy> = new Map();
  private sources: DataSource[] = [];
  private config: CompletionPipelineConfig;

  constructor(config: CompletionPipelineConfig = {}) {
    this.config = {
      maxGapSize: 10,
      minDataQuality: 0.8,
      ...config
    };
    
    this.initializeDefaultStrategies();
    
    if (config.strategies) {
      config.strategies.forEach(strategy => this.addStrategy(strategy));
    }
    
    if (config.sources) {
      this.sources = config.sources;
    }
  }

  /**
   * Initialize default completion strategies
   */
  private initializeDefaultStrategies(): void {
    // Forward fill strategy
    this.addStrategy({
      name: 'forward-fill',
      priority: 1,
      canComplete: (data: OHLCV[], gap: DataGap): boolean => {
        return gap.missingPoints <= (this.config.maxGapSize || 10);
      },
      complete: (data: OHLCV[], gap: DataGap): OHLCV[] => {
        return this.forwardFill(data, gap);
      }
    });

    // Backward fill strategy
    this.addStrategy({
      name: 'backward-fill',
      priority: 2,
      canComplete: (data: OHLCV[], gap: DataGap): boolean => {
        return gap.missingPoints <= (this.config.maxGapSize || 10);
      },
      complete: (data: OHLCV[], gap: DataGap): OHLCV[] => {
        return this.backwardFill(data, gap);
      }
    });

    // Linear interpolation strategy
    this.addStrategy({
      name: 'linear-interpolation',
      priority: 3,
      canComplete: (data: OHLCV[], gap: DataGap): boolean => {
        return gap.missingPoints <= (this.config.maxGapSize || 10) * 2;
      },
      complete: (data: OHLCV[], gap: DataGap): OHLCV[] => {
        return this.linearInterpolation(data, gap);
      }
    });

    // Mean interpolation strategy
    this.addStrategy({
      name: 'mean-interpolation',
      priority: 4,
      canComplete: (data: OHLCV[], gap: DataGap): boolean => {
        return gap.missingPoints <= (this.config.maxGapSize || 10) * 3;
      },
      complete: (data: OHLCV[], gap: DataGap): OHLCV[] => {
        return this.meanInterpolation(data, gap);
      }
    });
  }

  /**
   * Add a completion strategy
   * 
   * @param strategy - Strategy to add
   */
  addStrategy(strategy: CompletionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Add a data source for multi-source completion
   * 
   * @param source - Data source to add
   */
  addSource(source: DataSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Complete missing data in the dataset
   * 
   * @param data - Market data with potential gaps
   * @param _symbol - Symbol for the data (reserved for future use)
   * @returns Completion result with filled data
   */
  async complete(data: OHLCV[], _symbol: string): Promise<CompletionResult> {
    if (data.length === 0) {
      return {
        success: false,
        data: [],
        gaps: [],
        strategy: 'forward-fill',
        completedCount: 0,
        message: 'No data provided'
      };
    }

    // Detect gaps
    const gaps = this.detectGaps(data);
    
    if (gaps.length === 0) {
      return {
        success: true,
        data: [...data],
        gaps: [],
        strategy: 'forward-fill',
        completedCount: 0,
        message: 'No gaps detected'
      };
    }

    // Sort strategies by priority
    const sortedStrategies = Array.from(this.strategies.values())
      .sort((a, b) => a.priority - b.priority);

    let completedData = [...data];
    let totalCompleted = 0;
    const remainingGaps: DataGap[] = [];

    // Try to fill each gap
    for (const gap of gaps) {
      let filled = false;

      // Try each strategy in priority order
      for (const strategy of sortedStrategies) {
        if (strategy.canComplete(completedData, gap)) {
          try {
            completedData = strategy.complete(completedData, gap);
            gap.filled = true;
            gap.strategy = strategy.name;
            totalCompleted += gap.missingPoints;
            filled = true;
            break;
          } catch {
            // Strategy failed, try next one
            continue;
          }
        }
      }

      if (!filled) {
        remainingGaps.push(gap);
      }
    }

    return {
      success: remainingGaps.length === 0,
      data: completedData,
      gaps: remainingGaps,
      strategy: sortedStrategies[0]?.name || 'forward-fill',
      completedCount: totalCompleted,
      message: remainingGaps.length > 0 
        ? `${remainingGaps.length} gaps could not be filled`
        : 'All gaps filled successfully'
    };
  }

  /**
   * Detect gaps in the data
   * 
   * @param data - Market data to analyze
   * @returns Array of detected gaps
   */
  private detectGaps(data: OHLCV[]): DataGap[] {
    if (data.length < 2) return [];

    const gaps: DataGap[] = [];
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < sortedData.length - 1; i++) {
      const current = new Date(sortedData[i].date);
      const next = new Date(sortedData[i + 1].date);
      
      // Calculate expected data points (assuming daily data)
      const daysDiff = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        gaps.push({
          startDate: sortedData[i].date,
          endDate: sortedData[i + 1].date,
          expectedPoints: daysDiff,
          missingPoints: daysDiff - 1,
          filled: false
        });
      }
    }

    return gaps;
  }

  /**
   * Forward fill strategy implementation
   */
  private forwardFill(data: OHLCV[], gap: DataGap): OHLCV[] {
    const result = [...data];
    const startIndex = result.findIndex(d => d.date === gap.startDate);
    
    if (startIndex === -1 || startIndex === result.length - 1) {
      return result;
    }

    const lastValue = result[startIndex];
    const startDate = new Date(gap.startDate);
    const endDate = new Date(gap.endDate);
    
    const filled: OHLCV[] = [];
    for (let i = 1; i < gap.missingPoints + 1; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      if (date >= endDate) break;
      
      filled.push({
        symbol: lastValue.symbol,
        date: date.toISOString().split('T')[0],
        open: lastValue.close,
        high: lastValue.close,
        low: lastValue.close,
        close: lastValue.close,
        volume: 0
      });
    }

    result.splice(startIndex + 1, 0, ...filled);
    return result;
  }

  /**
   * Backward fill strategy implementation
   */
  private backwardFill(data: OHLCV[], gap: DataGap): OHLCV[] {
    const result = [...data];
    const endIndex = result.findIndex(d => d.date === gap.endDate);
    
    if (endIndex === -1) {
      return result;
    }

    const nextValue = result[endIndex];
    const startDate = new Date(gap.startDate);
    
    const filled: OHLCV[] = [];
    for (let i = 1; i < gap.missingPoints + 1; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      filled.push({
        symbol: nextValue.symbol,
        date: date.toISOString().split('T')[0],
        open: nextValue.open,
        high: nextValue.open,
        low: nextValue.open,
        close: nextValue.open,
        volume: 0
      });
    }

    const startIndex = result.findIndex(d => d.date === gap.startDate);
    if (startIndex !== -1) {
      result.splice(startIndex + 1, 0, ...filled);
    }

    return result;
  }

  /**
   * Linear interpolation strategy implementation
   */
  private linearInterpolation(data: OHLCV[], gap: DataGap): OHLCV[] {
    const result = [...data];
    const startIndex = result.findIndex(d => d.date === gap.startDate);
    const endIndex = result.findIndex(d => d.date === gap.endDate);
    
    if (startIndex === -1 || endIndex === -1) {
      return result;
    }

    const startValue = result[startIndex];
    const endValue = result[endIndex];
    const steps = gap.missingPoints + 1;

    const filled: OHLCV[] = [];
    for (let i = 1; i < steps; i++) {
      const ratio = i / steps;
      const date = new Date(gap.startDate);
      date.setDate(date.getDate() + i);

      const interpolate = (start: number, end: number): number => {
        return start + (end - start) * ratio;
      };

      filled.push({
        symbol: startValue.symbol,
        date: date.toISOString().split('T')[0],
        open: interpolate(startValue.open, endValue.open),
        high: interpolate(startValue.high, endValue.high),
        low: interpolate(startValue.low, endValue.low),
        close: interpolate(startValue.close, endValue.close),
        volume: Math.round(interpolate(startValue.volume, endValue.volume))
      });
    }

    result.splice(startIndex + 1, 0, ...filled);
    return result;
  }

  /**
   * Mean interpolation strategy implementation
   */
  private meanInterpolation(data: OHLCV[], gap: DataGap): OHLCV[] {
    const result = [...data];
    const startIndex = result.findIndex(d => d.date === gap.startDate);
    
    if (startIndex === -1) {
      return result;
    }

    // Calculate mean from nearby values
    const windowSize = 5;
    const startWindow = Math.max(0, startIndex - windowSize);
    const endWindow = Math.min(result.length, startIndex + windowSize + 1);
    const window = result.slice(startWindow, endWindow);

    const meanOpen = window.reduce((sum, d) => sum + d.open, 0) / window.length;
    const meanHigh = window.reduce((sum, d) => sum + d.high, 0) / window.length;
    const meanLow = window.reduce((sum, d) => sum + d.low, 0) / window.length;
    const meanClose = window.reduce((sum, d) => sum + d.close, 0) / window.length;
    const meanVolume = window.reduce((sum, d) => sum + d.volume, 0) / window.length;

    const filled: OHLCV[] = [];
    const startDate = new Date(gap.startDate);

    for (let i = 1; i < gap.missingPoints + 1; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      filled.push({
        symbol: result[startIndex].symbol,
        date: date.toISOString().split('T')[0],
        open: meanOpen,
        high: meanHigh,
        low: meanLow,
        close: meanClose,
        volume: Math.round(meanVolume)
      });
    }

    result.splice(startIndex + 1, 0, ...filled);
    return result;
  }

  /**
   * Get completion statistics
   * 
   * @param data - Market data
   * @returns Statistics about data completeness
   */
  getStats(data: OHLCV[]): {
    totalPoints: number;
    gapCount: number;
    missingPoints: number;
    completeness: number;
  } {
    const gaps = this.detectGaps(data);
    const missingPoints = gaps.reduce((sum, gap) => sum + gap.missingPoints, 0);
    const totalExpected = data.length + missingPoints;

    return {
      totalPoints: data.length,
      gapCount: gaps.length,
      missingPoints,
      completeness: totalExpected > 0 ? (data.length / totalExpected) * 100 : 100
    };
  }
}

/**
 * Singleton instance for convenient access
 */
export const dataCompletionPipeline = new DataCompletionPipeline();
