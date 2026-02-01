/**
 * Tests for Psychology Monitor
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PsychologyMonitor, PsychologyWarning, PsychologyState } from '../psychology';
import { JournalEntry } from '@/app/types';

describe('PsychologyMonitor', () => {
  let monitor: PsychologyMonitor;

  beforeEach(() => {
    monitor = new PsychologyMonitor({
      accountBalance: 100000,
      dailyLossLimit: 2000,
      maxRiskPerTrade: 2000,
      maxTradesPerDay: 20,
    });
  });

  describe('recordTrade', () => {
    it('should record a winning trade', () => {
      const trade: JournalEntry = {
        id: '1',
        symbol: 'AAPL',
        date: '2024-01-01T10:00:00Z',
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 160,
        quantity: 10,
        profit: 100,
        profitPercent: 6.67,
        notes: 'Test trade',
        status: 'CLOSED',
      };

      const warnings = monitor.recordTrade(trade);
      const state = monitor.getState();

      expect(state.consecutiveWins).toBe(1);
      expect(state.consecutiveLosses).toBe(0);
      expect(state.totalWins).toBe(1);
      expect(state.currentStreak).toBe('winning');
      expect(warnings.length).toBe(0);
    });

    it('should record a losing trade', () => {
      const trade: JournalEntry = {
        id: '1',
        symbol: 'AAPL',
        date: '2024-01-01T10:00:00Z',
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 140,
        quantity: 10,
        profit: -100,
        profitPercent: -6.67,
        notes: 'Test trade',
        status: 'CLOSED',
      };

      const warnings = monitor.recordTrade(trade);
      const state = monitor.getState();

      expect(state.consecutiveWins).toBe(0);
      expect(state.consecutiveLosses).toBe(1);
      expect(state.totalLosses).toBe(1);
      expect(state.currentStreak).toBe('losing');
      expect(warnings.length).toBe(0);
    });

    it('should generate warning for consecutive losses', () => {
      const trades: JournalEntry[] = Array(3).fill(null).map((_, i) => ({
        id: String(i + 1),
        symbol: 'AAPL',
        date: `2024-01-0${i + 1}T10:00:00Z`,
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 140,
        quantity: 10,
        profit: -100,
        profitPercent: -6.67,
        notes: 'Test trade',
        status: 'CLOSED',
      }));

      let warnings: PsychologyWarning[] = [];
      for (const trade of trades) {
        warnings = monitor.recordTrade(trade);
      }

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('consecutive_losses');
    });

    it('should generate warning for over-trading', () => {
      const trades: JournalEntry[] = Array(21).fill(null).map((_, i) => ({
        id: String(i + 1),
        symbol: 'AAPL',
        date: '2024-01-01T10:00:00Z',
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 160,
        quantity: 10,
        profit: 100,
        profitPercent: 6.67,
        notes: 'Test trade',
        status: 'CLOSED',
      }));

      let warnings: PsychologyWarning[] = [];
      for (const trade of trades) {
        warnings = monitor.recordTrade(trade);
      }

      const overTradingWarnings = warnings.filter(w => w.type === 'over_trading');
      expect(overTradingWarnings.length).toBeGreaterThan(0);
    });

    it('should generate warning for risk management violation', () => {
      const trade: JournalEntry = {
        id: '1',
        symbol: 'AAPL',
        date: '2024-01-01T10:00:00Z',
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 110,
        quantity: 100,
        profit: -4000,
        profitPercent: -26.67,
        notes: 'Test trade',
        status: 'CLOSED',
      };

      const warnings = monitor.recordTrade(trade);
      const riskWarnings = warnings.filter(w => w.type === 'risk_management');

      expect(riskWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('getState', () => {
    it('should return current psychology state', () => {
      const state = monitor.getState();

      expect(state).toBeDefined();
      expect(state.consecutiveLosses).toBeDefined();
      expect(state.consecutiveWins).toBeDefined();
      expect(state.totalLosses).toBeDefined();
      expect(state.totalWins).toBeDefined();
      expect(state.currentStreak).toBeDefined();
      expect(state.riskTolerance).toBeDefined();
    });
  });

  describe('getRiskTolerance', () => {
    it('should return current risk tolerance', () => {
      const riskTolerance = monitor.getRiskTolerance();

      expect(riskTolerance).toBeDefined();
      expect(riskTolerance).toBeGreaterThan(0);
    });

    it('should adjust risk tolerance after consecutive losses', () => {
      const trades: JournalEntry[] = Array(3).fill(null).map((_, i) => ({
        id: String(i + 1),
        symbol: 'AAPL',
        date: `2024-01-0${i + 1}T10:00:00Z`,
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 140,
        quantity: 10,
        profit: -100,
        profitPercent: -6.67,
        notes: 'Test trade',
        status: 'CLOSED',
      }));

      for (const trade of trades) {
        monitor.recordTrade(trade);
      }

      const riskTolerance = monitor.getRiskTolerance();
      expect(riskTolerance).toBeLessThan(1.0);
    });
  });

  describe('calculateRecommendedPositionSize', () => {
    it('should calculate recommended position size', () => {
      const positionSize = monitor.calculateRecommendedPositionSize(150, 145);

      expect(positionSize).toBeGreaterThan(0);
      expect(positionSize).toBeLessThan(100);
    });

    it('should return 0 for invalid parameters', () => {
      const positionSize = monitor.calculateRecommendedPositionSize(150, 150);

      expect(positionSize).toBe(0);
    });
  });

  describe('shouldPauseTrading', () => {
    it('should return false when no warnings', () => {
      const shouldPause = monitor.shouldPauseTrading();

      expect(shouldPause).toBe(false);
    });

    it('should return true after 5 consecutive losses', () => {
      const trades: JournalEntry[] = Array(5).fill(null).map((_, i) => ({
        id: String(i + 1),
        symbol: 'AAPL',
        date: `2024-01-0${i + 1}T10:00:00Z`,
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 140,
        quantity: 10,
        profit: -100,
        profitPercent: -6.67,
        notes: 'Test trade',
        status: 'CLOSED',
      }));

      for (const trade of trades) {
        monitor.recordTrade(trade);
      }

      const shouldPause = monitor.shouldPauseTrading();
      expect(shouldPause).toBe(true);
    });
  });

  describe('resetState', () => {
    it('should reset psychology state', () => {
      const trades: JournalEntry[] = Array(3).fill(null).map((_, i) => ({
        id: String(i + 1),
        symbol: 'AAPL',
        date: `2024-01-0${i + 1}T10:00:00Z`,
        signalType: 'BUY',
        entryPrice: 150,
        exitPrice: 140,
        quantity: 10,
        profit: -100,
        profitPercent: -6.67,
        notes: 'Test trade',
        status: 'CLOSED',
      }));

      for (const trade of trades) {
        monitor.recordTrade(trade);
      }

      monitor.resetState();
      const state = monitor.getState();

      expect(state.consecutiveLosses).toBe(0);
      expect(state.consecutiveWins).toBe(0);
      expect(state.totalLosses).toBe(0);
      expect(state.totalWins).toBe(0);
      expect(state.currentStreak).toBe('neutral');
    });
  });
});
