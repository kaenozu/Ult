/**
 * Discipline Monitor Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DisciplineMonitor, createDisciplineMonitor } from '../DisciplineMonitor';
import { JournalEntry } from '@/app/types';

describe('DisciplineMonitor', () => {
  let monitor: DisciplineMonitor;
  let sampleEntries: JournalEntry[];

  beforeEach(() => {
    monitor = createDisciplineMonitor();

    // Create sample journal entries
    sampleEntries = [
      {
        id: '1',
        symbol: 'AAPL',
        date: '2024-01-01T10:00:00Z',
        signalType: 'BUY',
        entryPrice: 150,
        quantity: 100,
        status: 'CLOSED',
        exitPrice: 155,
        profit: 500,
        profitPercent: 3.33,
        notes: 'Good trade with plan',
        tradePlan: {
          strategy: 'trend following',
          entryReason: 'breakout',
          targetPrice: 160,
          stopLoss: 145,
          riskRewardRatio: 2
        },
        followedPlan: true,
        emotionBefore: { fear: 2, greed: 2, confidence: 4, stress: 1 },
        emotionAfter: { fear: 1, greed: 3, confidence: 4, stress: 1 }
      },
      {
        id: '2',
        symbol: 'TSLA',
        date: '2024-01-02T10:30:00Z',
        signalType: 'SELL',
        entryPrice: 200,
        quantity: 50,
        status: 'CLOSED',
        exitPrice: 195,
        profit: -250,
        profitPercent: -2.5,
        notes: 'Trade without plan',
        followedPlan: false,
        emotionBefore: { fear: 4, greed: 1, confidence: 2, stress: 4 },
        emotionAfter: { fear: 5, greed: 1, confidence: 1, stress: 5 }
      },
      {
        id: '3',
        symbol: 'NVDA',
        date: '2024-01-03T11:00:00Z',
        signalType: 'BUY',
        entryPrice: 400,
        quantity: 200, // Oversized position
        status: 'CLOSED',
        exitPrice: 405,
        profit: 1000,
        profitPercent: 1.25,
        notes: 'Oversized position',
        tradePlan: {
          strategy: 'trend following',
          entryReason: 'breakout',
          targetPrice: 420
          // Missing stopLoss
        },
        followedPlan: true,
        emotionBefore: { fear: 1, greed: 4, confidence: 5, stress: 1 },
        emotionAfter: { fear: 1, greed: 5, confidence: 5, stress: 1 }
      }
    ];
  });

  describe('checkEntryForViolations', () => {
    it('should detect missing trade plan', () => {
      const entryWithoutPlan: JournalEntry = {
        id: 'test',
        symbol: 'TEST',
        date: '2024-01-01T10:00:00Z',
        signalType: 'BUY',
        entryPrice: 100,
        quantity: 10,
        status: 'OPEN',
        notes: 'No plan'
      };

      const violations = monitor.checkEntryForViolations(entryWithoutPlan);
      const noPlanViolation = violations.find(v => v.type === 'no_plan');
      expect(noPlanViolation).toBeDefined();
      expect(noPlanViolation?.severity).toBe('moderate');
    });

    it('should detect plan deviation', () => {
      const entryWithDeviation = { ...sampleEntries[1] };
      const violations = monitor.checkEntryForViolations(entryWithDeviation);
      const deviationViolation = violations.find(v => v.type === 'plan_deviation');
      expect(deviationViolation).toBeDefined();
      expect(deviationViolation?.severity).toBe('major');
    });

    it('should detect oversized position', () => {
      const entryWithOversized = { ...sampleEntries[2] };
      const violations = monitor.checkEntryForViolations(entryWithOversized);
      const oversizedViolation = violations.find(v => v.type === 'oversized_position');
      expect(oversizedViolation).toBeDefined();
      expect(oversizedViolation?.severity).toBe('major');
    });

    it('should detect missing stop loss when required', () => {
      const entryWithoutStopLoss = { ...sampleEntries[2] };
      const violations = monitor.checkEntryForViolations(entryWithoutStopLoss);
      const noStopLossViolation = violations.find(v => v.type === 'no_stop_loss');
      expect(noStopLossViolation).toBeDefined();
      expect(noStopLossViolation?.severity).toBe('critical');
    });

    it('should detect emotional trading', () => {
      const emotionalEntry: JournalEntry = {
        ...sampleEntries[0],
        emotionBefore: { fear: 5, greed: 5, confidence: 1, stress: 5 }
      };

      const violations = monitor.checkEntryForViolations(emotionalEntry);
      const emotionalViolation = violations.find(v => v.type === 'emotional_trade');
      expect(emotionalViolation).toBeDefined();
      expect(emotionalViolation?.severity).toBe('moderate');
    });

    it('should store violations', () => {
      const entry = { ...sampleEntries[0] };
      monitor.checkEntryForViolations(entry);

      const recentViolations = monitor.getRecentViolations(7);
      expect(recentViolations.length).toBeGreaterThan(0);
    });

    it('should include violation impact', () => {
      const entry = { ...sampleEntries[1] };
      const violations = monitor.checkEntryForViolations(entry);
      const deviationViolation = violations.find(v => v.type === 'plan_deviation');

      expect(deviationViolation?.impact).toBeDefined();
      expect(deviationViolation?.impact?.actualLoss).toBeDefined();
    });
  });

  describe('calculateRuleCompliance', () => {
    it('should return zero compliance for empty entries', () => {
      const compliance = monitor.calculateRuleCompliance([]);
      expect(compliance.overall).toBe(0);
      expect(compliance.byRule.alwaysUsePlan).toBe(0);
      expect(compliance.byRule.followPlan).toBe(0);
    });

    it('should calculate overall compliance score', () => {
      const compliance = monitor.calculateRuleCompliance(sampleEntries);
      expect(compliance.overall).toBeGreaterThanOrEqual(0);
      expect(compliance.overall).toBeLessThanOrEqual(100);
    });

    it('should calculate individual rule compliance', () => {
      const compliance = monitor.calculateRuleCompliance(sampleEntries);

      expect(compliance.byRule.alwaysUsePlan).toBeGreaterThanOrEqual(0);
      expect(compliance.byRule.alwaysUsePlan).toBeLessThanOrEqual(100);

      expect(compliance.byRule.followPlan).toBeGreaterThanOrEqual(0);
      expect(compliance.byRule.followPlan).toBeLessThanOrEqual(100);

      expect(compliance.byRule.positionSizing).toBeGreaterThanOrEqual(0);
      expect(compliance.byRule.positionSizing).toBeLessThanOrEqual(100);

      expect(compliance.byRule.useStopLoss).toBeGreaterThanOrEqual(0);
      expect(compliance.byRule.useStopLoss).toBeLessThanOrEqual(100);

      expect(compliance.byRule.emotionalControl).toBeGreaterThanOrEqual(0);
      expect(compliance.byRule.emotionalControl).toBeLessThanOrEqual(100);

      expect(compliance.byRule.tradingFrequency).toBeGreaterThanOrEqual(0);
      expect(compliance.byRule.tradingFrequency).toBeLessThanOrEqual(100);
    });

    it('should detect trend', () => {
      const compliance = monitor.calculateRuleCompliance(sampleEntries);
      expect(['improving', 'declining', 'stable']).toContain(compliance.trend);
    });
  });

  describe('extractLearningPatterns', () => {
    it('should identify successful behaviors', () => {
      const patterns = monitor.extractLearningPatterns(sampleEntries);
      const successPatterns = patterns.filter(p => p.patternType === 'successful_behavior');
      expect(successPatterns.length).toBeGreaterThan(0);
    });

    it('should identify failure patterns', () => {
      const patterns = monitor.extractLearningPatterns(sampleEntries);
      const failurePatterns = patterns.filter(p => p.patternType === 'failure_pattern');
      expect(failurePatterns.length).toBeGreaterThan(0);
    });

    it('should identify improvement areas', () => {
      const patterns = monitor.extractLearningPatterns(sampleEntries);
      const improvementAreas = patterns.filter(p => p.patternType === 'improvement_area');
      expect(improvementAreas.length).toBeGreaterThan(0);
    });

    it('should include actionable patterns', () => {
      const patterns = monitor.extractLearningPatterns(sampleEntries);
      patterns.forEach(pattern => {
        if (pattern.actionable) {
          expect(pattern.recommendation).toBeDefined();
          expect(typeof pattern.recommendation).toBe('string');
        }
      });
    });

    it('should filter by confidence', () => {
      const patterns = monitor.extractLearningPatterns(sampleEntries);
      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('generateDisciplineReport', () => {
    it('should generate comprehensive report', () => {
      const report = monitor.generateDisciplineReport(sampleEntries);

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('ruleCompliance');
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('learningPatterns');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('recommendations');
    });

    it('should include insights', () => {
      const report = monitor.generateDisciplineReport(sampleEntries);
      expect(report.insights).toHaveProperty('strongestArea');
      expect(report.insights).toHaveProperty('weakestArea');
      expect(report.insights).toHaveProperty('topViolations');
      expect(report.insights).toHaveProperty('recentImprovements');
    });

    it('should generate recommendations', () => {
      const report = monitor.generateDisciplineReport(sampleEntries);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify strongest and weakest areas', () => {
      const report = monitor.generateDisciplineReport(sampleEntries);
      expect(report.insights.strongestArea).toBeDefined();
      expect(report.insights.weakestArea).toBeDefined();
      expect(typeof report.insights.strongestArea).toBe('string');
      expect(typeof report.insights.weakestArea).toBe('string');
    });
  });

  describe('getRecentViolations', () => {
    it('should return empty array initially', () => {
      const newMonitor = createDisciplineMonitor();
      const violations = newMonitor.getRecentViolations(7);
      expect(violations).toEqual([]);
    });

    it('should return violations within timeframe', () => {
      monitor.checkEntryForViolations(sampleEntries[0]);
      monitor.checkEntryForViolations(sampleEntries[2]);

      const violations = monitor.getRecentViolations(7);
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should filter violations by date', () => {
      monitor.checkEntryForViolations(sampleEntries[0]);
      monitor.checkEntryForViolations(sampleEntries[2]);

      // Get violations from last 1 day
      const recentViolations = monitor.getRecentViolations(1);
      expect(recentViolations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearViolations', () => {
    it('should clear all violations', () => {
      monitor.checkEntryForViolations(sampleEntries[0]);
      monitor.checkEntryForViolations(sampleEntries[2]);

      expect(monitor.getRecentViolations(7).length).toBeGreaterThan(0);

      monitor.clearViolations();
      expect(monitor.getRecentViolations(7)).toEqual([]);
    });
  });

  describe('Configuration', () => {
    it('should use custom max trades per day', () => {
      const customMonitor = createDisciplineMonitor({ maxTradesPerDay: 10 });
      const compliance = customMonitor.calculateRuleCompliance(sampleEntries);
      expect(compliance.byRule.tradingFrequency).toBeDefined();
    });

    it('should use custom max position size', () => {
      const customMonitor = createDisciplineMonitor({ maxPositionSize: 5000 });
      customMonitor.checkEntryForViolations(sampleEntries[2]);
      const violations = customMonitor.getRecentViolations(7);
      const oversized = violations.find(v => v.type === 'oversized_position');
      expect(oversized).toBeDefined();
    });

    it('should use custom require stop loss setting', () => {
      const customMonitor = createDisciplineMonitor({ requireStopLoss: false });
      customMonitor.checkEntryForViolations(sampleEntries[2]);
      const violations = customMonitor.getRecentViolations(7);
      const noStopLoss = violations.find(v => v.type === 'no_stop_loss');
      expect(noStopLoss).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle entries without emotion data', () => {
      const entryWithoutEmotion = { ...sampleEntries[0], emotionBefore: undefined };
      expect(() => {
        monitor.checkEntryForViolations(entryWithoutEmotion);
      }).not.toThrow();
    });

    it('should handle entries with undefined profit', () => {
      const entryWithoutProfit = { ...sampleEntries[0], profit: undefined };
      expect(() => {
        monitor.checkEntryForViolations(entryWithoutProfit);
      }).not.toThrow();
    });

    it('should handle entries with undefined status', () => {
      const entryWithoutStatus = { ...sampleEntries[0], status: undefined };
      expect(() => {
        monitor.checkEntryForViolations(entryWithoutStatus);
      }).not.toThrow();
    });

    it('should handle missing trade plan gracefully', () => {
      const entryWithoutPlan: JournalEntry = {
        id: 'test',
        symbol: 'TEST',
        date: '2024-01-01T10:00:00Z',
        signalType: 'BUY',
        entryPrice: 100,
        quantity: 10,
        status: 'OPEN',
        notes: 'No plan'
      };

      expect(() => {
        monitor.checkEntryForViolations(entryWithoutPlan);
      }).not.toThrow();
    });
  });

  describe('Factory Function', () => {
    it('should create instance with default config', () => {
      const instance = createDisciplineMonitor();
      expect(instance).toBeInstanceOf(DisciplineMonitor);
    });

    it('should create instance with custom config', () => {
      const instance = createDisciplineMonitor({
        maxTradesPerDay: 10,
        maxPositionSize: 5000,
        maxRiskPerTrade: 1000,
        requireStopLoss: false,
        lookbackPeriod: 7
      });
      expect(instance).toBeInstanceOf(DisciplineMonitor);
    });
  });

  describe('Integration Tests', () => {
    it('should analyze multiple entries correctly', () => {
      const report = monitor.generateDisciplineReport(sampleEntries);

      expect(report.ruleCompliance.overall).toBeGreaterThanOrEqual(0);
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.learningPatterns.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide actionable insights', () => {
      const report = monitor.generateDisciplineReport(sampleEntries);

      // Check that recommendations are actionable
      report.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });

      // Check that learning patterns have recommendations
      report.learningPatterns.forEach(pattern => {
        if (pattern.actionable) {
          expect(pattern.recommendation).toBeDefined();
        }
      });
    });

    it('should track violations over time', () => {
      // Check multiple entries
      sampleEntries.forEach(entry => {
        monitor.checkEntryForViolations(entry);
      });

      const violations = monitor.getRecentViolations(7);
      expect(violations.length).toBeGreaterThan(0);

      // Verify violation types
      const violationTypes = new Set(violations.map(v => v.type));
      expect(violationTypes.size).toBeGreaterThan(0);
    });
  });
});
