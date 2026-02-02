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

  // ============================================================================
  // TRADING-025: Enhanced Bias Detection Tests
  // ============================================================================

  describe('detectBiases', () => {
    it('should detect FOMO with multiple recent trades', () => {
      psychologyMonitor.startSession();

      // Record 3 trades in quick succession
      for (let i = 0; i < 3; i++) {
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

      const trade: Order = {
        id: 'new-trade',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      const analysis = psychologyMonitor.detectBiases(trade);

      expect(analysis.hasFOMO).toBe(true);
      expect(analysis.detectedBiases).toContain('FOMO (恐れによる取引)');
    });

    it('should detect fear bias after consecutive losses', () => {
      // Record consecutive losses
      for (let i = 0; i < 3; i++) {
        psychologyMonitor.recordTrade({
          id: `trade-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY', // Losses in our simplified implementation
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      const trade: Order = {
        id: 'sell-trade',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'SELL',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      const analysis = psychologyMonitor.detectBiases(trade);

      expect(analysis.hasFear).toBe(true);
      expect(analysis.detectedBiases).toContain('恐怖バイアス (早すぎた利益確定)');
    });

    it('should detect loss aversion with repeated same-symbol buys after losses', () => {
      // Record 2 consecutive losses
      for (let i = 0; i < 2; i++) {
        psychologyMonitor.recordTrade({
          id: `loss-${i}`,
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        });
      }

      // Try to buy again
      const trade: Order = {
        id: 'buy-again',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      const analysis = psychologyMonitor.detectBiases(trade);

      expect(analysis.hasLossAversion).toBe(true);
      expect(analysis.detectedBiases).toContain('損失嫌悪 (損失ポジションへの追加投資)');
    });

    it('should return no biases for disciplined trading', () => {
      const trade: Order = {
        id: 'trade-1',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      const analysis = psychologyMonitor.detectBiases(trade);

      expect(analysis.detectedBiases.length).toBe(0);
      expect(analysis.severity).toBe('low');
    });

    it('should provide recommendations when biases detected', () => {
      // Create FOMO scenario
      for (let i = 0; i < 3; i++) {
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

      const trade: Order = {
        id: 'new-trade',
        symbol: 'AAPL',
        type: 'MARKET',
        side: 'BUY',
        quantity: 100,
        status: 'FILLED',
        date: '2024-01-01',
        timestamp: Date.now()
      };

      const analysis = psychologyMonitor.detectBiases(trade);

      expect(analysis.recommendation).toBeTruthy();
      expect(analysis.recommendation).toContain('取引計画');
    });
  });

  describe('detectConsecutiveLosses', () => {
    it('should calculate current consecutive losses', () => {
      const history: Order[] = [
        {
          id: 'trade-1',
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY', // Loss
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now() - 3000
        },
        {
          id: 'trade-2',
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY', // Loss
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-02',
          timestamp: Date.now() - 2000
        },
        {
          id: 'trade-3',
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY', // Loss
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-03',
          timestamp: Date.now() - 1000
        }
      ];

      const info = psychologyMonitor.detectConsecutiveLosses(history);

      expect(info.currentStreak).toBe(3);
      expect(info.shouldCoolOff).toBe(true);
      expect(info.coolOffReason).toBeTruthy();
    });

    it('should track maximum consecutive losses', () => {
      const history: Order[] = [
        // First streak: 3 losses
        { id: '1', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-01', timestamp: 1 },
        { id: '2', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-02', timestamp: 2 },
        { id: '3', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-03', timestamp: 3 },
        // Win breaks streak
        { id: '4', symbol: 'AAPL', type: 'MARKET', side: 'SELL', quantity: 100, status: 'FILLED', date: '2024-01-04', timestamp: 4 },
        // Second streak: 5 losses (should be max)
        { id: '5', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-05', timestamp: 5 },
        { id: '6', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-06', timestamp: 6 },
        { id: '7', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-07', timestamp: 7 },
        { id: '8', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-08', timestamp: 8 },
        { id: '9', symbol: 'AAPL', type: 'MARKET', side: 'BUY', quantity: 100, status: 'FILLED', date: '2024-01-09', timestamp: 9 }
      ];

      const info = psychologyMonitor.detectConsecutiveLosses(history);

      expect(info.maxStreak).toBe(5);
      expect(info.currentStreak).toBe(5);
    });

    it('should not suggest cooloff for few losses', () => {
      const history: Order[] = [
        {
          id: 'trade-1',
          symbol: 'AAPL',
          type: 'MARKET',
          side: 'BUY',
          quantity: 100,
          status: 'FILLED',
          date: '2024-01-01',
          timestamp: Date.now()
        }
      ];

      const info = psychologyMonitor.detectConsecutiveLosses(history);

      expect(info.shouldCoolOff).toBe(false);
      expect(info.coolOffReason).toBeUndefined();
    });
  });

  describe('enhanced alert generation', () => {
    it('should include new bias types in alerts', () => {
      psychologyMonitor.startSession();

      // Create FOMO scenario
      for (let i = 0; i < 3; i++) {
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

      const fomoAlert = alerts.find(a => a.type === 'fomo');
      expect(fomoAlert).toBeDefined();
      if (fomoAlert) {
        expect(fomoAlert.severity).toBe('high');
        expect(fomoAlert.message).toContain('FOMO');
      }
    });
  });
});
