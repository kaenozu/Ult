/**
 * Tests for EnsembleModel
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { EnsembleModel } from '../EnsembleModel';
import { ExtendedTechnicalFeatures } from '../../services/feature-engineering-service';
import { OHLCV } from '../../../types/shared';

describe('EnsembleModel', () => {
  let ensembleModel: EnsembleModel;

  beforeEach(() => {
    ensembleModel = new EnsembleModel();
  });

  const createMockFeatures = (): ExtendedTechnicalFeatures => ({
    rsi: 65,
    rsiChange: 5,
    sma5: 2,
    sma20: 1,
    sma50: -0.5,
    priceMomentum: 3.5,
    volumeRatio: 1.2,
    volatility: 20,
    macdSignal: 1.5,
    bollingerPosition: 70,
    atrPercent: 2.5,
    momentum: 3.0,
    rateOfChange: 2.8,
    stochasticRSI: 68,
    williamsR: -35,
    cci: 80,
    atrRatio: 1.1,
    volumeProfile: 1.3,
    pricePosition: 65,
    momentumTrend: 'UP',
    volatilityRegime: 'NORMAL',
  });

  const generateMockOHLCV = (count: number, startPrice: number = 100): OHLCV[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: 'AAPL',
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: startPrice + i * 0.5,
      high: startPrice + i * 0.5 + 2,
      low: startPrice + i * 0.5 - 2,
      close: startPrice + i * 0.5 + 1,
      volume: 1000000,
    }));
  };

  describe('predict', () => {
    it('should return ensemble prediction with all required properties', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('individualPredictions');
      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('agreementScore');

      expect(['BUY', 'SELL', 'HOLD']).toContain(result.direction);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.individualPredictions).toHaveLength(3);
      expect(result.agreementScore).toBeGreaterThanOrEqual(0);
      expect(result.agreementScore).toBeLessThanOrEqual(1);
    });

    it('should include predictions from all three models', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      const models = result.individualPredictions.map(p => p.model);
      expect(models).toContain('RF');
      expect(models).toContain('XGB');
      expect(models).toContain('LSTM');
    });

    it('should use weighted average strategy by default', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      expect(result.strategy).toBe('weighted_average');
    });

    it('should support stacking strategy', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data, 'stacking');

      expect(result.strategy).toBe('stacking');
    });

    it('should support voting strategy', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data, 'voting');

      expect(result.strategy).toBe('voting');
    });

    it('should generate BUY signal for bullish features', () => {
      const bullishFeatures: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        rsi: 35, // Oversold
        sma5: 3,
        sma20: 2,
        momentum: 8,
        rateOfChange: 7,
        momentumTrend: 'STRONG_UP',
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(bullishFeatures, data);

      // Should likely be BUY or at least have positive score
      expect(result.score).toBeGreaterThan(0);
    });

    it('should generate SELL signal for bearish features', () => {
      const bearishFeatures: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        rsi: 75, // Overbought
        sma5: -3,
        sma20: -2,
        momentum: -8,
        rateOfChange: -7,
        momentumTrend: 'STRONG_DOWN',
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(bearishFeatures, data);

      // Should likely be SELL or at least have negative score
      expect(result.score).toBeLessThan(0);
    });

    it('should calculate high agreement score when models agree', () => {
      // Use features that should make all models agree on direction
      const strongFeatures: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        rsi: 25,
        sma5: 5,
        sma20: 4,
        sma50: 3,
        momentum: 10,
        rateOfChange: 9,
        momentumTrend: 'STRONG_UP',
        volumeRatio: 2.0,
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(strongFeatures, data);

      // Agreement score should be relatively high
      expect(result.agreementScore).toBeGreaterThan(0.5);
    });
  });

  describe('setWeights', () => {
    it('should set custom model weights', () => {
      ensembleModel.setWeights({ RF: 0.5, XGB: 0.3, LSTM: 0.2 });

      const weights = ensembleModel.getWeights();
      expect(weights.RF).toBeCloseTo(0.5, 2);
      expect(weights.XGB).toBeCloseTo(0.3, 2);
      expect(weights.LSTM).toBeCloseTo(0.2, 2);
    });

    it('should normalize weights to sum to 1', () => {
      ensembleModel.setWeights({ RF: 2, XGB: 2, LSTM: 2 });

      const weights = ensembleModel.getWeights();
      const sum = weights.RF + weights.XGB + weights.LSTM;
      expect(sum).toBeCloseTo(1, 5);
    });

    it('should allow partial weight updates', () => {
      const originalWeights = ensembleModel.getWeights();
      ensembleModel.setWeights({ RF: 0.5 });

      const newWeights = ensembleModel.getWeights();
      expect(newWeights.RF).not.toBe(originalWeights.RF);
      
      // Should be normalized
      const sum = newWeights.RF + newWeights.XGB + newWeights.LSTM;
      expect(sum).toBeCloseTo(1, 5);
    });
  });

  describe('recordPerformance', () => {
    it('should record model performance', () => {
      ensembleModel.recordPerformance('RF', 0.85);
      ensembleModel.recordPerformance('XGB', 0.78);
      ensembleModel.recordPerformance('LSTM', 0.72);

      const summary = ensembleModel.getPerformanceSummary();

      expect(summary).toHaveLength(3);
      expect(summary[0].model).toBe('RF');
      expect(summary[0].accuracy).toBeCloseTo(0.85, 2);
    });

    it('should adjust weights based on performance', () => {
      const initialWeights = ensembleModel.getWeights();

      // Record consistently high performance for RF
      for (let i = 0; i < 20; i++) {
        ensembleModel.recordPerformance('RF', 0.90);
        ensembleModel.recordPerformance('XGB', 0.70);
        ensembleModel.recordPerformance('LSTM', 0.65);
      }

      const newWeights = ensembleModel.getWeights();

      // RF weight should have increased
      expect(newWeights.RF).toBeGreaterThan(initialWeights.RF);
    });

    it('should maintain weight history limit', () => {
      // Record more than MAX_HISTORY_SIZE performances
      for (let i = 0; i < 150; i++) {
        ensembleModel.recordPerformance('RF', Math.random());
      }

      const summary = ensembleModel.getPerformanceSummary();
      const rfSummary = summary.find(s => s.model === 'RF');

      // Should have calculated average (not crash with too much data)
      expect(rfSummary).toBeDefined();
      expect(rfSummary!.accuracy).toBeGreaterThanOrEqual(0);
      expect(rfSummary!.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return summary for all models', () => {
      ensembleModel.recordPerformance('RF', 0.80);
      ensembleModel.recordPerformance('XGB', 0.75);
      ensembleModel.recordPerformance('LSTM', 0.70);

      const summary = ensembleModel.getPerformanceSummary();

      expect(summary).toHaveLength(3);
      
      summary.forEach(s => {
        expect(s).toHaveProperty('model');
        expect(s).toHaveProperty('accuracy');
        expect(s).toHaveProperty('recentAccuracy');
        expect(s).toHaveProperty('weight');
        expect(['RF', 'XGB', 'LSTM']).toContain(s.model);
      });
    });

    it('should show different accuracy and recentAccuracy', () => {
      // Record old performance
      for (let i = 0; i < 50; i++) {
        ensembleModel.recordPerformance('RF', 0.60);
      }

      // Record recent high performance
      for (let i = 0; i < 10; i++) {
        ensembleModel.recordPerformance('RF', 0.90);
      }

      const summary = ensembleModel.getPerformanceSummary();
      const rfSummary = summary.find(s => s.model === 'RF');

      expect(rfSummary!.recentAccuracy).toBeGreaterThan(rfSummary!.accuracy);
    });
  });

  describe('getWeights', () => {
    it('should return current model weights', () => {
      const weights = ensembleModel.getWeights();

      expect(weights).toHaveProperty('RF');
      expect(weights).toHaveProperty('XGB');
      expect(weights).toHaveProperty('LSTM');

      const sum = weights.RF + weights.XGB + weights.LSTM;
      expect(sum).toBeCloseTo(1, 5);
    });

    it('should not modify internal weights', () => {
      const weights1 = ensembleModel.getWeights();
      weights1.RF = 0.99;

      const weights2 = ensembleModel.getWeights();
      expect(weights2.RF).not.toBe(0.99);
    });
  });

  describe('Edge cases', () => {
    it('should handle extreme RSI values', () => {
      const extremeFeatures: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        rsi: 5, // Extremely oversold
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(extremeFeatures, data);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0); // Should favor buy
    });

    it('should handle high volatility', () => {
      const volatileFeatures: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        volatility: 50,
        volatilityRegime: 'HIGH',
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(volatileFeatures, data);

      expect(result).toBeDefined();
      // Confidence should be adjusted for high volatility
      expect(result.confidence).toBeLessThan(1);
    });

    it('should handle minimal OHLCV data', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(2); // Very minimal data

      const result = ensembleModel.predict(features, data);

      expect(result).toBeDefined();
      expect(result.individualPredictions).toHaveLength(3);
    });

    it('should handle neutral features', () => {
      const neutralFeatures: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        rsi: 50,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        momentum: 0,
        rateOfChange: 0,
        momentumTrend: 'NEUTRAL',
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(neutralFeatures, data);

      expect(result.direction).toBe('HOLD');
      expect(Math.abs(result.score)).toBeLessThan(2);
    });
  });

  describe('Individual model predictions', () => {
    it('should have all models contribute to prediction', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      // All models should have confidence values
      expect(result.individualPredictions.every(p => p.confidence > 0)).toBe(true);
      expect(result.individualPredictions.every(p => p.confidence <= 1)).toBe(true);
      
      // At least one model should have a non-zero value
      expect(result.individualPredictions.some(p => p.value !== 0)).toBe(true);
    });
  });

  describe('SHAP Values and Interpretability', () => {
    it('should calculate SHAP values for predictions', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      expect(result.shapValues).toBeDefined();
      expect(result.shapValues?.features).toBeDefined();
      expect(result.shapValues?.baseValue).toBeDefined();
      expect(result.shapValues?.totalContribution).toBeDefined();
      expect(result.shapValues?.topFeatures).toBeDefined();
      expect(result.shapValues?.topFeatures.length).toBeGreaterThan(0);
    });

    it('should have top features sorted by contribution', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);
      const topFeatures = result.shapValues?.topFeatures || [];

      expect(topFeatures.length).toBeGreaterThan(0);
      
      // Verify sorted by absolute contribution
      for (let i = 1; i < topFeatures.length; i++) {
        expect(Math.abs(topFeatures[i - 1].contribution))
          .toBeGreaterThanOrEqual(Math.abs(topFeatures[i].contribution));
      }
    });

    it('should include model agreement in SHAP values', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      expect(result.shapValues?.features).toHaveProperty('model_agreement');
    });
  });

  describe('Uncertainty Quantification', () => {
    it('should calculate prediction uncertainty', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      expect(result.uncertainty).toBeDefined();
      expect(result.uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty).toBeLessThanOrEqual(1);
    });

    it('should have higher uncertainty when models disagree', () => {
      const features = createMockFeatures();
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(features, data);

      // When agreement score is low, uncertainty should be higher
      if (result.agreementScore < 0.5) {
        expect(result.uncertainty).toBeGreaterThan(0.3);
      }
    });

    it('should have lower uncertainty with high confidence', () => {
      const strongFeatures: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        rsi: 25, // Oversold
        momentum: 8,
        momentumTrend: 'STRONG_UP',
        volumeRatio: 2.0,
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(strongFeatures, data);

      if (result.confidence > 0.8) {
        expect(result.uncertainty).toBeLessThan(0.4);
      }
    });
  });

  describe('Macro and Sentiment Features', () => {
    it('should incorporate macro indicators in SHAP values', () => {
      const featuresWithMacro: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        macroIndicators: {
          vix: 30,
          interestRate: 4.5,
        },
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(featuresWithMacro, data);

      expect(result.shapValues?.features).toHaveProperty('vix_impact');
    });

    it('should incorporate sentiment in SHAP values', () => {
      const featuresWithSentiment: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        sentiment: {
          positive: 0.7,
          negative: 0.2,
          neutral: 0.1,
          overall: 0.5,
          confidence: 0.8,
        },
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(featuresWithSentiment, data);

      expect(result.shapValues?.features).toHaveProperty('news_sentiment');
    });

    it('should incorporate time series features in SHAP values', () => {
      const featuresWithTS: ExtendedTechnicalFeatures = {
        ...createMockFeatures(),
        timeSeriesFeatures: {
          rollingMean5: 100,
          rollingMean20: 98,
          rollingStd5: 2,
          rollingStd20: 3,
          exponentialMA: 99,
          momentumChange: 0.5,
          priceAcceleration: 0.2,
          volumeAcceleration: 100,
          autocorrelation: 0.8,
          fourierDominantFreq: 0.1,
          fourierAmplitude: 2,
        },
      };
      const data = generateMockOHLCV(50);

      const result = ensembleModel.predict(featuresWithTS, data);

      expect(result.shapValues?.features).toHaveProperty('momentum_change');
      expect(result.shapValues?.features).toHaveProperty('price_acceleration');
    });
  });
});
