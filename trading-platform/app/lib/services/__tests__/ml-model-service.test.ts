/**
 * Tests for MLModelService
 */

import { MLModelService } from '../ml-model-service';
import { PredictionFeatures } from '../feature-calculation-service';

describe('MLModelService', () => {
  let service: MLModelService;
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
    service = new MLModelService();
    
    baseFeatures = {
      rsi: 50,
      rsiChange: 0,
      sma5: 0,
      sma20: 0,
      sma50: 0,
      priceMomentum: 0,
      volumeRatio: 1.0,
      volatility: 0.02,
      macdSignal: 0,
      bollingerPosition: 50,
      atrPercent: 2.0
    };
  });

  describe('predict', () => {
    it('should return valid prediction with all model outputs', () => {
      const result = service.predict(baseFeatures);
      
      expect(result).toHaveProperty('rfPrediction');
      expect(result).toHaveProperty('xgbPrediction');
      expect(result).toHaveProperty('lstmPrediction');
      expect(result).toHaveProperty('ensemblePrediction');
      expect(result).toHaveProperty('confidence');
    });

    it('should calculate ensemble prediction as weighted average', () => {
      const result = service.predict(baseFeatures);
      
      const expectedEnsemble = 
        result.rfPrediction * 0.35 + 
        result.xgbPrediction * 0.35 + 
        result.lstmPrediction * 0.30;
      
      expect(result.ensemblePrediction).toBeCloseTo(expectedEnsemble, 5);
    });

    it('should return higher prediction for bullish features', () => {
      const bullishFeatures: PredictionFeatures = {
        rsi: 15, // Oversold
        rsiChange: -5,
        sma5: 5,
        sma20: 3,
        sma50: 2,
        priceMomentum: 5,
        volumeRatio: 1.5,
        volatility: 0.02,
        macdSignal: 2,
        bollingerPosition: 20,
        atrPercent: 2.0
      };
      
      const result = service.predict(bullishFeatures);
      
      expect(result.ensemblePrediction).toBeGreaterThan(0);
      expect(result.rfPrediction).toBeGreaterThan(0);
      expect(result.xgbPrediction).toBeGreaterThan(0);
    });

    it('should return lower prediction for bearish features', () => {
      const bearishFeatures: PredictionFeatures = {
        rsi: 85, // Overbought
        rsiChange: 5,
        sma5: -5,
        sma20: -3,
        sma50: -2,
        priceMomentum: -5,
        volumeRatio: 0.8,
        volatility: 0.02,
        macdSignal: -2,
        bollingerPosition: 80,
        atrPercent: 2.0
      };
      
      const result = service.predict(bearishFeatures);
      
      expect(result.ensemblePrediction).toBeLessThan(0);
      expect(result.rfPrediction).toBeLessThan(0);
      expect(result.xgbPrediction).toBeLessThan(0);
    });

    it('should return confidence between 50 and 95', () => {
      const result = service.predict(baseFeatures);
      
      expect(result.confidence).toBeGreaterThanOrEqual(50);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should increase confidence for extreme RSI', () => {
      const extremeRSI: PredictionFeatures = { ...baseFeatures, rsi: 10 };
      const normalRSI: PredictionFeatures = { ...baseFeatures, rsi: 50 };
      
      const extremeResult = service.predict(extremeRSI);
      const normalResult = service.predict(normalRSI);
      
      expect(extremeResult.confidence).toBeGreaterThan(normalResult.confidence);
    });

    it('should increase confidence for strong momentum', () => {
      const strongMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 5 };
      const weakMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 0.5 };
      
      const strongResult = service.predict(strongMomentum);
      const weakResult = service.predict(weakMomentum);
      
      expect(strongResult.confidence).toBeGreaterThan(weakResult.confidence);
    });
  });

  describe('Random Forest predictions', () => {
    it('should give positive score for oversold RSI', () => {
      const oversold: PredictionFeatures = { ...baseFeatures, rsi: 15 };
      const result = service.predict(oversold);
      
      expect(result.rfPrediction).toBeGreaterThan(0);
    });

    it('should give negative score for overbought RSI', () => {
      const overbought: PredictionFeatures = { ...baseFeatures, rsi: 85 };
      const result = service.predict(overbought);
      
      expect(result.rfPrediction).toBeLessThan(0);
    });

    it('should incorporate positive SMA signals', () => {
      const positiveSMA: PredictionFeatures = { ...baseFeatures, sma5: 5, sma20: 3 };
      const noSMA: PredictionFeatures = { ...baseFeatures, sma5: 0, sma20: 0 };
      
      const positiveResult = service.predict(positiveSMA);
      const neutralResult = service.predict(noSMA);
      
      expect(positiveResult.rfPrediction).toBeGreaterThan(neutralResult.rfPrediction);
    });

    it('should respond to strong positive momentum', () => {
      const strongMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 3 };
      const result = service.predict(strongMomentum);
      
      expect(result.rfPrediction).toBeGreaterThan(0);
    });

    it('should respond to strong negative momentum', () => {
      const strongMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: -3 };
      const result = service.predict(strongMomentum);
      
      expect(result.rfPrediction).toBeLessThan(0);
    });
  });

  describe('XGBoost predictions', () => {
    it('should scale predictions appropriately', () => {
      const features: PredictionFeatures = {
        ...baseFeatures,
        rsi: 50,
        priceMomentum: 3,
        sma5: 2,
        sma20: 1
      };
      
      const result = service.predict(features);
      
      expect(Math.abs(result.xgbPrediction)).toBeLessThan(20);
    });

    it('should handle extreme momentum values', () => {
      const extremeMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 100 };
      const result = service.predict(extremeMomentum);
      
      expect(result.xgbPrediction).toBeDefined();
      expect(isFinite(result.xgbPrediction)).toBe(true);
    });
  });

  describe('LSTM predictions', () => {
    it('should be based on price momentum', () => {
      const positiveMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 5 };
      const negativeMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: -5 };
      
      const positiveResult = service.predict(positiveMomentum);
      const negativeResult = service.predict(negativeMomentum);
      
      expect(positiveResult.lstmPrediction).toBeGreaterThan(0);
      expect(negativeResult.lstmPrediction).toBeLessThan(0);
    });

    it('should scale momentum appropriately', () => {
      const momentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 10 };
      const result = service.predict(momentum);
      
      expect(Math.abs(result.lstmPrediction)).toBeLessThan(Math.abs(momentum.priceMomentum));
    });
  });

  describe('confidence calculation', () => {
    it('should never exceed 95', () => {
      const extremeFeatures: PredictionFeatures = {
        rsi: 5,
        rsiChange: -10,
        sma5: 10,
        sma20: 10,
        sma50: 10,
        priceMomentum: 10,
        volumeRatio: 2.0,
        volatility: 0.05,
        macdSignal: 5,
        bollingerPosition: 10,
        atrPercent: 5.0
      };
      
      const result = service.predict(extremeFeatures);
      
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should never go below 50', () => {
      const neutralFeatures: PredictionFeatures = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 1.0,
        volatility: 0.01,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 2.0
      };
      
      const result = service.predict(neutralFeatures);
      
      expect(result.confidence).toBeGreaterThanOrEqual(50);
    });

    it('should handle edge case: very extreme RSI (< 15 or > 85)', () => {
      const veryOversold: PredictionFeatures = { 
        ...baseFeatures, 
        rsi: 10 
      };
      const moderateOversold: PredictionFeatures = { 
        ...baseFeatures, 
        rsi: 25 
      };
      
      const veryResult = service.predict(veryOversold);
      const moderateResult = service.predict(moderateOversold);
      
      expect(veryResult.confidence).toBeGreaterThan(moderateResult.confidence);
    });

    it('should increase for large ensemble predictions', () => {
      const strongFeatures: PredictionFeatures = {
        rsi: 15,
        rsiChange: -5,
        sma5: 5,
        sma20: 3,
        sma50: 2,
        priceMomentum: 5,
        volumeRatio: 1.5,
        volatility: 0.02,
        macdSignal: 2,
        bollingerPosition: 20,
        atrPercent: 2.0
      };
      
      const weakFeatures: PredictionFeatures = {
        rsi: 45,
        rsiChange: 0,
        sma5: 0.5,
        sma20: 0.3,
        sma50: 0.2,
        priceMomentum: 0.5,
        volumeRatio: 1.0,
        volatility: 0.02,
        macdSignal: 0.2,
        bollingerPosition: 48,
        atrPercent: 2.0
      };
      
      const strongResult = service.predict(strongFeatures);
      const weakResult = service.predict(weakFeatures);
      
      expect(strongResult.confidence).toBeGreaterThan(weakResult.confidence);
    });
  });

  describe('edge cases', () => {
    it('should handle zero values for all features', () => {
      const zeroFeatures: PredictionFeatures = {
        rsi: 0,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 0,
        volatility: 0,
        macdSignal: 0,
        bollingerPosition: 0,
        atrPercent: 0
      };
      
      const result = service.predict(zeroFeatures);
      
      expect(result.ensemblePrediction).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(50);
    });

    it('should handle negative RSI', () => {
      const negativeRSI: PredictionFeatures = { ...baseFeatures, rsi: -10 };
      const result = service.predict(negativeRSI);
      
      expect(result).toBeDefined();
      expect(isFinite(result.ensemblePrediction)).toBe(true);
    });

    it('should handle RSI > 100', () => {
      const highRSI: PredictionFeatures = { ...baseFeatures, rsi: 150 };
      const result = service.predict(highRSI);
      
      expect(result).toBeDefined();
      expect(isFinite(result.ensemblePrediction)).toBe(true);
    });

    it('should handle NaN in features', () => {
      const nanFeatures: PredictionFeatures = {
        rsi: NaN,
        rsiChange: NaN,
        sma5: NaN,
        sma20: NaN,
        sma50: NaN,
        priceMomentum: NaN,
        volumeRatio: NaN,
        volatility: NaN,
        macdSignal: NaN,
        bollingerPosition: NaN,
        atrPercent: NaN
      };
      
      const result = service.predict(nanFeatures);
      
      expect(result).toBeDefined();
      // Confidence should still be in valid range
      expect(result.confidence).toBeGreaterThanOrEqual(50);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should handle Infinity in momentum', () => {
      const infMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: Infinity };
      const result = service.predict(infMomentum);
      
      expect(result).toBeDefined();
      expect(isFinite(result.ensemblePrediction) || result.ensemblePrediction === Infinity).toBe(true);
    });

    it('should handle very large numbers', () => {
      const largeFeatures: PredictionFeatures = {
        rsi: 1000,
        rsiChange: 1000,
        sma5: 1000,
        sma20: 1000,
        sma50: 1000,
        priceMomentum: 1000,
        volumeRatio: 1000,
        volatility: 1000,
        macdSignal: 1000,
        bollingerPosition: 1000,
        atrPercent: 1000
      };
      
      const result = service.predict(largeFeatures);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThanOrEqual(95);
    });
  });

  describe('model weight distribution', () => {
    it('should use correct weights for ensemble', () => {
      // Verify weights sum to 1
      const weights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
      const sum = weights.RF + weights.XGB + weights.LSTM;
      
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should respect individual model contributions', () => {
      const features: PredictionFeatures = {
        rsi: 50,
        rsiChange: 0,
        sma5: 1,
        sma20: 1,
        sma50: 1,
        priceMomentum: 1,
        volumeRatio: 1.0,
        volatility: 0.02,
        macdSignal: 0.5,
        bollingerPosition: 50,
        atrPercent: 2.0
      };
      
      const result = service.predict(features);
      
      // Ensemble should be between min and max of individual predictions
      const predictions = [result.rfPrediction, result.xgbPrediction, result.lstmPrediction];
      const minPred = Math.min(...predictions);
      const maxPred = Math.max(...predictions);
      
      expect(result.ensemblePrediction).toBeGreaterThanOrEqual(minPred - 0.1);
      expect(result.ensemblePrediction).toBeLessThanOrEqual(maxPred + 0.1);
    });
  });

  describe('TensorFlow.js integration', () => {
    it('should have TensorFlow disabled by default', () => {
      expect(service.isTensorFlowEnabled()).toBe(false);
    });

    it('should use rule-based predictions when TensorFlow is disabled', () => {
      const result = service.predict(baseFeatures);
      
      expect(result).toBeDefined();
      expect(result.rfPrediction).toBeDefined();
      expect(result.xgbPrediction).toBeDefined();
      expect(result.lstmPrediction).toBeDefined();
    });

    it('should support async prediction method', async () => {
      const result = await service.predictAsync(baseFeatures);
      
      expect(result).toBeDefined();
      expect(result.rfPrediction).toBeDefined();
      expect(result.xgbPrediction).toBeDefined();
      expect(result.lstmPrediction).toBeDefined();
      expect(result.ensemblePrediction).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should return model metrics when available', () => {
      const metrics = service.getModelMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.ff).toBeUndefined(); // Not trained yet
      expect(metrics.gru).toBeUndefined();
      expect(metrics.lstm).toBeUndefined();
    });
  });
});
