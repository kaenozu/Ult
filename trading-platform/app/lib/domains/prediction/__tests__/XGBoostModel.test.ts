/**
 * Tests for XGBoostModel
 */

import { XGBoostModel } from '../XGBoostModel';
import { PredictionFeatures } from '../../../services/feature-calculation-service';

describe('XGBoostModel', () => {
  let model: XGBoostModel;
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
    model = new XGBoostModel();
    
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
    expect(model.name).toBe('XGBoost');
  });

  it('should return positive prediction for oversold RSI', () => {
    const oversold: PredictionFeatures = { ...baseFeatures, rsi: 15 };
    const result = model.predict(oversold);
    
    expect(result).toBeGreaterThan(0);
  });

  it('should return negative prediction for overbought RSI', () => {
    const overbought: PredictionFeatures = { ...baseFeatures, rsi: 85 };
    const result = model.predict(overbought);
    
    expect(result).toBeLessThan(0);
  });

  it('should scale predictions appropriately', () => {
    const features: PredictionFeatures = {
      ...baseFeatures,
      rsi: 50,
      priceMomentum: 3,
      sma5: 2,
      sma20: 1
    };
    
    const result = model.predict(features);
    
    expect(Math.abs(result)).toBeLessThan(20);
  });

  it('should handle extreme momentum values', () => {
    const extremeMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 100 };
    const result = model.predict(extremeMomentum);
    
    expect(result).toBeDefined();
    expect(isFinite(result)).toBe(true);
  });

  it('should combine momentum and SMA signals', () => {
    const combined: PredictionFeatures = {
      ...baseFeatures,
      priceMomentum: 5,
      sma5: 3,
      sma20: 2
    };
    
    const momentum: PredictionFeatures = {
      ...baseFeatures,
      priceMomentum: 5,
      sma5: 0,
      sma20: 0
    };
    
    const combinedResult = model.predict(combined);
    const momentumResult = model.predict(momentum);
    
    // Combined should be higher due to additional SMA contribution
    expect(combinedResult).toBeGreaterThan(momentumResult);
  });
});
