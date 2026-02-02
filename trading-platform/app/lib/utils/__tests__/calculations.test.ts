/**
 * Tests for calculation utilities
 */

import {
  calculateRsiImpact,
  calculateMomentumScore,
  calculateContinuousMomentumScore,
  calculateSmaScore,
  calculateWeightedSmaScore,
  calculateRsiConfidenceBonus,
  calculateMomentumConfidenceBonus,
  calculatePredictionConfidenceBonus,
  calculateConfidence,
  clampConfidence,
  RSI_CONSTANTS,
  MOMENTUM_CONSTANTS,
  SMA_CONSTANTS,
  CONFIDENCE_CONSTANTS
} from '../calculations';

describe('calculations', () => {
  describe('calculateRsiImpact', () => {
    it('should return positive score for oversold RSI', () => {
      expect(calculateRsiImpact(15)).toBe(RSI_CONSTANTS.EXTREME_SCORE);
      expect(calculateRsiImpact(19)).toBe(RSI_CONSTANTS.EXTREME_SCORE);
    });

    it('should return negative score for overbought RSI', () => {
      expect(calculateRsiImpact(85)).toBe(-RSI_CONSTANTS.EXTREME_SCORE);
      expect(calculateRsiImpact(81)).toBe(-RSI_CONSTANTS.EXTREME_SCORE);
    });

    it('should return zero for neutral RSI', () => {
      expect(calculateRsiImpact(50)).toBe(0);
      expect(calculateRsiImpact(30)).toBe(0);
      expect(calculateRsiImpact(70)).toBe(0);
    });

    it('should handle boundary values', () => {
      expect(calculateRsiImpact(20)).toBe(0);
      expect(calculateRsiImpact(80)).toBe(0);
    });
  });

  describe('calculateMomentumScore', () => {
    it('should return positive score for strong positive momentum', () => {
      expect(calculateMomentumScore(3.0)).toBe(MOMENTUM_CONSTANTS.SCORE);
      expect(calculateMomentumScore(2.5)).toBe(MOMENTUM_CONSTANTS.SCORE);
    });

    it('should return negative score for strong negative momentum', () => {
      expect(calculateMomentumScore(-3.0)).toBe(-MOMENTUM_CONSTANTS.SCORE);
      expect(calculateMomentumScore(-2.5)).toBe(-MOMENTUM_CONSTANTS.SCORE);
    });

    it('should return zero for weak momentum', () => {
      expect(calculateMomentumScore(0)).toBe(0);
      expect(calculateMomentumScore(1.5)).toBe(0);
      expect(calculateMomentumScore(-1.5)).toBe(0);
    });

    it('should respect custom threshold', () => {
      expect(calculateMomentumScore(1.5, 1.0)).toBe(MOMENTUM_CONSTANTS.SCORE);
      expect(calculateMomentumScore(-1.5, 1.0)).toBe(-MOMENTUM_CONSTANTS.SCORE);
    });

    it('should handle boundary values', () => {
      expect(calculateMomentumScore(2.0)).toBe(0);
      expect(calculateMomentumScore(-2.0)).toBe(0);
    });
  });

  describe('calculateContinuousMomentumScore', () => {
    it('should calculate proportional score', () => {
      expect(calculateContinuousMomentumScore(3.0)).toBe(1.0);
      expect(calculateContinuousMomentumScore(6.0)).toBe(2.0);
    });

    it('should cap at max score', () => {
      expect(calculateContinuousMomentumScore(15.0)).toBe(MOMENTUM_CONSTANTS.MAX_SCORE);
      expect(calculateContinuousMomentumScore(100.0)).toBe(MOMENTUM_CONSTANTS.MAX_SCORE);
    });

    it('should handle negative momentum', () => {
      expect(calculateContinuousMomentumScore(-3.0)).toBe(-1.0);
      expect(calculateContinuousMomentumScore(-15.0)).toBe(-MOMENTUM_CONSTANTS.MAX_SCORE);
    });

    it('should handle zero momentum', () => {
      expect(calculateContinuousMomentumScore(0)).toBe(0);
    });
  });

  describe('calculateSmaScore', () => {
    it('should return full score for both positive SMAs', () => {
      expect(calculateSmaScore(1.0, 1.0)).toBe(
        SMA_CONSTANTS.BULL_SCORE + SMA_CONSTANTS.BEAR_SCORE
      );
    });

    it('should return bull score only for positive sma5', () => {
      expect(calculateSmaScore(1.0, 0)).toBe(SMA_CONSTANTS.BULL_SCORE);
      expect(calculateSmaScore(1.0, -1.0)).toBe(SMA_CONSTANTS.BULL_SCORE);
    });

    it('should return bear score only for positive sma20', () => {
      expect(calculateSmaScore(0, 1.0)).toBe(SMA_CONSTANTS.BEAR_SCORE);
      expect(calculateSmaScore(-1.0, 1.0)).toBe(SMA_CONSTANTS.BEAR_SCORE);
    });

    it('should return zero for both negative SMAs', () => {
      expect(calculateSmaScore(0, 0)).toBe(0);
      expect(calculateSmaScore(-1.0, -1.0)).toBe(0);
    });
  });

  describe('calculateWeightedSmaScore', () => {
    it('should calculate weighted average', () => {
      const score = calculateWeightedSmaScore(10, 10);
      const expected = (10 * SMA_CONSTANTS.SMA5_WEIGHT + 10 * SMA_CONSTANTS.SMA20_WEIGHT) / SMA_CONSTANTS.DIVISOR;
      expect(score).toBeCloseTo(expected, 5);
    });

    it('should give more weight to sma5', () => {
      const score1 = calculateWeightedSmaScore(10, 0);
      const score2 = calculateWeightedSmaScore(0, 10);
      expect(score1).toBeGreaterThan(score2);
    });

    it('should handle negative values', () => {
      const score = calculateWeightedSmaScore(-10, -10);
      expect(score).toBeLessThan(0);
    });

    it('should handle zero', () => {
      expect(calculateWeightedSmaScore(0, 0)).toBe(0);
    });
  });

  describe('calculateRsiConfidenceBonus', () => {
    it('should return bonus for very extreme RSI', () => {
      expect(calculateRsiConfidenceBonus(10)).toBe(CONFIDENCE_CONSTANTS.RSI_EXTREME_BONUS);
      expect(calculateRsiConfidenceBonus(90)).toBe(CONFIDENCE_CONSTANTS.RSI_EXTREME_BONUS);
    });

    it('should return zero for moderate RSI', () => {
      expect(calculateRsiConfidenceBonus(50)).toBe(0);
      expect(calculateRsiConfidenceBonus(20)).toBe(0);
      expect(calculateRsiConfidenceBonus(80)).toBe(0);
    });

    it('should handle boundary values', () => {
      expect(calculateRsiConfidenceBonus(15)).toBe(0);
      expect(calculateRsiConfidenceBonus(85)).toBe(0);
    });
  });

  describe('calculateMomentumConfidenceBonus', () => {
    it('should return bonus for strong momentum', () => {
      expect(calculateMomentumConfidenceBonus(3.0)).toBe(CONFIDENCE_CONSTANTS.MOMENTUM_BONUS);
      expect(calculateMomentumConfidenceBonus(-3.0)).toBe(CONFIDENCE_CONSTANTS.MOMENTUM_BONUS);
    });

    it('should return zero for weak momentum', () => {
      expect(calculateMomentumConfidenceBonus(1.0)).toBe(0);
      expect(calculateMomentumConfidenceBonus(-1.0)).toBe(0);
    });

    it('should respect custom threshold', () => {
      expect(calculateMomentumConfidenceBonus(1.5, 1.0)).toBe(CONFIDENCE_CONSTANTS.MOMENTUM_BONUS);
    });

    it('should handle boundary values', () => {
      expect(calculateMomentumConfidenceBonus(2.0)).toBe(0);
      expect(calculateMomentumConfidenceBonus(-2.0)).toBe(0);
    });
  });

  describe('calculatePredictionConfidenceBonus', () => {
    it('should return bonus for large predictions', () => {
      expect(calculatePredictionConfidenceBonus(3.0)).toBe(CONFIDENCE_CONSTANTS.PREDICTION_BONUS);
      expect(calculatePredictionConfidenceBonus(-3.0)).toBe(CONFIDENCE_CONSTANTS.PREDICTION_BONUS);
    });

    it('should return zero for small predictions', () => {
      expect(calculatePredictionConfidenceBonus(1.0)).toBe(0);
      expect(calculatePredictionConfidenceBonus(-1.0)).toBe(0);
    });

    it('should respect custom threshold', () => {
      expect(calculatePredictionConfidenceBonus(1.5, 1.0)).toBe(CONFIDENCE_CONSTANTS.PREDICTION_BONUS);
    });
  });

  describe('calculateConfidence', () => {
    it('should return base confidence for neutral indicators', () => {
      const confidence = calculateConfidence(50, 0, 0);
      expect(confidence).toBe(CONFIDENCE_CONSTANTS.BASE);
    });

    it('should add RSI bonus for extreme RSI', () => {
      const confidence = calculateConfidence(10, 0, 0);
      expect(confidence).toBe(CONFIDENCE_CONSTANTS.BASE + CONFIDENCE_CONSTANTS.RSI_EXTREME_BONUS);
    });

    it('should add momentum bonus for strong momentum', () => {
      const confidence = calculateConfidence(50, 3.0, 0);
      expect(confidence).toBe(CONFIDENCE_CONSTANTS.BASE + CONFIDENCE_CONSTANTS.MOMENTUM_BONUS);
    });

    it('should add prediction bonus for large prediction', () => {
      const confidence = calculateConfidence(50, 0, 3.0);
      expect(confidence).toBe(CONFIDENCE_CONSTANTS.BASE + CONFIDENCE_CONSTANTS.PREDICTION_BONUS);
    });

    it('should add all bonuses when all conditions met', () => {
      const confidence = calculateConfidence(10, 3.0, 3.0);
      expect(confidence).toBe(
        CONFIDENCE_CONSTANTS.BASE +
        CONFIDENCE_CONSTANTS.RSI_EXTREME_BONUS +
        CONFIDENCE_CONSTANTS.MOMENTUM_BONUS +
        CONFIDENCE_CONSTANTS.PREDICTION_BONUS
      );
    });

    it('should cap at maximum confidence', () => {
      // Max bonuses: RSI_EXTREME(10) + MOMENTUM(8) + PREDICTION(5) = 23 + BASE(50) = 73
      // This is the max we can get with current constants
      const confidence = calculateConfidence(10, 10.0, 10.0);
      expect(confidence).toBe(73);
      
      // Test that clamp function would cap it at MAX
      expect(clampConfidence(150)).toBe(CONFIDENCE_CONSTANTS.MAX);
    });

    it('should not go below minimum confidence', () => {
      const confidence = calculateConfidence(50, 0, 0);
      expect(confidence).toBeGreaterThanOrEqual(CONFIDENCE_CONSTANTS.MIN);
    });
  });

  describe('clampConfidence', () => {
    it('should not change values within range', () => {
      expect(clampConfidence(60)).toBe(60);
      expect(clampConfidence(75)).toBe(75);
    });

    it('should cap at maximum', () => {
      expect(clampConfidence(100)).toBe(CONFIDENCE_CONSTANTS.MAX);
      expect(clampConfidence(150)).toBe(CONFIDENCE_CONSTANTS.MAX);
    });

    it('should floor at minimum', () => {
      expect(clampConfidence(30)).toBe(CONFIDENCE_CONSTANTS.MIN);
      expect(clampConfidence(0)).toBe(CONFIDENCE_CONSTANTS.MIN);
    });

    it('should respect custom bounds', () => {
      expect(clampConfidence(60, 0, 100)).toBe(60);
      expect(clampConfidence(150, 0, 100)).toBe(100);
      expect(clampConfidence(-10, 0, 100)).toBe(0);
    });
  });
});
