/**
 * MicrostructureAnalyzer
 * 
 * Service for analyzing market microstructure data including order flow,
 * order book depth, trade ticks, and market impact estimation.
 */

import type {
  OrderBook,
  TradeTick,
  OrderFlow,
  MarketImpact,
  MicrostructureMetrics,
  MicrostructureConfig
} from '@/app/types/microstructure';

/**
 * Microstructure Analyzer
 * 
 * Analyzes high-frequency trading data to provide insights on market microstructure,
 * order flow, liquidity, and market impact.
 * 
 * @example
 * ```typescript
 * const analyzer = new MicrostructureAnalyzer();
 * const orderFlow = analyzer.analyzeOrderFlow(ticks);
 * const impact = analyzer.estimateMarketImpact(orderBook, 1000);
 * ```
 */
export class MicrostructureAnalyzer {
  private config: MicrostructureConfig;
  private orderBooks: Map<string, OrderBook> = new Map();
  private ticks: Map<string, TradeTick[]> = new Map();

  constructor(config: MicrostructureConfig = {}) {
    this.config = {
      updateInterval: 1000, // 1 second
      orderBookDepth: 10,
      minTickVolume: 0,
      impactThreshold: 0.01, // 1%
      ...config
    };
  }

  /**
   * Update order book snapshot
   * 
   * @param orderBook - New order book snapshot
   */
  updateOrderBook(orderBook: OrderBook): void {
    this.orderBooks.set(orderBook.symbol, orderBook);
  }

  /**
   * Add trade tick
   * 
   * @param tick - Trade tick data
   */
  addTradeTick(tick: TradeTick): void {
    const ticks = this.ticks.get(tick.symbol) || [];
    ticks.push(tick);
    
    // Keep only recent ticks (last hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentTicks = ticks.filter(t => t.timestamp > oneHourAgo);
    this.ticks.set(tick.symbol, recentTicks);
  }

  /**
   * Analyze order flow from trade ticks
   * 
   * @param ticks - Array of trade ticks
   * @param windowMs - Time window in milliseconds
   * @returns Order flow analysis
   */
  analyzeOrderFlow(ticks: TradeTick[], windowMs: number = 60000): OrderFlow {
    if (ticks.length === 0) {
      return {
        symbol: '',
        timestamp: Date.now(),
        buyVolume: 0,
        sellVolume: 0,
        buyOrders: 0,
        sellOrders: 0,
        imbalance: 0,
        pressure: 'neutral'
      };
    }

    const now = Date.now();
    const cutoff = now - windowMs;
    const recentTicks = ticks.filter(t => t.timestamp > cutoff);

    let buyVolume = 0;
    let sellVolume = 0;
    let buyOrders = 0;
    let sellOrders = 0;

    for (const tick of recentTicks) {
      if (tick.side === 'buy') {
        buyVolume += tick.volume;
        buyOrders++;
      } else if (tick.side === 'sell') {
        sellVolume += tick.volume;
        sellOrders++;
      } else {
        // Unknown side, distribute equally
        buyVolume += tick.volume / 2;
        sellVolume += tick.volume / 2;
      }
    }

    const totalVolume = buyVolume + sellVolume;
    const imbalance = totalVolume > 0 
      ? (buyVolume - sellVolume) / totalVolume 
      : 0;

    let pressure: 'buying' | 'selling' | 'neutral' = 'neutral';
    if (imbalance > 0.2) pressure = 'buying';
    else if (imbalance < -0.2) pressure = 'selling';

    return {
      symbol: recentTicks[0]?.symbol || '',
      timestamp: now,
      buyVolume,
      sellVolume,
      buyOrders,
      sellOrders,
      imbalance,
      pressure
    };
  }

  /**
   * Estimate market impact of an order
   * 
   * @param orderBook - Current order book
   * @param orderSize - Size of the order
   * @param side - 'buy' or 'sell'
   * @returns Market impact estimation
   */
  estimateMarketImpact(
    orderBook: OrderBook, 
    orderSize: number, 
    side: 'buy' | 'sell' = 'buy'
  ): MarketImpact {
    const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
    
    if (levels.length === 0) {
      return {
        symbol: orderBook.symbol,
        orderSize,
        estimatedImpact: 0,
        liquidity: 0,
        depth: 0,
        spread: 0,
        confidence: 0
      };
    }

    // Calculate spread
    const bestBid = orderBook.bids[0]?.price || 0;
    const bestAsk = orderBook.asks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    // Calculate depth and liquidity
    let remainingSize = orderSize;
    let totalCost = 0;
    let depth = 0;

    for (const level of levels) {
      const fillSize = Math.min(remainingSize, level.volume);
      totalCost += fillSize * level.price;
      remainingSize -= fillSize;
      depth++;

      if (remainingSize <= 0) break;
    }

    const avgPrice = orderSize > 0 ? totalCost / (orderSize - remainingSize) : 0;
    const priceImpact = midPrice > 0 
      ? Math.abs((avgPrice - midPrice) / midPrice) * 100 
      : 0;

    // Calculate total liquidity at best levels
    const liquidity = levels.slice(0, 5).reduce((sum, level) => sum + level.volume, 0);

    // Confidence based on how well we can fill the order
    const fillRatio = (orderSize - remainingSize) / orderSize;
    const confidence = fillRatio * (depth >= 5 ? 1 : depth / 5);

    return {
      symbol: orderBook.symbol,
      orderSize,
      estimatedImpact: priceImpact,
      liquidity,
      depth,
      spread: spreadPercent,
      confidence
    };
  }

  /**
   * Calculate microstructure metrics
   * 
   * @param symbol - Symbol to analyze
   * @returns Microstructure metrics
   */
  calculateMetrics(symbol: string): MicrostructureMetrics | null {
    const orderBook = this.orderBooks.get(symbol);
    const ticks = this.ticks.get(symbol) || [];

    if (!orderBook || ticks.length === 0) {
      return null;
    }

    const bestBid = orderBook.bids[0]?.price || 0;
    const bestAsk = orderBook.asks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    // Bid-ask imbalance
    const bidVolume = orderBook.bids.slice(0, 5).reduce((sum, level) => sum + level.volume, 0);
    const askVolume = orderBook.asks.slice(0, 5).reduce((sum, level) => sum + level.volume, 0);
    const totalVolume = bidVolume + askVolume;
    const bidAskImbalance = totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0;

    // Volume imbalance from ticks
    const orderFlow = this.analyzeOrderFlow(ticks, 60000);
    const volumeImbalance = orderFlow.imbalance;

    // Effective spread (from recent trades)
    const recentTicks = ticks.slice(-10);
    const effectiveSpread = recentTicks.length > 0
      ? recentTicks.reduce((sum, tick) => {
          const distance = Math.abs(tick.price - midPrice);
          return sum + (distance / midPrice) * 100;
        }, 0) / recentTicks.length
      : spreadPercent;

    // Price impact (from large trades)
    const largeTrades = ticks.filter(t => t.volume > orderFlow.buyVolume / 10);
    const priceImpact = largeTrades.length > 0
      ? largeTrades.reduce((sum, tick) => {
          const impact = Math.abs(tick.price - midPrice) / midPrice;
          return sum + impact;
        }, 0) / largeTrades.length * 100
      : 0;

    // Liquidity score
    const liquidity = (bidVolume + askVolume) / 2;

    return {
      symbol,
      timestamp: Date.now(),
      spread,
      spreadPercent,
      bidAskImbalance,
      volumeImbalance,
      effectiveSpread,
      priceImpact,
      liquidity
    };
  }

  /**
   * Detect order book imbalance
   * 
   * @param orderBook - Order book to analyze
   * @param depth - Number of levels to consider
   * @returns Imbalance ratio (-1 to 1)
   */
  detectImbalance(orderBook: OrderBook, depth: number = 5): number {
    const bidVolume = orderBook.bids
      .slice(0, depth)
      .reduce((sum, level) => sum + level.volume, 0);
    
    const askVolume = orderBook.asks
      .slice(0, depth)
      .reduce((sum, level) => sum + level.volume, 0);

    const totalVolume = bidVolume + askVolume;
    return totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0;
  }

  /**
   * Get order book snapshot
   * 
   * @param symbol - Symbol to get order book for
   * @returns Order book snapshot or null
   */
  getOrderBook(symbol: string): OrderBook | null {
    return this.orderBooks.get(symbol) || null;
  }

  /**
   * Get recent trade ticks
   * 
   * @param symbol - Symbol to get ticks for
   * @param limit - Maximum number of ticks to return
   * @returns Array of trade ticks
   */
  getRecentTicks(symbol: string, limit: number = 100): TradeTick[] {
    const ticks = this.ticks.get(symbol) || [];
    return ticks.slice(-limit);
  }

  /**
   * Clear old data
   * 
   * @param maxAgeMs - Maximum age of data to keep in milliseconds
   */
  clearOldData(maxAgeMs: number = 3600000): void {
    const cutoff = Date.now() - maxAgeMs;

    // Clear old order books
    const orderBookEntries = Array.from(this.orderBooks.entries());
    for (const [symbol, orderBook] of orderBookEntries) {
      if (orderBook.timestamp < cutoff) {
        this.orderBooks.delete(symbol);
      }
    }

    // Clear old ticks
    const tickEntries = Array.from(this.ticks.entries());
    for (const [symbol, ticks] of tickEntries) {
      const recentTicks = ticks.filter(t => t.timestamp > cutoff);
      if (recentTicks.length === 0) {
        this.ticks.delete(symbol);
      } else {
        this.ticks.set(symbol, recentTicks);
      }
    }
  }
}

/**
 * Singleton instance for convenient access
 */
export const microstructureAnalyzer = new MicrostructureAnalyzer();
