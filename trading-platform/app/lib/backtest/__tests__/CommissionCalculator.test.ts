/**
 * CommissionCalculator.test.ts
 *
 * Unit tests for CommissionCalculator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  CommissionCalculator,
  DEFAULT_JAPAN_COMMISSION,
  DEFAULT_USA_COMMISSION,
  calculateTotalCommission,
  calculateBreakEvenPrice,
} from '../CommissionCalculator';

describe('CommissionCalculator', () => {
  describe('Japan Market', () => {
    let calculator: CommissionCalculator;

    beforeEach(() => {
      calculator = new CommissionCalculator('japan');
    });

    it('should calculate basic commission for buy orders', () => {
      const result = calculator.calculateCommission(1000, 100, 'BUY');

      expect(result.commission).toBeGreaterThan(0);
      expect(result.breakdown.baseCommission).toBeGreaterThan(0);
      expect(result.breakdown.tax).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(0);
    });

    it('should calculate commission with tax', () => {
      const result = calculator.calculateCommission(1000, 100, 'BUY');
      const expectedBase = 100000 * 0.0022 / 1.1; // 0.22% / 1.1
      const expectedTax = expectedBase * 0.1;

      expect(result.breakdown.baseCommission).toBeCloseTo(expectedBase, 0);
      expect(result.breakdown.tax).toBeCloseTo(expectedTax, 0);
    });

    it('should apply minimum commission if set', () => {
      calculator.updateConfig({
        japan: {
          ...DEFAULT_JAPAN_COMMISSION,
          minCommission: 100,
        },
      });

      const result = calculator.calculateCommission(10, 1, 'BUY'); // Very small order

      expect(result.commission).toBe(100);
    });

    it('should calculate round trip commission', () => {
      const roundTrip = calculator.calculateRoundTripCommission(1000, 1100, 100);

      expect(roundTrip.totalCommission).toBeGreaterThan(0);
      expect(roundTrip.entryCommission.commission).toBeGreaterThan(0);
      expect(roundTrip.exitCommission.commission).toBeGreaterThan(0);
      expect(roundTrip.totalCommission).toBe(
        roundTrip.entryCommission.commission + roundTrip.exitCommission.commission
      );
    });
  });

  describe('USA Market', () => {
    let calculator: CommissionCalculator;

    beforeEach(() => {
      calculator = new CommissionCalculator('usa');
    });

    it('should calculate per-share commission', () => {
      const result = calculator.calculateCommission(100, 100, 'BUY');

      const expectedBase = 100 * DEFAULT_USA_COMMISSION.perShareFee;
      expect(result.breakdown.baseCommission).toBeCloseTo(expectedBase, 2);
    });

    it('should apply SEC fee for sell orders only', () => {
      const buyResult = calculator.calculateCommission(100, 100, 'BUY');
      const sellResult = calculator.calculateCommission(100, 100, 'SELL');

      expect(buyResult.breakdown.secFee).toBe(0);
      expect(sellResult.breakdown.secFee).toBeGreaterThan(0);
    });

    it('should apply TAF fee for sell orders only', () => {
      const buyResult = calculator.calculateCommission(100, 100, 'BUY');
      const sellResult = calculator.calculateCommission(100, 100, 'SELL');

      expect(buyResult.breakdown.tafFee).toBe(0);
      expect(sellResult.breakdown.tafFee).toBeGreaterThan(0);
    });

    it('should enforce commission limits', () => {
      calculator.updateConfig({
        usa: {
          ...DEFAULT_USA_COMMISSION,
          minCommission: 1.0,
          maxCommission: 5.0,
        },
      });

      const smallResult = calculator.calculateCommission(10, 10, 'BUY'); // Small order
      const largeResult = calculator.calculateCommission(100, 10000, 'BUY'); // Large order

      expect(smallResult.breakdown.baseCommission).toBeGreaterThanOrEqual(1.0);
      expect(largeResult.breakdown.baseCommission).toBeLessThanOrEqual(5.0);
    });

    it('should calculate FX fee when enabled', () => {
      const withoutFx = calculator.calculateCommission(100, 100, 'BUY', false);
      const withFx = calculator.calculateCommission(100, 100, 'BUY', true);

      expect(withoutFx.breakdown.fxFee).toBeUndefined();
      expect(withFx.breakdown.fxFee).toBeGreaterThan(0);
      expect(withFx.commission).toBeGreaterThan(withoutFx.commission);
    });
  });

  describe('Broker Presets', () => {
    it('should apply SBI preset', () => {
      const calculator = new CommissionCalculator('japan');
      calculator.applyBrokerPreset('sbi');

      const config = calculator.getConfig();
      expect(config.japan?.baseCommissionRate).toBe(0.055);
      expect(config.japan?.minCommission).toBe(55);
    });

    it('should apply Rakuten preset', () => {
      const calculator = new CommissionCalculator('japan');
      calculator.applyBrokerPreset('rakuten');

      const config = calculator.getConfig();
      expect(config.japan?.baseCommissionRate).toBe(0.055);
    });

    it('should apply Interactive Brokers preset', () => {
      const calculator = new CommissionCalculator('usa');
      calculator.applyBrokerPreset('interactive_brokers');

      const config = calculator.getConfig();
      expect(config.usa?.perShareFee).toBe(0.005);
      expect(config.usa?.minCommission).toBe(1.0);
    });

    it('should apply Charles Schwab preset (zero commission)', () => {
      const calculator = new CommissionCalculator('usa');
      calculator.applyBrokerPreset('charles_schwab');

      const result = calculator.calculateCommission(100, 100, 'BUY');
      
      // Only SEC/TAF fees for sells, no base commission
      expect(result.breakdown.baseCommission).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('should calculate total commission for multiple trades', () => {
      const calculator = new CommissionCalculator('japan');
      const trades = [
        { price: 1000, quantity: 100, side: 'BUY' as const },
        { price: 1100, quantity: 100, side: 'SELL' as const },
        { price: 950, quantity: 50, side: 'BUY' as const },
      ];

      const result = calculateTotalCommission(trades, calculator);

      expect(result.totalCommission).toBeGreaterThan(0);
      expect(result.averageRate).toBeGreaterThan(0);
      expect(result.breakdown.length).toBe(3);
    });

    it('should calculate break-even price', () => {
      const calculator = new CommissionCalculator('japan');
      const entryPrice = 1000;
      const quantity = 100;

      const breakEven = calculateBreakEvenPrice(entryPrice, quantity, calculator);

      // Break-even should be higher than entry due to commissions
      expect(breakEven).toBeGreaterThan(entryPrice);
    });

    it('should calculate break-even with FX fee', () => {
      const calculator = new CommissionCalculator('usa');
      const entryPrice = 100;
      const quantity = 100;

      const withoutFx = calculateBreakEvenPrice(entryPrice, quantity, calculator, false);
      const withFx = calculateBreakEvenPrice(entryPrice, quantity, calculator, true);

      // Break-even with FX should be higher
      expect(withFx).toBeGreaterThan(withoutFx);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const calculator = new CommissionCalculator('japan');
      calculator.updateConfig({
        japan: { baseCommissionRate: 0.3, minCommission: 200, consumptionTax: 10 },
      });

      const config = calculator.getConfig();
      expect(config.japan?.baseCommissionRate).toBe(0.3);
      expect(config.japan?.minCommission).toBe(200);
    });

    it('should get current configuration', () => {
      const calculator = new CommissionCalculator('japan');
      const config = calculator.getConfig();

      expect(config.market).toBe('japan');
      expect(config.japan).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero quantity', () => {
      const calculator = new CommissionCalculator('japan');
      const result = calculator.calculateCommission(1000, 0, 'BUY');

      expect(result.commission).toBe(0);
    });

    it('should handle very large orders', () => {
      const calculator = new CommissionCalculator('usa');
      const result = calculator.calculateCommission(100, 1000000, 'BUY');

      expect(result.commission).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(0);
    });

    it('should handle fractional shares (USA)', () => {
      const calculator = new CommissionCalculator('usa');
      const result = calculator.calculateCommission(100, 10.5, 'BUY');

      expect(result.commission).toBeGreaterThan(0);
    });
  });
});
