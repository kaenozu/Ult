/**
 * Tests for Pattern Recognition Engine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PatternRecognitionEngine, TradePattern, PatternReport } from '../patternRecognition';
import { JournalEntry } from '@/app/types';

describe('PatternRecognitionEngine', () => {
  let engine: PatternRecognitionEngine;

  beforeEach(() => {
    engine = new PatternRecognitionEngine();
  });

  describe('addJournalEntries', () => {
    it('should add journal entries', () => {
      const entries: JournalEntry[] = [
        {
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
        },
      ];

      engine.addJournalEntries(entries);
      const report = engine.generateReport();

      expect(report.totalAnalyzedTrades).toBe(1);
    });
  });

  describe('learnFromJournal', () => {
    it('should learn patterns from journal entries', () => {
      const entries: JournalEntry[] = [
        {
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
        },
        {
          id: '2',
          symbol: 'AAPL',
          date: '2024-01-02T10:00:00Z',
          signalType: 'BUY',
          entryPrice: 155,
          exitPrice: 165,
          quantity: 10,
          profit: 100,
          profitPercent: 6.45,
          notes: 'Test trade',
          status: 'CLOSED',
        },
        {
          id: '3',
          symbol: 'AAPL',
          date: '2024-01-03T10:00:00Z',
          signalType: 'BUY',
          entryPrice: 160,
          exitPrice: 170,
          quantity: 10,
          profit: 100,
          profitPercent: 6.25,
          notes: 'Test trade',
          status: 'CLOSED',
        },
      ];

      engine.addJournalEntries(entries);
      engine.learnFromJournal();
      const patterns = engine.getAllPatterns();

      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should not create patterns with insufficient data', () => {
      const entries: JournalEntry[] = [
        {
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
        },
      ];

      engine.addJournalEntries(entries);
      engine.learnFromJournal();
      const patterns = engine.getAllPatterns();

      expect(patterns.length).toBe(0);
    });
  });

  describe('matchPattern', () => {
    it('should match patterns against market data', () => {
      const entries: JournalEntry[] = [
        {
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
        },
        {
          id: '2',
          symbol: 'AAPL',
          date: '2024-01-02T10:00:00Z',
          signalType: 'BUY',
          entryPrice: 155,
          exitPrice: 165,
          quantity: 10,
          profit: 100,
          profitPercent: 6.45,
          notes: 'Test trade',
          status: 'CLOSED',
        },
        {
          id: '3',
          symbol: 'AAPL',
          date: '2024-01-03T10:00:00Z',
          signalType: 'BUY',
          entryPrice: 160,
          exitPrice: 170,
          quantity: 10,
          profit: 100,
          profitPercent: 6.25,
          notes: 'Test trade',
          status: 'CLOSED',
        },
      ];

      engine.addJournalEntries(entries);
      engine.learnFromJournal();

      const marketData = {
        symbol: 'AAPL',
        price: 165,
        indicators: {},
        timestamp: new Date('2024-01-04T10:00:00Z'),
      };

      const matchedPattern = engine.matchPattern(marketData);
      expect(matchedPattern).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate a pattern report', () => {
      const entries: JournalEntry[] = [
        {
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
        },
      ];

      engine.addJournalEntries(entries);
      const report = engine.generateReport();

      expect(report).toBeDefined();
      expect(report.totalPatterns).toBeDefined();
      expect(report.topPatterns).toBeDefined();
      expect(report.avgWinRate).toBeDefined();
      expect(report.totalAnalyzedTrades).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('clear', () => {
    it('should clear all journal entries and patterns', () => {
      const entries: JournalEntry[] = [
        {
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
        },
      ];

      engine.addJournalEntries(entries);
      engine.learnFromJournal();
      engine.clear();

      const report = engine.generateReport();
      expect(report.totalPatterns).toBe(0);
      expect(report.totalAnalyzedTrades).toBe(0);
    });
  });
});
