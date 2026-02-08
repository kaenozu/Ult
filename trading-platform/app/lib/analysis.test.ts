import { calculateVolumeProfile, optimizeParameters } from './analysis';
import { OHLCV } from '../types';

describe('optimizeParameters', () => {
  const generateData = (): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    // Generate a sine wave pattern so RSI swings
    for (let i = 0; i < 200; i++) {
      const angle = i * 0.1;
      price = 100 + Math.sin(angle) * 10;
      data.push({
        date: new Date(2020, 0, i + 1).toISOString().split('T')[0],
        open: price,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 1000
      });
    }
    return data;
  };

  const data = generateData();

  it('returns consistent results', () => {
    const result = optimizeParameters(data, 'usa');
    // Update snapshot inline
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
  });
});

describe('calculateVolumeProfile', () => {
  it('should identify the strongest price level as a wall', () => {
    const mockData: OHLCV[] = [
      { date: '2026-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 },
      { date: '2026-01-02', open: 100, high: 105, low: 95, close: 100, volume: 5000 }, // Heavy volume here
      { date: '2026-01-03', open: 120, high: 125, low: 115, close: 120, volume: 1000 },
    ];

    const profile = calculateVolumeProfile(mockData);

    // Find the wall closest to 100
    const wallAt100 = profile.find(p => Math.abs(p.price - 100) < 5);
    expect(wallAt100).toBeDefined();
    expect(wallAt100?.strength).toBe(1); // 5000 is the max volume
  });

  it('should distribute volume across price range (High to Low)', () => {
    const mockData: OHLCV[] = [
      {
        date: '2026-01-01',
        open: 100,
        high: 200,
        low: 100, // Bottom half
        close: 150,
        volume: 1000
      },
      {
        date: '2026-01-02',
        open: 100,
        high: 100,
        low: 0, // Top half
        close: 50,
        volume: 1000
      }
    ];

    const profile = calculateVolumeProfile(mockData);

    // Expect some walls to be found within the range
    expect(profile.length).toBeGreaterThan(0);
    // The max volume should have strength 1
    const maxStrength = Math.max(...profile.map(p => p.strength));
    expect(maxStrength).toBe(1.0);
  });

  it('should return empty array for empty input', () => {
    expect(calculateVolumeProfile([])).toEqual([]);
  });

  it('should handle zero volume gracefully', () => {
    const mockData: OHLCV[] = [
      { date: '2026-01-01', open: 100, high: 105, low: 95, close: 100, volume: 0 },
    ];
    const profile = calculateVolumeProfile(mockData);
    expect(profile).toEqual([]);
  });
});
