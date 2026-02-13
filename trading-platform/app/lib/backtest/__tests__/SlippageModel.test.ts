/**
 * SlippageModel.test.ts
 *
 * Unit tests for SlippageModel
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  SlippageModel,
  DEFAULT_SLIPPAGE_CONFIG,
  estimateLiquidityScore,
  estimatePortfolioSlippageCost,
  type SlippageConfig,
} from '../SlippageModel';
import { OHLCV } from '@/app/types';

describe('SlippageModel', () => {
  let model: SlippageModel;
  let mockOHLCV: OHLCV;

  beforeEach(() => {
    model = new SlippageModel();
    mockOHLCV = {
      date: '2024-01-01T10:00:00Z',
      open: 100,
      high: 102,
      low: 99,
      close: 101,
      volume: 1000000,
    };
  });

  describe('Basic Slippage Calculation', () => {
    it('should calculate basic slippage for buy orders', () => {
      const result = model.calculateSlippage(100, 'BUY', 100);

      expect(result.slippageRate).toBeGreaterThan(0);
      expect(result.adjustedPrice).toBeGreaterThan(100);
      expect(result.breakdown.base).toBe(DEFAULT_SLIPPAGE_CONFIG.baseSlippage);
    });

    it('should calculate basic slippage for sell orders', () => {
      const result = model.calculateSlippage(100, 'SELL', 100);

      expect(result.slippageRate).toBeGreaterThan(0);
      expect(result.adjustedPrice).toBeLessThan(100);
    });

    it('should include spread impact', () => {
      const result = model.calculateSlippage(100, 'BUY', 100);

      expect(result.breakdown.spread).toBe(DEFAULT_SLIPPAGE_CONFIG.spread / 2);
    });
  });

  describe('Time of Day Slippage', () => {
    it('should apply higher slippage during market open', () => {
      const morningData: OHLCV = {
        ...mockOHLCV,
        date: '2024-01-01T09:30:00+09:00',
      };

      const result = model.calculateSlippage(100, 'BUY', 100, morningData);
      const normalResult = model.calculateSlippage(100, 'BUY', 100, {
        ...mockOHLCV,
        date: '2024-01-01T14:00:00+09:00',
      });

      expect(result.slippageRate).toBeGreaterThanOrEqual(normalResult.slippageRate);
    });

    it('should apply higher slippage during market close', () => {
      const afternoonData: OHLCV = {
        ...mockOHLCV,
        date: '2024-01-01T15:15:00+09:00',
      };

      const result = model.calculateSlippage(100, 'BUY', 100, afternoonData);
      const normalResult = model.calculateSlippage(100, 'BUY', 100, {
        ...mockOHLCV,
        date: '2024-01-01T14:00:00+09:00',
      });

      expect(result.slippageRate).toBeGreaterThanOrEqual(normalResult.slippageRate);
    });

    it('should not apply time impact when disabled', () => {
      model.updateConfig({ useTimeOfDaySlippage: false });

      const result = model.calculateSlippage(100, 'BUY', 100, mockOHLCV);

      expect(result.breakdown.timeOfDay).toBe(0);
    });
  });

  describe('Volatility Slippage', () => {
    it('should apply higher slippage for high volatility', () => {
      const highVolatilityData: OHLCV = {
        ...mockOHLCV,
        high: 105,
        low: 95,
        close: 100,
      };

      const result = model.calculateSlippage(100, 'BUY', 100, highVolatilityData);
      const normalResult = model.calculateSlippage(100, 'BUY', 100, mockOHLCV);

      expect(result.slippageRate).toBeGreaterThan(normalResult.slippageRate);
    });

    it('should not apply volatility impact when disabled', () => {
      model.updateConfig({ useVolatilitySlippage: false });

      const result = model.calculateSlippage(100, 'BUY', 100, mockOHLCV);

      expect(result.breakdown.volatility).toBe(0);
    });
  });

  describe('Order Size Impact', () => {
    let dataWithVolume: OHLCV;

    beforeEach(() => {
      model.updateConfig({
        averageDailyVolume: 1000000,
        useOrderSizeImpact: true,
      });
      dataWithVolume = { ...mockOHLCV, volume: 1000000 };
    });

    it('should apply square root market impact model', () => {
      model.updateConfig({ marketImpactModel: 'square_root' });

      const smallOrder = model.calculateSlippage(100, 'BUY', 100, dataWithVolume);
      const largeOrder = model.calculateSlippage(100, 'BUY', 10000, dataWithVolume);

      expect(largeOrder.slippageRate).toBeGreaterThan(smallOrder.slippageRate);
    });

    it('should apply linear market impact model', () => {
      model.updateConfig({ marketImpactModel: 'linear' });

      const result = model.calculateSlippage(100, 'BUY', 1000, dataWithVolume);

      expect(result.breakdown.orderSize).toBeGreaterThan(0);
    });

    it('should apply almgren-chriss model', () => {
      model.updateConfig({ marketImpactModel: 'almgren_chriss' });

      const result = model.calculateSlippage(100, 'BUY', 1000, dataWithVolume);

      expect(result.breakdown.orderSize).toBeGreaterThan(0);
    });
  });

  describe('Panic Movement Detection', () => {
    it('should detect panic in high range days', () => {
      const panicData: OHLCV = {
        ...mockOHLCV,
        high: 110,
        low: 90,
        close: 100,
      };

      const result = model.calculateSlippage(100, 'BUY', 100, panicData);

      expect(result.slippageRate).toBeGreaterThan(DEFAULT_SLIPPAGE_CONFIG.baseSlippage);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      model.updateConfig({ baseSlippage: 0.1, spread: 0.05 });

      const config = model.getConfig();

      expect(config.baseSlippage).toBe(0.1);
      expect(config.spread).toBe(0.05);
    });

    it('should adjust for liquidity', () => {
      model.adjustForLiquidity(0.5);

      const config = model.getConfig();

      expect(config.baseSlippage).toBeGreaterThan(DEFAULT_SLIPPAGE_CONFIG.baseSlippage);
    });
  });
});

describe('Liquidity Score Estimation', () => {
  it('should estimate high liquidity for large caps', () => {
    const score = estimateLiquidityScore(10000000, 1000, 1000000000000);

    expect(score).toBe(1.0);
  });

  it('should estimate low liquidity for small caps', () => {
    const score = estimateLiquidityScore(10000, 100);

    expect(score).toBeLessThan(0.5);
  });
});

describe('Portfolio Slippage Cost Estimation', () => {
  it('should calculate total slippage cost for portfolio', () => {
    const model = new SlippageModel();
    const orders = [
      { price: 100, quantity: 100, side: 'BUY' as const },
      { price: 200, quantity: 50, side: 'SELL' as const },
      { price: 150, quantity: 75, side: 'BUY' as const },
    ];

    const result = estimatePortfolioSlippageCost(orders, model);

    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.averageRate).toBeGreaterThan(0);
    expect(result.worstRate).toBeGreaterThanOrEqual(result.bestRate);
  });
});
