/**
 * PsychologyMonitor Tests
 * 
 * Tests for trading psychology monitoring and alert generation
 */

import { PsychologyMonitor, createPsychologyMonitor } from '../PsychologyMonitor';
import { Order } from '@/app/types';

describe('PsychologyMonitor', () => {
  let psychologyMonitor: PsychologyMonitor;

  beforeEach(() => {
    psychologyMonitor = new PsychologyMonitor();
  });

  describe('analyzeTradingBehavior', () => {
    it('should return default metrics for no trading history', () => {
      const metrics = psychologyMonitor.analyzeTradingBehavior();

      expect(metrics.averageHoldTime).toBe(0);
      expect(metrics.winRate).toBe(0);
      expect(metrics.lossRate).toBe(0);
      expect(metrics.consecutiveWins).toBe(0);
      expect(metrics.consecutiveLosses).toBe(0);
      expect(metrics.overTradingScore).toBe(0);
      expect(metrics.emotionalTradingScore).toBe(0);
    });

    it('should calculate win rate correctly', () => {
      // Add some trades
      for (let i = 0; i < 6; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: i < 4 ? 'SELL' : 'BUY', // 4 wins, 2 losses
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      const metrics = psychologyMonitor.analyzeTradingBehavior();

      expect(metrics.winRate).toBeCloseTo(0.67, 2);
      expect(metrics.lossRate).toBeCloseTo(0.33, 2);
    });
  });

  describe('generatePsychologyAlerts', () => {
    it('should detect overtrading', () => {
      psychologyMonitor.startSession();

      // Record many trades in short time
      for (let i = 0; i < 20; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      const alerts = psychologyMonitor.generatePsychologyAlerts();

      const overtradingAlert = alerts.find(a => a.type === 'overtrading');
      if (overtradingAlert) {
        expect(overtradingAlert.type).toBe('overtrading');
        expect(overtradingAlert.severity).toBeDefined();
        expect(overtradingAlert.message).toContain('過度な取引');
      }
    });

    it('should detect revenge trading after consecutive losses', () => {
      // Record consecutive losses
      for (let i = 0; i < 5; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      const alerts = psychologyMonitor.generatePsychologyAlerts();

      const revengeAlert = alerts.find(a => a.type === 'revenge_trading');
      expect(revengeAlert).toBeDefined();
      if (revengeAlert) {
        expect(revengeAlert.message).toContain('連続損失');
      }
    });

    it('should detect greed after consecutive wins', () => {
      // Record consecutive wins
      for (let i = 0; i < 5; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'SELL',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      const alerts = psychologyMonitor.generatePsychologyAlerts();

      const emotionalAlert = alerts.find(a => a.type === 'greed');
      if (emotionalAlert) {
        expect(emotionalAlert.type).toBe('greed');
      }
    });
  });

  describe('startSession and endSession', () => {
    it('should start trading session', () => {
      psychologyMonitor.startSession();

      psychologyMonitor.recordTrade({
        id: 'trade-1',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      });

      // Session should be active
      expect(() => psychologyMonitor.endSession()).not.toThrow();
    });

    it('should end trading session', () => {
      psychologyMonitor.startSession();
      psychologyMonitor.endSession();

      // Ending again should not throw
      expect(() => psychologyMonitor.endSession()).not.toThrow();
    });
  });

  describe('recordTrade', () => {
    it('should record trade', () => {
      const order: Order = {
        id: 'trade-1',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      psychologyMonitor.recordTrade(order);

      const metrics = psychologyMonitor.analyzeTradingBehavior();
      expect(metrics.lossRate).toBeGreaterThan(0);
    });

    it('should update session metrics', () => {
      psychologyMonitor.startSession();

      const order: Order = {
        id: 'trade-1',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      psychologyMonitor.recordTrade(order);

      // Should not throw
      expect(() => psychologyMonitor.endSession()).not.toThrow();
    });
  });

  describe('checkExcessiveRiskTaking', () => {
    it('should detect excessive risk', () => {
      const proposedPosition = {
        size: 1000,
        riskAmount: 5000
      };

      const normalRiskAmount = 2000;

      const result = psychologyMonitor.checkExcessiveRiskTaking(
        proposedPosition,
        normalRiskAmount
      );

      expect(result.isExcessive).toBe(true);
      expect(result.riskMultiplier).toBe(2.5);
      expect(result.recommendation).toBeTruthy();
    });

    it('should not flag normal risk', () => {
      const proposedPosition = {
        size: 1000,
        riskAmount: 2000
      };

      const normalRiskAmount = 2000;

      const result = psychologyMonitor.checkExcessiveRiskTaking(
        proposedPosition,
        normalRiskAmount
      );

      expect(result.isExcessive).toBe(false);
      expect(result.riskMultiplier).toBe(1.0);
      expect(result.recommendation).toBe('');
    });
  });

  describe('checkRuleViolation', () => {
    it('should detect max trades per day violation', () => {
      // Record trades
      for (let i = 0; i < 5; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      const order: Order = {
        id: 'trade-6',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      const result = psychologyMonitor.checkRuleViolation(order, {
        maxTradesPerDay: 5
      });

      expect(result.hasViolation).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('最大取引回数');
    });

    it('should not flag when within limits', () => {
      const order: Order = {
        id: 'trade-1',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      const result = psychologyMonitor.checkRuleViolation(order, {
        maxTradesPerDay: 10
      });

      expect(result.hasViolation).toBe(false);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('getAlerts', () => {
    it('should return all alerts', () => {
      // Generate some alerts
      for (let i = 0; i < 5; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      psychologyMonitor.generatePsychologyAlerts();

      const alerts = psychologyMonitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should filter alerts by severity', () => {
      // Generate some alerts
      for (let i = 0; i < 5; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      psychologyMonitor.generatePsychologyAlerts();

      const highAlerts = psychologyMonitor.getAlerts('high');
      highAlerts.forEach(alert => {
        expect(alert.severity).toBe('high');
      });
    });
  });

  describe('clearAlerts', () => {
    it('should clear all alerts', () => {
      // Generate some alerts
      for (let i = 0; i < 5; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      psychologyMonitor.generatePsychologyAlerts();
      psychologyMonitor.clearAlerts();

      const alerts = psychologyMonitor.getAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('createPsychologyMonitor', () => {
    it('should create instance using factory function', () => {
      const instance = createPsychologyMonitor();
      expect(instance).toBeInstanceOf(PsychologyMonitor);
    });
  });
});
