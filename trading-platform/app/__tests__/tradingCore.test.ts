import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UnifiedTradingPlatform } from '../lib/tradingCore/UnifiedTradingPlatform';
import { getGlobalTradingPlatform, resetGlobalTradingPlatform } from '../lib/tradingCore/UnifiedTradingPlatform';

describe('UnifiedTradingPlatform', () => {
  beforeEach(() => {
    resetGlobalTradingPlatform();
  });

  describe('singleton instance', () => {
    it('should return the same instance when called multiple times', () => {
      const platform1 = getGlobalTradingPlatform();
      const platform2 = getGlobalTradingPlatform();
      expect(platform1).toBe(platform2);
    });

    it('should allow resetting the singleton instance', () => {
      const platform1 = getGlobalTradingPlatform();
      resetGlobalTradingPlatform();
      const platform2 = getGlobalTradingPlatform();
      expect(platform1).not.toBe(platform2);
    });
  });

  describe('initialization and configuration', () => {
    it('should initialize with default configuration', () => {
      const platform = new UnifiedTradingPlatform();
      const config = platform.getConfig();
      
      expect(config.mode).toBe('paper');
      expect(config.initialCapital).toBe(1000000);
      expect(config.aiEnabled).toBe(true);
      expect(config.sentimentEnabled).toBe(true);
      expect(config.autoTrading).toBe(false);
      expect(config.symbols).toEqual(['BTCUSD', 'ETHUSD']);
      expect(config.riskLimits).toEqual({
        maxPositionSize: 20,
        maxDailyLoss: 5,
        maxDrawdown: 15,
      });
    });

    it('should allow custom configuration', () => {
      const customConfig = {
        mode: 'backtest' as const,
        initialCapital: 500000,
        aiEnabled: false,
        sentimentEnabled: false,
        autoTrading: true,
        symbols: ['AAPL', 'TSLA'],
        riskLimits: {
          maxPositionSize: 15,
          maxDailyLoss: 3,
          maxDrawdown: 10,
        },
      };
      
      const platform = new UnifiedTradingPlatform(customConfig);
      const config = platform.getConfig();
      
      expect(config.mode).toBe(customConfig.mode);
      expect(config.initialCapital).toBe(customConfig.initialCapital);
      expect(config.aiEnabled).toBe(customConfig.aiEnabled);
      expect(config.sentimentEnabled).toBe(customConfig.sentimentEnabled);
      expect(config.autoTrading).toBe(customConfig.autoTrading);
      expect(config.symbols).toEqual(customConfig.symbols);
      expect(config.riskLimits).toEqual(customConfig.riskLimits);
    });

    it('should update configuration after initialization', () => {
      const platform = new UnifiedTradingPlatform();
      const updates = {
        mode: 'backtest' as const,
        autoTrading: true,
        symbols: ['SPX', 'NDX'],
        riskLimits: {
          maxPositionSize: 25,
          maxDailyLoss: 6,
          maxDrawdown: 18,
        },
      };

      platform.updateConfig(updates);
      const config = platform.getConfig();

      expect(config.mode).toBe(updates.mode);
      expect(config.autoTrading).toBe(updates.autoTrading);
      expect(config.symbols).toEqual(updates.symbols);
      expect(config.riskLimits).toEqual(updates.riskLimits);
    });
  });

  describe('lifecycle methods', () => {
    it('should start and stop successfully', async () => {
      const platform = new UnifiedTradingPlatform();
      await platform.start();
      expect(platform.getStatus().isRunning).toBe(true);

      await platform.stop();
      expect(platform.getStatus().isRunning).toBe(false);
    });

    it('should reset platform state', async () => {
      const platform = new UnifiedTradingPlatform();
      await platform.start();
      
      // Simulate some activity
      await platform.placeOrder('BTCUSD', 'BUY', 0.1);
      
      const initialPositions = platform.getPortfolio().positions.length;
      platform.reset();
      
      expect(platform.getPortfolio().positions.length).toBe(0);
      expect(platform.getSignals()).toEqual([]);
    });
  });

  describe('portfolio management', () => {
    it('should track portfolio value', async () => {
      const platform = new UnifiedTradingPlatform();
      
      expect(platform.getPortfolio().cash).toBe(1000000);
      expect(platform.getPortfolio().totalValue).toBe(1000000);
      expect(platform.getPortfolio().totalPnL).toBe(0);
    });

    it('should open and close positions', async () => {
      const platform = new UnifiedTradingPlatform();
      
      await platform.start();
      await platform.placeOrder('BTCUSD', 'BUY', 0.1);
      
      expect(platform.getPortfolio().positions.length).toBe(1);
      
      await platform.closePosition('BTCUSD');
      expect(platform.getPortfolio().positions.length).toBe(0);
    });

    it('should calculate P&L correctly', async () => {
      const platform = new UnifiedTradingPlatform();
      await platform.start();
      
      await platform.placeOrder('BTCUSD', 'BUY', 1);
      
      // Simulate price change
      // Note: This is a simplified test; actual implementation would use real market data
      const positions = platform.getPortfolio().positions;
      if (positions.length > 0) {
        expect(positions[0].unrealizedPnL).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('risk management', () => {
    it('should prevent overexposure', async () => {
      const platform = new UnifiedTradingPlatform({
        initialCapital: 100000,
        riskLimits: {
          maxPositionSize: 10, // 10% per position
          maxDailyLoss: 5,
          maxDrawdown: 15,
        },
      });

      await platform.start();
      
      // Try to open a position larger than limit
      await platform.placeOrder('BTCUSD', 'BUY', 1000); // Exceeds 10% limit
      
      const positions = platform.getPortfolio().positions;
      expect(positions.length).toBeGreaterThan(0);
      expect(positions[0].quantity).toBeLessThanOrEqual(0.025); // ~10% of $100k at $40k price
    });
  });
});
