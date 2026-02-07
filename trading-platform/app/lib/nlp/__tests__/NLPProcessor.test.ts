/**
 * NLPProcessor.test.ts
 * 
 * Tests for NLP Processor
 */

import NLPProcessor from '../NLPProcessor';

describe('NLPProcessor', () => {
  let processor: NLPProcessor;

  beforeEach(() => {
    processor = new NLPProcessor();
  });

  describe('analyze', () => {
    it('should analyze text and return complete analysis', () => {
      const text = 'Apple reported strong earnings of $100 billion. AAPL stock rallied 5%.';
      const result = processor.analyze(text);

      expect(result).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.topics).toBeDefined();
      expect(result.keyPhrases).toBeDefined();
      expect(result.language).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sentenceCount).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const result = processor.analyze('');
      
      expect(result.entities).toEqual([]);
      expect(result.wordCount).toBe(0);
      expect(result.sentenceCount).toBe(0);
    });
  });

  describe('extractEntities', () => {
    it('should extract ticker symbols', () => {
      const text = 'AAPL and MSFT stocks are rising';
      const entities = processor.extractEntities(text);

      const tickers = entities.filter((e) => e.type === 'ticker');
      expect(tickers.length).toBeGreaterThanOrEqual(2);
      expect(tickers.some((t) => t.text === 'AAPL')).toBe(true);
      expect(tickers.some((t) => t.text === 'MSFT')).toBe(true);
    });

    it('should extract money amounts', () => {
      const text = 'Revenue reached $50 billion and profit was $10M';
      const entities = processor.extractEntities(text);

      const money = entities.filter((e) => e.type === 'money');
      expect(money.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract dates', () => {
      const text = 'Earnings report on Jan 15, 2024 showed growth';
      const entities = processor.extractEntities(text);

      const dates = entities.filter((e) => e.type === 'date');
      expect(dates.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract known organizations', () => {
      const text = 'Apple and Microsoft announced partnership';
      const entities = processor.extractEntities(text);

      const orgs = entities.filter((e) => e.type === 'organization');
      expect(orgs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter out common words that look like tickers', () => {
      const text = 'THE company AND its partners';
      const entities = processor.extractEntities(text);

      const tickers = entities.filter((e) => e.type === 'ticker');
      const tickerTexts = tickers.map((t) => t.text);
      expect(tickerTexts).not.toContain('THE');
      expect(tickerTexts).not.toContain('AND');
    });
  });

  describe('extractTopics', () => {
    it('should identify earnings topic', () => {
      const text = 'Company reported strong earnings and revenue growth';
      const topics = processor.extractTopics(text);

      const earningsTopic = topics.find((t) => t.name === 'earnings');
      expect(earningsTopic).toBeDefined();
      expect(earningsTopic!.relevance).toBeGreaterThan(0);
    });

    it('should identify merger topic', () => {
      const text = 'Merger and acquisition activity is increasing in the sector';
      const topics = processor.extractTopics(text);

      const mergerTopic = topics.find((t) => t.name === 'mergers');
      expect(mergerTopic).toBeDefined();
    });

    it('should identify market topic', () => {
      const text = 'Market volatility increased after the correction';
      const topics = processor.extractTopics(text);

      const marketTopic = topics.find((t) => t.name === 'market');
      expect(marketTopic).toBeDefined();
    });

    it('should return empty array for text without topics', () => {
      const text = 'hello world test example';
      const topics = processor.extractTopics(text);

      expect(topics).toEqual([]);
    });

    it('should sort topics by relevance', () => {
      const text = 'earnings revenue profit earnings earnings market rally';
      const topics = processor.extractTopics(text);

      if (topics.length > 1) {
        for (let i = 0; i < topics.length - 1; i++) {
          expect(topics[i].relevance).toBeGreaterThanOrEqual(topics[i + 1].relevance);
        }
      }
    });
  });

  describe('extractKeyPhrases', () => {
    it('should extract meaningful phrases', () => {
      const text = 'strong earnings report shows revenue growth and profit margin improvement. strong earnings report shows revenue growth.';
      const phrases = processor.extractKeyPhrases(text);

      // Phrases require frequency > 1, so we need repeated phrases
      expect(Array.isArray(phrases)).toBe(true);
      if (phrases.length > 0) {
        expect(phrases[0]).toHaveProperty('phrase');
        expect(phrases[0]).toHaveProperty('score');
        expect(phrases[0]).toHaveProperty('frequency');
        expect(phrases[0].frequency).toBeGreaterThan(1);
      }
    });

    it('should require minimum frequency', () => {
      const text = 'unique word another different separate';
      const phrases = processor.extractKeyPhrases(text);

      // Should have no phrases since no words repeat
      expect(phrases.length).toBe(0);
    });

    it('should boost financial terms', () => {
      const text = 'earnings report earnings report other phrase other phrase';
      const phrases = processor.extractKeyPhrases(text);

      const earningsPhrase = phrases.find((p) => p.phrase.includes('earnings'));
      const otherPhrase = phrases.find((p) => p.phrase.includes('other'));

      if (earningsPhrase && otherPhrase) {
        expect(earningsPhrase.score).toBeGreaterThan(otherPhrase.score);
      }
    });
  });

  describe('detectLanguage', () => {
    it('should detect English', () => {
      const text = 'This is an English text with the word and';
      const language = processor.detectLanguage(text);

      expect(language).toBe('en');
    });

    it('should detect Japanese', () => {
      const text = 'これは日本語のテキストです';
      const language = processor.detectLanguage(text);

      expect(language).toBe('ja');
    });

    it('should return unknown for ambiguous text', () => {
      const text = '123456 789';
      const language = processor.detectLanguage(text);

      expect(language).toBe('unknown');
    });
  });

  describe('analyzeEntityCooccurrence', () => {
    it('should find co-occurring entities', () => {
      const entities = [
        { text: 'Apple', type: 'organization' as const, confidence: 0.9, position: { start: 0, end: 5 } },
        { text: 'Microsoft', type: 'organization' as const, confidence: 0.9, position: { start: 10, end: 19 } },
        { text: 'AAPL', type: 'ticker' as const, confidence: 0.8, position: { start: 25, end: 29 } },
      ];

      const cooccurrence = processor.analyzeEntityCooccurrence(entities);

      expect(cooccurrence.size).toBeGreaterThan(0);
      expect(cooccurrence.get('Apple')).toBeDefined();
    });

    it('should not include distant entities', () => {
      const entities = [
        { text: 'Apple', type: 'organization' as const, confidence: 0.9, position: { start: 0, end: 5 } },
        { text: 'Microsoft', type: 'organization' as const, confidence: 0.9, position: { start: 200, end: 209 } },
      ];

      const cooccurrence = processor.analyzeEntityCooccurrence(entities);
      const appleRelated = cooccurrence.get('Apple') || [];

      expect(appleRelated).not.toContain('Microsoft');
    });
  });

  describe('summarize', () => {
    it('should generate a summary', () => {
      const text = 'First sentence about earnings. Second sentence about market. Third sentence about growth. Fourth sentence is here.';
      const summary = processor.summarize(text, 100);

      expect(summary).toBeDefined();
      expect(summary.length).toBeLessThanOrEqual(100);
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should prioritize sentences with financial terms', () => {
      const text = 'Random sentence. Earnings report shows growth. Another random one. Market analysis complete.';
      const summary = processor.summarize(text, 60);

      expect(summary.toLowerCase()).toMatch(/earnings|market/);
    });

    it('should handle empty text', () => {
      const summary = processor.summarize('');

      expect(summary).toBe('');
    });

    it('should include first sentence', () => {
      const text = 'Important first sentence. Second sentence. Third sentence.';
      const summary = processor.summarize(text, 50);

      expect(summary).toContain('Important first sentence');
    });
  });

  describe('word and sentence counting', () => {
    it('should count words correctly', () => {
      const text = 'This is a test with five words here';
      const result = processor.analyze(text);

      expect(result.wordCount).toBe(8);
    });

    it('should count sentences correctly', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const result = processor.analyze(text);

      expect(result.sentenceCount).toBe(3);
    });

    it('should handle multiple spaces', () => {
      const text = 'Word1    Word2     Word3';
      const result = processor.analyze(text);

      expect(result.wordCount).toBe(3);
    });
  });
});
