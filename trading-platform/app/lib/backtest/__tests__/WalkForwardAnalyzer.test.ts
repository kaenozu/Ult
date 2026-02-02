/**
 * WalkForwardAnalyzer.test.ts
 *
 * Unit tests for WalkForwardAnalyzer
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  WalkForwardAnalyzer,
  DEFAULT_WALK_FORWARD_CONFIG,
  type WalkForwardConfig,
  type WalkForwardReport,
} from '../WalkForwardAnalyzer';
import { OHLCV } from '@/app/types';
import type { Strategy, StrategyAction, StrategyContext } from '../AdvancedBacktestEngine';

describe('WalkForwardAnalyzer', () => {
  let analyzer: WalkForwardAnalyzer;
  let mockData: OHLCV[];

  beforeEach(() => {
    analyzer = new WalkForwardAnalyzer({
      trainingSize: 100,
      testSize: 50,
      minDataPoints: 200,
      optimizeParameters: false,
    });

    // Generate mock OHLCV data
    mockData = [];
    let price = 100;
    const startDate = new Date('2024-01-01');

    for (let i = 0; i < 300; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const open = price;
      const high = price * (1 + Math.random() * 0.02);
      const low = price * (1 - Math.random() * 0.02);
      const close = low + (high - low) * Math.random();
      const volume = 1000000 + Math.random() * 500000;

      mockData.push({
        date: date.toISOString(),
        open,
        high,
        low,
        close,
        volume,
      });

      price = close;
    }
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultAnalyzer = new WalkForwardAnalyzer();

      const config = defaultAnalyzer.getConfig();

      expect(config.trainingSize).toBe(DEFAULT_WALK_FORWARD_CONFIG.trainingSize);
      expect(config.testSize).toBe(DEFAULT_WALK_FORWARD_CONFIG.testSize);
    });

    it('should update configuration', () => {
      analyzer.updateConfig({ trainingSize: 200, testSize: 100 });

      const config = analyzer.getConfig();

      expect(config.trainingSize).toBe(200);
      expect(config.testSize).toBe(100);
    });
  });

  describe('Walk Forward Analysis', () => {
    it('should run walk-forward analysis', async () => {
      const strategyFactory = (params: Record<string, number>): Strategy => ({
        name: 'Test Strategy',
        description: 'Test',
        onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
          if (index < 50) return { action: 'HOLD' };
          if (!context.currentPosition) {
            return { action: 'BUY', quantity: 100 };
          }
          return { action: 'HOLD' };
        },
      });

      const baseConfig = {
        initialCapital: 100000,
        commission: 0.1,
        slippage: 0.05,
        spread: 0.01,
        maxPositionSize: 20,
        maxDrawdown: 50,
        allowShort: true,
        useStopLoss: true,
        useTakeProfit: true,
        riskPerTrade: 2,
      };

      const report = await analyzer.runWalkForwardAnalysis(mockData, strategyFactory, baseConfig);

      expect(report.windows.length).toBeGreaterThan(0);
      expect(report.summary.totalWindows).toBe(report.windows.length);
      expect(report.robustnessScore).toBeGreaterThanOrEqual(0);
      expect(report.robustnessScore).toBeLessThanOrEqual(100);
    });

    it('should throw error for insufficient data', async () => {
      const smallData = mockData.slice(0, 100);
      const strategyFactory = (): Strategy => ({
        name: 'Test',
        description: 'Test',
        onData: () => ({ action: 'HOLD' }),
      });

      const baseConfig = {
        initialCapital: 100000,
        commission: 0.1,
        slippage: 0.05,
        spread: 0.01,
        maxPositionSize: 20,
        maxDrawdown: 50,
        allowShort: true,
        useStopLoss: true,
        useTakeProfit: true,
        riskPerTrade: 2,
      };

      await expect(
        analyzer.runWalkForwardAnalysis(smallData, strategyFactory, baseConfig)
      ).rejects.toThrow('Insufficient data');
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      const strategyFactory = (): Strategy => ({
        name: 'Test Strategy',
        description: 'Test',
        onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
          if (index < 50) return { action: 'HOLD' };
          if (!context.currentPosition) {
            return { action: 'BUY', quantity: 100 };
          }
          return { action: 'HOLD' };
        },
      });

      const baseConfig = {
        initialCapital: 100000,
        commission: 0.1,
        slippage: 0.05,
        spread: 0.01,
        maxPositionSize: 20,
        maxDrawdown: 50,
        allowShort: true,
        useStopLoss: true,
        useTakeProfit: true,
        riskPerTrade: 2,
      };

      const report = await analyzer.runWalkForwardAnalysis(mockData, strategyFactory, baseConfig);

      // Check summary
      expect(report.summary.inSample).toBeDefined();
      expect(report.summary.outOfSample).toBeDefined();
      expect(report.summary.correlation).toBeDefined();
      expect(report.summary.successRate).toBeDefined();

      // Check robustness score
      expect(report.robustnessScore).toBeGreaterThanOrEqual(0);
      expect(report.robustnessScore).toBeLessThanOrEqual(100);

      // Check parameter stability
      expect(report.parameterStability).toBeGreaterThanOrEqual(0);
      expect(report.parameterStability).toBeLessThanOrEqual(100);

      // Check recommendations
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);

      // Check detailed analysis
      expect(report.detailedAnalysis).toBeDefined();
      expect(report.detailedAnalysis.parameterSensitivity).toBeDefined();
      expect(report.detailedAnalysis.failureAnalysis).toBeDefined();
    });
  });

  describe('Window Type', () => {
    it('should support rolling windows', async () => {
      analyzer.updateConfig({ windowType: 'rolling' });

      const config = analyzer.getConfig();

      expect(config.windowType).toBe('rolling');
    });

    it('should support expanding windows', async () => {
      analyzer.updateConfig({ windowType: 'expanding' });

      const config = analyzer.getConfig();

      expect(config.windowType).toBe('expanding');
    });
  });
});
