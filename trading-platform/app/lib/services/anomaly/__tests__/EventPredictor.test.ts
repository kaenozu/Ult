/**
 * Unit tests for EventPredictor
 */

import { EventPredictor } from '../EventPredictor';
import { Portfolio, Asset } from '../types';

describe('EventPredictor', () => {
  let predictor: EventPredictor;

  beforeEach(() => {
    predictor = new EventPredictor();
  });

  describe('predictEvent', () => {
    it('should predict market events from OHLCV data', async () => {
      const ohlcv = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100 + i * 0.5,
        high: 105 + i * 0.5,
        low: 95 + i * 0.5,
        close: 100 + i * 0.5,
        volume: 1000,
      }));

      const prediction = await predictor.predictEvent(ohlcv);

      expect(prediction).toBeDefined();
      expect(prediction.eventType).toBeDefined();
      expect(prediction.probability).toBeGreaterThan(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.expectedTime).toBeInstanceOf(Date);
      expect(prediction.attentionWeights).toBeDefined();
      expect(prediction.recommendedActions).toBeInstanceOf(Array);
    });

    it('should detect high volatility events', async () => {
      const ohlcv = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 120 + Math.random() * 20,
        low: 80 - Math.random() * 20,
        close: 100 + (Math.random() - 0.5) * 40, // High volatility
        volume: 1000,
      }));

      const prediction = await predictor.predictEvent(ohlcv);

      expect(prediction.eventType).toBe('HIGH_VOLATILITY');
    });

    it('should provide attention weights for features', async () => {
      const ohlcv = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      }));

      const prediction = await predictor.predictEvent(ohlcv);

      expect(Object.keys(prediction.attentionWeights).length).toBeGreaterThan(0);
      
      // Sum of attention weights should be close to 1
      const sum = Object.values(prediction.attentionWeights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 1);
    });
  });

  describe('predictPriceMovement', () => {
    it('should generate price predictions for specified horizon', async () => {
      const ohlcv = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100 + i * 0.2,
        volume: 1000,
      }));

      const horizon = 5;
      const prediction = await predictor.predictPriceMovement('TEST', ohlcv, horizon);

      expect(prediction.symbol).toBe('TEST');
      expect(prediction.horizon).toBe(horizon);
      expect(prediction.predictions).toHaveLength(horizon);
      expect(prediction.uncertainty).toBeDefined();
      expect(prediction.uncertainty.lower).toHaveLength(horizon);
      expect(prediction.uncertainty.upper).toHaveLength(horizon);
      expect(prediction.uncertainty.std).toHaveLength(horizon);
    });

    it('should provide decreasing confidence for longer horizons', async () => {
      const ohlcv = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      }));

      const prediction = await predictor.predictPriceMovement('TEST', ohlcv, 5);

      // Confidence should decrease as we predict further out
      for (let i = 1; i < prediction.predictions.length; i++) {
        expect(prediction.predictions[i].confidence).toBeLessThanOrEqual(
          prediction.predictions[i - 1].confidence
        );
      }
    });

    it('should include uncertainty bounds', async () => {
      const ohlcv = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${i + 1}`,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      }));

      const prediction = await predictor.predictPriceMovement('TEST', ohlcv, 3);

      prediction.predictions.forEach((pred, i) => {
        expect(prediction.uncertainty.lower[i]).toBeLessThan(pred.price);
        expect(prediction.uncertainty.upper[i]).toBeGreaterThan(pred.price);
      });
    });
  });

  describe('assessTailRisk', () => {
    it('should calculate VaR and CVaR', () => {
      const mockAsset: Asset = {
        symbol: 'TEST',
        quantity: 100,
        entryPrice: 100,
        currentPrice: 105,
        getReturns: () => Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.1),
      };

      const mockPortfolio: Portfolio = {
        assets: [mockAsset],
        totalValue: 10500,
        cash: 500,
        getHistoricalReturns: () => Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.1),
      };

      const assessment = predictor.assessTailRisk(mockPortfolio);

      expect(assessment.var95).toBeGreaterThan(0);
      expect(assessment.var99).toBeGreaterThan(0);
      expect(assessment.cvar95).toBeGreaterThan(0);
      expect(assessment.cvar99).toBeGreaterThan(0);
      expect(assessment.var99).toBeGreaterThanOrEqual(assessment.var95);
      expect(assessment.cvar99).toBeGreaterThanOrEqual(assessment.var99);
    });

    it('should provide EVT analysis', () => {
      const mockPortfolio: Portfolio = {
        assets: [],
        totalValue: 10000,
        cash: 10000,
        getHistoricalReturns: () => Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.1),
      };

      const assessment = predictor.assessTailRisk(mockPortfolio);

      expect(assessment.evtAnalysis).toBeDefined();
      expect(assessment.evtAnalysis.shape).toBeDefined();
      expect(assessment.evtAnalysis.scale).toBeGreaterThan(0);
      expect(assessment.evtAnalysis.extremeQuantiles).toBeDefined();
    });

    it('should run Monte Carlo simulation', () => {
      const mockPortfolio: Portfolio = {
        assets: [],
        totalValue: 10000,
        cash: 10000,
        getHistoricalReturns: () => Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.1),
      };

      const assessment = predictor.assessTailRisk(mockPortfolio);

      expect(assessment.monteCarloResults).toBeDefined();
      expect(assessment.monteCarloResults.scenarios).toBe(10000);
      expect(assessment.monteCarloResults.worstCase).toBeLessThan(assessment.monteCarloResults.bestCase);
      expect(assessment.monteCarloResults.distribution).toHaveLength(10000);
    });

    it('should assess risk level correctly', () => {
      const mockPortfolio: Portfolio = {
        assets: [],
        totalValue: 10000,
        cash: 10000,
        getHistoricalReturns: () => Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.1),
      };

      const assessment = predictor.assessTailRisk(mockPortfolio);

      expect(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']).toContain(assessment.riskLevel);
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeRiskCorrelation', () => {
    it('should calculate correlation matrix', () => {
      const assets: Asset[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          entryPrice: 150,
          currentPrice: 155,
          getReturns: () => Array.from({ length: 50 }, () => Math.random() * 0.02),
        },
        {
          symbol: 'GOOGL',
          quantity: 50,
          entryPrice: 2800,
          currentPrice: 2850,
          getReturns: () => Array.from({ length: 50 }, () => Math.random() * 0.02),
        },
      ];

      const analysis = predictor.analyzeRiskCorrelation(assets);

      expect(analysis.correlationMatrix).toBeDefined();
      expect(analysis.correlationMatrix.length).toBe(assets.length);
      expect(analysis.correlationMatrix[0].length).toBe(assets.length);
      
      // Diagonal should be 1.0
      assets.forEach((_, i) => {
        expect(analysis.correlationMatrix[i][i]).toBeCloseTo(1.0, 5);
      });
    });

    it('should fit copula model', () => {
      const assets: Asset[] = [
        {
          symbol: 'TEST1',
          quantity: 100,
          entryPrice: 100,
          currentPrice: 105,
          getReturns: () => Array.from({ length: 50 }, () => Math.random() * 0.02),
        },
        {
          symbol: 'TEST2',
          quantity: 100,
          entryPrice: 100,
          currentPrice: 105,
          getReturns: () => Array.from({ length: 50 }, () => Math.random() * 0.02),
        },
      ];

      const analysis = predictor.analyzeRiskCorrelation(assets);

      expect(analysis.copula).toBeDefined();
      expect(analysis.copula.type).toBe('gaussian');
      expect(analysis.copula.parameters).toBeDefined();
      expect(analysis.copula.dependenceStructure).toBeDefined();
    });

    it('should generate stress scenarios', () => {
      const assets: Asset[] = [
        {
          symbol: 'TEST',
          quantity: 100,
          entryPrice: 100,
          currentPrice: 105,
          getReturns: () => Array.from({ length: 50 }, () => Math.random() * 0.02),
        },
      ];

      const analysis = predictor.analyzeRiskCorrelation(assets);

      expect(analysis.stressScenarios).toBeInstanceOf(Array);
      expect(analysis.stressScenarios.length).toBeGreaterThan(0);
      
      analysis.stressScenarios.forEach(scenario => {
        expect(scenario.name).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.impact).toBeLessThan(0); // Should be negative impact
        expect(scenario.probability).toBeGreaterThan(0);
        expect(scenario.affectedAssets).toBeInstanceOf(Array);
      });
    });

    it('should calculate diversification benefit', () => {
      const assets: Asset[] = [
        {
          symbol: 'TEST1',
          quantity: 100,
          entryPrice: 100,
          currentPrice: 105,
          getReturns: () => Array.from({ length: 50 }, () => Math.random() * 0.02),
        },
        {
          symbol: 'TEST2',
          quantity: 100,
          entryPrice: 100,
          currentPrice: 105,
          getReturns: () => Array.from({ length: 50 }, () => Math.random() * 0.02 - 0.01),
        },
      ];

      const analysis = predictor.analyzeRiskCorrelation(assets);

      expect(analysis.diversificationBenefit).toBeGreaterThanOrEqual(0);
      expect(analysis.diversificationBenefit).toBeLessThanOrEqual(1);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });
  });
});
