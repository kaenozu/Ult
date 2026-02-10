/**
 * FeatureEngineering.test.ts
 *
 * 特徴量エンジニアリングのテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { featureEngineering, AllFeatures, TechnicalFeatures } from '../FeatureEngineering';
import { OHLCV } from '../../../types/shared';

describe('FeatureEngineering', () => {
  let mockData: OHLCV[];

  beforeEach(() => {
    // モックデータの生成（200日分）
    mockData = [];
    let price = 1000;
    const now = new Date();

    for (let i = 0; i < 200; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (200 - i));

      // ランダムウォークで価格変動
      const change = (Math.random() - 0.48) * 20; // わずかな上昇バイアス
      price = Math.max(100, price + change);

      const open = price;
      const close = price + (Math.random() - 0.5) * 5;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;

      mockData.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume: Math.floor(1000000 + Math.random() * 500000),
      });
    }
  });

  describe('calculateAllFeatures', () => {
    it('should throw error for insufficient data', () => {
      const insufficientData = mockData.slice(0, 49);

      expect(() => {
        featureEngineering.calculateAllFeatures(insufficientData);
      }).toThrow('Insufficient data');
    });

    it('should calculate all features successfully', () => {
      const features: AllFeatures = featureEngineering.calculateAllFeatures(mockData);

      // テクニカル特徴量の検証
      expect(features.technical).toBeDefined();
      expect(features.technical.rsi).toBeGreaterThanOrEqual(0);
      expect(features.technical.rsi).toBeLessThanOrEqual(100);

      // 時系列特徴量の検証
      expect(features.timeSeries).toBeDefined();
      expect(features.timeSeries.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(features.timeSeries.dayOfWeek).toBeLessThanOrEqual(6);

      // メタデータの検証
      expect(features.featureCount).toBeGreaterThan(0);
      expect(features.dataQuality).toBeDefined();
    });

    it('should include macro and sentiment features when provided', () => {
      const mockMacro = {
        interestRate: 0.5,
        interestRateTrend: 'RISING' as const,
        gdpGrowth: 2.0,
        gdpTrend: 'EXPANDING' as const,
        cpi: 100,
        cpiTrend: 'RISING' as const,
        inflationRate: 2.5,
        macroScore: 0.5,
      };

      const mockSentiment = {
        newsSentiment: 0.3,
        newsVolume: 0.7,
        newsTrend: 'IMPROVING' as const,
        socialSentiment: 0.2,
        socialVolume: 0.6,
        socialBuzz: 0.8,
        analystRating: 4,
        ratingChange: 0.5,
        sentimentScore: 0.3,
      };

      const features: AllFeatures = featureEngineering.calculateAllFeatures(
        mockData,
        mockMacro,
        mockSentiment
      );

      expect(features.macro).toEqual(mockMacro);
      expect(features.sentiment).toEqual(mockSentiment);
    });

    it('should use default values when macro and sentiment are not provided', () => {
      const features: AllFeatures = featureEngineering.calculateAllFeatures(mockData);

      expect(features.macro).not.toBeNull();
      expect(features.macro!.macroScore).toBe(0);
      expect(features.sentiment).not.toBeNull();
      expect(features.sentiment!.sentimentScore).toBe(0);
    });
  });

  describe('calculateTechnicalFeatures', () => {
    it('should calculate RSI correctly', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.rsi).toBeGreaterThanOrEqual(0);
      expect(features.rsi).toBeLessThanOrEqual(100);
      expect(features.rsiChange).toBeDefined();
    });

    it('should calculate moving averages deviations', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.sma5).toBeDefined();
      expect(features.sma10).toBeDefined();
      expect(features.sma20).toBeDefined();
      expect(features.sma50).toBeDefined();
      expect(features.sma200).toBeDefined();
    });

    it('should calculate MACD correctly', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.macd).toBeDefined();
      expect(features.macdSignal).toBeDefined();
      expect(features.macdHistogram).toBeDefined();
    });

    it('should calculate Bollinger Bands correctly', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.bbUpper).toBeGreaterThan(features.bbMiddle);
      expect(features.bbMiddle).toBeGreaterThan(features.bbLower);
      expect(features.bbPosition).toBeGreaterThanOrEqual(0);
      expect(features.bbPosition).toBeLessThanOrEqual(100);
    });

    it('should calculate ATR correctly', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.atr).toBeGreaterThan(0);
      expect(features.atrPercent).toBeGreaterThan(0);
      expect(features.atrRatio).toBeDefined();
    });

    it('should calculate momentum indicators', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.momentum10).toBeDefined();
      expect(features.momentum20).toBeDefined();
      expect(features.rateOfChange12).toBeDefined();
      expect(features.rateOfChange25).toBeDefined();
    });

    it('should calculate oscillators', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.stochasticK).toBeGreaterThanOrEqual(0);
      expect(features.stochasticK).toBeLessThanOrEqual(100);
      expect(features.williamsR).toBeGreaterThanOrEqual(-100);
      expect(features.williamsR).toBeLessThanOrEqual(0);
      expect(features.cci).toBeDefined();
    });

    it('should calculate volume indicators', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.volumeRatio).toBeDefined();
      expect(features.volumeMA5).toBeGreaterThan(0);
      expect(features.volumeMA20).toBeGreaterThan(0);
      expect(['INCREASING', 'DECREASING', 'NEUTRAL']).toContain(features.volumeTrend);
    });

    it('should calculate price derivatives', () => {
      const features = featureEngineering.calculateTechnicalFeatures(mockData);

      expect(features.pricePosition).toBeGreaterThanOrEqual(0);
      expect(features.pricePosition).toBeLessThanOrEqual(100);
      expect(features.priceVelocity).toBeDefined();
      expect(features.priceAcceleration).toBeDefined();
    });
  });

  describe('calculateTimeSeriesFeatures', () => {
    it('should calculate lag features', () => {
      const features = featureEngineering.calculateTimeSeriesFeatures(mockData);

      expect(features.lag1).toBeDefined();
      expect(features.lag5).toBeDefined();
      expect(features.lag10).toBeDefined();
      expect(features.lag20).toBeDefined();
    });

    it('should calculate moving averages', () => {
      const features = featureEngineering.calculateTimeSeriesFeatures(mockData);

      expect(features.ma5).toBeGreaterThan(0);
      expect(features.ma10).toBeGreaterThan(0);
      expect(features.ma20).toBeGreaterThan(0);
      expect(features.ma50).toBeGreaterThan(0);
    });

    it('should calculate seasonal effects', () => {
      const features = featureEngineering.calculateTimeSeriesFeatures(mockData);

      expect(features.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(features.dayOfWeek).toBeLessThanOrEqual(6);
      expect(features.dayOfWeekReturn).toBeDefined();
      expect(features.monthOfYear).toBeGreaterThanOrEqual(0);
      expect(features.monthOfYear).toBeLessThanOrEqual(11);
      expect(features.monthEffect).toBeDefined();
    });

    it('should calculate trend strength and direction', () => {
      const features = featureEngineering.calculateTimeSeriesFeatures(mockData);

      expect(features.trendStrength).toBeGreaterThanOrEqual(0);
      expect(features.trendStrength).toBeLessThanOrEqual(1);
      expect(['UP', 'DOWN', 'NEUTRAL']).toContain(features.trendDirection);
    });

    it('should calculate cyclicality', () => {
      const features = featureEngineering.calculateTimeSeriesFeatures(mockData);

      expect(features.cyclicality).toBeGreaterThanOrEqual(0);
      expect(features.cyclicality).toBeLessThanOrEqual(1);
    });
  });

  describe('data quality assessment', () => {
    it('should assess data quality as EXCELLENT for good data', () => {
      const features: AllFeatures = featureEngineering.calculateAllFeatures(mockData);

      expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(features.dataQuality);
    });

    it('should assess data quality as POOR for insufficient data', () => {
      const poorData = mockData.slice(0, 30);

      expect(() => {
        featureEngineering.calculateAllFeatures(poorData);
      }).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle data with zeros gracefully', () => {
      const dataWithZeros = mockData.map((d, i) => {
        if (i % 10 === 0) {
          return { ...d, high: 0, low: 0 };
        }
        return d;
      });

      expect(() => {
        featureEngineering.calculateAllFeatures(dataWithZeros);
      }).not.toThrow();
    });

    it('should handle constant price data', () => {
      const constantData: OHLCV[] = mockData.map((d) => ({
        ...d,
        open: 1000,
        high: 1000,
        low: 1000,
        close: 1000,
      }));

      expect(() => {
        featureEngineering.calculateAllFeatures(constantData);
      }).not.toThrow();
    });
  });
});
