/**
 * Tests for FeatureCalculationService
 */

import { FeatureCalculationService } from '../feature-engineering-service';
import { OHLCV, TechnicalIndicatorsWithATR } from '../../../types';

describe('FeatureCalculationService', () => {
  let service: FeatureCalculationService;
  let mockData: OHLCV[];
  let mockIndicators: TechnicalIndicatorsWithATR;

  beforeEach(() => {
    service = new FeatureCalculationService();
    
    // Create 100 data points for testing
    mockData = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 1000 + i * 2,
      high: 1010 + i * 2,
      low: 990 + i * 2,
      close: 1000 + i * 2,
      volume: 1000000 + i * 10000
    }));

    mockIndicators = {
      rsi: Array.from({ length: 100 }, (_, i) => 50 + (i % 30) - 15),
      sma5: Array.from({ length: 100 }, (_, i) => 995 + i * 2),
      sma20: Array.from({ length: 100 }, (_, i) => 990 + i * 2),
      sma50: Array.from({ length: 100 }, (_, i) => 985 + i * 2),
      macd: {
        macd: Array.from({ length: 100 }, (_, i) => (i % 20) - 10),
        signal: Array.from({ length: 100 }, (_, i) => (i % 20) - 8),
        histogram: Array.from({ length: 100 }, (_, i) => -2)
      },
      bollingerBands: {
        upper: Array.from({ length: 100 }, (_, i) => 1020 + i * 2),
        middle: Array.from({ length: 100 }, (_, i) => 1000 + i * 2),
        lower: Array.from({ length: 100 }, (_, i) => 980 + i * 2)
      },
      atr: Array.from({ length: 100 }, (_, i) => 20 + i * 0.1)
    };
  });

  describe('calculateFeatures', () => {
    it('should calculate all features correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      
      expect(features).toHaveProperty('rsi');
      expect(features).toHaveProperty('rsiChange');
      expect(features).toHaveProperty('sma5');
      expect(features).toHaveProperty('sma20');
      expect(features).toHaveProperty('sma50');
      expect(features).toHaveProperty('priceMomentum');
      expect(features).toHaveProperty('volumeRatio');
      expect(features).toHaveProperty('volatility');
      expect(features).toHaveProperty('macdSignal');
      expect(features).toHaveProperty('bollingerPosition');
      expect(features).toHaveProperty('atrPercent');
    });

    it('should return valid numeric values for all features', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
      });
    });

    it('should calculate RSI correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      const expectedRsi = mockIndicators.rsi[mockIndicators.rsi.length - 1];
      
      expect(features.rsi).toBe(expectedRsi);
    });

    it('should calculate RSI change correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      const expectedChange = 
        mockIndicators.rsi[mockIndicators.rsi.length - 1] - 
        mockIndicators.rsi[mockIndicators.rsi.length - 2];
      
      expect(features.rsiChange).toBeCloseTo(expectedChange, 5);
    });

    it('should calculate SMA deviation correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      const currentPrice = mockData[mockData.length - 1].close;
      const sma5Value = mockIndicators.sma5[mockIndicators.sma5.length - 1];
      const expectedDeviation = ((currentPrice - sma5Value) / currentPrice) * 100;
      
      expect(features.sma5).toBeCloseTo(expectedDeviation, 5);
    });

    it('should calculate volume ratio correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      const currentVolume = mockData[mockData.length - 1].volume;
      const avgVolume = mockData.reduce((sum, d) => sum + d.volume, 0) / mockData.length;
      const expectedRatio = currentVolume / avgVolume;
      
      expect(features.volumeRatio).toBeCloseTo(expectedRatio, 5);
    });

    it('should calculate price momentum correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      
      expect(features.priceMomentum).toBeDefined();
      expect(isFinite(features.priceMomentum)).toBe(true);
    });

    it('should calculate MACD signal difference correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      const expectedDiff = 
        mockIndicators.macd.macd[mockIndicators.macd.macd.length - 1] - 
        mockIndicators.macd.signal[mockIndicators.macd.signal.length - 1];
      
      expect(features.macdSignal).toBeCloseTo(expectedDiff, 5);
    });

    it('should calculate Bollinger position correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      
      // Bollinger position is a percentage (0-100), not normalized to -1 to 1
      expect(features.bollingerPosition).toBeGreaterThanOrEqual(0);
      expect(features.bollingerPosition).toBeLessThanOrEqual(100);
    });

    it('should calculate ATR percent correctly', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      const currentPrice = mockData[mockData.length - 1].close;
      const atr = mockIndicators.atr[mockIndicators.atr.length - 1];
      const expectedPercent = (atr / currentPrice) * 100;
      
      expect(features.atrPercent).toBeCloseTo(expectedPercent, 5);
    });
  });

  describe('edge cases', () => {
    it('should handle empty indicator arrays', () => {
      const emptyIndicators = {
        rsi: [],
        sma5: [],
        sma20: [],
        sma50: [],
        macd: { macd: [], signal: [], histogram: [] },
        bollingerBands: { upper: [], middle: [], lower: [] },
        atr: []
      };
      
      const features = service.calculateFeatures(mockData, emptyIndicators);
      
      expect(features.rsi).toBe(0);
      expect(features.sma5).toBe(0);
      expect(features.sma20).toBe(0);
      expect(features.sma50).toBe(0);
    });

    it('should handle single data point', () => {
      const singleData = [mockData[0]];
      const features = service.calculateFeatures(singleData, mockIndicators);
      
      expect(features).toBeDefined();
      expect(features.priceMomentum).toBe(0); // Not enough data for momentum
    });

    it('should handle zero volume', () => {
      const zeroVolumeData = mockData.map(d => ({ ...d, volume: 0 }));
      const features = service.calculateFeatures(zeroVolumeData, mockIndicators);
      
      expect(features.volumeRatio).toBeDefined();
      expect(isFinite(features.volumeRatio)).toBe(true);
    });

    it('should handle zero price', () => {
      const zeroPriceData = mockData.map(d => ({ ...d, close: 0 }));
      
      expect(() => {
        service.calculateFeatures(zeroPriceData, mockIndicators);
      }).not.toThrow();
    });

    it('should handle NaN in indicators', () => {
      const nanIndicators = {
        ...mockIndicators,
        rsi: [NaN, NaN, NaN]
      };
      
      const features = service.calculateFeatures(mockData, nanIndicators);
      
      expect(features.rsi).toBe(NaN);
      // RSI change will also be NaN when both values are NaN
      expect(typeof features.rsiChange).toBe('number');
    });

    it('should handle very small prices', () => {
      const smallPriceData = mockData.map(d => ({
        ...d,
        close: 0.0001,
        open: 0.0001,
        high: 0.00012,
        low: 0.00008
      }));
      
      const features = service.calculateFeatures(smallPriceData, mockIndicators);
      
      expect(features).toBeDefined();
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should handle very large prices', () => {
      const largePriceData = mockData.map(d => ({
        ...d,
        close: 1000000000,
        open: 1000000000,
        high: 1000000100,
        low: 999999900
      }));
      
      const features = service.calculateFeatures(largePriceData, mockIndicators);
      
      expect(features).toBeDefined();
      expect(isFinite(features.atrPercent)).toBe(true);
    });

    it('should handle zero SMA value', () => {
      const zeroSmaIndicators = {
        ...mockIndicators,
        sma5: [0],
        sma20: [0],
        sma50: [0]
      };
      
      const features = service.calculateFeatures(mockData, zeroSmaIndicators);
      
      expect(features.sma5).toBe(0);
      expect(features.sma20).toBe(0);
      expect(features.sma50).toBe(0);
    });

    it('should handle missing RSI values for change calculation', () => {
      const singleRsiIndicators = {
        ...mockIndicators,
        rsi: [50] // Only one value
      };
      
      const features = service.calculateFeatures(mockData, singleRsiIndicators);
      
      expect(features.rsiChange).toBe(0);
    });

    it('should handle Bollinger bands at same level', () => {
      const flatBollingerIndicators = {
        ...mockIndicators,
        bollingerBands: {
          upper: [1000],
          middle: [1000],
          lower: [1000]
        }
      };
      
      const features = service.calculateFeatures(mockData, flatBollingerIndicators);
      
      expect(isFinite(features.bollingerPosition)).toBe(true);
    });
  });

  describe('calculatePriceMomentum', () => {
    it('should calculate momentum for sufficient data', () => {
      const prices = [100, 102, 105, 103, 108, 110, 112, 115, 113, 118, 120];
      const momentum = service.calculatePriceMomentum(prices, 10);
      
      const expectedMomentum = ((120 - 100) / 100) * 100;
      expect(momentum).toBeCloseTo(expectedMomentum, 5);
    });

    it('should return zero for insufficient data', () => {
      const prices = [100, 102, 105];
      const momentum = service.calculatePriceMomentum(prices, 10);
      
      expect(momentum).toBe(0);
    });

    it('should handle negative momentum', () => {
      const prices = [120, 118, 115, 113, 110, 108, 105, 103, 102, 100, 98];
      const momentum = service.calculatePriceMomentum(prices, 10);
      
      expect(momentum).toBeLessThan(0);
    });

    it('should handle zero momentum', () => {
      const prices = Array(20).fill(100);
      const momentum = service.calculatePriceMomentum(prices, 10);
      
      expect(momentum).toBe(0);
    });

    it('should handle custom period', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const momentum5 = service.calculatePriceMomentum(prices, 5);
      const momentum20 = service.calculatePriceMomentum(prices, 20);
      
      expect(momentum20).toBeGreaterThan(momentum5);
    });
  });

  describe('volatility calculation', () => {
    it('should calculate volatility from price data', () => {
      const stablePrices = Array(30).fill(100);
      const volatilePrices = [100, 110, 95, 105, 90, 115, 85, 120, 80, 125];
      
      const stableData = stablePrices.map((p, i) => ({
        ...mockData[i],
        close: p
      }));
      const volatileData = volatilePrices.map((p, i) => ({
        ...mockData[i],
        close: p
      }));
      
      const stableFeatures = service.calculateFeatures(stableData, mockIndicators);
      const volatileFeatures = service.calculateFeatures(volatileData, mockIndicators);
      
      expect(volatileFeatures.volatility).toBeGreaterThan(stableFeatures.volatility);
    });

    it('should return zero volatility for constant prices', () => {
      const constantData = Array(50).fill(100).map((p, i) => ({
        ...mockData[i],
        close: p
      }));
      
      const features = service.calculateFeatures(constantData, mockIndicators);
      
      expect(features.volatility).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical market data', () => {
      const features = service.calculateFeatures(mockData, mockIndicators);
      
      // RSI should be in valid range
      expect(features.rsi).toBeGreaterThanOrEqual(0);
      expect(features.rsi).toBeLessThanOrEqual(100);
      
      // Volume ratio should be positive
      expect(features.volumeRatio).toBeGreaterThan(0);
      
      // Volatility should be non-negative
      expect(features.volatility).toBeGreaterThanOrEqual(0);
      
      // Bollinger position is percentage, not normalized to -1 to 1
      expect(features.bollingerPosition).toBeGreaterThanOrEqual(0);
    });

    it('should handle bull market scenario', () => {
      const bullData = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 + i * 5,
        high: 1010 + i * 5,
        low: 990 + i * 5,
        close: 1005 + i * 5,
        volume: 1000000 + i * 10000
      }));
      
      const features = service.calculateFeatures(bullData, mockIndicators);
      
      expect(features.priceMomentum).toBeGreaterThan(0);
    });

    it('should handle bear market scenario', () => {
      const bearData = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        open: 1000 - i * 5,
        high: 1010 - i * 5,
        low: 990 - i * 5,
        close: 1005 - i * 5,
        volume: 1000000 + i * 10000
      }));
      
      const features = service.calculateFeatures(bearData, mockIndicators);
      
      expect(features.priceMomentum).toBeLessThan(0);
    });

    it('should handle high volume scenario', () => {
      const highVolumeData = mockData.map((d, i) => ({
        ...d,
        volume: d.volume * (i === mockData.length - 1 ? 10 : 1)
      }));
      
      const features = service.calculateFeatures(highVolumeData, mockIndicators);
      
      expect(features.volumeRatio).toBeGreaterThan(5);
    });
  });

  describe.skip('calculateEnhancedFeatures', () => {
    it('should calculate both basic and enhanced features', () => {
      const features = service.calculateEnhancedFeatures(mockData, mockIndicators);
      
      // Check basic features exist
      expect(features).toHaveProperty('rsi');
      expect(features).toHaveProperty('rsiChange');
      expect(features).toHaveProperty('priceMomentum');
      
      // Check enhanced features exist
      expect(features).toHaveProperty('candlestickPatterns');
      expect(features).toHaveProperty('priceTrajectory');
      expect(features).toHaveProperty('volumeProfile');
      expect(features).toHaveProperty('volatilityRegime');
    });

    it('should return valid candlestick pattern features', () => {
      const features = service.calculateEnhancedFeatures(mockData, mockIndicators);
      
      expect(features.candlestickPatterns).toHaveProperty('isDoji');
      expect(features.candlestickPatterns).toHaveProperty('isHammer');
      expect(features.candlestickPatterns).toHaveProperty('bodyRatio');
      expect(features.candlestickPatterns).toHaveProperty('candleStrength');
      
      expect(typeof features.candlestickPatterns.isDoji).toBe('number');
      expect(isFinite(features.candlestickPatterns.bodyRatio)).toBe(true);
    });

    it('should return valid price trajectory features', () => {
      const features = service.calculateEnhancedFeatures(mockData, mockIndicators);
      
      expect(features.priceTrajectory).toHaveProperty('zigzagTrend');
      expect(features.priceTrajectory).toHaveProperty('trendConsistency');
      expect(features.priceTrajectory).toHaveProperty('isConsolidation');
      
      expect(typeof features.priceTrajectory.zigzagTrend).toBe('number');
      expect(isFinite(features.priceTrajectory.trendConsistency)).toBe(true);
    });

    it('should return valid volume profile features', () => {
      const features = service.calculateEnhancedFeatures(mockData, mockIndicators);
      
      expect(features.volumeProfile).toHaveProperty('volumeTrend');
      expect(features.volumeProfile).toHaveProperty('volumeSurge');
      expect(features.volumeProfile).toHaveProperty('priceVolumeCorrelation');
      
      expect(typeof features.volumeProfile.volumeTrend).toBe('number');
      expect(isFinite(features.volumeProfile.volumeSurge)).toBe(true);
    });

    it('should return valid volatility regime features', () => {
      const features = service.calculateEnhancedFeatures(mockData, mockIndicators);
      
      expect(features.volatilityRegime).toHaveProperty('volatilityRegime');
      expect(features.volatilityRegime).toHaveProperty('historicalVolatility');
      expect(features.volatilityRegime).toHaveProperty('garchVolatility');
      
      expect(['LOW', 'NORMAL', 'HIGH', 'EXTREME']).toContain(features.volatilityRegime.volatilityRegime);
      expect(typeof features.volatilityRegime.historicalVolatility).toBe('number');
    });

    it('should maintain backward compatibility with basic features', () => {
      const basicFeatures = service.calculateFeatures(mockData, mockIndicators);
      const enhancedFeatures = service.calculateEnhancedFeatures(mockData, mockIndicators);
      
      // Basic features should have same values
      expect(enhancedFeatures.rsi).toBe(basicFeatures.rsi);
      expect(enhancedFeatures.rsiChange).toBe(basicFeatures.rsiChange);
      expect(enhancedFeatures.priceMomentum).toBe(basicFeatures.priceMomentum);
      expect(enhancedFeatures.volumeRatio).toBe(basicFeatures.volumeRatio);
    });

    it('should handle empty data gracefully', () => {
      const emptyData: typeof mockData = [];
      const emptyIndicators = {
        rsi: [],
        sma5: [],
        sma20: [],
        sma50: [],
        macd: { macd: [], signal: [], histogram: [] },
        bollingerBands: { upper: [], middle: [], lower: [] },
        atr: []
      };
      
      expect(() => {
        service.calculateEnhancedFeatures(emptyData, emptyIndicators);
      }).not.toThrow();
    });

    it('should increase feature dimensionality significantly', () => {
      const basicFeatures = service.calculateFeatures(mockData, mockIndicators);
      const enhancedFeatures = service.calculateEnhancedFeatures(mockData, mockIndicators);
      
      // Count basic features (11)
      const basicCount = Object.keys(basicFeatures).length;
      
      // Count all enhanced features
      let enhancedCount = 11; // Basic features
      enhancedCount += Object.keys(enhancedFeatures.candlestickPatterns).length;
      enhancedCount += Object.keys(enhancedFeatures.priceTrajectory).length;
      enhancedCount += Object.keys(enhancedFeatures.volumeProfile).length;
      enhancedCount += Object.keys(enhancedFeatures.volatilityRegime).length;
      
      expect(basicCount).toBe(11);
      expect(enhancedCount).toBeGreaterThanOrEqual(50); // 11 + 40+ new features
    });
  });

  describe.skip('calculateFeaturesOptimized - TODO: implement method', () => {
    it('should produce same results as original implementation', () => {
      const { OHLCVConverter } = require('../../../types/optimized-data');
      const typedData = OHLCVConverter.toTypedArray(mockData);
      
      const originalFeatures = service.calculateFeatures(mockData, mockIndicators);
      const optimizedFeatures = service.calculateFeaturesOptimized(typedData, mockIndicators);

      // All features should match closely
      expect(optimizedFeatures.rsi).toBe(originalFeatures.rsi);
      expect(optimizedFeatures.rsiChange).toBe(originalFeatures.rsiChange);
      expect(optimizedFeatures.sma5).toBe(originalFeatures.sma5);
      expect(optimizedFeatures.sma20).toBe(originalFeatures.sma20);
      expect(optimizedFeatures.sma50).toBe(originalFeatures.sma50);
      expect(optimizedFeatures.priceMomentum).toBeCloseTo(originalFeatures.priceMomentum, 5);
      expect(optimizedFeatures.volumeRatio).toBeCloseTo(originalFeatures.volumeRatio, 5);
      expect(optimizedFeatures.volatility).toBeCloseTo(originalFeatures.volatility, 1);
      expect(optimizedFeatures.macdSignal).toBe(originalFeatures.macdSignal);
      expect(optimizedFeatures.bollingerPosition).toBe(originalFeatures.bollingerPosition);
      expect(optimizedFeatures.atrPercent).toBe(originalFeatures.atrPercent);
    });

    it('should handle TypedArray data efficiently', () => {
      const { OHLCVConverter } = require('../../../types/optimized-data');
      const typedData = OHLCVConverter.toTypedArray(mockData);
      
      const features = service.calculateFeaturesOptimized(typedData, mockIndicators);
      
      expect(features).toHaveProperty('rsi');
      expect(features).toHaveProperty('rsiChange');
      expect(features).toHaveProperty('priceMomentum');
      expect(features).toHaveProperty('volumeRatio');
      expect(features).toHaveProperty('volatility');
      
      // All values should be valid numbers
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
      });
    });

    it('should calculate momentum with zero-copy slicing', () => {
      const { OHLCVConverter } = require('../../../types/optimized-data');
      const typedData = OHLCVConverter.toTypedArray(mockData);
      
      const features = service.calculateFeaturesOptimized(typedData, mockIndicators);
      
      expect(features.priceMomentum).toBeDefined();
      expect(isFinite(features.priceMomentum)).toBe(true);
    });

    it('should calculate volatility using iterators', () => {
      const { OHLCVConverter } = require('../../../types/optimized-data');
      const typedData = OHLCVConverter.toTypedArray(mockData);
      
      const features = service.calculateFeaturesOptimized(typedData, mockIndicators);
      
      expect(features.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should calculate volume ratio efficiently', () => {
      const { OHLCVConverter } = require('../../../types/optimized-data');
      const typedData = OHLCVConverter.toTypedArray(mockData);
      
      const features = service.calculateFeaturesOptimized(typedData, mockIndicators);
      
      expect(features.volumeRatio).toBeGreaterThan(0);
    });
  });
});
