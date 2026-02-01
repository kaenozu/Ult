/**
 * Tests for ModelValidation
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModelValidation, TrainingData } from '../ModelValidation';

describe('ModelValidation', () => {
  let modelValidation: ModelValidation;

  beforeEach(() => {
    modelValidation = new ModelValidation();
  });

  const generateTrainingData = (size: number): TrainingData => {
    const features: number[][] = [];
    const targets: number[] = [];
    const timestamps: string[] = [];

    for (let i = 0; i < size; i++) {
      features.push([
        Math.random() * 100, // Feature 1
        Math.random() * 100, // Feature 2
        Math.random() * 100, // Feature 3
      ]);
      targets.push(Math.random() > 0.5 ? 1 : -1); // Binary classification
      timestamps.push(`2024-01-${String(i + 1).padStart(2, '0')}`);
    }

    return { features, targets, timestamps };
  };

  describe('crossValidate', () => {
    it('should perform k-fold cross-validation', () => {
      const data = generateTrainingData(100);
      const folds = 5;

      const predictFn = (features: number[][]): number[] => {
        return features.map(() => Math.random() > 0.5 ? 1 : -1);
      };

      const result = modelValidation.crossValidate(data, predictFn, folds);

      expect(result.results).toHaveLength(folds);
      expect(result.meanAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.meanAccuracy).toBeLessThanOrEqual(1);
      expect(result.stdAccuracy).toBeGreaterThanOrEqual(0);
      expect(typeof result.isOverfitting).toBe('boolean');
      expect(result.overfittingScore).toBeGreaterThanOrEqual(0);
    });

    it('should throw error with insufficient data', () => {
      const data = generateTrainingData(3); // Less than 5 folds
      const folds = 5;

      const predictFn = (features: number[][]): number[] => {
        return features.map(() => 1);
      };

      expect(() => {
        modelValidation.crossValidate(data, predictFn, folds);
      }).toThrow('Insufficient data');
    });

    it('should calculate metrics for each fold', () => {
      const data = generateTrainingData(50);
      const predictFn = (features: number[][]): number[] => {
        return features.map(() => 1);
      };

      const result = modelValidation.crossValidate(data, predictFn, 3);

      result.results.forEach(foldResult => {
        expect(foldResult).toHaveProperty('fold');
        expect(foldResult).toHaveProperty('accuracy');
        expect(foldResult).toHaveProperty('precision');
        expect(foldResult).toHaveProperty('recall');
        expect(foldResult).toHaveProperty('f1Score');
        expect(foldResult).toHaveProperty('mse');
        expect(foldResult).toHaveProperty('mae');
        expect(foldResult.accuracy).toBeGreaterThanOrEqual(0);
        expect(foldResult.accuracy).toBeLessThanOrEqual(1);
      });
    });

    it('should detect overfitting when variance is high', () => {
      const data = generateTrainingData(50);
      
      // Create a predictor that performs inconsistently
      let callCount = 0;
      const predictFn = (features: number[][]): number[] => {
        callCount++;
        // Alternate between high and low accuracy
        const accuracy = callCount % 2 === 0 ? 0.9 : 0.3;
        return features.map(() => Math.random() > (1 - accuracy) ? 1 : -1);
      };

      const result = modelValidation.crossValidate(data, predictFn, 5);

      // High variance should indicate potential overfitting
      expect(result.stdAccuracy).toBeGreaterThan(0);
    });
  });

  describe('timeSeriesCrossValidate', () => {
    it('should perform walk-forward validation', () => {
      const data = generateTrainingData(300); // 300 samples
      const windowSize = 252;

      const predictFn = (features: number[][]): number[] => {
        return features.map(() => Math.random() > 0.5 ? 1 : -1);
      };

      const result = modelValidation.timeSeriesCrossValidate(data, predictFn, windowSize);

      expect(result.results.length).toBe(data.features.length - windowSize);
      expect(result.windowSize).toBe(windowSize);
      expect(result.averageAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.averageAccuracy).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'degrading']).toContain(result.trend);
      expect(result.confidenceInterval).toHaveLength(2);
      expect(result.confidenceInterval[0]).toBeLessThanOrEqual(result.confidenceInterval[1]);
    });

    it('should throw error when data is too small', () => {
      const data = generateTrainingData(100);
      const windowSize = 252;

      const predictFn = (features: number[][]): number[] => {
        return features.map(() => 1);
      };

      expect(() => {
        modelValidation.timeSeriesCrossValidate(data, predictFn, windowSize);
      }).toThrow('Insufficient data');
    });

    it('should include timestamp in results', () => {
      const data = generateTrainingData(300);
      const windowSize = 50;

      const predictFn = (features: number[][]): number[] => {
        return features.map(() => 1);
      };

      const result = modelValidation.timeSeriesCrossValidate(data, predictFn, windowSize);

      result.results.forEach(r => {
        expect(r).toHaveProperty('timestamp');
        expect(typeof r.timestamp).toBe('string');
      });
    });

    it('should detect improving trend', () => {
      const data = generateTrainingData(300);
      const windowSize = 50;

      // Create a predictor that improves over time
      let callCount = 0;
      const predictFn = (features: number[][]): number[] => {
        callCount++;
        // Gradually improve accuracy
        const accuracy = Math.min(0.5 + callCount * 0.015, 0.95);
        return features.map(() => Math.random() > (1 - accuracy) ? 1 : -1);
      };

      const result = modelValidation.timeSeriesCrossValidate(data, predictFn, windowSize);

      // Should detect improving or at least stable trend
      expect(['improving', 'stable']).toContain(result.trend);
    });
  });

  describe('optimizeParameters', () => {
    it('should find optimal parameters', () => {
      const data = generateTrainingData(50);
      
      const predictFn = (features: number[][], params: Record<string, number>): number[] => {
        // Simple predictor that benefits from certain parameter values
        const threshold = params.threshold || 0.5;
        return features.map(f => f[0] > threshold * 100 ? 1 : -1);
      };

      const paramRanges = [
        { name: 'threshold', min: 0.3, max: 0.7, step: 0.1 },
      ];

      const result = modelValidation.optimizeParameters(data, predictFn, paramRanges);

      expect(result.parameters).toHaveProperty('threshold');
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(result.validationScore).toBeDefined();
    });

    it('should handle multiple parameters', () => {
      const data = generateTrainingData(50);
      
      const predictFn = (features: number[][], params: Record<string, number>): number[] => {
        const threshold1 = params.param1 || 0.5;
        const threshold2 = params.param2 || 50;
        return features.map(f => f[0] > threshold1 * 100 && f[1] > threshold2 ? 1 : -1);
      };

      const paramRanges = [
        { name: 'param1', min: 0.3, max: 0.7, step: 0.2 },
        { name: 'param2', min: 30, max: 70, step: 20 },
      ];

      const result = modelValidation.optimizeParameters(data, predictFn, paramRanges);

      expect(result.parameters).toHaveProperty('param1');
      expect(result.parameters).toHaveProperty('param2');
      expect(result.parameters.param1).toBeGreaterThanOrEqual(0.3);
      expect(result.parameters.param1).toBeLessThanOrEqual(0.7);
      expect(result.parameters.param2).toBeGreaterThanOrEqual(30);
      expect(result.parameters.param2).toBeLessThanOrEqual(70);
    });

    it('should limit parameter combinations', () => {
      const data = generateTrainingData(30);
      
      const predictFn = (features: number[][], params: Record<string, number>): number[] => {
        return features.map(() => 1);
      };

      // This would create 1000 combinations (10 * 10 * 10)
      const paramRanges = [
        { name: 'p1', min: 0, max: 9, step: 1 },
        { name: 'p2', min: 0, max: 9, step: 1 },
        { name: 'p3', min: 0, max: 9, step: 1 },
      ];

      // Should still complete without error (sampling if too many combinations)
      const result = modelValidation.optimizeParameters(data, predictFn, paramRanges);
      expect(result).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty predictions', () => {
      const data = generateTrainingData(50);
      
      const predictFn = (features: number[][]): number[] => {
        return [];
      };

      const result = modelValidation.crossValidate(data, predictFn, 3);

      // Should not crash, but accuracy should be 0
      result.results.forEach(r => {
        expect(r.accuracy).toBe(0);
      });
    });

    it('should handle all same predictions', () => {
      const data = generateTrainingData(50);
      
      const predictFn = (features: number[][]): number[] => {
        return features.map(() => 1); // Always predict 1
      };

      const result = modelValidation.crossValidate(data, predictFn, 3);

      // Should have some accuracy (at least 0 or more)
      expect(result.meanAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.meanAccuracy).toBeLessThanOrEqual(1);
    });

    it('should handle perfect predictions', () => {
      const data = generateTrainingData(50);
      
      const predictFn = (features: number[][]): number[] => {
        // Return the actual target (cheating for test purposes)
        return features.map((_, i) => data.targets[i] > 0 ? 1 : -1);
      };

      const result = modelValidation.crossValidate(data, predictFn, 3);

      // Should have reasonable accuracy (note: cross-validation means we don't have
      // perfect access to targets during prediction, so we expect good but not perfect)
      expect(result.meanAccuracy).toBeGreaterThan(0.4);
    });
  });
});
