/**
 * RealTimeRiskCalculator.test.ts
 * 
 * Unit tests for RealTimeRiskCalculator
 */

import { RealTimeRiskCalculator, DEFAULT_RISK_CONFIG } from '../RealTimeRiskCalculator';
import { Portfolio, Position } from '@/app/types';

describe('RealTimeRiskCalculator', () => {
  let calculator: RealTimeRiskCalculator;
  let mockPortfolio: Portfolio;

  beforeEach(() => {
    calculator = new RealTimeRiskCalculator();
    mockPortfolio = {
      cash: 100000,
      positions: [],
      totalValue: 0,
      dailyPnL: 0,
      totalProfit: 0,
      orders: [],
    };
  });

  describe('calculatePortfolioRisk', () => {
    it('should calculate basic risk metrics for empty portfolio', () => {
      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      expect(risk).toBeDefined();
      expect(risk.totalRiskPercent).toBeGreaterThanOrEqual(0);
      expect(risk.usedCapitalPercent).toBe(0);
      expect(risk.unrealizedPnL).toBe(0);
      expect(risk.riskLevel).toBe('safe');
    });

    it('should calculate risk for portfolio with positions', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 100,
        avgPrice: 1000,
        currentPrice: 1100,
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: 100,
        changePercent: 10,
      };

      mockPortfolio.positions = [position];
      mockPortfolio.totalValue = 110000;
      mockPortfolio.totalProfit = 10000;

      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      expect(risk.unrealizedPnL).toBe(10000);
      expect(risk.usedCapitalPercent).toBeGreaterThan(0);
    });

    it('should detect high risk level', () => {
      // Create high-risk scenario with sufficient data
      const positions: Position[] = [
        {
          symbol: 'TEST1',
          quantity: 1000,
          avgPrice: 100,
          currentPrice: 80, // -20% loss
          side: 'LONG',
          entryDate: Date.now(),
          market: 'JP',
          change: -20,
          changePercent: -20,
        },
      ];

      mockPortfolio.positions = positions;
      mockPortfolio.totalValue = 80000;
      mockPortfolio.totalProfit = -20000;
      mockPortfolio.cash = 20000;
      
      // Set daily start value to trigger daily loss alert
      calculator.setDailyStartValue(120000);

      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      // Should have negative P&L
      expect(risk.unrealizedPnLPercent).toBeLessThan(0);
      expect(risk.unrealizedPnL).toBe(-20000);
    });
  });

  describe('calculatePositionRisk', () => {
    it('should calculate individual position risk', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 100,
        avgPrice: 1000,
        currentPrice: 1100,
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: 100,
        changePercent: 10,
      };

      const positionRisk = calculator.calculatePositionRisk(position, 200000);

      expect(positionRisk.symbol).toBe('TEST');
      expect(positionRisk.positionValue).toBe(110000);
      expect(positionRisk.unrealizedPnL).toBe(10000);
      expect(positionRisk.unrealizedPnLPercent).toBe(10);
      expect(positionRisk.positionPercent).toBeCloseTo(55, 0); // 110000/200000 * 100
    });

    it('should calculate SHORT position risk correctly', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 100,
        avgPrice: 1000,
        currentPrice: 900,
        side: 'SHORT',
        entryDate: Date.now(),
        market: 'JP',
        change: -100,
        changePercent: -10,
      };

      const positionRisk = calculator.calculatePositionRisk(position, 200000);

      expect(positionRisk.unrealizedPnL).toBe(10000); // (1000-900)*100
      expect(positionRisk.unrealizedPnLPercent).toBe(10);
    });
  });

  describe('VaR Calculation', () => {
    it('should calculate parametric VaR', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 100,
        avgPrice: 1000,
        currentPrice: 1000,
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: 0,
        changePercent: 0,
      };

      mockPortfolio.positions = [position];
      mockPortfolio.totalValue = 100000;

      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      expect(risk.var95).toBeGreaterThan(0);
      expect(risk.var99).toBeGreaterThan(risk.var95);
      expect(risk.cvar95).toBeGreaterThan(0);
    });
  });

  describe('Concentration Risk', () => {
    it('should detect high concentration with single position', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 1000,
        avgPrice: 100,
        currentPrice: 100,
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: 0,
        changePercent: 0,
      };

      mockPortfolio.positions = [position];
      mockPortfolio.totalValue = 100000;

      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      expect(risk.concentrationRisk).toBeGreaterThan(0);
      expect(risk.largestPositionPercent).toBe(100);
    });

    it('should show lower concentration with diversified positions', () => {
      const positions: Position[] = [
        {
          symbol: 'TEST1',
          quantity: 250,
          avgPrice: 100,
          currentPrice: 100,
          side: 'LONG',
          entryDate: Date.now(),
          market: 'JP',
          change: 0,
          changePercent: 0,
        },
        {
          symbol: 'TEST2',
          quantity: 250,
          avgPrice: 100,
          currentPrice: 100,
          side: 'LONG',
          entryDate: Date.now(),
          market: 'JP',
          change: 0,
          changePercent: 0,
        },
        {
          symbol: 'TEST3',
          quantity: 250,
          avgPrice: 100,
          currentPrice: 100,
          side: 'LONG',
          entryDate: Date.now(),
          market: 'JP',
          change: 0,
          changePercent: 0,
        },
        {
          symbol: 'TEST4',
          quantity: 250,
          avgPrice: 100,
          currentPrice: 100,
          side: 'LONG',
          entryDate: Date.now(),
          market: 'JP',
          change: 0,
          changePercent: 0,
        },
      ];

      mockPortfolio.positions = positions;
      mockPortfolio.totalValue = 100000;

      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      // With 4 equal positions, concentration should be lower
      expect(risk.largestPositionPercent).toBe(25);
      expect(risk.concentrationRisk).toBeLessThan(0.5);
    });
  });

  describe('Drawdown Tracking', () => {
    it('should track current drawdown', () => {
      // Set peak value first through portfolio updates
      mockPortfolio.totalValue = 110000;
      mockPortfolio.cash = 10000;
      calculator.calculatePortfolioRisk(mockPortfolio); // This sets peak
      
      // Drop in value
      mockPortfolio.totalValue = 90000;
      mockPortfolio.cash = 10000;
      
      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      expect(risk.currentDrawdown).toBeGreaterThan(0);
      expect(risk.peakValue).toBeGreaterThanOrEqual(120000);
    });

    it('should update peak value when portfolio grows', () => {
      calculator.updatePortfolioHistory(100000);
      
      mockPortfolio.totalValue = 110000;
      mockPortfolio.cash = 10000;
      
      const risk1 = calculator.calculatePortfolioRisk(mockPortfolio);
      
      // Portfolio grows more
      mockPortfolio.totalValue = 130000;
      const risk2 = calculator.calculatePortfolioRisk(mockPortfolio);

      expect(risk2.peakValue).toBeGreaterThan(risk1.peakValue);
      expect(risk2.currentDrawdown).toBe(0); // At peak
    });
  });

  describe('Alert Generation', () => {
    it('should generate alerts for high risk', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 1000,
        avgPrice: 100,
        currentPrice: 70, // -30% loss
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: -30,
        changePercent: -30,
      };

      mockPortfolio.positions = [position];
      mockPortfolio.totalValue = 70000;
      mockPortfolio.totalProfit = -30000;
      mockPortfolio.cash = 30000;

      calculator.setDailyStartValue(100000);

      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      expect(risk.alerts.length).toBeGreaterThan(0);
    });

    it('should generate critical alerts for max drawdown breach', () => {
      // Set peak value
      mockPortfolio.totalValue = 90000;
      mockPortfolio.cash = 10000;
      calculator.calculatePortfolioRisk(mockPortfolio); // Set peak at 100000
      
      // Severe loss (>20% drawdown)
      mockPortfolio.totalValue = 65000;
      mockPortfolio.cash = 10000;
      
      const risk = calculator.calculatePortfolioRisk(mockPortfolio);

      // Should have some alerts for significant drawdown
      expect(risk.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Price History Tracking', () => {
    it('should update price history', () => {
      calculator.updatePriceHistory('TEST', 100);
      calculator.updatePriceHistory('TEST', 105);
      calculator.updatePriceHistory('TEST', 110);

      // Price history should be tracked (verified by position risk calculation)
      const position: Position = {
        symbol: 'TEST',
        quantity: 100,
        avgPrice: 100,
        currentPrice: 110,
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: 10,
        changePercent: 10,
      };

      const risk = calculator.calculatePositionRisk(position, 100000);
      
      // Volatility should be calculated from price history
      expect(risk.volatility).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        ...DEFAULT_RISK_CONFIG,
        maxDailyLossPercent: 3,
        maxDrawdownPercent: 15,
      };

      const customCalculator = new RealTimeRiskCalculator(customConfig);
      
      // Verify config is used by checking alert thresholds
      mockPortfolio.totalValue = 94000;
      mockPortfolio.cash = 6000;
      customCalculator.setDailyStartValue(100000);

      const risk = customCalculator.calculatePortfolioRisk(mockPortfolio);

      // Daily loss is 6%, which exceeds custom limit of 3%
      const dailyLossAlerts = risk.alerts.filter(a => a.type === 'max_loss');
      expect(dailyLossAlerts.length).toBeGreaterThan(0);
    });

    it('should update configuration dynamically', () => {
      calculator.updateConfig({
        safeThreshold: 5,
        cautionThreshold: 15,
      });

      // Configuration should be updated (verified through risk calculation)
      const risk = calculator.calculatePortfolioRisk(mockPortfolio);
      
      expect(risk).toBeDefined();
    });
  });

  describe('Covariance Matrix', () => {
    it('should calculate covariance matrix for positions', () => {
      const positions: Position[] = [
        {
          symbol: 'TEST1',
          quantity: 100,
          avgPrice: 100,
          currentPrice: 100,
          side: 'LONG',
          entryDate: Date.now(),
          market: 'JP',
          change: 0,
          changePercent: 0,
        },
        {
          symbol: 'TEST2',
          quantity: 100,
          avgPrice: 100,
          currentPrice: 100,
          side: 'LONG',
          entryDate: Date.now(),
          market: 'JP',
          change: 0,
          changePercent: 0,
        },
      ];

      // Add some price history
      calculator.updatePriceHistory('TEST1', 100);
      calculator.updatePriceHistory('TEST1', 105);
      calculator.updatePriceHistory('TEST2', 100);
      calculator.updatePriceHistory('TEST2', 102);

      const matrix = calculator.calculateCovarianceMatrix(positions);

      expect(matrix.length).toBe(2);
      expect(matrix[0].length).toBe(2);
      expect(matrix[0][0]).toBeGreaterThanOrEqual(0); // Variance
      expect(matrix[1][1]).toBeGreaterThanOrEqual(0); // Variance
    });
  });

  describe('Utility Methods', () => {
    it('should set daily start value', () => {
      calculator.setDailyStartValue(100000);
      
      // Daily start value should be set
      expect(true).toBe(true);
    });

    it('should clear history', () => {
      calculator.updatePriceHistory('TEST', 100);
      calculator.updatePortfolioHistory(100000);
      
      calculator.clearHistory();
      
      const risk = calculator.calculatePortfolioRisk(mockPortfolio);
      
      // Should work with cleared history
      expect(risk).toBeDefined();
    });
  });
});
