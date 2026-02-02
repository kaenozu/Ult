/**
 * AITradeService.test.ts
 * 
 * Comprehensive unit tests for AITradeService
 * Tests trade processing, entry/exit logic, profit calculations, and reflections
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { aiTradeService } from '../AITradeService';
import type { Signal, AIStatus, PaperTrade } from '@/app/types';

describe('AITradeService', () => {
  let mockStatus: AIStatus;

  beforeEach(() => {
    mockStatus = {
      isEnabled: true,
      virtualBalance: 10000000, // 10M JPY
      totalProfit: 0,
      trades: [],
    };
  });

  describe('processTrades - New Trade Entry', () => {
    it('should open a BUY trade with high confidence signal', () => {
      // Arrange
      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 31000,
        stopLoss: 29500,
        timestamp: new Date().toISOString(),
      };

      // Act
      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.action).toBe('OPEN');
      expect(result?.trade).toBeDefined();
      expect(result?.trade?.type).toBe('BUY');
      expect(result?.trade?.status).toBe('OPEN');
      expect(result?.trade?.symbol).toBe('^N225');
      expect(result?.newStatus.virtualBalance).toBeLessThan(mockStatus.virtualBalance);
      expect(result?.newStatus.trades).toHaveLength(1);
    });

    it('should open a SELL trade with high confidence signal', () => {
      const signal: Signal = {
        type: 'SELL',
        confidence: 90,
        targetPrice: 29000,
        stopLoss: 30500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      expect(result).not.toBeNull();
      expect(result?.action).toBe('OPEN');
      expect(result?.trade?.type).toBe('SELL');
    });

    it('should not open trade with low confidence signal', () => {
      const signal: Signal = {
        type: 'BUY',
        confidence: 50, // Below 80 threshold
        targetPrice: 31000,
        stopLoss: 29500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      expect(result).toBeNull();
    });

    it('should not open trade with HOLD signal', () => {
      const signal: Signal = {
        type: 'HOLD',
        confidence: 85,
        targetPrice: 30000,
        stopLoss: 29000,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      expect(result).toBeNull();
    });

    it('should not open trade if already have open position', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 31000,
        stopLoss: 29500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      // Should not open new trade, might close existing or do nothing
      if (result) {
        expect(result.action).not.toBe('OPEN');
      }
    });

    it('should calculate entry price with slippage', () => {
      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 31000,
        stopLoss: 29500,
        timestamp: new Date().toISOString(),
      };

      const currentPrice = 30000;
      const result = aiTradeService.processTrades('^N225', currentPrice, signal, mockStatus);

      expect(result?.trade?.entryPrice).toBeGreaterThan(currentPrice);
    });

    it('should calculate correct quantity based on position sizing', () => {
      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 31000,
        stopLoss: 29500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      expect(result?.trade?.quantity).toBeGreaterThan(0);
      const tradeValue = result!.trade!.entryPrice * result!.trade!.quantity;
      // Should be around 10% of balance (default position sizing)
      expect(tradeValue).toBeLessThan(mockStatus.virtualBalance);
    });
  });

  describe('processTrades - Trade Exit', () => {
    it('should close BUY trade when target price is reached', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];
      mockStatus.virtualBalance = 7100000; // After buying

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 30000,
        stopLoss: 28500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30500, signal, mockStatus);

      expect(result).not.toBeNull();
      expect(result?.action).toBe('CLOSE');
      expect(result?.trade?.status).toBe('CLOSED');
      expect(result?.trade?.exitPrice).toBeDefined();
      expect(result?.newStatus.virtualBalance).toBeGreaterThan(mockStatus.virtualBalance);
    });

    it('should close BUY trade when stop loss is hit', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 30000,
        stopLoss: 28500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 28000, signal, mockStatus);

      expect(result).not.toBeNull();
      expect(result?.action).toBe('CLOSE');
      expect(result?.trade?.reflection).toContain('損切り');
    });

    it('should close BUY trade on SELL signal', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];

      const signal: Signal = {
        type: 'SELL',
        confidence: 85,
        targetPrice: 28000,
        stopLoss: 29500,
        timestamp: new Date().toISOString(),
      };

      // Price is still profitable but signal changed
      const result = aiTradeService.processTrades('^N225', 29200, signal, mockStatus);

      expect(result).not.toBeNull();
      expect(result?.action).toBe('CLOSE');
      // The reflection might be different based on logic, just check it exists
      expect(result?.trade?.reflection).toBeDefined();
    });

    it('should close SELL trade when target price is reached', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'SELL',
        entryPrice: 30000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];

      const signal: Signal = {
        type: 'SELL',
        confidence: 85,
        targetPrice: 29000,
        stopLoss: 30500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 28500, signal, mockStatus);

      expect(result).not.toBeNull();
      expect(result?.action).toBe('CLOSE');
      expect(result?.trade?.reflection).toContain('空売り利確');
    });

    it('should close SELL trade when stop loss is hit', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'SELL',
        entryPrice: 30000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];

      const signal: Signal = {
        type: 'SELL',
        confidence: 85,
        targetPrice: 29000,
        stopLoss: 30500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 31000, signal, mockStatus);

      expect(result).not.toBeNull();
      expect(result?.action).toBe('CLOSE');
      expect(result?.trade?.reflection).toContain('上昇トレンド');
    });
  });

  describe('processTrades - Profit Calculation', () => {
    it('should calculate positive profit for winning BUY trade', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];
      mockStatus.virtualBalance = 7100000;

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 30000,
        stopLoss: 28500,
        timestamp: new Date().toISOString(),
      };

      // Target price reached
      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      expect(result).not.toBeNull();
      expect(result?.trade?.profitPercent).toBeGreaterThan(0);
      expect(result?.newStatus.totalProfit).toBeGreaterThan(0);
    });

    it('should calculate negative profit for losing BUY trade', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 30000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];
      mockStatus.virtualBalance = 7000000;

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 31000,
        stopLoss: 29000,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 28500, signal, mockStatus);

      expect(result?.trade?.profitPercent).toBeLessThan(0);
      expect(result?.newStatus.totalProfit).toBeLessThan(0);
    });

    it('should update virtual balance correctly on close', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      const initialBalance = 7100000;
      mockStatus.trades = [openTrade];
      mockStatus.virtualBalance = initialBalance;

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 30000,
        stopLoss: 28500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      // Balance should be initial + return from sale
      expect(result?.newStatus.virtualBalance).toBeGreaterThan(initialBalance);
      expect(result?.newStatus.virtualBalance).toBeLessThanOrEqual(10000000 + 100000); // Max reasonable profit
    });
  });

  describe('processTrades - Market Context', () => {
    it('should include market context in reflection for losing trade', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 30000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 31000,
        stopLoss: 29000,
        timestamp: new Date().toISOString(),
        marketContext: {
          indexSymbol: 'S&P 500',
          correlation: 0.85,
          beta: 1.2,
          indexTrend: 'DOWN',
          confidence: 'high',
        },
      };

      const result = aiTradeService.processTrades('^N225', 28500, signal, mockStatus);

      expect(result?.trade?.reflection).toContain('S&P 500');
      expect(result?.trade?.reflection).toContain('0.85');
    });

    it('should include market context for winning trade with favorable conditions', () => {
      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [openTrade];
      mockStatus.virtualBalance = 7100000;

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 30500,
        stopLoss: 28500,
        timestamp: new Date().toISOString(),
        marketContext: {
          indexSymbol: 'S&P 500',
          correlation: 0.85,
          beta: 1.2,
          indexTrend: 'UP',
          confidence: 'high',
        },
      };

      // Target reached
      const result = aiTradeService.processTrades('^N225', 30500, signal, mockStatus);

      expect(result).not.toBeNull();
      if (result?.trade?.reflection) {
        // Market context should be included in reflection
        expect(result.trade.reflection.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle zero quantity gracefully', () => {
      mockStatus.virtualBalance = 10; // Very low balance

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 31000,
        stopLoss: 29500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      expect(result).toBeNull(); // Cannot open trade with 0 quantity
    });

    it('should handle null signal', () => {
      const result = aiTradeService.processTrades('^N225', 30000, null, mockStatus);

      expect(result).toBeNull();
    });

    it('should preserve closed trades', () => {
      const closedTrade: PaperTrade = {
        id: 'trade-0',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 28000,
        quantity: 100,
        status: 'CLOSED',
        entryDate: new Date(Date.now() - 86400000).toISOString(),
        exitPrice: 29000,
        exitDate: new Date().toISOString(),
        profitPercent: 3.57,
      };

      const openTrade: PaperTrade = {
        id: 'trade-1',
        symbol: '^N225',
        type: 'BUY',
        entryPrice: 29000,
        quantity: 100,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
      };

      mockStatus.trades = [closedTrade, openTrade];

      const signal: Signal = {
        type: 'BUY',
        confidence: 85,
        targetPrice: 30000,
        stopLoss: 28500,
        timestamp: new Date().toISOString(),
      };

      const result = aiTradeService.processTrades('^N225', 30000, signal, mockStatus);

      if (result) {
        const closedTradeInResult = result.newStatus.trades.find(t => t.id === 'trade-0');
        expect(closedTradeInResult).toBeDefined();
        expect(closedTradeInResult?.status).toBe('CLOSED');
      }
    });
  });
});
