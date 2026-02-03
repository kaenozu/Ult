/**
 * PartialFillSimulator.ts
 *
 * 部分約定シミュレーター
 * 大口注文が市場流動性に与える影響をモデル化し、
 * 複数のバーに分割された約定を現実的にシミュレート
 */

import { OHLCV } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface PartialFillConfig {
  // 流動性しきい値 (注文 / 出来高の比率)
  liquidityThreshold: number; // デフォルト: 0.1 (10%)
  
  // 即時約定率の計算方法
  fillRateModel: 'linear' | 'exponential' | 'custom';
  
  // 最小即時約定率
  minImmediateFillRate: number; // デフォルト: 0.2 (20%)
  
  // 最大即時約定率
  maxImmediateFillRate: number; // デフォルト: 1.0 (100%)
  
  // カスタム約定率関数
  customFillRateFunction?: (orderSizeRatio: number) => number;
  
  // 残注文の処理方法
  remainingOrderStrategy: 'next_bar' | 'cancel' | 'queue';
  
  // キューイングされた注文の最大保持期間 (バー数)
  maxQueueDuration: number; // デフォルト: 3
}

export interface FillResult {
  // 約定した数量
  filledQuantity: number;
  
  // 約定価格 (平均)
  fillPrice: number;
  
  // 残数量
  remainingQuantity: number;
  
  // 即時約定率
  fillRate: number;
  
  // 市場インパクト (価格への影響 %)
  marketImpact: number;
  
  // 次のバーに持ち越す注文
  carryoverOrder?: {
    quantity: number;
    originalPrice: number;
    barsInQueue: number;
  };
  
  // 約定の詳細
  fills: Array<{
    quantity: number;
    price: number;
    bar: number; // バーのインデックス
  }>;
}

export interface QueuedOrder {
  id: string;
  quantity: number;
  side: 'BUY' | 'SELL';
  targetPrice: number;
  barsInQueue: number;
  createdAt: number; // バーインデックス
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PARTIAL_FILL_CONFIG: PartialFillConfig = {
  liquidityThreshold: 0.1, // 出来高の10%以上で部分約定
  fillRateModel: 'exponential',
  minImmediateFillRate: 0.2, // 最低20%は即時約定
  maxImmediateFillRate: 1.0, // 最大100%
  remainingOrderStrategy: 'next_bar',
  maxQueueDuration: 3, // 最大3バーまで持ち越し
};

// ============================================================================
// Partial Fill Simulator
// ============================================================================

export class PartialFillSimulator {
  private config: PartialFillConfig;
  private orderQueue: Map<string, QueuedOrder> = new Map();
  private currentBarIndex: number = 0;
  
  constructor(config: Partial<PartialFillConfig> = {}) {
    this.config = { ...DEFAULT_PARTIAL_FILL_CONFIG, ...config };
  }
  
  /**
   * 注文の約定をシミュレート
   */
  simulateFill(
    price: number,
    quantity: number,
    side: 'BUY' | 'SELL',
    currentBar: OHLCV,
    barIndex: number
  ): FillResult {
    this.currentBarIndex = barIndex;
    
    // 出来高に対する注文サイズの比率
    const orderValue = price * quantity;
    const barValue = currentBar.close * currentBar.volume;
    const orderSizeRatio = currentBar.volume > 0 ? quantity / currentBar.volume : 0;
    
    // 即時約定率を計算
    const fillRate = this.calculateFillRate(orderSizeRatio);
    
    // 約定数量を計算
    const filledQuantity = Math.floor(quantity * fillRate);
    const remainingQuantity = quantity - filledQuantity;
    
    // 市場インパクトを計算
    const marketImpact = this.calculateMarketImpact(orderSizeRatio, side);
    
    // 約定価格を計算 (市場インパクトを考慮)
    const fillPrice = side === 'BUY'
      ? price * (1 + marketImpact / 100)
      : price * (1 - marketImpact / 100);
    
    // 約定詳細
    const fills: FillResult['fills'] = filledQuantity > 0
      ? [{ quantity: filledQuantity, price: fillPrice, bar: barIndex }]
      : [];
    
    // 残注文の処理
    let carryoverOrder: FillResult['carryoverOrder'] | undefined;
    
    if (remainingQuantity > 0) {
      if (this.config.remainingOrderStrategy === 'next_bar') {
        carryoverOrder = {
          quantity: remainingQuantity,
          originalPrice: price,
          barsInQueue: 0,
        };
        
        // キューに追加
        const orderId = `order_${barIndex}_${Date.now()}`;
        this.orderQueue.set(orderId, {
          id: orderId,
          quantity: remainingQuantity,
          side,
          targetPrice: price,
          barsInQueue: 0,
          createdAt: barIndex,
        });
      } else if (this.config.remainingOrderStrategy === 'cancel') {
        // 残注文はキャンセル
        carryoverOrder = undefined;
      }
    }
    
    return {
      filledQuantity,
      fillPrice,
      remainingQuantity,
      fillRate,
      marketImpact,
      carryoverOrder,
      fills,
    };
  }
  
  /**
   * キューに入っている注文を処理
   */
  processQueuedOrders(currentBar: OHLCV, barIndex: number): FillResult[] {
    const results: FillResult[] = [];
    const ordersToRemove: string[] = [];
    
    for (const [orderId, order] of this.orderQueue.entries()) {
      // キュー期間チェック
      const barsInQueue = barIndex - order.createdAt;
      
      if (barsInQueue >= this.config.maxQueueDuration) {
        // 最大保持期間を超えたのでキャンセル
        ordersToRemove.push(orderId);
        continue;
      }
      
      // 部分的に約定を試みる
      const fillResult = this.simulateFill(
        order.targetPrice,
        order.quantity,
        order.side,
        currentBar,
        barIndex
      );
      
      results.push(fillResult);
      
      // 完全に約定したら削除
      if (fillResult.remainingQuantity === 0) {
        ordersToRemove.push(orderId);
      } else {
        // 残注文を更新
        order.quantity = fillResult.remainingQuantity;
        order.barsInQueue = barsInQueue + 1;
      }
    }
    
    // 削除対象の注文を削除
    ordersToRemove.forEach(id => this.orderQueue.delete(id));
    
    return results;
  }
  
  /**
   * 即時約定率を計算
   */
  private calculateFillRate(orderSizeRatio: number): number {
    // しきい値未満は100%約定
    if (orderSizeRatio < this.config.liquidityThreshold) {
      return this.config.maxImmediateFillRate;
    }
    
    switch (this.config.fillRateModel) {
      case 'linear':
        return this.calculateLinearFillRate(orderSizeRatio);
        
      case 'exponential':
        return this.calculateExponentialFillRate(orderSizeRatio);
        
      case 'custom':
        if (this.config.customFillRateFunction) {
          return this.config.customFillRateFunction(orderSizeRatio);
        }
        return this.calculateExponentialFillRate(orderSizeRatio);
        
      default:
        return this.calculateExponentialFillRate(orderSizeRatio);
    }
  }
  
  /**
   * 線形モデルの約定率計算
   */
  private calculateLinearFillRate(orderSizeRatio: number): number {
    const { liquidityThreshold, minImmediateFillRate, maxImmediateFillRate } = this.config;
    
    // 線形に減少
    const slope = (minImmediateFillRate - maxImmediateFillRate) / (1 - liquidityThreshold);
    const fillRate = maxImmediateFillRate + slope * (orderSizeRatio - liquidityThreshold);
    
    return Math.max(minImmediateFillRate, Math.min(maxImmediateFillRate, fillRate));
  }
  
  /**
   * 指数モデルの約定率計算 (より現実的)
   */
  private calculateExponentialFillRate(orderSizeRatio: number): number {
    const { liquidityThreshold, minImmediateFillRate, maxImmediateFillRate } = this.config;
    
    // 指数関数的に減少
    const decay = 5; // 減衰係数
    const normalized = (orderSizeRatio - liquidityThreshold) / (1 - liquidityThreshold);
    const fillRate = minImmediateFillRate +
      (maxImmediateFillRate - minImmediateFillRate) * Math.exp(-decay * normalized);
    
    return Math.max(minImmediateFillRate, Math.min(maxImmediateFillRate, fillRate));
  }
  
  /**
   * 市場インパクトを計算
   * 注文サイズが大きいほど価格に影響
   */
  private calculateMarketImpact(orderSizeRatio: number, side: 'BUY' | 'SELL'): number {
    // しきい値未満は影響なし
    if (orderSizeRatio < this.config.liquidityThreshold) {
      return 0;
    }
    
    // 平方根モデル (市場マイクロ構造理論に基づく)
    const baseImpact = Math.sqrt(orderSizeRatio - this.config.liquidityThreshold) * 0.5;
    
    // 最大5%のインパクト
    return Math.min(baseImpact * 100, 5.0);
  }
  
  /**
   * キューをクリア
   */
  clearQueue(): void {
    this.orderQueue.clear();
  }
  
  /**
   * キューの状態を取得
   */
  getQueueStatus(): {
    totalOrders: number;
    totalQuantity: number;
    oldestOrder: number | null;
    orders: QueuedOrder[];
  } {
    const orders = Array.from(this.orderQueue.values());
    const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
    const oldestOrder = orders.length > 0
      ? Math.min(...orders.map(o => o.createdAt))
      : null;
    
    return {
      totalOrders: orders.length,
      totalQuantity,
      oldestOrder,
      orders,
    };
  }
  
  /**
   * 設定を更新
   */
  updateConfig(config: Partial<PartialFillConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 現在の設定を取得
   */
  getConfig(): PartialFillConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 複数バーにわたる約定をシミュレート
 */
export function simulateMultiBarFill(
  price: number,
  quantity: number,
  side: 'BUY' | 'SELL',
  bars: OHLCV[],
  startIndex: number,
  simulator: PartialFillSimulator
): {
  totalFilled: number;
  averagePrice: number;
  fills: FillResult[];
  barsUsed: number;
} {
  let remainingQuantity = quantity;
  let totalValue = 0;
  let totalFilled = 0;
  const fills: FillResult[] = [];
  let currentIndex = startIndex;
  
  while (remainingQuantity > 0 && currentIndex < bars.length) {
    const fillResult = simulator.simulateFill(
      price,
      remainingQuantity,
      side,
      bars[currentIndex],
      currentIndex
    );
    
    fills.push(fillResult);
    totalFilled += fillResult.filledQuantity;
    totalValue += fillResult.filledQuantity * fillResult.fillPrice;
    remainingQuantity = fillResult.remainingQuantity;
    
    if (remainingQuantity === 0 || fillResult.carryoverOrder === undefined) {
      break;
    }
    
    currentIndex++;
  }
  
  const averagePrice = totalFilled > 0 ? totalValue / totalFilled : price;
  const barsUsed = currentIndex - startIndex + 1;
  
  return {
    totalFilled,
    averagePrice,
    fills,
    barsUsed,
  };
}

/**
 * 流動性スコアに基づいて設定を自動調整
 */
export function adjustConfigForLiquidity(
  liquidityScore: number, // 0-1 (1が最も流動性が高い)
  baseConfig: Partial<PartialFillConfig> = {}
): PartialFillConfig {
  const config = { ...DEFAULT_PARTIAL_FILL_CONFIG, ...baseConfig };
  
  // 流動性が低いほど、厳しい条件
  if (liquidityScore < 0.3) {
    // 低流動性
    config.liquidityThreshold = 0.05; // 5%で部分約定
    config.minImmediateFillRate = 0.1; // 最低10%
    config.maxQueueDuration = 5; // 5バーまで
  } else if (liquidityScore < 0.7) {
    // 中流動性
    config.liquidityThreshold = 0.1; // 10%で部分約定
    config.minImmediateFillRate = 0.2; // 最低20%
    config.maxQueueDuration = 3; // 3バーまで
  } else {
    // 高流動性
    config.liquidityThreshold = 0.2; // 20%で部分約定
    config.minImmediateFillRate = 0.5; // 最低50%
    config.maxQueueDuration = 2; // 2バーまで
  }
  
  return config;
}

// ============================================================================
// Singleton Export
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<PartialFillConfig>) => new PartialFillSimulator(config)
);

export const getGlobalPartialFillSimulator = getInstance;
export const resetGlobalPartialFillSimulator = resetInstance;

export default PartialFillSimulator;
