/**
 * Test Fixtures for ML Model Service
 * 
 * Provides reusable test data and factory functions for tests
 */

describe('TestDataFactory', () => {
  test('should create base features', () => {
    const features = createBaseFeatures();
    expect(features).toHaveProperty('rsi');
    expect(features).toHaveProperty('sma20');
    expect(features.rsi).toBe(50);
  });

  test('should create bullish features', () => {
    const features = createBullishFeatures();
    expect(features.rsi).toBe(15);
    expect(features.volumeRatio).toBe(1.5);
  });
});

import { PredictionFeatures } from '../../feature-calculation-service';
import { ModelTrainingData } from '../../tensorflow-model-service';

/**
 * Factory for creating base prediction features
 */
export function createBaseFeatures(overrides?: Partial<PredictionFeatures>): PredictionFeatures {
  return {
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
    ...overrides
  };
}

/**
 * Factory for creating bullish features
 */
export function createBullishFeatures(): PredictionFeatures {
  return createBaseFeatures({
    rsi: 15,
    rsiChange: -5,
    sma5: 5,
    sma20: 3,
    sma50: 2,
    priceMomentum: 5,
    volumeRatio: 1.5,
    macdSignal: 2,
    bollingerPosition: 20
  });
}

/**
 * Factory for creating bearish features
 */
export function createBearishFeatures(): PredictionFeatures {
  return createBaseFeatures({
    rsi: 85,
    rsiChange: 5,
    sma5: -5,
    sma20: -3,
    sma50: -2,
    priceMomentum: -5,
    volumeRatio: 0.8,
    macdSignal: -2,
    bollingerPosition: 80
  });
}

/**
 * Factory for creating neutral features
 */
export function createNeutralFeatures(): PredictionFeatures {
  return createBaseFeatures();
}

/**
 * Factory for creating extreme features
 */
export function createExtremeFeatures(): PredictionFeatures {
  return createBaseFeatures({
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
  });
}

/**
 * Factory for creating training data
 */
export function createTrainingData(size = 100): ModelTrainingData {
  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = 0; i < size; i++) {
    // Generate random features
    const featureVector = [
      Math.random(),      // rsi
      Math.random() - 0.5, // rsiChange
      Math.random() - 0.5, // sma5
      Math.random() - 0.5, // sma20
      Math.random() - 0.5, // sma50
      Math.random() - 0.5, // priceMomentum
      Math.random() + 0.5, // volumeRatio
      Math.random() * 0.05, // volatility
      Math.random() - 0.5, // macdSignal
      Math.random(),      // bollingerPosition
      Math.random() * 0.5 // atrPercent
    ];
    features.push(featureVector);

    // Generate label (simple linear combination for testing)
    const label = featureVector.reduce((sum, val) => sum + val, 0) / featureVector.length;
    labels.push(label);
  }

  return { features, labels };
}

/**
 * Factory for creating mock model weights
 */
export function createMockWeights() {
  return {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30
  };
}
