/**
 * NewsCollector.ts
 * 
 * ニュース収集エンジン - 複数のソースから金融ニュースを収集・統合
 * News Collection Engine - Aggregates financial news from multiple sources
 */

import { EventEmitter } from 'events';
import type { NewsArticle } from '../sentiment/SentimentAnalysisEngine';

// ============================================================================
// Types
// ============================================================================

export interface NewsSource {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'scraper';
  url: string;
  apiKey?: string;
  enabled: boolean;
  priority: number; // 1-10, higher is more important
  updateInterval: number; // milliseconds
}

export interface NewsCollectorConfig {
  sources: NewsSource[];
  maxArticlesPerSource: number;
  deduplicationWindow: number; // milliseconds
  cacheExpiry: number; // milliseconds
  keywords: string[];
  symbols: string[];
}

export interface NewsMetadata {
  entities: string[];
  topics: string[];
  relevanceScore: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'alphavantage-news',
    name: 'Alpha Vantage News',
    type: 'api',
    url: 'https://www.alphavantage.co/query?function=NEWS_SENTIMENT',
    enabled: true,
    priority: 8,
    updateInterval: 300000, // 5 minutes
  },
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    type: 'api',
    url: 'https://query1.finance.yahoo.com/v1/finance/search',
    enabled: true,
    priority: 7,
    updateInterval: 600000, // 10 minutes
  },
  {
    id: 'reuters',
    name: 'Reuters Business',
    type: 'rss',
    url: 'https://www.reuters.com/business',
    enabled: true,
    priority: 9,
    updateInterval: 900000, // 15 minutes
  },
];

export const DEFAULT_COLLECTOR_CONFIG: NewsCollectorConfig = {
  sources: DEFAULT_NEWS_SOURCES,
  maxArticlesPerSource: 50,
  deduplicationWindow: 86400000, // 24 hours
  cacheExpiry: 3600000, // 1 hour
  keywords: ['earnings', 'merger', 'acquisition', 'IPO', 'bankruptcy', 'lawsuit'],
  symbols: ['^N225', '^GSPC', '^IXIC'], // Nikkei 225, S&P 500, NASDAQ
};

// ============================================================================
// News Collector
// ============================================================================

export class NewsCollector extends EventEmitter {
  private config: NewsCollectorConfig;
  private articles: Map<string, NewsArticle> = new Map();
  private seenUrls: Set<string> = new Set();
  private updateTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isRunning = false;

  constructor(config: Partial<NewsCollectorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_COLLECTOR_CONFIG, ...config };
  }

  /**
   * コレクターを開始
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[NewsCollector] Already running');
      return;
    }

    console.log('[NewsCollector] Starting news collection...');
    this.isRunning = true;

    // Start collection for each enabled source
    this.config.sources.forEach((source) => {
      if (source.enabled) {
        this.startSourceCollection(source);
      }
    });

    this.emit('started');
  }

  /**
   * コレクターを停止
   */
  stop(): void {
    console.log('[NewsCollector] Stopping news collection...');
    this.isRunning = false;

    // Clear all timers
    this.updateTimers.forEach((timer) => clearInterval(timer));
    this.updateTimers.clear();

    this.emit('stopped');
  }

  /**
   * ソース別のニュース収集を開始
   */
  private startSourceCollection(source: NewsSource): void {
    // Initial fetch
    this.fetchFromSource(source).catch((error) => {
      console.error(`[NewsCollector] Error fetching from ${source.name}:`, error);
      this.emit('error', { source: source.id, error });
    });

    // Set up periodic updates
    const timer = setInterval(() => {
      this.fetchFromSource(source).catch((error) => {
        console.error(`[NewsCollector] Error fetching from ${source.name}:`, error);
        this.emit('error', { source: source.id, error });
      });
    }, source.updateInterval);

    this.updateTimers.set(source.id, timer);
  }

  /**
   * ソースからニュースを取得
   */
  private async fetchFromSource(source: NewsSource): Promise<void> {
    console.log(`[NewsCollector] Fetching from ${source.name}...`);

    let articles: NewsArticle[] = [];

    try {
      switch (source.type) {
        case 'api':
          articles = await this.fetchFromAPI(source);
          break;
        case 'rss':
          articles = await this.fetchFromRSS(source);
          break;
        case 'scraper':
          articles = await this.fetchFromScraper(source);
          break;
      }

      // Process and deduplicate articles
      const newArticles = this.processArticles(articles, source);
      
      if (newArticles.length > 0) {
        console.log(`[NewsCollector] Found ${newArticles.length} new articles from ${source.name}`);
        this.emit('articles', { source: source.id, articles: newArticles });
      }
    } catch (error) {
      console.error(`[NewsCollector] Failed to fetch from ${source.name}:`, error);
      throw error;
    }
  }

  /**
   * API経由でニュースを取得
   */
  private async fetchFromAPI(source: NewsSource): Promise<NewsArticle[]> {
    // Simulate API call - in production, implement actual API integration
    // For Alpha Vantage News API
    if (source.id === 'alphavantage-news') {
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      if (!apiKey) {
        console.warn('[NewsCollector] Alpha Vantage API key not configured');
        return [];
      }

      const symbols = this.config.symbols.join(',');
      const url = `${source.url}&tickers=${symbols}&apikey=${apiKey}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.feed) {
          return this.parseAlphaVantageNews(data.feed);
        }
      } catch (error) {
        console.error('[NewsCollector] Alpha Vantage API error:', error);
      }
    }

    return [];
  }

  /**
   * Alpha Vantage ニュースをパース
   */
  private parseAlphaVantageNews(feed: Array<Record<string, unknown>>): NewsArticle[] {
    return feed.map((item, index) => ({
      id: `av-${item.time_published || Date.now()}-${index}`,
      title: String(item.title || ''),
      content: String(item.summary || ''),
      source: String(item.source || 'Alpha Vantage'),
      url: String(item.url || ''),
      publishedAt: this.parseTimestamp(item.time_published as string),
      symbol: this.extractSymbol(item),
      author: String(item.authors?.[0] || 'Unknown'),
    }));
  }

  /**
   * タイムスタンプをパース
   */
  private parseTimestamp(timestamp: string | undefined): number {
    if (!timestamp) return Date.now();
    
    // Alpha Vantage format: YYYYMMDDTHHMMSS
    const year = parseInt(timestamp.slice(0, 4), 10);
    const month = parseInt(timestamp.slice(4, 6), 10) - 1;
    const day = parseInt(timestamp.slice(6, 8), 10);
    const hour = parseInt(timestamp.slice(9, 11), 10);
    const minute = parseInt(timestamp.slice(11, 13), 10);
    const second = parseInt(timestamp.slice(13, 15), 10);

    return new Date(year, month, day, hour, minute, second).getTime();
  }

  /**
   * シンボルを抽出
   */
  private extractSymbol(item: Record<string, unknown>): string | undefined {
    const tickers = item.ticker_sentiment as Array<{ ticker: string }> | undefined;
    if (tickers && tickers.length > 0) {
      return tickers[0].ticker;
    }
    return undefined;
  }

  /**
   * RSS経由でニュースを取得
   */
  private async fetchFromRSS(source: NewsSource): Promise<NewsArticle[]> {
    // RSS parsing would require a library in production
    // For now, return empty array as placeholder
    console.log(`[NewsCollector] RSS fetching from ${source.name} (placeholder)`);
    return [];
  }

  /**
   * スクレイパー経由でニュースを取得
   */
  private async fetchFromScraper(source: NewsSource): Promise<NewsArticle[]> {
    // Web scraping would be implemented here in production
    console.log(`[NewsCollector] Scraping from ${source.name} (placeholder)`);
    return [];
  }

  /**
   * 記事を処理・重複排除
   */
  private processArticles(articles: NewsArticle[], source: NewsSource): NewsArticle[] {
    const newArticles: NewsArticle[] = [];
    const cutoff = Date.now() - this.config.deduplicationWindow;

    articles.forEach((article) => {
      // Skip if already seen
      if (this.seenUrls.has(article.url)) {
        return;
      }

      // Skip if too old
      if (article.publishedAt < cutoff) {
        return;
      }

      // Mark as seen
      this.seenUrls.add(article.url);

      // Store article
      this.articles.set(article.id, article);
      newArticles.push(article);
    });

    // Clean up old articles
    this.cleanupOldArticles();

    return newArticles;
  }

  /**
   * 古い記事をクリーンアップ
   */
  private cleanupOldArticles(): void {
    const cutoff = Date.now() - this.config.cacheExpiry;
    const toDelete: string[] = [];

    this.articles.forEach((article, id) => {
      if (article.publishedAt < cutoff) {
        toDelete.push(id);
        this.seenUrls.delete(article.url);
      }
    });

    toDelete.forEach((id) => this.articles.delete(id));

    if (toDelete.length > 0) {
      console.log(`[NewsCollector] Cleaned up ${toDelete.length} old articles`);
    }
  }

  /**
   * キーワードでフィルタリング
   */
  filterByKeywords(keywords: string[]): NewsArticle[] {
    const results: NewsArticle[] = [];
    
    this.articles.forEach((article) => {
      const text = (article.title + ' ' + article.content).toLowerCase();
      const hasKeyword = keywords.some((keyword) => 
        text.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        results.push(article);
      }
    });

    return results;
  }

  /**
   * シンボルでフィルタリング
   */
  filterBySymbol(symbol: string): NewsArticle[] {
    const results: NewsArticle[] = [];
    
    this.articles.forEach((article) => {
      if (article.symbol === symbol) {
        results.push(article);
      }
    });

    return results;
  }

  /**
   * すべての記事を取得
   */
  getAllArticles(): NewsArticle[] {
    return Array.from(this.articles.values())
      .sort((a, b) => b.publishedAt - a.publishedAt);
  }

  /**
   * 記事数を取得
   */
  getArticleCount(): number {
    return this.articles.size;
  }

  /**
   * データをクリア
   */
  clearData(): void {
    this.articles.clear();
    this.seenUrls.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<NewsCollectorConfig>) => new NewsCollector(config)
);

export const getGlobalNewsCollector = getInstance;
export const resetGlobalNewsCollector = resetInstance;

export default NewsCollector;
