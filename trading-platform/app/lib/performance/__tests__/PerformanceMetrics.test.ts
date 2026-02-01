/**
 * PerformanceMetrics.test.ts
 * 
 * Unit tests for PerformanceMetricsCalculator
 */

import { PerformanceMetricsCalculator } from '../PerformanceMetrics';
import { Trade, Portfolio } from '@/app/types/performance';

describe('PerformanceMetricsCalculator', () => {
  let calculator: PerformanceMetricsCalculator;
  let mockPortfolio: Portfolio;
  let mockTrades: Trade[];

  beforeEach(() => {
    calculator = new PerformanceMetricsCalculator();

    // Create mock portfolio
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    mockPortfolio = {
      id: 'test-portfolio',
      initialValue: 100000,
      currentValue: 120000,
      cash: 50000,
      positions: {},
      trades: [],
      orders: [],
      history: [
        { timestamp: oneYearAgo, value: 100000, cash: 100000, positions: {} },
        { timestamp: now - 180 * 24 * 60 * 60 * 1000, value: 110000, cash: 80000, positions: {} },
        { timestamp: now, value: 120000, cash: 50000, positions: {} },
      ],
      createdAt: oneYearAgo,
    };

    // Create mock trades (10 winning, 5 losing trades)
    mockTrades = [
      // Winning trades
      { id: '1', symbol: 'AAPL', type: 'BUY', price: 100, quantity: 10, timestamp: now - 100000, commission: 5, stopLoss: 95 },
      { id: '2', symbol: 'AAPL', type: 'SELL', price: 110, quantity: 10, timestamp: now - 90000, commission: 5, profit: 90 },
      
      { id: '3', symbol: 'GOOGL', type: 'BUY', price: 200, quantity: 5, timestamp: now - 80000, commission: 5, stopLoss: 190 },
      { id: '4', symbol: 'GOOGL', type: 'SELL', price: 220, quantity: 5, timestamp: now - 70000, commission: 5, profit: 90 },
      
      { id: '5', symbol: 'MSFT', type: 'BUY', price: 150, quantity: 8, timestamp: now - 60000, commission: 5, stopLoss: 145 },
      { id: '6', symbol: 'MSFT', type: 'SELL', price: 160, quantity: 8, timestamp: now - 50000, commission: 5, profit: 70 },
      
      // Losing trades
      { id: '7', symbol: 'TSLA', type: 'BUY', price: 300, quantity: 3, timestamp: now - 40000, commission: 5, stopLoss: 290 },
      { id: '8', symbol: 'TSLA', type: 'SELL', price: 280, quantity: 3, timestamp: now - 30000, commission: 5, profit: -70 },
      
      { id: '9', symbol: 'AMZN', type: 'BUY', price: 250, quantity: 4, timestamp: now - 20000, commission: 5, stopLoss: 240 },
      { id: '10', symbol: 'AMZN', type: 'SELL', price: 240, quantity: 4, timestamp: now - 10000, commission: 5, profit: -50 },
    ];
  });

  describe('calculateMetrics', () => {
    it('should calculate basic metrics correctly', () => {
      const metrics = calculator.calculateMetrics(mockTrades, mockPortfolio);

      expect(metrics.totalTrades).toBe(5);
      expect(metrics.winningTrades).toBe(3);
      expect(metrics.losingTrades).toBe(2);
      expect(metrics.winRate).toBeCloseTo(0.6, 2);
      expect(metrics.totalReturn).toBeCloseTo(0.2, 2);
    });

    it('should calculate risk-adjusted metrics', () => {
      const metrics = calculator.calculateMetrics(mockTrades, mockPortfolio);

      expect(metrics.sharpeRatio).toBeDefined();
      expect(metrics.sortinoRatio).toBeDefined();
      expect(metrics.calmarRatio).toBeDefined();
      expect(typeof metrics.sharpeRatio).toBe('number');
      expect(typeof metrics.sortinoRatio).toBe('number');
    });

    it('should calculate trade quality metrics', () => {
      const metrics = calculator.calculateMetrics(mockTrades, mockPortfolio);

      expect(metrics.profitFactor).toBeGreaterThan(0);
      expect(metrics.averageWin).toBeGreaterThan(0);
      expect(metrics.averageLoss).toBeLessThan(0);
      expect(metrics.averageWinLossRatio).toBeGreaterThan(0);
    });

    it('should calculate efficiency metrics', () => {
      const metrics = calculator.calculateMetrics(mockTrades, mockPortfolio);

      expect(metrics.expectancy).toBeDefined();
      expect(metrics.kellyCriterion).toBeDefined();
      expect(metrics.riskOfRuin).toBeDefined();
      expect(metrics.SQN).toBeDefined();
    });

    it('should handle empty trades array', () => {
      const metrics = calculator.calculateMetrics([], mockPortfolio);

      expect(metrics.totalTrades).toBe(0);
      expect(metrics.winningTrades).toBe(0);
      expect(metrics.losingTrades).toBe(0);
      expect(metrics.winRate).toBe(0);
    });

    it('should handle portfolio with no history', () => {
      const emptyPortfolio: Portfolio = {
        ...mockPortfolio,
        history: [],
      };

      const metrics = calculator.calculateMetrics(mockTrades, emptyPortfolio);

      expect(metrics.maxDrawdown).toBe(0);
      expect(metrics.averageDrawdown).toBe(0);
    });
  });

  describe('Win Rate', () => {
    it('should calculate correct win rate', () => {
      const metrics = calculator.calculateMetrics(mockTrades, mockPortfolio);
      expect(metrics.winRate).toBeCloseTo(0.6, 2);
    });

    it('should return 0 for no trades', () => {
      const metrics = calculator.calculateMetrics([], mockPortfolio);
      expect(metrics.winRate).toBe(0);
    });
  });

  describe('Profit Factor', () => {
    it('should calculate profit factor correctly', () => {
      const metrics = calculator.calculateMetrics(mockTrades, mockPortfolio);
      expect(metrics.profitFactor).toBeGreaterThan(1);
    });
  });

  describe('Maximum Drawdown', () => {
    it('should calculate max drawdown from portfolio history', () => {
      const portfolioWithDrawdown: Portfolio = {
        ...mockPortfolio,
        history: [
          { timestamp: Date.now() - 5000, value: 100000, cash: 100000, positions: {} },
          { timestamp: Date.now() - 4000, value: 120000, cash: 90000, positions: {} },
          { timestamp: Date.now() - 3000, value: 90000, cash: 60000, positions: {} },
          { timestamp: Date.now() - 2000, value: 110000, cash: 80000, positions: {} },
          { timestamp: Date.now() - 1000, value: 115000, cash: 85000, positions: {} },
        ],
      };

      const metrics = calculator.calculateMetrics(mockTrades, portfolioWithDrawdown);
      expect(metrics.maxDrawdown).toBeCloseTo(0.25, 2);
    });

    it('should return 0 for monotonically increasing portfolio', () => {
      const increasingPortfolio: Portfolio = {
        ...mockPortfolio,
        history: [
          { timestamp: Date.now() - 3000, value: 100000, cash: 100000, positions: {} },
          { timestamp: Date.now() - 2000, value: 110000, cash: 90000, positions: {} },
          { timestamp: Date.now() - 1000, value: 120000, cash: 80000, positions: {} },
        ],
      };

      const metrics = calculator.calculateMetrics(mockTrades, increasingPortfolio);
      expect(metrics.maxDrawdown).toBe(0);
    });
  });

  describe('Risk-Free Rate', () => {
    it('should allow setting risk-free rate', () => {
      calculator.setRiskFreeRate(0.05);
      expect(calculator.getRiskFreeRate()).toBe(0.05);
    });
  });
});
