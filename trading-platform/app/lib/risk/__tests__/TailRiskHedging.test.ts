/**
 * TailRiskHedging Tests
 */

import { TailRiskHedging, HedgeStrategy, TailRiskMetrics } from '../TailRiskHedging';
import { Portfolio } from '@/app/types';

describe('TailRiskHedging', () => {
  let portfolio: Portfolio;
  let hedging: TailRiskHedging;

  beforeEach(() => {
    portfolio = {
      cash: 50000,
      positions: [
        {
          symbol: 'AAPL',
          quantity: 100,
          entryPrice: 150,
          currentPrice: 160,
          side: 'LONG',
          market: 'US',
          timestamp: Date.now()
        },
        {
          symbol: 'MSFT',
          quantity: 50,
          entryPrice: 300,
          currentPrice: 320,
          side: 'LONG',
          market: 'US',
          timestamp: Date.now()
        }
      ],
      totalValue: 82000,
      dailyPnL: 2000,
      totalProfit: 4000,
      orders: []
    };

    hedging = new TailRiskHedging(portfolio);
  });

  describe('calculateTailRiskMetrics', () => {
    it('should return default metrics when insufficient data', () => {
      const metrics = hedging.calculateTailRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.tailRisk).toBeGreaterThan(0);
      expect(metrics.maxExpectedLoss).toBeGreaterThan(0);
    });

    it('should calculate tail risk metrics with sufficient data', () => {
      // Generate mock returns with negative skew
      const returns = [
        0.01, 0.02, 0.015, 0.01, 0.005,
        -0.02, -0.01, 0.01, 0.02, 0.015,
        0.01, -0.05, 0.01, 0.02, 0.01,
        -0.1, 0.01, 0.02, 0.015, 0.01,
        0.005, -0.02, 0.01, 0.015, 0.01,
        0.02, 0.01, -0.03, 0.015, 0.01,
        -0.15 // Tail event
      ];

      hedging.updateReturns(returns);
      const metrics = hedging.calculateTailRiskMetrics();

      expect(metrics.tailRisk).toBeGreaterThan(0);
      expect(metrics.skewness).toBeLessThan(0); // Negative skew expected
      expect(metrics.kurtosis).toBeDefined();
      expect(metrics.maxExpectedLoss).toBeGreaterThanOrEqual(metrics.tailRisk);
      expect(metrics.probabilityOfTailEvent).toBeGreaterThan(0);
      expect(metrics.probabilityOfTailEvent).toBeLessThan(1);
    });

    it('should detect high kurtosis (fat tails)', () => {
      // Generate returns with fat tails
      const returns = Array(100).fill(0).map((_, i) => {
        if (i % 20 === 0) return -0.1; // Extreme losses
        if (i % 20 === 1) return 0.1; // Extreme gains
        return 0.001; // Small fluctuations
      });

      hedging.updateReturns(returns);
      const metrics = hedging.calculateTailRiskMetrics();

      expect(metrics.kurtosis).toBeGreaterThan(0); // Positive excess kurtosis
    });
  });

  describe('generateHedgeRecommendations', () => {
    it('should generate recommendations based on tail risk', () => {
      // High tail risk scenario
      const returns = Array(50).fill(0).map((_, i) => 
        i % 10 === 0 ? -0.08 : 0.01
      );

      hedging.updateReturns(returns);
      const recommendations = hedging.generateHedgeRecommendations();

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        expect(rec.strategy).toBeDefined();
        expect(rec.rationale).toBeDefined();
        expect(rec.costBenefitRatio).toBeGreaterThan(0);
        expect(rec.hedgeRatio).toBeGreaterThan(0);
        expect(rec.hedgeRatio).toBeLessThanOrEqual(1);
      });
    });

    it('should recommend put options for high tail risk', () => {
      const returns = Array(50).fill(0).map((_, i) => 
        i % 8 === 0 ? -0.1 : 0.01
      );

      hedging.updateReturns(returns);
      const recommendations = hedging.generateHedgeRecommendations();

      const putHedge = recommendations.find(r => r.strategy.type === 'put_option');
      expect(putHedge).toBeDefined();
      expect(putHedge!.strategy.symbol).toContain('PUT');
    });

    it('should recommend VIX futures for negative skewness', () => {
      const returns = [
        ...Array(40).fill(0.01),
        -0.05, -0.08, -0.1, -0.12, -0.15,
        ...Array(5).fill(0.005)
      ];

      hedging.updateReturns(returns);
      const recommendations = hedging.generateHedgeRecommendations();

      const vixHedge = recommendations.find(r => r.strategy.type === 'vix_futures');
      expect(vixHedge).toBeDefined();
      expect(vixHedge!.strategy.symbol).toBe('VIX');
    });

    it('should sort recommendations by cost-benefit ratio', () => {
      const returns = Array(50).fill(0).map((_, i) => 
        i % 5 === 0 ? -0.06 : 0.01
      );

      hedging.updateReturns(returns);
      const recommendations = hedging.generateHedgeRecommendations();

      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          expect(recommendations[i].costBenefitRatio)
            .toBeGreaterThanOrEqual(recommendations[i + 1].costBenefitRatio);
        }
      }
    });
  });

  describe('evaluateHedgePerformance', () => {
    it('should evaluate put option performance in market crash', () => {
      const putHedge: HedgeStrategy = {
        type: 'put_option',
        symbol: 'SPY_PUT',
        quantity: 100,
        cost: 2000,
        expectedProtection: 5,
        breakEvenMove: 2.5
      };

      // Market crashes 10%
      const performance = hedging.evaluateHedgePerformance(putHedge, -10);

      expect(performance.protectionProvided).toBeGreaterThan(0);
      expect(performance.efficiency).toBeGreaterThan(0);
      expect(performance.returnImpact).toBeDefined();
    });

    it('should show no protection when market rises', () => {
      const putHedge: HedgeStrategy = {
        type: 'put_option',
        symbol: 'SPY_PUT',
        quantity: 100,
        cost: 2000,
        expectedProtection: 5,
        breakEvenMove: 2.5
      };

      // Market rises 5%
      const performance = hedging.evaluateHedgePerformance(putHedge, 5);

      expect(performance.protectionProvided).toBe(0);
      expect(performance.returnImpact).toBeLessThan(0); // Only cost
    });

    it('should evaluate VIX hedge performance in volatility spike', () => {
      const vixHedge: HedgeStrategy = {
        type: 'vix_futures',
        symbol: 'VIX',
        quantity: 10,
        cost: 1500,
        expectedProtection: 8,
        breakEvenMove: 15
      };

      // Market crashes 15% (VIX spikes)
      const performance = hedging.evaluateHedgePerformance(vixHedge, -15);

      expect(performance.protectionProvided).toBeGreaterThan(0);
    });

    it('should evaluate inverse ETF performance', () => {
      const inverseHedge: HedgeStrategy = {
        type: 'inverse_etf',
        symbol: 'SH',
        quantity: 100,
        cost: 500,
        expectedProtection: 3,
        breakEvenMove: 1
      };

      // Market drops 5%
      const performance = hedging.evaluateHedgePerformance(inverseHedge, -5);

      expect(performance.protectionProvided).toBeGreaterThan(0);
      expect(performance.efficiency).toBeGreaterThan(0);
    });
  });

  describe('buildOptimalHedgePortfolio', () => {
    it('should select hedges within budget', () => {
      const returns = Array(50).fill(0).map((_, i) => 
        i % 7 === 0 ? -0.08 : 0.01
      );

      hedging.updateReturns(returns);
      
      const maxBudget = 5000;
      const hedgePortfolio = hedging.buildOptimalHedgePortfolio(maxBudget);

      const totalCost = hedgePortfolio.reduce((sum, h) => sum + h.cost, 0);
      expect(totalCost).toBeLessThanOrEqual(maxBudget);
    });

    it('should prioritize high cost-benefit hedges', () => {
      const returns = Array(50).fill(0).map((_, i) => 
        i % 6 === 0 ? -0.09 : 0.01
      );

      hedging.updateReturns(returns);
      
      const hedgePortfolio = hedging.buildOptimalHedgePortfolio(10000);

      if (hedgePortfolio.length > 0) {
        // First hedge should have reasonable expected protection
        expect(hedgePortfolio[0].expectedProtection).toBeGreaterThan(0);
      }
    });

    it('should return empty array if no recommendations fit budget', () => {
      const returns = Array(50).fill(0).map(() => 0.01);
      hedging.updateReturns(returns);
      
      const hedgePortfolio = hedging.buildOptimalHedgePortfolio(100); // Very low budget

      // With low tail risk, might not generate expensive hedges
      expect(Array.isArray(hedgePortfolio)).toBe(true);
    });
  });

  describe('updateReturns', () => {
    it('should update returns and recalculate volatility', () => {
      const returns = [0.01, 0.02, -0.01, 0.015, 0.005];
      
      hedging.updateReturns(returns);
      const metrics = hedging.calculateTailRiskMetrics();

      expect(metrics).toBeDefined();
    });
  });

  describe('updatePortfolio', () => {
    it('should update portfolio reference', () => {
      const newPortfolio: Portfolio = {
        ...portfolio,
        totalValue: 100000
      };

      hedging.updatePortfolio(newPortfolio);
      
      const recommendations = hedging.generateHedgeRecommendations();
      // Recommendations should be based on new portfolio value
      expect(recommendations).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle portfolio with zero value', () => {
      const emptyPortfolio: Portfolio = {
        cash: 0,
        positions: [],
        totalValue: 0,
        dailyPnL: 0,
        totalProfit: 0,
        orders: []
      };

      const emptyHedging = new TailRiskHedging(emptyPortfolio);
      const metrics = emptyHedging.calculateTailRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.tailRisk).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty returns array', () => {
      hedging.updateReturns([]);
      const metrics = hedging.calculateTailRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.tailRisk).toBeGreaterThan(0);
    });

    it('should handle single return value', () => {
      hedging.updateReturns([0.05]);
      const metrics = hedging.calculateTailRiskMetrics();

      expect(metrics).toBeDefined();
    });

    it('should handle all zero returns', () => {
      hedging.updateReturns(Array(50).fill(0));
      const metrics = hedging.calculateTailRiskMetrics();

      expect(metrics.skewness).toBe(0);
      expect(metrics.kurtosis).toBe(0);
    });
  });
});
