/**
 * Exit Strategy Module
 * 
 * Provides comprehensive exit strategies including:
 * - ATR-based trailing stops
 * - Parabolic SAR exits
 * - Time-based exits
 * - Compound condition exits
 * - High/Low based exits
 */



export type ExitReason = 
  | 'TRAILING_STOP'
  | 'TIME_LIMIT'
  | 'TIME_BASED'
  | 'PARABOLIC_SAR'
  | 'COMPOUND_CONDITION'
  | 'HIGH_LOW_BREAK'
  | 'INVALID_DATA'
  | 'INSUFFICIENT_DATA';

export interface Position {
  symbol: string;
  entryPrice: number;
  quantity: number;
  side: 'LONG' | 'SHORT';
  entryDate: string;
  highestPrice?: number;
  lowestPrice?: number;
}

export interface ExitSignal {
  shouldExit: boolean;
  exitPrice: number;
  reason: string;
  exitType: ExitReason;
  priority: number;
  metadata?: {
    percentChange?: number;
    timeHeldDays?: number;
    timeDecayFactor?: number;
    atrValue?: number;
    trailingStopPrice?: number;
    conditionsMet?: string[];
  };
}

// Configuration types
export interface TrailingStopConfig {
  type: 'TRAILING_ATR';
  atrMultiplier: number;
  atrPeriod: number;
}

export interface TimeBasedExitConfig {
  type: 'TIME_BASED';
  maxHoldingDays: number;
  decayFactor: number;
}

export interface CompoundExitConfig {
  type: 'COMPOUND';
  conditions: CompoundCondition[];
  requireAll: boolean;
}

export interface CompoundCondition {
  indicator: 'RSI' | 'MACD_CROSS' | 'BB_UPPER' | 'BB_LOWER' | 'ATR';
  threshold: number;
  operator: 'ABOVE' | 'BELOW' | 'TOUCH' | 'CROSS_ABOVE' | 'CROSS_BELOW';
}

export interface HighLowExitConfig {
  type: 'HIGH_LOW';
  period: number;
}

export interface ParabolicSARConfig {
  type: 'PARABOLIC_SAR';
}

export type ExitType = 
  | TrailingStopConfig 
  | TimeBasedExitConfig 
  | CompoundExitConfig 
  | HighLowExitConfig 
  | ParabolicSARConfig;

class ExitStrategy {
  private trackedPositions: Map<string, Position> = new Map();

  /**
   * Check ATR-based trailing stop (improved for better exit timing)
   */
  checkTrailingStop(
    position: Position,
    currentPrice: number,
    atr: number,
    config: TrailingStopConfig
  ): ExitSignal {
    // Validate inputs
    if (!this.isValidPosition(position)) {
      return {
        shouldExit: false,
        exitPrice: currentPrice,
        reason: 'Invalid position data',
        exitType: 'INVALID_DATA',
        priority: 0
      };
    }

    if (atr <= 0 || !isFinite(atr)) {
      return {
        shouldExit: false,
        exitPrice: currentPrice,
        reason: 'Insufficient data',
        exitType: 'INSUFFICIENT_DATA',
        priority: 0
      };
    }

    // Dynamic multiplier based on position performance
    let dynamicMultiplier = config.atrMultiplier;
    const trailingDistance = atr * dynamicMultiplier;
    let trailingStopPrice: number;
    let shouldExit = false;

    if (position.side === 'LONG') {
      // For LONG: trailing stop is below highest price
      const highest = position.highestPrice || position.entryPrice;
      const percentGain = ((highest - position.entryPrice) / position.entryPrice) * 100;
      
      // Tighten stop as profit increases
      if (percentGain > 10) {
        dynamicMultiplier = config.atrMultiplier * 0.7; // Tighter stop for big gains
      } else if (percentGain > 5) {
        dynamicMultiplier = config.atrMultiplier * 0.85; // Slightly tighter
      }
      
      trailingStopPrice = highest - (atr * dynamicMultiplier);
      shouldExit = currentPrice <= trailingStopPrice;
      
      // Update highest price if current price is higher
      if (position.highestPrice === undefined || currentPrice > position.highestPrice!) {
        position.highestPrice = currentPrice;
      }
    } else {
      // For SHORT: trailing stop is above lowest price
      const lowest = position.lowestPrice || position.entryPrice;
      const percentGain = ((position.entryPrice - lowest) / position.entryPrice) * 100;
      
      // Tighten stop as profit increases
      if (percentGain > 10) {
        dynamicMultiplier = config.atrMultiplier * 0.7;
      } else if (percentGain > 5) {
        dynamicMultiplier = config.atrMultiplier * 0.85;
      }
      
      trailingStopPrice = lowest + (atr * dynamicMultiplier);
      shouldExit = currentPrice >= trailingStopPrice;
      
      // Update lowest price if current price is lower
      if (position.lowestPrice === undefined || currentPrice < position.lowestPrice!) {
        position.lowestPrice = currentPrice;
      }
    }

    const percentChange = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    return {
      shouldExit,
      exitPrice: currentPrice,
      reason: shouldExit 
        ? `Dynamic Trailing Stop triggered (${position.side}) - Price: ${currentPrice.toFixed(2)}, Stop: ${trailingStopPrice.toFixed(2)}, Multiplier: ${dynamicMultiplier.toFixed(2)}`
        : `Dynamic Trailing Stop active (${position.side}) - Multiplier: ${dynamicMultiplier.toFixed(2)}`,
      exitType: shouldExit ? 'TRAILING_STOP' : 'INSUFFICIENT_DATA',
      priority: shouldExit ? 3 : 0,
      metadata: {
        percentChange,
        atrValue: atr,
        trailingStopPrice
      }
    };
  }

  /**
   * Check time-based exit
   */
  checkTimeBasedExit(
    position: Position,
    config: TimeBasedExitConfig
  ): ExitSignal {
    if (!this.isValidPosition(position)) {
      return {
        shouldExit: false,
        exitPrice: position.entryPrice,
        reason: 'Invalid position data',
        exitType: 'INVALID_DATA',
        priority: 0
      };
    }

    const entryDate = new Date(position.entryDate);
    const now = new Date();
    const daysHeld = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    const timeDecayFactor = Math.min(1, daysHeld / config.maxHoldingDays);

    const shouldExit = daysHeld >= config.maxHoldingDays;

    return {
      shouldExit,
      exitPrice: position.entryPrice, // Will be updated with current price
      reason: shouldExit
        ? `Time limit reached - Held for ${daysHeld} days (max: ${config.maxHoldingDays})`
        : `Time-based exit - ${daysHeld}/${config.maxHoldingDays} days`,
      exitType: shouldExit ? 'TIME_BASED' : 'INSUFFICIENT_DATA',
      priority: shouldExit ? 2 : 0,
      metadata: {
        timeHeldDays: daysHeld,
        timeDecayFactor
      }
    };
  }

  /**
   * Check Parabolic SAR exit
   */
  checkParabolicSARExit(
    position: Position,
    sarData: {
      previousSAR: number;
      currentSAR: number;
      currentPrice: number;
    }
  ): ExitSignal {
    if (!this.isValidPosition(position)) {
      return {
        shouldExit: false,
        exitPrice: sarData.currentPrice,
        reason: 'Invalid position data',
        exitType: 'INVALID_DATA',
        priority: 0
      };
    }

    let shouldExit = false;

    if (position.side === 'LONG') {
      // Exit when SAR flips from below to above price (trend reversal)
      shouldExit = sarData.previousSAR < sarData.currentPrice && 
                   sarData.currentSAR > sarData.currentPrice;
    } else {
      // Exit when SAR flips from above to below price (trend reversal)
      shouldExit = sarData.previousSAR > sarData.currentPrice && 
                   sarData.currentSAR < sarData.currentPrice;
    }

    return {
      shouldExit,
      exitPrice: sarData.currentPrice,
      reason: shouldExit
        ? `Parabolic SAR reversal detected (${position.side})`
        : `Parabolic SAR following trend (${position.side})`,
      exitType: shouldExit ? 'PARABOLIC_SAR' : 'INSUFFICIENT_DATA',
      priority: shouldExit ? 4 : 0
    };
  }

  /**
   * Check compound exit conditions
   */
  checkCompoundExit(
    position: Position,
    indicators: Record<string, number>,
    config: CompoundExitConfig
  ): ExitSignal {
    if (!this.isValidPosition(position)) {
      return {
        shouldExit: false,
        exitPrice: position.entryPrice,
        reason: 'Invalid position data',
        exitType: 'INVALID_DATA',
        priority: 0
      };
    }

    const conditionsMet: string[] = [];
    const conditionResults: boolean[] = [];

    for (const condition of config.conditions) {
      // Support both snake_case and camelCase indicator keys
      const indicatorKey = condition.indicator.toLowerCase();
      const camelCaseKey = indicatorKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      let indicatorValue = indicators[indicatorKey];
      if (indicatorValue === undefined) {
        indicatorValue = indicators[camelCaseKey];
      }
      // Support alternative keys for common indicators
      if (indicatorValue === undefined && condition.indicator === 'MACD_CROSS') {
        indicatorValue = indicators.macdSignal;
      }
      if (indicatorValue === undefined) continue;

      let conditionMet = false;

      switch (condition.operator) {
        case 'ABOVE':
          conditionMet = indicatorValue > condition.threshold;
          break;
        case 'BELOW':
          conditionMet = indicatorValue < condition.threshold;
          break;
        case 'TOUCH':
          // For Bollinger bands, check if price is near the band
          if (condition.threshold === 0) {
            // Touch upper/lower band - compare with currentPrice
            const currentPrice = indicators.currentPrice || position.entryPrice;
            conditionMet = Math.abs(indicatorValue - currentPrice) / currentPrice < 0.01;
          } else {
            // Within 1% of threshold
            conditionMet = Math.abs(indicatorValue - condition.threshold) / condition.threshold < 0.01;
          }
          break;
        case 'CROSS_ABOVE':
          // Would need historical data, simplified here
          conditionMet = indicatorValue > condition.threshold;
          break;
        case 'CROSS_BELOW':
          conditionMet = indicatorValue < condition.threshold;
          break;
      }

      conditionResults.push(conditionMet);
      if (conditionMet) {
        const readableName = condition.indicator === 'BB_UPPER' ? 'Bollinger Band Upper' :
                            condition.indicator === 'BB_LOWER' ? 'Bollinger Band Lower' :
                            condition.indicator === 'MACD_CROSS' ? 'MACD' :
                            condition.indicator;
        conditionsMet.push(`${readableName} ${condition.operator} ${condition.threshold}`);
      }
    }

    let shouldExit: boolean;
    if (config.requireAll) {
      // AND logic: all conditions must be met
      shouldExit = conditionResults.length > 0 && conditionResults.every(r => r);
    } else {
      // OR logic: any condition can trigger exit
      shouldExit = conditionResults.some(r => r);
    }

    return {
      shouldExit,
      exitPrice: indicators.currentPrice || position.entryPrice,
      reason: shouldExit
        ? `Compound exit triggered - Conditions met: ${conditionsMet.join(', ')}`
        : `Compound exit - Conditions not met (${conditionResults.filter(r => r).length}/${config.conditions.length})`,
      exitType: shouldExit ? 'COMPOUND_CONDITION' : 'INSUFFICIENT_DATA',
      priority: shouldExit ? 5 : 0,
      metadata: {
        conditionsMet
      }
    };
  }

  /**
   * Check high/low based exit
   */
  checkHighLowExit(
    position: Position,
    currentPrice: number,
    period: number,
    config: HighLowExitConfig
  ): ExitSignal {
    if (!this.isValidPosition(position)) {
      return {
        shouldExit: false,
        exitPrice: currentPrice,
        reason: 'Invalid position data',
        exitType: 'INVALID_DATA',
        priority: 0
      };
    }

    // Simplified implementation - in real scenario would check against period high/low
    let shouldExit = false;
    let reason = '';

    if (position.side === 'LONG') {
      // Exit if price breaks below N-period low
      const periodLow = position.lowestPrice || position.entryPrice * 0.95;
      shouldExit = currentPrice < periodLow;
      reason = shouldExit 
        ? `${period}-period low broken (${currentPrice.toFixed(2)} < ${periodLow.toFixed(2)})`
        : `Above ${period}-period low`;
    } else {
      // Exit if price breaks above N-period high
      const periodHigh = position.highestPrice || position.entryPrice * 1.05;
      shouldExit = currentPrice > periodHigh;
      reason = shouldExit
        ? `${period}-period high broken (${currentPrice.toFixed(2)} > ${periodHigh.toFixed(2)})`
        : `Below ${period}-period high`;
    }

    return {
      shouldExit,
      exitPrice: currentPrice,
      reason,
      exitType: shouldExit ? 'HIGH_LOW_BREAK' : 'INSUFFICIENT_DATA',
      priority: shouldExit ? 3 : 0
    };
  }

  /**
   * Update position high/low tracking
   */
  updatePositionHighLow(position: Position, high: number, low: number): void {
    // Update highest price
    if (position.highestPrice === undefined || high > position.highestPrice) {
      position.highestPrice = high;
    }
    
    // Update lowest price - also update if it equals entryPrice (auto-set, not from market data)
    const needsInit = position.lowestPrice === undefined || position.lowestPrice === position.entryPrice;
    if (needsInit || low < position.lowestPrice!) {
      position.lowestPrice = low;
    }
  }

  /**
   * Evaluate multiple exit strategies and return the most appropriate
   */
  evaluateExitStrategies(
    position: Position,
    strategies: ExitType[],
    marketData: {
      currentPrice: number;
      atr?: number;
      sar?: { previousSAR: number; currentSAR: number };
      indicators?: Record<string, number>;
    }
  ): ExitSignal | null {
    const signals: ExitSignal[] = [];

    for (const strategy of strategies) {
      let signal: ExitSignal;

      switch (strategy.type) {
        case 'TRAILING_ATR':
          if (marketData.atr !== undefined) {
            signal = this.checkTrailingStop(position, marketData.currentPrice, marketData.atr, strategy);
            signals.push(signal);
          }
          break;

        case 'TIME_BASED':
          signal = this.checkTimeBasedExit(position, strategy);
          // Update exit price with current price
          if (signal.shouldExit) {
            signal.exitPrice = marketData.currentPrice;
          }
          signals.push(signal);
          break;

        case 'PARABOLIC_SAR':
          if (marketData.sar !== undefined) {
            signal = this.checkParabolicSARExit(position, {
              ...marketData.sar,
              currentPrice: marketData.currentPrice
            });
            signals.push(signal);
          }
          break;

        case 'COMPOUND':
          if (marketData.indicators !== undefined) {
            signal = this.checkCompoundExit(position, marketData.indicators, strategy);
            signals.push(signal);
          }
          break;

        case 'HIGH_LOW':
          signal = this.checkHighLowExit(position, marketData.currentPrice, strategy.period, strategy);
          signals.push(signal);
          break;
      }
    }

    // Find the highest priority exit signal
    const exitSignals = signals.filter(s => s.shouldExit);
    if (exitSignals.length === 0) {
      return null;
    }

    // Sort by priority (higher number = higher priority)
    exitSignals.sort((a, b) => b.priority - a.priority);
    return exitSignals[0];
  }

  /**
   * Track a position for monitoring
   */
  trackPosition(position: Position): void {
    this.trackedPositions.set(position.symbol, position);
  }

  /**
   * Remove position from tracking
   */
  removePosition(symbol: string): void {
    this.trackedPositions.delete(symbol);
  }

  /**
   * Get all tracked positions
   */
  getTrackedPositions(): Position[] {
    return Array.from(this.trackedPositions.values());
  }

  /**
   * Update all tracked positions with latest market data
   */
  updatePositionsWithMarketData(symbol: string, high: number, low: number): void {
    const position = this.trackedPositions.get(symbol);
    if (position) {
      this.updatePositionHighLow(position, high, low);
      this.trackedPositions.set(symbol, position);
    }
  }

  /**
   * Reset all tracked positions
   */
  reset(): void {
    this.trackedPositions.clear();
  }

  /**
   * Validate position data
   */
  private isValidPosition(position: Position): boolean {
    return !!(
      position &&
      position.symbol &&
      position.entryPrice > 0 &&
      position.quantity > 0 &&
      position.side &&
      position.entryDate
    );
  }
}

// Export singleton instance
export const exitStrategy = new ExitStrategy();

// Export class for testing
export { ExitStrategy };
