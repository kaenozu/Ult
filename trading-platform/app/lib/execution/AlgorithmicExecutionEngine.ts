/**
 * AlgorithmicExecutionEngine.ts
 * 
 * アルゴリズムによる高速取引実行エンジン。
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TWAP' | 'VWAP' | 'ICEBERG' | 'POV';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'DAY';
  algorithm?: ExecutionAlgorithm;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionAlgorithm {
  type: 'twap' | 'vwap' | 'iceberg' | 'sniper' | 'peg' | 'percentage' | 'pov';
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

export interface ExecutionFill {
  price: number;
  quantity: number;
  timestamp: number;
}

export interface ExecutionConfig {
  maxLatency: number;
  slippageTolerance: number;
  partialFillThreshold: number;
  retryAttempts: number;
  retryDelay: number;
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
  maxLatency: 50,
  slippageTolerance: 0.1,
  partialFillThreshold: 95,
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

  start(): void {
    this.isRunning = true;
    this.emit('started');
  }

  stop(): void {
    this.isRunning = false;
    this.activeOrders.forEach((order) => {
      this.cancelOrder(order.id);
    });
    this.emit('stopped');
  }

  async submitOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExecutionResult> {
    const startTime = performance.now();
    const fullOrder: Order = { ...order, id: this.generateOrderId(), createdAt: Date.now(), updatedAt: Date.now() };
    this.activeOrders.set(fullOrder.id, fullOrder);
    this.emit('order_submitted', fullOrder);

    let result: ExecutionResult;
    if (fullOrder.algorithm) result = await this.executeAlgorithmicOrder(fullOrder);
    else result = await this.executeStandardOrder(fullOrder);

    const executionTime = performance.now() - startTime;
    this.recordLatency({ orderSubmission: executionTime * 0.2, orderAcknowledgment: executionTime * 0.3, fillNotification: executionTime * 0.5, roundTrip: executionTime });
    this.executionHistory.push(result);
    this.emit('order_completed', result);
    return result;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) return false;
    this.activeOrders.delete(orderId);
    this.emit('order_cancelled', orderId);
    return true;
  }

  async modifyOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    const order = this.activeOrders.get(orderId);
    if (!order) return null;
    const modified = { ...order, ...updates, updatedAt: Date.now() };
    this.activeOrders.set(orderId, modified);
    this.emit('order_modified', modified);
    return modified;
  }

  private async executeStandardOrder(order: Order): Promise<ExecutionResult> {
    const startTime = performance.now();
    const orderBook = this.orderBook.get(order.symbol);
    if (!orderBook) return this.createRejectedResult(order, 'No order book available');

    const fills: Array<{ price: number; quantity: number; timestamp: number }> = [];
    let remainingQty = order.quantity;
    let totalValue = 0;
    const levels = order.side === 'BUY' ? orderBook.asks : orderBook.bids;

    for (const level of levels) {
      if (remainingQty <= 0) break;
      const fillQty = Math.min(remainingQty, level.size);
      const fillPrice = level.price;
      if (order.type === 'LIMIT' && order.price) {
        const slippage = order.side === 'BUY' ? (fillPrice - order.price) / order.price : (order.price - fillPrice) / order.price;
        if (slippage > this.config.slippageTolerance / 100) break;
      }
      fills.push({ price: fillPrice, quantity: fillQty, timestamp: Date.now() });
      totalValue += fillQty * fillPrice;
      remainingQty -= fillQty;
    }

    const filledQuantity = order.quantity - remainingQty;
    const avgPrice = filledQuantity > 0 ? totalValue / filledQuantity : 0;
    const targetPrice = order.price || orderBook.midPrice;
    const slippage = order.side === 'BUY' ? (avgPrice - targetPrice) / targetPrice : (targetPrice - avgPrice) / targetPrice;
    const executionTime = performance.now() - startTime;

    let status: ExecutionResult['status'] = 'partial';
    if (remainingQty === 0) status = 'filled';
    else if (filledQuantity === 0) status = 'rejected';
    else if ((filledQuantity / order.quantity) * 100 >= this.config.partialFillThreshold) status = 'filled';

    return { orderId: order.id, status, filledQuantity, avgPrice, totalValue, fees: totalValue * 0.001, slippage, executionTime, fills };
  }

  private async executeAlgorithmicOrder(order: Order): Promise<ExecutionResult> {
    if (!order.algorithm) return this.createRejectedResult(order, 'No algorithm specified');
    switch (order.algorithm.type) {
      case 'twap': return this.executeTWAP(order);
      case 'vwap': return this.executeVWAP(order);
      case 'iceberg': return this.executeIceberg(order);
      case 'sniper': return this.executeSniper(order);
      case 'peg': return this.executePeg(order);
      case 'percentage': return this.executePercentage(order);
      case 'pov': return this.executePOV(order);
      default: return this.createRejectedResult(order, 'Unknown algorithm type');
    }
  }

  private async executeTWAP(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const duration = params.duration || 1;
    const slices = params.slices || 10;
    const interval = (duration * 1000) / slices;
    const fills: ExecutionFill[] = [];
    const sliceQty = order.quantity / slices;
    for (let i = 0; i < slices; i++) {
      await this.delay(interval);
      const res = await this.executeStandardOrder({ ...order, id: `${order.id}_twap_${i}`, quantity: Math.floor(sliceQty), type: 'MARKET', algorithm: undefined });
      fills.push(...res.fills);
    }
    return this.aggregateFills(order, fills);
  }

  private async executeVWAP(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const duration = params.duration || 1;
    const volumeProfile = Array.isArray(params.volumeProfile) ? params.volumeProfile as number[] : this.generateVolumeProfile();
    const fills: ExecutionFill[] = [];
    const interval = (duration * 1000) / volumeProfile.length;
    for (let i = 0; i < volumeProfile.length; i++) {
      await this.delay(interval);
      const sliceQty = Math.floor(order.quantity * volumeProfile[i]);
      if (sliceQty < 1) continue;
      const res = await this.executeStandardOrder({ ...order, id: `${order.id}_vwap_${i}`, quantity: sliceQty, type: 'MARKET', algorithm: undefined });
      fills.push(...res.fills);
    }
    return this.aggregateFills(order, fills);
  }

  private async executeIceberg(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const displaySize = params.displaySize || Math.floor(order.quantity * 0.1);
    const variance = params.variance || 0.2;
    const fills: ExecutionFill[] = [];
    let remainingQty = order.quantity;
    while (remainingQty > 0) {
      const currentDisplaySize = Math.floor(displaySize * (1 + (Math.random() - 0.5) * variance));
      const sliceQty = Math.min(currentDisplaySize, remainingQty);
      const res = await this.executeStandardOrder({ ...order, id: `${order.id}_ice_${fills.length}`, quantity: sliceQty, type: 'LIMIT', algorithm: undefined });
      fills.push(...res.fills);
      remainingQty -= res.filledQuantity;
      if (res.status === 'filled' || res.status === 'partial') await this.delay(10); // Minimal delay for tests
    }
    return this.aggregateFills(order, fills);
  }

  private async executeSniper(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const triggerPrice = params.triggerPrice;
    const timeout = params.timeout || 1000;
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const ob = this.orderBook.get(order.symbol);
      if (!ob) { await this.delay(10); continue; }
      const price = order.side === 'BUY' ? ob.asks[0]?.price : ob.bids[0]?.price;
      if ((order.side === 'BUY' && price <= triggerPrice) || (order.side === 'SELL' && price >= triggerPrice)) {
        return this.executeStandardOrder({ ...order, type: 'MARKET', algorithm: undefined });
      }
      await this.delay(10);
    }
    return this.createRejectedResult(order, 'Sniper timeout');
  }

  private async executePeg(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const offset = params.offset || 0.01;
    const duration = params.duration || 1;
    const fills: ExecutionFill[] = [];
    const endTime = Date.now() + duration * 1000;
    while (Date.now() < endTime) {
      const ob = this.orderBook.get(order.symbol);
      if (!ob) { await this.delay(10); continue; }
      const pegPrice = order.side === 'BUY' ? ob.bids[0]?.price + offset : ob.asks[0]?.price - offset;
      const res = await this.executeStandardOrder({ ...order, id: `${order.id}_peg_${fills.length}`, price: pegPrice, type: 'LIMIT', algorithm: undefined });
      fills.push(...res.fills);
      if (res.filledQuantity > 0) break;
      await this.delay(10);
    }
    return this.aggregateFills(order, fills);
  }

  private async executePercentage(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const targetPct = params.targetPercentage || 5;
    const duration = params.duration || 1;
    const fills: ExecutionFill[] = [];
    const endTime = Date.now() + duration * 1000;
    while (Date.now() < endTime) {
      const ob = this.orderBook.get(order.symbol);
      if (!ob) { await this.delay(10); continue; }
      const volume = ob.bids.reduce((sum, b) => sum + b.size, 0) + ob.asks.reduce((sum, a) => sum + a.size, 0);
      const targetQty = Math.floor(volume * (targetPct / 100));
      const res = await this.executeStandardOrder({ ...order, id: `${order.id}_pct_${fills.length}`, quantity: Math.min(targetQty, order.quantity - fills.reduce((sum, f) => sum + f.quantity, 0)), type: 'MARKET', algorithm: undefined });
      fills.push(...res.fills);
      if (fills.reduce((sum, f) => sum + f.quantity, 0) >= order.quantity) break;
      await this.delay(Math.max(10, Math.min(100, (duration * 1000) / 10)));
    }
    return this.aggregateFills(order, fills);
  }

  private async executePOV(order: Order): Promise<ExecutionResult> {
    const params = order.algorithm!.params;
    const targetRate = params.participationRate || 10;
    const duration = params.duration || 1;
    const maxSlice = params.maxSliceSize || Math.floor(order.quantity * 0.2);
    const interval = params.checkInterval || 0.1;
    const fills: ExecutionFill[] = [];
    const endTime = Date.now() + duration * 1000;
    let totalVol = 0;
    while (Date.now() < endTime) {
      const ob = this.orderBook.get(order.symbol);
      if (!ob) { await this.delay(10); continue; }
      totalVol += (ob.bids.reduce((s, b) => s + b.size, 0) + ob.asks.reduce((s, a) => s + a.size, 0)) * 0.1;
      const target = totalVol * (targetRate / 100);
      const actual = fills.reduce((s, f) => s + f.quantity, 0);
      const deficit = target - actual;
      if (deficit > 1 && actual < order.quantity) {
        const sliceQty = Math.min(Math.floor(deficit), maxSlice, order.quantity - actual);
        const res = await this.executeStandardOrder({ ...order, id: `${order.id}_pov_${fills.length}`, quantity: Math.max(1, sliceQty), type: 'MARKET', algorithm: undefined });
        fills.push(...res.fills);
        if (fills.reduce((s, f) => s + f.quantity, 0) >= order.quantity) break;
      }
      await this.delay(interval * 1000);
    }
    return this.aggregateFills(order, fills);
  }

  private aggregateFills(order: Order, fills: ExecutionFill[]): ExecutionResult {
    const filledQty = fills.reduce((s, f) => s + f.quantity, 0);
    const val = fills.reduce((s, f) => s + f.price * f.quantity, 0);
    const avg = filledQty > 0 ? val / filledQty : 0;
    const ob = this.orderBook.get(order.symbol);
    const target = order.price || ob?.midPrice || avg;
    const slip = order.side === 'BUY' ? (avg - target) / target : (target - avg) / target;
    return { orderId: order.id, status: filledQty >= order.quantity ? 'filled' : 'partial', filledQuantity: filledQty, avgPrice: avg, totalValue: val, fees: val * 0.001, slippage: slip, executionTime: fills.length > 1 ? fills[fills.length - 1].timestamp - fills[0].timestamp : 0, fills };
  }

  private createRejectedResult(order: Order, reason: string): ExecutionResult {
    return { orderId: order.id, status: 'rejected', filledQuantity: 0, avgPrice: 0, totalValue: 0, fees: 0, slippage: 0, executionTime: 0, fills: [] };
  }

  private generateVolumeProfile(): number[] { return [0.05, 0.04, 0.03, 0.02, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.08, 0.07, 0.08, 0.09, 0.10, 0.09, 0.08, 0.06, 0.05, 0.04]; }
  private delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
  private generateOrderId(): string { return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private recordLatency(m: LatencyMetrics): void { this.latencyMetrics.push(m); if (this.latencyMetrics.length > 1000) this.latencyMetrics.shift(); if (m.roundTrip > this.config.maxLatency) this.emit('high_latency', m); }
  updateOrderBook(s: string, b: OrderBook): void { this.orderBook.set(s, b); this.emit('orderbook_update', s, b); }
  getOrderBook(s: string): OrderBook | undefined { return this.orderBook.get(s); }
  estimateMarketImpact(s: string, q: number): MarketImpactEstimate {
    const ob = this.orderBook.get(s);
    if (!ob) return { temporaryImpact: 0, permanentImpact: 0, totalCost: 0, optimalSize: 0 };
    const dailyVol = 1000000;
    const part = q / dailyVol;
    const impact = 0.1 * Math.sqrt(part);
    const mid = ob.midPrice;
    return { temporaryImpact: impact, permanentImpact: impact * 0.5, totalCost: impact * 1.5 * mid * q, optimalSize: Math.floor(dailyVol * 0.01) };
  }
  getAverageLatency(): LatencyMetrics { if (this.latencyMetrics.length === 0) return { orderSubmission: 0, orderAcknowledgment: 0, fillNotification: 0, roundTrip: 0 }; const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length; return { orderSubmission: avg(this.latencyMetrics.map(m => m.orderSubmission)), orderAcknowledgment: avg(this.latencyMetrics.map(m => m.orderAcknowledgment)), fillNotification: avg(this.latencyMetrics.map(m => m.fillNotification)), roundTrip: avg(this.latencyMetrics.map(m => m.roundTrip)) }; }
  getExecutionHistory(): ExecutionResult[] { return this.executionHistory; }
  getActiveOrders(): Order[] { return Array.from(this.activeOrders.values()); }
}

import { createSingleton } from '../utils/singleton';
const { getInstance, resetInstance } = createSingleton((config?: Partial<ExecutionConfig>) => new AlgorithmicExecutionEngine(config));
export const getGlobalExecutionEngine = getInstance;
export const resetGlobalExecutionEngine = resetInstance;
export default AlgorithmicExecutionEngine;