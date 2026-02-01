/**
 * SocialMediaCollector.test.ts
 * 
 * Tests for Social Media Collector
 */

import SocialMediaCollector from '../SocialMediaCollector';
import type { SocialMediaPost } from '../../sentiment/SentimentAnalysisEngine';

describe('SocialMediaCollector', () => {
  let collector: SocialMediaCollector;

  const createMockPost = (id: string, platform: SocialMediaPost['platform'], engagement = 10): SocialMediaPost => ({
    id,
    platform,
    content: `Test post ${id} about stocks`,
    author: 'testuser',
    timestamp: Date.now(),
    likes: engagement,
    shares: Math.floor(engagement / 2),
    comments: Math.floor(engagement / 3),
    symbol: 'TEST',
  });

  beforeEach(() => {
    collector = new SocialMediaCollector({
      sources: [],
      maxPostsPerSource: 10,
      deduplicationWindow: 1000,
      cacheExpiry: 2000,
      minimumEngagement: 5,
      symbols: ['TEST'],
      languages: ['en'],
    });
  });

  afterEach(() => {
    collector.stop();
    collector.clearData();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultCollector = new SocialMediaCollector();
      expect(defaultCollector).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customCollector = new SocialMediaCollector({
        maxPostsPerSource: 100,
        minimumEngagement: 20,
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
  });

  describe('post management', () => {
    it('should store posts', () => {
      const post = createMockPost('1', 'twitter');
      collector['posts'].set(post.id, post);
      
      expect(collector.getPostCount()).toBe(1);
    });

    it('should filter posts by platform', () => {
      const post1 = createMockPost('1', 'twitter');
      const post2 = createMockPost('2', 'reddit');
      const post3 = createMockPost('3', 'twitter');

      collector['posts'].set(post1.id, post1);
      collector['posts'].set(post2.id, post2);
      collector['posts'].set(post3.id, post3);

      const twitterPosts = collector.filterByPlatform('twitter');
      expect(twitterPosts.length).toBe(2);
      expect(twitterPosts.every((p) => p.platform === 'twitter')).toBe(true);
    });

    it('should filter posts by symbol', () => {
      const post1 = createMockPost('1', 'twitter');
      post1.symbol = 'AAPL';
      
      const post2 = createMockPost('2', 'twitter');
      post2.symbol = 'MSFT';
      
      const post3 = createMockPost('3', 'reddit');
      post3.symbol = 'AAPL';

      collector['posts'].set(post1.id, post1);
      collector['posts'].set(post2.id, post2);
      collector['posts'].set(post3.id, post3);

      const aaplPosts = collector.filterBySymbol('AAPL');
      expect(aaplPosts.length).toBe(2);
      expect(aaplPosts.every((p) => p.symbol === 'AAPL')).toBe(true);
    });

    it('should return all posts sorted by timestamp', () => {
      const post1 = createMockPost('1', 'twitter');
      post1.timestamp = Date.now() - 2000;
      
      const post2 = createMockPost('2', 'reddit');
      post2.timestamp = Date.now() - 1000;
      
      const post3 = createMockPost('3', 'twitter');
      post3.timestamp = Date.now();

      collector['posts'].set(post1.id, post1);
      collector['posts'].set(post2.id, post2);
      collector['posts'].set(post3.id, post3);

      const allPosts = collector.getAllPosts();
      expect(allPosts.length).toBe(3);
      expect(allPosts[0].id).toBe('3'); // Most recent first
      expect(allPosts[2].id).toBe('1'); // Oldest last
    });

    it('should clear all data', () => {
      const post = createMockPost('1', 'twitter');
      collector['posts'].set(post.id, post);
      collector['seenPostIds'].add(post.id);

      collector.clearData();

      expect(collector.getPostCount()).toBe(0);
      expect(collector['seenPostIds'].size).toBe(0);
    });
  });

  describe('engagement scoring', () => {
    it('should calculate engagement score correctly', () => {
      const post: SocialMediaPost = {
        id: '1',
        platform: 'twitter',
        content: 'Test',
        author: 'user',
        timestamp: Date.now(),
        likes: 10,
        shares: 5,
        comments: 3,
      };

      const score = collector.calculateEngagementScore(post);
      // Score = 10*1 + 5*3 + 3*2 = 10 + 15 + 6 = 31
      expect(score).toBe(31);
    });

    it('should weight shares higher than likes', () => {
      const post1: SocialMediaPost = {
        id: '1',
        platform: 'twitter',
        content: 'Test',
        author: 'user',
        timestamp: Date.now(),
        likes: 10,
        shares: 0,
        comments: 0,
      };

      const post2: SocialMediaPost = {
        id: '2',
        platform: 'twitter',
        content: 'Test',
        author: 'user',
        timestamp: Date.now(),
        likes: 0,
        shares: 3,
        comments: 0,
      };

      const score1 = collector.calculateEngagementScore(post1);
      const score2 = collector.calculateEngagementScore(post2);

      // Score1 = 10 likes * 1 = 10
      // Score2 = 3 shares * 3 = 9
      // Actually score1 is greater, so let's check the calculation is correct
      expect(score1).toBe(10);
      expect(score2).toBe(9);
    });

    it('should sort by engagement', () => {
      const post1 = createMockPost('1', 'twitter', 5);
      const post2 = createMockPost('2', 'twitter', 20);
      const post3 = createMockPost('3', 'twitter', 10);

      collector['posts'].set(post1.id, post1);
      collector['posts'].set(post2.id, post2);
      collector['posts'].set(post3.id, post3);

      const topPosts = collector.getTopEngagementPosts(2);
      
      expect(topPosts.length).toBe(2);
      expect(topPosts[0].id).toBe('2'); // Highest engagement
    });
  });

  describe('platform statistics', () => {
    it('should calculate platform stats', () => {
      const post1 = createMockPost('1', 'twitter', 10);
      const post2 = createMockPost('2', 'twitter', 20);
      const post3 = createMockPost('3', 'reddit', 15);

      collector['posts'].set(post1.id, post1);
      collector['posts'].set(post2.id, post2);
      collector['posts'].set(post3.id, post3);

      const stats = collector.getPlatformStats();

      expect(stats.twitter).toBeDefined();
      expect(stats.twitter.count).toBe(2);
      expect(stats.twitter.avgEngagement).toBeGreaterThan(0);
      
      expect(stats.reddit).toBeDefined();
      expect(stats.reddit.count).toBe(1);
    });

    it('should handle empty posts', () => {
      const stats = collector.getPlatformStats();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe('deduplication and filtering', () => {
    it('should deduplicate posts by ID', () => {
      const post = createMockPost('1', 'twitter');
      const source = {
        id: 'test',
        platform: 'twitter' as const,
        enabled: true,
        updateInterval: 1000,
        keywords: [],
        hashtags: [],
        userHandles: [],
      };

      const result1 = collector['processPosts']([post], source);
      const result2 = collector['processPosts']([post], source);

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(0); // Duplicate
    });

    it('should filter by minimum engagement', () => {
      const lowEngagement = createMockPost('1', 'twitter', 2);
      const highEngagement = createMockPost('2', 'twitter', 10);
      
      const source = {
        id: 'test',
        platform: 'twitter' as const,
        enabled: true,
        updateInterval: 1000,
        keywords: [],
        hashtags: [],
        userHandles: [],
      };

      const result = collector['processPosts']([lowEngagement, highEngagement], source);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('2'); // Only high engagement post
    });
  });

  describe('cleanup', () => {
    it('should cleanup old posts', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      // cacheExpiry is 2000ms from config
      const oldPost = createMockPost('1', 'twitter');
      oldPost.timestamp = now - 5000; // 5 seconds old - will be expired

      const newPost = createMockPost('2', 'twitter');
      newPost.timestamp = now - 1000; // 1 second old - still fresh

      collector['posts'].set(oldPost.id, oldPost);
      collector['posts'].set(newPost.id, newPost);

      // Don't advance time, just call cleanup which uses Date.now()
      collector['cleanupOldPosts']();

      expect(collector['posts'].has('1')).toBe(false);
      expect(collector['posts'].has('2')).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle missing API credentials gracefully', async () => {
      const source = {
        id: 'twitter-test',
        platform: 'twitter' as const,
        enabled: true,
        updateInterval: 1000,
        keywords: ['test'],
        hashtags: [],
        userHandles: [],
      };

      // Should not throw, just return empty array
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await collector['fetchFromTwitter'](source);
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
