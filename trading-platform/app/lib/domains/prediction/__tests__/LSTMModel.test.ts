/**
 * Tests for LSTMModel
 */

import { LSTMModel } from '../LSTMModel';
import { PredictionFeatures } from '../../../../lib/services/feature-engineering-service';

describe('LSTMModel', () => {
  let model: LSTMModel;
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
    model = new LSTMModel();
    
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

  it('should have correct name', () => {
    expect(model.name).toBe('LSTM');
  });

  it('should be based on price momentum', () => {
    const positiveMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 5 };
    const negativeMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: -5 };
    
    const positiveResult = model.predict(positiveMomentum);
    const negativeResult = model.predict(negativeMomentum);
    
    expect(positiveResult).toBeGreaterThan(0);
    expect(negativeResult).toBeLessThan(0);
  });

  it('should scale momentum appropriately', () => {
    const momentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 10 };
    const result = model.predict(momentum);
    
    // With LSTM_SCALING of 0.6, result should be 6.0
    expect(result).toBeCloseTo(6.0, 2);
    expect(Math.abs(result)).toBeLessThan(Math.abs(momentum.priceMomentum));
  });

  it('should return zero for zero momentum', () => {
    const result = model.predict(baseFeatures);
    expect(result).toBe(0);
  });

  it('should handle large momentum values', () => {
    const largeMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 1000 };
    const result = model.predict(largeMomentum);
    
    expect(result).toBeCloseTo(600, 2);
  });
});
