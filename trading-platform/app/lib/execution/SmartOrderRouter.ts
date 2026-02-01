/**
 * SmartOrderRouter.ts
 * 
 * スマートオーダールーティング
 * Routes orders to optimal execution venues based on liquidity, cost, and speed
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionVenue {
  id: string;
  name: string;
  type: 'EXCHANGE' | 'DARK_POOL' | 'ECN' | 'BROKER';
  fees: {
    maker: number;  // percentage
    taker: number;  // percentage
    fixed: number;  // fixed fee per order
  };
  latency: number; // average latency in ms
  reliability: number; // 0-1 score
  supportedSymbols: string[];
}

export interface VenueLiquidity {
  venueId: string;
  symbol: string;
  bidVolume: number;
  askVolume: number;
  spread: number;
  depth: number;
  timestamp: number;
}

export interface RoutingDecision {
  primaryVenue: string;
  fallbackVenues: string[];
  splitRatio?: Map<string, number>; // venue -> percentage
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
  confidence: number;
}

export interface ExecutionRoute {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  venues: Array<{
    venueId: string;
    quantity: number;
    priority: number;
  }>;
  createdAt: number;
}

export interface SmartRouterConfig {
  enableSmartRouting: boolean;
  preferredVenues: string[];
  maxVenuesPerOrder: number;
  minVenueLiquidity: number;
  costOptimization: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  enableDarkPools: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: SmartRouterConfig = {
  enableSmartRouting: true,
  preferredVenues: [],
  maxVenuesPerOrder: 3,
  minVenueLiquidity: 1000,
  costOptimization: 'BALANCED',
  enableDarkPools: false,
};

// ============================================================================
// Default Venues (Mock Data)
// ============================================================================

const DEFAULT_VENUES: ExecutionVenue[] = [
  {
    id: 'TSE',
    name: 'Tokyo Stock Exchange',
    type: 'EXCHANGE',
    fees: { maker: 0.003, taker: 0.005, fixed: 0 },
    latency: 10,
    reliability: 0.99,
    supportedSymbols: ['*'],
  },
  {
    id: 'NYSE',
    name: 'New York Stock Exchange',
    type: 'EXCHANGE',
    fees: { maker: 0.002, taker: 0.004, fixed: 0 },
    latency: 50,
    reliability: 0.99,
    supportedSymbols: ['*'],
  },
  {
    id: 'NASDAQ',
    name: 'NASDAQ',
    type: 'EXCHANGE',
    fees: { maker: 0.002, taker: 0.004, fixed: 0 },
    latency: 45,
    reliability: 0.99,
    supportedSymbols: ['*'],
  },
  {
    id: 'BATS',
    name: 'CBOE BZX',
    type: 'ECN',
    fees: { maker: 0.001, taker: 0.003, fixed: 0 },
    latency: 30,
    reliability: 0.98,
    supportedSymbols: ['*'],
  },
];

// ============================================================================
// Smart Order Router
// ============================================================================

export class SmartOrderRouter extends EventEmitter {
  private config: SmartRouterConfig;
  private venues: Map<string, ExecutionVenue> = new Map();
  private venueLiquidity: Map<string, VenueLiquidity[]> = new Map();
  private routingHistory: ExecutionRoute[] = [];

  constructor(config: Partial<SmartRouterConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize with default venues
    for (const venue of DEFAULT_VENUES) {
      this.venues.set(venue.id, venue);
    }
  }

  // ============================================================================
  // Venue Management
  // ============================================================================

  /**
   * Register a new execution venue
   */
  registerVenue(venue: ExecutionVenue): void {
    this.venues.set(venue.id, venue);
    this.emit('venue_registered', venue);
  }

  /**
   * Update venue liquidity
   */
  updateVenueLiquidity(liquidity: VenueLiquidity): void {
    if (!this.venueLiquidity.has(liquidity.symbol)) {
      this.venueLiquidity.set(liquidity.symbol, []);
    }

    const liquidityList = this.venueLiquidity.get(liquidity.symbol)!;
    
    // Update or add liquidity data
    const index = liquidityList.findIndex(l => l.venueId === liquidity.venueId);
    if (index >= 0) {
      liquidityList[index] = liquidity;
    } else {
      liquidityList.push(liquidity);
    }
  }

  /**
   * Get all venues
   */
  getVenues(): ExecutionVenue[] {
    return Array.from(this.venues.values());
  }

  /**
   * Get venue by ID
   */
  getVenue(venueId: string): ExecutionVenue | undefined {
    return this.venues.get(venueId);
  }

  // ============================================================================
  // Order Routing
  // ============================================================================

  /**
   * Route an order to optimal venue(s)
   */
  routeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    urgency: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  ): RoutingDecision {
    if (!this.config.enableSmartRouting) {
      return this.createDefaultRoute(symbol);
    }

    // Get available venues for symbol
    const availableVenues = this.getAvailableVenues(symbol);
    if (availableVenues.length === 0) {
      return this.createDefaultRoute(symbol);
    }

    // Get liquidity data for each venue
    const liquidityData = this.venueLiquidity.get(symbol) || [];

    // Score each venue
    const venueScores = this.scoreVenues(
      availableVenues,
      liquidityData,
      side,
      quantity,
      urgency
    );

    // Sort by score
    venueScores.sort((a, b) => b.score - a.score);

    // Determine routing strategy
    const decision = this.determineRoutingStrategy(
      venueScores,
      quantity,
      urgency
    );

    return decision;
  }

  /**
   * Create execution route
   */
  createRoute(
    orderId: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    decision: RoutingDecision
  ): ExecutionRoute {
    const venues: ExecutionRoute['venues'] = [];

    if (decision.splitRatio) {
      // Multi-venue execution
      let priority = 1;
      for (const [venueId, ratio] of decision.splitRatio.entries()) {
        venues.push({
          venueId,
          quantity: Math.floor(quantity * ratio),
          priority: priority++,
        });
      }
    } else {
      // Single venue execution
      venues.push({
        venueId: decision.primaryVenue,
        quantity,
        priority: 1,
      });

      // Add fallback venues
      decision.fallbackVenues.forEach((venueId, index) => {
        venues.push({
          venueId,
          quantity: 0, // Used only as fallback
          priority: index + 2,
        });
      });
    }

    const route: ExecutionRoute = {
      orderId,
      symbol,
      side,
      quantity,
      venues,
      createdAt: Date.now(),
    };

    this.routingHistory.push(route);
    this.emit('route_created', route);

    return route;
  }

  // ============================================================================
  // Venue Analysis
  // ============================================================================

  /**
   * Get available venues for a symbol
   */
  private getAvailableVenues(symbol: string): ExecutionVenue[] {
    return Array.from(this.venues.values()).filter(venue => {
      // Check if venue supports symbol
      if (!venue.supportedSymbols.includes('*') && 
          !venue.supportedSymbols.includes(symbol)) {
        return false;
      }

      // Filter dark pools if disabled
      if (!this.config.enableDarkPools && venue.type === 'DARK_POOL') {
        return false;
      }

      return true;
    });
  }

  /**
   * Score venues based on multiple factors
   */
  private scoreVenues(
    venues: ExecutionVenue[],
    liquidityData: VenueLiquidity[],
    side: 'BUY' | 'SELL',
    quantity: number,
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  ): Array<{ venue: ExecutionVenue; score: number; cost: number; liquidity: number }> {
    return venues.map(venue => {
      const liquidity = liquidityData.find(l => l.venueId === venue.id);
      
      // Calculate individual scores
      const costScore = this.calculateCostScore(venue, quantity);
      const liquidityScore = this.calculateLiquidityScore(
        venue,
        liquidity,
        side,
        quantity
      );
      const latencyScore = this.calculateLatencyScore(venue, urgency);
      const reliabilityScore = venue.reliability;

      // Weight factors based on urgency and optimization strategy
      let weights = { cost: 0.3, liquidity: 0.4, latency: 0.2, reliability: 0.1 };

      switch (urgency) {
        case 'HIGH':
          weights = { cost: 0.2, liquidity: 0.3, latency: 0.4, reliability: 0.1 };
          break;
        case 'LOW':
          weights = { cost: 0.4, liquidity: 0.4, latency: 0.1, reliability: 0.1 };
          break;
      }

      switch (this.config.costOptimization) {
        case 'AGGRESSIVE':
          weights.cost = 0.5;
          break;
        case 'CONSERVATIVE':
          weights.liquidity = 0.5;
          break;
      }

      // Calculate weighted score
      const totalScore = 
        costScore * weights.cost +
        liquidityScore * weights.liquidity +
        latencyScore * weights.latency +
        reliabilityScore * weights.reliability;

      return {
        venue,
        score: totalScore,
        cost: this.calculateTotalCost(venue, quantity),
        liquidity: liquidity ? (liquidity.bidVolume + liquidity.askVolume) : 0,
      };
    });
  }

  /**
   * Calculate cost score (higher is better)
   */
  private calculateCostScore(venue: ExecutionVenue, quantity: number): number {
    const totalCost = this.calculateTotalCost(venue, quantity);
    // Normalize to 0-1 range (assuming max cost of 1%)
    return Math.max(0, 1 - totalCost / 0.01);
  }

  /**
   * Calculate total cost for a venue
   */
  private calculateTotalCost(venue: ExecutionVenue, quantity: number): number {
    // Use taker fee as default (most common case)
    const percentageCost = venue.fees.taker;
    const fixedCost = venue.fees.fixed;
    
    // Assuming average price of 100 for cost calculation
    const estimatedValue = quantity * 100;
    return percentageCost + (fixedCost / estimatedValue);
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(
    venue: ExecutionVenue,
    liquidity: VenueLiquidity | undefined,
    side: 'BUY' | 'SELL',
    quantity: number
  ): number {
    if (!liquidity) {
      return 0.5; // Default score when no liquidity data
    }

    const availableVolume = side === 'BUY' ? liquidity.askVolume : liquidity.bidVolume;
    
    if (availableVolume < this.config.minVenueLiquidity) {
      return 0;
    }

    // Score based on how much of the order can be filled
    const fillRatio = Math.min(availableVolume / quantity, 1);
    
    // Factor in spread
    const spreadScore = Math.max(0, 1 - liquidity.spread / 0.01);
    
    return fillRatio * 0.7 + spreadScore * 0.3;
  }

  /**
   * Calculate latency score
   */
  private calculateLatencyScore(
    venue: ExecutionVenue,
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  ): number {
    const maxLatency = urgency === 'HIGH' ? 50 : urgency === 'MEDIUM' ? 100 : 200;
    return Math.max(0, 1 - venue.latency / maxLatency);
  }

  /**
   * Determine routing strategy
   */
  private determineRoutingStrategy(
    venueScores: Array<{ venue: ExecutionVenue; score: number; cost: number; liquidity: number }>,
    quantity: number,
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  ): RoutingDecision {
    if (venueScores.length === 0) {
      return this.createDefaultRoute('');
    }

    const topVenue = venueScores[0];

    // Check if we should split the order
    const shouldSplit = 
      urgency === 'LOW' && 
      topVenue.liquidity < quantity * 0.8 &&
      venueScores.length > 1;

    if (shouldSplit && venueScores.length >= 2) {
      // Multi-venue execution
      const splitRatio = new Map<string, number>();
      const topVenues = venueScores.slice(0, this.config.maxVenuesPerOrder);
      
      // Calculate split ratios based on liquidity
      const totalLiquidity = topVenues.reduce((sum, v) => sum + v.liquidity, 0);
      
      if (totalLiquidity > 0) {
        for (const venueScore of topVenues) {
          const ratio = venueScore.liquidity / totalLiquidity;
          splitRatio.set(venueScore.venue.id, ratio);
        }
      } else {
        // Equal split if no liquidity data available
        const equalRatio = 1 / topVenues.length;
        for (const venueScore of topVenues) {
          splitRatio.set(venueScore.venue.id, equalRatio);
        }
      }

      const estimatedCost = topVenues.reduce(
        (sum, v) => sum + v.cost * (splitRatio.get(v.venue.id) || 0),
        0
      );

      const estimatedLatency = Math.max(
        ...topVenues.map(v => v.venue.latency)
      );

      return {
        primaryVenue: topVenue.venue.id,
        fallbackVenues: topVenues.slice(1).map(v => v.venue.id),
        splitRatio,
        reason: 'Multi-venue execution for optimal liquidity',
        estimatedCost,
        estimatedLatency,
        confidence: 0.8,
      };
    } else {
      // Single venue execution
      return {
        primaryVenue: topVenue.venue.id,
        fallbackVenues: venueScores.slice(1, 3).map(v => v.venue.id),
        reason: `Best venue: ${topVenue.venue.name} (score: ${topVenue.score.toFixed(2)})`,
        estimatedCost: topVenue.cost,
        estimatedLatency: topVenue.venue.latency,
        confidence: topVenue.score,
      };
    }
  }

  /**
   * Create default route (fallback)
   */
  private createDefaultRoute(symbol: string): RoutingDecision {
    const defaultVenue = this.config.preferredVenues[0] || 'TSE';
    
    return {
      primaryVenue: defaultVenue,
      fallbackVenues: [],
      reason: 'Default routing',
      estimatedCost: 0.005,
      estimatedLatency: 50,
      confidence: 0.5,
    };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get routing statistics
   */
  getStatistics(): {
    totalRoutes: number;
    venueUsage: Map<string, number>;
    averageVenuesPerOrder: number;
  } {
    const venueUsage = new Map<string, number>();
    
    for (const route of this.routingHistory) {
      for (const venue of route.venues) {
        venueUsage.set(
          venue.venueId,
          (venueUsage.get(venue.venueId) || 0) + 1
        );
      }
    }

    const totalVenues = this.routingHistory.reduce(
      (sum, r) => sum + r.venues.length,
      0
    );
    const averageVenuesPerOrder = this.routingHistory.length > 0
      ? totalVenues / this.routingHistory.length
      : 0;

    return {
      totalRoutes: this.routingHistory.length,
      venueUsage,
      averageVenuesPerOrder,
    };
  }

  /**
   * Get routing history
   */
  getRoutingHistory(): ExecutionRoute[] {
    return this.routingHistory;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<SmartRouterConfig>) => new SmartOrderRouter(config)
);

export const getGlobalSmartOrderRouter = getInstance;
export const resetGlobalSmartOrderRouter = resetInstance;

export default SmartOrderRouter;
