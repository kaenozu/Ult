import { ConfidenceScorer } from '../confidence-scorer';
import { Signal } from '@/app/types/signal';

describe('ConfidenceScorer', () => {
  const createMockSignal = (overrides: Partial<Signal> = {}): Signal => ({
    symbol: 'TEST',
    type: 'BUY',
    confidence: 0.7,
    targetPrice: 100,
    stopLoss: 95,
    reason: 'Test signal',
    predictedChange: 5,
    predictionDate: new Date().toISOString(),
    timestamp: Date.now(),
    ...overrides
  });

  it('should return confidence between 0 and 100', () => {
    const scorer = new ConfidenceScorer();
    const signal = createMockSignal({ confidence: 0.7, accuracy: 55 });
    const result = scorer.score(signal, { trendStrength: 50 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should boost confidence with high accuracy', () => {
    const scorer = new ConfidenceScorer();
    const signalLow = createMockSignal({ confidence: 0.5, accuracy: 40 });
    const signalHigh = createMockSignal({ confidence: 0.5, accuracy: 70 });
    
    const low = scorer.score(signalLow, { trendStrength: 50 });
    const high = scorer.score(signalHigh, { trendStrength: 50 });
    
    expect(high).toBeGreaterThan(low);
  });

  it('should boost confidence with high trend strength', () => {
    const scorer = new ConfidenceScorer();
    const signal = createMockSignal({ confidence: 0.6 });
    
    const lowTrend = scorer.score(signal, { trendStrength: 30 });
    const highTrend = scorer.score(signal, { trendStrength: 70 });
    
    expect(highTrend).toBeGreaterThan(lowTrend);
  });

  it('should return HIGH for score > 70', () => {
    const scorer = new ConfidenceScorer();
    expect(scorer.getConfidenceLevel(75)).toBe('HIGH');
  });

  it('should return MEDIUM for score 50-70', () => {
    const scorer = new ConfidenceScorer();
    expect(scorer.getConfidenceLevel(60)).toBe('MEDIUM');
  });

  it('should return LOW for score < 50', () => {
    const scorer = new ConfidenceScorer();
    expect(scorer.getConfidenceLevel(40)).toBe('LOW');
  });
});
