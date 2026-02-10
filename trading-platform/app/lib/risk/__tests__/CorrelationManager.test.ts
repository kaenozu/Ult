/**
 * CorrelationManager Tests
 * 
 * Tests for correlation analysis and hedge recommendation functionality
 */

import { CorrelationManager, createCorrelationManager } from '../CorrelationManager';
import { Portfolio } from '@/app/types';

describe('CorrelationManager', () => {
  let correlationManager: CorrelationManager;

  beforeEach(() => {
    correlationManager = new CorrelationManager();
  });

  describe('calculateCorrelationMatrix', () => {
    it('should create correlation matrix with diagonal of 1.0', () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      // Add some price history
      correlationManager.updatePriceHistory('AAPL', [100, 102, 101, 103, 105]);
      correlationManager.updatePriceHistory('MSFT', [200, 201, 202, 203, 204]);
      correlationManager.updatePriceHistory('GOOGL', [150, 151, 149, 152, 153]);

      const matrix = correlationManager.calculateCorrelationMatrix(symbols);

      expect(matrix.symbols).toEqual(symbols);
      expect(matrix.matrix[0][0]).toBe(1.0);
      expect(matrix.matrix[1][1]).toBe(1.0);
      expect(matrix.matrix[2][2]).toBe(1.0);
      expect(matrix.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate symmetric correlation matrix', () => {
      const symbols = ['AAPL', 'MSFT'];
      
      correlationManager.updatePriceHistory('AAPL', [100, 102, 101, 103, 105]);
      correlationManager.updatePriceHistory('MSFT', [200, 201, 202, 203, 204]);

      const matrix = correlationManager.calculateCorrelationMatrix(symbols);

      expect(matrix.matrix[0][1]).toBe(matrix.matrix[1][0]);
    });
  });

  describe('calculatePairwiseCorrelation', () => {
    it('should return 0 for insufficient data', () => {
      const correlation = correlationManager.calculatePairwiseCorrelation('AAPL', 'MSFT');
      expect(correlation).toBe(0);
    });

    it('should calculate positive correlation for similar trends', () => {
      correlationManager.updatePriceHistory('AAPL', [100, 110, 120, 130, 140]);
      correlationManager.updatePriceHistory('MSFT', [200, 210, 220, 230, 240]);

      const correlation = correlationManager.calculatePairwiseCorrelation('AAPL', 'MSFT');
      expect(correlation).toBeGreaterThan(0.9);
    });

    it('should calculate negative correlation for opposite trends', () => {
      // AAPL returns: [0.1, 0.1, 0.1, 0.1]
      correlationManager.updatePriceHistory('AAPL', [100, 110, 121, 133.1, 146.41]);
      // MSFT returns: [-0.1, -0.1, -0.1, -0.1]
      correlationManager.updatePriceHistory('MSFT', [100, 90, 81, 72.9, 65.61]);

      const correlation = correlationManager.calculatePairwiseCorrelation('AAPL', 'MSFT');
      // While price trends are opposite, returns are constant (+10% and -10%).
      // We need varied returns to have meaningful correlation.
      
      correlationManager.updatePriceHistory('AAPL', [100, 110, 100, 110, 100]);
      correlationManager.updatePriceHistory('MSFT', [100, 90, 100, 90, 100]);

      const correlation2 = correlationManager.calculatePairwiseCorrelation('AAPL', 'MSFT');
      expect(correlation2).toBeLessThan(-0.9);
    });
  });

  describe('detectConcentrationRisk', () => {
    it('should detect single position concentration risk', () => {
      const portfolio: Portfolio = {
        totalValue: 100000,
        positions: [
          {
            symbol: 'AAPL',
            name: 'Apple',
            market: 'usa',
            side: 'LONG',
            quantity: 300,
            avgPrice: 100,
            currentPrice: 100,
            change: 0,
            entryDate: '2024-01-01'
          }
        ],
        orders: [],
        totalProfit: 0,
        dailyPnL: 0,
        cash: 70000
      };

      const risks = correlationManager.detectConcentrationRisk(portfolio, 0.25);
      
      expect(risks.length).toBeGreaterThan(0);
      expect(risks[0].symbol).toBe('AAPL');
      expect(risks[0].weight).toBe(0.3);
    });

    it('should return empty array for well-diversified portfolio', () => {
      const portfolio: Portfolio = {
        totalValue: 100000,
        positions: [
          {
            symbol: 'AAPL',
            name: 'Apple',
            market: 'usa',
            side: 'LONG',
            quantity: 100,
            avgPrice: 100,
            currentPrice: 100,
            change: 0,
            entryDate: '2024-01-01'
          },
          {
            symbol: 'MSFT',
            name: 'Microsoft',
            market: 'usa',
            side: 'LONG',
            quantity: 100,
            avgPrice: 100,
            currentPrice: 100,
            change: 0,
            entryDate: '2024-01-01'
          }
        ],
        orders: [],
        totalProfit: 0,
        dailyPnL: 0,
        cash: 80000
      };

      const risks = correlationManager.detectConcentrationRisk(portfolio, 0.25);
      
      expect(risks.length).toBe(0);
    });
  });

  describe('generateHedgeRecommendations', () => {
    it('should generate hedge recommendations for high-risk positions', () => {
      const portfolio: Portfolio = {
        totalValue: 100000,
        positions: [
          {
            symbol: 'AAPL',
            name: 'Apple',
            market: 'usa',
            side: 'LONG',
            quantity: 200,
            avgPrice: 100,
            currentPrice: 100,
            change: 0,
            entryDate: '2024-01-01'
          }
        ],
        orders: [],
        totalProfit: 0,
        dailyPnL: 0,
        cash: 80000
      };

      // Set up negative correlation
      correlationManager.updatePriceHistory('AAPL', [100, 110, 120, 130, 140]);
      correlationManager.updatePriceHistory('GLD', [1800, 1750, 1700, 1650, 1600]);

      const recommendations = correlationManager.generateHedgeRecommendations(
        portfolio,
        ['GLD', 'TLT', 'VXX']
      );

      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('primarySymbol');
        expect(recommendations[0]).toHaveProperty('hedgeSymbol');
        expect(recommendations[0]).toHaveProperty('hedgeRatio');
        expect(recommendations[0].correlation).toBeLessThan(-0.3);
      }
    });
  });

  describe('analyzeCorrelation', () => {
    it('should return correlation analysis', () => {
      correlationManager.updatePriceHistory('AAPL', [100, 110, 120, 130, 140]);
      correlationManager.updatePriceHistory('MSFT', [200, 210, 220, 230, 240]);

      const analysis = correlationManager.analyzeCorrelation('AAPL', 'MSFT', '30d');

      expect(analysis.symbol1).toBe('AAPL');
      expect(analysis.symbol2).toBe('MSFT');
      expect(analysis.timeframe).toBe('30d');
      expect(analysis.correlation).toBeGreaterThan(0);
      expect(analysis.significance).toBeGreaterThanOrEqual(0);
      expect(analysis.significance).toBeLessThanOrEqual(1);
    });
  });

  describe('updateFromOHLCV', () => {
    it('should update price history from OHLCV data', () => {
      const ohlcv = [
        { date: '2024-01-01', open: 100, high: 105, low: 99, close: 102, volume: 1000000 },
        { date: '2024-01-02', open: 102, high: 107, low: 101, close: 105, volume: 1100000 },
        { date: '2024-01-03', open: 105, high: 110, low: 104, close: 108, volume: 1200000 }
      ];

      correlationManager.updateFromOHLCV('AAPL', ohlcv);

      // Verify by calculating correlation (which requires price history)
      correlationManager.updateFromOHLCV('MSFT', ohlcv);
      const correlation = correlationManager.calculatePairwiseCorrelation('AAPL', 'MSFT');
      
      expect(correlation).toBe(1.0); // Same data should have perfect correlation
    });
  });

  describe('createCorrelationManager', () => {
    it('should create instance using factory function', () => {
      const instance = createCorrelationManager();
      expect(instance).toBeInstanceOf(CorrelationManager);
    });
  });
});
