/**
 * Unit tests for StatisticalDetector
 */

import { StatisticalDetector } from '../StatisticalDetector';
import { MarketData } from '../types';

describe('StatisticalDetector', () => {
  let detector: StatisticalDetector;

  beforeEach(() => {
    detector = new StatisticalDetector({
      zScoreThreshold: 3.0,
      iqrMultiplier: 1.5,
      windowSize: 20,
    });
  });

  describe('detect', () => {
    it('should return no anomaly for insufficient data', () => {
      const marketData: MarketData = {
        symbol: 'TEST',
        timestamp: new Date(),
        ohlcv: [
          { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        ],
        recentHistory: [],
        volume: 1000,
        price: 102,
      };

      const result = detector.detect(marketData);

      expect(result.isAnomaly).toBe(false);
      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.details?.reason).toBe('Insufficient data');
    });

    it('should detect price anomaly with high z-score', () => {
      const ohlcv = Array.from({ length: 20 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100 + i * 0.5, // Gradual increase
        volume: 1000,
      }));

      // Add an anomalous data point
      ohlcv.push({
        date: '2024-01-21',
        open: 100,
        high: 200,
        low: 95,
        close: 180, // Huge spike
        volume: 1000,
      });

      const marketData: MarketData = {
        symbol: 'TEST',
        timestamp: new Date(),
        ohlcv,
        recentHistory: [],
        volume: 1000,
        price: 180,
      };

      const result = detector.detect(marketData);

      expect(result.isAnomaly).toBe(true);
      expect(result.score).toBeGreaterThan(3.0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.detectorName).toBe('Statistical');
    });

    it('should detect volume anomaly', () => {
      const ohlcv = Array.from({ length: 20 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000, // Consistent volume
      }));

      // Add anomalous volume
      ohlcv.push({
        date: '2024-01-21',
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 10000, // 10x normal volume
      });

      const marketData: MarketData = {
        symbol: 'TEST',
        timestamp: new Date(),
        ohlcv,
        recentHistory: [],
        volume: 10000,
        price: 100,
      };

      const result = detector.detect(marketData);

      expect(result.isAnomaly).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.details?.volumeZScore).toBeGreaterThan(3.0);
    });

    it('should not detect anomaly for normal data', () => {
      const ohlcv = Array.from({ length: 21 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100 + i * 0.1,
        high: 105 + i * 0.1,
        low: 95 + i * 0.1,
        close: 100 + i * 0.1, // Small, consistent changes
        volume: 1000 + i * 10,
      }));

      const marketData: MarketData = {
        symbol: 'TEST',
        timestamp: new Date(),
        ohlcv,
        recentHistory: [],
        volume: 1200,
        price: 102,
      };

      const result = detector.detect(marketData);

      expect(result.isAnomaly).toBe(false);
      expect(result.score).toBeLessThan(3.0);
    });

    it('should provide detailed z-scores in results', () => {
      const ohlcv = Array.from({ length: 21 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      }));

      const marketData: MarketData = {
        symbol: 'TEST',
        timestamp: new Date(),
        ohlcv,
        recentHistory: [],
        volume: 1000,
        price: 100,
      };

      const result = detector.detect(marketData);

      expect(result.details).toBeDefined();
      expect(result.details?.priceZScore).toBeDefined();
      expect(result.details?.volumeZScore).toBeDefined();
      expect(result.details?.changeZScore).toBeDefined();
      expect(result.details?.threshold).toBe(3.0);
    });
  });
});
