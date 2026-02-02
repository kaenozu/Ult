/**
 * Tests for WeightedAverageStrategy
 */

import { WeightedAverageStrategy } from '../WeightedAverageStrategy';
import { ModelPrediction } from '../interfaces';

describe('WeightedAverageStrategy', () => {
  let strategy: WeightedAverageStrategy;

  beforeEach(() => {
    strategy = new WeightedAverageStrategy();
  });

  it('should have correct strategy name', () => {
    expect(strategy.strategyName).toBe('WeightedAverage');
  });

  describe('combine', () => {
    it('should use default weights', () => {
      const predictions: ModelPrediction[] = [
        { value: 10, modelName: 'RandomForest' },
        { value: 20, modelName: 'XGBoost' },
        { value: 30, modelName: 'LSTM' },
      ];
      
      const result = strategy.combine(predictions);
      
      // Expected: 10*0.35 + 20*0.35 + 30*0.30 = 3.5 + 7.0 + 9.0 = 19.5
      expect(result).toBeCloseTo(19.5, 2);
    });

    it('should handle single prediction', () => {
      const predictions: ModelPrediction[] = [
        { value: 10, modelName: 'RandomForest' },
      ];
      
      const result = strategy.combine(predictions);
      
      expect(result).toBe(10);
    });

    it('should handle unknown model names with fallback', () => {
      const predictions: ModelPrediction[] = [
        { value: 10, modelName: 'Unknown1' },
        { value: 20, modelName: 'Unknown2' },
      ];
      
      const result = strategy.combine(predictions);
      
      // Fallback to simple average
      expect(result).toBe(15);
    });

    it('should handle negative predictions', () => {
      const predictions: ModelPrediction[] = [
        { value: -10, modelName: 'RandomForest' },
        { value: -20, modelName: 'XGBoost' },
        { value: -30, modelName: 'LSTM' },
      ];
      
      const result = strategy.combine(predictions);
      
      // Expected: -10*0.35 + -20*0.35 + -30*0.30 = -19.5
      expect(result).toBeCloseTo(-19.5, 2);
    });

    it('should handle mixed positive and negative predictions', () => {
      const predictions: ModelPrediction[] = [
        { value: 10, modelName: 'RandomForest' },
        { value: -20, modelName: 'XGBoost' },
        { value: 30, modelName: 'LSTM' },
      ];
      
      const result = strategy.combine(predictions);
      
      // Expected: 10*0.35 + -20*0.35 + 30*0.30 = 3.5 - 7.0 + 9.0 = 5.5
      expect(result).toBeCloseTo(5.5, 2);
    });
  });

  describe('setWeight', () => {
    it('should update weight for a model', () => {
      strategy.setWeight('RandomForest', 0.5);
      
      const predictions: ModelPrediction[] = [
        { value: 10, modelName: 'RandomForest' },
        { value: 20, modelName: 'XGBoost' },
        { value: 30, modelName: 'LSTM' },
      ];
      
      const result = strategy.combine(predictions);
      
      // Total weight: 0.5 + 0.35 + 0.30 = 1.15
      // Expected: (10*0.5 + 20*0.35 + 30*0.30) / 1.15 = 21.0 / 1.15 = 18.26...
      expect(result).toBeCloseTo(18.26, 2);
    });

    it('should throw error for negative weight', () => {
      expect(() => strategy.setWeight('RandomForest', -0.1)).toThrow();
    });

    it('should throw error for weight > 1', () => {
      expect(() => strategy.setWeight('RandomForest', 1.1)).toThrow();
    });

    it('should accept weight of 0', () => {
      expect(() => strategy.setWeight('RandomForest', 0)).not.toThrow();
    });

    it('should accept weight of 1', () => {
      expect(() => strategy.setWeight('RandomForest', 1)).not.toThrow();
    });
  });

  describe('getWeights', () => {
    it('should return default weights', () => {
      const weights = strategy.getWeights();
      
      expect(weights).toEqual({
        'RandomForest': 0.35,
        'XGBoost': 0.35,
        'LSTM': 0.30,
      });
    });

    it('should return copy of weights (not reference)', () => {
      const weights1 = strategy.getWeights();
      weights1['RandomForest'] = 0.99;
      
      const weights2 = strategy.getWeights();
      
      expect(weights2['RandomForest']).toBe(0.35);
    });

    it('should reflect updated weights', () => {
      strategy.setWeight('RandomForest', 0.5);
      
      const weights = strategy.getWeights();
      
      expect(weights['RandomForest']).toBe(0.5);
    });
  });

  describe('custom weights', () => {
    it('should accept custom weights in constructor', () => {
      const customStrategy = new WeightedAverageStrategy({
        'Model1': 0.6,
        'Model2': 0.4,
      });
      
      const predictions: ModelPrediction[] = [
        { value: 10, modelName: 'Model1' },
        { value: 20, modelName: 'Model2' },
      ];
      
      const result = customStrategy.combine(predictions);
      
      // Expected: 10*0.6 + 20*0.4 = 6.0 + 8.0 = 14.0
      expect(result).toBeCloseTo(14.0, 2);
    });

    it('should throw error for invalid weights in constructor', () => {
      expect(() => new WeightedAverageStrategy({
        'Model1': -0.1,
      })).toThrow();
      
      expect(() => new WeightedAverageStrategy({
        'Model1': 1.5,
      })).toThrow();
    });
  });
});
