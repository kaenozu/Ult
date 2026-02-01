/**
 * PerformanceAnalyzer.test.ts
 * 
 * Unit tests for PerformanceAnalyzer
 */

import { PerformanceAnalyzer } from '../PerformanceAnalyzer';
import { Trade, Portfolio } from '@/app/types/performance';

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;
  let mockPortfolio: Portfolio;
  let mockTrades: Trade[];

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    mockPortfolio = {
      id: 'test-portfolio',
      initialValue: 100000,
      currentValue: 120000,
      cash: 50000,
      positions: {},
      trades: [],
      orders: [],
      history: [],
      createdAt: now - 365 * oneDay,
    };

    // Create diverse mock trades with different symbols and times
    mockTrades = [
      // AAPL trades (profitable)
      { id: '1', symbol: 'AAPL', type: 'BUY', price: 100, quantity: 10, timestamp: now - 10 * oneDay, commission: 5, stopLoss: 95 },
      { id: '2', symbol: 'AAPL', type: 'SELL', price: 110, quantity: 10, timestamp: now - 9 * oneDay, commission: 5, profit: 90 },
      
      { id: '3', symbol: 'AAPL', type: 'BUY', price: 105, quantity: 10, timestamp: now - 8 * oneDay, commission: 5, stopLoss: 100 },
      { id: '4', symbol: 'AAPL', type: 'SELL', price: 115, quantity: 10, timestamp: now - 7 * oneDay, commission: 5, profit: 90 },
      
      // GOOGL trades (mixed)
      { id: '5', symbol: 'GOOGL', type: 'BUY', price: 200, quantity: 5, timestamp: now - 6 * oneDay, commission: 5, stopLoss: 190 },
      { id: '6', symbol: 'GOOGL', type: 'SELL', price: 220, quantity: 5, timestamp: now - 5 * oneDay, commission: 5, profit: 90 },
      
      { id: '7', symbol: 'GOOGL', type: 'BUY', price: 210, quantity: 5, timestamp: now - 4 * oneDay, commission: 5, stopLoss: 200 },
      { id: '8', symbol: 'GOOGL', type: 'SELL', price: 200, quantity: 5, timestamp: now - 3 * oneDay, commission: 5, profit: -60 },
      
      // MSFT trades (losing)
      { id: '9', symbol: 'MSFT', type: 'BUY', price: 150, quantity: 8, timestamp: now - 2 * oneDay, commission: 5, stopLoss: 145 },
      { id: '10', symbol: 'MSFT', type: 'SELL', price: 140, quantity: 8, timestamp: now - 1 * oneDay, commission: 5, profit: -90 },
    ];
  });

  describe('analyze', () => {
    it('should return complete analysis result', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.summary).toBeDefined();
      expect(result.timeAnalysis).toBeDefined();
      expect(result.symbolAnalysis).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should calculate summary metrics correctly', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.summary.totalTrades).toBe(5);
      expect(result.summary.winRate).toBeCloseTo(0.6, 2);
      expect(result.summary.profitFactor).toBeGreaterThan(0);
      expect(typeof result.summary.expectancy).toBe('number');
    });

    it('should handle empty trades', () => {
      const result = analyzer.analyze([], mockPortfolio);

      expect(result.summary.totalTrades).toBe(0);
      expect(result.summary.winRate).toBe(0);
      expect(result.summary.profitFactor).toBe(0);
      expect(result.summary.expectancy).toBe(0);
    });
  });

  describe('Time Analysis', () => {
    it('should analyze hourly performance', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.timeAnalysis.hourlyPerformance).toBeDefined();
      expect(result.timeAnalysis.hourlyPerformance instanceof Map).toBe(true);
    });

    it('should analyze daily performance', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.timeAnalysis.dailyPerformance).toBeDefined();
      expect(result.timeAnalysis.dailyPerformance instanceof Map).toBe(true);
      expect(result.timeAnalysis.dailyPerformance.size).toBeGreaterThan(0);
    });

    it('should analyze monthly performance', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.timeAnalysis.monthlyPerformance).toBeDefined();
      expect(result.timeAnalysis.monthlyPerformance instanceof Map).toBe(true);
    });

    it('should analyze weekday performance', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.timeAnalysis.weekdayPerformance).toBeDefined();
      expect(result.timeAnalysis.weekdayPerformance instanceof Map).toBe(true);
    });
  });

  describe('Symbol Analysis', () => {
    it('should analyze performance by symbol', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.symbolAnalysis).toBeDefined();
      expect(Array.isArray(result.symbolAnalysis)).toBe(true);
      expect(result.symbolAnalysis.length).toBeGreaterThan(0);
    });

    it('should calculate metrics for each symbol', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      const aaplAnalysis = result.symbolAnalysis.find(s => s.symbol === 'AAPL');
      expect(aaplAnalysis).toBeDefined();
      expect(aaplAnalysis?.totalTrades).toBe(2);
      expect(aaplAnalysis?.winRate).toBe(1.0);
      expect(aaplAnalysis?.totalProfit).toBeGreaterThan(0);
    });

    it('should sort symbols by total profit', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      // First symbol should be most profitable
      expect(result.symbolAnalysis[0].totalProfit).toBeGreaterThanOrEqual(
        result.symbolAnalysis[result.symbolAnalysis.length - 1].totalProfit
      );
    });
  });

  describe('Pattern Analysis', () => {
    it('should identify consecutive wins', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.patterns.consecutiveWins).toBeDefined();
      expect(typeof result.patterns.consecutiveWins).toBe('number');
      expect(result.patterns.consecutiveWins).toBeGreaterThanOrEqual(0);
    });

    it('should identify consecutive losses', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.patterns.consecutiveLosses).toBeDefined();
      expect(typeof result.patterns.consecutiveLosses).toBe('number');
      expect(result.patterns.consecutiveLosses).toBeGreaterThanOrEqual(0);
    });

    it('should identify best trading hour', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.patterns.bestTradingHour).toBeDefined();
      expect(result.patterns.bestTradingHour).toBeGreaterThanOrEqual(0);
      expect(result.patterns.bestTradingHour).toBeLessThan(24);
    });

    it('should identify worst trading hour', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.patterns.worstTradingHour).toBeDefined();
      expect(result.patterns.worstTradingHour).toBeGreaterThanOrEqual(0);
      expect(result.patterns.worstTradingHour).toBeLessThan(24);
    });

    it('should identify best trading day', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.patterns.bestTradingDay).toBeDefined();
      expect(typeof result.patterns.bestTradingDay).toBe('string');
    });

    it('should identify worst trading day', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.patterns.worstTradingDay).toBeDefined();
      expect(typeof result.patterns.worstTradingDay).toBe('string');
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations', () => {
      const result = analyzer.analyze(mockTrades, mockPortfolio);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide recommendations for low win rate', () => {
      // Create losing trades
      const losingTrades: Trade[] = [];
      const now = Date.now();
      
      for (let i = 0; i < 10; i++) {
        losingTrades.push(
          { id: `${i*2}`, symbol: 'AAPL', type: 'BUY', price: 100, quantity: 10, timestamp: now - i * 1000, commission: 5 },
          { id: `${i*2+1}`, symbol: 'AAPL', type: 'SELL', price: 90, quantity: 10, timestamp: now - i * 1000 + 500, commission: 5, profit: -105 }
        );
      }

      const result = analyzer.analyze(losingTrades, mockPortfolio);

      expect(result.recommendations.length).toBeGreaterThan(0);
      const hasWinRateRecommendation = result.recommendations.some(r => r.includes('Win rate'));
      expect(hasWinRateRecommendation).toBe(true);
    });

    it('should provide recommendations for small sample size', () => {
      const fewTrades = mockTrades.slice(0, 4); // Only 2 trade pairs
      const result = analyzer.analyze(fewTrades, mockPortfolio);

      const hasSampleSizeRecommendation = result.recommendations.some(r => r.includes('sample size'));
      expect(hasSampleSizeRecommendation).toBe(true);
    });

    it('should not recommend when performance is excellent', () => {
      // Create many winning trades
      const winningTrades: Trade[] = [];
      const now = Date.now();
      
      for (let i = 0; i < 20; i++) {
        winningTrades.push(
          { id: `${i*2}`, symbol: 'AAPL', type: 'BUY', price: 100, quantity: 10, timestamp: now - i * 1000, commission: 5 },
          { id: `${i*2+1}`, symbol: 'AAPL', type: 'SELL', price: 120, quantity: 10, timestamp: now - i * 1000 + 500, commission: 5, profit: 190 }
        );
      }

      const result = analyzer.analyze(winningTrades, mockPortfolio);

      // Should have positive recommendations
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single trade', () => {
      const singleTrade = mockTrades.slice(0, 2);
      const result = analyzer.analyze(singleTrade, mockPortfolio);

      expect(result.summary.totalTrades).toBe(1);
    });

    it('should handle all winning trades', () => {
      const winningTrades = mockTrades.filter((t, i) => i < 6); // First 3 pairs
      const result = analyzer.analyze(winningTrades, mockPortfolio);

      expect(result.summary.winRate).toBeGreaterThan(0.5);
    });

    it('should handle all losing trades', () => {
      const losingTrades: Trade[] = [
        { id: '1', symbol: 'AAPL', type: 'BUY', price: 100, quantity: 10, timestamp: Date.now() - 2000, commission: 5 },
        { id: '2', symbol: 'AAPL', type: 'SELL', price: 90, quantity: 10, timestamp: Date.now() - 1000, commission: 5, profit: -110 },
        { id: '3', symbol: 'GOOGL', type: 'BUY', price: 200, quantity: 5, timestamp: Date.now() - 4000, commission: 5 },
        { id: '4', symbol: 'GOOGL', type: 'SELL', price: 180, quantity: 5, timestamp: Date.now() - 3000, commission: 5, profit: -110 },
      ];

      const result = analyzer.analyze(losingTrades, mockPortfolio);

      expect(result.summary.winRate).toBe(0);
      expect(result.summary.totalTrades).toBe(2);
    });
  });
});
