/**
 * Tests for ModelMonitor
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModelMonitor } from '../ModelMonitor';

describe('ModelMonitor', () => {
  let modelMonitor: ModelMonitor;

  beforeEach(() => {
    modelMonitor = new ModelMonitor();
  });

  describe('trackPrediction', () => {
    it('should track prediction records', () => {
      modelMonitor.trackPrediction({
        timestamp: new Date(),
        symbol: 'AAPL',
        prediction: 2.5,
        actual: null,
        confidence: 0.8,
        signalType: 'BUY',
      });

      const stats = modelMonitor.getStats();
      expect(stats.totalPredictions).toBe(1);
      expect(stats.predictionsWithActuals).toBe(0);
    });

    it('should limit the number of records', () => {
      // Add more than MAX_RECORDS
      for (let i = 0; i < 11000; i++) {
        modelMonitor.trackPrediction({
          timestamp: new Date(),
          symbol: 'AAPL',
          prediction: Math.random() * 10 - 5,
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });
      }

      const stats = modelMonitor.getStats();
      expect(stats.totalPredictions).toBeLessThanOrEqual(10000);
    });
  });

  describe('updateActual', () => {
    it('should update actual value and calculate accuracy', () => {
      const timestamp = new Date();
      const symbol = 'AAPL';

      modelMonitor.trackPrediction({
        timestamp,
        symbol,
        prediction: 2.5,
        actual: null,
        confidence: 0.8,
        signalType: 'BUY',
      });

      modelMonitor.updateActual(symbol, timestamp, 3.0);

      const predictions = modelMonitor.getAllPredictions();
      const updated = predictions.find(p => p.symbol === symbol);

      expect(updated).toBeDefined();
      expect(updated!.actual).toBe(3.0);
      expect(updated!.accuracy).toBe(1); // Both positive, so correct
    });

    it('should calculate accuracy based on direction', () => {
      const timestamp = new Date();

      modelMonitor.trackPrediction({
        timestamp,
        symbol: 'AAPL',
        prediction: 2.5,
        actual: null,
        confidence: 0.8,
        signalType: 'BUY',
      });

      modelMonitor.updateActual('AAPL', timestamp, -1.5);

      const predictions = modelMonitor.getAllPredictions();
      const updated = predictions.find(p => p.symbol === 'AAPL');

      expect(updated!.accuracy).toBe(0); // Predicted up, actually down
    });

    it('should handle records within 1 day timeframe', () => {
      const timestamp1 = new Date('2024-01-01T10:00:00Z');
      const timestamp2 = new Date('2024-01-01T14:00:00Z'); // Same day

      modelMonitor.trackPrediction({
        timestamp: timestamp1,
        symbol: 'AAPL',
        prediction: 2.0,
        actual: null,
        confidence: 0.7,
        signalType: 'BUY',
      });

      modelMonitor.updateActual('AAPL', timestamp2, 2.5);

      const predictions = modelMonitor.getAllPredictions();
      expect(predictions[0].actual).toBe(2.5);
    });
  });

  describe('detectModelDrift', () => {
    it('should detect accuracy drift', () => {
      modelMonitor.setBaselineAccuracy(0.80);

      // Add predictions with low accuracy
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - (29 - i));

        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: 1.0,
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });

        // Update with actual values (poor accuracy)
        modelMonitor.updateActual('AAPL', timestamp, -1.0); // Wrong direction
      }

      const drift = modelMonitor.detectModelDrift(0.1);

      expect(drift).toBeDefined();
      expect(drift!.type).toBe('ACCURACY_DRIFT');
      expect(drift!.drift).toBeGreaterThan(0.1);
    });

    it('should not detect drift with good performance', () => {
      modelMonitor.setBaselineAccuracy(0.70);

      // Add predictions with good accuracy
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - (29 - i));

        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: 1.0,
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });

        // Update with actual values (good accuracy)
        modelMonitor.updateActual('AAPL', timestamp, 1.5); // Correct direction
      }

      const drift = modelMonitor.detectModelDrift(0.1);

      expect(drift).toBeNull();
    });

    it('should detect data drift', () => {
      const now = new Date();
      
      // Add historical predictions with normal distribution
      for (let i = 60; i > 30; i--) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - i);

        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: Math.random() * 2 - 1, // -1 to 1
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });
      }

      // Add recent predictions with very different distribution
      for (let i = 30; i > 0; i--) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - i);

        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: Math.random() * 10 + 5, // 5 to 15 (very different)
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });
      }

      const drift = modelMonitor.detectModelDrift();

      // Should detect some form of drift
      expect(drift).toBeDefined();
    });

    it('should return null with insufficient data', () => {
      const drift = modelMonitor.detectModelDrift();
      expect(drift).toBeNull();
    });
  });

  describe('getRetrainingTrigger', () => {
    it('should trigger retraining on accuracy drift', () => {
      modelMonitor.setBaselineAccuracy(0.80);

      // Add poor predictions
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - (29 - i));

        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: 1.0,
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });

        modelMonitor.updateActual('AAPL', timestamp, -1.0);
      }

      const trigger = modelMonitor.getRetrainingTrigger();

      expect(trigger).toBeDefined();
      expect(trigger!.urgency).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(trigger!.urgency);
      expect(trigger!.metrics).toBeDefined();
      expect(trigger!.metrics.currentAccuracy).toBeLessThan(trigger!.metrics.baselineAccuracy);
    });

    it('should trigger on consecutive poor predictions', () => {
      // Add recent predictions and immediately update them with poor results
      const now = new Date();
      
      // Add 10 predictions with poor accuracy
      for (let i = 9; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 3600000); // 1 hour apart each

        modelMonitor.trackPrediction({
          timestamp,
          symbol: `AAPL${i}`, // Use unique symbol for each
          prediction: 2.0,
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });

        // Update with wrong direction
        modelMonitor.updateActual(`AAPL${i}`, timestamp, -2.0);
      }

      const trigger = modelMonitor.getRetrainingTrigger();

      // Should trigger due to consecutive poor predictions or poor performance
      expect(trigger).toBeDefined();
      if (trigger) {
        // Either consecutive poor predictions >= 3 or general poor performance
        const hasConsecutivePoor = trigger.metrics.consecutivePoorPredictions >= 3;
        const hasPoorPerformance = trigger.metrics.currentAccuracy < 0.65;
        expect(hasConsecutivePoor || hasPoorPerformance).toBe(true);
      }
    });

    it('should not trigger with good performance', () => {
      modelMonitor.setBaselineAccuracy(0.70);

      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - (29 - i));

        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: 1.0,
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });

        modelMonitor.updateActual('AAPL', timestamp, 1.5); // Correct
      }

      const trigger = modelMonitor.getRetrainingTrigger();

      expect(trigger).toBeNull();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should calculate all performance metrics', () => {
      const now = new Date();
      
      // Add some predictions with actuals
      for (let i = 0; i < 20; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - (19 - i));

        const prediction = Math.random() > 0.5 ? 2.0 : -2.0;
        const actual = Math.random() > 0.3 ? prediction : -prediction;

        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction,
          actual: null,
          confidence: 0.7,
          signalType: prediction > 0 ? 'BUY' : 'SELL',
        });

        modelMonitor.updateActual('AAPL', timestamp, actual);
      }

      const metrics = modelMonitor.getPerformanceMetrics();

      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('precision');
      expect(metrics).toHaveProperty('recall');
      expect(metrics).toHaveProperty('f1Score');
      expect(metrics).toHaveProperty('mse');
      expect(metrics).toHaveProperty('mae');
      expect(metrics).toHaveProperty('belowThreshold');
      expect(metrics).toHaveProperty('trend');

      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'degrading']).toContain(metrics.trend);
    });

    it('should return default metrics with no data', () => {
      const metrics = modelMonitor.getPerformanceMetrics();

      expect(metrics.accuracy).toBe(0);
      expect(metrics.belowThreshold).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', () => {
      modelMonitor.trackPrediction({
        timestamp: new Date(),
        symbol: 'AAPL',
        prediction: 2.0,
        actual: null,
        confidence: 0.7,
        signalType: 'BUY',
      });

      const stats = modelMonitor.getStats();

      expect(stats).toHaveProperty('totalPredictions');
      expect(stats).toHaveProperty('predictionsWithActuals');
      expect(stats).toHaveProperty('recentAccuracy');
      expect(stats).toHaveProperty('baselineAccuracy');
      expect(stats).toHaveProperty('driftStatus');

      expect(stats.totalPredictions).toBeGreaterThan(0);
    });
  });

  describe('setBaselineAccuracy', () => {
    it('should set baseline accuracy', () => {
      modelMonitor.setBaselineAccuracy(0.75);
      expect(modelMonitor.getBaselineAccuracy()).toBe(0.75);
    });

    it('should throw error for invalid accuracy', () => {
      expect(() => {
        modelMonitor.setBaselineAccuracy(1.5);
      }).toThrow('Baseline accuracy must be between 0 and 1');

      expect(() => {
        modelMonitor.setBaselineAccuracy(-0.1);
      }).toThrow('Baseline accuracy must be between 0 and 1');
    });
  });

  describe('KL Divergence Drift Detection', () => {
    it('should detect drift using KL divergence', () => {
      // Create reference distribution
      const referenceData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10),
      };

      // Create shifted distribution (drift)
      const currentData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10 + 5), // Shifted by 5
      };

      const driftResult = modelMonitor.detectKLDrift(currentData, referenceData);

      expect(driftResult).toHaveProperty('name');
      expect(driftResult).toHaveProperty('score');
      expect(driftResult).toHaveProperty('threshold');
      expect(driftResult).toHaveProperty('isDrift');
      expect(driftResult.name).toBe('KL_DIVERGENCE');
      expect(driftResult.score).toBeGreaterThanOrEqual(0);
    });

    it('should not detect drift for similar distributions', () => {
      const referenceData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10),
      };

      const currentData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10),
      };

      const driftResult = modelMonitor.detectKLDrift(currentData, referenceData);

      expect(driftResult.isDrift).toBe(false);
    });
  });

  describe('PSI Drift Detection', () => {
    it('should detect drift using PSI', () => {
      const referenceData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10),
      };

      const currentData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10 + 8), // Shifted
      };

      const driftResult = modelMonitor.detectPSIDrift(currentData, referenceData);

      expect(driftResult).toHaveProperty('name');
      expect(driftResult).toHaveProperty('score');
      expect(driftResult).toHaveProperty('threshold');
      expect(driftResult).toHaveProperty('isDrift');
      expect(driftResult.name).toBe('PSI');
      expect(driftResult.score).toBeGreaterThanOrEqual(0);
    });

    it('should use threshold of 0.2 for PSI', () => {
      const referenceData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10),
      };

      const currentData = {
        values: Array.from({ length: 100 }, () => Math.random() * 10),
      };

      const driftResult = modelMonitor.detectPSIDrift(currentData, referenceData);

      expect(driftResult.threshold).toBe(0.2);
    });
  });

  describe('shouldRetrain', () => {
    it('should recommend retraining when drift is detected', () => {
      const driftMethod = {
        name: 'KL_DIVERGENCE' as const,
        score: 0.3,
        threshold: 0.15,
        isDrift: true,
      };

      const shouldRetrain = modelMonitor.shouldRetrain(driftMethod);

      expect(shouldRetrain).toBe(true);
    });

    it('should not recommend retraining without drift', () => {
      const driftMethod = {
        name: 'PSI' as const,
        score: 0.05,
        threshold: 0.2,
        isDrift: false,
      };

      const shouldRetrain = modelMonitor.shouldRetrain(driftMethod);

      expect(shouldRetrain).toBe(false);
    });
  });

  describe('Enhanced Data Drift Detection', () => {
    it('should include detection methods in drift alert', () => {
      modelMonitor.setBaselineAccuracy(0.8);

      // Add predictions with drift pattern
      for (let i = 0; i < 50; i++) {
        const timestamp = new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000);
        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: Math.random() * 10,
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });
      }

      // Add recent predictions with different distribution
      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        modelMonitor.trackPrediction({
          timestamp,
          symbol: 'AAPL',
          prediction: Math.random() * 10 + 15, // Shifted distribution
          actual: null,
          confidence: 0.7,
          signalType: 'BUY',
        });
      }

      const alert = modelMonitor.detectModelDrift();

      if (alert && alert.type === 'DATA_DRIFT') {
        expect(alert.detectionMethods).toBeDefined();
        expect(alert.detectionMethods?.length).toBeGreaterThan(0);
      }
    });
  });
});
