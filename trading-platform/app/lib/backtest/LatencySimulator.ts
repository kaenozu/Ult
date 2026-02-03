/**
 * LatencySimulator.ts
 *
 * 遅延シミュレーター
 * API遅延、市場データ遅延、注文執行遅延を現実的にモデル化
 */

// ============================================================================
// Types
// ============================================================================

export interface LatencyConfig {
  // API遅延 (ミリ秒)
  apiLatency: {
    min: number;
    max: number;
    distribution: 'uniform' | 'normal' | 'exponential';
  };
  
  // 市場データ遅延 (ミリ秒)
  marketDataLatency: {
    realtime: number; // リアルタイムの場合
    delayed: number; // 遅延データの場合 (無料APIなど)
    isRealtime: boolean;
  };
  
  // 注文執行遅延 (ミリ秒)
  executionLatency: {
    min: number;
    max: number;
    distribution: 'uniform' | 'normal';
  };
  
  // ネットワーク遅延 (ミリ秒)
  networkLatency: {
    min: number;
    max: number;
    jitter: number; // ゆらぎ
  };
  
  // スリッページへの影響係数
  latencySlippageImpact: number; // 遅延1秒あたりのスリッページ (%)
}

export interface LatencyResult {
  // 総遅延 (ミリ秒)
  totalLatency: number;
  
  // 遅延の内訳
  breakdown: {
    api: number;
    marketData: number;
    execution: number;
    network: number;
  };
  
  // 遅延によるスリッページへの影響
  latencySlippage: number; // %
  
  // 実行時刻 (シミュレートされた時刻)
  simulatedExecutionTime: number; // timestamp
}

export interface DelayedOrder {
  orderId: string;
  targetExecutionTime: number; // timestamp
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  submittedAt: number; // timestamp
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_LATENCY_CONFIG: LatencyConfig = {
  apiLatency: {
    min: 100, // 100ms
    max: 500, // 500ms
    distribution: 'normal',
  },
  marketDataLatency: {
    realtime: 0, // リアルタイム
    delayed: 900000, // 15分 (900,000ms)
    isRealtime: false, // デフォルトは遅延データ
  },
  executionLatency: {
    min: 1000, // 1秒
    max: 3000, // 3秒
    distribution: 'normal',
  },
  networkLatency: {
    min: 10, // 10ms
    max: 100, // 100ms
    jitter: 20, // 20ms
  },
  latencySlippageImpact: 0.01, // 1秒あたり0.01%のスリッページ
};

// ============================================================================
// Latency Simulator
// ============================================================================

export class LatencySimulator {
  private config: LatencyConfig;
  private delayedOrders: Map<string, DelayedOrder> = new Map();
  private orderCounter: number = 0;
  
  constructor(config: Partial<LatencyConfig> = {}) {
    this.config = { ...DEFAULT_LATENCY_CONFIG, ...config };
  }
  
  /**
   * 注文の遅延を計算
   */
  calculateLatency(
    currentTime: number = Date.now()
  ): LatencyResult {
    const api = this.sampleLatency(this.config.apiLatency);
    const marketData = this.config.marketDataLatency.isRealtime
      ? this.config.marketDataLatency.realtime
      : this.config.marketDataLatency.delayed;
    const execution = this.sampleLatency(this.config.executionLatency);
    const network = this.sampleNetworkLatency();
    
    const totalLatency = api + marketData + execution + network;
    
    // 遅延によるスリッページへの影響
    const latencySeconds = totalLatency / 1000;
    const latencySlippage = latencySeconds * this.config.latencySlippageImpact;
    
    const simulatedExecutionTime = currentTime + totalLatency;
    
    return {
      totalLatency,
      breakdown: {
        api,
        marketData,
        execution,
        network,
      },
      latencySlippage,
      simulatedExecutionTime,
    };
  }
  
  /**
   * 注文を遅延キューに追加
   */
  submitOrder(
    price: number,
    quantity: number,
    side: 'BUY' | 'SELL',
    currentTime: number = Date.now()
  ): {
    orderId: string;
    latency: LatencyResult;
  } {
    const latency = this.calculateLatency(currentTime);
    const orderId = `order_${++this.orderCounter}`;
    
    const delayedOrder: DelayedOrder = {
      orderId,
      targetExecutionTime: latency.simulatedExecutionTime,
      price,
      quantity,
      side,
      submittedAt: currentTime,
    };
    
    this.delayedOrders.set(orderId, delayedOrder);
    
    return {
      orderId,
      latency,
    };
  }
  
  /**
   * 指定時刻に実行可能な注文を取得
   */
  getExecutableOrders(currentTime: number = Date.now()): DelayedOrder[] {
    const executable: DelayedOrder[] = [];
    const idsToRemove: string[] = [];
    
    for (const [orderId, order] of this.delayedOrders.entries()) {
      if (currentTime >= order.targetExecutionTime) {
        executable.push(order);
        idsToRemove.push(orderId);
      }
    }
    
    // 実行済み注文を削除
    idsToRemove.forEach(id => this.delayedOrders.delete(id));
    
    return executable;
  }
  
  /**
   * 特定の注文をキャンセル
   */
  cancelOrder(orderId: string): boolean {
    return this.delayedOrders.delete(orderId);
  }
  
  /**
   * すべての遅延注文をクリア
   */
  clearOrders(): void {
    this.delayedOrders.clear();
  }
  
  /**
   * 遅延サンプリング (分布に基づく)
   */
  private sampleLatency(config: {
    min: number;
    max: number;
    distribution: 'uniform' | 'normal' | 'exponential';
  }): number {
    switch (config.distribution) {
      case 'uniform':
        return this.uniformRandom(config.min, config.max);
        
      case 'normal':
        const mean = (config.min + config.max) / 2;
        const stdDev = (config.max - config.min) / 6; // 99.7%が範囲内
        return this.normalRandom(mean, stdDev, config.min, config.max);
        
      case 'exponential':
        const lambda = 1 / (config.max - config.min);
        return config.min + this.exponentialRandom(lambda);
        
      default:
        return this.uniformRandom(config.min, config.max);
    }
  }
  
  /**
   * ネットワーク遅延のサンプリング (ジッターを考慮)
   */
  private sampleNetworkLatency(): number {
    const { min, max, jitter } = this.config.networkLatency;
    const base = this.uniformRandom(min, max);
    const jitterValue = this.uniformRandom(-jitter, jitter);
    return Math.max(0, base + jitterValue);
  }
  
  /**
   * 一様分布の乱数
   */
  private uniformRandom(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
  
  /**
   * 正規分布の乱数 (Box-Muller変換)
   */
  private normalRandom(
    mean: number,
    stdDev: number,
    min?: number,
    max?: number
  ): number {
    // Box-Muller変換
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let value = mean + z * stdDev;
    
    // 範囲制限
    if (min !== undefined && max !== undefined) {
      value = Math.max(min, Math.min(max, value));
    }
    
    return value;
  }
  
  /**
   * 指数分布の乱数
   */
  private exponentialRandom(lambda: number): number {
    return -Math.log(1 - Math.random()) / lambda;
  }
  
  /**
   * 設定を更新
   */
  updateConfig(config: Partial<LatencyConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 部分更新のサポート
    if (config.apiLatency) {
      this.config.apiLatency = { ...this.config.apiLatency, ...config.apiLatency };
    }
    if (config.marketDataLatency) {
      this.config.marketDataLatency = {
        ...this.config.marketDataLatency,
        ...config.marketDataLatency,
      };
    }
    if (config.executionLatency) {
      this.config.executionLatency = {
        ...this.config.executionLatency,
        ...config.executionLatency,
      };
    }
    if (config.networkLatency) {
      this.config.networkLatency = {
        ...this.config.networkLatency,
        ...config.networkLatency,
      };
    }
  }
  
  /**
   * 現在の設定を取得
   */
  getConfig(): LatencyConfig {
    return { ...this.config };
  }
  
  /**
   * リアルタイムデータへの切り替え
   */
  enableRealtimeData(enabled: boolean): void {
    this.config.marketDataLatency.isRealtime = enabled;
  }
  
  /**
   * 保留中の注文の状態を取得
   */
  getPendingOrdersStatus(): {
    totalOrders: number;
    totalValue: number;
    avgWaitTime: number;
    orders: DelayedOrder[];
  } {
    const orders = Array.from(this.delayedOrders.values());
    const currentTime = Date.now();
    
    const totalValue = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
    const avgWaitTime = orders.length > 0
      ? orders.reduce((sum, o) => sum + (currentTime - o.submittedAt), 0) / orders.length
      : 0;
    
    return {
      totalOrders: orders.length,
      totalValue,
      avgWaitTime,
      orders,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * バックテスト時間からリアル時間への変換を考慮した遅延計算
 */
export function calculateBacktestLatency(
  barIntervalMs: number, // バー間隔 (ミリ秒)
  latencyMs: number // 実際の遅延 (ミリ秒)
): number {
  // バックテストでは1バー = barIntervalMs
  // latencyMsが次のバーまでの何%に相当するかを計算
  const barsDelay = Math.ceil(latencyMs / barIntervalMs);
  return barsDelay;
}

/**
 * 遅延プロファイルのプリセット
 */
export function getLatencyPreset(
  preset: 'low' | 'medium' | 'high' | 'retail' | 'institutional'
): Partial<LatencyConfig> {
  switch (preset) {
    case 'low':
      // 低遅延 (コロケーション)
      return {
        apiLatency: { min: 1, max: 10, distribution: 'normal' },
        executionLatency: { min: 10, max: 50, distribution: 'normal' },
        networkLatency: { min: 1, max: 5, jitter: 2 },
        latencySlippageImpact: 0.001, // 1秒あたり0.001%
      };
      
    case 'medium':
      // 中遅延 (一般的なAPI)
      return {
        apiLatency: { min: 50, max: 200, distribution: 'normal' },
        executionLatency: { min: 500, max: 2000, distribution: 'normal' },
        networkLatency: { min: 10, max: 50, jitter: 10 },
        latencySlippageImpact: 0.005, // 1秒あたり0.005%
      };
      
    case 'high':
      // 高遅延 (遅いネットワーク)
      return {
        apiLatency: { min: 200, max: 1000, distribution: 'exponential' },
        executionLatency: { min: 2000, max: 5000, distribution: 'normal' },
        networkLatency: { min: 50, max: 200, jitter: 50 },
        latencySlippageImpact: 0.02, // 1秒あたり0.02%
      };
      
    case 'retail':
      // 個人投資家向け
      return {
        apiLatency: { min: 100, max: 500, distribution: 'normal' },
        marketDataLatency: {
          realtime: 0,
          delayed: 900000, // 15分遅延
          isRealtime: false,
        },
        executionLatency: { min: 1000, max: 3000, distribution: 'normal' },
        networkLatency: { min: 20, max: 100, jitter: 30 },
        latencySlippageImpact: 0.01,
      };
      
    case 'institutional':
      // 機関投資家向け
      return {
        apiLatency: { min: 10, max: 100, distribution: 'normal' },
        marketDataLatency: {
          realtime: 0,
          delayed: 0,
          isRealtime: true, // リアルタイム
        },
        executionLatency: { min: 100, max: 500, distribution: 'normal' },
        networkLatency: { min: 5, max: 20, jitter: 5 },
        latencySlippageImpact: 0.002,
      };
      
    default:
      return DEFAULT_LATENCY_CONFIG;
  }
}

/**
 * 遅延統計の計算
 */
export function calculateLatencyStatistics(
  simulator: LatencySimulator,
  samples: number = 1000
): {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
} {
  const latencies: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    const result = simulator.calculateLatency();
    latencies.push(result.totalLatency);
  }
  
  latencies.sort((a, b) => a - b);
  
  const mean = latencies.reduce((sum, l) => sum + l, 0) / samples;
  const median = latencies[Math.floor(samples / 2)];
  const p95 = latencies[Math.floor(samples * 0.95)];
  const p99 = latencies[Math.floor(samples * 0.99)];
  const min = latencies[0];
  const max = latencies[samples - 1];
  
  return { mean, median, p95, p99, min, max };
}

// ============================================================================
// Singleton Export
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<LatencyConfig>) => new LatencySimulator(config)
);

export const getGlobalLatencySimulator = getInstance;
export const resetGlobalLatencySimulator = resetInstance;

export default LatencySimulator;
