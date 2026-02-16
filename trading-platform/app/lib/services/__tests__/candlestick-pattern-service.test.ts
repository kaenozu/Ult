/**
 * @jest-environment node
 */
import { candlestickPatternService, CandlestickPatternService } from '../candlestick-pattern-service';
import { OHLCV } from '@/app/types';

describe('CandlestickPatternService', () => {
  let service: CandlestickPatternService;

  beforeEach(() => {
    service = candlestickPatternService;
  });

  describe('Pattern Detection', () => {
    it('should detect Doji pattern', () => {
      const data: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 105,
        low: 95,
        close: 100.1, // Almost same as open
        volume: 1000000
      }];

      const features = service.calculatePatternFeatures(data);
      expect(features.isDoji).toBeGreaterThan(0.5);
      expect(features.bodyRatio).toBeLessThan(0.1);
    });

    it('should detect Hammer pattern', () => {
      const data: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 101,
        low: 90,
        close: 100.5, // Small body near high
        volume: 1000000
      }];

      const features = service.calculatePatternFeatures(data);
      expect(features.isHammer).toBeGreaterThan(0);
      expect(features.lowerShadowRatio).toBeGreaterThan(0.5);
    });

    it('should detect Bullish Engulfing pattern', () => {
      const data: OHLCV[] = [
        {
          date: '2024-01-01',
          open: 102,
          high: 103,
          low: 99,
          close: 100, // Bearish
          volume: 1000000
        },
        {
          date: '2024-01-02',
          open: 99,
          high: 104,
          low: 98,
          close: 103, // Bullish and engulfs previous
          volume: 1500000
        }
      ];

      const features = service.calculatePatternFeatures(data);
      expect(features.isBullishEngulfing).toBeGreaterThan(0);
    });

    it('should detect Bearish Engulfing pattern', () => {
      const data: OHLCV[] = [
        {
          date: '2024-01-01',
          open: 98,
          high: 101,
          low: 97,
          close: 100, // Bullish
          volume: 1000000
        },
        {
          date: '2024-01-02',
          open: 101,
          high: 102,
          low: 96,
          close: 97, // Bearish and engulfs previous
          volume: 1500000
        }
      ];

      const features = service.calculatePatternFeatures(data);
      expect(features.isBearishEngulfing).toBeGreaterThan(0);
    });

    it('should detect Morning Star pattern', () => {
      const data: OHLCV[] = [
        {
          date: '2024-01-01',
          open: 105,
          high: 106,
          low: 100,
          close: 101, // Bearish
          volume: 1000000
        },
        {
          date: '2024-01-02',
          open: 100,
          high: 101,
          low: 98,
          close: 99.5, // Small body (doji-like)
          volume: 800000
        },
        {
          date: '2024-01-03',
          open: 99,
          high: 104,
          low: 98,
          close: 103, // Bullish
          volume: 1200000
        }
      ];

      const features = service.calculatePatternFeatures(data);
      expect(features.isMorningStar).toBeGreaterThan(0);
    });

    it('should detect Evening Star pattern', () => {
      const data: OHLCV[] = [
        {
          date: '2024-01-01',
          open: 95,
          high: 99,
          low: 94,
          close: 98, // Bullish
          volume: 1000000
        },
        {
          date: '2024-01-02',
          open: 99,
          high: 100,
          low: 97,
          close: 98.5, // Small body
          volume: 800000
        },
        {
          date: '2024-01-03',
          open: 99,
          high: 100,
          low: 94,
          close: 95, // Bearish
          volume: 1200000
        }
      ];

      const features = service.calculatePatternFeatures(data);
      expect(features.isEveningStar).toBeGreaterThan(0);
    });
  });

  describe('Pattern Signal Generation', () => {
    it('should generate bullish signal from bullish patterns', () => {
      const features = {
        isDoji: 0,
        isHammer: 0.8,
        isInvertedHammer: 0,
        isShootingStar: 0,
        isBullishEngulfing: 0.9,
        isBearishEngulfing: 0,
        isMorningStar: 0.7,
        isEveningStar: 0,
        isPiercingLine: 0,
        isDarkCloudCover: 0,
        isBullishHarami: 0,
        isBearishHarami: 0,
        bodyRatio: 0.5,
        upperShadowRatio: 0.2,
        lowerShadowRatio: 0.3,
        candleStrength: 0.8
      };

      const signal = service.getPatternSignal(features);
      expect(signal).toBeGreaterThan(0);
    });

    it('should generate bearish signal from bearish patterns', () => {
      const features = {
        isDoji: 0,
        isHammer: 0,
        isInvertedHammer: 0,
        isShootingStar: 0.8,
        isBullishEngulfing: 0,
        isBearishEngulfing: 0.9,
        isMorningStar: 0,
        isEveningStar: 0.7,
        isPiercingLine: 0,
        isDarkCloudCover: 0,
        isBullishHarami: 0,
        isBearishHarami: 0,
        bodyRatio: 0.5,
        upperShadowRatio: 0.3,
        lowerShadowRatio: 0.2,
        candleStrength: 0.8
      };

      const signal = service.getPatternSignal(features);
      expect(signal).toBeLessThan(0);
    });

    it('should generate neutral signal with no strong patterns', () => {
      const features = {
        isDoji: 0.1,
        isHammer: 0,
        isInvertedHammer: 0,
        isShootingStar: 0,
        isBullishEngulfing: 0,
        isBearishEngulfing: 0,
        isMorningStar: 0,
        isEveningStar: 0,
        isPiercingLine: 0,
        isDarkCloudCover: 0,
        isBullishHarami: 0,
        isBearishHarami: 0,
        bodyRatio: 0.5,
        upperShadowRatio: 0.25,
        lowerShadowRatio: 0.25,
        candleStrength: 0.1
      };

      const signal = service.getPatternSignal(features);
      expect(Math.abs(signal)).toBeLessThan(0.3);
    });

    it('should cap signal at -1 to 1 range', () => {
      const features = {
        isDoji: 0,
        isHammer: 1,
        isInvertedHammer: 1,
        isShootingStar: 0,
        isBullishEngulfing: 1,
        isBearishEngulfing: 0,
        isMorningStar: 1,
        isEveningStar: 0,
        isPiercingLine: 1,
        isDarkCloudCover: 0,
        isBullishHarami: 1,
        isBearishHarami: 0,
        bodyRatio: 0.8,
        upperShadowRatio: 0.1,
        lowerShadowRatio: 0.1,
        candleStrength: 1
      };

      const signal = service.getPatternSignal(features);
      expect(signal).toBeLessThanOrEqual(1);
      expect(signal).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const features = service.calculatePatternFeatures([]);
      expect(features).toBeDefined();
      expect(features.isDoji).toBe(0);
      expect(features.bodyRatio).toBe(0.5);
    });

    it('should handle single candle data', () => {
      const data: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000
      }];

      const features = service.calculatePatternFeatures(data);
      expect(features).toBeDefined();
      expect(features.bodyRatio).toBeGreaterThan(0);
    });

    it('should calculate ratios correctly', () => {
      const data: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000000
      }];

      const features = service.calculatePatternFeatures(data);
      expect(features.bodyRatio).toBe(0.25); // (105-100)/(110-90) = 5/20 = 0.25
      expect(features.upperShadowRatio + features.lowerShadowRatio + features.bodyRatio).toBeCloseTo(1, 1);
    });
  });
});
