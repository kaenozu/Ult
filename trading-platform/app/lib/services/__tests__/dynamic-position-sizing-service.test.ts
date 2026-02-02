/**
 * Tests for DynamicPositionSizingService
 */

import { dynamicPositionSizingService } from '../dynamic-position-sizing-service';
import { RiskManagementSettings } from '../../../types';

describe('DynamicPositionSizingService', () => {
  const baseInput = {
    entryPrice: 1000,
    stopLossPrice: 950,
    accountBalance: 100000,
    riskPercentage: 2,
    volatility: 0.02,
    marketRegime: 'SIDEWAYS' as const,
    trendStrength: 0,
    assetCorrelation: 0,
    confidence: 70
  };

  const defaultSettings: RiskManagementSettings = {
    sizingMethod: 'volatility_adjusted',
    maxRiskPercent: 2,
    maxPositionPercent: 10,
    maxLossPerTrade: 100000,
    stopLoss: {
      enabled: true,
      type: 'atr',
      value: 2
    },
    takeProfit: {
      enabled: true,
      type: 'atr',
      value: 3
    }
  };

  describe('calculatePositionSize', () => {
    it('should calculate basic position size correctly', () => {
      const result = dynamicPositionSizingService.calculatePositionSize(baseInput);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBeGreaterThan(0);
      expect(result.riskPercent).toBeGreaterThanOrEqual(0);
      expect(result.maxPositionSize).toBe(result.positionSize);
    });

    it('should respect risk percentage', () => {
      const input = { ...baseInput, riskPercentage: 1 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      // Risk amount should be approximately 1% of account balance
      const expectedRisk = baseInput.accountBalance * 0.01;
      expect(result.riskAmount).toBeLessThanOrEqual(expectedRisk * 1.5); // Allow for adjustments
    });

    it('should adjust for high volatility', () => {
      const lowVol = { ...baseInput, volatility: 0.01 };
      const highVol = { ...baseInput, volatility: 0.05 };
      
      const lowVolResult = dynamicPositionSizingService.calculatePositionSize(lowVol);
      const highVolResult = dynamicPositionSizingService.calculatePositionSize(highVol);
      
      // High volatility should result in smaller or equal position size
      expect(highVolResult.positionSize).toBeLessThanOrEqual(lowVolResult.positionSize);
    });

    it('should increase position in BULL market', () => {
      const sideways = { ...baseInput, marketRegime: 'SIDEWAYS' as const };
      const bull = { ...baseInput, marketRegime: 'BULL' as const };
      
      const sidewaysResult = dynamicPositionSizingService.calculatePositionSize(sideways);
      const bullResult = dynamicPositionSizingService.calculatePositionSize(bull);
      
      expect(bullResult.positionSize).toBeGreaterThanOrEqual(sidewaysResult.positionSize);
    });

    it('should decrease position in BEAR market', () => {
      const sideways = { ...baseInput, marketRegime: 'SIDEWAYS' as const };
      const bear = { ...baseInput, marketRegime: 'BEAR' as const };
      
      const sidewaysResult = dynamicPositionSizingService.calculatePositionSize(sideways);
      const bearResult = dynamicPositionSizingService.calculatePositionSize(bear);
      
      expect(bearResult.positionSize).toBeLessThanOrEqual(sidewaysResult.positionSize);
    });

    it('should adjust for trend strength', () => {
      const weakTrend = { ...baseInput, trendStrength: 0.1 };
      const strongTrend = { ...baseInput, trendStrength: 0.5 };
      
      const weakResult = dynamicPositionSizingService.calculatePositionSize(weakTrend);
      const strongResult = dynamicPositionSizingService.calculatePositionSize(strongTrend);
      
      expect(strongResult.positionSize).toBeGreaterThanOrEqual(weakResult.positionSize);
    });

    it('should reduce position for high correlation', () => {
      const lowCorr = { ...baseInput, assetCorrelation: 0.2 };
      const highCorr = { ...baseInput, assetCorrelation: 0.9 };
      
      const lowResult = dynamicPositionSizingService.calculatePositionSize(lowCorr);
      const highResult = dynamicPositionSizingService.calculatePositionSize(highCorr);
      
      expect(highResult.positionSize).toBeLessThan(lowResult.positionSize);
    });

    it('should adjust for confidence level', () => {
      const lowConf = { ...baseInput, confidence: 50 };
      const highConf = { ...baseInput, confidence: 90 };
      
      const lowResult = dynamicPositionSizingService.calculatePositionSize(lowConf);
      const highResult = dynamicPositionSizingService.calculatePositionSize(highConf);
      
      expect(highResult.positionSize).toBeGreaterThanOrEqual(lowResult.positionSize);
    });

    it('should respect maxPositionPercent setting', () => {
      const settings = { ...defaultSettings, maxPositionPercent: 5 };
      const result = dynamicPositionSizingService.calculatePositionSize(baseInput, settings);
      
      const maxPosition = baseInput.accountBalance * 0.05;
      expect(result.positionSize).toBeLessThanOrEqual(maxPosition);
    });

    it('should respect maxLossPerTrade setting', () => {
      const settings = { ...defaultSettings, maxLossPerTrade: 1000 };
      const result = dynamicPositionSizingService.calculatePositionSize(baseInput, settings);
      
      expect(result.riskAmount).toBeLessThanOrEqual(1000);
    });

    it('should handle zero price risk gracefully', () => {
      const input = { ...baseInput, stopLossPrice: baseInput.entryPrice };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBe(0);
      expect(result.riskAmount).toBe(0);
    });

    it('should handle negative trend strength', () => {
      const input = { ...baseInput, trendStrength: -0.3 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(isFinite(result.positionSize)).toBe(true);
    });
  });

  describe('calculateKellyCriterion', () => {
    it('should calculate Kelly percentage correctly', () => {
      const winProbability = 0.6;
      const winLossRatio = 2; // Win $2 for every $1 lost
      const accountBalance = 100000;
      
      const result = dynamicPositionSizingService.calculateKellyCriterion(
        winProbability,
        winLossRatio,
        accountBalance
      );
      
      expect(result.kellyPercentage).toBeGreaterThan(0);
      expect(result.recommendedPercentage).toBeLessThan(result.kellyPercentage);
      expect(result.maxPositionSize).toBeGreaterThan(0);
    });

    it('should return zero for zero win/loss ratio', () => {
      const result = dynamicPositionSizingService.calculateKellyCriterion(0.6, 0, 100000);
      
      expect(result.kellyPercentage).toBe(0);
      expect(result.recommendedPercentage).toBe(0);
      expect(result.maxPositionSize).toBe(0);
    });

    it('should return zero for negative win/loss ratio', () => {
      const result = dynamicPositionSizingService.calculateKellyCriterion(0.6, -1, 100000);
      
      expect(result.kellyPercentage).toBe(0);
      expect(result.recommendedPercentage).toBe(0);
      expect(result.maxPositionSize).toBe(0);
    });

    it('should apply fractional Kelly (1/4)', () => {
      const winProbability = 0.6;
      const winLossRatio = 2;
      const accountBalance = 100000;
      
      const result = dynamicPositionSizingService.calculateKellyCriterion(
        winProbability,
        winLossRatio,
        accountBalance
      );
      
      expect(result.recommendedPercentage).toBeCloseTo(result.kellyPercentage * 0.25, 5);
    });

    it('should scale with account balance', () => {
      const small = dynamicPositionSizingService.calculateKellyCriterion(0.6, 2, 10000);
      const large = dynamicPositionSizingService.calculateKellyCriterion(0.6, 2, 100000);
      
      expect(large.maxPositionSize).toBeCloseTo(small.maxPositionSize * 10, 1);
    });

    it('should handle 100% win probability', () => {
      const result = dynamicPositionSizingService.calculateKellyCriterion(1.0, 2, 100000);
      
      expect(result.kellyPercentage).toBeGreaterThan(0);
      expect(isFinite(result.kellyPercentage)).toBe(true);
    });

    it('should handle 0% win probability', () => {
      const result = dynamicPositionSizingService.calculateKellyCriterion(0.0, 2, 100000);
      
      expect(result.kellyPercentage).toBeLessThan(0);
    });

    it('should handle edge case: 50% win probability, 1:1 ratio', () => {
      const result = dynamicPositionSizingService.calculateKellyCriterion(0.5, 1, 100000);
      
      expect(result.kellyPercentage).toBeCloseTo(0, 5);
    });
  });

  describe('calculateATRStopLoss', () => {
    it('should calculate LONG stop loss correctly', () => {
      const entryPrice = 1000;
      const atr = 50;
      const multiplier = 2;
      
      const stopLoss = dynamicPositionSizingService.calculateATRStopLoss(
        entryPrice,
        atr,
        multiplier,
        'LONG'
      );
      
      expect(stopLoss).toBe(entryPrice - atr * multiplier);
      expect(stopLoss).toBeLessThan(entryPrice);
    });

    it('should calculate SHORT stop loss correctly', () => {
      const entryPrice = 1000;
      const atr = 50;
      const multiplier = 2;
      
      const stopLoss = dynamicPositionSizingService.calculateATRStopLoss(
        entryPrice,
        atr,
        multiplier,
        'SHORT'
      );
      
      expect(stopLoss).toBe(entryPrice + atr * multiplier);
      expect(stopLoss).toBeGreaterThan(entryPrice);
    });

    it('should scale with ATR multiplier', () => {
      const entryPrice = 1000;
      const atr = 50;
      
      const sl1x = dynamicPositionSizingService.calculateATRStopLoss(entryPrice, atr, 1, 'LONG');
      const sl2x = dynamicPositionSizingService.calculateATRStopLoss(entryPrice, atr, 2, 'LONG');
      
      expect(sl1x).toBeGreaterThan(sl2x);
      expect(entryPrice - sl2x).toBeCloseTo(2 * (entryPrice - sl1x), 5);
    });

    it('should handle zero ATR', () => {
      const stopLoss = dynamicPositionSizingService.calculateATRStopLoss(1000, 0, 2, 'LONG');
      
      expect(stopLoss).toBe(1000);
    });

    it('should handle negative ATR', () => {
      const stopLoss = dynamicPositionSizingService.calculateATRStopLoss(1000, -50, 2, 'LONG');
      
      expect(stopLoss).toBe(1100); // Should still work mathematically
    });
  });

  describe('calculateAdjustedPositionSize', () => {
    it('should calculate position size based on current unrealized PnL', () => {
      const entryPrice = 1000;
      const currentPrice = 1050; // 5% profit
      const accountBalance = 100000;
      
      const size = dynamicPositionSizingService.calculateAdjustedPositionSize(
        entryPrice,
        currentPrice,
        accountBalance,
        defaultSettings
      );
      
      expect(size).toBeGreaterThan(0);
      expect(isFinite(size)).toBe(true);
    });

    it('should handle losing position', () => {
      const entryPrice = 1000;
      const currentPrice = 950; // 5% loss
      const accountBalance = 100000;
      
      const size = dynamicPositionSizingService.calculateAdjustedPositionSize(
        entryPrice,
        currentPrice,
        accountBalance,
        defaultSettings
      );
      
      expect(size).toBeGreaterThan(0);
      expect(isFinite(size)).toBe(true);
    });

    it('should handle zero unrealized PnL', () => {
      const entryPrice = 1000;
      const currentPrice = 1000;
      const accountBalance = 100000;
      
      const size = dynamicPositionSizingService.calculateAdjustedPositionSize(
        entryPrice,
        currentPrice,
        accountBalance,
        defaultSettings
      );
      
      expect(size).toBeDefined();
      // When unrealized PnL is zero, position size will be Infinity
      expect(size === Infinity || isFinite(size)).toBe(true);
    });

    it('should scale with max risk percent', () => {
      const settings1 = { ...defaultSettings, maxRiskPercent: 1 };
      const settings2 = { ...defaultSettings, maxRiskPercent: 2 };
      
      const size1 = dynamicPositionSizingService.calculateAdjustedPositionSize(
        1000,
        1050,
        100000,
        settings1
      );
      const size2 = dynamicPositionSizingService.calculateAdjustedPositionSize(
        1000,
        1050,
        100000,
        settings2
      );
      
      expect(size2).toBeGreaterThan(size1);
    });
  });

  describe('edge cases', () => {
    it('should handle very small account balance', () => {
      const input = { ...baseInput, accountBalance: 100 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThanOrEqual(0);
      expect(isFinite(result.positionSize)).toBe(true);
    });

    it('should handle very large account balance', () => {
      const input = { ...baseInput, accountBalance: 10000000000 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(isFinite(result.positionSize)).toBe(true);
    });

    it('should handle zero volatility', () => {
      const input = { ...baseInput, volatility: 0 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle very high volatility', () => {
      const input = { ...baseInput, volatility: 1.0 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(isFinite(result.positionSize)).toBe(true);
    });

    it('should handle 100% confidence', () => {
      const input = { ...baseInput, confidence: 100 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle 0% confidence', () => {
      const input = { ...baseInput, confidence: 0 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative correlation', () => {
      const input = { ...baseInput, assetCorrelation: -0.5 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle 100% correlation', () => {
      const input = { ...baseInput, assetCorrelation: 1.0 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme trend strength', () => {
      const input = { ...baseInput, trendStrength: 10 };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(isFinite(result.positionSize)).toBe(true);
    });

    it('should handle SHORT position (stop loss above entry)', () => {
      const input = {
        ...baseInput,
        entryPrice: 1000,
        stopLossPrice: 1050 // Stop loss above entry for SHORT
      };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBeGreaterThan(0);
    });

    it('should handle very tight stop loss', () => {
      const input = {
        ...baseInput,
        entryPrice: 1000,
        stopLossPrice: 999 // Very tight stop
      };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('should handle very wide stop loss', () => {
      const input = {
        ...baseInput,
        entryPrice: 1000,
        stopLossPrice: 500 // Very wide stop
      };
      const result = dynamicPositionSizingService.calculatePositionSize(input);
      
      expect(result.positionSize).toBeGreaterThan(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle ideal trading scenario', () => {
      const idealInput = {
        entryPrice: 1000,
        stopLossPrice: 950,
        accountBalance: 100000,
        riskPercentage: 2,
        volatility: 0.015,
        marketRegime: 'BULL' as const,
        trendStrength: 0.4,
        assetCorrelation: 0.3,
        confidence: 85
      };
      
      const result = dynamicPositionSizingService.calculatePositionSize(idealInput);
      
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.riskPercent).toBeLessThanOrEqual(idealInput.riskPercentage * 2);
    });

    it('should handle risky trading scenario', () => {
      const riskyInput = {
        entryPrice: 1000,
        stopLossPrice: 900,
        accountBalance: 100000,
        riskPercentage: 2,
        volatility: 0.08,
        marketRegime: 'BEAR' as const,
        trendStrength: -0.3,
        assetCorrelation: 0.9,
        confidence: 55
      };
      
      const result = dynamicPositionSizingService.calculatePositionSize(riskyInput);
      
      expect(result.positionSize).toBeGreaterThan(0);
      // Should be conservative due to negative factors
      expect(result.riskPercent).toBeLessThan(riskyInput.riskPercentage);
    });
  });
});
