/**
 * DisciplineScoreCalculator Tests
 * 
 * Tests for discipline score calculation
 */

import { DisciplineScoreCalculator, createDisciplineScoreCalculator } from '../DisciplineScoreCalculator';
import { JournalEntry } from '@/app/types';
import { CooldownRecord } from '@/app/types/risk';

describe('DisciplineScoreCalculator', () => {
  let calculator: DisciplineScoreCalculator;

  beforeEach(() => {
    calculator = new DisciplineScoreCalculator();
  });

  describe('calculateDisciplineScore', () => {
    it('should return base score for empty data (no losses or cooldowns = full scores)', () => {
      const score = calculator.calculateDisciplineScore([], []);

      expect(score.overall).toBe(40);
      expect(score.planAdherence).toBe(0);
      expect(score.emotionalControl).toBe(0);
      expect(score.lossManagement).toBe(20);
      expect(score.journalConsistency).toBe(0);
      expect(score.coolingOffCompliance).toBe(20);
    });

    it('should calculate perfect score for ideal trading', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          exitPrice: 160,
          quantity: 10,
          profit: 100,
          profitPercent: 6.67,
          notes: 'Good trade with proper plan execution',
          status: 'CLOSED',
          tradePlan: {
            strategy: 'Momentum',
            entryReason: 'Breakout confirmed',
            targetPrice: 160,
            stopLoss: 145
          },
          emotionAfter: {
            fear: 1,
            greed: 3,
            confidence: 5,
            stress: 1
          },
          followedPlan: true,
          reflection: {
            lessonsLearned: 'Waited for confirmation before entry'
          }
        }
      ];

      const cooldowns: CooldownRecord[] = [];

      const score = calculator.calculateDisciplineScore(entries, cooldowns);

      expect(score.overall).toBeGreaterThan(90);
    });

    it('should penalize for consecutive losses', () => {
      const entriesWithLosses: JournalEntry[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        symbol: 'AAPL',
        date: `2024-01-0${i + 1}`,
        signalType: 'BUY' as const,
        entryPrice: 150,
        exitPrice: 140,
        quantity: 10,
        profit: -100,
        profitPercent: -6.67,
        notes: 'Loss',
        status: 'CLOSED' as const,
        followedPlan: false
      }));

      const score = calculator.calculateDisciplineScore(entriesWithLosses, []);

      expect(score.lossManagement).toBe(0); // Maximum penalty
    });

    it('should penalize for poor plan adherence', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          quantity: 10,
          notes: '',
          status: 'CLOSED',
          followedPlan: false // Did not follow plan
        }
      ];

      const score = calculator.calculateDisciplineScore(entries, []);

      expect(score.planAdherence).toBe(0);
    });
  });

  describe('identifyImprovementAreas', () => {
    it('should identify high priority improvement areas', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          quantity: 10,
          notes: '',
          status: 'CLOSED',
          followedPlan: false
        }
      ];

      const cooldowns: CooldownRecord[] = [
        {
          id: '1',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          reason: {
            type: 'consecutive_losses',
            severity: 5,
            triggerValue: 3
          },
          duration: 60,
          wasRespected: false,
          violationCount: 2
        }
      ];

      const score = calculator.calculateDisciplineScore(entries, cooldowns);
      const improvements = calculator.identifyImprovementAreas(score);

      expect(improvements.length).toBeGreaterThan(0);
      
      const highPriorityAreas = improvements.filter(i => i.priority === 'high');
      expect(highPriorityAreas.length).toBeGreaterThan(0);
    });

    it('should sort by priority', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          quantity: 10,
          notes: 'Some notes',
          status: 'CLOSED',
          followedPlan: true,
          tradePlan: {
            strategy: 'Test',
            entryReason: 'Test'
          }
        }
      ];

      const score = calculator.calculateDisciplineScore(entries, []);
      const improvements = calculator.identifyImprovementAreas(score);

      // Verify sorting: high -> medium -> low
      for (let i = 0; i < improvements.length - 1; i++) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const current = priorityOrder[improvements[i].priority];
        const next = priorityOrder[improvements[i + 1].priority];
        expect(current).toBeLessThanOrEqual(next);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle missing emotion data', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          quantity: 10,
          notes: '',
          status: 'CLOSED'
          // No emotionAfter field
        }
      ];

      const score = calculator.calculateDisciplineScore(entries, []);

      expect(score.emotionalControl).toBeDefined();
      expect(score.breakdown.avgEmotionScore).toBe(5); // neutral default
    });

    it('should handle mixed results', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          exitPrice: 160,
          quantity: 10,
          profit: 100,
          notes: 'Win',
          status: 'CLOSED',
          followedPlan: true,
          tradePlan: {
            strategy: 'Test',
            entryReason: 'Test'
          }
        },
        {
          id: '2',
          symbol: 'AAPL',
          date: '2024-01-02',
          signalType: 'SELL',
          entryPrice: 150,
          exitPrice: 140,
          quantity: 10,
          profit: -100,
          notes: 'Loss',
          status: 'CLOSED',
          followedPlan: false
        }
      ];

      const score = calculator.calculateDisciplineScore(entries, []);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThan(100);
      expect(score.planAdherence).toBe(0);
      expect(score.breakdown.planAdherenceRate).toBe(50);
    });
  });

  describe('custom configuration', () => {
    it('should use custom weights', () => {
      const customCalculator = createDisciplineScoreCalculator({
        planAdherenceWeight: 40,
        emotionalControlWeight: 30,
        lossManagementWeight: 20,
        journalConsistencyWeight: 5,
        coolingOffComplianceWeight: 5
      });

      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          quantity: 10,
          notes: 'Good notes',
          status: 'CLOSED',
          followedPlan: true,
          tradePlan: {
            strategy: 'Test',
            entryReason: 'Test'
          }
        }
      ];

      const score = customCalculator.calculateDisciplineScore(entries, []);

      // Plan adherence should have more weight
      expect(score.planAdherence).toBe(40);
    });
  });

  describe('breakdown calculations', () => {
    it('should calculate accurate breakdown metrics', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          symbol: 'AAPL',
          date: '2024-01-01',
          signalType: 'BUY',
          entryPrice: 150,
          quantity: 10,
          notes: 'Detailed reflection with lessons learned',
          status: 'CLOSED',
          followedPlan: true,
          tradePlan: {
            strategy: 'Test',
            entryReason: 'Test'
          },
          emotionAfter: {
            fear: 2,
            greed: 3,
            confidence: 4,
            stress: 2
          }
        },
        {
          id: '2',
          symbol: 'MSFT',
          date: '2024-01-02',
          signalType: 'SELL',
          entryPrice: 300,
          quantity: 5,
          notes: 'Another detailed entry',
          status: 'CLOSED',
          followedPlan: true,
          tradePlan: {
            strategy: 'Test2',
            entryReason: 'Test2'
          }
        }
      ];

      const cooldowns: CooldownRecord[] = [
        {
          id: '1',
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
        }
      ];

      const score = calculator.calculateDisciplineScore(entries, cooldowns);

      expect(score.breakdown.planAdherenceRate).toBe(100);
      expect(score.breakdown.journalEntryRate).toBe(100);
      expect(score.breakdown.coolingOffRespectRate).toBe(100);
      expect(score.breakdown.avgEmotionScore).toBeGreaterThan(0);
    });
  });
});
