import { filterForBeginner } from '../beginner-signal-filter';
import type { Signal } from '@/app/types/signal';
import type { BeginnerModeConfig } from '@/app/types/beginner-signal';

describe('Beginner Mode Integration', () => {
  const createMockSignal = (
    type: 'BUY' | 'SELL' | 'HOLD',
    confidence: number,
    overrides: Partial<Signal> = {}
  ): Signal => ({
    type,
    confidence,
    symbol: 'TEST',
    targetPrice: 0, // Should trigger fallback or be used if provided
    stopLoss: 0,
    reason: '',
    predictedChange: 5,
    predictionDate: new Date().toISOString(),
    expectedValue: 1.0, // High EV by default
    driftRisk: 'LOW',   // Low drift by default
    ...overrides
  });

  const defaultConfig: BeginnerModeConfig = {
    enabled: true,
    confidenceThreshold: 80,
    autoRiskEnabled: true,
    defaultStopLossPercent: 2,
    defaultTakeProfitPercent: 4,
    minIndicatorAgreement: 0
  };

  describe('Complete flow: Signal to BeginnerSignal', () => {
    it('should filter low confidence signals to WAIT', () => {
      const lowConfidenceSignal = createMockSignal('BUY', 60);
      const result = filterForBeginner(lowConfidenceSignal, 1000, defaultConfig);
      
      expect(result.action).toBe('WAIT');
      expect(result.autoRisk).toBeUndefined();
      // Updated expectation to match new localized reason
      expect(result.reason).toContain('AIの予測自信度が低いため');
    });

    it('should filter high drift signals to WAIT', () => {
      const highDriftSignal = createMockSignal('BUY', 90, { driftRisk: 'HIGH' });
      const result = filterForBeginner(highDriftSignal, 1000, defaultConfig);
      
      expect(result.action).toBe('WAIT');
      expect(result.reason).toContain('予測精度に一時的な乱れを検知');
    });

    it('should filter low EV signals to WAIT', () => {
      const lowEVSignal = createMockSignal('BUY', 90, { expectedValue: 0.2 });
      const result = filterForBeginner(lowEVSignal, 1000, defaultConfig);
      
      expect(result.action).toBe('WAIT');
      expect(result.reason).toContain('期待される利益（期待値）が低いため');
    });

    it('should pass high confidence BUY signals with auto risk (fallback prices)', () => {
      const highConfidenceSignal = createMockSignal('BUY', 85, {
        targetPrice: 1000, // Forces fallback because targetPrice === currentPrice
        stopLoss: 1000
      });
      const result = filterForBeginner(highConfidenceSignal, 1000, defaultConfig);
      
      expect(result.action).toBe('BUY');
      expect(result.autoRisk).toBeDefined();
      // Default risk is 2% stop, 4% profit
      expect(result.autoRisk?.stopLossPrice).toBe(980);
      expect(result.autoRisk?.takeProfitPrice).toBe(1040);
    });

    it('should use signal prices if provided and valid', () => {
      const highConfidenceSignal = createMockSignal('BUY', 85, {
        targetPrice: 1100,
        stopLoss: 900
      });
      const result = filterForBeginner(highConfidenceSignal, 1000, defaultConfig);
      
      expect(result.action).toBe('BUY');
      expect(result.autoRisk?.stopLossPrice).toBe(900);
      expect(result.autoRisk?.takeProfitPrice).toBe(1100);
    });

    it('should convert HOLD to WAIT regardless of confidence', () => {
      const holdSignal = createMockSignal('HOLD', 85);
      const result = filterForBeginner(holdSignal, 1000, defaultConfig);
      
      expect(result.action).toBe('WAIT');
    });
  });

  describe('Custom threshold configuration', () => {
    it('should respect custom confidence threshold', () => {
      const customConfig: BeginnerModeConfig = {
        ...defaultConfig,
        confidenceThreshold: 90
      };
      
      const signal = createMockSignal('BUY', 85);
      const result = filterForBeginner(signal, 1000, customConfig);
      
      expect(result.action).toBe('WAIT');
    });

    it('should respect custom risk percentages during fallback', () => {
      const customConfig: BeginnerModeConfig = {
        ...defaultConfig,
        defaultStopLossPercent: 3,
        defaultTakeProfitPercent: 6
      };
      
      const signal = createMockSignal('BUY', 85, { targetPrice: 0, stopLoss: 0 });
      const result = filterForBeginner(signal, 1000, customConfig);
      
      expect(result.autoRisk?.stopLossPercent).toBe(3);
      expect(result.autoRisk?.takeProfitPercent).toBe(6);
      expect(result.autoRisk?.stopLossPrice).toBe(970);
      expect(result.autoRisk?.takeProfitPrice).toBe(1060);
    });
  });
});
