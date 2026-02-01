/**
 * Tests for FeatureEngineering
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { FeatureEngineering } from '../FeatureEngineering';
import { OHLCV } from '../../../types/shared';

describe('FeatureEngineering', () => {
  let featureEngineering: FeatureEngineering;

  beforeEach(() => {
    featureEngineering = new FeatureEngineering();
  });

  const generateMockOHLCV = (count: number, startPrice: number = 100): OHLCV[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: 'AAPL',
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: startPrice + i * 0.5,
      high: startPrice + i * 0.5 + 2,
      low: startPrice + i * 0.5 - 2,
      close: startPrice + i * 0.5 + 1,
      volume: 1000000 * (1 + Math.random() * 0.5),
    }));
  };

  describe('calculateExtendedFeatures', () => {
    it('should calculate all extended features', () => {
      const ohlcvData = generateMockOHLCV(60);
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const averageVolume = ohlcvData.reduce((sum, d) => sum + d.volume, 0) / ohlcvData.length;

      const features = featureEngineering.calculateExtendedFeatures(
        ohlcvData,
        currentPrice,
        averageVolume
      );

      // 基本特徴量の検証
      expect(features).toHaveProperty('rsi');
      expect(features).toHaveProperty('rsiChange');
      expect(features).toHaveProperty('sma5');
      expect(features).toHaveProperty('sma20');
      expect(features).toHaveProperty('sma50');
      expect(features).toHaveProperty('priceMomentum');
      expect(features).toHaveProperty('volatility');
      expect(features).toHaveProperty('macdSignal');

      // 拡張特徴量の検証
      expect(features).toHaveProperty('momentum');
      expect(features).toHaveProperty('rateOfChange');
      expect(features).toHaveProperty('stochasticRSI');
      expect(features).toHaveProperty('williamsR');
      expect(features).toHaveProperty('cci');
      expect(features).toHaveProperty('atrRatio');
      expect(features).toHaveProperty('volumeProfile');
      expect(features).toHaveProperty('pricePosition');
      expect(features).toHaveProperty('momentumTrend');
      expect(features).toHaveProperty('volatilityRegime');

      // 数値型の検証
      expect(typeof features.rsi).toBe('number');
      expect(typeof features.momentum).toBe('number');
      expect(typeof features.rateOfChange).toBe('number');
      expect(typeof features.stochasticRSI).toBe('number');
      expect(typeof features.cci).toBe('number');
    });

    it('should throw error with insufficient data', () => {
      const ohlcvData = generateMockOHLCV(30); // Less than 50
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const averageVolume = 1000000;

      expect(() => {
        featureEngineering.calculateExtendedFeatures(ohlcvData, currentPrice, averageVolume);
      }).toThrow('Insufficient data');
    });

    it('should classify momentum trend correctly', () => {
      // Strong uptrend
      const uptrendData = Array.from({ length: 60 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i * 1.5,
        high: 102 + i * 1.5,
        low: 98 + i * 1.5,
        close: 101 + i * 1.5,
        volume: 1000000,
      }));

      const currentPrice = uptrendData[uptrendData.length - 1].close;
      const averageVolume = 1000000;
      const features = featureEngineering.calculateExtendedFeatures(
        uptrendData,
        currentPrice,
        averageVolume
      );

      expect(features.momentumTrend).toBe('STRONG_UP');
    });

    it('should classify volatility regime correctly', () => {
      const ohlcvData = generateMockOHLCV(60);
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const averageVolume = 1000000;

      const features = featureEngineering.calculateExtendedFeatures(
        ohlcvData,
        currentPrice,
        averageVolume
      );

      expect(['LOW', 'NORMAL', 'HIGH']).toContain(features.volatilityRegime);
    });

    it('should calculate stochastic RSI in range 0-100', () => {
      const ohlcvData = generateMockOHLCV(60);
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const averageVolume = 1000000;

      const features = featureEngineering.calculateExtendedFeatures(
        ohlcvData,
        currentPrice,
        averageVolume
      );

      expect(features.stochasticRSI).toBeGreaterThanOrEqual(0);
      expect(features.stochasticRSI).toBeLessThanOrEqual(100);
    });

    it('should calculate Williams %R in range -100 to 0', () => {
      const ohlcvData = generateMockOHLCV(60);
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const averageVolume = 1000000;

      const features = featureEngineering.calculateExtendedFeatures(
        ohlcvData,
        currentPrice,
        averageVolume
      );

      expect(features.williamsR).toBeGreaterThanOrEqual(-100);
      expect(features.williamsR).toBeLessThanOrEqual(0);
    });
  });

  describe('analyzeFeatureImportance', () => {
    it('should return feature importance ranked by score', () => {
      const ohlcvData = generateMockOHLCV(60);
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const averageVolume = 1000000;

      const features = featureEngineering.calculateExtendedFeatures(
        ohlcvData,
        currentPrice,
        averageVolume
      );

      const importance = featureEngineering.analyzeFeatureImportance(features);

      // 全ての特徴量が返される
      expect(importance.length).toBeGreaterThan(0);

      // 各項目に必要なプロパティがある
      importance.forEach(item => {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('score');
        expect(item).toHaveProperty('rank');
        expect(item).toHaveProperty('category');
        expect(['trend', 'momentum', 'volatility', 'volume']).toContain(item.category);
      });

      // ランクが1から始まる
      expect(importance[0].rank).toBe(1);

      // スコアで降順にソートされている
      for (let i = 1; i < importance.length; i++) {
        expect(importance[i - 1].score).toBeGreaterThanOrEqual(importance[i].score);
      }

      // スコアが0-1の範囲内
      importance.forEach(item => {
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(1);
      });
    });

    it('should categorize features correctly', () => {
      const ohlcvData = generateMockOHLCV(60);
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const averageVolume = 1000000;

      const features = featureEngineering.calculateExtendedFeatures(
        ohlcvData,
        currentPrice,
        averageVolume
      );

      const importance = featureEngineering.analyzeFeatureImportance(features);

      // カテゴリごとに少なくとも1つの特徴量がある
      const categories = new Set(importance.map(i => i.category));
      expect(categories.has('trend')).toBe(true);
      expect(categories.has('momentum')).toBe(true);
      expect(categories.has('volatility')).toBe(true);
      expect(categories.has('volume')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle flat prices', () => {
      const flatData = Array.from({ length: 60 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000000,
      }));

      const currentPrice = 100;
      const averageVolume = 1000000;

      const features = featureEngineering.calculateExtendedFeatures(
        flatData,
        currentPrice,
        averageVolume
      );

      expect(features.momentum).toBeCloseTo(0, 1);
      expect(features.rateOfChange).toBeCloseTo(0, 1);
      expect(features.momentumTrend).toBe('NEUTRAL');
    });

    it('should handle high volatility data', () => {
      const volatileData = Array.from({ length: 60 }, (_, i) => ({
        symbol: 'AAPL',
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + (i % 2 === 0 ? 10 : -10),
        high: 105 + (i % 2 === 0 ? 10 : -10),
        low: 95 + (i % 2 === 0 ? 10 : -10),
        close: 100 + (i % 2 === 0 ? 10 : -10),
        volume: 1000000,
      }));

      const currentPrice = volatileData[volatileData.length - 1].close;
      const averageVolume = 1000000;

      const features = featureEngineering.calculateExtendedFeatures(
        volatileData,
        currentPrice,
        averageVolume
      );

      expect(features.volatilityRegime).toBe('HIGH');
      expect(features.volatility).toBeGreaterThan(30);
    });
  });
});
