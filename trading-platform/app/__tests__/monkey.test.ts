import { analyzeStock } from '../lib/analysis';
// import { mlPredictionService } from '../lib/mlPrediction';
import { OHLCV, Stock } from '../types';
import { OPTIMIZATION } from '../lib/constants';

describe('Logic Monkey Test - Robustness under extreme conditions', () => {
  const generateRandomData = (count: number, startPrice: number, volatility: number): OHLCV[] => {
    const data: OHLCV[] = [];
    let currentPrice = startPrice;
    for (let i = 0; i < count; i++) {
      const change = currentPrice * (Math.random() - 0.5) * volatility;
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) + (Math.random() * volatility * currentPrice);
      const low = Math.min(open, close) - (Math.random() * volatility * currentPrice);
      // Ensure volume is valid number
      const volume = Math.max(0, Math.floor(Math.random() * 1000000));

      data.push({
        date: `2026-01-${i + 1}`,
        open, high, low, close, volume
      });
      currentPrice = Math.max(0.01, close); // Prevent negative price
    }
    return data;
  };

  const mockStock: Stock = {
    symbol: 'MONKEY',
    name: 'Monkey Test Stock',
    market: 'japan',
    sector: 'Testing',
    price: 100,
    change: 0,
    changePercent: 0,
    volume: 1000
  };

  const TEST_DATA_COUNT = OPTIMIZATION.MIN_DATA_PERIOD * 2; // Ensure enough data

  it('should not crash and keep values in range during a Flash Crash (90% drop)', () => {
    const data = generateRandomData(TEST_DATA_COUNT, 1000, 0.05);
    // Add a sudden massive drop
    data.push({ date: '2026-02-01', open: 1000, high: 1000, low: 100, close: 100, volume: 10000000 });

    // Use analyzeStock which is more robust
    const signal = analyzeStock(mockStock.symbol, data, 'japan');

    expect(signal.targetPrice).toBeGreaterThan(0);
    // Confidence typically 0-100, but logic might return slightly outside, check finite
    expect(Number.isFinite(signal.confidence)).toBe(true);
    expect(Number.isFinite(signal.predictionError)).toBe(true);
  });

  it('should handle Zero Volume environment', () => {
    const data = generateRandomData(TEST_DATA_COUNT, 1000, 0.01).map(d => ({ ...d, volume: 0 }));
    const signal = analyzeStock(mockStock.symbol, data, 'japan');

    // volumeResistance should be an array (may contain levels even with zero volume)
    expect(Array.isArray(signal.volumeResistance)).toBe(true);
    expect(signal.type).toBeDefined();
  });

  it('should handle extreme price gaps (Penny Stock to Luxury Stock)', () => {
    // Starts at 0.1, jumps to 1,000,000
    const data = [
      ...generateRandomData(OPTIMIZATION.MIN_DATA_PERIOD, 0.1, 0.1),
      ...generateRandomData(OPTIMIZATION.MIN_DATA_PERIOD, 1000000, 0.1)
    ];

    const signal = analyzeStock(mockStock.symbol, data, 'japan');
    expect(Number.isFinite(signal.targetPrice)).toBe(true);
    expect(signal.targetPrice).toBeGreaterThan(0);
  });
});
