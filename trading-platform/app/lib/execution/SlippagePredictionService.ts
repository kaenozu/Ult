/**
 * SlippagePredictionService.ts
 * 
 * スリッページ予測・管理サービス
 * Predicts and manages order slippage to optimize execution costs
 */

// ============================================================================
// Types
// ============================================================================

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  spread: number;
  midPrice: number;
}

export interface SlippageEstimate {
  expectedSlippage: number;
  expectedPrice: number;
  marketImpact: number;
  confidence: number;
  recommendation: 'EXECUTE' | 'SPLIT' | 'WAIT' | 'CANCEL';
}

export interface MarketDepthAnalysis {
  symbol: string;
  totalBidVolume: number;
  totalAskVolume: number;
  bidAskImbalance: number;
  averageSpread: number;
  liquidityScore: number;
}

export interface HistoricalSlippage {
  symbol: string;
  side: 'BUY' | 'SELL';
  orderSize: number;
  expectedPrice: number;
  actualPrice: number;
  slippage: number;
  timestamp: number;
}

export interface SlippageConfig {
  maxAcceptableSlippage: number; // percentage
  minLiquidityScore: number;
  historicalWindowSize: number;
  confidenceThreshold: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: SlippageConfig = {
  maxAcceptableSlippage: 0.5, // 0.5%
  minLiquidityScore: 0.6,
  historicalWindowSize: 100,
  confidenceThreshold: 0.7,
};

// ============================================================================
// Slippage Prediction Service
// ============================================================================

export class SlippagePredictionService {
  private config: SlippageConfig;
  private orderBooks: Map<string, OrderBook> = new Map();
  private historicalSlippage: Map<string, HistoricalSlippage[]> = new Map();
  private marketDepth: Map<string, MarketDepthAnalysis> = new Map();

  constructor(config: Partial<SlippageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Order Book Management
  // ============================================================================

  /**
   * Update order book for a symbol
   */
  updateOrderBook(orderBook: OrderBook): void {
    this.orderBooks.set(orderBook.symbol, orderBook);
    this.updateMarketDepth(orderBook);
  }

  /**
   * Get order book for a symbol
   */
  getOrderBook(symbol: string): OrderBook | undefined {
    return this.orderBooks.get(symbol);
  }

  // ============================================================================
  // Slippage Prediction
  // ============================================================================

  /**
   * Estimate slippage for an order
   */
  estimateSlippage(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    targetPrice?: number
  ): SlippageEstimate {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) {
      return this.createUnknownEstimate();
    }

    const price = targetPrice || orderBook.midPrice;
    const levels = side === 'BUY' ? orderBook.asks : orderBook.bids;

    // Calculate expected execution price
    let remainingQty = quantity;
    let totalCost = 0;
    let executedQty = 0;

    for (const level of levels) {
      if (remainingQty <= 0) break;

      const fillQty = Math.min(remainingQty, level.size);
      totalCost += fillQty * level.price;
      executedQty += fillQty;
      remainingQty -= fillQty;
    }

    if (executedQty === 0) {
      return this.createInsufficientLiquidityEstimate();
    }

    const avgPrice = totalCost / executedQty;
    const expectedSlippage = side === 'BUY'
      ? ((avgPrice - price) / price) * 100
      : ((price - avgPrice) / price) * 100;

    // Calculate market impact
    const marketImpact = this.calculateMarketImpact(symbol, quantity);

    // Calculate confidence based on historical data and market depth
    const confidence = this.calculateConfidence(symbol, side, quantity);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      expectedSlippage,
      marketImpact,
      confidence,
      executedQty / quantity
    );

    return {
      expectedSlippage,
      expectedPrice: avgPrice,
      marketImpact,
      confidence,
      recommendation,
    };
  }

  /**
   * Estimate slippage for large orders (with market impact modeling)
   */
  estimateLargeOrderSlippage(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number
  ): SlippageEstimate {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) {
      return this.createUnknownEstimate();
    }

    const marketDepth = this.marketDepth.get(symbol);
    if (!marketDepth) {
      return this.estimateSlippage(symbol, side, quantity);
    }

    // Use square root market impact model
    const dailyVolume = this.estimateDailyVolume(symbol);
    const participationRate = quantity / dailyVolume;
    const baseSlippage = this.estimateSlippage(symbol, side, quantity).expectedSlippage;

    // Apply market impact multiplier
    const impactMultiplier = Math.sqrt(participationRate) * 10;
    const adjustedSlippage = baseSlippage * (1 + impactMultiplier);

    // Adjust confidence based on order size
    const confidence = this.calculateConfidence(symbol, side, quantity) * 
                      (1 - Math.min(participationRate, 0.5));

    return {
      expectedSlippage: adjustedSlippage,
      expectedPrice: orderBook.midPrice * (1 + adjustedSlippage / 100),
      marketImpact: impactMultiplier,
      confidence,
      recommendation: this.generateRecommendation(
        adjustedSlippage,
        impactMultiplier,
        confidence,
        1
      ),
    };
  }

  // ============================================================================
  // Market Analysis
  // ============================================================================

  /**
   * Analyze market depth for a symbol
   */
  analyzeMarketDepth(symbol: string): MarketDepthAnalysis | undefined {
    return this.marketDepth.get(symbol);
  }

  /**
   * Calculate optimal order size based on market conditions
   */
  calculateOptimalOrderSize(symbol: string, targetSlippage: number): number {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) {
      return 0;
    }

    const levels = orderBook.asks; // Assuming BUY side
    const midPrice = orderBook.midPrice;
    const maxSlippagePrice = midPrice * (1 + targetSlippage / 100);

    let optimalSize = 0;
    for (const level of levels) {
      if (level.price > maxSlippagePrice) {
        break;
      }
      optimalSize += level.size;
    }

    return Math.floor(optimalSize * 0.8); // Use 80% to be conservative
  }

  /**
   * Get best execution time based on historical patterns
   */
  getBestExecutionTime(symbol: string): {
    hour: number;
    reason: string;
    confidence: number;
  } {
    const historical = this.historicalSlippage.get(symbol) || [];
    if (historical.length === 0) {
      return { hour: 10, reason: 'Default market open time', confidence: 0.5 };
    }

    // Analyze slippage by hour
    const slippageByHour = new Map<number, number[]>();
    
    for (const record of historical) {
      const hour = new Date(record.timestamp).getHours();
      if (!slippageByHour.has(hour)) {
        slippageByHour.set(hour, []);
      }
      slippageByHour.get(hour)!.push(Math.abs(record.slippage));
    }

    // Find hour with lowest average slippage
    let bestHour = 10;
    let lowestSlippage = Infinity;

    for (const [hour, slippages] of slippageByHour.entries()) {
      const avgSlippage = slippages.reduce((a, b) => a + b, 0) / slippages.length;
      if (avgSlippage < lowestSlippage) {
        lowestSlippage = avgSlippage;
        bestHour = hour;
      }
    }

    return {
      hour: bestHour,
      reason: `Historically lowest slippage at ${bestHour}:00`,
      confidence: Math.min(historical.length / 100, 0.9),
    };
  }

  // ============================================================================
  // Historical Data Management
  // ============================================================================

  /**
   * Record actual slippage for learning
   */
  recordSlippage(
    symbol: string,
    side: 'BUY' | 'SELL',
    orderSize: number,
    expectedPrice: number,
    actualPrice: number
  ): void {
    const slippage = side === 'BUY'
      ? ((actualPrice - expectedPrice) / expectedPrice) * 100
      : ((expectedPrice - actualPrice) / expectedPrice) * 100;

    const record: HistoricalSlippage = {
      symbol,
      side,
      orderSize,
      expectedPrice,
      actualPrice,
      slippage,
      timestamp: Date.now(),
    };

    if (!this.historicalSlippage.has(symbol)) {
      this.historicalSlippage.set(symbol, []);
    }

    const history = this.historicalSlippage.get(symbol)!;
    history.push(record);

    // Keep only recent records
    if (history.length > this.config.historicalWindowSize) {
      history.shift();
    }
  }

  /**
   * Get historical slippage statistics
   */
  getHistoricalStatistics(symbol: string): {
    avgSlippage: number;
    maxSlippage: number;
    minSlippage: number;
    stdDev: number;
    sampleSize: number;
  } {
    const history = this.historicalSlippage.get(symbol) || [];
    
    if (history.length === 0) {
      return {
        avgSlippage: 0,
        maxSlippage: 0,
        minSlippage: 0,
        stdDev: 0,
        sampleSize: 0,
      };
    }

    const slippages = history.map(h => h.slippage);
    const avgSlippage = slippages.reduce((a, b) => a + b, 0) / slippages.length;
    const maxSlippage = Math.max(...slippages);
    const minSlippage = Math.min(...slippages);
    
    const variance = slippages.reduce((sum, s) => sum + Math.pow(s - avgSlippage, 2), 0) / slippages.length;
    const stdDev = Math.sqrt(variance);

    return {
      avgSlippage,
      maxSlippage,
      minSlippage,
      stdDev,
      sampleSize: history.length,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Update market depth analysis
   */
  private updateMarketDepth(orderBook: OrderBook): void {
    const totalBidVolume = orderBook.bids.reduce((sum, b) => sum + b.size, 0);
    const totalAskVolume = orderBook.asks.reduce((sum, a) => sum + a.size, 0);
    const bidAskImbalance = (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);

    // Calculate average spread (top 5 levels)
    const topLevels = Math.min(5, orderBook.bids.length, orderBook.asks.length);
    let totalSpread = 0;
    for (let i = 0; i < topLevels; i++) {
      const spread = orderBook.asks[i].price - orderBook.bids[i].price;
      totalSpread += spread;
    }
    const averageSpread = topLevels > 0 ? totalSpread / topLevels : orderBook.spread;

    // Calculate liquidity score (0-1)
    const volumeScore = Math.min((totalBidVolume + totalAskVolume) / 1000000, 1);
    const spreadScore = Math.max(0, 1 - (averageSpread / orderBook.midPrice) * 100);
    const liquidityScore = (volumeScore * 0.6 + spreadScore * 0.4);

    this.marketDepth.set(orderBook.symbol, {
      symbol: orderBook.symbol,
      totalBidVolume,
      totalAskVolume,
      bidAskImbalance,
      averageSpread,
      liquidityScore,
    });
  }

  /**
   * Calculate market impact
   */
  private calculateMarketImpact(symbol: string, quantity: number): number {
    const depth = this.marketDepth.get(symbol);
    if (!depth) {
      return 0.5; // Default moderate impact
    }

    const totalVolume = depth.totalBidVolume + depth.totalAskVolume;
    const participationRate = quantity / totalVolume;

    // Square root model for market impact
    return Math.sqrt(participationRate) * depth.liquidityScore;
  }

  /**
   * Calculate confidence in estimate
   */
  private calculateConfidence(symbol: string, side: 'BUY' | 'SELL', quantity: number): number {
    const history = this.historicalSlippage.get(symbol) || [];
    const depth = this.marketDepth.get(symbol);

    // Base confidence on sample size
    const sampleConfidence = Math.min(history.length / 50, 1);

    // Adjust for liquidity
    const liquidityConfidence = depth ? depth.liquidityScore : 0.5;

    // Adjust for order size
    const totalVolume = depth ? (depth.totalBidVolume + depth.totalAskVolume) : 1000000;
    const sizeConfidence = Math.max(0, 1 - quantity / totalVolume);

    return (sampleConfidence * 0.4 + liquidityConfidence * 0.3 + sizeConfidence * 0.3);
  }

  /**
   * Generate execution recommendation
   */
  private generateRecommendation(
    slippage: number,
    marketImpact: number,
    confidence: number,
    fillRatio: number
  ): SlippageEstimate['recommendation'] {
    // Check if order can be fully filled
    if (fillRatio < 0.9) {
      return 'SPLIT';
    }

    // Check slippage threshold
    if (slippage > this.config.maxAcceptableSlippage) {
      if (marketImpact > 0.5) {
        return 'SPLIT';
      } else {
        return 'WAIT';
      }
    }

    // Check confidence
    if (confidence < this.config.confidenceThreshold) {
      return 'SPLIT';
    }

    return 'EXECUTE';
  }

  /**
   * Estimate daily volume
   */
  private estimateDailyVolume(symbol: string): number {
    const depth = this.marketDepth.get(symbol);
    if (!depth) {
      return 1000000; // Default 1M daily volume
    }

    // Estimate based on current order book depth
    const currentVolume = depth.totalBidVolume + depth.totalAskVolume;
    return currentVolume * 100; // Assume order book represents 1% of daily volume
  }

  /**
   * Create unknown estimate (when no data available)
   */
  private createUnknownEstimate(): SlippageEstimate {
    return {
      expectedSlippage: 0,
      expectedPrice: 0,
      marketImpact: 0,
      confidence: 0,
      recommendation: 'CANCEL',
    };
  }

  /**
   * Create insufficient liquidity estimate
   */
  private createInsufficientLiquidityEstimate(): SlippageEstimate {
    return {
      expectedSlippage: 999,
      expectedPrice: 0,
      marketImpact: 1,
      confidence: 0,
      recommendation: 'CANCEL',
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<SlippageConfig>) => new SlippagePredictionService(config)
);

export const getGlobalSlippagePredictionService = getInstance;
export const resetGlobalSlippagePredictionService = resetInstance;

export default SlippagePredictionService;
