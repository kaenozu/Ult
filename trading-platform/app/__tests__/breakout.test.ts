import { detectBreakouts, predictNextBreakout, BreakoutEvent, VolumeProfileLevel } from '../lib/breakout';
import { OHLCV } from '../app/types';

describe('Breakout Detection', () => {
  const mockData: OHLCV[] = [
    { date: '2026-01-01', open: 100, high: 101, low: 99, close: 100, volume: 1000 },
    { date: '2026-01-02', open: 100, high: 101, low: 99, close: 100, volume: 1100 },
    { date: '2026-01-03', open: 100, high: 101, low: 99, close: 100, volume: 1050 },
    { date: '2026-01-04', open: 100, high: 102, low: 99, close: 101, volume: 4500 },
    { date: '2026-01-05', open: 101, high: 103, low: 100, close: 102, volume: 4600 },
    { date: '2026-01-06', open: 102, high: 103, low: 101, close: 102, volume: 1200 },
    { date: '2026-01-07', open: 102, high: 103, low: 101, close: 102, volume: 1150 },
    { date: '2026-01-08', open: 102, high: 104, low: 99, close: 100, volume: 5200 },
    { date: '2026-01-09', open: 100, high: 101, low: 99, close: 100, volume: 1500 },
    { date: '2026-01-10', open: 100, high: 101, low: 99, close: 100, volume: 1300 },
  ];

  const mockVolumeProfile: VolumeProfileLevel[] = [
    { price: 100, volume: 5000, strength: 0.8 },
    { price: 101.5, volume: 6000, strength: 0.9 },
    { price: 102, volume: 5500, strength: 0.9 },
    { price: 102.5, volume: 7000, strength: 0.95 },
    { price: 103, volume: 8000, strength: 1.0 },
  ];

  describe('detectBreakouts', () => {
    it('should detect no breakouts with insufficient data', () => {
      const result = detectBreakouts([], mockVolumeProfile);
      expect(result.events).toHaveLength(0);
      expect(result.bullishBreakouts).toBe(0);
      expect(result.bearishBreakouts).toBe(0);
    });

    it('should detect no breakouts with no volume profile', () => {
      const result = detectBreakouts(mockData, []);
      expect(result.events).toHaveLength(0);
    });

    it('should detect bullish breakout with high volume', () => {
      const result = detectBreakouts(mockData, mockVolumeProfile, {
        volumeMultiplier: 1.5,
        minProfileStrength: 0.7
      });
      
      expect(result.events.length).toBeGreaterThan(0);
      const bullBreakouts = result.events.filter(e => e.type === 'BULL_BREAKOUT');
      expect(bullBreakouts.length).toBeGreaterThan(0);
      
      const bullishEvent = bullBreakouts[0];
      expect(bullishEvent.volumeRatio).toBeGreaterThanOrEqual(1.5);
      expect(bullishEvent.resistanceLevel).toBeDefined();
      expect(bullishEvent.resistanceLevel).toBeGreaterThan(0);
    });

    it('should detect bearish breakout with high volume', () => {
      const result = detectBreakouts(mockData, mockVolumeProfile, {
        volumeMultiplier: 1.5,
        minProfileStrength: 0.7
      });
      
      const bearBreakouts = result.events.filter(e => e.type === 'BEAR_BREAKOUT');
      expect(bearBreakouts.length).toBeGreaterThan(0);
      
      const bearishEvent = bearBreakouts[0];
      expect(bearishEvent.volumeRatio).toBeGreaterThanOrEqual(1.5);
      expect(bearishEvent.supportLevel).toBeDefined();
      expect(bearishEvent.supportLevel).toBeGreaterThan(0);
    });

    it('should calculate average volume ratio correctly', () => {
      const result = detectBreakouts(mockData, mockVolumeProfile, {
        volumeMultiplier: 1.5,
        minProfileStrength: 0.7
      });
      
      if (result.events.length > 0) {
        expect(result.averageVolumeRatio).toBeGreaterThan(0);
      }
    });

    it('should respect custom options', () => {
      const result = detectBreakouts(mockData, mockVolumeProfile, {
        volumeMultiplier: 3.0,
        minProfileStrength: 0.9,
        confirmationCandles: 2
      });
      
      // より厳しい条件なのでブレイクアウトが減るはず
      expect(result.events.length).toBeLessThanOrEqual(
        detectBreakouts(mockData, mockVolumeProfile, {
          volumeMultiplier: 1.5,
          minProfileStrength: 0.7,
          confirmationCandles: 1
        }).events.length
      );
    });
  });

  describe('predictNextBreakout', () => {
    it('should return null for both directions when no nearby levels', () => {
      const result = predictNextBreakout(100, mockVolumeProfile, {
        thresholdPercent: 0.01
      });
      
      expect(result.bullishBreakout).toBeNull();
      expect(result.bearishBreakout).toBeNull();
    });

    it('should predict bullish breakout near resistance', () => {
      const result = predictNextBreakout(101.5, mockVolumeProfile, {
        thresholdPercent: 0.01
      });
      
      expect(result.bullishBreakout).not.toBeNull();
      if (result.bullishBreakout) {
        expect(result.bullishBreakout.price).toBeGreaterThan(101.5);
        expect(result.bullishBreakout.strength).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should predict bearish breakout near support', () => {
      const result = predictNextBreakout(105.5, mockVolumeProfile, {
        thresholdPercent: 0.05
      });
      
      expect(result.bearishBreakout).not.toBeNull();
      if (result.bearishBreakout) {
        expect(result.bearishBreakout.price).toBeLessThan(105.5);
        expect(result.bearishBreakout.strength).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should respect custom threshold', () => {
      const defaultResult = predictNextBreakout(103, mockVolumeProfile);
      const strictResult = predictNextBreakout(103, mockVolumeProfile, {
        thresholdPercent: 0.005 // 0.5%
      });
      
      // より厳しい閾値なので予測が減るはず
      const hasDefaultBreakout = 
        (defaultResult.bullishBreakout !== null) || 
        (defaultResult.bearishBreakout !== null);
      const hasStrictBreakout = 
        (strictResult.bullishBreakout !== null) || 
        (strictResult.bearishBreakout !== null);
      
      if (hasDefaultBreakout) {
        expect(hasStrictBreakout).toBe(false);
      }
    });

    it('should respect min strength parameter', () => {
      const result = predictNextBreakout(103, mockVolumeProfile, {
        minStrength: 0.95
      });
      
      if (result.bullishBreakout) {
        expect(result.bullishBreakout.strength).toBeGreaterThanOrEqual(0.95);
      }
      if (result.bearishBreakout) {
        expect(result.bearishBreakout.strength).toBeGreaterThanOrEqual(0.95);
      }
    });
  });
});
