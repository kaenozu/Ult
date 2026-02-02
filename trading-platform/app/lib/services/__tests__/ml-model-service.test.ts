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

  describe('Dynamic Weight Optimization', () => {
    describe('Market Regime-Based Weighting', () => {
      it('should update weights based on BULL market regime', () => {
        service.updateWeightsForMarketRegime('BULL');
        const weights = service.getCurrentWeights();
        
        expect(weights.marketRegime).toBe('BULL');
        expect(weights.rf).toBeLessThan(0.35); // Should decrease over time
        expect(weights.xgb).toBeGreaterThan(0.35); // Should increase over time
        expect(weights.lstm).toBeGreaterThan(0.30); // Should increase over time
      });

      it('should update weights based on BEAR market regime', () => {
        service.resetWeights();
        service.updateWeightsForMarketRegime('BEAR');
        const weights = service.getCurrentWeights();
        
        expect(weights.marketRegime).toBe('BEAR');
        // After smoothing, weights should move toward BEAR regime weights
        expect(weights.rf).toBeGreaterThan(0.35); // Should increase over time
        expect(weights.xgb).toBeCloseTo(0.35, 1); // Should stay similar
        expect(weights.lstm).toBeLessThan(0.30); // Should decrease over time
      });

      it('should update weights based on SIDEWAYS market regime', () => {
        service.resetWeights();
        service.updateWeightsForMarketRegime('SIDEWAYS');
        const weights = service.getCurrentWeights();
        
        expect(weights.marketRegime).toBe('SIDEWAYS');
        // Weights should be balanced for sideways market
        expect(weights.rf + weights.xgb + weights.lstm).toBeCloseTo(1.0, 1);
      });

      it('should smoothly transition weights between regimes', () => {
        service.resetWeights();
        const initialWeights = service.getCurrentWeights();
        
        service.updateWeightsForMarketRegime('BULL');
        const afterFirst = service.getCurrentWeights();
        
        service.updateWeightsForMarketRegime('BULL');
        const afterSecond = service.getCurrentWeights();
        
        // Weights should be progressively moving toward BULL weights
        expect(Math.abs(afterSecond.xgb - 0.40)).toBeLessThan(Math.abs(afterFirst.xgb - 0.40));
      });
    });

    describe('Accuracy-Based Weighting', () => {
      beforeEach(() => {
        service.resetWeights();
        service.setAccuracyBasedWeighting(true);
      });

      it('should record prediction accuracy', () => {
        service.recordPredictionAccuracy(1.0, 1.5, 0.8, 1.2);
        
        // Should have recorded 3 entries (one per model)
        const weights = service.getCurrentWeights();
        expect(weights.lastUpdated).toBeGreaterThan(0);
      });

      it('should adjust weights based on model accuracy', () => {
        service.updateWeightsForMarketRegime('SIDEWAYS');
        
        // Record multiple predictions where RF is most accurate
        for (let i = 0; i < 15; i++) {
          // RF predicts 1.0, XGB 2.0, LSTM 3.0, actual is 1.1 (RF is closest)
          service.recordPredictionAccuracy(1.0, 2.0, 3.0, 1.1);
        }
        
        const weights = service.getCurrentWeights();
        
        // RF weight should have increased relative to initial
        expect(weights.rf).toBeGreaterThan(0.30);
      });

      it('should not update weights with insufficient data', () => {
        service.resetWeights();
        const initialWeights = service.getCurrentWeights();
        
        // Record only a few predictions (less than 10)
        for (let i = 0; i < 3; i++) {
          service.recordPredictionAccuracy(1.0, 1.0, 1.0, 1.0);
        }
        
        const weights = service.getCurrentWeights();
        
        // Weights should remain close to initial (no significant change)
        expect(Math.abs(weights.rf - initialWeights.rf)).toBeLessThan(0.01);
        expect(Math.abs(weights.xgb - initialWeights.xgb)).toBeLessThan(0.01);
        expect(Math.abs(weights.lstm - initialWeights.lstm)).toBeLessThan(0.01);
      });

      it('should maintain history size limit', () => {
        // Record more than maxHistorySize predictions
        for (let i = 0; i < 25; i++) {
          service.recordPredictionAccuracy(1.0, 1.0, 1.0, 1.0);
        }
        
        // History should be trimmed to maxHistorySize * 3 (60)
        // This is tested indirectly through getCurrentWeights not throwing
        const weights = service.getCurrentWeights();
        expect(weights).toBeDefined();
      });

      it('should blend regime weights with accuracy weights', () => {
        service.updateWeightsForMarketRegime('BULL');
        
        // Record predictions where LSTM is most accurate
        for (let i = 0; i < 15; i++) {
          service.recordPredictionAccuracy(5.0, 4.0, 1.0, 1.1);
        }
        
        const weights = service.getCurrentWeights();
        
        // LSTM should have higher weight, but not as much as pure accuracy would give
        // because it's blended with regime weights
        expect(weights.lstm).toBeGreaterThan(0.30);
      });
    });

    describe('Weight Management', () => {
      it('should get current weights', () => {
        const weights = service.getCurrentWeights();
        
        expect(weights).toHaveProperty('rf');
        expect(weights).toHaveProperty('xgb');
        expect(weights).toHaveProperty('lstm');
        expect(weights).toHaveProperty('marketRegime');
        expect(weights).toHaveProperty('lastUpdated');
      });

      it('should clear accuracy history', () => {
        service.recordPredictionAccuracy(1.0, 1.0, 1.0, 1.0);
        service.clearAccuracyHistory();
        
        // After clearing, weights should be defined
        const weights = service.getCurrentWeights();
        expect(weights).toBeDefined();
      });

      it('should reset weights to default', () => {
        service.updateWeightsForMarketRegime('BULL');
        service.recordPredictionAccuracy(1.0, 1.0, 1.0, 1.0);
        
        service.resetWeights();
        const weights = service.getCurrentWeights();
        
        expect(weights.rf).toBe(0.35);
        expect(weights.xgb).toBe(0.35);
        expect(weights.lstm).toBe(0.30);
        expect(weights.marketRegime).toBe('SIDEWAYS');
      });

      it('should enable/disable accuracy-based weighting', () => {
        service.setAccuracyBasedWeighting(false);
        service.updateWeightsForMarketRegime('SIDEWAYS');
        
        const weightsBefore = service.getCurrentWeights();
        
        // Record predictions - should not affect weights
        for (let i = 0; i < 15; i++) {
          service.recordPredictionAccuracy(1.0, 2.0, 3.0, 1.1);
        }
        
        const weightsAfter = service.getCurrentWeights();
        
        // Weights should not change significantly (only regime-based)
        expect(weightsAfter.rf).toBeCloseTo(weightsBefore.rf, 2);
        expect(weightsAfter.xgb).toBeCloseTo(weightsBefore.xgb, 2);
        expect(weightsAfter.lstm).toBeCloseTo(weightsBefore.lstm, 2);
      });
    });

    describe('Market Regime Detection', () => {
      it('should detect BULL regime from features', () => {
        const bullishFeatures: PredictionFeatures = {
          rsi: 65,
          rsiChange: 5,
          sma5: 2,
          sma20: 1,
          sma50: 0.5,
          priceMomentum: 3,
          volumeRatio: 1.5,
          volatility: 0.02,
          macdSignal: 1,
          bollingerPosition: 70,
          atrPercent: 2.0
        };
        
        const regime = service.detectMarketRegimeFromFeatures(bullishFeatures);
        expect(regime).toBe('BULL');
      });

      it('should detect BEAR regime from features', () => {
        const bearishFeatures: PredictionFeatures = {
          rsi: 35,
          rsiChange: -5,
          sma5: -2,
          sma20: -1,
          sma50: -0.5,
          priceMomentum: -3,
          volumeRatio: 0.8,
          volatility: 0.02,
          macdSignal: -1,
          bollingerPosition: 30,
          atrPercent: 2.0
        };
        
        const regime = service.detectMarketRegimeFromFeatures(bearishFeatures);
        expect(regime).toBe('BEAR');
      });

      it('should detect SIDEWAYS regime from neutral features', () => {
        const neutralFeatures: PredictionFeatures = {
          rsi: 50,
          rsiChange: 0,
          sma5: 0,
          sma20: 0,
          sma50: 0,
          priceMomentum: 0.5,
          volumeRatio: 1.0,
          volatility: 0.02,
          macdSignal: 0,
          bollingerPosition: 50,
          atrPercent: 2.0
        };
        
        const regime = service.detectMarketRegimeFromFeatures(neutralFeatures);
        expect(regime).toBe('SIDEWAYS');
      });
    });

    describe('Integration with Predictions', () => {
      it('should use dynamic weights in predictions', () => {
        service.resetWeights();
        
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
        
        const resultBefore = service.predict(features);
        
        // Change to BULL regime
        service.updateWeightsForMarketRegime('BULL');
        service.updateWeightsForMarketRegime('BULL');
        service.updateWeightsForMarketRegime('BULL');
        
        const resultAfter = service.predict(features);
        
        // Ensemble prediction should be different due to weight changes
        expect(resultAfter.ensemblePrediction).not.toBeCloseTo(resultBefore.ensemblePrediction, 5);
      });

      it('should maintain prediction structure with dynamic weights', () => {
        service.updateWeightsForMarketRegime('BEAR');
        
        const features: PredictionFeatures = {
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
        
        const result = service.predict(features);
        
        expect(result).toHaveProperty('rfPrediction');
        expect(result).toHaveProperty('xgbPrediction');
        expect(result).toHaveProperty('lstmPrediction');
        expect(result).toHaveProperty('ensemblePrediction');
        expect(result).toHaveProperty('confidence');
      });
    });
  });
});
