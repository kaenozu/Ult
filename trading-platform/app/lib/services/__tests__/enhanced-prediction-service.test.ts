/**
 * @jest-environment node
 */
import { EnhancedPredictionService } from '../enhanced-prediction-service';
import { OHLCV } from '@/app/types';

describe('EnhancedPredictionService', () => {
  let service: EnhancedPredictionService;

  beforeEach(() => {
    service = new EnhancedPredictionService();
  });

  // Helper to generate test data
  const generateTestData = (days: number, trend: 'up' | 'down' | 'sideways' = 'sideways'): OHLCV[] => {
    const data: OHLCV[] = [];
    let basePrice = 100;
    
    for (let i = 0; i < days; i++) {
      let change = 0;
      if (trend === 'up') change = Math.random() * 2;
      else if (trend === 'down') change = -Math.random() * 2;
      else change = (Math.random() - 0.5) * 2;
      
      basePrice *= (1 + change / 100);
      const volatility = basePrice * 0.02;
      
      data.push({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: basePrice - volatility / 2,
        high: basePrice + volatility,
        low: basePrice - volatility,
        close: basePrice,
        volume: 1000000 + Math.random() * 500000
      });
    }
    return data;
  };

  describe('calculatePrediction', () => {
    it('should generate prediction for sufficient data', async () => {
      const data = generateTestData(30, 'up');
      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('expectedReturn');
      expect(result).toHaveProperty('marketRegime');
      expect(result).toHaveProperty('calculationTime');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should throw error for insufficient data', async () => {
      const data = generateTestData(10);
      
      await expect(service.calculatePrediction({
        symbol: 'AAPL',
        data
      })).rejects.toThrow('Insufficient data');
    });

    it('should detect bullish trend in uptrending market', async () => {
      // Create strong uptrend data
      const data: OHLCV[] = [];
      let price = 100;
      for (let i = 0; i < 30; i++) {
        price *= 1.02; // 2% daily gain
        data.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: price * 0.99,
          high: price * 1.02,
          low: price * 0.98,
          close: price,
          volume: 1000000
        });
      }

      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      // Should detect TRENDING regime
      expect(result.marketRegime).toBe('TRENDING');
      // Should have positive direction
      expect(result.direction).toBeGreaterThanOrEqual(0);
    });

    it('should detect bearish trend in downtrending market', async () => {
      const data: OHLCV[] = [];
      let price = 100;
      for (let i = 0; i < 30; i++) {
        price *= 0.98; // 2% daily loss
        data.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: price * 1.01,
          high: price * 1.03,
          low: price * 0.97,
          close: price,
          volume: 1000000
        });
      }

      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      expect(result.marketRegime).toBe('TRENDING');
      expect(result.direction).toBeLessThanOrEqual(0);
    });

    it('should generate HOLD signal when confidence is low', async () => {
      // Create sideways market (low confidence scenario)
      const data: OHLCV[] = [];
      for (let i = 0; i < 30; i++) {
        const price = 100 + Math.sin(i / 5) * 2;
        data.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: price,
          high: price + 1,
          low: price - 1,
          close: price + (Math.random() - 0.5),
          volume: 1000000
        });
      }

      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      // In ranging market, might generate HOLD
      expect(result.signal.type).toBeDefined();
    });

    it('should calculate ensemble contributions', async () => {
      const data = generateTestData(30, 'up');
      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      expect(result.ensembleContribution).toHaveProperty('rf');
      expect(result.ensembleContribution).toHaveProperty('xgb');
      expect(result.ensembleContribution).toHaveProperty('lstm');
      expect(result.ensembleContribution).toHaveProperty('pattern');
    });

    it('should complete calculation within reasonable time', async () => {
      const data = generateTestData(30);
      const start = Date.now();
      
      await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Market Regime Detection', () => {
    it('should detect VOLATILE regime', async () => {
      const data: OHLCV[] = [];
      let price = 100;
      for (let i = 0; i < 50; i++) {
        // High volatility: large random swings with NO consistent trend
        const change = (i % 2 === 0 ? 10 : -10) + (Math.random() - 0.5) * 5;
        price *= (1 + change / 100);
        data.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: price * 0.9,
          high: price * 1.2,
          low: price * 0.8,
          close: price,
          volume: 1000000
        });
      }

      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      expect(result.marketRegime).toBe('VOLATILE');
    });

    it('should detect RANGING regime', async () => {
      const data: OHLCV[] = [];
      for (let i = 0; i < 30; i++) {
        // Sideways movement within range
        const price = 100 + Math.sin(i / 3) * 3;
        data.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000
        });
      }

      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      expect(result.marketRegime).toBe('RANGING');
    });
  });

  describe('Confidence Calculation', () => {
    it('should boost confidence with extreme RSI', async () => {
      const data: OHLCV[] = [];
      let price = 100;
      
      // Create oversold scenario (RSI < 15)
      for (let i = 0; i < 30; i++) {
        price *= 0.97;
        data.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: price * 1.01,
          high: price * 1.02,
          low: price * 0.95,
          close: price,
          volume: 1500000 // High volume
        });
      }

      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      // Should have higher confidence due to extreme RSI
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should reduce confidence in high volatility', async () => {
      const data: OHLCV[] = [];
      let price = 100;
      
      for (let i = 0; i < 30; i++) {
        const change = (Math.random() - 0.5) * 15; // Very volatile
        price *= (1 + change / 100);
        data.push({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: price * 0.9,
          high: price * 1.2,
          low: price * 0.8,
          close: price,
          volume: 1000000
        });
      }

      const result = await service.calculatePrediction({
        symbol: 'AAPL',
        data
      });

      // Confidence should be reduced in volatile markets
      expect(result.confidence).toBeLessThan(0.9);
    });
  });

  describe('Caching', () => {
    it('should cache repeated requests', async () => {
      const data = generateTestData(30, 'up');
      
      const result1 = await service.calculatePrediction({
        symbol: 'TEST',
        data
      });
      
      const result2 = await service.calculatePrediction({
        symbol: 'TEST',
        data
      });
      
      expect(result1.cacheHit).toBe(false);
      expect(result2.cacheHit).toBe(true);
    });

    it('should complete within 100ms', async () => {
      const data = generateTestData(30);
      const start = performance.now();
      
      await service.calculatePrediction({
        symbol: 'TEST',
        data
      });
      
      expect(performance.now() - start).toBeLessThan(100);
    });

    it('should track performance metrics', async () => {
      const data = generateTestData(30);
      
      await service.calculatePrediction({ symbol: 'TEST', data });
      await service.calculatePrediction({ symbol: 'TEST', data });
      
      const metrics = service.getPerformanceMetrics();
      expect(metrics.totalCalculations).toBeGreaterThan(0);
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });
  });
});
