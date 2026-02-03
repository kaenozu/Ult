/**
 * Tests for PredictionService
 */

import { PredictionService } from '../PredictionService';
import { ModelRegistry } from '../ModelRegistry';
import { RandomForestModel } from '../RandomForestModel';
import { XGBoostModel } from '../XGBoostModel';
import { LSTMModel } from '../LSTMModel';
import { WeightedAverageStrategy } from '../WeightedAverageStrategy';
import { ConfidenceEvaluator } from '../ConfidenceEvaluator';
import { PredictionFeatures } from '../../../services/feature-calculation-service';

describe('PredictionService', () => {
  let service: PredictionService;
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
    const registry = new ModelRegistry();
    registry.register(new RandomForestModel());
    registry.register(new XGBoostModel());
    registry.register(new LSTMModel());

    const strategy = new WeightedAverageStrategy({
      'RandomForest': 0.35,
      'XGBoost': 0.35,
      'LSTM': 0.30,
    });

    const evaluator = new ConfidenceEvaluator();

    service = new PredictionService(registry, strategy, evaluator);
    
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
    it('should return prediction with all required fields', () => {
      const result = service.predict(baseFeatures);
      
      expect(result).toHaveProperty('rfPrediction');
      expect(result).toHaveProperty('xgbPrediction');
      expect(result).toHaveProperty('lstmPrediction');
      expect(result).toHaveProperty('ensemblePrediction');
      expect(result).toHaveProperty('confidence');
    });

    it('should calculate ensemble as weighted average', () => {
      const result = service.predict(baseFeatures);
      
      const expectedEnsemble = 
        result.rfPrediction * 0.35 + 
        result.xgbPrediction * 0.35 + 
        result.lstmPrediction * 0.30;
      
      expect(result.ensemblePrediction).toBeCloseTo(expectedEnsemble, 5);
    });

    it('should return higher prediction for bullish features', () => {
      const bullishFeatures: PredictionFeatures = {
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
      
      const result = service.predict(bullishFeatures);
      
      expect(result.ensemblePrediction).toBeGreaterThan(0);
    });

    it('should return lower prediction for bearish features', () => {
      const bearishFeatures: PredictionFeatures = {
        rsi: 85,
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
    });

    it('should return confidence between 50 and 95', () => {
      const result = service.predict(baseFeatures);
      
      expect(result.confidence).toBeGreaterThanOrEqual(50);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should use all three models', () => {
      const result = service.predict(baseFeatures);
      
      expect(result.rfPrediction).toBeDefined();
      expect(result.xgbPrediction).toBeDefined();
      expect(result.lstmPrediction).toBeDefined();
      expect(isFinite(result.rfPrediction)).toBe(true);
      expect(isFinite(result.xgbPrediction)).toBe(true);
      expect(isFinite(result.lstmPrediction)).toBe(true);
    });
  });

  describe('getters', () => {
    it('should provide access to model registry', () => {
      const registry = service.getModelRegistry();
      
      expect(registry).toBeDefined();
      expect(registry.getModels()).toHaveLength(3);
    });

    it('should provide access to ensemble strategy', () => {
      const strategy = service.getEnsembleStrategy();
      
      expect(strategy).toBeDefined();
      expect(strategy.strategyName).toBe('WeightedAverage');
    });

    it('should provide access to confidence evaluator', () => {
      const evaluator = service.getConfidenceEvaluator();
      
      expect(evaluator).toBeDefined();
    });
  });

  describe('dependency injection', () => {
    it('should allow custom model registry', () => {
      const customRegistry = new ModelRegistry();
      customRegistry.register(new RandomForestModel());
      
      const customService = new PredictionService(
        customRegistry,
        new WeightedAverageStrategy(),
        new ConfidenceEvaluator()
      );
      
      const result = customService.predict(baseFeatures);
      
      expect(result.rfPrediction).toBeDefined();
      expect(result.xgbPrediction).toBe(0); // Not registered
      expect(result.lstmPrediction).toBe(0); // Not registered
    });

    it('should allow custom weights', () => {
      const registry = new ModelRegistry();
      registry.register(new RandomForestModel());
      registry.register(new XGBoostModel());
      
      const customStrategy = new WeightedAverageStrategy({
        'RandomForest': 0.7,
        'XGBoost': 0.3,
      });
      
      const customService = new PredictionService(
        registry,
        customStrategy,
        new ConfidenceEvaluator()
      );
      
      const result = customService.predict(baseFeatures);
      
      const expectedEnsemble = 
        result.rfPrediction * 0.7 + 
        result.xgbPrediction * 0.3;
      
      expect(result.ensemblePrediction).toBeCloseTo(expectedEnsemble, 5);
    });
  });
});
