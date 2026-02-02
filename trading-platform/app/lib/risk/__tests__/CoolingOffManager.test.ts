/**
 * CoolingOffManager Tests
 * 
 * Tests for cooling-off timer and violation tracking
 */

import { CoolingOffManager, createCoolingOffManager } from '../CoolingOffManager';
import { CoolingReason } from '@/app/types/risk';

describe('CoolingOffManager', () => {
  let coolingOffManager: CoolingOffManager;

  beforeEach(() => {
    coolingOffManager = new CoolingOffManager();
  });

  describe('enforceCoolingOff', () => {
    it('should start a cooling-off period', () => {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: 5,
        triggerValue: 3
      };

      const cooldown = coolingOffManager.enforceCoolingOff(reason);

      expect(cooldown).toBeDefined();
      expect(cooldown.reason).toEqual(reason);
      expect(cooldown.wasRespected).toBe(true);
      expect(cooldown.violationCount).toBe(0);
    });

    it('should extend existing cooldown if already cooling', () => {
      const reason1: CoolingReason = {
        type: 'consecutive_losses',
        severity: 3,
        triggerValue: 2
      };

      const reason2: CoolingReason = {
        type: 'overtrading',
        severity: 7,
        triggerValue: 10
      };

      const cooldown1 = coolingOffManager.enforceCoolingOff(reason1);
      const originalDuration = cooldown1.duration;

      const cooldown2 = coolingOffManager.enforceCoolingOff(reason2);

      expect(cooldown2.id).toBe(cooldown1.id);
      expect(cooldown2.duration).toBeGreaterThan(originalDuration);
    });
  });

  describe('calculateCooldownPeriod', () => {
    it('should calculate period based on severity', () => {
      const lowSeverity = coolingOffManager.calculateCooldownPeriod(1);
      const mediumSeverity = coolingOffManager.calculateCooldownPeriod(5);
      const highSeverity = coolingOffManager.calculateCooldownPeriod(10);

      expect(lowSeverity.minutes).toBeLessThan(mediumSeverity.minutes);
      expect(mediumSeverity.minutes).toBeLessThan(highSeverity.minutes);
    });

    it('should respect minimum and maximum cooldown times', () => {
      const minPeriod = coolingOffManager.calculateCooldownPeriod(1);
      const maxPeriod = coolingOffManager.calculateCooldownPeriod(10);

      expect(minPeriod.minutes).toBeGreaterThanOrEqual(30);
      expect(maxPeriod.minutes).toBeLessThanOrEqual(1440);
    });
  });

  describe('isCurrentlyCoolingOff', () => {
    it('should return false when no cooldown active', () => {
      expect(coolingOffManager.isCurrentlyCoolingOff()).toBe(false);
    });

    it('should return true when cooldown active', () => {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: 5,
        triggerValue: 3
      };

      coolingOffManager.enforceCoolingOff(reason);
      expect(coolingOffManager.isCurrentlyCoolingOff()).toBe(true);
    });
  });

  describe('canTrade', () => {
    it('should allow trading when not cooling off', () => {
      const result = coolingOffManager.canTrade();

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.remainingTime).toBeUndefined();
    });

    it('should not allow trading during cooldown', () => {
      const reason: CoolingReason = {
        type: 'daily_loss_limit',
        severity: 8,
        triggerValue: 5
      };

      coolingOffManager.enforceCoolingOff(reason);
      const result = coolingOffManager.canTrade();

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.remainingTime).toBeDefined();
    });
  });

  describe('recordViolation', () => {
    it('should record violation during cooldown', () => {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: 5,
        triggerValue: 3
      };

      coolingOffManager.enforceCoolingOff(reason);
      coolingOffManager.recordViolation();

      const currentCooldown = coolingOffManager.getCurrentCooldown();
      expect(currentCooldown?.violationCount).toBe(1);
      expect(currentCooldown?.wasRespected).toBe(false);
    });

    it('should increment violation count on multiple violations', () => {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: 5,
        triggerValue: 3
      };

      coolingOffManager.enforceCoolingOff(reason);
      coolingOffManager.recordViolation();
      coolingOffManager.recordViolation();
      coolingOffManager.recordViolation();

      const currentCooldown = coolingOffManager.getCurrentCooldown();
      expect(currentCooldown?.violationCount).toBe(3);
    });
  });

  describe('manualEndCooldown', () => {
    it('should not end cooldown before minimum time', () => {
      const reason: CoolingReason = {
        type: 'manual',
        severity: 1,
        triggerValue: 0
      };

      coolingOffManager.enforceCoolingOff(reason);
      const result = coolingOffManager.manualEndCooldown();

      expect(result).toBe(false);
      expect(coolingOffManager.isCurrentlyCoolingOff()).toBe(true);
    });
  });

  describe('getCooldownHistory', () => {
    it('should return empty array when no cooldowns', () => {
      const history = coolingOffManager.getCooldownHistory();
      expect(history).toEqual([]);
    });

    it('should return cooldown history', () => {
      const reason1: CoolingReason = {
        type: 'consecutive_losses',
        severity: 5,
        triggerValue: 3
      };

      const reason2: CoolingReason = {
        type: 'overtrading',
        severity: 7,
        triggerValue: 10
      };

      coolingOffManager.enforceCoolingOff(reason1);
      coolingOffManager.endCooldown();
      coolingOffManager.enforceCoolingOff(reason2);

      const history = coolingOffManager.getCooldownHistory();
      expect(history.length).toBe(2);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        const reason: CoolingReason = {
          type: 'consecutive_losses',
          severity: 3,
          triggerValue: i
        };
        coolingOffManager.enforceCoolingOff(reason);
        coolingOffManager.endCooldown();
      }

      const history = coolingOffManager.getCooldownHistory(3);
      expect(history.length).toBe(3);
    });
  });

  describe('getCooldownStats', () => {
    it('should return correct statistics', () => {
      const reason1: CoolingReason = {
        type: 'consecutive_losses',
        severity: 5,
        triggerValue: 3
      };

      const reason2: CoolingReason = {
        type: 'overtrading',
        severity: 7,
        triggerValue: 10
      };

      coolingOffManager.enforceCoolingOff(reason1);
      coolingOffManager.recordViolation();
      coolingOffManager.endCooldown();

      coolingOffManager.enforceCoolingOff(reason2);
      coolingOffManager.endCooldown();

      const stats = coolingOffManager.getCooldownStats();

      expect(stats.totalCooldowns).toBe(2);
      expect(stats.totalViolations).toBe(1);
      expect(stats.complianceRate).toBe(50); // 1 respected, 1 not
    });
  });

  describe('getRemainingCooldownTime', () => {
    it('should return null when not cooling', () => {
      const remaining = coolingOffManager.getRemainingCooldownTime();
      expect(remaining).toBeNull();
    });

    it('should return remaining time during cooldown', () => {
      const reason: CoolingReason = {
        type: 'consecutive_losses',
        severity: 5,
        triggerValue: 3
      };

      coolingOffManager.enforceCoolingOff(reason);
      const remaining = coolingOffManager.getRemainingCooldownTime();

      expect(remaining).not.toBeNull();
      expect(remaining?.minutes).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      coolingOffManager.updateConfig({
        maxTradesPerDay: 10,
        minCooldownMinutes: 60
      });

      const config = coolingOffManager.getConfig();
      expect(config.maxTradesPerDay).toBe(10);
      expect(config.minCooldownMinutes).toBe(60);
    });
  });

  describe('createCoolingOffManager', () => {
    it('should create instance with custom config', () => {
      const manager = createCoolingOffManager({
        consecutiveLossThreshold: 5,
        maxTradesPerDay: 10
      });

      const config = manager.getConfig();
      expect(config.consecutiveLossThreshold).toBe(5);
      expect(config.maxTradesPerDay).toBe(10);
    });
  });
});
