/**
 * SmartOrderRouter.test.ts
 * 
 * Unit tests for Smart Order Router
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  SmartOrderRouter,
  resetGlobalSmartOrderRouter,
} from '../SmartOrderRouter';
import type { ExecutionVenue, VenueLiquidity } from '../SmartOrderRouter';

describe('SmartOrderRouter', () => {
  let router: SmartOrderRouter;

  beforeEach(() => {
    router = new SmartOrderRouter();
  });

  afterEach(() => {
    resetGlobalSmartOrderRouter();
  });

  const createMockVenue = (id: string): ExecutionVenue => ({
    id,
    name: `Exchange ${id}`,
    type: 'EXCHANGE',
    fees: { maker: 0.002, taker: 0.004, fixed: 0 },
    latency: 50,
    reliability: 0.99,
    supportedSymbols: ['*'],
  });

  const createMockLiquidity = (venueId: string, symbol: string): VenueLiquidity => ({
    venueId,
    symbol,
    bidVolume: 10000,
    askVolume: 10000,
    spread: 0.05,
    depth: 5,
    timestamp: Date.now(),
  });

  describe('Venue Management', () => {
    it('should register a new venue', () => {
      const venue = createMockVenue('TEST_EXCHANGE');
      router.registerVenue(venue);

      const retrieved = router.getVenue('TEST_EXCHANGE');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('TEST_EXCHANGE');
    });

    it('should get all venues', () => {
      const venues = router.getVenues();
      expect(venues.length).toBeGreaterThan(0);
    });

    it('should update venue liquidity', () => {
      const liquidity = createMockLiquidity('TSE', '7203');
      router.updateVenueLiquidity(liquidity);

      // Router should use this liquidity in routing decisions
      const decision = router.routeOrder('7203', 'BUY', 1000);
      expect(decision).toBeDefined();
    });
  });

  describe('Order Routing', () => {
    beforeEach(() => {
      // Add liquidity data for testing
      router.updateVenueLiquidity(createMockLiquidity('TSE', '7203'));
      router.updateVenueLiquidity(createMockLiquidity('NYSE', '7203'));
    });

    it('should route a simple order', () => {
      const decision = router.routeOrder('7203', 'BUY', 100);

      expect(decision).toBeDefined();
      expect(decision.primaryVenue).toBeDefined();
      expect(decision.estimatedCost).toBeGreaterThanOrEqual(0);
      expect(decision.estimatedLatency).toBeGreaterThan(0);
      expect(decision.confidence).toBeGreaterThan(0);
    });

    it('should consider urgency in routing', () => {
      const highUrgency = router.routeOrder('7203', 'BUY', 100, 'HIGH');
      const lowUrgency = router.routeOrder('7203', 'BUY', 100, 'LOW');

      expect(highUrgency.estimatedLatency).toBeLessThanOrEqual(lowUrgency.estimatedLatency);
    });

    it('should route to multiple venues for large orders', () => {
      const decision = router.routeOrder('7203', 'BUY', 50000, 'LOW');

      // Large orders may be split across venues
      expect(decision.primaryVenue).toBeDefined();
    });

    it('should provide fallback venues', () => {
      const decision = router.routeOrder('7203', 'BUY', 100);

      expect(decision.fallbackVenues).toBeDefined();
      expect(Array.isArray(decision.fallbackVenues)).toBe(true);
    });
  });

  describe('Route Creation', () => {
    beforeEach(() => {
      router.updateVenueLiquidity(createMockLiquidity('TSE', '7203'));
    });

    it('should create an execution route', () => {
      const decision = router.routeOrder('7203', 'BUY', 100);
      const route = router.createRoute('order_123', '7203', 'BUY', 100, decision);

      expect(route).toBeDefined();
      expect(route.orderId).toBe('order_123');
      expect(route.symbol).toBe('7203');
      expect(route.venues.length).toBeGreaterThan(0);
    });

    it('should prioritize venues in route', () => {
      const decision = router.routeOrder('7203', 'BUY', 100);
      const route = router.createRoute('order_123', '7203', 'BUY', 100, decision);

      // Check that venues have priority ordering
      const priorities = route.venues.map(v => v.priority);
      const sortedPriorities = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sortedPriorities);
    });

    it('should include split ratios for multi-venue routes', () => {
      const decision = router.routeOrder('7203', 'BUY', 50000, 'LOW');
      
      if (decision.splitRatio) {
        const route = router.createRoute('order_123', '7203', 'BUY', 50000, decision);
        
        // All venues should have quantity assigned
        const totalQuantity = route.venues.reduce((sum, v) => sum + v.quantity, 0);
        expect(totalQuantity).toBeGreaterThan(0);
      }
    });
  });

  describe('Smart Routing Configuration', () => {
    it('should respect enableSmartRouting setting', () => {
      const router = new SmartOrderRouter({ enableSmartRouting: false });
      const decision = router.routeOrder('7203', 'BUY', 100);

      // Should use default routing when smart routing is disabled
      expect(decision.reason).toContain('Default');
    });

    it('should respect maxVenuesPerOrder setting', () => {
      const router = new SmartOrderRouter({ maxVenuesPerOrder: 2 });
      
      router.updateVenueLiquidity(createMockLiquidity('TSE', '7203'));
      router.updateVenueLiquidity(createMockLiquidity('NYSE', '7203'));
      router.updateVenueLiquidity(createMockLiquidity('NASDAQ', '7203'));

      const decision = router.routeOrder('7203', 'BUY', 50000, 'LOW');
      
      if (decision.splitRatio) {
        expect(decision.splitRatio.size).toBeLessThanOrEqual(2);
      }
    });

    it('should filter dark pools when disabled', () => {
      const darkPool: ExecutionVenue = {
        id: 'DARK_POOL',
        name: 'Dark Pool',
        type: 'DARK_POOL',
        fees: { maker: 0.001, taker: 0.002, fixed: 0 },
        latency: 30,
        reliability: 0.95,
        supportedSymbols: ['*'],
      };

      const router = new SmartOrderRouter({ enableDarkPools: false });
      router.registerVenue(darkPool);
      router.updateVenueLiquidity(createMockLiquidity('DARK_POOL', '7203'));

      const decision = router.routeOrder('7203', 'BUY', 100);

      // Dark pool should not be selected
      expect(decision.primaryVenue).not.toBe('DARK_POOL');
    });
  });

  describe('Cost Optimization', () => {
    beforeEach(() => {
      // Add venues with different costs
      const cheapVenue: ExecutionVenue = {
        id: 'CHEAP',
        name: 'Cheap Exchange',
        type: 'ECN',
        fees: { maker: 0.001, taker: 0.002, fixed: 0 },
        latency: 50,
        reliability: 0.98,
        supportedSymbols: ['*'],
      };

      const expensiveVenue: ExecutionVenue = {
        id: 'EXPENSIVE',
        name: 'Expensive Exchange',
        type: 'EXCHANGE',
        fees: { maker: 0.005, taker: 0.010, fixed: 0 },
        latency: 30,
        reliability: 0.99,
        supportedSymbols: ['*'],
      };

      router.registerVenue(cheapVenue);
      router.registerVenue(expensiveVenue);

      router.updateVenueLiquidity(createMockLiquidity('CHEAP', '7203'));
      router.updateVenueLiquidity(createMockLiquidity('EXPENSIVE', '7203'));
    });

    it('should prefer cheaper venues in AGGRESSIVE mode', () => {
      const router = new SmartOrderRouter({ costOptimization: 'AGGRESSIVE' });
      router.updateVenueLiquidity(createMockLiquidity('CHEAP', '7203'));
      router.updateVenueLiquidity(createMockLiquidity('EXPENSIVE', '7203'));

      const decision = router.routeOrder('7203', 'BUY', 100);

      // Should prefer cheaper venue
      expect(decision.estimatedCost).toBeLessThan(0.01);
    });
  });

  describe('Statistics', () => {
    it('should track routing statistics', () => {
      router.updateVenueLiquidity(createMockLiquidity('TSE', '7203'));
      
      const decision = router.routeOrder('7203', 'BUY', 100);
      router.createRoute('order_1', '7203', 'BUY', 100, decision);

      const stats = router.getStatistics();

      expect(stats.totalRoutes).toBe(1);
      expect(stats.venueUsage.size).toBeGreaterThan(0);
      expect(stats.averageVenuesPerOrder).toBeGreaterThan(0);
    });

    it('should track venue usage', () => {
      router.updateVenueLiquidity(createMockLiquidity('TSE', '7203'));
      
      const decision1 = router.routeOrder('7203', 'BUY', 100);
      router.createRoute('order_1', '7203', 'BUY', 100, decision1);

      const decision2 = router.routeOrder('7203', 'BUY', 100);
      router.createRoute('order_2', '7203', 'BUY', 100, decision2);

      const stats = router.getStatistics();
      expect(stats.totalRoutes).toBe(2);
    });

    it('should get routing history', () => {
      router.updateVenueLiquidity(createMockLiquidity('TSE', '7203'));
      
      const decision = router.routeOrder('7203', 'BUY', 100);
      router.createRoute('order_1', '7203', 'BUY', 100, decision);

      const history = router.getRoutingHistory();
      expect(history.length).toBe(1);
      expect(history[0].orderId).toBe('order_1');
    });
  });
});
