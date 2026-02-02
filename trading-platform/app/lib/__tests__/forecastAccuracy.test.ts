/**
 * forecastAccuracy.test.ts
 * 
 * Comprehensive unit tests for ForecastAccuracyService
 * Tests accuracy calculation, confidence distribution, and performance metrics
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { forecastAccuracyService } from '../forecastAccuracy';
import { MockMarketDataGenerator } from './test-utils';
import type { Prediction } from '../forecastAccuracy';

describe('ForecastAccuracyService', () => {
  describe('calculateAccuracy', () => {
    it('should return empty metrics for empty predictions', () => {
      const metrics = forecastAccuracyService.calculateAccuracy([], []);

      expect(metrics.totalPredictions).toBe(0);
      expect(metrics.correctPredictions).toBe(0);
      expect(metrics.accuracy).toBe(0);
    });

    it('should calculate accuracy correctly with perfect predictions', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 85,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
      ];

      const actuals = [30100]; // Perfect prediction

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics.totalPredictions).toBe(1);
      expect(metrics.correctPredictions).toBe(1);
      expect(metrics.accuracy).toBe(100);
    });

    it('should calculate accuracy correctly with mixed predictions', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 85,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
        {
          symbol: '^N225',
          date: '2024-01-02',
          type: 'BUY',
          confidence: 75,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
      ];

      const actuals = [30100, 29800]; // 1 correct, 1 incorrect

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics.totalPredictions).toBe(2);
      expect(metrics.correctPredictions).toBe(1);
      expect(metrics.accuracy).toBe(50);
    });

    it('should calculate directional accuracy', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 85,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 29800,
          upper: 30200,
        },
        {
          symbol: '^N225',
          date: '2024-01-02',
          type: 'SELL',
          confidence: 75,
          predictedChange: -100,
          targetPrice: 29900,
          stopLoss: 30100,
          lower: 29800,
          upper: 30000,
        },
      ];

      const actuals = [30100, 29900]; // Both directionally correct

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics.directionalAccuracy).toBeGreaterThan(0);
    });

    it('should distribute confidence buckets correctly', () => {
      const predictions: Prediction[] = [];
      
      // Add predictions across different confidence levels
      for (let i = 0; i < 10; i++) {
        predictions.push({
          symbol: '^N225',
          date: `2024-01-${i + 1}`,
          type: 'BUY',
          confidence: 50 + i * 5, // 50, 55, 60, 65, 70, 75, 80, 85, 90, 95
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        });
      }

      const actuals = new Array(10).fill(30100);

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics.confidenceDistribution).toBeDefined();
      expect(Object.keys(metrics.confidenceDistribution).length).toBeGreaterThan(0);
    });

    it('should calculate average profit and loss', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 85,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
        {
          symbol: '^N225',
          date: '2024-01-02',
          type: 'BUY',
          confidence: 75,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
      ];

      const actuals = [30200, 29800]; // One profit, one loss

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(typeof metrics.averageProfit).toBe('number');
      expect(typeof metrics.averageLoss).toBe('number');
    });

    it('should calculate profit factor', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 85,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
      ];

      const actuals = [30100];

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics.profitFactor).toBeGreaterThanOrEqual(0);
    });

    it('should handle mismatched array lengths', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 85,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
        {
          symbol: '^N225',
          date: '2024-01-02',
          type: 'BUY',
          confidence: 75,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
      ];

      const actuals = [30100]; // Only 1 actual for 2 predictions

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics.totalPredictions).toBe(1); // Should use min length
    });
  });

  describe('calculateRealTimeAccuracy', () => {
    it('should calculate real-time accuracy with sliding window', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 50 });
      
      const signalGenerator = (_data: any[], _index: number) => ({
        type: 'BUY' as const,
        confidence: 85,
        predictedChange: 100,
        targetPrice: 30100,
        stopLoss: 29900,
        timestamp: new Date().toISOString(),
      });

      const metrics = forecastAccuracyService.calculateRealTimeAccuracy(
        '^N225',
        data,
        signalGenerator,
        20
      );

      expect(metrics).toBeDefined();
      expect(metrics.totalPredictions).toBeGreaterThanOrEqual(0);
    });

    it('should handle insufficient data', () => {
      const data = MockMarketDataGenerator.generateOHLCV({ count: 10 });
      
      const signalGenerator = () => null;

      const metrics = forecastAccuracyService.calculateRealTimeAccuracy(
        '^N225',
        data,
        signalGenerator
      );

      expect(metrics.totalPredictions).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle null predictions gracefully', () => {
      expect(() => {
        forecastAccuracyService.calculateAccuracy(null as any, []);
      }).toThrow();
    });

    it('should handle invalid confidence values', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 150, // Invalid, should be 0-100
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
      ];

      const actuals = [30100];

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      // Should handle gracefully
      expect(metrics).toBeDefined();
    });

    it('should handle negative actuals', () => {
      const predictions: Prediction[] = [
        {
          symbol: '^N225',
          date: '2024-01-01',
          type: 'BUY',
          confidence: 85,
          predictedChange: 100,
          targetPrice: 30100,
          stopLoss: 29900,
          lower: 30000,
          upper: 30200,
        },
      ];

      const actuals = [-100]; // Negative value

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate max drawdown', () => {
      const predictions: Prediction[] = Array.from({ length: 10 }, (_, i) => ({
        symbol: '^N225',
        date: `2024-01-${i + 1}`,
        type: 'BUY' as const,
        confidence: 85,
        predictedChange: 100,
        targetPrice: 30100,
        stopLoss: 29900,
        lower: 30000,
        upper: 30200,
      }));

      const actuals = [30100, 29800, 30200, 29700, 30300, 29600, 30400, 29500, 30500, 29400];

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(typeof metrics.maxDrawdown).toBe('number');
    });

    it('should show improving accuracy over time', () => {
      // First half: bad predictions, second half: good predictions
      const predictions: Prediction[] = Array.from({ length: 20 }, (_, i) => ({
        symbol: '^N225',
        date: `2024-01-${i + 1}`,
        type: 'BUY' as const,
        confidence: 85,
        predictedChange: 100,
        targetPrice: 30100,
        stopLoss: 29900,
        lower: 30000,
        upper: 30200,
      }));

      const actuals = [
        ...Array(10).fill(29800), // Bad predictions
        ...Array(10).fill(30100), // Good predictions
      ];

      const metrics = forecastAccuracyService.calculateAccuracy(predictions, actuals);

      expect(metrics.accuracy).toBeGreaterThan(0);
      expect(metrics.accuracy).toBeLessThan(100);
    });
  });
});
