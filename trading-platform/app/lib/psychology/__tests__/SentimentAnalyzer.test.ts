/**
 * Sentiment Analyzer Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SentimentAnalyzer, createSentimentAnalyzer } from '../SentimentAnalyzer';
import { JournalEntry } from '@/app/types';

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;
  let sampleEntries: JournalEntry[];
  let extendedEntries: JournalEntry[];

  const today = new Date();
  const formatDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  beforeEach(() => {
    analyzer = createSentimentAnalyzer({ minDataPoints: 3 });

    sampleEntries = [
      {
        id: '1',
        symbol: 'AAPL',
        date: formatDate(0),
        signalType: 'BUY',
        entryPrice: 150,
        quantity: 100,
        status: 'CLOSED',
        exitPrice: 155,
        profit: 500,
        profitPercent: 3.33,
        notes: 'Good trade',
        emotionBefore: { fear: 2, greed: 2, confidence: 4, stress: 1 },
        emotionAfter: { fear: 1, greed: 3, confidence: 4, stress: 1 }
      },
      {
        id: '2',
        symbol: 'TSLA',
        date: formatDate(1),
        signalType: 'SELL',
        entryPrice: 200,
        quantity: 50,
        status: 'CLOSED',
        exitPrice: 195,
        profit: -250,
        profitPercent: -2.5,
        notes: 'Bad trade',
        emotionBefore: { fear: 4, greed: 1, confidence: 2, stress: 4 },
        emotionAfter: { fear: 5, greed: 1, confidence: 1, stress: 5 }
      },
      {
        id: '3',
        symbol: 'NVDA',
        date: formatDate(2),
        signalType: 'BUY',
        entryPrice: 400,
        quantity: 25,
        status: 'CLOSED',
        exitPrice: 420,
        profit: 500,
        profitPercent: 5,
        notes: 'Great trade',
        emotionBefore: { fear: 1, greed: 2, confidence: 5, stress: 1 },
        emotionAfter: { fear: 1, greed: 3, confidence: 5, stress: 1 }
      }
    ];

    extendedEntries = [
      ...sampleEntries,
      { id: '4', symbol: 'X', date: formatDate(3), signalType: 'BUY', entryPrice: 100, quantity: 10, status: 'CLOSED', profit: 100, emotionAfter: { fear: 1, greed: 2, confidence: 4, stress: 1 } },
      { id: '5', symbol: 'Y', date: formatDate(4), signalType: 'BUY', entryPrice: 100, quantity: 10, status: 'CLOSED', profit: 150, emotionAfter: { fear: 2, greed: 2, confidence: 4, stress: 2 } },
      { id: '6', symbol: 'Z', date: formatDate(5), signalType: 'BUY', entryPrice: 100, quantity: 10, status: 'CLOSED', profit: -50, emotionAfter: { fear: 4, greed: 1, confidence: 2, stress: 4 } },
      { id: '7', symbol: 'A', date: formatDate(6), signalType: 'SELL', entryPrice: 100, quantity: 10, status: 'CLOSED', profit: -75, emotionAfter: { fear: 5, greed: 1, confidence: 1, stress: 5 } },
      { id: '8', symbol: 'B', date: formatDate(7), signalType: 'SELL', entryPrice: 100, quantity: 10, status: 'CLOSED', profit: 200, emotionAfter: { fear: 1, greed: 3, confidence: 5, stress: 1 } },
      { id: '9', symbol: 'C', date: formatDate(8), signalType: 'BUY', entryPrice: 100, quantity: 10, status: 'CLOSED', profit: 300, emotionAfter: { fear: 2, greed: 2, confidence: 4, stress: 1 } },
      { id: '10', symbol: 'D', date: formatDate(9), signalType: 'BUY', entryPrice: 100, quantity: 10, status: 'CLOSED', profit: -100, emotionAfter: { fear: 4, greed: 2, confidence: 2, stress: 4 } }
    ];
  });

  describe('calculateFearGreedIndex', () => {
    it('should return null for insufficient data', () => {
      const result = analyzer.calculateFearGreedIndex([]);
      expect(result).toBeNull();
    });

    it('should return null for entries without emotion data', () => {
      const entriesWithoutEmotion = [{ ...sampleEntries[0], emotionAfter: undefined }];
      const result = analyzer.calculateFearGreedIndex(entriesWithoutEmotion);
      expect(result).toBeNull();
    });

    it('should calculate fear and greed index', () => {
      const result = analyzer.calculateFearGreedIndex(sampleEntries);
      expect(result).not.toBeNull();
      expect(result?.current).toBeGreaterThanOrEqual(0);
      expect(result?.current).toBeLessThanOrEqual(100);
    });

    it('should include all required components', () => {
      const result = analyzer.calculateFearGreedIndex(sampleEntries);
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('timestamp');
    });

    it('should include individual emotion components', () => {
      const result = analyzer.calculateFearGreedIndex(sampleEntries);
      expect(result?.components).toHaveProperty('fear');
      expect(result?.components).toHaveProperty('greed');
      expect(result?.components).toHaveProperty('confidence');
      expect(result?.components).toHaveProperty('stress');
    });

    it('should assign correct label based on value', () => {
      const testEntries: JournalEntry[] = [
        { ...sampleEntries[0], id: 't1', date: formatDate(0), emotionAfter: { fear: 2, greed: 2, confidence: 5, stress: 2 } },
        { ...sampleEntries[0], id: 't2', date: formatDate(1), emotionAfter: { fear: 2, greed: 2, confidence: 5, stress: 2 } },
        { ...sampleEntries[0], id: 't3', date: formatDate(2), emotionAfter: { fear: 2, greed: 2, confidence: 5, stress: 2 } }
      ];

      const result = analyzer.calculateFearGreedIndex(testEntries);
      expect(['Fear', 'Neutral', 'Greed']).toContain(result?.label);
    });

    it('should detect trend direction', () => {
      const result = analyzer.calculateFearGreedIndex(sampleEntries);
      expect(['increasing', 'decreasing', 'stable']).toContain(result?.trend);
    });
  });

  describe('analyzeEmotionTradeCorrelation', () => {
    it('should return empty array for insufficient data', () => {
      const correlations = analyzer.analyzeEmotionTradeCorrelation([]);
      expect(correlations).toEqual([]);
    });

    it('should analyze all emotion types', () => {
      const correlations = analyzer.analyzeEmotionTradeCorrelation(extendedEntries);
      const emotionTypes = correlations.map(c => c.emotionType);
      expect(emotionTypes.length).toBeGreaterThan(0);
    });

    it('should calculate correlation coefficients', () => {
      const correlations = analyzer.analyzeEmotionTradeCorrelation(extendedEntries);
      correlations.forEach(corr => {
        expect(corr.correlationCoefficient).toBeGreaterThanOrEqual(-1);
        expect(corr.correlationCoefficient).toBeLessThanOrEqual(1);
      });
    });

    it('should include significance level', () => {
      const correlations = analyzer.analyzeEmotionTradeCorrelation(extendedEntries);
      correlations.forEach(corr => {
        expect(['high', 'medium', 'low']).toContain(corr.significance);
      });
    });

    it('should include profit impact analysis', () => {
      const correlations = analyzer.analyzeEmotionTradeCorrelation(extendedEntries);
      correlations.forEach(corr => {
        expect(corr.impactOnProfit).toHaveProperty('lowEmotionProfit');
        expect(corr.impactOnProfit).toHaveProperty('highEmotionProfit');
        expect(corr.impactOnProfit).toHaveProperty('difference');
        expect(corr.impactOnProfit).toHaveProperty('percentage');
      });
    });

    it('should provide recommendations', () => {
      const correlations = analyzer.analyzeEmotionTradeCorrelation(extendedEntries);
      correlations.forEach(corr => {
        expect(corr.recommendation).toBeDefined();
        expect(typeof corr.recommendation).toBe('string');
        expect(corr.recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateEmotionalStateHistory', () => {
    it('should generate history entries', () => {
      const history = analyzer.generateEmotionalStateHistory(sampleEntries);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should include all emotion values', () => {
      const history = analyzer.generateEmotionalStateHistory(sampleEntries);
      history.forEach(entry => {
        expect(entry).toHaveProperty('fear');
        expect(entry).toHaveProperty('greed');
        expect(entry).toHaveProperty('confidence');
        expect(entry).toHaveProperty('stress');
        expect(entry).toHaveProperty('overall');
      });
    });

    it('should include timestamp', () => {
      const history = analyzer.generateEmotionalStateHistory(sampleEntries);
      history.forEach(entry => {
        expect(entry.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should include trade result when available', () => {
      const history = analyzer.generateEmotionalStateHistory(sampleEntries);
      const withResult = history.filter(h => h.tradeResult);
      expect(withResult.length).toBeGreaterThan(0);
      withResult.forEach(entry => {
        expect(['win', 'loss', 'breakeven']).toContain(entry.tradeResult);
      });
    });

    it('should calculate overall emotion average', () => {
      const history = analyzer.generateEmotionalStateHistory(sampleEntries);
      history.forEach(entry => {
        const expectedOverall = (entry.fear + entry.greed + entry.confidence + entry.stress) / 4;
        expect(entry.overall).toBeCloseTo(expectedOverall);
      });
    });
  });

  describe('generateSentimentReport', () => {
    it('should return null for insufficient data', () => {
      const report = analyzer.generateSentimentReport([]);
      expect(report).toBeNull();
    });

    it('should generate comprehensive report', () => {
      const report = analyzer.generateSentimentReport(extendedEntries);
      expect(report).not.toBeNull();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('currentFearGreedIndex');
      expect(report).toHaveProperty('emotionTradeCorrelations');
      expect(report).toHaveProperty('emotionalStateHistory');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('recommendations');
    });

    it('should include insights', () => {
      const report = analyzer.generateSentimentReport(extendedEntries);
      expect(report?.insights).toHaveProperty('dominantEmotion');
      expect(report?.insights).toHaveProperty('emotionalStability');
      expect(report?.insights).toHaveProperty('emotionalVolatility');
      expect(report?.insights).toHaveProperty('bestEmotionalState');
      expect(report?.insights).toHaveProperty('worstEmotionalState');
    });

    it('should generate recommendations', () => {
      const report = analyzer.generateSentimentReport(extendedEntries);
      expect(Array.isArray(report?.recommendations)).toBe(true);
      expect(report?.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate emotional stability score', () => {
      const report = analyzer.generateSentimentReport(extendedEntries);
      expect(report?.insights.emotionalStability).toBeGreaterThanOrEqual(0);
      expect(report?.insights.emotionalStability).toBeLessThanOrEqual(100);
    });

    it('should identify best and worst emotional states', () => {
      const report = analyzer.generateSentimentReport(extendedEntries);
      expect(report?.insights.bestEmotionalState).toHaveProperty('fear');
      expect(report?.insights.bestEmotionalState).toHaveProperty('greed');
      expect(report?.insights.bestEmotionalState).toHaveProperty('confidence');
      expect(report?.insights.bestEmotionalState).toHaveProperty('stress');

      expect(report?.insights.worstEmotionalState).toHaveProperty('fear');
      expect(report?.insights.worstEmotionalState).toHaveProperty('greed');
      expect(report?.insights.worstEmotionalState).toHaveProperty('confidence');
      expect(report?.insights.worstEmotionalState).toHaveProperty('stress');
    });
  });

  describe('Correlation Calculation', () => {
    it('should handle perfect positive correlation', () => {
      const entries: JournalEntry[] = [
        { ...sampleEntries[0], id: 'c1', date: formatDate(0), profit: 100, emotionAfter: { fear: 1, greed: 1, confidence: 1, stress: 1 } },
        { ...sampleEntries[0], id: 'c2', date: formatDate(1), profit: 200, emotionAfter: { fear: 1, greed: 1, confidence: 2, stress: 1 } },
        { ...sampleEntries[0], id: 'c3', date: formatDate(2), profit: 300, emotionAfter: { fear: 1, greed: 1, confidence: 3, stress: 1 } },
        { ...sampleEntries[0], id: 'c4', date: formatDate(3), profit: 400, emotionAfter: { fear: 1, greed: 1, confidence: 4, stress: 1 } },
        { ...sampleEntries[0], id: 'c5', date: formatDate(4), profit: 500, emotionAfter: { fear: 1, greed: 1, confidence: 5, stress: 1 } }
      ];

      const correlations = analyzer.analyzeEmotionTradeCorrelation(entries);
      const confidenceCorr = correlations.find(c => c.emotionType === 'confidence');
      expect(confidenceCorr?.correlationCoefficient).toBeGreaterThan(0);
    });

    it('should handle perfect negative correlation', () => {
      const entries: JournalEntry[] = [
        { ...sampleEntries[0], id: 'c1', date: formatDate(0), profit: 500, emotionAfter: { fear: 1, greed: 1, confidence: 5, stress: 1 } },
        { ...sampleEntries[0], id: 'c2', date: formatDate(1), profit: 400, emotionAfter: { fear: 1, greed: 1, confidence: 5, stress: 2 } },
        { ...sampleEntries[0], id: 'c3', date: formatDate(2), profit: 300, emotionAfter: { fear: 1, greed: 1, confidence: 5, stress: 3 } },
        { ...sampleEntries[0], id: 'c4', date: formatDate(3), profit: 200, emotionAfter: { fear: 1, greed: 1, confidence: 5, stress: 4 } },
        { ...sampleEntries[0], id: 'c5', date: formatDate(4), profit: 100, emotionAfter: { fear: 1, greed: 1, confidence: 5, stress: 5 } }
      ];

      const correlations = analyzer.analyzeEmotionTradeCorrelation(entries);
      const stressCorr = correlations.find(c => c.emotionType === 'stress');
      expect(stressCorr?.correlationCoefficient).toBeLessThan(0);
    });
  });

  describe('Configuration', () => {
    it('should use custom lookback period', () => {
      const customAnalyzer = createSentimentAnalyzer({ lookbackPeriod: 7, minDataPoints: 3 });
      const result = customAnalyzer.calculateFearGreedIndex(sampleEntries);
      expect(result).not.toBeNull();
    });

    it('should use custom min data points', () => {
      const customAnalyzer = createSentimentAnalyzer({ minDataPoints: 10 });
      const result = customAnalyzer.calculateFearGreedIndex(sampleEntries.slice(0, 3));
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle entries without emotion data', () => {
      const entriesWithoutEmotion = sampleEntries.map(entry => ({
        ...entry,
        emotionBefore: undefined,
        emotionAfter: undefined
      }));

      expect(() => {
        analyzer.generateSentimentReport(entriesWithoutEmotion);
      }).not.toThrow();
    });

    it('should handle entries without profit data', () => {
      const entriesWithoutProfit = sampleEntries.map(entry => ({
        ...entry,
        profit: undefined,
        profitPercent: undefined
      }));

      expect(() => {
        analyzer.analyzeEmotionTradeCorrelation(entriesWithoutProfit);
      }).not.toThrow();
    });

    it('should handle entries with undefined status', () => {
      const entriesWithoutStatus = sampleEntries.map(entry => ({
        ...entry,
        status: undefined
      }));

      expect(() => {
        analyzer.analyzeEmotionTradeCorrelation(entriesWithoutStatus);
      }).not.toThrow();
    });
  });

  describe('Factory Function', () => {
    it('should create instance with default config', () => {
      const instance = createSentimentAnalyzer();
      expect(instance).toBeInstanceOf(SentimentAnalyzer);
    });

    it('should create instance with custom config', () => {
      const instance = createSentimentAnalyzer({
        lookbackPeriod: 7,
        minDataPoints: 5,
        fearThreshold: 2,
        greedThreshold: 4
      });
      expect(instance).toBeInstanceOf(SentimentAnalyzer);
    });
  });
});
