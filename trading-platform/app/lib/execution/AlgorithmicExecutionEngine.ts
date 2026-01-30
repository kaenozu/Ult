/**
 * AlgorithmicExecutionEngine.ts
 * 
 * アルゴリズムによる高速取引実行エンジン。
 * サブミリ秒単位のレイテンシーで注文を最適化し、複数のアルゴリズム実行戦略を提供します。
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TWAP' | 'VWAP' | 'ICEBERG';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  algorithm?: ExecutionAlgorithm;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionAlgorithm {
  type: 'twap' | 'vwap' | 'iceberg' | 'sniper' | 'peg' | 'percentage';
  params: Record<string, number>;
}

export interface OrderBook {
  symbol: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  timestamp: number;
  spread: number;
  midPrice: number;
}

export interface ExecutionResult {
  orderId: string;
  status: 'pending' | 'partial' | 'filled' | 'rejected' | 'cancelled';
  filledQuantity: number;
  avgPrice: number;
  totalValue: number;
  fees: number;
  slippage: number;
  executionTime: number;
  fills: Array<{
    price: number;
    quantity: number;
    timestamp: number;
  }>;
}

export interface ExecutionConfig {
  maxLatency: number; // milliseconds
  slippageTolerance: number; // percentage
  partialFillThreshold: number; // percentage
  retryAttempts: number;
  retryDelay: number; // milliseconds
  useSmartRouting: boolean;
  useOrderBookImbalance: boolean;
  marketImpactModel: 'linear' | 'square_root' | 'power';
}

export interface MarketImpactEstimate {
  temporaryImpact: number;
  permanentImpact: number;
  totalCost: number;
  optimalSize: number;
}

export interface LatencyMetrics {
  orderSubmission: number;
  orderAcknowledgment: number;
  fillNotification: number;
  roundTrip: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  maxLatency: 50, // 50ms max latency
  slippageTolerance: 0.1, // 0.1%
  partialFillThreshold: 95, // 95% fill threshold
  retryAttempts: 3,
  retryDelay: 100,
  useSmartRouting: true,
  useOrderBookImbalance: true,
  marketImpactModel: 'square_root',
};

// ============================================================================
// Algorithmic Execution Engine
// ============================================================================

export class AlgorithmicExecutionEngine extends EventEmitter {
  private config: ExecutionConfig;
  private activeOrders: Map<string, Order> = new Map();
  private orderBook: Map<string, OrderBook> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private latencyMetrics: LatencyMetrics[] = [];
  private isRunning: boolean = false;

  constructor(config: Partial<ExecutionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config };
  }

  /**
   * エンジンを開始
   */
  start(): void {
    this.isRunning = true;
    console.log('[AlgorithmicExecutionEngine] Started');
    this.emit('started');
  }

  /**
   * エンジンを停止
   */
  stop(): void {
    this.isRunning = false;
    // Cancel all active orders
    this.activeOrders.forEach((order) => {
      this.cancelOrder(order.id);
    });
    console.log('[AlgorithmicExecutionEngine] Stopped');
    this.emit('stopped');
  }

  // ============================================================================
  // Order Management
  // ============================================================================

  /**
   * 注文を送信
   */
  async submitOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExecutionResult> {
    const startTime = performance.now();
    
    const fullOrder: Order = {
      ...order,
      id: this.generateOrderId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.activeOrders.set(fullOrder.id, fullOrder);
    this.emit('order_submitted', fullOrder);

    // Execute based on order type
    let result: ExecutionResult;
    
    if (fullOrder.algorithm) {
      result = await this.executeAlgorithmicOrder(fullOrder);
    } else {
      result = await this.executeStandardOrder(fullOrder);
    }

    // Record latency
    const executionTime = performance.now() - startTime;
    this.recordLatency({
      orderSubmission: executionTime * 0.2,
      orderAcknowledgment: executionTime * 0.3,
      fillNotification: executionTime * 0.5,
      roundTrip: executionTime,
    });

    this.executionHistory.push(result);
    this.emit('order_completed', result);

    return result;
  }

  /**
   * 注文をキャンセル
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) return false;

    this.activeOrders.delete(orderId);
    this.emit('order_cancelled', orderId);
    return true;
  }

  /**
   * 注文を変更
   */
  async modifyOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    const order = this.activeOrders.get(orderId);
    if (!order) return null;

    const modified = { ...order, ...updates, updatedAt: Date.now() };
    this.activeOrders.set(orderId, modified);
    this.emit('order_modified', modified);
    return modified;
  }

  // ============================================================================
  // Standard Order Execution
  // ============================================================================

  /**
   * 標準注文を実行
   */
  private async executeStandardOrder(order: Order): Promise<ExecutionResult> {
    const startTime = performance.now();
    const orderBook = this.orderBook.get(order.symbol);

    if (!orderBook) {
      return this.createRejectedResult(order, 'No order book available');
    }

    let fills: Array<{ price: number; quantity: number; timestamp: number }> = [];
    let remainingQty = order.quantity;
    let totalValue = 0;

    // Select side of book
    const levels = order.side === 'BUY' ? orderBook.asks : orderBook.bids;

    for (const level of levels) {
      if (remainingQty <= 0) break;

      const fillQty = Math.min(remainingQty, level.size);
      const fillPrice = level.price;

      // Check slippage for limit orders
      if (order.type === 'LIMIT' && order.price) {
        const slippage = order.side === 'BUY' 
          ? (fillPrice - order.price) / order.price
          : (order.price - fillPrice) / order.price;

        if (slippage > this.config.slippageTolerance / 100) {
          break; // Stop filling if slippage exceeds tolerance
        }
      }

      fills.push({
        price: fillPrice,
        quantity: fillQty,
        timestamp: Date.now(),
      });

      totalValue += fillQty * fillPrice;
      remainingQty -= fillQty;
    }

    const filledQuantity = order.quantity - remainingQty;
    const avgPrice = filledQuantity > 0 ? totalValue / filledQuantity : 0;
    const targetPrice = order.price || orderBook.midPrice;
    const slippage = order.side === 'BUY'
      ? (avgPrice - targetPrice) / targetPrice
      : (targetPrice - avgPrice) / targetPrice;

    const executionTime = performance.now() - startTime;

    let status: ExecutionResult['status'] = 'partial';
    if (remainingQty === 0) status = 'filled';
    else if (filledQuantity === 0) status = 'rejected';
    else if ((filledQuantity / order.quantity) * 100 >= this.config.partialFillThreshold) {
      status = 'filled';
    }

    return {
      orderId: order.id,
      status,
      filledQuantity,
      avgPrice,
      totalValue,
      fees: this.calculateFees(totalValue),
      slippage,
      executionTime,
      fills,
    };
  }

  // ============================================================================
  // Algorithmic Order Execution
  // ============================================================================

  /**
   * アルゴリズム注文を実行
   */
  private async executeAlgorithmicOrder(order: Order): Promise<ExecutionResult> {
    if (!order.algorithm) {
      return this.createRejectedResult(order, 'No algorithm specified');
    }

    switch (order.algorithm.type) {
      case 'twap':
        return this.executeTWAP(order);
      case 'vwap':
        return this.executeVWAP(order);
      case 'iceberg':
        return this.executeIceberg(order);
      case 'sniper':
        return this.executeSniper(order);
      case 'peg':
        return this.executePeg(order);
      case 'percentage':
        return this.executePercentage(order);
      default:
        return this.createRejectedResult(order, 'Unknown algorithm type');
    }
  }

  /**
   * TWAP (Time-Weighted Average Price) 実行
   */
  private async executeTWAP(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const duration = params.duration || 300; // 5 minutes default
    const slices = params.slices || 10;
    const interval = (duration * 1000) / slices;

    const fills: Array<{ price: number; quantity: number; timestamp: number }> = [];
    const sliceQty = order.quantity / slices;

    for (let i = 0; i < slices; i++) {
      await this.delay(interval);

      const sliceOrder: Order = {
        ...order,
        id: `${order.id}_slice_${i}`,
        quantity: Math.floor(sliceQty),
        type: 'MARKET',
        algorithm: undefined,
      };

      const result = await this.executeStandardOrder(sliceOrder);
      fills.push(...result.fills);
    }

    return this.aggregateFills(order, fills);
  }

  /**
   * VWAP (Volume-Weighted Average Price) 実行
   */
  private async executeVWAP(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const duration = params.duration || 300;
    const volumeProfile = (Array.isArray(params.volumeProfile) ? params.volumeProfile : undefined) || this.generateVolumeProfile();

    const fills: Array<{ price: number; quantity: number; timestamp: number }> = [];
    const interval = (duration * 1000) / volumeProfile.length;

    for (let i = 0; i < volumeProfile.length; i++) {
      await this.delay(interval);

      const sliceQty = Math.floor(order.quantity * volumeProfile[i]);
      if (sliceQty < 1) continue;

      const sliceOrder: Order = {
        ...order,
        id: `${order.id}_vwap_${i}`,
        quantity: sliceQty,
        type: 'MARKET',
        algorithm: undefined,
      };

      const result = await this.executeStandardOrder(sliceOrder);
      fills.push(...result.fills);
    }

    return this.aggregateFills(order, fills);
  }

  /**
   * アイスバーグ注文を実行
   */
  private async executeIceberg(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const displaySize = params.displaySize || Math.floor(order.quantity * 0.1);
    const variance = params.variance || 0.2;

    const fills: Array<{ price: number; quantity: number; timestamp: number }> = [];
    let remainingQty = order.quantity;

    while (remainingQty > 0) {
      const currentDisplaySize = Math.floor(displaySize * (1 + (Math.random() - 0.5) * variance));
      const sliceQty = Math.min(currentDisplaySize, remainingQty);

      const sliceOrder: Order = {
        ...order,
        id: `${order.id}_iceberg_${fills.length}`,
        quantity: sliceQty,
        type: 'LIMIT',
        algorithm: undefined,
      };

      const result = await this.executeStandardOrder(sliceOrder);
      fills.push(...result.fills);

      remainingQty -= result.filledQuantity;

      // Wait for fill before showing next slice
      if (result.status === 'filled' || result.status === 'partial') {
        await this.delay(1000);
      }
    }

    return this.aggregateFills(order, fills);
  }

  /**
   * スナイパー注文を実行
   */
  private async executeSniper(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const triggerPrice = params.triggerPrice;
    const timeout = params.timeout || 60000;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const orderBook = this.orderBook.get(order.symbol);
      if (!orderBook) {
        await this.delay(100);
        continue;
      }

      const currentPrice = order.side === 'BUY' ? orderBook.asks[0]?.price : orderBook.bids[0]?.price;

      if ((order.side === 'BUY' && currentPrice <= triggerPrice) ||
          (order.side === 'SELL' && currentPrice >= triggerPrice)) {
        // Fire!
        return this.executeStandardOrder({
          ...order,
          type: 'MARKET',
          algorithm: undefined,
        });
      }

      await this.delay(50); // 50ms polling
    }

    return this.createRejectedResult(order, 'Sniper timeout');
  }

  /**
   * ペッグ注文を実行
   */
  private async executePeg(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const offset = params.offset || 0.01;
    const duration = params.duration || 300;

    const fills: Array<{ price: number; quantity: number; timestamp: number }> = [];
    const endTime = Date.now() + duration * 1000;

    while (Date.now() < endTime) {
      const orderBook = this.orderBook.get(order.symbol);
      if (!orderBook) {
        await this.delay(100);
        continue;
      }

      // Calculate peg price
      const pegPrice = order.side === 'BUY'
        ? orderBook.bids[0]?.price + offset
        : orderBook.asks[0]?.price - offset;

      const sliceOrder: Order = {
        ...order,
        id: `${order.id}_peg_${fills.length}`,
        price: pegPrice,
        type: 'LIMIT',
        algorithm: undefined,
      };

      const result = await this.executeStandardOrder(sliceOrder);
      fills.push(...result.fills);

      if (result.filledQuantity > 0) {
        break;
      }

      await this.delay(1000);
    }

    return this.aggregateFills(order, fills);
  }

  /**
   * パーセンテージ注文を実行
   */
  private async executePercentage(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const targetPct = params.targetPercentage || 5;
    const duration = params.duration || 300;

    const fills: Array<{ price: number; quantity: number; timestamp: number }> = [];
    const endTime = Date.now() + duration * 1000;

    while (Date.now() < endTime) {
      const orderBook = this.orderBook.get(order.symbol);
      if (!orderBook) {
        await this.delay(100);
        continue;
      }

      // Calculate target quantity based on volume
      const volume = orderBook.bids.reduce((sum, b) => sum + b.size, 0) +
                     orderBook.asks.reduce((sum, a) => sum + a.size, 0);
      const targetQty = Math.floor(volume * (targetPct / 100));

      const sliceOrder: Order = {
        ...order,
        id: `${order.id}_pct_${fills.length}`,
        quantity: Math.min(targetQty, order.quantity - fills.reduce((sum, f) => sum + f.quantity, 0)),
        type: 'MARKET',
        algorithm: undefined,
      };

      const result = await this.executeStandardOrder(sliceOrder);
      fills.push(...result.fills);

      const filledQty = fills.reduce((sum, f) => sum + f.quantity, 0);
      if (filledQty >= order.quantity) {
        break;
      }

      await this.delay(60000); // 1 minute between slices
    }

    return this.aggregateFills(order, fills);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * フィルを集計
   */
  private aggregateFills(
    order: Order,
    fills: Array<{ price: number; quantity: number; timestamp: number }>
  ): ExecutionResult {
    const filledQuantity = fills.reduce((sum, f) => sum + f.quantity, 0);
    const totalValue = fills.reduce((sum, f) => sum + f.price * f.quantity, 0);
    const avgPrice = filledQuantity > 0 ? totalValue / filledQuantity : 0;

    const orderBook = this.orderBook.get(order.symbol);
    const targetPrice = order.price || orderBook?.midPrice || avgPrice;
    const slippage = order.side === 'BUY'
      ? (avgPrice - targetPrice) / targetPrice
      : (targetPrice - avgPrice) / targetPrice;

    let status: ExecutionResult['status'] = 'partial';
    if (filledQuantity === 0) status = 'rejected';
    else if (filledQuantity >= order.quantity) status = 'filled';

    return {
      orderId: order.id,
      status,
      filledQuantity,
      avgPrice,
      totalValue,
      fees: this.calculateFees(totalValue),
      slippage,
      executionTime: fills.length > 0 ? fills[fills.length - 1].timestamp - fills[0].timestamp : 0,
      fills,
    };
  }

  /**
   * 拒否結果を作成
   */
  private createRejectedResult(order: Order, reason: string): ExecutionResult {
    return {
      orderId: order.id,
      status: 'rejected',
      filledQuantity: 0,
      avgPrice: 0,
      totalValue: 0,
      fees: 0,
      slippage: 0,
      executionTime: 0,
      fills: [],
    };
  }

  /**
   * 手数料を計算
   */
  private calculateFees(totalValue: number): number {
    // Simplified fee calculation: 0.1% taker fee
    return totalValue * 0.001;
  }

  /**
   * ボリュームプロファイルを生成
   */
  private generateVolumeProfile(): number[] {
    // Typical intraday volume profile (U-shaped)
    return [
      0.05, 0.04, 0.03, 0.02, 0.02, // Early morning
      0.03, 0.04, 0.05, 0.06, 0.07, // Morning
      0.08, 0.09, 0.08, 0.07,       // Midday
      0.08, 0.09, 0.10, 0.09,       // Afternoon
      0.08, 0.06, 0.05, 0.04,       // Close
    ];
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 注文IDを生成
   */
  private generateOrderId(): string {
    return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * レイテンシを記録
   */
  private recordLatency(metrics: LatencyMetrics): void {
    this.latencyMetrics.push(metrics);
    
    // Keep only last 1000 measurements
    if (this.latencyMetrics.length > 1000) {
      this.latencyMetrics = this.latencyMetrics.slice(-1000);
    }

    // Check if latency exceeds threshold
    if (metrics.roundTrip > this.config.maxLatency) {
      this.emit('high_latency', metrics);
    }
  }

  // ============================================================================
  // Order Book Management
  // ============================================================================

  /**
   * オーダーブックを更新
   */
  updateOrderBook(symbol: string, book: OrderBook): void {
    this.orderBook.set(symbol, book);
    this.emit('orderbook_update', symbol, book);
  }

  /**
   * オーダーブックを取得
   */
  getOrderBook(symbol: string): OrderBook | undefined {
    return this.orderBook.get(symbol);
  }

  /**
   * マーケットインパクトを推定
   */
  estimateMarketImpact(symbol: string, quantity: number): MarketImpactEstimate {
    const orderBook = this.orderBook.get(symbol);
    if (!orderBook) {
      return { temporaryImpact: 0, permanentImpact: 0, totalCost: 0, optimalSize: 0 };
    }

    const dailyVolume = 1000000; // Assume 1M daily volume
    const participationRate = quantity / dailyVolume;

    let temporaryImpact: number;
    let permanentImpact: number;

    switch (this.config.marketImpactModel) {
      case 'linear':
        temporaryImpact = 0.1 * participationRate;
        permanentImpact = 0.05 * participationRate;
        break;
      case 'square_root':
        temporaryImpact = 0.1 * Math.sqrt(participationRate);
        permanentImpact = 0.05 * Math.sqrt(participationRate);
        break;
      case 'power':
        temporaryImpact = 0.1 * Math.pow(participationRate, 0.6);
        permanentImpact = 0.05 * Math.pow(participationRate, 0.6);
        break;
      default:
        temporaryImpact = 0.1 * Math.sqrt(participationRate);
        permanentImpact = 0.05 * Math.sqrt(participationRate);
    }

    const midPrice = orderBook.midPrice;
    const totalCost = (temporaryImpact + permanentImpact) * midPrice * quantity;

    // Optimal size is where marginal cost equals expected profit
    const optimalSize = Math.floor(dailyVolume * 0.01); // 1% of daily volume

    return {
      temporaryImpact,
      permanentImpact,
      totalCost,
      optimalSize,
    };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * 平均レイテンシを取得
   */
  getAverageLatency(): LatencyMetrics {
    if (this.latencyMetrics.length === 0) {
      return { orderSubmission: 0, orderAcknowledgment: 0, fillNotification: 0, roundTrip: 0 };
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      orderSubmission: avg(this.latencyMetrics.map((m) => m.orderSubmission)),
      orderAcknowledgment: avg(this.latencyMetrics.map((m) => m.orderAcknowledgment)),
      fillNotification: avg(this.latencyMetrics.map((m) => m.fillNotification)),
      roundTrip: avg(this.latencyMetrics.map((m) => m.roundTrip)),
    };
  }

  /**
   * 実行履歴を取得
   */
  getExecutionHistory(): ExecutionResult[] {
    return this.executionHistory;
  }

  /**
   * アクティブな注文を取得
   */
  getActiveOrders(): Order[] {
    return Array.from(this.activeOrders.values());
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalExecutionEngine: AlgorithmicExecutionEngine | null = null;

export function getGlobalExecutionEngine(config?: Partial<ExecutionConfig>): AlgorithmicExecutionEngine {
  if (!globalExecutionEngine) {
    globalExecutionEngine = new AlgorithmicExecutionEngine(config);
  }
  return globalExecutionEngine;
}

export function resetGlobalExecutionEngine(): void {
  if (globalExecutionEngine) {
    globalExecutionEngine.stop();
    globalExecutionEngine = null;
  }
}

export default AlgorithmicExecutionEngine;
