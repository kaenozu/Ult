/**
 * constants.test.ts
 * 
 * 定数値の検証テスト
 * Issue #522 - 定数一元化
 */

import { describe, it, expect } from '@jest/globals';

// Import all constants
import {
  OPTIMIZATION,
  DATA_REQUIREMENTS,
  CONFIDENCE_THRESHOLDS,
  MULTIPLIERS,
} from '../constants/common';

import {
  SIGNAL_THRESHOLDS,
  MARKET_CORRELATION,
  AI_TRADING,
  ORDER,
} from '../constants/trading';

import {
  TECHNICAL_INDICATORS,
  RSI_CONFIG,
  SMA_CONFIG,
  MACD_CONFIG,
  BOLLINGER_BANDS,
  VOLATILITY,
} from '../constants/technical-indicators';

import {
  API_ENDPOINTS,
  CACHE_CONFIG,
  RATE_LIMIT,
  DATA_QUALITY,
} from '../constants/api';

import {
  CHART_COLORS,
  CHART_CONFIG,
} from '../constants/chart';

import {
  RISK_MANAGEMENT,
} from '../constants/risk-management';

describe('Constants', () => {
  describe('OPTIMIZATION', () => {
    it('should have required data period defined', () => {
      expect(OPTIMIZATION.REQUIRED_DATA_PERIOD).toBe(100);
      expect(OPTIMIZATION.MIN_DATA_PERIOD).toBe(60);
    });

    it('should have valid walk-forward analysis parameters', () => {
      expect(OPTIMIZATION.WFA_TRAIN_RATIO).toBeGreaterThan(0);
      expect(OPTIMIZATION.WFA_TRAIN_RATIO).toBeLessThan(1);
      expect(OPTIMIZATION.WFA_MIN_VALIDATION_PERIOD).toBeGreaterThan(0);
    });

    it('should have positive volume profile bins', () => {
      expect(OPTIMIZATION.VOLUME_PROFILE_BINS).toBeGreaterThan(0);
    });
  });

  describe('DATA_REQUIREMENTS', () => {
    it('should have valid minimum data points', () => {
      expect(DATA_REQUIREMENTS.MIN_DATA_POINTS).toBe(20);
      expect(DATA_REQUIREMENTS.MIN_DATA_PERIOD).toBe(50);
    });

    it('should have valid annual trading days', () => {
      expect(DATA_REQUIREMENTS.ANNUAL_TRADING_DAYS).toBe(252);
    });

    it('should have valid lookback period', () => {
      expect(DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS).toBe(60);
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('should have valid confidence range', () => {
      expect(CONFIDENCE_THRESHOLDS.MIN_CONFIDENCE).toBeLessThan(CONFIDENCE_THRESHOLDS.MAX_CONFIDENCE);
      expect(CONFIDENCE_THRESHOLDS.MAX_CONFIDENCE).toBe(100);
    });

    it('should have ordered thresholds', () => {
      expect(CONFIDENCE_THRESHOLDS.LOW_CONFIDENCE).toBeLessThan(CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE).toBeLessThan(CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE);
    });
  });

  describe('SIGNAL_THRESHOLDS', () => {
    it('should have valid confidence range', () => {
      expect(SIGNAL_THRESHOLDS.MIN_CONFIDENCE).toBeLessThan(SIGNAL_THRESHOLDS.MAX_CONFIDENCE);
      expect(SIGNAL_THRESHOLDS.MAX_CONFIDENCE).toBe(100);
    });

    it('should have valid correlation threshold', () => {
      expect(SIGNAL_THRESHOLDS.STRONG_CORRELATION).toBeGreaterThan(0);
      expect(SIGNAL_THRESHOLDS.STRONG_CORRELATION).toBeLessThanOrEqual(1);
    });

    it('should have positive momentum threshold', () => {
      expect(SIGNAL_THRESHOLDS.STRONG_MOMENTUM).toBeGreaterThan(0);
    });
  });

  describe('MARKET_CORRELATION', () => {
    it('should have valid correlation thresholds', () => {
      expect(MARKET_CORRELATION.STRONG_THRESHOLD).toBeGreaterThan(MARKET_CORRELATION.MODERATE_THRESHOLD);
      expect(MARKET_CORRELATION.TREND_DEVIATION).toBeGreaterThan(0);
    });
  });

  describe('AI_TRADING', () => {
    it('should have positive initial balance', () => {
      expect(AI_TRADING.INITIAL_VIRTUAL_BALANCE).toBeGreaterThan(0);
    });

    it('should have positive minimum trade amount', () => {
      expect(AI_TRADING.MIN_TRADE_AMOUNT).toBeGreaterThan(0);
    });
  });

  describe('ORDER', () => {
    it('should have positive expiry time', () => {
      expect(ORDER.EXPIRY_MS).toBeGreaterThan(0);
      expect(ORDER.EXPIRY_MS).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe('TECHNICAL_INDICATORS', () => {
    it('should have valid RSI period', () => {
      expect(TECHNICAL_INDICATORS.RSI_PERIOD).toBeGreaterThan(0);
    });

    it('should have valid MACD parameters', () => {
      expect(TECHNICAL_INDICATORS.MACD_FAST).toBeGreaterThan(0);
      expect(TECHNICAL_INDICATORS.MACD_SLOW).toBeGreaterThan(TECHNICAL_INDICATORS.MACD_FAST);
      expect(TECHNICAL_INDICATORS.MACD_SIGNAL).toBeGreaterThan(0);
    });

    it('should have valid Bollinger Bands parameters', () => {
      expect(TECHNICAL_INDICATORS.BB_PERIOD).toBeGreaterThan(0);
      expect(TECHNICAL_INDICATORS.BB_STD_DEV).toBeGreaterThan(0);
    });

    it('should have valid RSI thresholds', () => {
      expect(TECHNICAL_INDICATORS.RSI_OVERSOLD).toBeLessThan(TECHNICAL_INDICATORS.RSI_OVERBOUGHT);
      expect(TECHNICAL_INDICATORS.RSI_EXTREME_OVERSOLD).toBeLessThan(TECHNICAL_INDICATORS.RSI_OVERSOLD);
      expect(TECHNICAL_INDICATORS.RSI_EXTREME_OVERBOUGHT).toBeGreaterThan(TECHNICAL_INDICATORS.RSI_OVERBOUGHT);
    });

    it('should have valid SMA periods', () => {
      expect(TECHNICAL_INDICATORS.SMA_PERIOD_SHORT).toBeLessThan(TECHNICAL_INDICATORS.SMA_PERIOD_MEDIUM);
      expect(TECHNICAL_INDICATORS.SMA_PERIOD_MEDIUM).toBeLessThan(TECHNICAL_INDICATORS.SMA_PERIOD_LONG);
    });
  });

  describe('RSI_CONFIG', () => {
    it('should have valid default period', () => {
      expect(RSI_CONFIG.DEFAULT_PERIOD).toBe(14);
    });

    it('should have valid period options', () => {
      expect(RSI_CONFIG.PERIOD_OPTIONS).toContain(14);
    });
  });

  describe('SMA_CONFIG', () => {
    it('should have valid periods', () => {
      expect(SMA_CONFIG.PERIOD).toBeGreaterThan(0);
      expect(SMA_CONFIG.SHORT_PERIOD).toBeLessThan(SMA_CONFIG.LONG_PERIOD);
    });
  });

  describe('MACD_CONFIG', () => {
    it('should have valid periods', () => {
      expect(MACD_CONFIG.FAST_PERIOD).toBeLessThan(MACD_CONFIG.SLOW_PERIOD);
      expect(MACD_CONFIG.SIGNAL_PERIOD).toBeGreaterThan(0);
    });
  });

  describe('BOLLINGER_BANDS', () => {
    it('should have valid parameters', () => {
      expect(BOLLINGER_BANDS.PERIOD).toBeGreaterThan(0);
      expect(BOLLINGER_BANDS.STD_DEVIATION).toBeGreaterThan(0);
    });
  });

  describe('VOLATILITY', () => {
    it('should have valid ATR period', () => {
      expect(VOLATILITY.DEFAULT_ATR_PERIOD).toBeGreaterThan(0);
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have positive duration', () => {
      expect(CACHE_CONFIG.DEFAULT_DURATION_MS).toBeGreaterThan(0);
    });

    it('should have positive chunk size', () => {
      expect(CACHE_CONFIG.CHUNK_SIZE).toBeGreaterThan(0);
    });
  });

  describe('RATE_LIMIT', () => {
    it('should have positive values', () => {
      expect(RATE_LIMIT.REQUEST_INTERVAL_MS).toBeGreaterThan(0);
      expect(RATE_LIMIT.MAX_RETRIES).toBeGreaterThan(0);
      expect(RATE_LIMIT.RETRY_DELAY_MS).toBeGreaterThan(0);
    });
  });

  describe('DATA_QUALITY', () => {
    it('should have positive minimum data length', () => {
      expect(DATA_QUALITY.MIN_DATA_LENGTH).toBeGreaterThan(0);
    });

    it('should have positive price threshold', () => {
      expect(DATA_QUALITY.MIN_PRICE_THRESHOLD).toBeGreaterThan(0);
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have valid URL format', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        if (typeof endpoint === 'string') {
          expect(endpoint).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  describe('CHART_COLORS', () => {
    it('should have defined colors', () => {
      expect(CHART_COLORS).toBeDefined();
    });
  });

  describe('CHART_CONFIG', () => {
    it('should have positive tension', () => {
      expect(CHART_CONFIG.TENSION).toBeGreaterThanOrEqual(0);
    });

    it('should have positive minimum data points', () => {
      expect(CHART_CONFIG.MIN_DATA_POINTS).toBeGreaterThan(0);
    });
  });

  describe('RISK_MANAGEMENT', () => {
    it('should have valid stop loss percentage', () => {
      expect(RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PCT).toBeGreaterThan(0);
      expect(RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PCT).toBeLessThan(100);
    });

    it('should have valid take profit percentage', () => {
      expect(RISK_MANAGEMENT.DEFAULT_TAKE_PROFIT_PCT).toBeGreaterThan(0);
    });

    it('should have valid Kelly fraction', () => {
      expect(RISK_MANAGEMENT.DEFAULT_KELLY_FRACTION).toBeGreaterThan(0);
      expect(RISK_MANAGEMENT.DEFAULT_KELLY_FRACTION).toBeLessThanOrEqual(1);
    });

    it('should have valid risk percent', () => {
      expect(RISK_MANAGEMENT.DEFAULT_RISK_PERCENT).toBeGreaterThan(0);
      expect(RISK_MANAGEMENT.DEFAULT_RISK_PERCENT).toBeLessThan(100);
    });

    it('should have valid position limits', () => {
      expect(RISK_MANAGEMENT.DEFAULT_MAX_POSITIONS).toBeGreaterThan(0);
      expect(RISK_MANAGEMENT.DEFAULT_MAX_POSITION_PERCENT).toBeGreaterThan(0);
    });

    it('should have valid ATR multipliers', () => {
      expect(RISK_MANAGEMENT.ATR_STOP_LOSS_MULTIPLIER).toBeGreaterThan(0);
      expect(RISK_MANAGEMENT.ATR_TAKE_PROFIT_MULTIPLIER).toBeGreaterThan(0);
    });
  });

  describe('MULTIPLIERS', () => {
    it('should have positive multipliers', () => {
      expect(MULTIPLIERS.TARGET_MULTIPLIER).toBeGreaterThan(0);
      expect(MULTIPLIERS.VOLUME_MULTIPLIER_DEFAULT).toBeGreaterThan(0);
    });

    it('should have valid slippage factors', () => {
      expect(MULTIPLIERS.SLIPPAGE_FACTOR_HIGH).toBeGreaterThan(0);
      expect(MULTIPLIERS.SLIPPAGE_FACTOR_HIGH).toBeLessThan(MULTIPLIERS.SLIPPAGE_FACTOR_MEDIUM);
    });
  });

  describe('Constant Consistency', () => {
    it('should have consistent confidence thresholds between common and trading', () => {
      // SIGNAL_THRESHOLDS should be used for trading decisions
      // CONFIDENCE_THRESHOLDS is deprecated but kept for backward compatibility
      expect(SIGNAL_THRESHOLDS.MAX_CONFIDENCE).toBe(CONFIDENCE_THRESHOLDS.MAX_CONFIDENCE);
    });

    it('should have consistent data requirements', () => {
      // MIN_DATA_PERIOD should be consistent across modules
      expect(DATA_REQUIREMENTS.MIN_DATA_PERIOD).toBeGreaterThanOrEqual(DATA_REQUIREMENTS.MIN_DATA_POINTS);
    });

    it('should have consistent technical indicator configs', () => {
      // RSI_CONFIG should match TECHNICAL_INDICATORS
      expect(RSI_CONFIG.DEFAULT_PERIOD).toBe(TECHNICAL_INDICATORS.RSI_PERIOD);
      expect(MACD_CONFIG.FAST_PERIOD).toBe(TECHNICAL_INDICATORS.MACD_FAST);
      expect(BOLLINGER_BANDS.PERIOD).toBe(TECHNICAL_INDICATORS.BB_PERIOD);
    });
  });
});
