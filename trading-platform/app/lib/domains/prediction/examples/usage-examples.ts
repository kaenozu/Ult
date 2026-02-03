/**
 * Example: Using the new Prediction Domain Layer
 * 
 * This file demonstrates various ways to use the refactored prediction service
 */

import {
  PredictionServiceFactory,
  PredictionService,
  ModelRegistry,
  RandomForestModel,
  XGBoostModel,
  LSTMModel,
  WeightedAverageStrategy,
  ConfidenceEvaluator,
  IModel,
} from '../index';
import { PredictionFeatures } from '../../../services/feature-calculation-service';

// ============================================================================
// Example 1: Basic Usage with Default Configuration
// ============================================================================
function example1_DefaultUsage() {
  // Create a service with default configuration
  // - RandomForest, XGBoost, LSTM models
  // - Default weights: RF=0.35, XGB=0.35, LSTM=0.30
  const service = PredictionServiceFactory.createDefault();

  // Sample features
  const features: PredictionFeatures = {
    rsi: 45,
    rsiChange: -5,
    sma5: 2,
    sma20: 1.5,
    sma50: 1,
    priceMomentum: 3.5,
    volumeRatio: 1.2,
    volatility: 0.02,
    macdSignal: 1.5,
    bollingerPosition: 45,
    atrPercent: 2.5,
  };

  // Make prediction
  const prediction = service.predict(features);
  
    rf: prediction.rfPrediction,
    xgb: prediction.xgbPrediction,
    lstm: prediction.lstmPrediction,
    ensemble: prediction.ensemblePrediction,
    confidence: prediction.confidence,
  });
}

// ============================================================================
// Example 2: Custom Weights
// ============================================================================
function example2_CustomWeights() {
  // Create service with custom model weights
  // Give more weight to Random Forest
  const service = PredictionServiceFactory.createWithWeights({
    'RandomForest': 0.5,
    'XGBoost': 0.3,
    'LSTM': 0.2,
  });

  const features: PredictionFeatures = {
    rsi: 70,
    rsiChange: 5,
    sma5: -2,
    sma20: -1,
    sma50: 0,
    priceMomentum: -2.5,
    volumeRatio: 0.9,
    volatility: 0.03,
    macdSignal: -1,
    bollingerPosition: 65,
    atrPercent: 3.0,
  };

  const prediction = service.predict(features);
  
}

// ============================================================================
// Example 3: Creating a Custom Model
// ============================================================================
class CustomMomentumModel implements IModel {
  readonly name = 'CustomMomentum';

  predict(features: PredictionFeatures): number {
    // Simple momentum-based model
    const momentumScore = features.priceMomentum * 0.7;
    const rsiScore = (50 - features.rsi) * 0.1; // Contrarian
    const volumeScore = (features.volumeRatio - 1) * 2;
    
    return momentumScore + rsiScore + volumeScore;
  }
}

function example3_CustomModel() {
  // Create service with custom model
  const customModel = new CustomMomentumModel();
  const service = PredictionServiceFactory.createWithModels(
    [customModel],
    { 'CustomMomentum': 1.0 }
  );

  const features: PredictionFeatures = {
    rsi: 55,
    rsiChange: 0,
    sma5: 1,
    sma20: 0.5,
    sma50: 0,
    priceMomentum: 4,
    volumeRatio: 1.3,
    volatility: 0.025,
    macdSignal: 1,
    bollingerPosition: 52,
    atrPercent: 2.2,
  };

  const prediction = service.predict(features);
  
}

// ============================================================================
// Example 4: Mixing Default and Custom Models
// ============================================================================
function example4_MixedModels() {
  // Use default models plus a custom one
  const registry = new ModelRegistry();
  registry.register(new RandomForestModel());
  registry.register(new XGBoostModel());
  registry.register(new LSTMModel());
  registry.register(new CustomMomentumModel());

  const strategy = new WeightedAverageStrategy({
    'RandomForest': 0.25,
    'XGBoost': 0.25,
    'LSTM': 0.25,
    'CustomMomentum': 0.25,
  });

  const evaluator = new ConfidenceEvaluator();

  const service = new PredictionService(registry, strategy, evaluator);

  const features: PredictionFeatures = {
    rsi: 30,
    rsiChange: -10,
    sma5: 3,
    sma20: 2,
    sma50: 1.5,
    priceMomentum: 5,
    volumeRatio: 1.5,
    volatility: 0.02,
    macdSignal: 2,
    bollingerPosition: 30,
    atrPercent: 2.8,
  };

  const prediction = service.predict(features);
  
}

// ============================================================================
// Example 5: Dynamic Weight Adjustment
// ============================================================================
function example5_DynamicWeights() {
  // Start with default weights
  const service = PredictionServiceFactory.createDefault();
  const strategy = service.getEnsembleStrategy() as WeightedAverageStrategy;

  const features: PredictionFeatures = {
    rsi: 50,
    rsiChange: 0,
    sma5: 0,
    sma20: 0,
    sma50: 0,
    priceMomentum: 2,
    volumeRatio: 1.0,
    volatility: 0.02,
    macdSignal: 0,
    bollingerPosition: 50,
    atrPercent: 2.0,
  };

  // Make initial prediction

  // Adjust weights based on some logic (e.g., recent performance)
  strategy.setWeight('RandomForest', 0.5);
  strategy.setWeight('XGBoost', 0.3);
  strategy.setWeight('LSTM', 0.2);

  // Make prediction with new weights
}

// ============================================================================
// Example 6: Model Registry Operations
// ============================================================================
function example6_RegistryOperations() {
  const registry = new ModelRegistry();

  // Register models
  registry.register(new RandomForestModel());
  registry.register(new XGBoostModel());

  // Check if model exists

  // Get specific model
  const rfModel = registry.getModel('RandomForest');
  if (rfModel) {
    const features: PredictionFeatures = {
      rsi: 40,
      rsiChange: 0,
      sma5: 1,
      sma20: 0,
      sma50: 0,
      priceMomentum: 2,
      volumeRatio: 1.0,
      volatility: 0.02,
      macdSignal: 0,
      bollingerPosition: 50,
      atrPercent: 2.0,
    };
  }

  // Unregister a model
  registry.unregister('XGBoost');

  // Clear all models
  registry.clear();
}

// ============================================================================
// Example 7: Testing with Mocks
// ============================================================================
class MockModel implements IModel {
  readonly name = 'Mock';
  private readonly returnValue: number;

  constructor(returnValue: number) {
    this.returnValue = returnValue;
  }

  predict(_features: PredictionFeatures): number {
    return this.returnValue;
  }
}

function example7_TestingWithMocks() {
  // Create mock models for testing
  const mockRegistry = new ModelRegistry();
  mockRegistry.register(new MockModel(5));

  const mockStrategy = new WeightedAverageStrategy({ 'Mock': 1.0 });
  const mockEvaluator = new ConfidenceEvaluator();

  const service = new PredictionService(mockRegistry, mockStrategy, mockEvaluator);

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
    atrPercent: 2.0,
  };

  const prediction = service.predict(features);
  
}

// Run all examples
export function runAllExamples(): void {
  example1_DefaultUsage();

  example2_CustomWeights();

  example3_CustomModel();

  example4_MixedModels();

  example5_DynamicWeights();

  example6_RegistryOperations();

  example7_TestingWithMocks();
}
