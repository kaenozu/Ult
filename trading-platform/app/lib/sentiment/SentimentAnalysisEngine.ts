/**
 * SentimentAnalysisEngine.ts
 * 
 * 金融ニュースとソーシャルメディアからのセンチメント分析エンジン。
 * NLP技術を使用して市場感情を分析し、トレーディングシグナルに統合します。
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: number;
  symbol?: string;
  sector?: string;
  author?: string;
}

export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'reddit' | 'stocktwits' | 'telegram';
  content: string;
  author: string;
  timestamp: number;
  likes: number;
  shares: number;
  comments: number;
  symbol?: string;
  sentiment?: SentimentScore;
}

export interface SentimentScore {
  score: number; // -1 to 1
  magnitude: number; // 0 to 1
  confidence: number; // 0 to 1
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
}

export interface AggregatedSentiment {
  symbol: string;
  overallScore: number;
  overallMagnitude: number;
  confidence: number;
  trend: 'improving' | 'worsening' | 'stable';
  volume: number; // Number of mentions
  sources: {
    news: SentimentScore;
    social: SentimentScore;
    analyst: SentimentScore;
  };
  keywords: Array<{ word: string; sentiment: number; frequency: number }>;
  timestamp: number;
}

export interface SentimentAlert {
  type: 'sentiment_spike' | 'trend_change' | 'volume_anomaly' | 'keyword_alert';
  symbol: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details: Record<string, unknown>;
}

export interface SentimentConfig {
  analysisWindow: number; // milliseconds
  updateInterval: number; // milliseconds
  sentimentThreshold: number;
  volumeThreshold: number;
  keywordTracking: string[];
  sources: {
    news: boolean;
    social: boolean;
    analyst: boolean;
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SENTIMENT_CONFIG: SentimentConfig = {
  analysisWindow: 24 * 60 * 60 * 1000, // 24 hours
  updateInterval: 5 * 60 * 1000, // 5 minutes
  sentimentThreshold: 0.3,
  volumeThreshold: 100,
  keywordTracking: ['earnings', 'merger', 'acquisition', 'lawsuit', 'FDA', 'breakthrough'],
  sources: {
    news: true,
    social: true,
    analyst: true,
  },
};

// ============================================================================
// Sentiment Dictionary
// ============================================================================

const SENTIMENT_DICTIONARY: Record<string, number> = {
  // Positive financial terms
  'bullish': 0.8,
  'surge': 0.7,
  'soar': 0.8,
  'rally': 0.7,
  'breakout': 0.6,
  'strong': 0.5,
  'growth': 0.6,
  'profit': 0.7,
  'beat': 0.6,
  'upgrade': 0.7,
  'outperform': 0.6,
  'buy': 0.5,
  'moon': 0.9,
  'rocket': 0.8,
  'explode': 0.7,
  'massive': 0.4,
  'huge': 0.4,
  'incredible': 0.6,
  'amazing': 0.6,
  'excellent': 0.7,
  'outstanding': 0.7,
  'record': 0.5,
  'all-time high': 0.8,
  ' ATH': 0.8,
  
  // Negative financial terms
  'bearish': -0.8,
  'plunge': -0.8,
  'tank': -0.7,
  'collapse': -0.9,
  'weak': -0.5,
  'decline': -0.4,
  'loss': -0.6,
  'miss': -0.6,
  'downgrade': -0.7,
  'underperform': -0.6,
  'sell': -0.5,
  'dump': -0.8,
  'disaster': -0.8,
  'terrible': -0.7,
  'awful': -0.7,
  'worst': -0.8,
  'failed': -0.6,
  'bankruptcy': -0.9,
  'investigation': -0.6,
  'lawsuit': -0.5,
  'fraud': -0.9,
  'scam': -0.9,
  
  // Uncertainty/Fear terms
  'volatile': -0.3,
  'uncertainty': -0.4,
  'risk': -0.3,
  'concern': -0.4,
  'worry': -0.4,
  'fear': -0.6,
  'panic': -0.8,
  'sell-off': -0.7,
  'correction': -0.5,
  'recession': -0.8,
  'inflation': -0.4,
  'crash': -0.9,
};

const INTENSIFIERS: Record<string, number> = {
  'very': 1.5,
  'extremely': 2.0,
  'incredibly': 2.0,
  'absolutely': 1.8,
  'completely': 1.6,
  'totally': 1.6,
  'highly': 1.5,
  'really': 1.3,
  'quite': 1.2,
  'somewhat': 0.8,
  'slightly': 0.6,
  'barely': 0.5,
  'not': -1.0,
  'never': -1.0,
  'no': -1.0,
};

// ============================================================================
// Sentiment Analysis Engine
// ============================================================================

export class SentimentAnalysisEngine extends EventEmitter {
  private config: SentimentConfig;
  private newsArticles: Map<string, NewsArticle[]> = new Map();
  private socialPosts: Map<string, SocialMediaPost[]> = new Map();
  private sentimentHistory: Map<string, AggregatedSentiment[]> = new Map();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private keywordMentions: Map<string, number> = new Map();

  constructor(config: Partial<SentimentConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SENTIMENT_CONFIG, ...config };
  }

  /**
   * エンジンを開始
   */
  start(): void {
    console.log('[SentimentAnalysisEngine] Starting...');
    this.updateInterval = setInterval(() => {
      this.processAllSymbols();
    }, this.config.updateInterval);
    this.emit('started');
  }

  /**
   * エンジンを停止
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.emit('stopped');
  }

  /**
   * ニュース記事を追加
   */
  addNewsArticle(article: NewsArticle): void {
    const symbol = article.symbol || 'general';
    
    if (!this.newsArticles.has(symbol)) {
      this.newsArticles.set(symbol, []);
    }

    const articles = this.newsArticles.get(symbol)!;
    articles.push(article);

    // Clean old articles
    const cutoff = Date.now() - this.config.analysisWindow;
    const filtered = articles.filter((a) => a.publishedAt > cutoff);
    this.newsArticles.set(symbol, filtered);

    // Analyze immediately
    this.analyzeContent(article.title + ' ' + article.content, 'news')
      .then((sentiment) => {
        this.emit('news_analyzed', { article, sentiment });
      });
  }

  /**
   * ソーシャルメディア投稿を追加
   */
  addSocialPost(post: SocialMediaPost): void {
    const symbol = post.symbol || 'general';
    
    if (!this.socialPosts.has(symbol)) {
      this.socialPosts.set(symbol, []);
    }

    const posts = this.socialPosts.get(symbol)!;
    
    // Analyze sentiment
    const sentiment = this.analyzeTextSync(post.content);
    post.sentiment = sentiment;
    
    posts.push(post);

    // Clean old posts
    const cutoff = Date.now() - this.config.analysisWindow;
    const filtered = posts.filter((p) => p.timestamp > cutoff);
    this.socialPosts.set(symbol, filtered);

    this.emit('social_analyzed', { post, sentiment });

    // Check for alerts
    this.checkForAlerts(symbol, sentiment);
  }

  /**
   * テキストのセンチメントを分析（同期版）
   */
  private analyzeTextSync(text: string): SentimentScore {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let magnitude = 0;
    let wordCount = 0;
    let multiplier = 1;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^a-z]/g, '');
      
      // Check for intensifiers
      if (INTENSIFIERS[word]) {
        multiplier = INTENSIFIERS[word];
        continue;
      }

      // Check sentiment dictionary
      if (SENTIMENT_DICTIONARY[word]) {
        score += SENTIMENT_DICTIONARY[word] * multiplier;
        magnitude += Math.abs(SENTIMENT_DICTIONARY[word]);
        wordCount++;
        multiplier = 1; // Reset multiplier
      }

      // Track keyword mentions
      if (this.config.keywordTracking.includes(word)) {
        this.keywordMentions.set(word, (this.keywordMentions.get(word) || 0) + 1);
      }
    }

    // Normalize score
    if (wordCount > 0) {
      score = Math.max(-1, Math.min(1, score / Math.sqrt(wordCount)));
      magnitude = Math.min(1, magnitude / wordCount);
    }

    // Determine label
    let label: SentimentScore['label'] = 'neutral';
    if (score > 0.6) label = 'very_positive';
    else if (score > 0.2) label = 'positive';
    else if (score < -0.6) label = 'very_negative';
    else if (score < -0.2) label = 'negative';

    return {
      score,
      magnitude,
      confidence: magnitude,
      label,
    };
  }

  /**
   * テキストのセンチメントを分析（非同期版）
   */
  private async analyzeContent(content: string, type: 'news' | 'social' | 'analyst'): Promise<SentimentScore> {
    // In production, this would call an external NLP API
    // For now, use the synchronous analysis
    return this.analyzeTextSync(content);
  }

  /**
   * 全シンボルのセンチメントを処理
   */
  private processAllSymbols(): void {
    const allSymbols = new Set([
      ...this.newsArticles.keys(),
      ...this.socialPosts.keys(),
    ]);

    allSymbols.forEach((symbol) => {
      this.aggregateSentiment(symbol);
    });
  }

  /**
   * センチメントを集計
   */
  private aggregateSentiment(symbol: string): AggregatedSentiment {
    const articles = this.newsArticles.get(symbol) || [];
    const posts = this.socialPosts.get(symbol) || [];

    // Calculate source-specific sentiment
    const newsSentiment = this.calculateSourceSentiment(articles.map((a) => a.title + ' ' + a.content));
    const socialSentiment = this.calculateSourceSentiment(posts.map((p) => p.content));
    const analystSentiment = this.calculateAnalystSentiment(articles);

    // Weight by source reliability
    const weights = {
      news: 0.4,
      social: 0.3,
      analyst: 0.3,
    };

    const overallScore = 
      newsSentiment.score * weights.news +
      socialSentiment.score * weights.social +
      analystSentiment.score * weights.analyst;

    const overallMagnitude = 
      newsSentiment.magnitude * weights.news +
      socialSentiment.magnitude * weights.social +
      analystSentiment.magnitude * weights.analyst;

    // Calculate trend
    const history = this.sentimentHistory.get(symbol) || [];
    let trend: AggregatedSentiment['trend'] = 'stable';
    
    if (history.length > 0) {
      const recent = history.slice(-5);
      const avgRecent = recent.reduce((sum, h) => sum + h.overallScore, 0) / recent.length;
      const change = overallScore - avgRecent;
      
      if (change > 0.1) trend = 'improving';
      else if (change < -0.1) trend = 'worsening';
    }

    // Extract keywords
    const keywords = this.extractKeywords([...articles, ...posts]);

    const aggregated: AggregatedSentiment = {
      symbol,
      overallScore,
      overallMagnitude,
      confidence: overallMagnitude,
      trend,
      volume: articles.length + posts.length,
      sources: {
        news: newsSentiment,
        social: socialSentiment,
        analyst: analystSentiment,
      },
      keywords,
      timestamp: Date.now(),
    };

    // Store in history
    if (!this.sentimentHistory.has(symbol)) {
      this.sentimentHistory.set(symbol, []);
    }
    const history_list = this.sentimentHistory.get(symbol)!;
    history_list.push(aggregated);
    
    // Keep only last 100 entries
    if (history_list.length > 100) {
      this.sentimentHistory.set(symbol, history_list.slice(-100));
    }

    this.emit('sentiment_update', aggregated);

    // Check for significant changes
    if (Math.abs(overallScore) > this.config.sentimentThreshold && overallMagnitude > 0.5) {
      this.emit('significant_sentiment', aggregated);
    }

    return aggregated;
  }

  /**
   * ソース別センチメントを計算
   */
  private calculateSourceSentiment(texts: string[]): SentimentScore {
    if (texts.length === 0) {
      return { score: 0, magnitude: 0, confidence: 0, label: 'neutral' };
    }

    const sentiments = texts.map((t) => this.analyzeTextSync(t));
    
    const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    const avgMagnitude = sentiments.reduce((sum, s) => sum + s.magnitude, 0) / sentiments.length;
    const avgConfidence = sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length;

    let label: SentimentScore['label'] = 'neutral';
    if (avgScore > 0.6) label = 'very_positive';
    else if (avgScore > 0.2) label = 'positive';
    else if (avgScore < -0.6) label = 'very_negative';
    else if (avgScore < -0.2) label = 'negative';

    return {
      score: avgScore,
      magnitude: avgMagnitude,
      confidence: avgConfidence,
      label,
    };
  }

  /**
   * アナリストセンチメントを計算
   */
  private calculateAnalystSentiment(articles: NewsArticle[]): SentimentScore {
    const analystArticles = articles.filter((a) => 
      a.source.toLowerCase().includes('analyst') ||
      a.source.toLowerCase().includes('rating') ||
      a.title.toLowerCase().includes('upgrade') ||
      a.title.toLowerCase().includes('downgrade')
    );

    return this.calculateSourceSentiment(analystArticles.map((a) => a.title));
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(items: Array<NewsArticle | SocialMediaPost>): Array<{ word: string; sentiment: number; frequency: number }> {
    const wordFreq: Map<string, { count: number; sentiment: number }> = new Map();

    items.forEach((item) => {
      const text = ('title' in item ? item.title + ' ' + (item as NewsArticle).content : item.content).toLowerCase();
      const words: string[] = text.split(/\s+/);
      
      words.forEach((word: string) => {
        const clean = word.replace(/[^a-z]/g, '');
        if (clean.length > 3) {
          const current = wordFreq.get(clean) || { count: 0, sentiment: 0 };
          current.count++;
          current.sentiment += this.analyzeTextSync(clean).score;
          wordFreq.set(clean, current);
        }
      });
    });

    return Array.from(wordFreq.entries())
      .filter(([_, data]) => data.count > 1)
      .map(([word, data]) => ({
        word,
        sentiment: data.sentiment / data.count,
        frequency: data.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * アラートをチェック
   */
  private checkForAlerts(symbol: string, sentiment: SentimentScore): void {
    // Sentiment spike alert
    if (sentiment.magnitude > 0.8) {
      const alert: SentimentAlert = {
        type: 'sentiment_spike',
        symbol,
        message: `Significant sentiment spike detected: ${sentiment.label}`,
        severity: Math.abs(sentiment.score) > 0.7 ? 'high' : 'medium',
        timestamp: Date.now(),
        details: { sentiment },
      };
      this.emit('alert', alert);
    }

    // Volume anomaly
    const posts = this.socialPosts.get(symbol) || [];
    const recentPosts = posts.filter((p) => p.timestamp > Date.now() - 3600000); // Last hour
    
    if (recentPosts.length > this.config.volumeThreshold) {
      const alert: SentimentAlert = {
        type: 'volume_anomaly',
        symbol,
        message: `Unusual social media activity: ${recentPosts.length} mentions in last hour`,
        severity: recentPosts.length > this.config.volumeThreshold * 2 ? 'high' : 'medium',
        timestamp: Date.now(),
        details: { count: recentPosts.length },
      };
      this.emit('alert', alert);
    }

    // Keyword alert
    this.config.keywordTracking.forEach((keyword) => {
      const count = this.keywordMentions.get(keyword) || 0;
      if (count > 10) {
        const alert: SentimentAlert = {
          type: 'keyword_alert',
          symbol,
          message: `Keyword "${keyword}" mentioned ${count} times`,
          severity: 'medium',
          timestamp: Date.now(),
          details: { keyword, count },
        };
        this.emit('alert', alert);
      }
    });
  }

  /**
   * センチメント履歴を取得
   */
  getSentimentHistory(symbol: string): AggregatedSentiment[] {
    return this.sentimentHistory.get(symbol) || [];
  }

  /**
   * 現在のセンチメントを取得
   */
  getCurrentSentiment(symbol: string): AggregatedSentiment | undefined {
    const history = this.sentimentHistory.get(symbol);
    return history ? history[history.length - 1] : undefined;
  }

  /**
   * トレンドを分析
   */
  analyzeTrend(symbol: string, period: number = 7): {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    momentum: number;
  } {
    const history = this.sentimentHistory.get(symbol) || [];
    const recent = history.slice(-period);

    if (recent.length < 2) {
      return { direction: 'neutral', strength: 0, momentum: 0 };
    }

    const scores = recent.map((h) => h.overallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Calculate trend using linear regression
    const n = scores.length;
    const sumX = scores.reduce((sum, _, i) => sum + i, 0);
    const sumY = scores.reduce((sum, s) => sum + s, 0);
    const sumXY = scores.reduce((sum, s, i) => sum + i * s, 0);
    const sumXX = scores.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgScore > 0.2) direction = 'bullish';
    else if (avgScore < -0.2) direction = 'bearish';

    const strength = Math.min(Math.abs(avgScore) * 100, 100);
    const momentum = slope * 100;

    return { direction, strength, momentum };
  }

  /**
   * 全シンボルのセンチメントを取得
   */
  getAllSentiments(): Map<string, AggregatedSentiment> {
    const result = new Map<string, AggregatedSentiment>();
    
    this.sentimentHistory.forEach((history, symbol) => {
      if (history.length > 0) {
        result.set(symbol, history[history.length - 1]);
      }
    });

    return result;
  }

  /**
   * データをクリア
   */
  clearData(): void {
    this.newsArticles.clear();
    this.socialPosts.clear();
    this.sentimentHistory.clear();
    this.keywordMentions.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalSentimentEngine: SentimentAnalysisEngine | null = null;

export function getGlobalSentimentEngine(config?: Partial<SentimentConfig>): SentimentAnalysisEngine {
  if (!globalSentimentEngine) {
    globalSentimentEngine = new SentimentAnalysisEngine(config);
  }
  return globalSentimentEngine;
}

export function resetGlobalSentimentEngine(): void {
  if (globalSentimentEngine) {
    globalSentimentEngine.stop();
    globalSentimentEngine = null;
  }
}

export default SentimentAnalysisEngine;
