/**
 * Tests for PredictionServiceFactory
 */

import { PredictionServiceFactory } from '../PredictionServiceFactory';
import { IModel } from '../interfaces';
import { PredictionFeatures } from '../../../../lib/services/feature-engineering-service';

describe('PredictionServiceFactory', () => {
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
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

  describe('createDefault', () => {
    it('should create service with default models and weights', () => {
      const service = PredictionServiceFactory.createDefault();
      
      expect(service).toBeDefined();
      expect(service.getModelRegistry().getModels()).toHaveLength(3);
    });

    it('should register RandomForest, XGBoost, and LSTM models', () => {
      const service = PredictionServiceFactory.createDefault();
      const registry = service.getModelRegistry();
      
      expect(registry.hasModel('RandomForest')).toBe(true);
      expect(registry.hasModel('XGBoost')).toBe(true);
      expect(registry.hasModel('LSTM')).toBe(true);
    });

    it('should use default weights (0.35, 0.35, 0.30)', () => {
      const service = PredictionServiceFactory.createDefault();
      const result = service.predict(baseFeatures);
      
      const expectedEnsemble = 
        result.rfPrediction * 0.35 + 
        result.xgbPrediction * 0.35 + 
        result.lstmPrediction * 0.30;
      
      expect(result.ensemblePrediction).toBeCloseTo(expectedEnsemble, 5);
    });

    it('should return valid predictions', () => {
      const service = PredictionServiceFactory.createDefault();
      const result = service.predict(baseFeatures);
      
      expect(result).toHaveProperty('rfPrediction');
      expect(result).toHaveProperty('xgbPrediction');
      expect(result).toHaveProperty('lstmPrediction');
      expect(result).toHaveProperty('ensemblePrediction');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('createWithWeights', () => {
    it('should create service with custom weights', () => {
      const customWeights = {
        'RandomForest': 0.5,
        'XGBoost': 0.3,
        'LSTM': 0.2,
      };
      
      const service = PredictionServiceFactory.createWithWeights(customWeights);
      const result = service.predict(baseFeatures);
      
      const expectedEnsemble = 
        result.rfPrediction * 0.5 + 
        result.xgbPrediction * 0.3 + 
        result.lstmPrediction * 0.2;
      
      expect(result.ensemblePrediction).toBeCloseTo(expectedEnsemble, 5);
    });

    it('should still register all default models', () => {
      const service = PredictionServiceFactory.createWithWeights({
        'RandomForest': 0.5,
        'XGBoost': 0.5,
      });
      
      const registry = service.getModelRegistry();
      expect(registry.getModels()).toHaveLength(3);
    });
  });

  describe('createWithModels', () => {
    it('should create service with custom models', () => {
      class CustomModel implements IModel {
        readonly name = 'Custom';
        predict(_features: PredictionFeatures): number {
          return 42;
        }
      }
      
      const customModels = [new CustomModel()];
      const service = PredictionServiceFactory.createWithModels(customModels);
      
      const registry = service.getModelRegistry();
      expect(registry.getModels()).toHaveLength(1);
      expect(registry.hasModel('Custom')).toBe(true);
    });

    it('should use equal weights when not specified', () => {
      class Model1 implements IModel {
        readonly name = 'Model1';
        predict(_features: PredictionFeatures): number {
          return 10;
        }
      }
      
      class Model2 implements IModel {
        readonly name = 'Model2';
        predict(_features: PredictionFeatures): number {
          return 20;
        }
      }
      
      const models = [new Model1(), new Model2()];
      const service = PredictionServiceFactory.createWithModels(models);
      const result = service.predict(baseFeatures);
      
      // Expected: (10 + 20) / 2 = 15
      expect(result.ensemblePrediction).toBeCloseTo(15, 5);
    });

    it('should use custom weights when specified', () => {
      class Model1 implements IModel {
        readonly name = 'Model1';
        predict(_features: PredictionFeatures): number {
          return 10;
        }
      }
      
      class Model2 implements IModel {
        readonly name = 'Model2';
        predict(_features: PredictionFeatures): number {
          return 20;
        }
      }
      
      const models = [new Model1(), new Model2()];
      const weights = {
        'Model1': 0.3,
        'Model2': 0.7,
      };
      const service = PredictionServiceFactory.createWithModels(models, weights);
      const result = service.predict(baseFeatures);
      
      // Expected: 10*0.3 + 20*0.7 = 3 + 14 = 17
      expect(result.ensemblePrediction).toBeCloseTo(17, 5);
    });

    it('should handle single model', () => {
      class SingleModel implements IModel {
        readonly name = 'Single';
        predict(_features: PredictionFeatures): number {
          return 100;
        }
      }
      
      const service = PredictionServiceFactory.createWithModels([new SingleModel()]);
      const result = service.predict(baseFeatures);
      
      expect(result.ensemblePrediction).toBe(100);
    });
  });
});
