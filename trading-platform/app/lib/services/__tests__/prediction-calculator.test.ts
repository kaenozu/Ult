/**
 * Tests for PredictionCalculator
 * 
 * Tests the pure prediction logic extracted from MLModelService
 */

import { PredictionCalculator } from '../implementations/prediction-calculator';
import {
  createBaseFeatures,
  createBullishFeatures,
  createBearishFeatures,
  createExtremeFeatures
} from './fixtures/test-data-factory';

describe('PredictionCalculator', () => {
  let calculator: PredictionCalculator;

  beforeEach(() => {
    calculator = new PredictionCalculator();
  });

  describe('calculateRandomForest', () => {
    it('should return positive score for oversold RSI', () => {
      const features = createBaseFeatures({ rsi: 15 });
      const result = calculator.calculateRandomForest(features);
      expect(result).toBeGreaterThan(0);
    });

    it('should return negative score for overbought RSI', () => {
      const features = createBaseFeatures({ rsi: 85 });
      const result = calculator.calculateRandomForest(features);
      expect(result).toBeLessThan(0);
    });

    it('should incorporate positive SMA signals', () => {
      const positiveSMA = createBaseFeatures({ sma5: 5, sma20: 3 });
      const noSMA = createBaseFeatures({ sma5: 0, sma20: 0 });
      
      const positiveResult = calculator.calculateRandomForest(positiveSMA);
      const neutralResult = calculator.calculateRandomForest(noSMA);
      
      expect(positiveResult).toBeGreaterThan(neutralResult);
    });

    it('should respond to strong positive momentum', () => {
      const features = createBaseFeatures({ priceMomentum: 3 });
      const result = calculator.calculateRandomForest(features);
      expect(result).toBeGreaterThan(0);
    });

    it('should respond to strong negative momentum', () => {
      const features = createBaseFeatures({ priceMomentum: -3 });
      const result = calculator.calculateRandomForest(features);
      expect(result).toBeLessThan(0);
    });

    it('should return scaled value', () => {
      const features = createBullishFeatures();
      const result = calculator.calculateRandomForest(features);
      // Result should be scaled by 0.8
      expect(Math.abs(result)).toBeLessThan(10);
    });
  });

  describe('calculateXGBoost', () => {
    it('should handle extreme momentum values', () => {
      const features = createBaseFeatures({ priceMomentum: 100 });
      const result = calculator.calculateXGBoost(features);
      expect(result).toBeDefined();
      expect(isFinite(result)).toBe(true);
    });

    it('should return positive for bullish features', () => {
      const features = createBullishFeatures();
      const result = calculator.calculateXGBoost(features);
      expect(result).toBeGreaterThan(0);
    });

    it('should return negative for bearish features', () => {
      const features = createBearishFeatures();
      const result = calculator.calculateXGBoost(features);
      expect(result).toBeLessThan(0);
    });

    it('should scale predictions appropriately', () => {
      const features = createBaseFeatures({ priceMomentum: 3, sma5: 2, sma20: 1 });
      const result = calculator.calculateXGBoost(features);
      expect(Math.abs(result)).toBeLessThan(20);
    });
  });

  describe('calculateLSTM', () => {
    it('should be based on price momentum', () => {
      const positiveMomentum = createBaseFeatures({ priceMomentum: 5 });
      const negativeMomentum = createBaseFeatures({ priceMomentum: -5 });
      
      const positiveResult = calculator.calculateLSTM(positiveMomentum);
      const negativeResult = calculator.calculateLSTM(negativeMomentum);
      
      expect(positiveResult).toBeGreaterThan(0);
      expect(negativeResult).toBeLessThan(0);
    });

    it('should scale momentum appropriately', () => {
      const features = createBaseFeatures({ priceMomentum: 10 });
      const result = calculator.calculateLSTM(features);
      expect(Math.abs(result)).toBeLessThan(Math.abs(features.priceMomentum));
    });

    it('should return zero for zero momentum', () => {
      const features = createBaseFeatures({ priceMomentum: 0 });
      const result = calculator.calculateLSTM(features);
      expect(result).toBe(0);
    });
  });

  describe('calculateEnsemble', () => {
    it('should combine predictions with weights', () => {
      const weights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
      const rf = 1.0;
      const xgb = 2.0;
      const lstm = 3.0;
      
      const result = calculator.calculateEnsemble(rf, xgb, lstm, weights);
      const expected = rf * 0.35 + xgb * 0.35 + lstm * 0.30;
      
      expect(result).toBeCloseTo(expected, 5);
    });

    it('should verify weights sum to 1', () => {
      const weights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
      const sum = weights.RF + weights.XGB + weights.LSTM;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should handle negative predictions', () => {
      const weights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
      const result = calculator.calculateEnsemble(-1, -2, -3, weights);
      expect(result).toBeLessThan(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should return value between 50 and 95', () => {
      const features = createBaseFeatures();
      const result = calculator.calculateConfidence(features, 0);
      expect(result).toBeGreaterThanOrEqual(50);
      expect(result).toBeLessThanOrEqual(95);
    });

    it('should increase confidence for extreme RSI', () => {
      const extremeRSI = createBaseFeatures({ rsi: 10 });
      const normalRSI = createBaseFeatures({ rsi: 50 });
      
      const extremeResult = calculator.calculateConfidence(extremeRSI, 0);
      const normalResult = calculator.calculateConfidence(normalRSI, 0);
      
      expect(extremeResult).toBeGreaterThan(normalResult);
    });

    it('should increase confidence for strong momentum', () => {
      const strongMomentum = createBaseFeatures({ priceMomentum: 5 });
      const weakMomentum = createBaseFeatures({ priceMomentum: 0.5 });
      
      const strongResult = calculator.calculateConfidence(strongMomentum, 0);
      const weakResult = calculator.calculateConfidence(weakMomentum, 0);
      
      expect(strongResult).toBeGreaterThan(weakResult);
    });

    it('should increase confidence for large predictions', () => {
      const features = createBaseFeatures();
      const largePrediction = calculator.calculateConfidence(features, 5);
      const smallPrediction = calculator.calculateConfidence(features, 0.5);
      
      expect(largePrediction).toBeGreaterThan(smallPrediction);
    });

    it('should never exceed 95', () => {
      const extreme = createExtremeFeatures();
      const result = calculator.calculateConfidence(extreme, 100);
      expect(result).toBeLessThanOrEqual(95);
    });

    it('should never go below 50', () => {
      const features = createBaseFeatures();
      const result = calculator.calculateConfidence(features, 0);
      expect(result).toBeGreaterThanOrEqual(50);
    });
  });

  describe('edge cases', () => {
    it('should handle NaN in features gracefully', () => {
      const features = createBaseFeatures({ rsi: NaN, priceMomentum: NaN });
      
      // Should not throw
      expect(() => calculator.calculateRandomForest(features)).not.toThrow();
      expect(() => calculator.calculateXGBoost(features)).not.toThrow();
      expect(() => calculator.calculateLSTM(features)).not.toThrow();
    });

    it('should handle Infinity in momentum', () => {
      const features = createBaseFeatures({ priceMomentum: Infinity });
      const result = calculator.calculateLSTM(features);
      expect(result === Infinity || isFinite(result)).toBe(true);
    });

    it('should handle zero values', () => {
      const zeroFeatures = createBaseFeatures({
        rsi: 0,
        priceMomentum: 0,
        sma5: 0,
        sma20: 0
      });
      
      const rf = calculator.calculateRandomForest(zeroFeatures);
      const xgb = calculator.calculateXGBoost(zeroFeatures);
      const lstm = calculator.calculateLSTM(zeroFeatures);
      
      expect(rf).toBeDefined();
      expect(xgb).toBeDefined();
      expect(lstm).toBe(0);
    });
  });
});
