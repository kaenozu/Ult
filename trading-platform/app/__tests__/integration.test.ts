/**
 * Integration Tests
 * 
 * Tests for cross-service interactions and end-to-end scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UnifiedTradingPlatform, getGlobalTradingPlatform, resetGlobalTradingPlatform } from '../tradingCore/UnifiedTradingPlatform';
import { MarketDataService } from '../MarketDataService';
import { AdvancedRiskManager } from '../risk/AdvancedRiskManager';

describe('Integration Tests', () => {
  let platform: UnifiedTradingPlatform;

  beforeEach(() => {
    platform = new UnifiedTradingPlatform({
      mode: 'paper',
      initialCapital: 100000,
      aiEnabled: false, // Disable AI for integration tests
      sentimentEnabled: false,
      autoTrading: false,
      exchanges: ['mock'],
      symbols: ['TEST'],
    });
  });

  afterEach(async () => {
    if (platform) {
      try {
        await platform.stop();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    resetGlobalTradingPlatform();
  });

  describe('Market Data to Signals Flow', () => {
    it('should process market data and generate signals', async () => {
      const marketService = new MarketDataService();
      const testData = [
        {
          date: '2024-01-01',
          open: 100,
          high: 105,
          low: 98,
          close: 102,
          volume: 1000,
        },
        {
          date: '2024-01-02',
          open: 102,
          high: 110,
          low: 100,
          close: 108,
          volume: 1500,
        },
      ];

      const signal = platform['generateTradingSignal']?.call(platform, 'TEST', undefined, undefined, testData[testData.length - 1]);

      expect(signal).toBeDefined();
      expect(signal.symbol).toBe('TEST');
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.direction);
    });
  });

  describe('Risk Management Integration', () => {
    it('should validate trades against risk limits', () => {
      const riskManager = new AdvancedRiskManager({
        maxPositionSize: 20,
        maxDailyLoss: 5,
        maxDrawdown: 15,
      });

      const portfolio = platform.getPortfolio();
      const result = riskManager.calculatePositionSize({
        capital: portfolio.cash,
        entryPrice: 100,
        stopLossPrice: 95,
        method: 'fixed',
        riskPercent: 2,
      });

      expect(result).toBeDefined();
      expect(result.recommendedSize).toBeGreaterThan(0);
    });

    it('should block trades exceeding risk limits', () => {
      const result = platform['riskManager']['calculatePositionSize']?.call(platform['riskManager'], {
        capital: 100,
        entryPrice: 100,
        stopLossPrice: 50, // 50% loss - exceeds max daily loss
        method: 'fixed',
        riskPercent: 50, // 50% risk - exceeds max drawdown
      });

      // Risk manager should return a reduced size or block the trade
      expect(result.recommendedSize).toBeLessThan(50);
    });
  });

  describe('Alert System Integration', () => {
    it('should create and trigger alerts', () => {
      const alertName = 'Test Alert';
      const symbol = 'TEST';
      const type = 'price' as any;
      const operator = 'above' as any;
      const value = 105;

      platform.createAlert(alertName, symbol, type, operator, value);

      const alerts = platform.getAlertHistory(10);
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Data Persistence Integration', () => {
    it('should save and load portfolio data', async () => {
      // Simulate a trade
      await platform.placeOrder('TEST', 'BUY', 10, {
        price: 100,
      });

      const portfolio = platform.getPortfolio();

      expect(portfolio.positions.length).toBe(1);
      expect(portfolio.positions[0].symbol).toBe('TEST');
    });

    it('should maintain portfolio across lifecycle', async () => {
      await platform.start();
      await platform.placeOrder('TEST', 'BUY', 10, { price: 100 });
      
      const portfolio1 = platform.getPortfolio();
      const positionCount1 = portfolio1.positions.length;

      await platform.stop();
      const portfolio2 = platform.getPlatform();
      const positionCount2 = portfolio2?.positions?.length || 0;

      expect(positionCount1).toBe(positionCount2);
    });
  });
});
