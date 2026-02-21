/**
 * Tests for ConfidenceEvaluator
 */

import { ConfidenceEvaluator } from '../ConfidenceEvaluator';
import { PredictionFeatures } from '../../../../lib/services/feature-engineering-service';
import { ModelPrediction } from '../interfaces';

describe('ConfidenceEvaluator', () => {
  let evaluator: ConfidenceEvaluator;
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
    evaluator = new ConfidenceEvaluator();
    
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

  describe('evaluate', () => {
    it('should return confidence between 50 and 95', () => {
      const predictions: ModelPrediction[] = [
        { value: 5, modelName: 'RandomForest' },
        { value: 6, modelName: 'XGBoost' },
        { value: 5.5, modelName: 'LSTM' },
      ];
      
      const confidence = evaluator.evaluate(baseFeatures, 5.5, predictions);
      
      expect(confidence).toBeGreaterThanOrEqual(50);
      expect(confidence).toBeLessThanOrEqual(95);
    });

    it('should increase confidence for extreme RSI', () => {
      const predictions: ModelPrediction[] = [
        { value: 5, modelName: 'RandomForest' },
      ];
      
      const extremeRSI: PredictionFeatures = { ...baseFeatures, rsi: 10 };
      const normalRSI: PredictionFeatures = { ...baseFeatures, rsi: 50 };
      
      const extremeConfidence = evaluator.evaluate(extremeRSI, 5, predictions);
      const normalConfidence = evaluator.evaluate(normalRSI, 5, predictions);
      
      expect(extremeConfidence).toBeGreaterThan(normalConfidence);
    });

    it('should increase confidence for strong momentum', () => {
      const predictions: ModelPrediction[] = [
        { value: 5, modelName: 'RandomForest' },
      ];
      
      const strongMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 5 };
      const weakMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 0.5 };
      
      const strongConfidence = evaluator.evaluate(strongMomentum, 5, predictions);
      const weakConfidence = evaluator.evaluate(weakMomentum, 5, predictions);
      
      expect(strongConfidence).toBeGreaterThan(weakConfidence);
    });

    it('should increase confidence for large predictions', () => {
      const predictions: ModelPrediction[] = [
        { value: 5, modelName: 'RandomForest' },
      ];
      
      const largeConfidence = evaluator.evaluate(baseFeatures, 5, predictions);
      const smallConfidence = evaluator.evaluate(baseFeatures, 0.5, predictions);
      
      expect(largeConfidence).toBeGreaterThan(smallConfidence);
    });

    it('should increase confidence when models agree', () => {
      const agreeing: ModelPrediction[] = [
        { value: 5.0, modelName: 'RandomForest' },
        { value: 5.1, modelName: 'XGBoost' },
        { value: 4.9, modelName: 'LSTM' },
      ];
      
      const disagreeing: ModelPrediction[] = [
        { value: 1, modelName: 'RandomForest' },
        { value: 10, modelName: 'XGBoost' },
        { value: 5, modelName: 'LSTM' },
      ];
      
      const agreeingConfidence = evaluator.evaluate(baseFeatures, 5, agreeing);
      const disagreeingConfidence = evaluator.evaluate(baseFeatures, 5, disagreeing);
      
      expect(agreeingConfidence).toBeGreaterThan(disagreeingConfidence);
    });

    it('should handle single prediction', () => {
      const predictions: ModelPrediction[] = [
        { value: 5, modelName: 'RandomForest' },
      ];
      
      const confidence = evaluator.evaluate(baseFeatures, 5, predictions);
      
      expect(confidence).toBeGreaterThanOrEqual(50);
      expect(confidence).toBeLessThanOrEqual(95);
    });

    it('should never exceed 95 even with all bonuses', () => {
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
      
      const perfectAgreement: ModelPrediction[] = [
        { value: 10, modelName: 'RandomForest' },
        { value: 10, modelName: 'XGBoost' },
        { value: 10, modelName: 'LSTM' },
      ];
      
      const confidence = evaluator.evaluate(extremeFeatures, 10, perfectAgreement);
      
      expect(confidence).toBeLessThanOrEqual(95);
    });

    it('should never go below 50 even with no bonuses', () => {
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
      
      const predictions: ModelPrediction[] = [
        { value: 0.1, modelName: 'RandomForest' },
      ];
      
      const confidence = evaluator.evaluate(neutralFeatures, 0.1, predictions);
      
      expect(confidence).toBeGreaterThanOrEqual(50);
    });

    it('should handle negative predictions', () => {
      const predictions: ModelPrediction[] = [
        { value: -5, modelName: 'RandomForest' },
        { value: -6, modelName: 'XGBoost' },
        { value: -5.5, modelName: 'LSTM' },
      ];
      
      const confidence = evaluator.evaluate(baseFeatures, -5.5, predictions);
      
      expect(confidence).toBeGreaterThanOrEqual(50);
      expect(confidence).toBeLessThanOrEqual(95);
    });
  });
});
