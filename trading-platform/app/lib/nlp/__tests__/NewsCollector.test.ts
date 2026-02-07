/**
 * NewsCollector.test.ts
 * 
 * Tests for News Collector
 */

import NewsCollector from '../NewsCollector';
import type { NewsArticle } from '../../sentiment/SentimentAnalysisEngine';

describe('NewsCollector', () => {
  let collector: NewsCollector;

  beforeEach(() => {
    collector = new NewsCollector({
      sources: [],
      maxArticlesPerSource: 10,
      deduplicationWindow: 1000,
      cacheExpiry: 2000,
      keywords: ['test'],
      symbols: ['TEST'],
    });
  });

  afterEach(() => {
    collector.stop();
    collector.clearData();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultCollector = new NewsCollector();
      expect(defaultCollector).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customCollector = new NewsCollector({
        maxArticlesPerSource: 100,
        keywords: ['earnings', 'merger'],
      });
      expect(customCollector).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start without errors', () => {
      expect(() => collector.start()).not.toThrow();
    });

    it('should stop without errors', () => {
      collector.start();
      expect(() => collector.stop()).not.toThrow();
    });

    it('should emit started event', (done) => {
      collector.on('started', () => {
        done();
      });
      collector.start();
    });

    it('should emit stopped event', (done) => {
      collector.on('stopped', () => {
        done();
      });
      collector.start();
      collector.stop();
    });

    it('should not start twice', () => {
      collector.start();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      collector.start();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[NewsCollector] Already running'), expect.any(String));
      consoleWarnSpy.mockRestore();
    });
  });

  describe('article management', () => {
    const createMockArticle = (id: string, symbol?: string): NewsArticle => ({
      id,
      title: `Test Article ${id}`,
      content: 'Test content with earnings and revenue',
      source: 'Test Source',
      url: `https://test.com/${id}`,
      publishedAt: Date.now(),
      symbol,
      author: 'Test Author',
    });

    it('should store articles', () => {
      const article = createMockArticle('1', 'AAPL');
      // Manually add to test storage (bypassing event system)
      collector['articles'].set(article.id, article);
      
      expect(collector.getArticleCount()).toBe(1);
    });

    it('should filter articles by symbol', () => {
      const article1 = createMockArticle('1', 'AAPL');
      const article2 = createMockArticle('2', 'MSFT');
      const article3 = createMockArticle('3', 'AAPL');

      collector['articles'].set(article1.id, article1);
      collector['articles'].set(article2.id, article2);
      collector['articles'].set(article3.id, article3);

      const aaplArticles = collector.filterBySymbol('AAPL');
      expect(aaplArticles.length).toBe(2);
      expect(aaplArticles.every((a) => a.symbol === 'AAPL')).toBe(true);
    });

    it('should filter articles by keywords', () => {
      const article1 = createMockArticle('1');
      article1.content = 'This article mentions earnings';
      
      const article2 = createMockArticle('2');
      article2.content = 'This article is about something else';

      collector['articles'].set(article1.id, article1);
      collector['articles'].set(article2.id, article2);

      const filtered = collector.filterByKeywords(['earnings']);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should return all articles sorted by date', () => {
      const article1 = createMockArticle('1');
      article1.publishedAt = Date.now() - 2000;
      
      const article2 = createMockArticle('2');
      article2.publishedAt = Date.now() - 1000;
      
      const article3 = createMockArticle('3');
      article3.publishedAt = Date.now();

      collector['articles'].set(article1.id, article1);
      collector['articles'].set(article2.id, article2);
      collector['articles'].set(article3.id, article3);

      const allArticles = collector.getAllArticles();
      expect(allArticles.length).toBe(3);
      expect(allArticles[0].id).toBe('3'); // Most recent first
      expect(allArticles[2].id).toBe('1'); // Oldest last
    });

    it('should clear all data', () => {
      const article = createMockArticle('1');
      collector['articles'].set(article.id, article);
      collector['seenUrls'].add(article.url);

      collector.clearData();

      expect(collector.getArticleCount()).toBe(0);
      expect(collector['seenUrls'].size).toBe(0);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate articles by URL', () => {
      const article1 = {
        id: '1',
        title: 'Test',
        content: 'Content',
        source: 'Source',
        url: 'https://test.com/same',
        publishedAt: Date.now(),
      };

      const article2 = {
        id: '2',
        title: 'Test 2',
        content: 'Content 2',
        source: 'Source',
        url: 'https://test.com/same',
        publishedAt: Date.now(),
      };

      const source = {
        id: 'test',
        name: 'Test',
        type: 'api' as const,
        url: 'test',
        enabled: true,
        priority: 5,
        updateInterval: 1000,
      };

      const result1 = collector['processArticles']([article1], source);
      const result2 = collector['processArticles']([article2], source);

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(0); // Duplicate, should be filtered
    });
  });

  describe('cleanup', () => {
    it('should cleanup old articles', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      // cacheExpiry is 2000ms from config
      const oldArticle = {
        id: '1',
        title: 'Old',
        content: 'Content',
        source: 'Source',
        url: 'https://test.com/old',
        publishedAt: now - 5000, // 5 seconds old - will be expired
      };

      const newArticle = {
        id: '2',
        title: 'New',
        content: 'Content',
        source: 'Source',
        url: 'https://test.com/new',
        publishedAt: now - 1000, // 1 second old - still fresh
      };

      collector['articles'].set(oldArticle.id, oldArticle);
      collector['articles'].set(newArticle.id, newArticle);

      // Don't advance time, just call cleanup which uses Date.now()
      collector['cleanupOldArticles']();

      expect(collector['articles'].has('1')).toBe(false);
      expect(collector['articles'].has('2')).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('API integration', () => {
    it('should handle Alpha Vantage response format', () => {
      const mockFeed = [
        {
          title: 'Test News',
          summary: 'Test summary',
          source: 'Reuters',
          url: 'https://test.com',
          time_published: '20240101T120000',
          ticker_sentiment: [{ ticker: 'AAPL' }],
          authors: ['John Doe'],
        },
      ];

      const articles = collector['parseAlphaVantageNews'](mockFeed);

      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe('Test News');
      expect(articles[0].symbol).toBe('AAPL');
      expect(articles[0].author).toBe('John Doe');
    });

    it('should parse timestamp correctly', () => {
      const timestamp = '20240115T143000';
      const parsed = collector['parseTimestamp'](timestamp);

      expect(parsed).toBeGreaterThan(0);
      
      const date = new Date(parsed);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it('should handle missing timestamp', () => {
      const now = Date.now();
      const parsed = collector['parseTimestamp'](undefined);

      expect(parsed).toBeGreaterThanOrEqual(now);
    });

    it('should extract symbol from ticker_sentiment', () => {
      const item = {
        ticker_sentiment: [
          { ticker: 'AAPL' },
          { ticker: 'MSFT' },
        ],
      };

      const symbol = collector['extractSymbol'](item);
      expect(symbol).toBe('AAPL'); // Should take first ticker
    });

    it('should return undefined when no tickers', () => {
      const item = {};
      const symbol = collector['extractSymbol'](item);
      expect(symbol).toBeUndefined();
    });
  });
});
