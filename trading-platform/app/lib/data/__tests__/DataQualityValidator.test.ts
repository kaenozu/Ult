/**
 * DataQualityValidator Tests
 */

import { DataQualityValidator } from '../quality/DataQualityValidator';
import type { MarketData } from '@/app/types/data-quality';

describe('DataQualityValidator', () => {
  let validator: DataQualityValidator;

  beforeEach(() => {
    validator = new DataQualityValidator();
  });

  describe('Basic Validation', () => {
    it('should validate correct market data', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 1000000
        },
        previousClose: 150
      };

      const report = validator.validate(data);
      expect(report.isValid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    it('should detect invalid OHLC consistency', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 140, // Invalid: high < open
          low: 149,
          close: 153,
          volume: 1000000
        }
      };

      const report = validator.validate(data);
      expect(report.isValid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
    });

    it('should detect negative prices', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: -150,
          high: 155,
          low: 149,
          close: 153,
          volume: 1000000
        }
      };

      const report = validator.validate(data);
      expect(report.isValid).toBe(false);
    });

    it('should detect invalid volume', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: -1000
        }
      };

      const report = validator.validate(data);
      expect(report.isValid).toBe(false);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect price spike', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 180,
          low: 149,
          close: 175,
          volume: 1000000
        },
        previousClose: 150
      };

      const anomaly = validator.detectAnomalies(data);
      expect(anomaly.hasAnomaly).toBe(true);
      expect(anomaly.anomalyType).toBe('price_spike');
    });

    it('should detect zero volume', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 0
        }
      };

      const anomaly = validator.detectAnomalies(data);
      expect(anomaly.hasAnomaly).toBe(true);
      expect(anomaly.anomalyType).toBe('zero_volume');
    });

    it('should detect price gap', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 160,
          high: 165,
          low: 159,
          close: 162,
          volume: 1000000
        },
        previousClose: 150
      };

      const anomaly = validator.detectAnomalies(data);
      expect(anomaly.hasAnomaly).toBe(true);
      expect(anomaly.anomalyType).toBe('gap');
    });

    it('should not detect anomaly for normal data', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 152,
          low: 149,
          close: 151,
          volume: 1000000
        },
        previousClose: 150
      };

      const anomaly = validator.detectAnomalies(data);
      expect(anomaly.hasAnomaly).toBe(false);
      expect(anomaly.anomalyType).toBe('none');
    });
  });

  describe('Cross-Source Validation', () => {
    it('should detect consistent data across sources', () => {
      const sources = new Map<string, MarketData>([
        ['source1', {
          symbol: 'AAPL',
          timestamp: Date.now(),
          ohlcv: { symbol: 'AAPL', date: '2024-01-01', open: 150, high: 155, low: 149, close: 153, volume: 1000000 }
        }],
        ['source2', {
          symbol: 'AAPL',
          timestamp: Date.now(),
          ohlcv: { symbol: 'AAPL', date: '2024-01-01', open: 150, high: 155, low: 149, close: 153.5, volume: 1020000 }
        }]
      ]);

      const validation = validator.validateCrossSources(sources);
      expect(validation.isConsistent).toBe(true);
      expect(validation.priceDiscrepancy).toBeLessThan(0.05);
    });

    it('should detect price discrepancy across sources', () => {
      const sources = new Map<string, MarketData>([
        ['source1', {
          symbol: 'AAPL',
          timestamp: Date.now(),
          ohlcv: { symbol: 'AAPL', date: '2024-01-01', open: 150, high: 155, low: 149, close: 150, volume: 1000000 }
        }],
        ['source2', {
          symbol: 'AAPL',
          timestamp: Date.now(),
          ohlcv: { symbol: 'AAPL', date: '2024-01-01', open: 150, high: 155, low: 149, close: 170, volume: 1000000 }
        }]
      ]);

      const validation = validator.validateCrossSources(sources);
      expect(validation.isConsistent).toBe(false);
      expect(validation.inconsistentFields).toContain('price');
    });

    it('should handle single source', () => {
      const sources = new Map<string, MarketData>([
        ['source1', {
          symbol: 'AAPL',
          timestamp: Date.now(),
          ohlcv: { symbol: 'AAPL', date: '2024-01-01', open: 150, high: 155, low: 149, close: 153, volume: 1000000 }
        }]
      ]);

      const validation = validator.validateCrossSources(sources);
      expect(validation.isConsistent).toBe(true);
    });
  });

  describe('Data Freshness Monitoring', () => {
    it('should identify fresh data', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 1000000
        }
      };

      const freshness = validator.checkFreshness(data);
      expect(freshness.isFresh).toBe(true);
      expect(freshness.staleness).toBe('fresh');
    });

    it('should identify stale data', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now() - 600000, // 10 minutes ago
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 1000000
        }
      };

      const freshness = validator.checkFreshness(data);
      expect(freshness.isFresh).toBe(false);
      expect(freshness.staleness).toBe('stale');
    });

    it('should identify expired data', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now() - 1000000, // ~17 minutes ago
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 1000000
        }
      };

      const freshness = validator.checkFreshness(data);
      expect(freshness.isFresh).toBe(false);
      expect(freshness.staleness).toBe('expired');
    });
  });

  describe('Historical Data and Volume Spike Detection', () => {
    it('should detect volume spike', () => {
      // Add historical data
      for (let i = 0; i < 20; i++) {
        validator.updateHistoricalData('AAPL', {
          symbol: 'AAPL',
          date: `2024-01-${i + 1}`,
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 1000000
        });
      }

      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-21',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 4000000 // 4x average
        }
      };

      const anomaly = validator.detectAnomalies(data);
      expect(anomaly.hasAnomaly).toBe(true);
      expect(anomaly.anomalyType).toBe('volume_spike');
    });
  });

  describe('Custom Rules', () => {
    it('should add and apply custom rule', () => {
      validator.addRule({
        name: 'custom-test',
        severity: 'warning',
        validate: (data: MarketData) => {
          return data.ohlcv ? data.ohlcv.close > 100 : true;
        },
        message: 'Price too low'
      });

      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 50,
          high: 55,
          low: 49,
          close: 53,
          volume: 1000000
        }
      };

      const report = validator.validate(data);
      expect(report.warnings.length).toBeGreaterThan(0);
    });

    it('should remove custom rule', () => {
      validator.addRule({
        name: 'custom-test',
        severity: 'warning',
        validate: () => false,
        message: 'Test'
      });

      validator.removeRule('custom-test');
      const rules = validator.getRules();
      expect(rules.find(r => r.name === 'custom-test')).toBeUndefined();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate quality metrics', () => {
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 1000000
        },
        previousClose: 150,
        previousVolume: 900000
      };

      const report = validator.validate(data);
      expect(report.metrics.length).toBeGreaterThan(0);
      
      const priceChange = report.metrics.find(m => m.name === 'price-change');
      expect(priceChange).toBeDefined();
      expect(priceChange?.value).toBeCloseTo(2, 1);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      validator.updateConfig({ maxPriceChangePercent: 10 });
      
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-01',
          open: 150,
          high: 170,
          low: 149,
          close: 165,
          volume: 1000000
        },
        previousClose: 150
      };

      const report = validator.validate(data);
      expect(report.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('History Management', () => {
    it('should clear history for specific symbol', () => {
      validator.updateHistoricalData('AAPL', {
        symbol: 'AAPL',
        date: '2024-01-01',
        open: 150,
        high: 155,
        low: 149,
        close: 153,
        volume: 1000000
      });

      validator.clearHistory('AAPL');
      
      // After clearing, volume spike detection should not work
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-02',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 10000000
        }
      };

      const anomaly = validator.detectAnomalies(data);
      expect(anomaly.anomalyType).not.toBe('volume_spike');
    });

    it('should clear all history', () => {
      validator.updateHistoricalData('AAPL', {
        symbol: 'AAPL',
        date: '2024-01-01',
        open: 150,
        high: 155,
        low: 149,
        close: 153,
        volume: 1000000
      });

      validator.clearHistory();
      
      // Verify history is cleared by checking anomaly detection
      const data: MarketData = {
        symbol: 'AAPL',
        timestamp: Date.now(),
        ohlcv: {
          symbol: 'AAPL',
          date: '2024-01-02',
          open: 150,
          high: 155,
          low: 149,
          close: 153,
          volume: 10000000
        }
      };

      const anomaly = validator.detectAnomalies(data);
      expect(anomaly.anomalyType).not.toBe('volume_spike');
    });
  });
});
