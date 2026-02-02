/**
 * AI Trading Coach Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AITradingCoach, createAITradingCoach } from '../AITradingCoach';
import { JournalEntry } from '@/app/types';

describe('AITradingCoach', () => {
  let coach: AITradingCoach;
  let sampleEntries: JournalEntry[];

  beforeEach(() => {
    coach = createAITradingCoach();

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
        notes: 'Good trade',
        tradePlan: {
          strategy: 'trend following',
          entryReason: 'breakout',
          targetPrice: 160,
          stopLoss: 145,
          riskRewardRatio: 2
        },
        emotionBefore: { fear: 2, greed: 2, confidence: 4, stress: 1 },
        emotionAfter: { fear: 1, greed: 3, confidence: 4, stress: 1 },
        reflection: {
          lessonsLearned: 'Patience paid off',
          whatWorked: 'Followed the plan',
          whatDidntWork: 'Could have held longer',
          wouldDoAgain: true
        },
        followedPlan: true
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
        notes: 'Bad trade',
        tradePlan: {
          strategy: 'momentum',
          entryReason: 'dip',
          targetPrice: 210,
          stopLoss: 195,
          riskRewardRatio: 1.5
        },
        emotionBefore: { fear: 3, greed: 3, confidence: 3, stress: 2 },
        emotionAfter: { fear: 4, greed: 2, confidence: 2, stress: 3 },
        followedPlan: false
      },
      {
        id: '3',
        symbol: 'NVDA',
        date: '2024-01-02T11:00:00Z',
        signalType: 'BUY',
        entryPrice: 400,
        quantity: 25,
        status: 'CLOSED',
        exitPrice: 405,
        profit: 125,
        profitPercent: 1.25,
        notes: 'Premature exit',
        tradePlan: {
          strategy: 'trend following',
          entryReason: 'breakout',
          targetPrice: 420,
          stopLoss: 390,
          riskRewardRatio: 2
        },
        emotionBefore: { fear: 4, greed: 1, confidence: 2, stress: 3 },
        emotionAfter: { fear: 3, greed: 1, confidence: 3, stress: 2 },
        followedPlan: true
      }
    ];
  });

  describe('analyzeTradingPatterns', () => {
    it('should return empty array for insufficient data', () => {
      const patterns = coach.analyzeTradingPatterns([]);
      expect(patterns).toEqual([]);
    });

    it('should detect premature exit pattern', () => {
      const patterns = coach.analyzeTradingPatterns(sampleEntries);
      const prematureExit = patterns.find(p => p.patternType === 'premature_exit');
      expect(prematureExit).toBeDefined();
      expect(prematureExit?.impact).toBe('negative');
    });

    it('should include confidence score for each pattern', () => {
      const patterns = coach.analyzeTradingPatterns(sampleEntries);
      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should filter patterns by confidence threshold', () => {
      const strictCoach = createAITradingCoach({ confidenceThreshold: 0.9 });
      const patterns = strictCoach.analyzeTradingPatterns(sampleEntries);
      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for detected patterns', () => {
      const patterns = coach.analyzeTradingPatterns(sampleEntries);
      const suggestions = coach.generateSuggestions(sampleEntries, patterns);

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('category');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('title');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('actionableSteps');
        expect(suggestion).toHaveProperty('expectedImpact');
        expect(suggestion).toHaveProperty('timeframe');
      });
    });

    it('should sort suggestions by priority', () => {
      const patterns = coach.analyzeTradingPatterns(sampleEntries);
      const suggestions = coach.generateSuggestions(sampleEntries, patterns);

      for (let i = 0; i < suggestions.length - 1; i++) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const currentPriority = priorityOrder[suggestions[i].priority];
        const nextPriority = priorityOrder[suggestions[i + 1].priority];
        expect(currentPriority).toBeLessThanOrEqual(nextPriority);
      }
    });

    it('should include actionable steps', () => {
      const patterns = coach.analyzeTradingPatterns(sampleEntries);
      const suggestions = coach.generateSuggestions(sampleEntries, patterns);

      suggestions.forEach(suggestion => {
        expect(suggestion.actionableSteps.length).toBeGreaterThan(0);
        suggestion.actionableSteps.forEach(step => {
          expect(typeof step).toBe('string');
          expect(step.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('generateCoachingInsight', () => {
    it('should generate comprehensive coaching insight', () => {
      const insight = coach.generateCoachingInsight(sampleEntries);

      expect(insight).toHaveProperty('timestamp');
      expect(insight).toHaveProperty('overallScore');
      expect(insight).toHaveProperty('patterns');
      expect(insight).toHaveProperty('strengths');
      expect(insight).toHaveProperty('weaknesses');
      expect(insight).toHaveProperty('suggestions');
      expect(insight).toHaveProperty('motivationalMessage');
    });

    it('should calculate overall score between 0 and 100', () => {
      const insight = coach.generateCoachingInsight(sampleEntries);
      expect(insight.overallScore).toBeGreaterThanOrEqual(0);
      expect(insight.overallScore).toBeLessThanOrEqual(100);
    });

    it('should generate motivational message', () => {
      const insight = coach.generateCoachingInsight(sampleEntries);
      expect(insight.motivationalMessage).toBeDefined();
      expect(typeof insight.motivationalMessage).toBe('string');
      expect(insight.motivationalMessage.length).toBeGreaterThan(0);
    });

    it('should identify strengths and weaknesses', () => {
      const insight = coach.generateCoachingInsight(sampleEntries);
      expect(Array.isArray(insight.strengths)).toBe(true);
      expect(Array.isArray(insight.weaknesses)).toBe(true);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect overtrading pattern', () => {
      // Create entries with many trades per day
      const manyTrades = Array.from({ length: 20 }, (_, i) => ({
        ...sampleEntries[0],
        id: `${i}`,
        date: `2024-01-01T${10 + i}:00:00Z`
      }));

      const patterns = coach.analyzeTradingPatterns(manyTrades);
      const overtrading = patterns.find(p => p.patternType === 'overtrading');
      expect(overtrading).toBeDefined();
    });

    it('should detect revenge trading pattern', () => {
      // Create entries with consecutive losses and quick re-entries
      const revengeTrades = [
        { ...sampleEntries[1], id: '1', date: '2024-01-01T10:00:00Z' },
        { ...sampleEntries[1], id: '2', date: '2024-01-01T10:15:00Z' },
        { ...sampleEntries[1], id: '3', date: '2024-01-01T10:25:00Z' }
      ];

      const patterns = coach.analyzeTradingPatterns(revengeTrades);
      const revengeTrading = patterns.find(p => p.patternType === 'revenge_trading');
      expect(revengeTrading).toBeDefined();
    });

    it('should detect emotional trading pattern', () => {
      // Create entries with high emotion levels
      const emotionalTrades = sampleEntries.map(entry => ({
        ...entry,
        emotionBefore: { fear: 4, greed: 4, confidence: 2, stress: 4 }
      }));

      const patterns = coach.analyzeTradingPatterns(emotionalTrades);
      const emotional = patterns.find(p => p.patternType === 'emotional');
      expect(emotional).toBeDefined();
    });

    it('should detect position sizing issues', () => {
      // Create entries with varying position sizes
      const varyingSizes = [
        { ...sampleEntries[0], quantity: 10 },
        { ...sampleEntries[1], quantity: 500 },
        { ...sampleEntries[2], quantity: 1000 }
      ];

      const patterns = coach.analyzeTradingPatterns(varyingSizes);
      const positionSizing = patterns.find(p => p.patternType === 'position_sizing');
      expect(positionSizing).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use custom lookback period', () => {
      const customCoach = createAITradingCoach({ lookbackPeriod: 7 });
      const patterns = customCoach.analyzeTradingPatterns(sampleEntries);
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should use custom min trades threshold', () => {
      const customCoach = createAITradingCoach({ minTradesForAnalysis: 5 });
      const patterns = customCoach.analyzeTradingPatterns(sampleEntries.slice(0, 3));
      expect(patterns).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing emotion data gracefully', () => {
      const entriesWithoutEmotion = sampleEntries.map(entry => ({
        ...entry,
        emotionBefore: undefined,
        emotionAfter: undefined
      }));

      expect(() => {
        coach.analyzeTradingPatterns(entriesWithoutEmotion);
      }).not.toThrow();
    });

    it('should handle missing profit data gracefully', () => {
      const entriesWithoutProfit = sampleEntries.map(entry => ({
        ...entry,
        profit: undefined,
        profitPercent: undefined
      }));

      expect(() => {
        coach.analyzeTradingPatterns(entriesWithoutProfit);
      }).not.toThrow();
    });

    it('should handle empty trade plan gracefully', () => {
      const entriesWithoutPlan = sampleEntries.map(entry => ({
        ...entry,
        tradePlan: undefined
      }));

      expect(() => {
        coach.analyzeTradingPatterns(entriesWithoutPlan);
      }).not.toThrow();
    });
  });

  describe('Factory Function', () => {
    it('should create instance with default config', () => {
      const instance = createAITradingCoach();
      expect(instance).toBeInstanceOf(AITradingCoach);
    });

    it('should create instance with custom config', () => {
      const instance = createAITradingCoach({
        minTradesForAnalysis: 5,
        lookbackPeriod: 7,
        confidenceThreshold: 0.8
      });
      expect(instance).toBeInstanceOf(AITradingCoach);
    });
  });
});
