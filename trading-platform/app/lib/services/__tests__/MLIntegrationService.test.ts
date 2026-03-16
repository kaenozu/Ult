/**
 * @jest-environment node
 */

import { MLIntegrationService } from '../MLIntegrationService';

describe('MLIntegrationService', () => {
  let service: MLIntegrationService;

  beforeEach(() => {
    service = MLIntegrationService.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      const status = service.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.lastCheck).toBeDefined();
    });

    it('should be a singleton', () => {
      const instance1 = MLIntegrationService.getInstance();
      const instance2 = MLIntegrationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should report available even when traditional models are not trained because we have the worker', async () => {
      await service.initialize();
      
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('Status', () => {
    it('should return current status', async () => {
      await service.initialize();
      const status = service.getStatus();
      
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('modelsLoaded');
      expect(status).toHaveProperty('lastCheck');
    });

    it('should have worker model in modelsLoaded even when others not available', async () => {
      await service.initialize();
      const status = service.getStatus();
      
      expect(status.modelsLoaded).toContain('ENSEMBLE_WORKER');
    });
  });

  describe('Prediction', () => {
    it('should return fallback logic when models not available but worker is used', async () => {
      await service.initialize();
      
      const mockStock = { symbol: 'TEST' } as any;
      const mockData = [
        { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 }
      ] as any;
      
      const prediction = await service.predictWithML(mockStock, mockData);
      
      expect(prediction).not.toBeNull();
    });
  });

  describe('Performance Reporting', () => {
    it('should return available performance when worker is active', async () => {
      await service.initialize();
      const report = service.getPerformanceReport();
      
      expect(report.available).toBe(true);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle initialization errors gracefully', async () => {
      // Force reinitialize to test error handling
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should allow reinitialization', async () => {
      await service.initialize();
      await expect(service.reinitialize()).resolves.not.toThrow();
      
      expect(service.getStatus().initialized).toBe(true);
    });
  });
});
