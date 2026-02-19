import { ResultAnalyzer } from '../result-analyzer';
import { Signal } from '@/app/types';

describe('ResultAnalyzer', () => {
  const createMockSignal = (overrides: Partial<Signal> = {}): Signal => ({
    symbol: 'TEST',
    type: 'BUY',
    confidence: 0.7,
    targetPrice: 100,
    stopLoss: 95,
    reason: 'Test',
    predictedChange: 5,
    predictionDate: new Date().toISOString(),
    ...overrides,
  });

  it('should analyze empty signals', () => {
    const analyzer = new ResultAnalyzer();
    const result = analyzer.analyze([]);
    expect(result.totalSignals).toBe(0);
    expect(result.hitRate).toBe(0);
  });

  it('should calculate hit rate correctly', () => {
    const analyzer = new ResultAnalyzer();
    const signals: Signal[] = [
      createMockSignal({ result: 'HIT', actualReturn: 5 }),
      createMockSignal({ result: 'MISS', actualReturn: -3 }),
      createMockSignal({ result: 'HIT', actualReturn: 2 }),
    ];
    const result = analyzer.analyze(signals);
    expect(result.hitRate).toBeCloseTo(66.67, 1);
  });

  it('should calculate average return', () => {
    const analyzer = new ResultAnalyzer();
    const signals: Signal[] = [
      createMockSignal({ result: 'HIT', actualReturn: 5 }),
      createMockSignal({ result: 'MISS', actualReturn: -3 }),
    ];
    const result = analyzer.analyze(signals);
    expect(result.avgReturn).toBe(1);
  });

  it('should ignore PENDING signals', () => {
    const analyzer = new ResultAnalyzer();
    const signals: Signal[] = [
      createMockSignal({ result: 'HIT', actualReturn: 5 }),
      createMockSignal({ result: 'PENDING' }),
    ];
    const result = analyzer.analyze(signals);
    expect(result.evaluatedSignals).toBe(1);
    expect(result.hitRate).toBe(100);
  });

  it('should analyze by type', () => {
    const analyzer = new ResultAnalyzer();
    const signals: Signal[] = [
      createMockSignal({ type: 'BUY', result: 'HIT', actualReturn: 5 }),
      createMockSignal({ type: 'BUY', result: 'MISS', actualReturn: -3 }),
      createMockSignal({ type: 'SELL', result: 'HIT', actualReturn: -2 }),
    ];
    const result = analyzer.analyze(signals);
    expect(result.byType.BUY.total).toBe(2);
    expect(result.byType.BUY.hits).toBe(1);
    expect(result.byType.SELL.total).toBe(1);
  });

  it('should analyze by confidence level', () => {
    const analyzer = new ResultAnalyzer();
    const signals: Signal[] = [
      createMockSignal({ confidence: 0.8, result: 'HIT', actualReturn: 5 }),
      createMockSignal({ confidence: 0.6, result: 'MISS', actualReturn: -3 }),
      createMockSignal({ confidence: 0.4, result: 'HIT', actualReturn: 2 }),
    ];
    const result = analyzer.analyze(signals);
    expect(result.byConfidence.high.total).toBe(1);
    expect(result.byConfidence.medium.total).toBe(1);
    expect(result.byConfidence.low.total).toBe(1);
  });

  it('should generate recommendations', () => {
    const analyzer = new ResultAnalyzer();
    const signals: Signal[] = [
      createMockSignal({ confidence: 0.8, result: 'HIT', actualReturn: 5 }),
      createMockSignal({ confidence: 0.8, result: 'HIT', actualReturn: 3 }),
      createMockSignal({ confidence: 0.4, result: 'MISS', actualReturn: -3 }),
    ];
    const analysis = analyzer.analyze(signals);
    const recommendations = analyzer.getRecommendations(analysis);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
