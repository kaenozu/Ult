/**
 * Tests for MLModelService with Dependency Injection
 * 
 * Demonstrates improved testability with mocked dependencies
 */

import { MLModelService } from '../ml-model-service';
import { PredictionCalculator } from '../implementations/prediction-calculator';
import { MockTensorFlowModel } from './mocks/mock-tensorflow-model';
import {
  createBaseFeatures,
  createBullishFeatures,
  createBearishFeatures,
  createTrainingData
} from './fixtures/test-data-factory.util';

describe('MLModelService with Dependency Injection', () => {
  describe('constructor and initialization', () => {
    it('should create service with default dependencies', () => {
      const service = new MLModelService();
      expect(service).toBeDefined();
      expect(service.isTensorFlowEnabled()).toBe(false);
    });

    it('should accept custom prediction calculator', () => {
      const customCalculator = new PredictionCalculator();
      const service = new MLModelService(customCalculator);
      
      // Service should use the injected calculator
      const features = createBullishFeatures();
      const result = service.predict(features);
      
      expect(result).toBeDefined();
      expect(result.rfPrediction).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config = {
        weights: { RF: 0.4, XGB: 0.4, LSTM: 0.2 },
        useTensorFlowModels: false
      };
      
      const service = new MLModelService(undefined, undefined, config);
      expect(service).toBeDefined();
    });
  });

  describe('predict with injected calculator', () => {
    let service: MLModelService;

    beforeEach(() => {
      service = new MLModelService();
    });

    it('should use injected calculator for predictions', () => {
      const features = createBaseFeatures();
      const result = service.predict(features);
      
      expect(result).toHaveProperty('rfPrediction');
      expect(result).toHaveProperty('xgbPrediction');
      expect(result).toHaveProperty('lstmPrediction');
      expect(result).toHaveProperty('ensemblePrediction');
      expect(result).toHaveProperty('confidence');
    });

    it('should return bullish prediction for bullish features', () => {
      const features = createBullishFeatures();
      const result = service.predict(features);
      
      expect(result.ensemblePrediction).toBeGreaterThan(0);
    });

    it('should return bearish prediction for bearish features', () => {
      const features = createBearishFeatures();
      const result = service.predict(features);
      
      expect(result.ensemblePrediction).toBeLessThan(0);
    });

    it('should calculate ensemble as weighted average', () => {
      const features = createBaseFeatures();
      const result = service.predict(features);
      
      const expectedEnsemble = 
        result.rfPrediction * 0.35 + 
        result.xgbPrediction * 0.35 + 
        result.lstmPrediction * 0.30;
      
      expect(result.ensemblePrediction).toBeCloseTo(expectedEnsemble, 5);
    });

    it('should maintain confidence in valid range', () => {
      const features = createBaseFeatures();
      const result = service.predict(features);
      
      expect(result.confidence).toBeGreaterThanOrEqual(50);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });
  });

  describe('predictAsync with fallback', () => {
    it('should fallback to rule-based when TensorFlow not enabled', async () => {
      const service = new MLModelService();
      const features = createBaseFeatures();
      
      const result = await service.predictAsync(features);
      
      expect(result).toBeDefined();
      expect(result.ensemblePrediction).toBeDefined();
    });

    it('should return same result as predict when TensorFlow disabled', async () => {
      const service = new MLModelService();
      const features = createBaseFeatures();
      
      const syncResult = service.predict(features);
      const asyncResult = await service.predictAsync(features);
      
      expect(asyncResult.rfPrediction).toBe(syncResult.rfPrediction);
      expect(asyncResult.xgbPrediction).toBe(syncResult.xgbPrediction);
      expect(asyncResult.lstmPrediction).toBe(syncResult.lstmPrediction);
    });
  });

  describe('model training and management', () => {
    it('should initialize TensorFlow models on training', async () => {
      const service = new MLModelService();
      const trainingData = createTrainingData(50);
      
      expect(service.isTensorFlowEnabled()).toBe(false);
      
      const metrics = await service.trainModels(trainingData, 10);
      
      expect(metrics.ff).toBeDefined();
      expect(metrics.gru).toBeDefined();
      expect(metrics.lstm).toBeDefined();
      expect(service.isTensorFlowEnabled()).toBe(true);
    });

    it('should return model metrics after training', async () => {
      const service = new MLModelService();
      const trainingData = createTrainingData(50);
      
      const metrics = await service.trainModels(trainingData, 10);
      
      expect(metrics.ff.mae).toBeDefined();
      expect(metrics.ff.rmse).toBeDefined();
      expect(metrics.ff.accuracy).toBeDefined();
    });

    it('should save trained models', async () => {
      const service = new MLModelService();
      const trainingData = createTrainingData(50);
      
      await service.trainModels(trainingData, 10);
      
      // Should not throw
      await expect(service.saveModels()).resolves.not.toThrow();
    });

    it('should get model metrics', async () => {
      const service = new MLModelService();
      const trainingData = createTrainingData(50);
      
      await service.trainModels(trainingData, 10);
      const metrics = service.getModelMetrics();
      
      expect(metrics.ff).toBeDefined();
      expect(metrics.gru).toBeDefined();
      expect(metrics.lstm).toBeDefined();
    });
  });

  describe('isolation and testability', () => {
    it('should allow testing prediction logic independently', () => {
      const calculator = new PredictionCalculator();
      const features = createBullishFeatures();
      
      // Test calculator in isolation
      const rf = calculator.calculateRandomForest(features);
      const xgb = calculator.calculateXGBoost(features);
      const lstm = calculator.calculateLSTM(features);
      
      expect(rf).toBeGreaterThan(0);
      expect(xgb).toBeGreaterThan(0);
      expect(lstm).toBeGreaterThan(0);
    });

    it('should allow mocking calculator for service tests', () => {
      // Create a mock calculator that returns predictable values
      const mockCalculator: any = {
        calculateRandomForest: jest.fn(() => 1.0),
        calculateXGBoost: jest.fn(() => 2.0),
        calculateLSTM: jest.fn(() => 3.0),
        calculateEnsemble: jest.fn((rf, xgb, lstm) => (rf + xgb + lstm) / 3),
        calculateConfidence: jest.fn(() => 75.0)
      };
      
      const service = new MLModelService(mockCalculator);
      const features = createBaseFeatures();
      const result = service.predict(features);
      
      // Verify mock was called
      expect(mockCalculator.calculateRandomForest).toHaveBeenCalledWith(features);
      expect(mockCalculator.calculateXGBoost).toHaveBeenCalledWith(features);
      expect(mockCalculator.calculateLSTM).toHaveBeenCalledWith(features);
      
      // Verify result uses mocked values
      expect(result.rfPrediction).toBe(1.0);
      expect(result.xgbPrediction).toBe(2.0);
      expect(result.lstmPrediction).toBe(3.0);
      expect(result.confidence).toBe(75.0);
    });

    it('should allow testing without external dependencies', () => {
      // Create service with all dependencies injected
      const calculator = new PredictionCalculator();
      const service = new MLModelService(calculator);
      
      // No external API calls or file I/O
      const features = createBullishFeatures();
      const result = service.predict(features);
      
      // Predictions are deterministic and fast
      expect(result).toBeDefined();
      expect(typeof result.ensemblePrediction).toBe('number');
    });
  });

  describe('backward compatibility', () => {
    it('should maintain same prediction behavior as before refactoring', () => {
      const service = new MLModelService();
      const features = createBullishFeatures();
      
      const result = service.predict(features);
      
      // Should maintain same structure
      expect(result).toHaveProperty('rfPrediction');
      expect(result).toHaveProperty('xgbPrediction');
      expect(result).toHaveProperty('lstmPrediction');
      expect(result).toHaveProperty('ensemblePrediction');
      expect(result).toHaveProperty('confidence');
      
      // Should maintain same logic
      expect(result.ensemblePrediction).toBeGreaterThan(0); // Bullish
      expect(result.confidence).toBeGreaterThanOrEqual(50);
    });

    it('should maintain singleton export behavior', () => {
      const { mlModelService } = require('../ml-model-service');
      expect(mlModelService).toBeDefined();
      expect(mlModelService.predict).toBeDefined();
    });
  });
});
