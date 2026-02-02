/**
 * Tests for ModelRegistry
 */

import { ModelRegistry } from '../ModelRegistry';
import { RandomForestModel } from '../RandomForestModel';
import { XGBoostModel } from '../XGBoostModel';
import { LSTMModel } from '../LSTMModel';
import { PredictionFeatures } from '../../../services/feature-calculation-service';

describe('ModelRegistry', () => {
  let registry: ModelRegistry;
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
    registry = new ModelRegistry();
    
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

  describe('register', () => {
    it('should register a model', () => {
      const model = new RandomForestModel();
      registry.register(model);
      
      expect(registry.hasModel('RandomForest')).toBe(true);
    });

    it('should register multiple models', () => {
      registry.register(new RandomForestModel());
      registry.register(new XGBoostModel());
      registry.register(new LSTMModel());
      
      expect(registry.getModels()).toHaveLength(3);
    });

    it('should replace model with same name', () => {
      const model1 = new RandomForestModel();
      const model2 = new RandomForestModel();
      
      registry.register(model1);
      registry.register(model2);
      
      expect(registry.getModels()).toHaveLength(1);
    });
  });

  describe('getModels', () => {
    it('should return empty array initially', () => {
      expect(registry.getModels()).toEqual([]);
    });

    it('should return all registered models', () => {
      registry.register(new RandomForestModel());
      registry.register(new XGBoostModel());
      
      const models = registry.getModels();
      expect(models).toHaveLength(2);
      expect(models[0].name).toBe('RandomForest');
      expect(models[1].name).toBe('XGBoost');
    });
  });

  describe('predictAll', () => {
    it('should return empty array when no models registered', () => {
      const predictions = registry.predictAll(baseFeatures);
      expect(predictions).toEqual([]);
    });

    it('should return predictions from all models', () => {
      registry.register(new RandomForestModel());
      registry.register(new XGBoostModel());
      registry.register(new LSTMModel());
      
      const predictions = registry.predictAll(baseFeatures);
      
      expect(predictions).toHaveLength(3);
      expect(predictions[0]).toHaveProperty('value');
      expect(predictions[0]).toHaveProperty('modelName');
    });

    it('should include model names in predictions', () => {
      registry.register(new RandomForestModel());
      registry.register(new XGBoostModel());
      
      const predictions = registry.predictAll(baseFeatures);
      
      const modelNames = predictions.map(p => p.modelName);
      expect(modelNames).toContain('RandomForest');
      expect(modelNames).toContain('XGBoost');
    });
  });

  describe('getModel', () => {
    it('should return undefined for non-existent model', () => {
      expect(registry.getModel('NonExistent')).toBeUndefined();
    });

    it('should return registered model', () => {
      const model = new RandomForestModel();
      registry.register(model);
      
      const retrieved = registry.getModel('RandomForest');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('RandomForest');
    });
  });

  describe('hasModel', () => {
    it('should return false for non-existent model', () => {
      expect(registry.hasModel('NonExistent')).toBe(false);
    });

    it('should return true for registered model', () => {
      registry.register(new RandomForestModel());
      expect(registry.hasModel('RandomForest')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should return false for non-existent model', () => {
      expect(registry.unregister('NonExistent')).toBe(false);
    });

    it('should remove registered model', () => {
      registry.register(new RandomForestModel());
      
      expect(registry.hasModel('RandomForest')).toBe(true);
      expect(registry.unregister('RandomForest')).toBe(true);
      expect(registry.hasModel('RandomForest')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all models', () => {
      registry.register(new RandomForestModel());
      registry.register(new XGBoostModel());
      registry.register(new LSTMModel());
      
      expect(registry.getModels()).toHaveLength(3);
      
      registry.clear();
      
      expect(registry.getModels()).toHaveLength(0);
    });
  });
});
