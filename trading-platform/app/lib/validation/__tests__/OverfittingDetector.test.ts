/**
 * OverfittingDetector.test.ts
 * 
 * Tests for overfitting detection system
 */

import { OverfittingDetector } from '../OverfittingDetector';
import type { ValidationConfig } from '../types';

describe('OverfittingDetector', () => {
  const sampleData = Array.from({ length: 100 }, (_, i) => ({
    value: i,
    timestamp: `2024-01-${String(i + 1).padStart(2, '0')}`
  }));

  describe('Data Splitting', () => {
    it('should split data correctly with default ratios', () => {
      const detector = new OverfittingDetector();
      const split = detector.splitData(sampleData);

      expect(split.train.data.length).toBe(60); // 60%
      expect(split.validation.data.length).toBe(20); // 20%
      expect(split.test.data.length).toBe(20); // 20%
    });

    it('should split data with custom ratios', () => {
      const config: Partial<ValidationConfig> = {
        trainRatio: 0.7,
        validationRatio: 0.15,
        testRatio: 0.15
      };
      
      const detector = new OverfittingDetector(config);
      const split = detector.splitData(sampleData);

      expect(split.train.data.length).toBe(70);
      expect(split.validation.data.length).toBe(15);
      expect(split.test.data.length).toBe(15);
    });

    it('should maintain temporal order with time series split', () => {
      const config: Partial<ValidationConfig> = {
        timeSeriesSplit: true
      };
      
      const detector = new OverfittingDetector(config);
      const split = detector.splitData(sampleData);

      // Check that data is in order
      for (let i = 1; i < split.train.data.length; i++) {
        expect(split.train.data[i].value).toBeGreaterThan(split.train.data[i - 1].value);
      }
      
      // Validation should start after train
      expect(split.validation.data[0].value).toBeGreaterThan(
        split.train.data[split.train.data.length - 1].value
      );
    });

    it('should apply purge gap between splits', () => {
      const config: Partial<ValidationConfig> = {
        timeSeriesSplit: true,
        purgeGap: 5
      };
      
      const detector = new OverfittingDetector(config);
      const split = detector.splitData(sampleData);

      // Gap between train and validation
      const trainEnd = split.train.data[split.train.data.length - 1].value;
      const valStart = split.validation.data[0].value;
      expect(valStart - trainEnd).toBeGreaterThanOrEqual(5);
    });

    it('should throw error if ratios do not sum to 1', () => {
      const config: Partial<ValidationConfig> = {
        trainRatio: 0.5,
        validationRatio: 0.3,
        testRatio: 0.1 // Sums to 0.9
      };
      
      expect(() => new OverfittingDetector(config)).toThrow();
    });
  });

  describe('Performance Degradation Test', () => {
    it('should detect no overfitting when performance is consistent', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 0.8;
      const validationScore = 0.78;
      const testScore = 0.76;

      const evaluateFunction = async () => 0.8;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.tests.performanceDegradation.passed).toBe(true);
      expect(analysis.tests.performanceDegradation.severity).toBe('none');
    });

    it('should detect severe overfitting with large degradation', async () => {
      const detector = new OverfittingDetector({
        degradationThreshold: 0.2
      });
      
      const trainScore = 1.0;
      const validationScore = 0.5;
      const testScore = 0.4;

      const evaluateFunction = async () => 1.0;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.tests.performanceDegradation.passed).toBe(false);
      expect(analysis.tests.performanceDegradation.severity).toBe('severe');
      expect(analysis.isOverfit).toBe(true);
    });

    it('should calculate degradation correctly', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 1.0;
      const validationScore = 0.8;
      const testScore = 0.7;

      const evaluateFunction = async () => 1.0;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      const degradation = analysis.tests.performanceDegradation.trainToTestDegradation;
      expect(degradation).toBeCloseTo(0.3, 2); // (1.0 - 0.7) / 1.0 = 0.3
    });
  });

  describe('Statistical Significance Test', () => {
    it('should detect statistical significance', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 1.0;
      const validationScore = 0.9;
      const testScore = 0.85;

      const evaluateFunction = async () => 1.0;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.tests.statisticalSignificance.pValue).toBeDefined();
      expect(analysis.tests.statisticalSignificance.effectSize).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
    });

    it('should flag large effect sizes', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 2.0;
      const validationScore = 1.0;
      const testScore = 0.5;

      const evaluateFunction = async () => 2.0;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(Math.abs(analysis.tests.statisticalSignificance.effectSize)).toBeGreaterThan(0);
    });
  });

  describe('White Noise Test', () => {
    it('should detect autocorrelation in similar scores', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 0.8;
      const validationScore = 0.81;
      const testScore = 0.79;

      const evaluateFunction = async () => 0.8;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.tests.whiteNoiseCheck.pValue).toBeDefined();
      expect(analysis.tests.whiteNoiseCheck.passed).toBe(false);
    });
  });

  describe('Parameter Sensitivity Test', () => {
    it('should detect stable parameters', async () => {
      const detector = new OverfittingDetector();
      const parameters = { param1: 10, param2: 5 };
      
      // Function that is insensitive to parameter changes
      const evaluateFunction = async () => 1.0;

      const analysis = await detector.detectOverfitting(
        1.0,
        0.95,
        0.9,
        parameters,
        evaluateFunction
      );

      expect(analysis.tests.parameterSensitivity.passed).toBe(true);
      expect(analysis.tests.parameterSensitivity.avgSensitivity).toBeLessThan(0.15);
    });

    it('should detect unstable parameters', async () => {
      const detector = new OverfittingDetector();
      const parameters = { param1: 10, param2: 5 };
      
      // Function that is very sensitive to param1
      const evaluateFunction = async (params: Record<string, number | string>) => {
        const p1 = params.param1 as number;
        return p1 === 10 ? 1.0 : 0.1;
      };

      const analysis = await detector.detectOverfitting(
        1.0,
        0.9,
        0.85,
        parameters,
        evaluateFunction
      );

      expect(analysis.tests.parameterSensitivity.unstableParameters.length).toBeGreaterThan(0);
    });
  });

  describe('Overfitting Score Calculation', () => {
    it('should calculate overall overfitting score', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 1.0;
      const validationScore = 0.8;
      const testScore = 0.7;

      const evaluateFunction = async () => 1.0;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.overfittingScore).toBeDefined();
      expect(analysis.overfittingScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overfittingScore).toBeLessThanOrEqual(1);
    });

    it('should have low overfitting score for good models', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 0.8;
      const validationScore = 0.78;
      const testScore = 0.76;

      const evaluateFunction = async () => 0.8;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.overfittingScore).toBeLessThan(0.3);
    });

    it('should have high overfitting score for overfit models', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 1.0;
      const validationScore = 0.5;
      const testScore = 0.4;

      const evaluateFunction = async () => 1.0;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.overfittingScore).toBeGreaterThan(0.3);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations for overfit models', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 1.0;
      const validationScore = 0.6;
      const testScore = 0.5;

      const evaluateFunction = async () => 1.0;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.isOverfit).toBe(true);
    });

    it('should provide recommendations for good models with low variance', async () => {
      const detector = new OverfittingDetector();
      const trainScore = 0.8;
      const validationScore = 0.78;
      const testScore = 0.76;

      const evaluateFunction = async () => 0.8;

      const analysis = await detector.detectOverfitting(
        trainScore,
        validationScore,
        testScore,
        { param1: 1 },
        evaluateFunction
      );

      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Parameter Stability Analysis', () => {
    it('should analyze parameter stability', async () => {
      const detector = new OverfittingDetector();
      const parameters = { param1: 10, param2: 5 };
      
      const evaluateFunction = async (params: Record<string, number | string>) => {
        const p1 = params.param1 as number;
        return 1.0 - Math.abs(p1 - 10) / 20;
      };

      const stabilities = await detector.analyzeParameterStability(parameters, evaluateFunction);

      expect(stabilities).toBeDefined();
      expect(stabilities.length).toBe(2);
      
      stabilities.forEach(s => {
        expect(s.parameter).toBeDefined();
        expect(s.optimalValue).toBeDefined();
        expect(s.sensitivity).toBeDefined();
        expect(s.robustRange).toBeDefined();
        expect(s.isStable).toBeDefined();
      });
    });
  });
});
