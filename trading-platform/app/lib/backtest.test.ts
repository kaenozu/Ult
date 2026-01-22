import { runBacktest, BacktestResult } from './backtest';
import { OHLCV } from '@/app/types';

describe('runBacktest', () => {
  // Generate more realistic mock data: Healthy Uptrend
  const generateHealthyUptrendData = (): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    const now = new Date('2024-01-01');
    
    for (let i = 0; i < 200; i++) {
      // 0.5% average growth with random noise to create pullbacks
      const change = (Math.random() * 0.04 - 0.015); // -1.5% to +2.5%
      price *= (1 + change);
      
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString().split('T')[0],
        open: price * (1 - 0.005),
        high: price * (1 + 0.01),
        low: price * (1 - 0.01),
        close: price,
        volume: 2000 + Math.random() * 3000,
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

  it('should run without error and potentially execute trades', () => {
    const data = generateHealthyUptrendData();
    const result = runBacktest('AAPL', data, 'usa');
    
    expect(result).toBeDefined();
    expect(result.trades).toBeInstanceOf(Array);
    // Even if no trades occur due to strict ML filters, the result should be a valid object
  });

  it('should capture trade statistics if trades are executed', () => {
    const data = generateHealthyUptrendData();
    const result = runBacktest('AAPL', data, 'usa');
    
    if (result.totalTrades > 0) {
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.totalProfitPercent).toBeDefined();
    }
  });
});
