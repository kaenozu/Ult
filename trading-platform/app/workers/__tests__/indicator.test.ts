/**
 * Worker ロジックの直接テスト
 */
import { calculateIndicatorsSync } from '../indicator-logic';

describe('Indicator Worker Logic', () => {
  it('should calculate technical indicators correctly', () => {
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      date: `2023-01-${i + 1}`,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
      volume: 1000
    }));

    const result = calculateIndicatorsSync(mockData as any);
    
    expect(result).toHaveProperty('rsi');
    expect(result).toHaveProperty('macd');
    expect(result).toHaveProperty('sma20');
    expect(result.rsi.length).toBeGreaterThan(0);
  });
});
