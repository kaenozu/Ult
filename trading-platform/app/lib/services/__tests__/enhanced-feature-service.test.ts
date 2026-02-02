/**
 * Tests for EnhancedFeatureService
 */

import { EnhancedFeatureService } from '../enhanced-feature-service';
import { OHLCV } from '@/app/types';

describe('EnhancedFeatureService', () => {
  let service: EnhancedFeatureService;
  let mockData: OHLCV[];

  beforeEach(() => {
    service = new EnhancedFeatureService();
    
    // Create realistic market data for testing
    mockData = Array.from({ length: 100 }, (_, i) => {
      const basePrice = 1000;
      const trend = i * 2; // Uptrend
      const noise = Math.sin(i * 0.5) * 10; // Add some noise
      const close = basePrice + trend + noise;
      const open = close - (Math.random() - 0.5) * 5;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      
      return {
        date: new Date(2024, 0, i + 1).toISOString(),
        open,
        high,
        low,
        close,
        volume: 1000000 + Math.random() * 500000
      };
    });
  });

  describe('calculateCandlestickPatterns', () => {
    it('should calculate all candlestick pattern features', () => {
      const features = service.calculateCandlestickPatterns(mockData);
      
      expect(features).toHaveProperty('isDoji');
      expect(features).toHaveProperty('isHammer');
      expect(features).toHaveProperty('isShootingStar');
      expect(features).toHaveProperty('isEngulfing');
      expect(features).toHaveProperty('isPiercing');
      expect(features).toHaveProperty('isDarkCloud');
      expect(features).toHaveProperty('isMorningStar');
      expect(features).toHaveProperty('isEveningStar');
      expect(features).toHaveProperty('bodyRatio');
      expect(features).toHaveProperty('upperShadowRatio');
      expect(features).toHaveProperty('lowerShadowRatio');
      expect(features).toHaveProperty('candleStrength');
    });

    it('should return valid numeric values', () => {
      const features = service.calculateCandlestickPatterns(mockData);
      
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
        expect(isFinite(value)).toBe(true);
      });
    });

    it('should detect doji pattern', () => {
      const dojiData: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 101,
        low: 99,
        close: 100.05, // Very small body
        volume: 1000000
      }];
      
      const features = service.calculateCandlestickPatterns(dojiData);
      expect(features.isDoji).toBe(1);
    });

    it('should detect hammer pattern', () => {
      const hammerData: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 100.2, // Very small upper shadow
        low: 90, // Long lower shadow (10 points)
        close: 99, // Small body (1 point)
        volume: 1000000
      }];
      
      const features = service.calculateCandlestickPatterns(hammerData);
      expect(features.isHammer).toBe(1);
    });

    it('should detect shooting star pattern', () => {
      const starData: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 110, // Long upper shadow (10 points)
        low: 99.5,
        close: 101, // Small body (1 point)
        volume: 1000000
      }];
      
      const features = service.calculateCandlestickPatterns(starData);
      expect(features.isShootingStar).toBe(1);
    });

    it('should detect bullish engulfing pattern', () => {
      const engulfingData: OHLCV[] = [
        {
          date: '2024-01-01',
          open: 102,
          high: 103,
          low: 99,
          close: 100, // Bearish candle
          volume: 1000000
        },
        {
          date: '2024-01-02',
          open: 99,
          high: 104,
          low: 98,
          close: 103, // Bullish candle engulfing previous
          volume: 1000000
        }
      ];
      
      const features = service.calculateCandlestickPatterns(engulfingData);
      expect(features.isEngulfing).toBe(1);
    });

    it('should calculate body ratio correctly', () => {
      const data: OHLCV[] = [{
        date: '2024-01-01',
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        volume: 1000000
      }];
      
      const features = service.calculateCandlestickPatterns(data);
      const expectedBodyRatio = Math.abs(105 - 100) / (110 - 95);
      expect(features.bodyRatio).toBeCloseTo(expectedBodyRatio, 5);
    });

    it('should handle empty data', () => {
      const features = service.calculateCandlestickPatterns([]);
      
      expect(features.isDoji).toBe(0);
      expect(features.isHammer).toBe(0);
      expect(features.bodyRatio).toBe(0);
    });
  });

  describe('calculatePriceTrajectory', () => {
    it('should calculate all price trajectory features', () => {
      const features = service.calculatePriceTrajectory(mockData);
      
      expect(features).toHaveProperty('zigzagTrend');
      expect(features).toHaveProperty('zigzagStrength');
      expect(features).toHaveProperty('zigzagReversalProb');
      expect(features).toHaveProperty('trendConsistency');
      expect(features).toHaveProperty('trendAcceleration');
      expect(features).toHaveProperty('supportResistanceLevel');
      expect(features).toHaveProperty('distanceToSupport');
      expect(features).toHaveProperty('distanceToResistance');
      expect(features).toHaveProperty('isConsolidation');
      expect(features).toHaveProperty('breakoutPotential');
    });

    it('should return valid numeric values', () => {
      const features = service.calculatePriceTrajectory(mockData);
      
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
        expect(isFinite(value)).toBe(true);
      });
    });

    it('should detect uptrend', () => {
      const uptrendData = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 + i * 5,
        high: 1010 + i * 5,
        low: 990 + i * 5,
        close: 1005 + i * 5,
        volume: 1000000
      }));
      
      const features = service.calculatePriceTrajectory(uptrendData);
      expect(features.zigzagTrend).toBeGreaterThanOrEqual(0);
    });

    it('should detect consolidation', () => {
      const consolidationData = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000,
        high: 1005,
        low: 995,
        close: 1000 + (Math.random() - 0.5) * 5, // Tight range
        volume: 1000000
      }));
      
      const features = service.calculatePriceTrajectory(consolidationData);
      expect(features.isConsolidation).toBe(1);
    });

    it('should handle insufficient data', () => {
      const smallData = mockData.slice(0, 5);
      const features = service.calculatePriceTrajectory(smallData);
      
      expect(features.zigzagTrend).toBe(0);
      expect(features.zigzagStrength).toBe(0);
    });
  });

  describe('calculateVolumeProfile', () => {
    it('should calculate all volume profile features', () => {
      const features = service.calculateVolumeProfile(mockData);
      
      expect(features).toHaveProperty('morningVolumeRatio');
      expect(features).toHaveProperty('afternoonVolumeRatio');
      expect(features).toHaveProperty('closingVolumeRatio');
      expect(features).toHaveProperty('volumeTrend');
      expect(features).toHaveProperty('volumeAcceleration');
      expect(features).toHaveProperty('volumeSurge');
      expect(features).toHaveProperty('priceVolumeCorrelation');
      expect(features).toHaveProperty('volumeAtHighPrice');
      expect(features).toHaveProperty('volumeAtLowPrice');
    });

    it('should return valid numeric values', () => {
      const features = service.calculateVolumeProfile(mockData);
      
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
        expect(isFinite(value)).toBe(true);
      });
    });

    it('should detect volume surge', () => {
      const surgeData = [...mockData];
      // Last candle has 3x normal volume
      surgeData[surgeData.length - 1].volume = surgeData[surgeData.length - 2].volume * 3;
      
      const features = service.calculateVolumeProfile(surgeData);
      expect(features.volumeSurge).toBe(1);
    });

    it('should calculate time-of-day ratios summing to ~1', () => {
      const features = service.calculateVolumeProfile(mockData);
      
      const sum = features.morningVolumeRatio + 
                  features.afternoonVolumeRatio + 
                  features.closingVolumeRatio;
      
      expect(sum).toBeCloseTo(1, 2);
    });

    it('should handle insufficient data', () => {
      const smallData = mockData.slice(0, 3);
      const features = service.calculateVolumeProfile(smallData);
      
      expect(features.volumeTrend).toBe(0);
      expect(features.volumeAcceleration).toBe(0);
    });
  });

  describe('calculateVolatilityRegime', () => {
    it('should calculate all volatility regime features', () => {
      const features = service.calculateVolatilityRegime(mockData);
      
      expect(features).toHaveProperty('volatilityRegime');
      expect(features).toHaveProperty('regimeChangeProb');
      expect(features).toHaveProperty('historicalVolatility');
      expect(features).toHaveProperty('realizedVolatility');
      expect(features).toHaveProperty('volatilitySkew');
      expect(features).toHaveProperty('volatilityKurtosis');
      expect(features).toHaveProperty('garchVolatility');
      expect(features).toHaveProperty('volatilityMomentum');
      expect(features).toHaveProperty('volatilityClustering');
    });

    it('should return valid numeric values', () => {
      const features = service.calculateVolatilityRegime(mockData);
      
      // Check numeric fields
      expect(typeof features.regimeChangeProb).toBe('number');
      expect(typeof features.historicalVolatility).toBe('number');
      expect(typeof features.realizedVolatility).toBe('number');
      
      expect(isFinite(features.regimeChangeProb)).toBe(true);
      expect(isFinite(features.historicalVolatility)).toBe(true);
    });

    it('should classify volatility regime', () => {
      const features = service.calculateVolatilityRegime(mockData);
      
      expect(['LOW', 'NORMAL', 'HIGH', 'EXTREME']).toContain(features.volatilityRegime);
    });

    it('should detect high volatility regime', () => {
      const volatileData = Array.from({ length: 50 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 + (Math.random() - 0.5) * 100, // High volatility
        high: 1050 + (Math.random() - 0.5) * 100,
        low: 950 + (Math.random() - 0.5) * 100,
        close: 1000 + (Math.random() - 0.5) * 100,
        volume: 1000000
      }));
      
      const features = service.calculateVolatilityRegime(volatileData);
      expect(['HIGH', 'EXTREME']).toContain(features.volatilityRegime);
    });

    it('should detect low volatility regime', () => {
      const stableData = Array.from({ length: 50 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 + (Math.random() - 0.5) * 2, // Low volatility
        high: 1001 + (Math.random() - 0.5) * 2,
        low: 999 + (Math.random() - 0.5) * 2,
        close: 1000 + (Math.random() - 0.5) * 2,
        volume: 1000000
      }));
      
      const features = service.calculateVolatilityRegime(stableData);
      expect(['LOW', 'NORMAL']).toContain(features.volatilityRegime);
    });

    it('should handle insufficient data', () => {
      const smallData = mockData.slice(0, 10);
      const features = service.calculateVolatilityRegime(smallData);
      
      expect(features.volatilityRegime).toBe('NORMAL');
      expect(features.historicalVolatility).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical bull market', () => {
      const bullData = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 + i * 5,
        high: 1010 + i * 5,
        low: 990 + i * 5,
        close: 1005 + i * 5,
        volume: 1000000 + i * 10000
      }));
      
      const candlestick = service.calculateCandlestickPatterns(bullData);
      const trajectory = service.calculatePriceTrajectory(bullData);
      const volume = service.calculateVolumeProfile(bullData);
      const volatility = service.calculateVolatilityRegime(bullData);
      
      expect(trajectory.zigzagTrend).toBeGreaterThanOrEqual(0);
      expect(volume.volumeTrend).toBeGreaterThanOrEqual(0);
      expect(volatility.volatilityRegime).toBeDefined();
    });

    it('should handle typical bear market', () => {
      const bearData = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 - i * 5,
        high: 1010 - i * 5,
        low: 990 - i * 5,
        close: 1005 - i * 5,
        volume: 1000000 + i * 10000
      }));
      
      const trajectory = service.calculatePriceTrajectory(bearData);
      expect(trajectory.zigzagTrend).toBeLessThanOrEqual(0);
    });

    it('should handle range-bound market', () => {
      const rangeData = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 + Math.sin(i * 0.5) * 10,
        high: 1010 + Math.sin(i * 0.5) * 10,
        low: 990 + Math.sin(i * 0.5) * 10,
        close: 1000 + Math.sin(i * 0.5) * 10,
        volume: 1000000
      }));
      
      const trajectory = service.calculatePriceTrajectory(rangeData);
      const volatility = service.calculateVolatilityRegime(rangeData);
      
      expect(trajectory.isConsolidation).toBe(1);
      expect(['LOW', 'NORMAL']).toContain(volatility.volatilityRegime);
    });
  });

  describe('edge cases', () => {
    it('should handle single data point', () => {
      const singleData = [mockData[0]];
      
      const candlestick = service.calculateCandlestickPatterns(singleData);
      expect(candlestick).toBeDefined();
      
      const trajectory = service.calculatePriceTrajectory(singleData);
      expect(trajectory.zigzagTrend).toBe(0);
    });

    it('should handle zero volume', () => {
      const zeroVolumeData = mockData.map(d => ({ ...d, volume: 0 }));
      
      const volume = service.calculateVolumeProfile(zeroVolumeData);
      expect(volume.volumeTrend).toBeDefined();
      expect(isFinite(volume.volumeTrend)).toBe(true);
    });

    it('should handle zero price range', () => {
      const flatData = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000,
        high: 1000,
        low: 1000,
        close: 1000,
        volume: 1000000
      }));
      
      const candlestick = service.calculateCandlestickPatterns(flatData);
      expect(candlestick.bodyRatio).toBe(0);
      
      const trajectory = service.calculatePriceTrajectory(flatData);
      expect(trajectory.isConsolidation).toBe(1);
    });

    it('should handle extreme price movements', () => {
      const extremeData = [
        {
          date: '2024-01-01',
          open: 100,
          high: 200,
          low: 50,
          close: 150,
          volume: 1000000
        }
      ];
      
      const candlestick = service.calculateCandlestickPatterns(extremeData);
      expect(candlestick.bodyRatio).toBeGreaterThan(0);
      expect(candlestick.bodyRatio).toBeLessThanOrEqual(1);
    });
  });
});
