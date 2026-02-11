import { EnhancedMLService } from '../enhanced-ml-service';
import { OHLCV, Stock } from '@/app/types';

describe('EnhancedMLService', () => {
  let service: EnhancedMLService;
  let mockStock: Stock;
  let mockHistoricalData: OHLCV[];

  beforeEach(() => {
    service = new EnhancedMLService();
    
    mockStock = {
      symbol: 'TEST',
      market: 'us' as const,
      name: 'Test Stock',
      sector: 'Technology',
    };

    mockHistoricalData = Array.from({ length: 50 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100 + i * 0.5,
      high: 102 + i * 0.5,
      low: 99 + i * 0.5,
      close: 100 + i * 0.5 + Math.random() * 2,
      volume: 1000000 + Math.random() * 500000,
    }));
  });

  describe('predict', () => {
    it('should return enhanced prediction with all required fields', async () => {
      const result = await service.predict(mockStock, mockHistoricalData);
      
      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('features');
    });

    it('should return valid trend value', async () => {
      const result = await service.predict(mockStock, mockHistoricalData);
      
      expect(['UP', 'DOWN', 'SIDEWAYS']).toContain(result.trend);
    });

    it('should return confidence between 0 and 1', async () => {
      const result = await service.predict(mockStock, mockHistoricalData);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return prediction between 0 and 1', async () => {
      const result = await service.predict(mockStock, mockHistoricalData);
      
      expect(result.prediction).toBeGreaterThanOrEqual(0);
      expect(result.prediction).toBeLessThanOrEqual(1);
    });

    it('should include features in result', async () => {
      const result = await service.predict(mockStock, mockHistoricalData);
      
      expect(result.features).toBeDefined();
      expect(result.features).toHaveProperty('rsi');
      expect(result.features).toHaveProperty('sma5');
      expect(result.features).toHaveProperty('sma20');
      expect(result.features).toHaveProperty('macdSignal');
    });
  });

  describe('edge cases', () => {
    it('should handle insufficient historical data', async () => {
      const shortData = mockHistoricalData.slice(0, 5);
      
      const result = await service.predict(mockStock, shortData);
      
      expect(result).toBeDefined();
      expect(result.prediction).toBeDefined();
    });

    it('should handle extreme feature values', async () => {
      const extremeData = mockHistoricalData.map((d, i) => ({
        ...d,
        close: 100 + i * 100,
        high: 100 + i * 100 + 50,
        low: 100 + i * 100 - 50,
      }));
      
      const result = await service.predict(mockStock, extremeData);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
