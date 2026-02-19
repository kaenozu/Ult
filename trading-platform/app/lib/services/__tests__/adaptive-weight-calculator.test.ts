import { AdaptiveWeightCalculator } from '../adaptive-weight-calculator';
import { MarketRegime } from '../market-regime-detector';

describe('AdaptiveWeightCalculator', () => {
  it('should return weights that sum to 1', () => {
    const calculator = new AdaptiveWeightCalculator();
    const regime: MarketRegime = {
      type: 'TRENDING_UP',
      volatilityLevel: 'NORMAL',
      trendStrength: 50,
      momentumQuality: 50
    };
    const weights = calculator.calculate(regime);
    expect(weights.RF + weights.XGB + weights.LSTM).toBeCloseTo(1, 2);
  });

  it('should favor XGB in TRENDING_UP', () => {
    const calculator = new AdaptiveWeightCalculator();
    const regime: MarketRegime = {
      type: 'TRENDING_UP',
      volatilityLevel: 'NORMAL',
      trendStrength: 50,
      momentumQuality: 50
    };
    const weights = calculator.calculate(regime);
    expect(weights.XGB).toBeGreaterThan(weights.LSTM);
  });

  it('should favor LSTM in VOLATILE', () => {
    const calculator = new AdaptiveWeightCalculator();
    const regime: MarketRegime = {
      type: 'VOLATILE',
      volatilityLevel: 'HIGH',
      trendStrength: 50,
      momentumQuality: 50
    };
    const weights = calculator.calculate(regime);
    expect(weights.LSTM).toBeGreaterThan(0.35);
  });

  it('should favor RF in RANGING', () => {
    const calculator = new AdaptiveWeightCalculator();
    const regime: MarketRegime = {
      type: 'RANGING',
      volatilityLevel: 'LOW',
      trendStrength: 20,
      momentumQuality: 30
    };
    const weights = calculator.calculate(regime);
    expect(weights.RF).toBeGreaterThan(0.40);
  });
});
