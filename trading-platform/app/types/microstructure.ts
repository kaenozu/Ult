/**
 * Microstructure Data Types
 * 
 * Type definitions for high-frequency trading data, order flow, and market microstructure analysis.
 */

/**
 * Order book level
 */
export interface OrderBookLevel {
  price: number;
  volume: number;
  orders: number;
}

/**
 * Order book snapshot
 */
export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

/**
 * Trade tick data
 */
export interface TradeTick {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell' | 'unknown';
}

/**
 * Order flow analysis
 */
export interface OrderFlow {
  symbol: string;
  timestamp: number;
  buyVolume: number;
  sellVolume: number;
  buyOrders: number;
  sellOrders: number;
  imbalance: number; // (buyVolume - sellVolume) / (buyVolume + sellVolume)
  pressure: 'buying' | 'selling' | 'neutral';
}

/**
 * Market impact estimation
 */
export interface MarketImpact {
  symbol: string;
  orderSize: number;
  estimatedImpact: number; // Price impact in percentage
  liquidity: number;
  depth: number;
  spread: number;
  confidence: number;
}

/**
 * Microstructure metrics
 */
export interface MicrostructureMetrics {
  symbol: string;
  timestamp: number;
  spread: number;
  spreadPercent: number;
  bidAskImbalance: number;
  volumeImbalance: number;
  effectiveSpread: number;
  priceImpact: number;
  liquidity: number;
}

/**
 * High-frequency data configuration
 */
export interface MicrostructureConfig {
  updateInterval?: number; // milliseconds
  orderBookDepth?: number;
  minTickVolume?: number;
  impactThreshold?: number;
}
