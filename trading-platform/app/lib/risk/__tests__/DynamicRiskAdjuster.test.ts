/**
 * DynamicRiskAdjuster.test.ts
 * 
 * Unit tests for DynamicRiskAdjuster
 */

import { DynamicRiskAdjuster, DEFAULT_ADJUSTER_CONFIG } from '../DynamicRiskAdjuster';
import { RealTimeRiskMetrics } from '../RealTimeRiskCalculator';
import { Portfolio } from '@/app/types';

describe('DynamicRiskAdjuster', () => {
  let adjuster: DynamicRiskAdjuster;
  let mockPortfolio: Portfolio;
  let mockRiskMetrics: RealTimeRiskMetrics;

  beforeEach(() => {
    adjuster = new DynamicRiskAdjuster();
    
    mockPortfolio = {
      cash: 100000,
      positions: [],
      totalValue: 100000,
      dailyPnL: 0,
      totalProfit: 0,
      orders: [],
    };

    mockRiskMetrics = {
      totalRiskPercent: 10,
      usedCapitalPercent: 50,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      currentDrawdown: 5,
      maxDrawdown: 5,
      peakValue: 100000,
      var95: 5000,
      var99: 7000,
      cvar95: 6000,
      portfolioVolatility: 15,
      weightedVolatility: 15,
      concentrationRisk: 0.3,
      largestPositionPercent: 25,
      correlationRisk: 0.4,
      avgCorrelation: 0.4,
      dailyLoss: 0,
      dailyLossPercent: 0,
      riskLevel: 'safe',
      alerts: [],
    };
  });

  describe('Volatility Adjustment', () => {
    it('should reduce risk in high volatility', () => {
      mockRiskMetrics.portfolioVolatility = 35; // High volatility
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.riskMultiplier).toBeLessThan(1);
      expect(adjustment.volatilityAdjustment).toBeLessThan(1);
      expect(adjustment.reasons.some(r => r.includes('ボラティリティ'))).toBe(true);
    });

    it('should increase risk in low volatility', () => {
      mockRiskMetrics.portfolioVolatility = 5; // Low volatility
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.riskMultiplier).toBeGreaterThan(1);
      expect(adjustment.volatilityAdjustment).toBeGreaterThan(1);
    });

    it('should not adjust risk in normal volatility', () => {
      mockRiskMetrics.portfolioVolatility = 20; // Normal volatility
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.volatilityAdjustment).toBe(1);
    });
  });

  describe('Market Condition Adjustment', () => {
    it('should increase risk in bull market', () => {
      adjuster.updateMarketCondition('bull');
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.marketConditionAdjustment).toBeGreaterThan(1);
      expect(adjustment.riskMultiplier).toBeGreaterThan(1);
    });

    it('should decrease risk in bear market', () => {
      adjuster.updateMarketCondition('bear');
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.marketConditionAdjustment).toBeLessThan(1);
      expect(adjustment.riskMultiplier).toBeLessThan(1);
    });

    it('should maintain risk in sideways market', () => {
      adjuster.updateMarketCondition('sideways');
      mockRiskMetrics.portfolioVolatility = 15; // Disable volatility adjustment
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.marketConditionAdjustment).toBe(1);
    });
  });

  describe('Consecutive Loss Adjustment', () => {
    it('should reduce risk after consecutive losses', () => {
      // Simulate 3 consecutive losses
      adjuster.updatePerformance({ profit: -1000, profitPercent: -5, isWin: false });
      adjuster.updatePerformance({ profit: -1500, profitPercent: -7, isWin: false });
      adjuster.updatePerformance({ profit: -2000, profitPercent: -10, isWin: false });
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.consecutiveLossAdjustment).toBeLessThan(1);
      expect(adjustment.riskMultiplier).toBeLessThan(1);
      expect(adjustment.reasons.some(r => r.includes('連続損失'))).toBe(true);
    });

    it('should reset consecutive losses after a win', () => {
      // Simulate losses then a win
      adjuster.updatePerformance({ profit: -1000, profitPercent: -5, isWin: false });
      adjuster.updatePerformance({ profit: -1500, profitPercent: -7, isWin: false });
      adjuster.updatePerformance({ profit: 3000, profitPercent: 15, isWin: true });
      
      const metrics = adjuster.getPerformanceMetrics();
      
      expect(metrics.consecutiveLosses).toBe(0);
      expect(metrics.consecutiveWins).toBe(1);
    });
  });

  describe('Profit Adjustment', () => {
    it('should not increase risk without significant profit threshold', () => {
      // Simulate profit below threshold
      adjuster.updatePerformance({ profit: 5000, profitPercent: 5, isWin: true });
      mockPortfolio.totalProfit = 5000;
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      // Profit adjustment should be 1 since profit is below 10% threshold
      expect(adjustment.profitAdjustment).toBe(1);
    });
  });

  describe('Market Condition Detection', () => {
    it('should detect bull market', () => {
      mockPortfolio.dailyPnL = 3000;
      mockRiskMetrics.portfolioVolatility = 15;
      
      const condition = adjuster.detectMarketCondition(mockRiskMetrics, mockPortfolio);
      
      expect(condition).toBe('bull');
    });

    it('should detect bear market', () => {
      mockPortfolio.dailyPnL = -3000;
      mockRiskMetrics.portfolioVolatility = 15;
      
      const condition = adjuster.detectMarketCondition(mockRiskMetrics, mockPortfolio);
      
      expect(condition).toBe('bear');
    });

    it('should detect volatile market', () => {
      mockRiskMetrics.portfolioVolatility = 35;
      
      const condition = adjuster.detectMarketCondition(mockRiskMetrics, mockPortfolio);
      
      expect(condition).toBe('volatile');
    });

    it('should detect stable market', () => {
      mockRiskMetrics.portfolioVolatility = 8;
      
      const condition = adjuster.detectMarketCondition(mockRiskMetrics, mockPortfolio);
      
      expect(condition).toBe('stable');
    });

    it('should detect sideways market', () => {
      mockPortfolio.dailyPnL = 500; // Small change
      mockRiskMetrics.portfolioVolatility = 15;
      
      const condition = adjuster.detectMarketCondition(mockRiskMetrics, mockPortfolio);
      
      expect(condition).toBe('sideways');
    });
  });

  describe('Risk Recalculation After Profit', () => {
    it('should recommend risk increase after large profit', () => {
      const result = adjuster.recalculateAfterProfit(15000, 15, mockPortfolio);
      
      expect(result.shouldIncreaseRisk).toBe(true);
      expect(result.newBaseRisk).toBeGreaterThan(DEFAULT_ADJUSTER_CONFIG.baseRiskPercent);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should recommend risk increase after large profit', () => {
      const result = adjuster.recalculateAfterProfit(15000, 15, mockPortfolio);
      
      // Large profit (15%) should trigger recommendation
      expect(result.newBaseRisk).toBeGreaterThan(DEFAULT_ADJUSTER_CONFIG.baseRiskPercent);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should increase risk after consecutive wins', () => {
      adjuster.updatePerformance({ profit: 3000, profitPercent: 3, isWin: true });
      adjuster.updatePerformance({ profit: 3500, profitPercent: 3.5, isWin: true });
      adjuster.updatePerformance({ profit: 4000, profitPercent: 4, isWin: true });
      
      const result = adjuster.recalculateAfterProfit(4000, 4, mockPortfolio);
      
      expect(result.shouldIncreaseRisk).toBe(true);
      expect(result.reasons.some(r => r.includes('連続勝利'))).toBe(true);
    });
  });

  describe('Position Size Calculation', () => {
    it('should adjust position size based on risk multiplier', () => {
      adjuster.updateMarketCondition('bull');
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.recommendedPositionSize).not.toBe(100);
      expect(adjustment.positionSizeMultiplier).not.toBe(1);
    });

    it('should respect min and max risk limits', () => {
      // Extreme volatility
      mockRiskMetrics.portfolioVolatility = 100;
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.adjustedRiskPercent).toBeGreaterThanOrEqual(DEFAULT_ADJUSTER_CONFIG.minRiskPercent);
      expect(adjustment.adjustedRiskPercent).toBeLessThanOrEqual(DEFAULT_ADJUSTER_CONFIG.maxRiskPercent);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customAdjuster = new DynamicRiskAdjuster({
        baseRiskPercent: 3,
        enableVolatilityAdjustment: false,
      });
      
      const config = customAdjuster.getConfig();
      
      expect(config.baseRiskPercent).toBe(3);
      expect(config.enableVolatilityAdjustment).toBe(false);
    });

    it('should update configuration', () => {
      adjuster.updateConfig({
        baseRiskPercent: 3,
      });
      
      const config = adjuster.getConfig();
      
      expect(config.baseRiskPercent).toBe(3);
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      adjuster.updatePerformance({ profit: 3000, profitPercent: 3, isWin: true });
      
      const metrics = adjuster.getPerformanceMetrics();
      
      expect(metrics.consecutiveWins).toBe(1);
      expect(metrics.totalProfit).toBe(3000);
    });

    it('should track consecutive wins', () => {
      adjuster.updatePerformance({ profit: 3000, profitPercent: 3, isWin: true });
      adjuster.updatePerformance({ profit: 3500, profitPercent: 3.5, isWin: true });
      adjuster.updatePerformance({ profit: 4000, profitPercent: 4, isWin: true });
      
      const metrics = adjuster.getPerformanceMetrics();
      
      expect(metrics.consecutiveWins).toBe(3);
      expect(metrics.consecutiveLosses).toBe(0);
    });

    it('should track consecutive losses', () => {
      adjuster.updatePerformance({ profit: -1000, profitPercent: -1, isWin: false });
      adjuster.updatePerformance({ profit: -1500, profitPercent: -1.5, isWin: false });
      
      const metrics = adjuster.getPerformanceMetrics();
      
      expect(metrics.consecutiveLosses).toBe(2);
      expect(metrics.consecutiveWins).toBe(0);
    });
  });

  describe('Reset Functions', () => {
    it('should reset performance', () => {
      adjuster.updatePerformance({ profit: 3000, profitPercent: 3, isWin: true });
      adjuster.resetPerformance();
      
      const metrics = adjuster.getPerformanceMetrics();
      
      expect(metrics.consecutiveWins).toBe(0);
      expect(metrics.totalProfit).toBe(0);
    });

    it('should reset everything', () => {
      adjuster.updateMarketCondition('bull');
      adjuster.updatePerformance({ profit: 3000, profitPercent: 3, isWin: true });
      
      adjuster.reset();
      
      expect(adjuster.getCurrentMarketCondition()).toBe('sideways');
      expect(adjuster.getPerformanceMetrics().consecutiveWins).toBe(0);
    });
  });

  describe('Combined Adjustments', () => {
    it('should apply multiple adjustments together', () => {
      // High volatility + bear market + consecutive losses
      mockRiskMetrics.portfolioVolatility = 35;
      adjuster.updateMarketCondition('bear');
      adjuster.updatePerformance({ profit: -1000, profitPercent: -5, isWin: false });
      adjuster.updatePerformance({ profit: -1500, profitPercent: -7, isWin: false });
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.riskMultiplier).toBeLessThan(0.5); // Significantly reduced
      expect(adjustment.reasons.length).toBeGreaterThan(2);
    });

    it('should apply positive adjustments together', () => {
      // Low volatility + bull market + consecutive wins
      mockRiskMetrics.portfolioVolatility = 8;
      adjuster.updateMarketCondition('bull');
      adjuster.updatePerformance({ profit: 3000, profitPercent: 3, isWin: true });
      adjuster.updatePerformance({ profit: 3500, profitPercent: 3.5, isWin: true });
      
      const adjustment = adjuster.adjustPositionSize(100, 1000, mockPortfolio, mockRiskMetrics);
      
      expect(adjustment.riskMultiplier).toBeGreaterThan(1);
    });
  });
});
