/**
 * SentimentIntegrationService.ts
 * 
 * センチメント統合サービス - NewsCollector、SocialMediaCollector、NLPProcessorを統合
 * Sentiment Integration Service - Integrates all NLP and sentiment analysis components
 */

import { EventEmitter } from 'events';
import { NewsCollector, type NewsCollectorConfig } from './NewsCollector';
import { SocialMediaCollector, type SocialMediaCollectorConfig } from './SocialMediaCollector';
import { NLPProcessor } from './NLPProcessor';
import { 
  SentimentAnalysisEngine, 
  type SentimentConfig,
  type NewsArticle,
  type SocialMediaPost,
  type AggregatedSentiment,
  type SentimentAlert,
} from '../sentiment/SentimentAnalysisEngine';

// ============================================================================
// Types
// ============================================================================

import { logger } from '@/app/core/logger';
export interface IntegrationConfig {
  news?: Partial<NewsCollectorConfig>;
  social?: Partial<SocialMediaCollectorConfig>;
  sentiment?: Partial<SentimentConfig>;
  enableNewsCollection: boolean;
  enableSocialCollection: boolean;
  enableNLPProcessing: boolean;
}

export interface MarketIntelligence {
  symbol: string;
  sentiment: AggregatedSentiment;
  newsCount: number;
  socialCount: number;
  topNews: NewsArticle[];
  topSocial: SocialMediaPost[];
  entities: string[];
  topics: string[];
  alerts: SentimentAlert[];
  timestamp: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  enableNewsCollection: true,
  enableSocialCollection: false, // Requires API keys
  enableNLPProcessing: true,
};

// ============================================================================
// Sentiment Integration Service
// ============================================================================

export class SentimentIntegrationService extends EventEmitter {
  private config: IntegrationConfig;
  private newsCollector: NewsCollector;
  private socialCollector: SocialMediaCollector;
  private nlpProcessor: NLPProcessor;
  private sentimentEngine: SentimentAnalysisEngine;
  private isRunning = false;

  constructor(config: Partial<IntegrationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };

    // Initialize components
    this.newsCollector = new NewsCollector(this.config.news);
    this.socialCollector = new SocialMediaCollector(this.config.social);
    this.nlpProcessor = new NLPProcessor();
    this.sentimentEngine = new SentimentAnalysisEngine(this.config.sentiment);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // News collector events
    this.newsCollector.on('articles', ({ articles }) => {
      this.handleNewArticles(articles);
    });

    this.newsCollector.on('error', (error) => {
      logger.error('[SentimentIntegration] News collector error:', error);
      this.emit('error', { source: 'news', error });
    });

    // Social collector events
    this.socialCollector.on('posts', ({ posts }) => {
      this.handleNewPosts(posts);
    });

    this.socialCollector.on('error', (error) => {
      logger.error('[SentimentIntegration] Social collector error:', error);
      this.emit('error', { source: 'social', error });
    });

    // Sentiment engine events
    this.sentimentEngine.on('sentiment_update', (sentiment) => {
      this.emit('sentiment_update', sentiment);
    });

    this.sentimentEngine.on('alert', (alert) => {
      this.emit('alert', alert);
    });

    this.sentimentEngine.on('significant_sentiment', (sentiment) => {
      this.emit('significant_sentiment', sentiment);
    });
  }

  /**
   * サービスを開始
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[SentimentIntegration] Already running');
      return;
    }

    this.isRunning = true;

    // Start sentiment engine
    this.sentimentEngine.start();

    // Start news collection if enabled
    if (this.config.enableNewsCollection) {
      this.newsCollector.start();
    }

    // Start social collection if enabled
    if (this.config.enableSocialCollection) {
      this.socialCollector.start();
    }

    this.emit('started');
  }

  /**
   * サービスを停止
   */
  stop(): void {
    this.isRunning = false;

    this.sentimentEngine.stop();
    this.newsCollector.stop();
    this.socialCollector.stop();

    this.emit('stopped');
  }

  /**
   * 新しい記事を処理
   */
  private handleNewArticles(articles: NewsArticle[]): void {
    articles.forEach((article) => {
      // Process with NLP if enabled
      if (this.config.enableNLPProcessing) {
        const analysis = this.nlpProcessor.analyze(article.title + ' ' + article.content);
        
        // Extract symbol from entities if not already set
        if (!article.symbol && analysis.entities.length > 0) {
          const tickerEntity = analysis.entities.find((e) => e.type === 'ticker');
          if (tickerEntity) {
            article.symbol = tickerEntity.text;
          }
        }

        // Emit NLP analysis
        this.emit('nlp_analysis', { article, analysis });
      }

      // Add to sentiment engine
      this.sentimentEngine.addNewsArticle(article);
    });

    this.emit('news_processed', { count: articles.length });
  }

  /**
   * 新しい投稿を処理
   */
  private handleNewPosts(posts: SocialMediaPost[]): void {
    posts.forEach((post) => {
      // Process with NLP if enabled
      if (this.config.enableNLPProcessing) {
        const analysis = this.nlpProcessor.analyze(post.content);
        
        // Extract symbol from entities if not already set
        if (!post.symbol && analysis.entities.length > 0) {
          const tickerEntity = analysis.entities.find((e) => e.type === 'ticker');
          if (tickerEntity) {
            post.symbol = tickerEntity.text;
          }
        }

        // Emit NLP analysis
        this.emit('nlp_analysis', { post, analysis });
      }

      // Add to sentiment engine
      this.sentimentEngine.addSocialPost(post);
    });

    this.emit('social_processed', { count: posts.length });
  }

  /**
   * シンボルの市場インテリジェンスを取得
   */
  getMarketIntelligence(symbol: string): MarketIntelligence | null {
    const sentiment = this.sentimentEngine.getCurrentSentiment(symbol);
    if (!sentiment) {
      return null;
    }

    const newsArticles = this.newsCollector.filterBySymbol(symbol);
    const socialPosts = this.socialCollector.filterBySymbol(symbol);

    // Get top news and posts
    const topNews = newsArticles
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, 5);

    // Get social collector for consistent engagement scoring
    const socialCollector = this.socialCollector;
    const topSocial = socialPosts
      .sort((a, b) => {
        const scoreA = socialCollector.calculateEngagementScore(a);
        const scoreB = socialCollector.calculateEngagementScore(b);
        return scoreB - scoreA;
      })
      .slice(0, 5);

    // Extract entities and topics from recent content
    const allText = [
      ...topNews.map((a) => a.title + ' ' + a.content),
      ...topSocial.map((p) => p.content),
    ].join(' ');

    const analysis = this.nlpProcessor.analyze(allText);

    return {
      symbol,
      sentiment,
      newsCount: newsArticles.length,
      socialCount: socialPosts.length,
      topNews,
      topSocial,
      entities: analysis.entities.map((e) => e.text),
      topics: analysis.topics.map((t) => t.name),
      alerts: [], // Alerts are handled via events
      timestamp: Date.now(),
    };
  }

  /**
   * すべてのシンボルの市場インテリジェンスを取得
   */
  getAllMarketIntelligence(): Map<string, MarketIntelligence> {
    const result = new Map<string, MarketIntelligence>();
    const sentiments = this.sentimentEngine.getAllSentiments();

    sentiments.forEach((sentiment, symbol) => {
      const intelligence = this.getMarketIntelligence(symbol);
      if (intelligence) {
        result.set(symbol, intelligence);
      }
    });

    return result;
  }

  /**
   * センチメントトレンドを分析
   */
  analyzeSentimentTrend(symbol: string, period: number = 7): {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    momentum: number;
    confidence: number;
  } {
    const trend = this.sentimentEngine.analyzeTrend(symbol, period);
    const currentSentiment = this.sentimentEngine.getCurrentSentiment(symbol);

    return {
      ...trend,
      confidence: currentSentiment?.confidence || 0,
    };
  }

  /**
   * ニュースを検索
   */
  searchNews(keywords: string[]): NewsArticle[] {
    return this.newsCollector.filterByKeywords(keywords);
  }

  /**
   * ソーシャルメディアをプラットフォーム別にフィルタ
   */
  getSocialByPlatform(platform: SocialMediaPost['platform']): SocialMediaPost[] {
    return this.socialCollector.filterByPlatform(platform);
  }

  /**
   * エンゲージメントが高い投稿を取得
   */
  getTopEngagementPosts(limit: number = 10): SocialMediaPost[] {
    return this.socialCollector.getTopEngagementPosts(limit);
  }

  /**
   * システムステータスを取得
   */
  getStatus(): {
    isRunning: boolean;
    newsEnabled: boolean;
    socialEnabled: boolean;
    nlpEnabled: boolean;
    stats: {
      newsCount: number;
      socialCount: number;
      trackedSymbols: number;
    };
  } {
    const sentiments = this.sentimentEngine.getAllSentiments();

    return {
      isRunning: this.isRunning,
      newsEnabled: this.config.enableNewsCollection,
      socialEnabled: this.config.enableSocialCollection,
      nlpEnabled: this.config.enableNLPProcessing,
      stats: {
        newsCount: this.newsCollector.getArticleCount(),
        socialCount: this.socialCollector.getPostCount(),
        trackedSymbols: sentiments.size,
      },
    };
  }

  /**
   * データをクリア
   */
  clearAllData(): void {
    this.newsCollector.clearData();
    this.socialCollector.clearData();
    this.sentimentEngine.clearData();
  }

  /**
   * コンポーネントへのアクセスを提供（高度な使用のため）
   */
  getNewsCollector(): NewsCollector {
    return this.newsCollector;
  }

  getSocialCollector(): SocialMediaCollector {
    return this.socialCollector;
  }

  getNLPProcessor(): NLPProcessor {
    return this.nlpProcessor;
  }

  getSentimentEngine(): SentimentAnalysisEngine {
    return this.sentimentEngine;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<IntegrationConfig>) => new SentimentIntegrationService(config)
);

export const getGlobalSentimentIntegration = getInstance;
export const resetGlobalSentimentIntegration = resetInstance;

export default SentimentIntegrationService;
