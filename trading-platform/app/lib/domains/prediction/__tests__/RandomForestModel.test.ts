/**
 * Tests for RandomForestModel
 */

import { RandomForestModel } from '../RandomForestModel';
import { PredictionFeatures } from '../../../../lib/services/feature-engineering-service';

describe('RandomForestModel', () => {
  let model: RandomForestModel;
  let baseFeatures: PredictionFeatures;

  beforeEach(() => {
    model = new RandomForestModel();
    
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
    expect(model.name).toBe('RandomForest');
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

  it('should incorporate positive SMA signals', () => {
    const positiveSMA: PredictionFeatures = { ...baseFeatures, sma5: 5, sma20: 3 };
    const noSMA: PredictionFeatures = { ...baseFeatures, sma5: 0, sma20: 0 };
    
    const positiveResult = model.predict(positiveSMA);
    const neutralResult = model.predict(noSMA);
    
    expect(positiveResult).toBeGreaterThan(neutralResult);
  });

  it('should respond to strong positive momentum', () => {
    const strongMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: 3 };
    const result = model.predict(strongMomentum);
    
    expect(result).toBeGreaterThan(0);
  });

  it('should respond to strong negative momentum', () => {
    const strongMomentum: PredictionFeatures = { ...baseFeatures, priceMomentum: -3 };
    const result = model.predict(strongMomentum);
    
    expect(result).toBeLessThan(0);
  });

  it('should scale predictions appropriately', () => {
    const extremeFeatures: PredictionFeatures = {
      ...baseFeatures,
      rsi: 10,
      sma5: 10,
      sma20: 10,
      priceMomentum: 10
    };
    
    const result = model.predict(extremeFeatures);
    
    // With RF_SCALING of 0.8, result should be scaled
    expect(Math.abs(result)).toBeLessThan(20);
  });
});
