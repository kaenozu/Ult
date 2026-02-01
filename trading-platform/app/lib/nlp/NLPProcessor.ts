/**
 * NLPProcessor.ts
 * 
 * 自然言語処理プロセッサー - テキストからエンティティとトピックを抽出
 * NLP Processor - Extracts entities and topics from text
 */

// ============================================================================
// Types
// ============================================================================

export interface Entity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'ticker' | 'product' | 'event' | 'money' | 'date';
  confidence: number;
  position: { start: number; end: number };
}

export interface Topic {
  name: string;
  relevance: number; // 0 to 1
  keywords: string[];
}

export interface KeyPhrase {
  phrase: string;
  score: number;
  frequency: number;
}

export interface NLPAnalysisResult {
  entities: Entity[];
  topics: Topic[];
  keyPhrases: KeyPhrase[];
  language: string;
  wordCount: number;
  sentenceCount: number;
}

// ============================================================================
// Entity Recognition Patterns
// ============================================================================

const TICKER_PATTERN = /\b([A-Z]{1,5})\b/g;
const MONEY_PATTERN = /\$[\d,]+(?:\.\d{2})?[KMB]?|\d+(?:\.\d+)?(?:billion|million|thousand|trillion)/gi;
const DATE_PATTERN = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
const PERCENTAGE_PATTERN = /\d+(?:\.\d+)?%/g;

// Known organizations
const KNOWN_ORGS = new Set([
  'Apple', 'Microsoft', 'Google', 'Amazon', 'Tesla', 'Meta', 'Netflix', 'NVIDIA',
  'Fed', 'Federal Reserve', 'SEC', 'NASDAQ', 'NYSE', 'S&P', 'Dow Jones',
  'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Bank of America', 'Citigroup',
  'BlackRock', 'Vanguard', 'Fidelity',
]);

// Financial topics
const FINANCIAL_TOPICS = new Map<string, string[]>([
  ['earnings', ['earnings', 'revenue', 'profit', 'loss', 'EPS', 'guidance']],
  ['mergers', ['merger', 'acquisition', 'takeover', 'buyout', 'M&A']],
  ['regulation', ['SEC', 'regulation', 'compliance', 'investigation', 'lawsuit']],
  ['market', ['market', 'index', 'rally', 'sell-off', 'volatility', 'correction']],
  ['monetary', ['Fed', 'interest rate', 'inflation', 'policy', 'QE', 'taper']],
  ['tech', ['technology', 'software', 'AI', 'cloud', 'chip', 'semiconductor']],
  ['energy', ['oil', 'gas', 'renewable', 'electric', 'energy']],
  ['crypto', ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'DeFi']],
]);

// ============================================================================
// NLP Processor
// ============================================================================

export class NLPProcessor {
  /**
   * テキストを分析
   */
  analyze(text: string): NLPAnalysisResult {
    const entities = this.extractEntities(text);
    const topics = this.extractTopics(text);
    const keyPhrases = this.extractKeyPhrases(text);
    const language = this.detectLanguage(text);
    const wordCount = this.countWords(text);
    const sentenceCount = this.countSentences(text);

    return {
      entities,
      topics,
      keyPhrases,
      language,
      wordCount,
      sentenceCount,
    };
  }

  /**
   * エンティティを抽出
   */
  extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract tickers
    let match;
    while ((match = TICKER_PATTERN.exec(text)) !== null) {
      const ticker = match[1];
      // Filter out common words that look like tickers
      if (ticker.length >= 2 && !this.isCommonWord(ticker)) {
        entities.push({
          text: ticker,
          type: 'ticker',
          confidence: 0.8,
          position: { start: match.index, end: match.index + ticker.length },
        });
      }
    }

    // Extract money amounts
    MONEY_PATTERN.lastIndex = 0;
    while ((match = MONEY_PATTERN.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'money',
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract dates
    DATE_PATTERN.lastIndex = 0;
    while ((match = DATE_PATTERN.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'date',
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Extract known organizations
    KNOWN_ORGS.forEach((org) => {
      const regex = new RegExp(`\\b${org}\\b`, 'gi');
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'organization',
          confidence: 0.95,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    });

    // Sort by position
    entities.sort((a, b) => a.position.start - b.position.start);

    return entities;
  }

  /**
   * トピックを抽出
   */
  extractTopics(text: string): Topic[] {
    const topics: Topic[] = [];
    const lowerText = text.toLowerCase();

    FINANCIAL_TOPICS.forEach((keywords, topicName) => {
      let matchCount = 0;
      const matchedKeywords: string[] = [];

      keywords.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          matchCount += matches.length;
          matchedKeywords.push(keyword);
        }
      });

      if (matchCount > 0) {
        const relevance = Math.min(matchCount / 10, 1); // Normalize to 0-1
        topics.push({
          name: topicName,
          relevance,
          keywords: matchedKeywords,
        });
      }
    });

    // Sort by relevance
    topics.sort((a, b) => b.relevance - a.relevance);

    return topics;
  }

  /**
   * キーフレーズを抽出
   */
  extractKeyPhrases(text: string): KeyPhrase[] {
    const phrases: Map<string, { score: number; frequency: number }> = new Map();

    // Extract n-grams (bigrams and trigrams)
    const words = this.tokenize(text);
    
    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (this.isSignificantPhrase(phrase)) {
        const current = phrases.get(phrase) || { score: 0, frequency: 0 };
        current.frequency++;
        current.score = this.calculatePhraseScore(phrase);
        phrases.set(phrase, current);
      }
    }

    // Trigrams
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (this.isSignificantPhrase(phrase)) {
        const current = phrases.get(phrase) || { score: 0, frequency: 0 };
        current.frequency++;
        current.score = this.calculatePhraseScore(phrase);
        phrases.set(phrase, current);
      }
    }

    // Convert to array and sort
    const result: KeyPhrase[] = Array.from(phrases.entries())
      .filter(([_, data]) => data.frequency > 1)
      .map(([phrase, data]) => ({
        phrase,
        score: data.score * data.frequency,
        frequency: data.frequency,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return result;
  }

  /**
   * 言語を検出
   */
  detectLanguage(text: string): string {
    // Simple heuristic: check for Japanese characters
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (japanesePattern.test(text)) {
      return 'ja';
    }

    // Check for common English words
    const englishWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at'];
    const lowerText = text.toLowerCase();
    const englishMatches = englishWords.filter((word) => 
      new RegExp(`\\b${word}\\b`).test(lowerText)
    ).length;

    if (englishMatches >= 2) {
      return 'en';
    }

    return 'unknown';
  }

  /**
   * 単語をトークン化
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.isStopWord(word));
  }

  /**
   * ストップワードかチェック
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can', 'shall',
      'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'as', 'by', 'from', 'with', 'about', 'into', 'through',
      'that', 'this', 'these', 'those', 'it', 'its', 'they', 'their',
    ]);
    return stopWords.has(word);
  }

  /**
   * 一般的な単語かチェック
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL',
      'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET',
      'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD',
      'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET',
    ]);
    return commonWords.has(word);
  }

  /**
   * 重要なフレーズかチェック
   */
  private isSignificantPhrase(phrase: string): boolean {
    // Filter out phrases with only stop words
    const words = phrase.split(' ');
    const nonStopWords = words.filter((w) => !this.isStopWord(w));
    return nonStopWords.length >= words.length / 2;
  }

  /**
   * フレーズスコアを計算
   */
  private calculatePhraseScore(phrase: string): number {
    let score = 1;

    // Boost score for financial terms
    const financialTerms = [
      'earnings', 'profit', 'revenue', 'stock', 'market', 'price',
      'shares', 'trading', 'investor', 'analyst', 'forecast', 'guidance',
    ];

    financialTerms.forEach((term) => {
      if (phrase.toLowerCase().includes(term)) {
        score *= 1.5;
      }
    });

    return score;
  }

  /**
   * 単語数をカウント
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * 文の数をカウント
   */
  private countSentences(text: string): number {
    return text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0).length;
  }

  /**
   * 名前付きエンティティの共起を分析
   */
  analyzeEntityCooccurrence(entities: Entity[]): Map<string, string[]> {
    const cooccurrence = new Map<string, string[]>();

    // Find entities that appear close to each other
    for (let i = 0; i < entities.length; i++) {
      const entity1 = entities[i];
      const related: string[] = [];

      for (let j = i + 1; j < entities.length; j++) {
        const entity2 = entities[j];
        const distance = entity2.position.start - entity1.position.end;

        // Consider entities within 100 characters as co-occurring
        if (distance < 100) {
          related.push(entity2.text);
        } else {
          break; // Entities are sorted by position
        }
      }

      if (related.length > 0) {
        cooccurrence.set(entity1.text, related);
      }
    }

    return cooccurrence;
  }

  /**
   * テキストの要約を生成
   */
  summarize(text: string, maxLength: number = 150): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return '';
    }

    // Score sentences based on keywords and position
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;

      // Boost first and last sentences
      if (index === 0) score += 2;
      if (index === sentences.length - 1) score += 1;

      // Boost sentences with financial terms
      const lowerSentence = sentence.toLowerCase();
      const financialTerms = ['earnings', 'profit', 'market', 'stock', 'price'];
      financialTerms.forEach((term) => {
        if (lowerSentence.includes(term)) {
          score += 1;
        }
      });

      return { sentence: sentence.trim(), score };
    });

    // Sort by score and take top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    for (const { sentence } of scoredSentences) {
      if (summary.length + sentence.length <= maxLength) {
        summary += sentence + '. ';
      } else {
        break;
      }
    }

    return summary.trim();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(() => new NLPProcessor());

export const getGlobalNLPProcessor = getInstance;
export const resetGlobalNLPProcessor = resetInstance;

export default NLPProcessor;
