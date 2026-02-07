import { accuracyService } from '../AccuracyService';
import { OHLCV, BacktestTrade } from '../../types';

describe('AccuracyService', () => {
  const generateMockData = (count: number, startPrice: number = 1000, trend: 'up' | 'down' | 'random' = 'up'): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = startPrice;
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (count - i));
      
      const change = trend === 'up' ? 2 : (trend === 'down' ? -2 : 0);
      const volatility = (Math.random() - 0.5) * 10;
      price += change + volatility;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: price - 5,
        high: price + 10,
        low: price - 10,
        close: price,
        volume: 1000000,
      });
    }
    return data;
  };

  describe('simulateTrade', () => {
    it('should correctly simulate a winning buy trade', () => {
      const data = generateMockData(50, 1000, 'up');
      const result = accuracyService.simulateTrade(data, 10, 'BUY', 50);
      expect(result.won).toBe(true);
    });

    it('should correctly simulate a losing buy trade', () => {
      const data = generateMockData(50, 1000, 'down');
      const result = accuracyService.simulateTrade(data, 10, 'BUY', 50);
      expect(result.won).toBe(false);
    });
  });

  describe('calculateRealTimeAccuracy', () => {
    it('should return null for insufficient data', () => {
      const shortData = generateMockData(20); // Less than 30
      const result = accuracyService.calculateRealTimeAccuracy('7203', shortData, 'japan');
      expect(result).toBeNull();
    });

    it('should calculate accuracy with sufficient data', () => {
      const data = generateMockData(300, 1000, 'up');
      const result = accuracyService.calculateRealTimeAccuracy('7203', data, 'japan');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.hitRate).toBeGreaterThanOrEqual(0);
        expect(result.hitRate).toBeLessThanOrEqual(100);
        expect(result.directionalAccuracy).toBeGreaterThanOrEqual(0);
        expect(result.directionalAccuracy).toBeLessThanOrEqual(100);
        expect(result.totalTrades).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('calculateAIHitRate', () => {
    it('should return zero values for insufficient data', () => {
      const shortData = generateMockData(20);
      const result = accuracyService.calculateAIHitRate('7203', shortData, 'japan');

      expect(result.hitRate).toBe(0);
      expect(result.directionalAccuracy).toBe(0);
      expect(result.totalTrades).toBe(0);
    });

    it('should calculate hit rate with sufficient data', () => {
      const data = generateMockData(300, 1000, 'up');
      const result = accuracyService.calculateAIHitRate('7203', data, 'japan');

      expect(result.hitRate).toBeGreaterThanOrEqual(0);
      expect(result.hitRate).toBeLessThanOrEqual(100);
      expect(result.totalTrades).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runBacktest', () => {
    it('should return warning for critically short data', () => {
      const shortData = generateMockData(30);
      const result = accuracyService.runBacktest('7203', shortData, 'japan');
      expect(result.warning).toBeDefined();
      expect(result.totalTrades).toBe(0);
    });

    it('should perform backtest with sufficient data', () => {
      const data = generateMockData(200, 1000, 'up');
      const result = accuracyService.runBacktest('7203', data, 'japan');
      expect(result.totalTrades).toBeGreaterThanOrEqual(0);
      expect(result.walkForwardMetrics).toBeDefined();
    });
  });
});
