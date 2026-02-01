/**
 * StressTestEngine Tests
 * 
 * Tests for stress testing and Monte Carlo simulation functionality
 */

import { StressTestEngine, createStressTestEngine } from '../StressTestEngine';
import { Portfolio, Position } from '@/app/types';
import { StressScenario } from '@/app/types/risk';

describe('StressTestEngine', () => {
  let stressTestEngine: StressTestEngine;
  let portfolio: Portfolio;

  beforeEach(() => {
    portfolio = {
      totalValue: 100000,
      positions: [
        {
          symbol: 'AAPL',
          name: 'Apple',
          market: 'usa',
          side: 'LONG',
          quantity: 100,
          avgPrice: 150,
          currentPrice: 150,
          change: 0,
          entryDate: '2024-01-01'
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft',
          market: 'usa',
          side: 'LONG',
          quantity: 50,
          avgPrice: 300,
          currentPrice: 300,
          change: 0,
          entryDate: '2024-01-01'
        }
      ],
      orders: [],
      totalProfit: 0,
      dailyPnL: 0,
      cash: 70000
    };

    stressTestEngine = new StressTestEngine(portfolio);

    // Add historical returns
    stressTestEngine.updateHistoricalData('AAPL', [0.01, -0.02, 0.03, -0.01, 0.02]);
    stressTestEngine.updateHistoricalData('MSFT', [0.02, -0.01, 0.01, 0.02, -0.01]);
  });

  describe('runStressTest', () => {
    it('should run stress test and return results', () => {
      const scenario: StressScenario = {
        name: 'Market Crash',
        description: 'Severe market downturn',
        marketShock: -20,
        volatilityMultiplier: 3.0,
        correlationChange: 0.3
      };

      const result = stressTestEngine.runStressTest(scenario);

      expect(result.scenario).toBe(scenario);
      expect(result.portfolioImpact).toBeLessThan(0);
      expect(result.portfolioImpactPercent).toBeLessThan(0);
      expect(result.positionImpacts.length).toBe(2);
      expect(result.var95).toBeGreaterThanOrEqual(0);
      expect(result.cvar95).toBeGreaterThanOrEqual(0);
      expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    });

    it('should calculate impacts for each position', () => {
      const scenario: StressScenario = {
        name: 'Market Crash',
        description: 'Severe market downturn',
        marketShock: -20,
        volatilityMultiplier: 3.0,
        correlationChange: 0.3
      };

      const result = stressTestEngine.runStressTest(scenario);

      expect(result.positionImpacts[0].symbol).toBe('AAPL');
      expect(result.positionImpacts[1].symbol).toBe('MSFT');
      expect(result.positionImpacts[0].impact).toBeLessThan(0);
      expect(result.positionImpacts[1].impact).toBeLessThan(0);
    });
  });

  describe('runMultipleScenarios', () => {
    it('should run multiple default scenarios', () => {
      const results = stressTestEngine.runMultipleScenarios();

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('scenario');
      expect(results[0]).toHaveProperty('portfolioImpact');
      expect(results[0]).toHaveProperty('var95');
    });

    it('should include Black Swan scenario', () => {
      const results = stressTestEngine.runMultipleScenarios();

      const blackSwanResult = results.find(r => r.scenario.name === 'Black Swan');
      expect(blackSwanResult).toBeDefined();
      if (blackSwanResult) {
        expect(blackSwanResult.scenario.marketShock).toBeLessThan(-20);
      }
    });
  });

  describe('runMonteCarloSimulation', () => {
    it('should run Monte Carlo simulation', () => {
      const config = {
        numSimulations: 100,
        timeHorizon: 30,
        confidenceLevel: 0.95
      };

      const result = stressTestEngine.runMonteCarloSimulation(config);

      expect(result).toHaveProperty('expectedReturn');
      expect(result).toHaveProperty('standardDeviation');
      expect(result).toHaveProperty('var95');
      expect(result).toHaveProperty('cvar95');
      expect(result).toHaveProperty('probabilityOfProfit');
      expect(result).toHaveProperty('worstCase');
      expect(result).toHaveProperty('bestCase');
      expect(result).toHaveProperty('percentiles');
    });

    it('should have probability of profit between 0 and 1', () => {
      const config = {
        numSimulations: 100,
        timeHorizon: 30,
        confidenceLevel: 0.95
      };

      const result = stressTestEngine.runMonteCarloSimulation(config);

      expect(result.probabilityOfProfit).toBeGreaterThanOrEqual(0);
      expect(result.probabilityOfProfit).toBeLessThanOrEqual(1);
    });

    it('should have worst case less than expected return', () => {
      const config = {
        numSimulations: 100,
        timeHorizon: 30,
        confidenceLevel: 0.95
      };

      const result = stressTestEngine.runMonteCarloSimulation(config);

      expect(result.worstCase).toBeLessThanOrEqual(result.expectedReturn);
    });

    it('should have best case greater than expected return', () => {
      const config = {
        numSimulations: 100,
        timeHorizon: 30,
        confidenceLevel: 0.95
      };

      const result = stressTestEngine.runMonteCarloSimulation(config);

      expect(result.bestCase).toBeGreaterThanOrEqual(result.expectedReturn);
    });

    it('should have percentiles in ascending order', () => {
      const config = {
        numSimulations: 100,
        timeHorizon: 30,
        confidenceLevel: 0.95
      };

      const result = stressTestEngine.runMonteCarloSimulation(config);
      const p = result.percentiles;

      expect(p.p5).toBeLessThanOrEqual(p.p10);
      expect(p.p10).toBeLessThanOrEqual(p.p25);
      expect(p.p25).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p90);
      expect(p.p90).toBeLessThanOrEqual(p.p95);
    });
  });

  describe('analyzeWorstCase', () => {
    it('should analyze worst case scenarios', () => {
      const worstCase = stressTestEngine.analyzeWorstCase();

      expect(worstCase).toHaveProperty('worstDayLoss');
      expect(worstCase).toHaveProperty('worstWeekLoss');
      expect(worstCase).toHaveProperty('worstMonthLoss');
      expect(worstCase).toHaveProperty('probabilityOfRuin');
    });

    it('should have probability of ruin between 0 and 1', () => {
      const worstCase = stressTestEngine.analyzeWorstCase();

      expect(worstCase.probabilityOfRuin).toBeGreaterThanOrEqual(0);
      expect(worstCase.probabilityOfRuin).toBeLessThanOrEqual(1);
    });

    it('should have worst week loss greater than worst day loss', () => {
      const worstCase = stressTestEngine.analyzeWorstCase();

      expect(Math.abs(worstCase.worstWeekLoss)).toBeGreaterThanOrEqual(
        Math.abs(worstCase.worstDayLoss)
      );
    });

    it('should have worst month loss greater than worst week loss', () => {
      const worstCase = stressTestEngine.analyzeWorstCase();

      expect(Math.abs(worstCase.worstMonthLoss)).toBeGreaterThanOrEqual(
        Math.abs(worstCase.worstWeekLoss)
      );
    });
  });

  describe('updateHistoricalData', () => {
    it('should update historical returns', () => {
      stressTestEngine.updateHistoricalData('GOOGL', [0.01, 0.02, 0.01, -0.01, 0.02]);

      // This should not throw an error
      expect(() => {
        const scenario: StressScenario = {
          name: 'Test',
          description: 'Test scenario',
          marketShock: -10,
          volatilityMultiplier: 2.0,
          correlationChange: 0.1
        };
        stressTestEngine.runStressTest(scenario);
      }).not.toThrow();
    });
  });

  describe('updatePortfolio', () => {
    it('should update portfolio', () => {
      const newPortfolio: Portfolio = {
        totalValue: 150000,
        positions: [
          {
            symbol: 'GOOGL',
            name: 'Google',
            market: 'usa',
            side: 'LONG',
            quantity: 100,
            avgPrice: 150,
            currentPrice: 150,
            change: 0,
            entryDate: '2024-01-01'
          }
        ],
        orders: [],
        totalProfit: 0,
        dailyPnL: 0,
        cash: 135000
      };

      stressTestEngine.updatePortfolio(newPortfolio);

      // This should not throw an error
      expect(() => {
        const scenario: StressScenario = {
          name: 'Test',
          description: 'Test scenario',
          marketShock: -10,
          volatilityMultiplier: 2.0,
          correlationChange: 0.1
        };
        stressTestEngine.runStressTest(scenario);
      }).not.toThrow();
    });
  });

  describe('createStressTestEngine', () => {
    it('should create instance using factory function', () => {
      const instance = createStressTestEngine(portfolio);
      expect(instance).toBeInstanceOf(StressTestEngine);
    });
  });
});
