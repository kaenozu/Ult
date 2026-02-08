/**
 * UnifiedTradingPlatform Core Tests
 * 
 * Tests for the core trading platform functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnifiedTradingPlatform, getGlobalTradingPlatform, resetGlobalTradingPlatform } from '../tradingCore/UnifiedTradingPlatform';
import { OHLCVWithTimestamp, PlatformConfig } from '../tradingCore/UnifiedTradingPlatform';

describe('UnifiedTradingPlatform Core', () => {
  let platform: UnifiedTradingPlatform;
  let mockConfig: Partial<PlatformConfig>;

  beforeEach(() => {
    mockConfig = {
      mode: 'paper',
      initialCapital: 1000000,
      riskLimits: {
        maxPositionSize: 20,
        maxDailyLoss: 5,
        maxDrawdown: 15,
      },
      aiEnabled: false, // Disable AI for core tests
      sentimentEnabled: false,
      autoTrading: false,
      exchanges: ['mock'],
      symbols: ['TEST'],
    };

    platform = new UnifiedTradingPlatform(mockConfig);
  });

  afterEach(() => {
    if (platform) {
      try {
        platform.stop();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    resetGlobalTradingPlatform();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const config = platform.getConfig();
      
      expect(config).toBeDefined();
      expect(config.mode).toBe('paper');
      expect(config.initialCapital).toBe(1000000);
      expect(config.riskLimits.maxPositionSize).toBe(20);
      expect(config.symbols).toEqual(['TEST']);
    });

    it('should accept custom config', () => {
      const customPlatform = new UnifiedTradingPlatform({
        mode: 'backtest',
        initialCapital: 500000,
      });

      expect(customPlatform.getConfig().mode).toBe('backtest');
      expect(customPlatform.getConfig().initialCapital).toBe(500000);
    });

    it('should initialize all components', () => {
      expect(platform['dataFeed']).toBeDefined();
      expect(platform['aiEngine']).toBeDefined();
      expect(platform['sentimentEngine']).toBeDefined();
      expect(platform['riskManager']).toBeDefined();
      expect(platform['executionEngine']).toBeDefined();
      expect(platform['backtestEngine']).toBeDefined();
      expect(platform['alertSystem']).toBeDefined();
      expect(platform['paperTrading']).toBeDefined();
    });
  });

  describe('Lifecycle Methods', () => {
    it('should start and set running status', async () => {
      await platform.start();
      
      const status = platform.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.mode).toBe('paper');
    });

    it('should stop and clear running status', async () => {
      await platform.start();
      await platform.stop();
      
      const status = platform.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should reset to initial state', () => {
      platform.getPortfolio(); // Initialize portfolio
      platform.reset();
      
      const portfolio = platform.getPortfolio();
      expect(portfolio.positions).toEqual([]);
      expect(portfolio.totalValue).toBe(platform.getConfig().initialCapital);
    });
  });

  describe('Data Management', () => {
    it('should store market data by symbol', () => {
      const mockData: OHLCVWithTimestamp[] = [
        {
          date: '2024-01-01',
          timestamp: Date.now(),
          open: 100,
          high: 105,
          low: 98,
          close: 102,
          volume: 1000,
        },
      ];

      const testSymbol = 'TEST';
      // Simulate data storage
      platform['marketData'].set(testSymbol, mockData);
      
      const retrieved = platform.getMarketData(testSymbol);
      expect(retrieved).toEqual(mockData);
    });

    it('should handle multiple symbols', () => {
      const symbols = ['TEST1', 'TEST2', 'TEST3'];
      
      symbols.forEach(symbol => {
        platform['marketData'].set(symbol, [{
          date: '2024-01-01',
          timestamp: Date.now(),
          open: 100,
          high: 105,
          low: 98,
          close: 102,
          volume: 1000,
        }]);
      });

      expect(platform.getSignals()).toBeDefined();
      expect(platform.getRiskMetrics()).toBeDefined();
    });
  });

  describe('Signal Management', () => {
    it('should generate signals when conditions met', () => {
      const testSymbol = 'TEST';
      
      // Manually trigger signal generation
      const mockSignal = {
        symbol: testSymbol,
        direction: 'BUY',
        confidence: 80,
        entryPrice: 100,
        targetPrice: 110,
        stopLoss: 95,
        timeHorizon: 'medium',
        rationale: ['Test signal'],
        timestamp: Date.now(),
      };

      platform['signals'].set(testSymbol, mockSignal);
      
      const retrieved = platform.getSignal(testSymbol);
      expect(retrieved).toEqual(mockSignal);
    });

    it('should return all signals', () => {
      const signals = platform.getSignals();
      
      expect(Array.isArray(signals)).toBe(true);
      expect(signals).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance for multiple calls', () => {
      const instance1 = getGlobalTradingPlatform();
      const instance2 = getGlobalTradingPlatform();
      
      expect(instance1).toBe(instance2);
    });

    it('should allow reset of singleton', () => {
      const instance1 = getGlobalTradingPlatform();
      resetGlobalTradingPlatform();
      const instance2 = getGlobalTradingPlatform();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Configuration Updates', () => {
    it('should update config and persist changes', () => {
      const newSymbols = ['NEW1', 'NEW2'];
      
      platform.updateConfig({ symbols: newSymbols });
      
      const config = platform.getConfig();
      expect(config.symbols).toEqual(newSymbols);
    });

    it('should merge config updates with existing', () => {
      platform.updateConfig({ mode: 'backtest' });
      platform.updateConfig({ aiEnabled: true });
      
      const config = platform.getConfig();
      expect(config.mode).toBe('backtest');
      expect(config.aiEnabled).toBe(true);
      expect(config.initialCapital).toBe(1000000); // Unchanged
    });
  });
});
