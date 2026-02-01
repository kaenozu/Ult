/**
 * DataQualityChecker.test.ts
 * 
 * Tests for data quality checking service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataQualityChecker } from '../quality/DataQualityChecker';
import type { MarketData } from '@/app/types/data-quality';

describe('DataQualityChecker', () => {
  let checker: DataQualityChecker;

  beforeEach(() => {
    checker = new DataQualityChecker();
  });

  describe('OHLC Consistency', () => {
    it('should pass valid OHLC data', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    it('should fail when high < close', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 101,
          low: 95,
          close: 105, // close > high (invalid)
          volume: 1000000
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(false);
      expect(report.errors).toContain('OHLCデータが整合していません（high >= max(open,close), low <= min(open,close)）');
    });

    it('should fail when low > open', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 101, // low > open (invalid)
          close: 102,
          volume: 1000000
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(false);
    });
  });

  describe('Price Outlier Detection', () => {
    it('should warn on large price changes', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 125, // 25% increase
          volume: 1000000
        },
        previousClose: 100
      };

      const report = checker.check(data);
      expect(report.warnings).toContain('価格が異常な変動を示しています');
    });

    it('should pass on normal price changes', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 102, // 2% increase
          volume: 1000000
        },
        previousClose: 100
      };

      const report = checker.check(data);
      expect(report.warnings).not.toContain('価格が異常な変動を示しています');
    });
  });

  describe('Volume Validation', () => {
    it('should fail on negative volume', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: -1000 // Invalid
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(false);
      expect(report.errors).toContain('ボリュームが無効な値です');
    });

    it('should fail on infinite volume', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: Infinity // Invalid
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(false);
    });
  });

  describe('Timestamp Validation', () => {
    it('should pass on recent timestamp', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000
        }
      };

      const report = checker.check(data);
      expect(report.errors).not.toContain('データのタイムスタンプが古すぎます');
    });

    it('should fail on old timestamp', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now() - 120000, // 2 minutes old
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(false);
      expect(report.errors).toContain('データのタイムスタンプが古すぎます');
    });
  });

  describe('Price Validity', () => {
    it('should fail on zero prices', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 0, // Invalid
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(false);
      expect(report.errors).toContain('価格が無効な値を含んでいます');
    });

    it('should fail on negative prices', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: -95, // Invalid
          close: 102,
          volume: 1000000
        }
      };

      const report = checker.check(data);
      expect(report.isValid).toBe(false);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate price change metric', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 105,
          volume: 1000000
        },
        previousClose: 100
      };

      const report = checker.check(data);
      const priceChangeMetric = report.metrics.find(m => m.name === 'price-change');
      expect(priceChangeMetric).toBeDefined();
      expect(priceChangeMetric?.value).toBe(5);
      expect(priceChangeMetric?.unit).toBe('%');
    });

    it('should calculate volatility metrics', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 1000000
        }
      };

      const report = checker.check(data);
      const volatilityMetric = report.metrics.find(m => m.name === 'volatility');
      expect(volatilityMetric).toBeDefined();
      expect(volatilityMetric?.value).toBeGreaterThan(0);
    });
  });

  describe('Custom Rules', () => {
    it('should allow adding custom rules', () => {
      checker.addRule({
        name: 'custom-volume-check',
        severity: 'warning',
        validate: (data) => {
          return !data.ohlcv || data.ohlcv.volume > 100000;
        },
        message: 'Volume too low'
      });

      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 50000
        }
      };

      const report = checker.check(data);
      expect(report.warnings).toContain('Volume too low');
    });

    it('should allow removing rules', () => {
      const initialRuleCount = checker.getRules().length;
      
      checker.addRule({
        name: 'test-rule',
        severity: 'info',
        validate: () => true,
        message: 'Test'
      });

      expect(checker.getRules()).toHaveLength(initialRuleCount + 1);

      checker.removeRule('test-rule');
      expect(checker.getRules()).toHaveLength(initialRuleCount);
    });
  });

  describe('Configuration', () => {
    it('should respect custom thresholds', () => {
      const customChecker = new DataQualityChecker({
        maxPriceChangePercent: 5
      });

      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 100,
          high: 110,
          low: 95,
          close: 107, // 7% increase
          volume: 1000000
        },
        previousClose: 100
      };

      const report = customChecker.check(data);
      expect(report.warnings).toContain('価格が異常な変動を示しています');
    });
  });
});
