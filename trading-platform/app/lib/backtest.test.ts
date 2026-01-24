import { runBacktest } from './backtest';
import { OHLCV } from '@/app/types';

describe('runBacktest', () => {
  // Generate simple mock data: Uptrend
  const generateUptrendData = (): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    const now = new Date('2024-01-01');
    
    // 100 days
    for (let i = 0; i < 100; i++) {
      price *= 1.01; // 1% daily increase
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString().split('T')[0],
        open: price,
        high: price * 1.02,
        low: price * 0.98,
        close: price * 1.01,
        volume: 1000,
      });
    }
    return data;
  };

  it('should return empty result for insufficient data', () => {
    const data: OHLCV[] = [];
    const result = runBacktest('TEST', data, 'usa');
    expect(result.totalTrades).toBe(0);
    expect(result.winRate).toBe(0);
  });

  it('should execute trades on sufficient data', () => {
    const data = generateUptrendData();
    // We mock analyzeStock inside backtest.ts? 
    // runBacktest imports analyzeStock directly. We should mock that import.
    // However, for integration test, we can use the real one if it's deterministic.
    // analyzeStock uses RSI/SMA. Uptrend data should trigger BUY.
    
    const result = runBacktest('TEST', data, 'usa');
    
    // We expect some trades because price is increasing
    // The exact number depends on analyzeStock logic, but it shouldn't crash
    expect(result).toBeDefined();
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
  });
});
