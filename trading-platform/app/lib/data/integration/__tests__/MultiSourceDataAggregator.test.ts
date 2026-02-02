/**
 * Tests for MultiSourceDataAggregator
 */

import {
  MultiSourceDataAggregator,
  createMultiSourceDataAggregator,
  type DataSource,
  type AggregationConfig,
  type AggregationResult,
} from '../MultiSourceDataAggregator';
import type { MarketData } from '@/app/types/data-quality';

describe('MultiSourceDataAggregator', () => {
  let aggregator: MultiSourceDataAggregator;
  
  // Mock data sources
  const createMockSource = (
    id: string,
    priority: number,
    shouldSucceed: boolean = true,
    delay: number = 0
  ): DataSource => ({
    id,
    name: `Source ${id}`,
    priority,
    enabled: true,
    healthScore: 100,
    fetcher: async (symbol: string): Promise<MarketData> => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      if (!shouldSucceed) {
        throw new Error(`Source ${id} failed`);
      }
      
      return {
        symbol,
        timestamp: Date.now(),
        ohlcv: {
          symbol,
          date: new Date().toISOString().split('T')[0],
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000,
        },
        previousClose: 100,
        previousVolume: 900000,
      };
    },
  });

  beforeEach(() => {
    aggregator = createMultiSourceDataAggregator({
      enableHealthCheck: false, // Disable for tests
    });
  });

  afterEach(() => {
    aggregator.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const agg = createMultiSourceDataAggregator();
      expect(agg).toBeDefined();
      const stats = agg.getStats();
      expect(stats.totalSources).toBe(0);
      agg.destroy();
    });

    it('should accept custom config', () => {
      const agg = createMultiSourceDataAggregator({
        minSourceCount: 2,
        maxSourceAge: 10000,
        consistencyThreshold: 3,
      });
      expect(agg).toBeDefined();
      agg.destroy();
    });
  });

  describe('source management', () => {
    it('should register a source', () => {
      const source = createMockSource('A', 1);
      aggregator.registerSource(source);
      
      const sources = aggregator.getSources();
      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe('A');
    });

    it('should register multiple sources', () => {
      aggregator.registerSource(createMockSource('A', 1));
      aggregator.registerSource(createMockSource('B', 2));
      aggregator.registerSource(createMockSource('C', 3));
      
      const sources = aggregator.getSources();
      expect(sources).toHaveLength(3);
    });

    it('should sort sources by priority', () => {
      aggregator.registerSource(createMockSource('C', 3));
      aggregator.registerSource(createMockSource('A', 1));
      aggregator.registerSource(createMockSource('B', 2));
      
      const sources = aggregator.getSources();
      expect(sources[0].id).toBe('A');
      expect(sources[1].id).toBe('B');
      expect(sources[2].id).toBe('C');
    });

    it('should unregister a source', () => {
      aggregator.registerSource(createMockSource('A', 1));
      aggregator.registerSource(createMockSource('B', 2));
      
      aggregator.unregisterSource('A');
      
      const sources = aggregator.getSources();
      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe('B');
    });

    it('should get healthy sources only', () => {
      const sourceA = createMockSource('A', 1);
      const sourceB = createMockSource('B', 2);
      sourceB.healthScore = 30; // Low health
      const sourceC = createMockSource('C', 3);
      sourceC.enabled = false; // Disabled
      
      aggregator.registerSource(sourceA);
      aggregator.registerSource(sourceB);
      aggregator.registerSource(sourceC);
      
      const healthySources = aggregator.getHealthySources();
      expect(healthySources).toHaveLength(1);
      expect(healthySources[0].id).toBe('A');
    });
  });

  describe('data aggregation', () => {
    it('should aggregate data from single source', async () => {
      aggregator.registerSource(createMockSource('A', 1));
      
      const result = await aggregator.aggregate('AAPL');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.symbol).toBe('AAPL');
      expect(result.primarySource).toBe('Source A');
      expect(result.fallbackUsed).toBe(false);
    });

    it('should use primary source when multiple available', async () => {
      aggregator.registerSource(createMockSource('B', 2));
      aggregator.registerSource(createMockSource('A', 1)); // Higher priority
      
      const result = await aggregator.aggregate('AAPL');
      
      expect(result.success).toBe(true);
      expect(result.primarySource).toBe('Source A');
      expect(result.sources).toContain('Source A');
      expect(result.sources).toContain('Source B');
    });

    it('should fallback when primary source fails', async () => {
      aggregator.registerSource(createMockSource('A', 1, false)); // Will fail
      aggregator.registerSource(createMockSource('B', 2, true));  // Will succeed
      
      const result = await aggregator.aggregate('AAPL');
      
      expect(result.success).toBe(true);
      expect(result.primarySource).toBe('Source B');
      expect(result.sources).toHaveLength(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when all sources fail', async () => {
      aggregator.registerSource(createMockSource('A', 1, false));
      aggregator.registerSource(createMockSource('B', 2, false));
      
      const result = await aggregator.aggregate('AAPL');
      
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when no sources registered', async () => {
      const result = await aggregator.aggregate('AAPL');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('No healthy sources available');
    });

    it('should validate cross-source consistency', async () => {
      aggregator.registerSource(createMockSource('A', 1));
      aggregator.registerSource(createMockSource('B', 2));
      
      const result = await aggregator.aggregate('AAPL');
      
      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      // Both sources return same mock data, so should be consistent
      expect(result.validation?.isConsistent).toBe(true);
    });

    it('should handle insufficient sources', async () => {
      const agg = createMultiSourceDataAggregator({
        minSourceCount: 2,
        enableHealthCheck: false,
      });
      
      agg.registerSource(createMockSource('A', 1));
      // Only 1 source, but need 2
      
      const result = await agg.aggregate('AAPL');
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Insufficient sources'))).toBe(true);
      
      agg.destroy();
    });
  });

  describe('source health management', () => {
    it('should track source health', async () => {
      aggregator.registerSource(createMockSource('A', 1, true));
      
      await aggregator.aggregate('AAPL');
      
      const sources = aggregator.getSources();
      expect(sources[0].healthScore).toBeGreaterThan(0);
    });

    it('should decrease health on failures', async () => {
      const source = createMockSource('A', 1, false);
      aggregator.registerSource(source);
      
      const initialHealth = source.healthScore;
      
      await aggregator.aggregate('AAPL');
      
      const sources = aggregator.getSources();
      expect(sources[0].healthScore).toBeLessThan(initialHealth);
    });
  });

  describe('statistics', () => {
    it('should return aggregator stats', () => {
      aggregator.registerSource(createMockSource('A', 1));
      aggregator.registerSource(createMockSource('B', 2));
      
      const stats = aggregator.getStats();
      
      expect(stats.totalSources).toBe(2);
      expect(stats.enabledSources).toBe(2);
      expect(stats.healthySources).toBe(2);
      expect(stats.avgHealthScore).toBe(100);
    });

    it('should calculate average health score', () => {
      const sourceA = createMockSource('A', 1);
      sourceA.healthScore = 80;
      const sourceB = createMockSource('B', 2);
      sourceB.healthScore = 60;
      
      aggregator.registerSource(sourceA);
      aggregator.registerSource(sourceB);
      
      const stats = aggregator.getStats();
      expect(stats.avgHealthScore).toBe(70);
    });
  });

  describe('performance', () => {
    it('should handle multiple concurrent aggregations', async () => {
      aggregator.registerSource(createMockSource('A', 1));
      aggregator.registerSource(createMockSource('B', 2));
      
      const promises = [
        aggregator.aggregate('AAPL'),
        aggregator.aggregate('GOOGL'),
        aggregator.aggregate('MSFT'),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should timeout slow sources', async () => {
      aggregator.registerSource(createMockSource('A', 1, true, 6000)); // 6s delay (exceeds 5s timeout)
      aggregator.registerSource(createMockSource('B', 2, true, 0)); // Fast
      
      const result = await aggregator.aggregate('AAPL');
      
      // Should succeed with fallback since primary times out
      expect(result.success).toBe(true);
    }, 10000); // 10 second timeout for this test
  });

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      aggregator.registerSource(createMockSource('A', 1));
      aggregator.destroy();
      
      const stats = aggregator.getStats();
      expect(stats.totalSources).toBe(0);
    });
  });
});
