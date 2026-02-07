/**
 * SocialMediaCollector.ts
 * 
 * ソーシャルメディアコレクター - Twitter, Reddit, StockTwitsなどからデータを収集
 * Social Media Collector - Collects data from Twitter, Reddit, StockTwits, etc.
 */

import { EventEmitter } from 'events';
import type { SocialMediaPost } from '../sentiment/SentimentAnalysisEngine';

// ============================================================================
// Types
// ============================================================================

import { logger } from '@/app/core/logger';
export interface SocialMediaSource {
  id: string;
  platform: 'twitter' | 'reddit' | 'stocktwits' | 'telegram';
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  updateInterval: number; // milliseconds
  keywords: string[];
  hashtags: string[];
  userHandles: string[];
}

export interface SocialMediaCollectorConfig {
  sources: SocialMediaSource[];
  maxPostsPerSource: number;
  deduplicationWindow: number; // milliseconds
  cacheExpiry: number; // milliseconds
  minimumEngagement: number; // Minimum likes/shares to consider
  symbols: string[];
  languages: string[];
}

export interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  views?: number;
  reachScore: number; // Calculated engagement score
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SOCIAL_SOURCES: SocialMediaSource[] = [
  {
    id: 'twitter-finance',
    platform: 'twitter',
    enabled: false, // Requires API key
    updateInterval: 300000, // 5 minutes
    keywords: ['stocks', 'trading', 'market', 'finance'],
    hashtags: ['stocks', 'trading', 'investing', 'finance'],
    userHandles: [],
  },
  {
    id: 'reddit-wallstreetbets',
    platform: 'reddit',
    enabled: false, // Requires API key
    updateInterval: 600000, // 10 minutes
    keywords: ['stocks', 'DD', 'YOLO'],
    hashtags: [],
    userHandles: [],
  },
  {
    id: 'stocktwits-trending',
    platform: 'stocktwits',
    enabled: false, // Requires API key
    updateInterval: 300000, // 5 minutes
    keywords: ['bullish', 'bearish'],
    hashtags: [],
    userHandles: [],
  },
];

export const DEFAULT_SOCIAL_CONFIG: SocialMediaCollectorConfig = {
  sources: DEFAULT_SOCIAL_SOURCES,
  maxPostsPerSource: 100,
  deduplicationWindow: 86400000, // 24 hours
  cacheExpiry: 3600000, // 1 hour
  minimumEngagement: 10,
  symbols: ['^N225', '^GSPC', '^IXIC'],
  languages: ['en', 'ja'],
};

// ============================================================================
// Social Media Collector
// ============================================================================

export class SocialMediaCollector extends EventEmitter {
  private config: SocialMediaCollectorConfig;
  private posts: Map<string, SocialMediaPost> = new Map();
  private seenPostIds: Set<string> = new Set();
  private updateTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isRunning = false;

  constructor(config: Partial<SocialMediaCollectorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SOCIAL_CONFIG, ...config };
  }

  /**
   * コレクターを開始
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[SocialMediaCollector] Already running');
      return;
    }

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
    this.isRunning = false;

    // Clear all timers
    this.updateTimers.forEach((timer) => clearInterval(timer));
    this.updateTimers.clear();

    this.emit('stopped');
  }

  /**
   * ソース別のデータ収集を開始
   */
  private startSourceCollection(source: SocialMediaSource): void {
    // Initial fetch
    this.fetchFromSource(source).catch((error) => {
      logger.error(`[SocialMediaCollector] Error fetching from ${source.platform}:`, error);
      this.emit('error', { source: source.id, error });
    });

    // Set up periodic updates
    const timer = setInterval(() => {
      this.fetchFromSource(source).catch((error) => {
        logger.error(`[SocialMediaCollector] Error fetching from ${source.platform}:`, error);
        this.emit('error', { source: source.id, error });
      });
    }, source.updateInterval);

    this.updateTimers.set(source.id, timer);
  }

  /**
   * ソースからデータを取得
   */
  private async fetchFromSource(source: SocialMediaSource): Promise<void> {

    let posts: SocialMediaPost[] = [];

    try {
      switch (source.platform) {
        case 'twitter':
          posts = await this.fetchFromTwitter(source);
          break;
        case 'reddit':
          posts = await this.fetchFromReddit(source);
          break;
        case 'stocktwits':
          posts = await this.fetchFromStockTwits(source);
          break;
        case 'telegram':
          posts = await this.fetchFromTelegram(source);
          break;
      }

      // Process and deduplicate posts
      const newPosts = this.processPosts(posts, source);
      
      if (newPosts.length > 0) {
        this.emit('posts', { source: source.id, posts: newPosts });
      }
    } catch (error) {
      logger.error(`[SocialMediaCollector] Failed to fetch from ${source.platform}:`, (error as Error) || new Error(String(error)));
      throw error;
    }
  }

  /**
   * Twitterからデータを取得
   */
  private async fetchFromTwitter(source: SocialMediaSource): Promise<SocialMediaPost[]> {
    // Twitter API v2 would be used in production
    // For now, return empty array as placeholder
    
    if (!source.apiKey) {
      logger.warn('[SocialMediaCollector] Twitter API key not configured');
      return [];
    }

    // Placeholder: In production, implement actual Twitter API v2 calls
    return [];
  }

  /**
   * Redditからデータを取得
   */
  private async fetchFromReddit(source: SocialMediaSource): Promise<SocialMediaPost[]> {
    // Reddit API would be used in production
    
    if (!source.apiKey) {
      logger.warn('[SocialMediaCollector] Reddit API credentials not configured');
      return [];
    }

    // Placeholder: In production, implement actual Reddit API calls
    return [];
  }

  /**
   * StockTwitsからデータを取得
   */
  private async fetchFromStockTwits(source: SocialMediaSource): Promise<SocialMediaPost[]> {
    // StockTwits API is relatively straightforward
    
    // Placeholder: In production, implement actual StockTwits API calls
    // StockTwits has a public API for trending stocks
    return [];
  }

  /**
   * Telegramからデータを取得
   */
  private async fetchFromTelegram(source: SocialMediaSource): Promise<SocialMediaPost[]> {
    // Telegram Bot API would be used in production
    
    // Placeholder: In production, implement actual Telegram Bot API calls
    return [];
  }

  /**
   * 投稿を処理・重複排除
   */
  private processPosts(posts: SocialMediaPost[], source: SocialMediaSource): SocialMediaPost[] {
    const newPosts: SocialMediaPost[] = [];
    const cutoff = Date.now() - this.config.deduplicationWindow;

    posts.forEach((post) => {
      // Skip if already seen
      if (this.seenPostIds.has(post.id)) {
        return;
      }

      // Skip if too old
      if (post.timestamp < cutoff) {
        return;
      }

      // Skip if engagement is too low
      const engagement = post.likes + post.shares + post.comments;
      if (engagement < this.config.minimumEngagement) {
        return;
      }

      // Mark as seen
      this.seenPostIds.add(post.id);

      // Store post
      this.posts.set(post.id, post);
      newPosts.push(post);
    });

    // Clean up old posts
    this.cleanupOldPosts();

    return newPosts;
  }

  /**
   * 古い投稿をクリーンアップ
   */
  private cleanupOldPosts(): void {
    const cutoff = Date.now() - this.config.cacheExpiry;
    const toDelete: string[] = [];

    this.posts.forEach((post, id) => {
      if (post.timestamp < cutoff) {
        toDelete.push(id);
        this.seenPostIds.delete(id);
      }
    });

    toDelete.forEach((id) => this.posts.delete(id));

    if (toDelete.length > 0) {
    }
  }

  /**
   * エンゲージメントスコアを計算
   */
  calculateEngagementScore(post: SocialMediaPost): number {
    // Weight different engagement types
    const likeWeight = 1;
    const shareWeight = 3; // Shares are more valuable
    const commentWeight = 2; // Comments indicate engagement

    const score = 
      post.likes * likeWeight +
      post.shares * shareWeight +
      post.comments * commentWeight;

    return score;
  }

  /**
   * プラットフォーム別にフィルタリング
   */
  filterByPlatform(platform: SocialMediaPost['platform']): SocialMediaPost[] {
    const results: SocialMediaPost[] = [];
    
    this.posts.forEach((post) => {
      if (post.platform === platform) {
        results.push(post);
      }
    });

    return results;
  }

  /**
   * シンボルでフィルタリング
   */
  filterBySymbol(symbol: string): SocialMediaPost[] {
    const results: SocialMediaPost[] = [];
    
    this.posts.forEach((post) => {
      if (post.symbol === symbol) {
        results.push(post);
      }
    });

    return results;
  }

  /**
   * エンゲージメントでソート
   */
  getTopEngagementPosts(limit: number = 10): SocialMediaPost[] {
    return Array.from(this.posts.values())
      .sort((a, b) => {
        const scoreA = this.calculateEngagementScore(a);
        const scoreB = this.calculateEngagementScore(b);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * すべての投稿を取得
   */
  getAllPosts(): SocialMediaPost[] {
    return Array.from(this.posts.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 投稿数を取得
   */
  getPostCount(): number {
    return this.posts.size;
  }

  /**
   * プラットフォーム別の統計を取得
   */
  getPlatformStats(): Record<string, { count: number; avgEngagement: number }> {
    const stats: Record<string, { count: number; totalEngagement: number }> = {};

    this.posts.forEach((post) => {
      if (!stats[post.platform]) {
        stats[post.platform] = { count: 0, totalEngagement: 0 };
      }
      
      stats[post.platform].count++;
      stats[post.platform].totalEngagement += this.calculateEngagementScore(post);
    });

    // Calculate averages
    const result: Record<string, { count: number; avgEngagement: number }> = {};
    Object.entries(stats).forEach(([platform, data]) => {
      result[platform] = {
        count: data.count,
        avgEngagement: data.totalEngagement / data.count,
      };
    });

    return result;
  }

  /**
   * データをクリア
   */
  clearData(): void {
    this.posts.clear();
    this.seenPostIds.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<SocialMediaCollectorConfig>) => new SocialMediaCollector(config)
);

export const getGlobalSocialMediaCollector = getInstance;
export const resetGlobalSocialMediaCollector = resetInstance;

export default SocialMediaCollector;
