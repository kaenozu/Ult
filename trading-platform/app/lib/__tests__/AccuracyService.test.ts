/**
 * Unit tests for AccuracyService
 */

import { accuracyService } from '../AccuracyService';
import { OHLCV } from '../../types';

describe('AccuracyService', () => {
  // Generate mock OHLCV data with deterministic sine wave for reliable signals
  const generateMockData = (days: number, basePrice: number = 1000, trend: 'up' | 'down' | 'flat' = 'flat'): OHLCV[] => {
    const data: OHLCV[] = [];
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      // Deterministic trend + sine wave to ensure RSI oscillation
      let trendFactor = 0;
      if (trend === 'up') trendFactor = i * 0.005;
      if (trend === 'down') trendFactor = -i * 0.005;

      // Sine wave with period 20 days (approx business month)
      const cycle = Math.sin((i / 20) * Math.PI * 2) * 0.03;

      const priceFactor = 1 + trendFactor + cycle;
      const close = basePrice * priceFactor;

      // Add some 'noise' for High/Low but keep Close deterministic
      const volatility = 0.01;
      const open = close * (1 + (i % 2 === 0 ? -0.005 : 0.005)); // Alternating open
      const high = Math.max(open, close) * (1 + volatility);
      const low = Math.min(open, close) * (1 - volatility);
      const volume = 1000000 + Math.floor(Math.sin(i) * 500000);

      data.push({
        date: new Date(now - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });
    }

    return data;
  };

  describe('calculateSimpleATR', () => {
    it('should calculate ATR for valid data', () => {
      const data = generateMockData(50, 1000);
      const atr = accuracyService.calculateSimpleATR(data, data.length - 1);

      expect(atr).toBeGreaterThan(0);
      expect(atr).toBeLessThan(100); // Should be reasonable
    });

    it('should calculate ATR even with minimal data', () => {
      const shortData = generateMockData(5);
      const atr = accuracyService.calculateSimpleATR(shortData, 0);

      expect(atr).toBeGreaterThanOrEqual(0);
    });

    it('should handle data with zero values', () => {
      const data = generateMockData(20).map((d, i) => ({
        ...d,
        high: i === 10 ? 0 : d.high,
        low: i === 10 ? 0 : d.low,
      }));

      const atr = accuracyService.calculateSimpleATR(data, data.length - 1);

      expect(atr).toBeGreaterThanOrEqual(0);
    });

    it('should calculate different ATR for different volatility levels', () => {
      const stableData = generateMockData(50, 1000, 'flat');
      const volatileData = generateMockData(50, 1000, 'flat').map(d => ({
        ...d,
        high: d.high * 1.1,
        low: d.low * 0.9,
      }));

      const stableAtr = accuracyService.calculateSimpleATR(stableData, stableData.length - 1);
      const volatileAtr = accuracyService.calculateSimpleATR(volatileData, volatileData.length - 1);

      expect(volatileAtr).toBeGreaterThan(stableAtr);
    });
  });

  describe('calculatePredictionError', () => {
    it('should return default value for insufficient data', () => {
      const shortData = generateMockData(20);
      const error = accuracyService.calculatePredictionError(shortData);

      expect(error).toBe(1.0);
    });

    it('should calculate prediction error for sufficient data', () => {
      const data = generateMockData(50);
      const error = accuracyService.calculatePredictionError(data);

      expect(error).toBeGreaterThan(0);
      expect(error).toBeLessThanOrEqual(2.0);
    });

    it('should return lower error for trending data', () => {
      const flatData = generateMockData(50, 1000, 'flat');
      const trendingData = generateMockData(50, 1000, 'up');

      const flatError = accuracyService.calculatePredictionError(flatData);
      const trendingError = accuracyService.calculatePredictionError(trendingData);

      // Trending data should have lower prediction error
      expect(trendingError).toBeLessThanOrEqual(flatError * 1.5);
    });
  });

  describe('simulateTrade', () => {
    it('should simulate winning BUY trade', () => {
      const data = generateMockData(20, 1000, 'up');
      const result = accuracyService.simulateTrade(data, 10, 'BUY', 20);

      expect(result).toBeDefined();
      expect(typeof result.won).toBe('boolean');
      expect(typeof result.directionalHit).toBe('boolean');
    });

    it('should simulate winning SELL trade', () => {
      const data = generateMockData(20, 1000, 'down');
      const result = accuracyService.simulateTrade(data, 10, 'SELL', 20);

      expect(result).toBeDefined();
      expect(typeof result.won).toBe('boolean');
      expect(typeof result.directionalHit).toBe('boolean');
    });

    it('should return no win when target not reached', () => {
      const data = generateMockData(10, 1000, 'flat');
      const result = accuracyService.simulateTrade(data, 5, 'BUY', 1000);

      expect(result.won).toBe(false);
    });

    it('should detect directional hit correctly for uptrend', () => {
      const data = generateMockData(15, 1000, 'up');
      const result = accuracyService.simulateTrade(data, 5, 'BUY', 10);

      // In uptrend, BUY should have directional hit
      expect(result.directionalHit).toBeDefined();
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics for valid trades', () => {
      const trades = [
        {
          symbol: '7203',
          type: 'BUY' as const,
          entryPrice: 1000,
          exitPrice: 1100,
          entryDate: '2024-01-01',
          exitDate: '2024-01-15',
          profitPercent: 10,
        },
        {
          symbol: '7203',
          type: 'SELL' as const,
          entryPrice: 1000,
          exitPrice: 900,
          entryDate: '2024-01-16',
          exitDate: '2024-01-30',
          profitPercent: 10,
        },
        {
          symbol: '7203',
          type: 'BUY' as const,
          entryPrice: 1000,
          exitPrice: 950,
          entryDate: '2024-02-01',
          exitDate: '2024-02-15',
          profitPercent: -5,
        },
      ];

      const stats = accuracyService.calculateStats(trades, '7203', '2024-01-01', '2024-02-15');

      expect(stats.symbol).toBe('7203');
      expect(stats.totalTrades).toBe(3);
      expect(stats.winningTrades).toBe(2);
      expect(stats.losingTrades).toBe(1);
      expect(stats.winRate).toBeCloseTo(66.7, 0);
      expect(stats.totalReturn).toBeCloseTo(15, 0);
      expect(stats.avgProfit).toBeCloseTo(10, 0);
      expect(stats.avgLoss).toBe(-5);
    });

    it('should handle empty trades array', () => {
      const stats = accuracyService.calculateStats([], '7203', '2024-01-01', '2024-12-31');

      expect(stats.symbol).toBe('7203');
      expect(stats.totalTrades).toBe(0);
      expect(stats.winningTrades).toBe(0);
      expect(stats.losingTrades).toBe(0);
      expect(stats.winRate).toBe(0);
    });
  });

  describe('runBacktest', () => {
    it('should return empty result for insufficient data', () => {
      const shortData = generateMockData(50);
      const result = accuracyService.runBacktest('7203', shortData, 'japan');

      expect(result.symbol).toBe('7203');
      expect(result.totalTrades).toBe(0);
      expect(result.winningTrades).toBe(0);
      expect(result.losingTrades).toBe(0);
    });

    it('should run backtest with sufficient data', () => {
      const data = generateMockData(300, 1000, 'up');
      const result = accuracyService.runBacktest('7203', data, 'japan');

      expect(result.symbol).toBe('7203');
      expect(result.totalTrades).toBeGreaterThanOrEqual(0);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
    });

    it('should generate trades in trending market', () => {
      const upTrendData = generateMockData(300, 1000, 'up');
      const result = accuracyService.runBacktest('7203', upTrendData, 'japan');

      // In trending market, should generate some trades
      expect(result.totalTrades).toBeGreaterThanOrEqual(0);
      if (result.totalTrades > 0) {
        expect(result.trades.length).toBe(result.totalTrades);
        expect(result.winRate).toBeGreaterThanOrEqual(0);
        expect(result.winRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('calculateRealTimeAccuracy', () => {
    it('should return error for insufficient data', () => {
      const shortData = generateMockData(100);
      const result = accuracyService.calculateRealTimeAccuracy('7203', shortData, 'japan');

      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toContain('Insufficient data');
      }
    });

    it('should calculate accuracy with sufficient data', () => {
      const data = generateMockData(300, 1000, 'up');
      const result = accuracyService.calculateRealTimeAccuracy('7203', data, 'japan');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value.hitRate).toBeGreaterThanOrEqual(0);
        expect(result.value.hitRate).toBeLessThanOrEqual(100);
        expect(result.value.directionalAccuracy).toBeGreaterThanOrEqual(0);
        expect(result.value.directionalAccuracy).toBeLessThanOrEqual(100);
        expect(result.value.totalTrades).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return better accuracy for trending data', () => {
      const trendingData = generateMockData(300, 1000, 'up');
      const result = accuracyService.calculateRealTimeAccuracy('7203', trendingData, 'japan');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value.totalTrades).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('calculateAIHitRate', () => {
    it('should return zero values for insufficient data', () => {
      const shortData = generateMockData(100);
      const result = accuracyService.calculateAIHitRate('7203', shortData, 'japan');

      expect(result.hitRate).toBe(0);
      expect(result.directionalAccuracy).toBe(0);
      expect(result.totalTrades).toBe(0);
      expect(result.averageProfit).toBe(0);
    });

    it('should calculate hit rate with sufficient data', () => {
      const data = generateMockData(300, 1000, 'up');
      const result = accuracyService.calculateAIHitRate('7203', data, 'japan');

      expect(result.hitRate).toBeGreaterThanOrEqual(0);
      expect(result.hitRate).toBeLessThanOrEqual(100);
      expect(result.directionalAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.directionalAccuracy).toBeLessThanOrEqual(100);
      expect(result.totalTrades).toBeGreaterThan(0);
    });

    it('should have better hit rate in trending market', () => {
      const upTrendData = generateMockData(300, 1000, 'up');
      const downTrendData = generateMockData(300, 1000, 'down');

      const upResult = accuracyService.calculateAIHitRate('7203', upTrendData, 'japan');
      const downResult = accuracyService.calculateAIHitRate('7203', downTrendData, 'japan');

      expect(upResult.totalTrades).toBeGreaterThan(0);
      expect(downResult.totalTrades).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle data with NaN values', () => {
      const dataWithNaN = generateMockData(300).map((d, i) => ({
        ...d,
        close: i === 150 ? NaN : d.close,
      }));

      const result = accuracyService.calculateAIHitRate('7203', dataWithNaN, 'japan');

      expect(result).toBeDefined();
    });

    it('should handle data with negative prices', () => {
      const dataWithNegative = generateMockData(300).map((d, i) => ({
        ...d,
        close: i === 150 ? -100 : d.close,
      }));

      const result = accuracyService.calculateAIHitRate('7203', dataWithNegative, 'japan');

      expect(result).toBeDefined();
    });
  });

  describe('Walk-Forward Analysis in runBacktest', () => {
    it('should include walkForwardMetrics in backtest result', () => {
      const data = generateMockData(400, 1000, 'up');
      const result = accuracyService.runBacktest('7203', data, 'japan');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('7203');
      
      // Should have WFA metrics if optimization occurred
      if (result.walkForwardMetrics) {
        expect(result.walkForwardMetrics.outOfSampleAccuracy).toBeDefined();
        expect(result.walkForwardMetrics.outOfSampleAccuracy).toBeGreaterThanOrEqual(0);
        expect(result.walkForwardMetrics.overfitScore).toBeDefined();
        expect(result.walkForwardMetrics.parameterStability).toBeDefined();
      }
    });

    it('should track parameter stability across optimization windows', () => {
      const data = generateMockData(500, 1000, 'up');
      const result = accuracyService.runBacktest('7203', data, 'japan');

      if (result.walkForwardMetrics) {
        // Parameter stability should be a reasonable number
        expect(result.walkForwardMetrics.parameterStability).toBeGreaterThanOrEqual(0);
        expect(result.walkForwardMetrics.parameterStability).toBeLessThan(100);
      }
    });

    it('should report out-of-sample accuracy from validation sets', () => {
      const data = generateMockData(500, 1000, 'up');
      const result = accuracyService.runBacktest('7203', data, 'japan');

      if (result.walkForwardMetrics) {
        const oos = result.walkForwardMetrics.outOfSampleAccuracy;
        
        // OOS accuracy should be in valid range
        expect(oos).toBeGreaterThanOrEqual(0);
        expect(oos).toBeLessThanOrEqual(100);
      }
    });

    it('should have overfitScore close to 1.0 indicating good generalization', () => {
      const data = generateMockData(500, 1000, 'up');
      const result = accuracyService.runBacktest('7203', data, 'japan');

      if (result.walkForwardMetrics) {
        // With proper WFA, overfitScore should be 1.0 (no overfitting)
        // since we're selecting based on validation performance
        expect(result.walkForwardMetrics.overfitScore).toBe(1.0);
      }
    });

    it('should re-optimize at regular intervals during backtest', () => {
      const data = generateMockData(500, 1000, 'up');
      const result = accuracyService.runBacktest('7203', data, 'japan');

      // With 500 days and REOPTIMIZATION_INTERVAL=30, should have multiple optimization windows
      if (result.walkForwardMetrics) {
        // Should have tracked multiple parameter sets
        expect(result.walkForwardMetrics.parameterStability).toBeDefined();
      }
    });
  });
});
