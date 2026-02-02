/**
 * Tests for Prediction Quality Monitor
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PredictionQualityMonitor } from '../PredictionQualityMonitor';
import { ModelPredictionResult } from '../types';

describe('PredictionQualityMonitor', () => {
  let monitor: PredictionQualityMonitor;

  beforeEach(() => {
    monitor = new PredictionQualityMonitor();
  });

  const createMockPrediction = (predicted: number): ModelPredictionResult => ({
    prediction: predicted,
    confidence: 75,
    uncertainty: 0.1,
    predictionInterval: {
      lower: predicted - 2,
      upper: predicted + 2,
    },
    contributingFeatures: [],
  });

  describe('Recording Predictions', () => {
    it('should record a prediction', () => {
      const prediction = createMockPrediction(105);
      const id = monitor.recordPrediction('AAPL', prediction, 'v1.0');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toContain('AAPL');
    });

    it('should update prediction with actual value', () => {
      const prediction = createMockPrediction(105);
      const id = monitor.recordPrediction('AAPL', prediction, 'v1.0');

      monitor.updateActual(id, 107);

      // Should not throw and should update successfully
      expect(() => monitor.updateActual(id, 107)).not.toThrow();
    });

    it('should handle updating non-existent prediction', () => {
      // Should not throw, just warn
      expect(() => monitor.updateActual('non-existent', 100)).not.toThrow();
    });
  });

  describe('Accuracy Metrics', () => {
    it('should calculate accuracy', () => {
      const modelVersion = 'v1.0';

      // Record predictions with actuals
      for (let i = 0; i < 50; i++) {
        const predicted = 100 + i;
        const actual = 100 + i + (Math.random() > 0.5 ? 1 : -1);
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const accuracy = monitor.getAccuracy(modelVersion);
      
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(100);
    });

    it('should calculate MAE', () => {
      const modelVersion = 'v1.0';

      for (let i = 0; i < 20; i++) {
        const predicted = 100 + i;
        const actual = 100 + i + Math.random() * 5;
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const mae = monitor.getMAE(modelVersion);
      
      expect(mae).toBeGreaterThanOrEqual(0);
      expect(mae).toBeLessThan(10);
    });

    it('should calculate MSE and RMSE', () => {
      const modelVersion = 'v1.0';

      for (let i = 0; i < 20; i++) {
        const predicted = 100;
        const actual = 100 + Math.random() * 10 - 5;
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const mse = monitor.getMSE(modelVersion);
      const rmse = monitor.getRMSE(modelVersion);
      
      expect(mse).toBeGreaterThanOrEqual(0);
      expect(rmse).toBeGreaterThanOrEqual(0);
      expect(rmse).toBe(Math.sqrt(mse));
    });

    it('should calculate MAPE', () => {
      const modelVersion = 'v1.0';

      for (let i = 0; i < 20; i++) {
        const predicted = 100 + i * 5;
        const actual = 100 + i * 5 + Math.random() * 10;
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const mape = monitor.getMAPE(modelVersion);
      
      expect(mape).toBeGreaterThanOrEqual(0);
      expect(mape).toBeLessThan(100);
    });

    it('should calculate R² Score', () => {
      const modelVersion = 'v1.0';

      // Create predictions with some correlation
      for (let i = 0; i < 30; i++) {
        const predicted = 100 + i * 2;
        const actual = 100 + i * 2 + Math.random() * 3;
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const r2 = monitor.getR2Score(modelVersion);
      
      expect(r2).toBeGreaterThanOrEqual(-1);
      expect(r2).toBeLessThanOrEqual(1);
    });
  });

  describe('Model Drift Detection', () => {
    it('should detect model drift', () => {
      const modelVersion = 'v1.0';

      // Good historical performance
      for (let i = 0; i < 400; i++) {
        const predicted = 100 + i;
        const actual = 100 + i + Math.random() * 2; // Small error
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      // Poor recent performance (drift)
      for (let i = 400; i < 450; i++) {
        const predicted = 100 + i;
        const actual = 100 + i + Math.random() * 20; // Large error
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const drift = monitor.detectDrift(modelVersion);
      
      expect(drift).toBeDefined();
      expect(drift.isDrifting).toBe(true);
      expect(drift.driftScore).toBeGreaterThan(0);
      expect(drift.recommendation).toBeDefined();
      expect(drift.recommendation).toContain('drift');
    });

    it('should not detect drift with stable performance', () => {
      const modelVersion = 'v1.0';

      // Consistent performance
      for (let i = 0; i < 100; i++) {
        const predicted = 100 + i;
        const actual = 100 + i + Math.random() * 2;
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const drift = monitor.detectDrift(modelVersion);
      
      expect(drift.isDrifting).toBe(false);
      expect(drift.driftScore).toBeLessThan(0.15);
    });
  });

  describe('Calibration', () => {
    it('should calculate prediction calibration', () => {
      const modelVersion = 'v1.0';

      // Create predictions with varying confidence
      for (let conf = 50; conf < 100; conf += 5) {
        for (let i = 0; i < 10; i++) {
          const isCorrect = Math.random() * 100 < conf;
          const predicted = 100;
          const actual = isCorrect ? 100 : 110;
          
          const prediction: ModelPredictionResult = {
            prediction: predicted,
            confidence: conf,
            uncertainty: 0.1,
            predictionInterval: { lower: 98, upper: 102 },
            contributingFeatures: [],
          };
          
          const id = monitor.recordPrediction('TEST', prediction, modelVersion);
          monitor.updateActual(id, actual);
        }
      }

      const calibration = monitor.getCalibration(modelVersion);
      
      expect(calibration).toBeDefined();
      expect(calibration.calibrationError).toBeGreaterThanOrEqual(0);
      expect(calibration.bins).toBeDefined();
      expect(Array.isArray(calibration.bins)).toBe(true);
      expect(calibration.bins.length).toBeGreaterThan(0);

      calibration.bins.forEach(bin => {
        expect(bin.confidence).toBeGreaterThanOrEqual(0);
        expect(bin.confidence).toBeLessThanOrEqual(100);
        expect(bin.accuracy).toBeGreaterThanOrEqual(0);
        expect(bin.accuracy).toBeLessThanOrEqual(100);
        expect(bin.count).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Report', () => {
    it('should generate comprehensive performance report', () => {
      const modelVersion = 'v1.0';

      // Add some predictions
      for (let i = 0; i < 50; i++) {
        const predicted = 100 + i;
        const actual = 100 + i + Math.random() * 5;
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const report = monitor.generateReport(modelVersion);
      
      expect(report).toBeDefined();
      expect(report.accuracy).toBeDefined();
      expect(report.mae).toBeDefined();
      expect(report.mse).toBeDefined();
      expect(report.rmse).toBeDefined();
      expect(report.mape).toBeDefined();
      expect(report.r2Score).toBeDefined();
      expect(report.drift).toBeDefined();
      expect(report.calibration).toBeDefined();
      expect(report.totalPredictions).toBe(50);
      expect(report.recentPredictions).toBeGreaterThan(0);
    });
  });

  describe('Data Export', () => {
    it('should export predictions', () => {
      const modelVersion = 'v1.0';

      // Add predictions
      for (let i = 0; i < 10; i++) {
        const prediction = createMockPrediction(100 + i);
        monitor.recordPrediction('TEST', prediction, modelVersion);
      }

      const exported = monitor.exportPredictions(modelVersion);
      
      expect(exported).toBeDefined();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBe(10);
      
      exported.forEach(pred => {
        expect(pred.id).toBeDefined();
        expect(pred.timestamp).toBeDefined();
        expect(pred.symbol).toBe('TEST');
        expect(pred.predicted).toBeDefined();
        expect(pred.modelVersion).toBe(modelVersion);
      });
    });

    it('should export all predictions when version not specified', () => {
      // Add predictions for multiple versions
      const prediction1 = createMockPrediction(100);
      monitor.recordPrediction('TEST', prediction1, 'v1.0');
      
      const prediction2 = createMockPrediction(105);
      monitor.recordPrediction('TEST', prediction2, 'v2.0');

      const exported = monitor.exportPredictions();
      
      expect(exported.length).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old predictions', () => {
      const modelVersion = 'v1.0';

      // Add many predictions
      for (let i = 0; i < 1500; i++) {
        const prediction = createMockPrediction(100);
        monitor.recordPrediction('TEST', prediction, modelVersion);
      }

      monitor.cleanup();

      const exported = monitor.exportPredictions(modelVersion);
      expect(exported.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Window Size', () => {
    it('should respect custom window size for metrics', () => {
      const modelVersion = 'v1.0';

      for (let i = 0; i < 200; i++) {
        const predicted = 100;
        const actual = 100 + Math.random() * 5;
        
        const prediction = createMockPrediction(predicted);
        const id = monitor.recordPrediction('TEST', prediction, modelVersion);
        monitor.updateActual(id, actual);
      }

      const mae50 = monitor.getMAE(modelVersion, 50);
      const mae100 = monitor.getMAE(modelVersion, 100);

      // Different window sizes may give different results
      expect(mae50).toBeDefined();
      expect(mae100).toBeDefined();
      expect(mae50).toBeGreaterThanOrEqual(0);
      expect(mae100).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero predictions gracefully', () => {
      const modelVersion = 'v1.0';

      const accuracy = monitor.getAccuracy(modelVersion);
      const mae = monitor.getMAE(modelVersion);
      
      expect(accuracy).toBe(0);
      expect(mae).toBe(0);
    });

    it('should handle predictions without actuals', () => {
      const modelVersion = 'v1.0';

      // Record predictions without updating actuals
      for (let i = 0; i < 10; i++) {
        const prediction = createMockPrediction(100);
        monitor.recordPrediction('TEST', prediction, modelVersion);
      }

      const mae = monitor.getMAE(modelVersion);
      expect(mae).toBe(0);
    });
  });
});
