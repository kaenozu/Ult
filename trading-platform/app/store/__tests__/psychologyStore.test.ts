/**
 * Psychology Store Tests
 * 
 * Tests for psychology state management
 */

import { usePsychologyStore } from '../psychologyStore';
import { PsychologyAlert, CooldownRecord } from '@/app/types/risk';
import { act } from '@testing-library/react';

describe('PsychologyStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      usePsychologyStore.getState().reset();
    });
  });

  describe('alerts', () => {
    it('should add alert', () => {
      const alert: PsychologyAlert = {
        type: 'fomo',
        severity: 'high',
        message: 'Test alert',
        recommendation: 'Test recommendation',
        timestamp: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addAlert(alert);
      });

      const state = usePsychologyStore.getState();
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0]).toEqual(alert);
    });

    it('should clear all alerts', () => {
      const alert: PsychologyAlert = {
        type: 'overtrading',
        severity: 'medium',
        message: 'Test',
        recommendation: 'Test',
        timestamp: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addAlert(alert);
        usePsychologyStore.getState().clearAlerts();
      });

      const state = usePsychologyStore.getState();
      expect(state.alerts).toHaveLength(0);
    });

    it('should dismiss specific alert', () => {
      const alert1: PsychologyAlert = {
        type: 'fomo',
        severity: 'high',
        message: 'Alert 1',
        recommendation: 'Test',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const alert2: PsychologyAlert = {
        type: 'fear',
        severity: 'medium',
        message: 'Alert 2',
        recommendation: 'Test',
        timestamp: new Date('2024-01-01T11:00:00Z')
      };

      act(() => {
        usePsychologyStore.getState().addAlert(alert1);
        usePsychologyStore.getState().addAlert(alert2);
        usePsychologyStore.getState().dismissAlert(alert1.timestamp);
      });

      const state = usePsychologyStore.getState();
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0].message).toBe('Alert 2');
    });

    it('should get alert statistics', () => {
      const alerts: PsychologyAlert[] = [
        { type: 'fomo', severity: 'high', message: '', recommendation: '', timestamp: new Date() },
        { type: 'fomo', severity: 'medium', message: '', recommendation: '', timestamp: new Date() },
        { type: 'fear', severity: 'high', message: '', recommendation: '', timestamp: new Date() }
      ];

      act(() => {
        alerts.forEach(alert => usePsychologyStore.getState().addAlert(alert));
      });

      const stats = usePsychologyStore.getState().getAlertStats();

      expect(stats.total).toBe(3);
      expect(stats.byType.fomo).toBe(2);
      expect(stats.byType.fear).toBe(1);
      expect(stats.bySeverity.high).toBe(2);
      expect(stats.bySeverity.medium).toBe(1);
    });

    it('should get recent alerts', () => {
      const oldAlert: PsychologyAlert = {
        type: 'fatigue',
        severity: 'low',
        message: 'Old',
        recommendation: 'Test',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      const recentAlert: PsychologyAlert = {
        type: 'greed',
        severity: 'medium',
        message: 'Recent',
        recommendation: 'Test',
        timestamp: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addAlert(oldAlert);
        usePsychologyStore.getState().addAlert(recentAlert);
      });

      const recent = usePsychologyStore.getState().getRecentAlerts(24);

      expect(recent).toHaveLength(1);
      expect(recent[0].message).toBe('Recent');
    });
  });

  describe('trade plans', () => {
    it('should add trade plan', () => {
      const plan = {
        id: 'plan-1',
        symbol: 'AAPL',
        strategy: 'Breakout',
        entryReason: 'Support confirmed',
        targetPrice: 200,
        stopLoss: 180,
        riskRewardRatio: 2,
        positionSize: 100,
        createdAt: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addTradePlan(plan);
      });

      const state = usePsychologyStore.getState();
      expect(state.tradePlans).toHaveLength(1);
      expect(state.tradePlans[0]).toEqual(plan);
    });

    it('should update trade plan', () => {
      const plan = {
        id: 'plan-1',
        symbol: 'AAPL',
        strategy: 'Breakout',
        entryReason: 'Support confirmed',
        targetPrice: 200,
        stopLoss: 180,
        riskRewardRatio: 2,
        positionSize: 100,
        createdAt: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addTradePlan(plan);
        usePsychologyStore.getState().updateTradePlan('plan-1', { targetPrice: 210 });
      });

      const state = usePsychologyStore.getState();
      expect(state.tradePlans[0].targetPrice).toBe(210);
    });

    it('should delete trade plan', () => {
      const plan = {
        id: 'plan-1',
        symbol: 'AAPL',
        strategy: 'Breakout',
        entryReason: 'Test',
        targetPrice: 200,
        stopLoss: 180,
        riskRewardRatio: 2,
        positionSize: 100,
        createdAt: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addTradePlan(plan);
        usePsychologyStore.getState().deleteTradePlan('plan-1');
      });

      const state = usePsychologyStore.getState();
      expect(state.tradePlans).toHaveLength(0);
    });

    it('should get trade plan by id', () => {
      const plan = {
        id: 'plan-1',
        symbol: 'AAPL',
        strategy: 'Breakout',
        entryReason: 'Test',
        targetPrice: 200,
        stopLoss: 180,
        riskRewardRatio: 2,
        positionSize: 100,
        createdAt: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addTradePlan(plan);
      });

      const found = usePsychologyStore.getState().getTradePlan('plan-1');
      expect(found).toEqual(plan);

      const notFound = usePsychologyStore.getState().getTradePlan('plan-2');
      expect(notFound).toBeUndefined();
    });
  });

  describe('reflections', () => {
    it('should add reflection', () => {
      const reflection = {
        tradeId: 'trade-1',
        lessonsLearned: 'Patience is key',
        whatWorked: 'Entry timing',
        whatDidntWork: 'Exit too early',
        emotionalState: {
          fear: 2,
          greed: 3,
          confidence: 4,
          stress: 2,
          overall: 2.75
        },
        wouldDoAgain: true,
        improvementAreas: ['Better exit strategy'],
        createdAt: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addReflection(reflection);
      });

      const state = usePsychologyStore.getState();
      expect(state.reflections).toHaveLength(1);
      expect(state.reflections[0]).toEqual(reflection);
    });

    it('should get reflection by trade id', () => {
      const reflection = {
        tradeId: 'trade-1',
        lessonsLearned: 'Test',
        whatWorked: 'Test',
        whatDidntWork: 'Test',
        emotionalState: {
          fear: 2,
          greed: 3,
          confidence: 4,
          stress: 2,
          overall: 2.75
        },
        wouldDoAgain: true,
        improvementAreas: [],
        createdAt: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addReflection(reflection);
      });

      const found = usePsychologyStore.getState().getReflection('trade-1');
      expect(found).toEqual(reflection);

      const notFound = usePsychologyStore.getState().getReflection('trade-2');
      expect(notFound).toBeUndefined();
    });
  });

  describe('cooldowns', () => {
    it('should start cooldown', () => {
      const cooldown: CooldownRecord = {
        id: 'cooldown-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        reason: {
          type: 'consecutive_losses',
          severity: 5,
          triggerValue: 3
        },
        duration: 60,
        wasRespected: true,
        violationCount: 0
      };

      act(() => {
        usePsychologyStore.getState().startCooldown(cooldown);
      });

      const state = usePsychologyStore.getState();
      expect(state.currentCooldown).toEqual(cooldown);
      expect(state.cooldownRecords).toHaveLength(1);
    });

    it('should end cooldown', () => {
      const cooldown: CooldownRecord = {
        id: 'cooldown-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        reason: {
          type: 'consecutive_losses',
          severity: 5,
          triggerValue: 3
        },
        duration: 60,
        wasRespected: true,
        violationCount: 0
      };

      act(() => {
        usePsychologyStore.getState().startCooldown(cooldown);
        usePsychologyStore.getState().endCooldown();
      });

      const state = usePsychologyStore.getState();
      expect(state.currentCooldown).toBeNull();
    });

    it('should record cooldown violation', () => {
      const cooldown: CooldownRecord = {
        id: 'cooldown-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        reason: {
          type: 'consecutive_losses',
          severity: 5,
          triggerValue: 3
        },
        duration: 60,
        wasRespected: true,
        violationCount: 0
      };

      act(() => {
        usePsychologyStore.getState().startCooldown(cooldown);
        usePsychologyStore.getState().recordCooldownViolation();
      });

      const state = usePsychologyStore.getState();
      expect(state.currentCooldown?.violationCount).toBe(1);
      expect(state.currentCooldown?.wasRespected).toBe(false);
    });
  });

  describe('goals', () => {
    it('should update goals', () => {
      act(() => {
        usePsychologyStore.getState().updateGoals({
          daily: { maxTrades: 10, maxLoss: 2000, minDisciplineScore: 80 }
        });
      });

      const state = usePsychologyStore.getState();
      expect(state.goals.daily.maxTrades).toBe(10);
      expect(state.goals.daily.maxLoss).toBe(2000);
      expect(state.goals.daily.minDisciplineScore).toBe(80);
    });
  });

  describe('calendar', () => {
    it('should update calendar day', () => {
      act(() => {
        usePsychologyStore.getState().updateCalendarDay('2024-01-01', {
          tradesCount: 5,
          profitLoss: 100,
          emotionScore: 8
        });
      });

      const day = usePsychologyStore.getState().getCalendarDay('2024-01-01');
      expect(day?.tradesCount).toBe(5);
      expect(day?.profitLoss).toBe(100);
      expect(day?.emotionScore).toBe(8);
    });

    it('should merge updates with existing day', () => {
      act(() => {
        usePsychologyStore.getState().updateCalendarDay('2024-01-01', {
          tradesCount: 5
        });
        usePsychologyStore.getState().updateCalendarDay('2024-01-01', {
          profitLoss: 100
        });
      });

      const day = usePsychologyStore.getState().getCalendarDay('2024-01-01');
      expect(day?.tradesCount).toBe(5);
      expect(day?.profitLoss).toBe(100);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const alert: PsychologyAlert = {
        type: 'fomo',
        severity: 'high',
        message: 'Test',
        recommendation: 'Test',
        timestamp: new Date()
      };

      act(() => {
        usePsychologyStore.getState().addAlert(alert);
        usePsychologyStore.getState().reset();
      });

      const state = usePsychologyStore.getState();
      expect(state.alerts).toHaveLength(0);
      expect(state.tradePlans).toHaveLength(0);
      expect(state.reflections).toHaveLength(0);
      expect(state.cooldownRecords).toHaveLength(0);
      expect(state.currentCooldown).toBeNull();
    });
  });
});
