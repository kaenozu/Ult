/**
 * Unit tests for ExitStrategy
 * TDD Approach: Tests first, then implementation
 */

import {
  exitStrategy,
  ExitStrategy,
  ExitType,
  TrailingStopConfig,
  TimeBasedExitConfig,
  CompoundExitConfig,
  Position,
  ExitSignal
} from '../ExitStrategy';
import { OHLCV } from '../../types';

describe('ExitStrategy', () => {
  // Helper to generate position
  const createPosition = (
    symbol: string = 'AAPL',
    entryPrice: number = 100,
    quantity: number = 10,
    side: 'LONG' | 'SHORT' = 'LONG',
    entryDate: string = new Date().toISOString()
  ): Position => ({
    symbol,
    entryPrice,
    quantity,
    side,
    entryDate,
    highestPrice: entryPrice,
    lowestPrice: entryPrice
  });

  // Helper to generate OHLCV data
  const generateOHLCVData = (
    days: number,
    trend: 'uptrend' | 'downtrend' | 'sideways' = 'uptrend',
    basePrice: number = 100
  ): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      let change: number;
      let volatility: number;

      switch (trend) {
        case 'uptrend':
          change = price * 0.02;
          volatility = price * 0.01;
          break;
        case 'downtrend':
          change = -price * 0.02;
          volatility = price * 0.01;
          break;
        case 'sideways':
        default:
          change = (Math.random() - 0.5) * price * 0.005;
          volatility = price * 0.008;
          break;
      }

      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      data.push({
        date: new Date(now - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });

      price = close;
    }

    return data;
  };

  beforeEach(() => {
    exitStrategy.reset();
  });

  describe('ATR Trailing Stop', () => {
    it('should trigger exit when price falls below ATR trailing stop (LONG)', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      position.highestPrice = 110; // Price rose to 110 before falling
      
      const config: TrailingStopConfig = {
        type: 'TRAILING_ATR',
        atrMultiplier: 2,
        atrPeriod: 14
      };

      // Trailing stop = 110 - 2*2.5 = 105
      const currentPrice = 104; // Below trailing stop
      const atr = 2.5;

      const result = exitStrategy.checkTrailingStop(position, currentPrice, atr, config);

      expect(result.shouldExit).toBe(true);
      expect(result.exitPrice).toBe(currentPrice);
      expect(result.reason).toContain('Trailing Stop');
    });

    it('should update trailing stop when price makes new high (LONG)', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      position.highestPrice = 110; // New high

      const config: TrailingStopConfig = {
        type: 'TRAILING_ATR',
        atrMultiplier: 2,
        atrPeriod: 14
      };

      const currentPrice = 108; // Above entry but below high
      const atr = 2;

      const result = exitStrategy.checkTrailingStop(position, currentPrice, atr, config);

      // Trailing stop = 110 - 2*2 = 106
      // Current price = 108 > 106, so no exit
      expect(result.shouldExit).toBe(false);
    });

    it('should trigger exit when price rises above ATR trailing stop (SHORT)', () => {
      const position = createPosition('AAPL', 100, 10, 'SHORT');
      position.lowestPrice = 90; // Price fell to 90

      const config: TrailingStopConfig = {
        type: 'TRAILING_ATR',
        atrMultiplier: 2,
        atrPeriod: 14
      };

      const currentPrice = 95; // Above trailing stop (90 + 2*ATR)
      const atr = 2.5;

      const result = exitStrategy.checkTrailingStop(position, currentPrice, atr, config);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('Trailing Stop');
    });

    it('should handle insufficient ATR data gracefully', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      const config: TrailingStopConfig = {
        type: 'TRAILING_ATR',
        atrMultiplier: 2,
        atrPeriod: 14
      };

      const result = exitStrategy.checkTrailingStop(position, 105, 0, config);

      expect(result.shouldExit).toBe(false);
      expect(result.reason).toBe('Insufficient data');
    });
  });

  describe('Time-Based Exit', () => {
    it('should trigger exit after max holding period', () => {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - 6); // 6 days ago

      const position = createPosition('AAPL', 100, 10, 'LONG', entryDate.toISOString());
      const config: TimeBasedExitConfig = {
        type: 'TIME_BASED',
        maxHoldingDays: 5,
        decayFactor: 0.1
      };

      const result = exitStrategy.checkTimeBasedExit(position, config);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('Time limit');
    });

    it('should not trigger exit before max holding period', () => {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - 3); // 3 days ago

      const position = createPosition('AAPL', 100, 10, 'LONG', entryDate.toISOString());
      const config: TimeBasedExitConfig = {
        type: 'TIME_BASED',
        maxHoldingDays: 5,
        decayFactor: 0.1
      };

      const result = exitStrategy.checkTimeBasedExit(position, config);

      expect(result.shouldExit).toBe(false);
    });

    it('should calculate time decay for early exit', () => {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - 4); // 4 days ago (80% of max)

      const position = createPosition('AAPL', 100, 10, 'LONG', entryDate.toISOString());
      const config: TimeBasedExitConfig = {
        type: 'TIME_BASED',
        maxHoldingDays: 5,
        decayFactor: 0.2
      };

      const result = exitStrategy.checkTimeBasedExit(position, config);

      // Time decay factor should be calculated
      expect(result.metadata?.timeDecayFactor).toBeGreaterThan(0);
    });
  });

  describe('Compound Exit Conditions', () => {
    it('should trigger exit on RSI extreme + Bollinger Band outer touch', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      const config: CompoundExitConfig = {
        type: 'COMPOUND',
        conditions: [
          { indicator: 'RSI', threshold: 70, operator: 'ABOVE' },
          { indicator: 'BB_UPPER', threshold: 0, operator: 'TOUCH' }
        ],
        requireAll: true
      };

      const indicators = {
        rsi: 75,
        bbUpper: 110,
        currentPrice: 110
      };

      const result = exitStrategy.checkCompoundExit(position, indicators, config);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('RSI');
      expect(result.reason).toContain('Bollinger');
    });

    it('should not trigger exit if only one condition met (AND logic)', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      const config: CompoundExitConfig = {
        type: 'COMPOUND',
        conditions: [
          { indicator: 'RSI', threshold: 70, operator: 'ABOVE' },
          { indicator: 'BB_UPPER', threshold: 0, operator: 'TOUCH' }
        ],
        requireAll: true
      };

      const indicators = {
        rsi: 75,
        bbUpper: 120,
        currentPrice: 105 // Not touching upper band
      };

      const result = exitStrategy.checkCompoundExit(position, indicators, config);

      expect(result.shouldExit).toBe(false);
    });

    it('should trigger exit on any condition met (OR logic)', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      const config: CompoundExitConfig = {
        type: 'COMPOUND',
        conditions: [
          { indicator: 'RSI', threshold: 70, operator: 'ABOVE' },
          { indicator: 'MACD_CROSS', threshold: 0, operator: 'BELOW' }
        ],
        requireAll: false // OR logic
      };

      const indicators = {
        rsi: 65, // Below threshold
        macdSignal: -1 // Death cross
      };

      const result = exitStrategy.checkCompoundExit(position, indicators, config);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('MACD');
    });
  });

  describe('Parabolic SAR Exit', () => {
    it('should trigger exit on SAR reversal (LONG)', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');

      // SAR flips from below price to above price
      const sarData = {
        previousSAR: 98, // Below price
        currentSAR: 102, // Above price
        currentPrice: 101
      };

      const result = exitStrategy.checkParabolicSARExit(position, sarData);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('Parabolic SAR');
    });

    it('should not trigger exit when SAR follows trend (LONG)', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');

      // SAR stays below price (uptrend continues)
      const sarData = {
        previousSAR: 98,
        currentSAR: 99,
        currentPrice: 105
      };

      const result = exitStrategy.checkParabolicSARExit(position, sarData);

      expect(result.shouldExit).toBe(false);
    });
  });

  describe('High/Low Based Exit', () => {
    it('should trigger exit on N-period low break (LONG)', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      position.highestPrice = 115;

      // Current price breaks 10-period low
      const result = exitStrategy.checkHighLowExit(
        position,
        95, // Current price
        10, // Period
        { type: 'HIGH_LOW', period: 10 }
      );

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('period low');
    });

    it('should update highest/lowest prices tracked', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      position.highestPrice = 110;

      // Price makes new high
      exitStrategy.updatePositionHighLow(position, 115);

      expect(position.highestPrice).toBe(115);
    });
  });

  describe('Multiple Exit Strategy Evaluation', () => {
    it('should evaluate all strategies and return most appropriate exit', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      position.highestPrice = 110;

      const strategies: ExitType[] = [
        { type: 'TRAILING_ATR', atrMultiplier: 2, atrPeriod: 14 },
        { type: 'TIME_BASED', maxHoldingDays: 5, decayFactor: 0.1 },
        { type: 'PARABOLIC_SAR' }
      ];

      const marketData = {
        currentPrice: 105,
        atr: 2.5,
        sar: { previousSAR: 98, currentSAR: 99, currentPrice: 105 }
      };

      const result = exitStrategy.evaluateExitStrategies(
        position,
        strategies,
        marketData
      );

      // Should return the most urgent/appropriate exit signal
      expect(result).toBeDefined();
      expect(result?.shouldExit).toBeDefined();
    });

    it('should prioritize time-based exit when time decay is high', () => {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - 5);

      const position = createPosition('AAPL', 100, 10, 'LONG', entryDate.toISOString());
      position.highestPrice = 110;

      const strategies: ExitType[] = [
        { type: 'TRAILING_ATR', atrMultiplier: 2, atrPeriod: 14 },
        { type: 'TIME_BASED', maxHoldingDays: 5, decayFactor: 0.1 }
      ];

      const marketData = {
        currentPrice: 109, // Above trailing stop
        atr: 2.5
      };

      const result = exitStrategy.evaluateExitStrategies(
        position,
        strategies,
        marketData
      );

      // Time-based exit should trigger first
      expect(result?.shouldExit).toBe(true);
      expect(result?.exitType).toBe('TIME_BASED');
    });
  });

  describe('Position Management', () => {
    it('should track multiple positions', () => {
      const position1 = createPosition('AAPL', 100, 10, 'LONG');
      const position2 = createPosition('MSFT', 200, 5, 'LONG');

      exitStrategy.trackPosition(position1);
      exitStrategy.trackPosition(position2);

      const trackedPositions = exitStrategy.getTrackedPositions();

      expect(trackedPositions).toHaveLength(2);
    });

    it('should remove position from tracking', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');

      exitStrategy.trackPosition(position);
      exitStrategy.removePosition(position.symbol);

      const trackedPositions = exitStrategy.getTrackedPositions();

      expect(trackedPositions).toHaveLength(0);
    });

    it('should update all tracked positions with latest market data', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      position.highestPrice = 105;

      exitStrategy.trackPosition(position);

      // Update with new high
      exitStrategy.updatePositionsWithMarketData('AAPL', 110, 108);

      expect(position.highestPrice).toBe(110);
      expect(position.lowestPrice).toBe(108);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid position data gracefully', () => {
      const invalidPosition = {
        symbol: '',
        entryPrice: -100, // Invalid
        quantity: 0, // Invalid
        side: 'LONG' as const,
        entryDate: new Date().toISOString()
      };

      const result = exitStrategy.checkTrailingStop(
        invalidPosition as Position,
        100,
        2,
        { type: 'TRAILING_ATR', atrMultiplier: 2, atrPeriod: 14 }
      );

      expect(result.shouldExit).toBe(false);
      expect(result.reason).toContain('Invalid');
    });

    it('should handle extreme price movements', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');
      position.highestPrice = 100;

      // Extreme drop (50%)
      const result = exitStrategy.checkTrailingStop(
        position,
        50,
        2,
        { type: 'TRAILING_ATR', atrMultiplier: 2, atrPeriod: 14 }
      );

      expect(result.shouldExit).toBe(true);
      expect(result.metadata?.percentChange).toBe(-50);
    });

    it('should handle zero or negative ATR', () => {
      const position = createPosition('AAPL', 100, 10, 'LONG');

      const result = exitStrategy.checkTrailingStop(
        position,
        105,
        -1, // Invalid ATR
        { type: 'TRAILING_ATR', atrMultiplier: 2, atrPeriod: 14 }
      );

      expect(result.shouldExit).toBe(false);
    });
  });
});
