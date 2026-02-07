import { optimizeParameters } from './analysis';
import { OHLCV } from '@/app/types';

describe('optimizeParameters Correctness', () => {
  const generateData = (): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    // Generate deterministic pattern
    for (let i = 0; i < 200; i++) {
      // Sine wave pattern
      price = 100 + Math.sin(i / 10) * 10;
      data.push({
        date: `2020-01-${(i % 30) + 1}`,
        open: price,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 1000,
      });
    }
    return data;
  };

  it('returns consistent parameters for known data', () => {
    const data = generateData();
    const result = optimizeParameters(data, 'usa');

    // We snapshot the result to ensure it doesn't change
    expect(result).toMatchInlineSnapshot({
  rsiPeriod: 10,
  smaPeriod: 10,
  accuracy: 0
}, `
{
  "accuracy": 0,
  "rsiPeriod": 10,
  "smaPeriod": 10,
}
`);

    // Also sanity check
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.rsiPeriod).toBeGreaterThan(0);
    expect(result.smaPeriod).toBeGreaterThan(0);
  });
});
