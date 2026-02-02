/**
 * Behavioral Bias Guard Tests
 * 
 * Tests for the behavioral bias validation system
 */

import { BehavioralBiasGuard } from '../behavioralBiasGuard';
import { getPsychologyMonitor } from '../psychology';
import { OrderRequest } from '@/app/types/order';
import { Position } from '@/app/types';
import { JournalEntry } from '@/app/types';

describe('BehavioralBiasGuard', () => {
  let guard: BehavioralBiasGuard;
  let mockPositions: Position[];
  let mockTrades: JournalEntry[];

  beforeEach(() => {
    // Reset psychology monitor before each test
    const monitor = getPsychologyMonitor();
    monitor.resetState();
    monitor.clearWarnings();

    guard = new BehavioralBiasGuard();
    
    mockPositions = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 100,
        avgPrice: 150,
        currentPrice: 155,
        change: 5,
        entryDate: new Date().toISOString(),
      },
    ];

    mockTrades = [];
  });

  describe('Consecutive Losses Blocking', () => {
    it('should block order after 5 consecutive losses', () => {
      // Simulate 5 consecutive losses
      const monitor = getPsychologyMonitor();
      for (let i = 0; i < 5; i++) {
        const lossEntry: JournalEntry = {
          id: `loss_${i}`,
          symbol: 'AAPL',
          date: new Date().toISOString(),
          signalType: 'BUY',
          entryPrice: 150,
          exitPrice: 145,
          quantity: 10,
          profit: -50,
          profitPercent: -3.33,
          notes: '',
          status: 'CLOSED',
        };
        monitor.recordTrade(lossEntry);
      }

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10,
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, mockPositions, mockTrades, 100000);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain('5連敗中');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].severity).toBe('high');
    });

    it('should allow order with fewer than 5 consecutive losses', () => {
      // Simulate 3 consecutive losses
      const monitor = getPsychologyMonitor();
      for (let i = 0; i < 3; i++) {
        const lossEntry: JournalEntry = {
          id: `loss_${i}`,
          symbol: 'AAPL',
          date: new Date().toISOString(),
          signalType: 'BUY',
          entryPrice: 150,
          exitPrice: 145,
          quantity: 10,
          profit: -50,
          notes: '',
          status: 'CLOSED',
        };
        monitor.recordTrade(lossEntry);
      }

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10,
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, mockPositions, mockTrades, 100000);

      expect(result.allowed).toBe(true);
      // With 3 consecutive losses, a medium warning is generated
      // This doesn't require confirmation on its own unless there are other factors
    });
  });

  describe('Revenge Trading Detection', () => {
    it('should block revenge trading (size increase during drawdown)', () => {
      // Simulate 2 consecutive losses
      const monitor = getPsychologyMonitor();
      for (let i = 0; i < 2; i++) {
        const lossEntry: JournalEntry = {
          id: `loss_${i}`,
          symbol: 'AAPL',
          date: new Date().toISOString(),
          signalType: 'BUY',
          entryPrice: 150,
          exitPrice: 145,
          quantity: 10,
          profit: -50,
          notes: '',
          status: 'CLOSED',
        };
        monitor.recordTrade(lossEntry);
      }

      // Try to increase position size by 100% (revenge trading)
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 100, // Double the current position
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, mockPositions, mockTrades, 100000);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain('復讐トレード');
      expect(result.warnings[0].type).toBe('revenge_trading');
    });

    it('should warn but not block moderate size increase during drawdown', () => {
      // Simulate 2 consecutive losses
      const monitor = getPsychologyMonitor();
      for (let i = 0; i < 2; i++) {
        const lossEntry: JournalEntry = {
          id: `loss_${i}`,
          symbol: 'AAPL',
          date: new Date().toISOString(),
          signalType: 'BUY',
          entryPrice: 150,
          exitPrice: 145,
          quantity: 10,
          profit: -50,
          notes: '',
          status: 'CLOSED',
        };
        monitor.recordTrade(lossEntry);
      }

      // Moderate increase (30%)
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 30,
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, mockPositions, mockTrades, 100000);

      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.warnings.some(w => w.type === 'revenge_trading')).toBe(true);
    });

    it('should allow normal position increase when not in drawdown', () => {
      // No losses - simulate wins
      const monitor = getPsychologyMonitor();
      const winEntry: JournalEntry = {
        id: 'win_1',
        symbol: 'AAPL',
        date: new Date().toISOString(),
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 160,
        quantity: 10,
        profit: 100,
        notes: '',
        status: 'CLOSED',
      };
      monitor.recordTrade(winEntry);

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 100,
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, mockPositions, mockTrades, 100000);

      expect(result.allowed).toBe(true);
      // May require confirmation due to size, but not blocked
    });
  });

  describe('Over-Trading Detection', () => {
    it('should warn when exceeding max trades per day', () => {
      // Simulate 20 trades today
      const monitor = getPsychologyMonitor();
      for (let i = 0; i < 20; i++) {
        const tradeEntry: JournalEntry = {
          id: `trade_${i}`,
          symbol: 'AAPL',
          date: new Date().toISOString(),
          signalType: i % 2 === 0 ? 'BUY' : 'SELL',
          entryPrice: 150,
          exitPrice: 152,
          quantity: 10,
          profit: 20,
          notes: '',
          status: 'CLOSED',
        };
        monitor.recordTrade(tradeEntry);
      }

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10,
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, mockPositions, mockTrades, 100000);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.warnings.some(w => w.type === 'over_trading')).toBe(true);
    });
  });

  describe('Position Size Validation', () => {
    it('should warn when position size exceeds recommendation', () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 1000, // Very large position
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, [], mockTrades, 100000);

      expect(result.requiresConfirmation).toBe(true);
      expect(result.warnings.some(w => w.type === 'risk_management')).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should allow updating configuration', () => {
      guard.updateConfig({
        consecutiveLossesThreshold: 3,
        revengeTradingSizeIncreaseThreshold: 30,
      });

      const config = guard.getConfig();
      expect(config.consecutiveLossesThreshold).toBe(3);
      expect(config.revengeTradingSizeIncreaseThreshold).toBe(30);
    });

    it('should respect disabled blocks', () => {
      guard.updateConfig({
        blockOnConsecutiveLosses: false,
      });

      // Simulate 5 consecutive losses
      const monitor = getPsychologyMonitor();
      for (let i = 0; i < 5; i++) {
        const lossEntry: JournalEntry = {
          id: `loss_${i}`,
          symbol: 'AAPL',
          date: new Date().toISOString(),
          signalType: 'BUY',
          entryPrice: 150,
          exitPrice: 145,
          quantity: 10,
          profit: -50,
          notes: '',
          status: 'CLOSED',
        };
        monitor.recordTrade(lossEntry);
      }

      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10,
        price: 155,
        orderType: 'MARKET',
      };

      const result = guard.validateOrder(order, mockPositions, mockTrades, 100000);

      // Should not be blocked even with 5 losses
      expect(result.allowed).toBe(true);
    });
  });
});
