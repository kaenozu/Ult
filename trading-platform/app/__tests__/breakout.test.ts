import { detectBreakouts, predictNextBreakout, VolumeProfileLevel } from '../lib/breakout';
import { OHLCV } from '../types';

describe('Breakout Detection', () => {
  const mockData: OHLCV[] = [
    // Initial data to satisfy length requirement (> 20)
    ...Array.from({ length: 20 }, (_, i) => ({
      date: `2025-12-${10 + i}`,
      open: 100, high: 101, low: 99, close: 100, volume: 1000
    })),
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
    // Trending data with MASSIVE volume to ensure detection
    { date: '2026-01-11', open: 100, high: 105, low: 100, close: 104, volume: 20000 }, // Breakout candidate
    { date: '2026-01-12', open: 104, high: 106, low: 103, close: 105, volume: 25000 },
    { date: '2026-01-13', open: 105, high: 107, low: 104, close: 106, volume: 30000 },
    { date: '2026-01-14', open: 106, high: 108, low: 105, close: 107, volume: 25000 },
    { date: '2026-01-15', open: 107, high: 105, low: 100, close: 102, volume: 40000 }, // Bearish reversal
    { date: '2026-01-16', open: 102, high: 103, low: 98, close: 99, volume: 35000 },
    { date: '2026-01-17', open: 99, high: 100, low: 95, close: 96, volume: 30000 },
    { date: '2026-01-18', open: 96, high: 97, low: 94, close: 95, volume: 25000 },
    { date: '2026-01-19', open: 95, high: 96, low: 93, close: 94, volume: 20000 },
    { date: '2026-01-20', open: 94, high: 95, low: 92, close: 93, volume: 15000 },
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
      // Level is 103. Price 104. Dist 1.0.
      // 1% threshold of 104 = 1.04. (1.0 < 1.04) -> Detected.
      // 0.5% threshold of 104 = 0.52. (1.0 > 0.52) -> Not Detected.
      const currentPrice = 104;
      const defaultResult = predictNextBreakout(currentPrice, mockVolumeProfile);

      const strictResult = predictNextBreakout(currentPrice, mockVolumeProfile, {
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
