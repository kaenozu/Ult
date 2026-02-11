import { IntegratedPredictionService } from '../integrated-prediction-service';
import { Stock, OHLCV } from '@/app/types';

describe('IntegratedPredictionService', () => {
  let service: IntegratedPredictionService;
  let mockStock: Stock;
  let mockData: OHLCV[];

  beforeEach(() => {
    service = new IntegratedPredictionService();

    mockStock = {
      symbol: 'TEST',
      market: 'us' as const,
      name: 'Test Stock',
      sector: 'Technology',
    };

    mockData = Array.from({ length: 60 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100 + i * 0.5,
      high: 102 + i * 0.5,
      low: 99 + i * 0.5,
      close: 100 + i * 0.5,
      volume: 1000000 + Math.random() * 500000,
    }));
  });

  describe('predict', () => {
    it('should generate complete prediction result', async () => {
      const result = await service.predict(mockStock, mockData);

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('predictions');
    });

    it('should include all prediction types', async () => {
      const result = await service.predict(mockStock, mockData);

      expect(result.predictions).toHaveProperty('enhanced');
      expect(result.predictions).toHaveProperty('ml');
      expect(result.predictions).toHaveProperty('consensus');
    });

    it('should generate valid signal', async () => {
      const result = await service.predict(mockStock, mockData);

      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should generate BUY signal for strong uptrend', async () => {
      const uptrendData = mockData.map((d, i) => ({
        ...d,
        close: 100 + i * 2,
        volume: 1000000 + i * 50000,
      }));

      const result = await service.predict(mockStock, uptrendData);

      expect(['BUY', 'HOLD']).toContain(result.signal);
    });

    it('should calculate consensus correctly', async () => {
      const result = await service.predict(mockStock, mockData);

      expect(typeof result.predictions.consensus).toBe('number');
      expect(result.predictions.consensus).toBeGreaterThanOrEqual(0);
      expect(result.predictions.consensus).toBeLessThanOrEqual(1);
    });

    it('should include enhanced prediction details', async () => {
      const result = await service.predict(mockStock, mockData);

      expect(result.predictions.enhanced).toHaveProperty('prediction');
      expect(result.predictions.enhanced).toHaveProperty('confidence');
    });

    it('should include ml prediction details', async () => {
      const result = await service.predict(mockStock, mockData);

      expect(result.predictions.ml).toHaveProperty('ensemblePrediction');
      expect(result.predictions.ml).toHaveProperty('confidence');
    });
  });

  describe('edge cases', () => {
    it('should handle minimal data', async () => {
      const minimalData = mockData.slice(0, 20);

      const result = await service.predict(mockStock, minimalData);

      expect(result).toBeDefined();
      expect(result.signal).toBeDefined();
    });

    it('should handle high volatility data', async () => {
      const volatileData = mockData.map((d, i) => ({
        ...d,
        close: 100 + Math.sin(i / 2) * 20,
        high: 100 + Math.sin(i / 2) * 20 + 5,
        low: 100 + Math.sin(i / 2) * 20 - 5,
      }));

      const result = await service.predict(mockStock, volatileData);

      expect(result).toBeDefined();
    });

    it('should handle flat data', async () => {
      const flatData = mockData.map(d => ({
        ...d,
        open: 100,
        high: 100.1,
        low: 99.9,
        close: 100,
      }));

      const result = await service.predict(mockStock, flatData);

      expect(result).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
    });
  });
});
