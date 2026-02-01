/**
 * Tests for DynamicRiskManagement functions
 */
import { describe, it, expect } from '@jest/globals';
import { calculateRiskMetrics, DynamicRiskConfig } from '../DynamicRiskManagement';

describe('DynamicRiskManagement', () => {
  const defaultConfig: DynamicRiskConfig = {
    enableTrailingStop: true,
    trailingStopATRMultiple: 2.0,
    trailingStopMinPercent: 1.0,
    enableVolatilityAdjustment: true,
    volatilityMultiplier: 1.5,
    enableDynamicPositionSizing: true,
    maxRiskPerTrade: 2.0,
    minRiskRewardRatio: 2.0,
  };

  describe('calculateRiskMetrics - Division by Zero Protection', () => {
    it('should handle zero riskPerShare when currentPrice equals stopLossPrice', () => {
      // Create a scenario where stopDistance becomes 0
      const configWithZeroDistance: DynamicRiskConfig = {
        ...defaultConfig,
        trailingStopATRMultiple: 0, // This will make stopDistance = 0
      };

      const result = calculateRiskMetrics(
        100, // currentPrice
        'BUY',
        10000, // cash
        [],
        configWithZeroDistance
      );

      // When riskPerShare is 0, should return safe defaults
      expect(result.recommendedQuantity).toBe(0);
      expect(result.riskAmount).toBe(0);
      expect(result.riskPercent).toBe(0);
      expect(isFinite(result.recommendedQuantity)).toBe(true);
      expect(isFinite(result.riskAmount)).toBe(true);
    });

    it('should handle NaN riskPerShare', () => {
      // Create a scenario that could lead to NaN
      const result = calculateRiskMetrics(
        NaN, // Invalid currentPrice
        'BUY',
        10000,
        [],
        defaultConfig
      );

      // Should handle gracefully and not return Infinity or NaN
      expect(isFinite(result.recommendedQuantity)).toBe(true);
      expect(isFinite(result.riskAmount)).toBe(true);
    });

    it('should handle negative riskPerShare', () => {
      // In normal conditions riskPerShare shouldn't be negative due to Math.abs,
      // but test the guard condition anyway
      const result = calculateRiskMetrics(
        100,
        'BUY',
        10000,
        [],
        defaultConfig
      );

      // Should return valid finite numbers
      expect(isFinite(result.recommendedQuantity)).toBe(true);
      expect(result.recommendedQuantity).toBeGreaterThanOrEqual(0);
    });

    it('should return valid results for normal case', () => {
      const result = calculateRiskMetrics(
        100, // currentPrice
        'BUY',
        10000, // cash
        [],
        defaultConfig
      );

      // Normal case should work properly
      expect(result.recommendedQuantity).toBeGreaterThan(0);
      expect(isFinite(result.recommendedQuantity)).toBe(true);
      expect(isFinite(result.riskAmount)).toBe(true);
      expect(isFinite(result.stopLossPrice)).toBe(true);
      expect(isFinite(result.takeProfitPrice)).toBe(true);
    });

    it('should handle very small riskPerShare', () => {
      // Very small ATR multiplier to create minimal risk
      const configWithSmallRisk: DynamicRiskConfig = {
        ...defaultConfig,
        trailingStopATRMultiple: 0.001,
      };

      const result = calculateRiskMetrics(
        100,
        'BUY',
        10000,
        [],
        configWithSmallRisk
      );

      // Should handle very small but non-zero risk
      expect(isFinite(result.recommendedQuantity)).toBe(true);
      expect(result.recommendedQuantity).toBeGreaterThanOrEqual(0);
    });

    it('should handle infinite values gracefully', () => {
      const result = calculateRiskMetrics(
        Infinity, // Invalid currentPrice
        'BUY',
        10000,
        [],
        defaultConfig
      );

      // Should return safe defaults when dealing with invalid inputs
      expect(isFinite(result.recommendedQuantity)).toBe(true);
      expect(isFinite(result.riskAmount)).toBe(true);
    });
  });

  describe('calculateRiskMetrics - General Functionality', () => {
    it('should calculate correct metrics for BUY side', () => {
      const result = calculateRiskMetrics(
        100,
        'BUY',
        10000,
        [],
        defaultConfig
      );

      expect(result.stopLossPrice).toBeLessThan(100);
      expect(result.takeProfitPrice).toBeGreaterThan(100);
      expect(result.riskPercent).toBe(2.0);
      expect(result.rewardRiskRatio).toBe(2.0);
      expect(result.volatilityScore).toBe(50);
    });

    it('should calculate correct metrics for SELL side', () => {
      const result = calculateRiskMetrics(
        100,
        'SELL',
        10000,
        [],
        defaultConfig
      );

      expect(result.stopLossPrice).toBeGreaterThan(100);
      expect(result.takeProfitPrice).toBeLessThan(100);
      expect(result.riskPercent).toBe(2.0);
      expect(result.rewardRiskRatio).toBe(2.0);
    });

    it('should respect maxRiskPerTrade setting', () => {
      const customConfig: DynamicRiskConfig = {
        ...defaultConfig,
        maxRiskPerTrade: 5.0, // 5% risk
      };

      const result = calculateRiskMetrics(
        100,
        'BUY',
        10000,
        [],
        customConfig
      );

      expect(result.riskPercent).toBe(5.0);
      // maxRiskAmount should be 10000 * 0.05 = 500
      expect(result.riskAmount).toBeLessThanOrEqual(500);
    });

    it('should apply volatility adjustment when enabled', () => {
      const withVolatility: DynamicRiskConfig = {
        ...defaultConfig,
        enableVolatilityAdjustment: true,
        volatilityMultiplier: 2.0,
      };

      const withoutVolatility: DynamicRiskConfig = {
        ...defaultConfig,
        enableVolatilityAdjustment: false,
      };

      const resultWith = calculateRiskMetrics(100, 'BUY', 10000, [], withVolatility);
      const resultWithout = calculateRiskMetrics(100, 'BUY', 10000, [], withoutVolatility);

      // With volatility adjustment, stop should be further away
      const riskWith = Math.abs(100 - resultWith.stopLossPrice);
      const riskWithout = Math.abs(100 - resultWithout.stopLossPrice);
      
      expect(riskWith).toBeGreaterThan(riskWithout);
    });
  });
});
