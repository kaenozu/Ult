/**
 * Prediction Cloud Calculator Tests
 * 
 * TDD: 予測雲計算ロジックのテスト
 */

import { OHLCV } from '../../types';
import {
  calculatePredictionClouds,
  calculateATRTrend,
  getVolatilityAssessment,
  getTrendDirection,
  calculateRiskScore,
} from '../calculator';
import {
  PredictionCloudConfig,
  DEFAULT_PREDICTION_CLOUD_CONFIG,
} from '../types';

describe('Prediction Cloud Calculator', () => {
  // テスト用のOHLCVデータを生成
  const generateTestData = (days: number = 30): OHLCV[] => {
    const data: OHLCV[] = [];
    const basePrice = 1000;
    
    for (let i = 0; i < days; i++) {
      const date = new Date('2024-01-01');
      date.setDate(date.getDate() + i);
      
      // ランダムな価格変動を生成
      const volatility = 20; // ±20円の変動
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * 10;
      const low = Math.min(open, close) - Math.random() * 10;
      const volume = 1000000 + Math.random() * 500000;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume,
      });
    }
    
    return data;
  };

  describe('calculatePredictionClouds', () => {
    it('should calculate prediction clouds with default config', () => {
      const data = generateTestData(30);
      const symbol = 'TEST';
      
      const result = calculatePredictionClouds(data, symbol);
      
      // 基本構造の検証
      expect(result).toBeDefined();
      expect(result.symbol).toBe(symbol);
      expect(result.currentPrice).toBeGreaterThan(0);
      expect(result.currentATR).toBeGreaterThan(0);
      expect(result.clouds).toBeInstanceOf(Array);
      expect(result.clouds.length).toBeGreaterThan(0);
    });

    it('should have correct structure for each cloud point', () => {
      const data = generateTestData(30);
      const result = calculatePredictionClouds(data, 'TEST');
      
      const cloud = result.clouds[0];
      expect(cloud).toHaveProperty('date');
      expect(cloud).toHaveProperty('timestamp');
      expect(cloud).toHaveProperty('center');
      expect(cloud).toHaveProperty('upper');
      expect(cloud).toHaveProperty('lower');
      expect(cloud).toHaveProperty('range');
      expect(cloud).toHaveProperty('confidence');
      expect(cloud).toHaveProperty('atr');
      expect(cloud).toHaveProperty('atrMultiplier');
    });

    it('should calculate upper > lower for all points', () => {
      const data = generateTestData(30);
      const result = calculatePredictionClouds(data, 'TEST');
      
      result.clouds.forEach(cloud => {
        expect(cloud.upper).toBeGreaterThan(cloud.lower);
        expect(cloud.range).toBeCloseTo(cloud.upper - cloud.lower, 10);
      });
    });

    it('should respect min and max range percent limits', () => {
      const data = generateTestData(30);
      const config: PredictionCloudConfig = {
        ...DEFAULT_PREDICTION_CLOUD_CONFIG,
        minRangePercent: 2,
        maxRangePercent: 10,
      };
      
      const result = calculatePredictionClouds(data, 'TEST', config);
      
      result.clouds.forEach(cloud => {
        const rangePercent = (cloud.range / cloud.center) * 100;
        expect(rangePercent).toBeGreaterThanOrEqual(config.minRangePercent);
        expect(rangePercent).toBeLessThanOrEqual(config.maxRangePercent);
      });
    });

    it('should generate forecast clouds for future days', () => {
      const data = generateTestData(30);
      const config: PredictionCloudConfig = {
        ...DEFAULT_PREDICTION_CLOUD_CONFIG,
        forecastDays: 5,
      };
      
      const result = calculatePredictionClouds(data, 'TEST', config);
      
      expect(result.forecastClouds.length).toBe(config.forecastDays);
      // Historical clouds start from atrPeriod index, so length is data.length - atrPeriod
      expect(result.historicalClouds.length).toBe(data.length - config.atrPeriod);
    });

    it('should calculate confidence based on ATR multiplier', () => {
      const data = generateTestData(30);
      
      // 保守的設定（狭い範囲 = 低い信頼度）
      const conservative = calculatePredictionClouds(data, 'TEST', {
        ...DEFAULT_PREDICTION_CLOUD_CONFIG,
        standardMultiplier: 1.0,
      });
      
      // 標準設定
      const standard = calculatePredictionClouds(data, 'TEST', {
        ...DEFAULT_PREDICTION_CLOUD_CONFIG,
        standardMultiplier: 1.5,
      });
      
      // 楽観的設定（広い範囲 = 高い信頼度）
      const aggressive = calculatePredictionClouds(data, 'TEST', {
        ...DEFAULT_PREDICTION_CLOUD_CONFIG,
        standardMultiplier: 2.0,
      });
      
      // 広い範囲ほど信頼度が高い
      const lastConservative = conservative.clouds[conservative.clouds.length - 1];
      const lastStandard = standard.clouds[standard.clouds.length - 1];
      const lastAggressive = aggressive.clouds[aggressive.clouds.length - 1];
      
      expect(lastConservative.confidence).toBeLessThan(lastStandard.confidence);
      // Both 1.5 and 2.0 multipliers may hit the 99 cap, so use less than or equal
      expect(lastStandard.confidence).toBeLessThanOrEqual(lastAggressive.confidence);
    });

    it('should handle insufficient data gracefully', () => {
      const data = generateTestData(5); // データが少なすぎる
      
      expect(() => calculatePredictionClouds(data, 'TEST')).toThrow();
    });

    it('should handle empty data array', () => {
      expect(() => calculatePredictionClouds([], 'TEST')).toThrow();
    });
  });

  describe('calculateATRTrend', () => {
    it('should detect increasing ATR trend', () => {
      const atrs = [1, 2, 3, 4, 5];
      const trend = calculateATRTrend(atrs);
      
      expect(trend).toBe('INCREASING');
    });

    it('should detect decreasing ATR trend', () => {
      const atrs = [5, 4, 3, 2, 1];
      const trend = calculateATRTrend(atrs);
      
      expect(trend).toBe('DECREASING');
    });

    it('should detect stable ATR trend', () => {
      const atrs = [3, 3, 3, 3, 3];
      const trend = calculateATRTrend(atrs);
      
      expect(trend).toBe('STABLE');
    });

    it('should handle insufficient data', () => {
      const atrs = [1, 2];
      const trend = calculateATRTrend(atrs);
      
      expect(trend).toBe('STABLE');
    });
  });

  describe('getVolatilityAssessment', () => {
    it('should classify low volatility', () => {
      expect(getVolatilityAssessment(0.5)).toBe('LOW');
      expect(getVolatilityAssessment(1.0)).toBe('LOW');
    });

    it('should classify moderate volatility', () => {
      expect(getVolatilityAssessment(1.5)).toBe('MODERATE');
      expect(getVolatilityAssessment(2.5)).toBe('MODERATE');
    });

    it('should classify high volatility', () => {
      expect(getVolatilityAssessment(3.0)).toBe('HIGH');
      expect(getVolatilityAssessment(4.0)).toBe('HIGH');
    });

    it('should classify extreme volatility', () => {
      expect(getVolatilityAssessment(5.0)).toBe('EXTREME');
      expect(getVolatilityAssessment(10.0)).toBe('EXTREME');
    });
  });

  describe('getTrendDirection', () => {
    it('should detect upward trend', () => {
      const prices = [100, 105, 110, 115, 120];
      expect(getTrendDirection(prices)).toBe('UP');
    });

    it('should detect downward trend', () => {
      const prices = [120, 115, 110, 105, 100];
      expect(getTrendDirection(prices)).toBe('DOWN');
    });

    it('should detect sideways trend', () => {
      const prices = [100, 102, 99, 101, 100];
      expect(getTrendDirection(prices)).toBe('SIDEWAYS');
    });

    it('should handle insufficient data', () => {
      expect(getTrendDirection([100])).toBe('SIDEWAYS');
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate low risk for stable conditions', () => {
      const score = calculateRiskScore(1.0, 'STABLE', 'SIDEWAYS');
      // Score = 10 (ATR%) + 10 (STABLE) + 10 (SIDEWAYS) = 30
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should calculate high risk for extreme volatility', () => {
      const score = calculateRiskScore(5.0, 'INCREASING', 'DOWN');
      expect(score).toBeGreaterThan(70);
    });

    it('should return score between 0 and 100', () => {
      const score = calculateRiskScore(2.5, 'STABLE', 'UP');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration', () => {
    it('should provide comprehensive summary', () => {
      const data = generateTestData(30);
      const result = calculatePredictionClouds(data, 'TEST');
      
      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('expectedRangePercent');
      expect(result.summary).toHaveProperty('trendDirection');
      expect(result.summary).toHaveProperty('volatilityAssessment');
      expect(result.summary).toHaveProperty('riskScore');
      
      expect(result.summary.expectedRangePercent).toBeGreaterThan(0);
      expect(['UP', 'DOWN', 'SIDEWAYS']).toContain(result.summary.trendDirection);
      expect(['LOW', 'MODERATE', 'HIGH', 'EXTREME']).toContain(result.summary.volatilityAssessment);
      expect(result.summary.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.riskScore).toBeLessThanOrEqual(100);
    });
  });
});
