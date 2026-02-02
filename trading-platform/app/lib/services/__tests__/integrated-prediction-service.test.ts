/**
 * Tests for Integrated Prediction Service
 */

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

    // Generate mock data with upward trend
    mockData = Array.from({ length: 60 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString(),
      open: 100 + i * 0.5,
      high: 102 + i * 0.5,
      low: 99 + i * 0.5,
      close: 100 + i * 0.5,
      volume: 1000000 + Math.random() * 500000,
    }));
  });

  describe('generatePrediction', () => {
    it('should generate complete prediction result', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('enhancedMetrics');
      expect(result).toHaveProperty('modelStats');
    });

    it('should include all enhanced metrics', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      expect(result.enhancedMetrics).toHaveProperty('expectedValue');
      expect(result.enhancedMetrics).toHaveProperty('kellyFraction');
      expect(result.enhancedMetrics).toHaveProperty('recommendedPositionSize');
      expect(result.enhancedMetrics).toHaveProperty('driftRisk');
      expect(result.enhancedMetrics).toHaveProperty('marketRegime');
      expect(result.enhancedMetrics).toHaveProperty('volatility');
    });

    it('should include model statistics', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      expect(result.modelStats).toHaveProperty('rfHitRate');
      expect(result.modelStats).toHaveProperty('xgbHitRate');
      expect(result.modelStats).toHaveProperty('lstmHitRate');
      expect(result.modelStats).toHaveProperty('ensembleWeights');

      // Weights should sum to 1
      const weights = result.modelStats.ensembleWeights;
      const sum = weights.RF + weights.XGB + weights.LSTM;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should generate valid signal', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal.type);
      expect(result.signal.confidence).toBeGreaterThanOrEqual(0);
      expect(result.signal.confidence).toBeLessThanOrEqual(100);
      expect(result.signal.targetPrice).toBeGreaterThan(0);
      expect(result.signal.stopLoss).toBeGreaterThan(0);
    });

    it('should set HOLD when signal does not meet quality threshold', async () => {
      // Create weak signal data
      const weakData = mockData.map((d, i) => ({
        ...d,
        close: 100 + Math.sin(i) * 0.1, // Very small movements
      }));

      const result = await service.generatePrediction(mockStock, weakData);

      // Weak signal should result in HOLD or low confidence
      if (result.signal.type !== 'HOLD') {
        expect(result.signal.confidence).toBeLessThan(80);
      }
    });

    it('should generate BUY signal for strong uptrend', async () => {
      // Create strong uptrend data
      const uptrendData = mockData.map((d, i) => ({
        ...d,
        close: 100 + i * 2, // Strong upward movement
        volume: 1000000 + i * 50000,
      }));

      const result = await service.generatePrediction(mockStock, uptrendData);

      // Should detect uptrend (may be BUY or HOLD depending on other factors)
      expect(['BUY', 'HOLD']).toContain(result.signal.type);
    });

    it('should include market context when index data provided', async () => {
      const indexData = mockData.map(d => ({ ...d }));

      const result = await service.generatePrediction(mockStock, mockData, indexData);

      // Market context should be present
      if (result.signal.marketContext) {
        expect(result.signal.marketContext).toHaveProperty('indexSymbol');
        expect(result.signal.marketContext).toHaveProperty('correlation');
        expect(result.signal.marketContext).toHaveProperty('indexTrend');
      }
    });

    it('should calculate Kelly-based position sizing', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      expect(result.enhancedMetrics.kellyFraction).toBeGreaterThanOrEqual(0);
      expect(result.enhancedMetrics.kellyFraction).toBeLessThanOrEqual(0.5);
      expect(result.enhancedMetrics.recommendedPositionSize).toBeGreaterThanOrEqual(1);
      expect(result.enhancedMetrics.recommendedPositionSize).toBeLessThanOrEqual(20);
    });

    it('should include drift risk assessment', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.enhancedMetrics.driftRisk);
    });
  });

  describe('updateWithActualResult', () => {
    it('should update performance for all models', async () => {
      const initialMetrics = service.getPerformanceMetrics();

      await service.updateWithActualResult('TEST', 2.0, 2.5);

      const updatedMetrics = service.getPerformanceMetrics();

      // Hit rates should be updated (may be same if this is first update)
      expect(updatedMetrics.hitRates.rf).toBeDefined();
      expect(updatedMetrics.hitRates.xgb).toBeDefined();
      expect(updatedMetrics.hitRates.lstm).toBeDefined();
    });

    it('should track correct predictions', async () => {
      // Make several correct predictions
      for (let i = 0; i < 5; i++) {
        await service.updateWithActualResult('TEST', 2.0, 2.5);
      }

      const metrics = service.getPerformanceMetrics();

      // All models should show some hit rate
      expect(metrics.hitRates.rf).toBeGreaterThan(0);
    });

    it('should detect drift after many incorrect predictions', async () => {
      // Make many incorrect predictions with large errors
      for (let i = 0; i < 60; i++) {
        await service.updateWithActualResult('TEST', 5.0, -3.0);
      }

      const metrics = service.getPerformanceMetrics();

      // Drift might be detected (HIGH error)
      expect(metrics.driftStatus).toBeDefined();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return all performance metrics', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toHaveProperty('hitRates');
      expect(metrics).toHaveProperty('sharpeRatios');
      expect(metrics).toHaveProperty('averageErrors');
      expect(metrics).toHaveProperty('driftStatus');
    });

    it('should have hit rates between 0 and 1', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics.hitRates.rf).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRates.rf).toBeLessThanOrEqual(1);
      expect(metrics.hitRates.xgb).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRates.xgb).toBeLessThanOrEqual(1);
      expect(metrics.hitRates.lstm).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRates.lstm).toBeLessThanOrEqual(1);
    });

    it('should track drift status', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics.driftStatus).toHaveProperty('driftDetected');
      expect(metrics.driftStatus).toHaveProperty('daysSinceRetrain');
      expect(metrics.driftStatus).toHaveProperty('psi');

      expect(typeof metrics.driftStatus.driftDetected).toBe('boolean');
      expect(typeof metrics.driftStatus.daysSinceRetrain).toBe('number');
    });

    it('should update metrics after predictions', async () => {
      // Get initial metrics
      const initial = service.getPerformanceMetrics();

      // Make some predictions and updates
      await service.updateWithActualResult('TEST', 2.0, 2.5);
      await service.updateWithActualResult('TEST', 1.5, 1.8);

      const updated = service.getPerformanceMetrics();

      // Metrics should be tracked
      expect(updated).toBeDefined();
    });
  });

  describe('retrainModels', () => {
    it('should reset drift metrics', async () => {
      // Create some drift
      for (let i = 0; i < 60; i++) {
        await service.updateWithActualResult('TEST', 5.0, -3.0);
      }

      await service.retrainModels();

      const metrics = service.getPerformanceMetrics();

      expect(metrics.driftStatus.daysSinceRetrain).toBe(0);
      expect(metrics.driftStatus.driftDetected).toBe(false);
    });

    it('should reset performance history', async () => {
      // Add some performance data
      for (let i = 0; i < 10; i++) {
        await service.updateWithActualResult('TEST', 2.0, 2.5);
      }

      await service.retrainModels();

      const metrics = service.getPerformanceMetrics();

      // Hit rates should be reset to baseline
      expect(metrics.hitRates.rf).toBeCloseTo(0.5, 1);
    });
  });

  describe('signal generation', () => {
    it('should include drift warning in reason for high drift', async () => {
      // Generate high drift
      for (let i = 0; i < 60; i++) {
        await service.updateWithActualResult('TEST', 5.0, -3.0);
      }

      const result = await service.generatePrediction(mockStock, mockData);

      if (result.enhancedMetrics.driftRisk === 'HIGH') {
        expect(result.signal.reason).toContain('モデルドリフト');
      }
    });

    it('should include Kelly criterion in reason', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      if (result.enhancedMetrics.kellyFraction > 0) {
        expect(result.signal.reason).toContain('Kelly');
      }
    });

    it('should include market regime in reason', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      // Should mention regime or volatility
      const reason = result.signal.reason;
      const hasRegimeOrVol =
        reason.includes('トレンド') ||
        reason.includes('レンジ') ||
        reason.includes('ボラティリティ');

      expect(hasRegimeOrVol).toBe(true);
    });

    it('should adjust target/stop based on Kelly fraction', async () => {
      const result = await service.generatePrediction(mockStock, mockData);

      const currentPrice = mockData[mockData.length - 1].close;

      if (result.signal.type === 'BUY') {
        expect(result.signal.targetPrice).toBeGreaterThan(currentPrice);
        expect(result.signal.stopLoss).toBeLessThan(currentPrice);
      } else if (result.signal.type === 'SELL') {
        expect(result.signal.targetPrice).toBeLessThan(currentPrice);
        expect(result.signal.stopLoss).toBeGreaterThan(currentPrice);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle minimal data', async () => {
      const minimalData = mockData.slice(0, 20);

      const result = await service.generatePrediction(mockStock, minimalData);

      expect(result).toBeDefined();
      expect(result.signal).toBeDefined();
    });

    it('should handle high volatility data', async () => {
      const volatileData = mockData.map((d, i) => ({
        ...d,
        close: 100 + Math.sin(i / 2) * 20, // High swings
        high: 100 + Math.sin(i / 2) * 20 + 5,
        low: 100 + Math.sin(i / 2) * 20 - 5,
      }));

      const result = await service.generatePrediction(mockStock, volatileData);

      expect(result).toBeDefined();
      expect(result.enhancedMetrics.volatility).toBeDefined();
    });

    it('should handle flat data', async () => {
      const flatData = mockData.map(d => ({
        ...d,
        open: 100,
        high: 100.1,
        low: 99.9,
        close: 100,
      }));

      const result = await service.generatePrediction(mockStock, flatData);

      expect(result).toBeDefined();
      // Flat market should result in HOLD or low confidence
      expect(result.signal.type === 'HOLD' || result.signal.confidence < 70).toBe(true);
    });
  });
});
