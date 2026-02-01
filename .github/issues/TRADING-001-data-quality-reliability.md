# TRADING-001: データ品質と信頼性の向上

## 概要
データ品質チェックエンジンの実装、データ補完パイプラインの構築、マイクロストラクチャーデータの統合、データ遅延監視システムを通じて、取引データの品質と信頼性を向上させます。

## 問題の説明
現在のシステムには以下の課題があります：

1. **データ品質チェックの不足**
   - 不完全なデータがシステムに流入する可能性がある
   - 外れ値や異常値の検出が不十分
   - データの一貫性が保証されていない

2. **データ補完機能の欠如**
   - 欠損データの自動補完がない
   - データギャップが取引シグナルに悪影響を与える
   - 複数のデータソース間の不一致を解消できない

3. **マイクロストラクチャーデータの未活用**
   - 高頻度取引データが活用されていない
   - 注文フロー情報が不足している
   - マーケットインパクト分析が不十分

4. **データ遅延の監視不足**
   - データの到着遅延を検知できない
   - リアルタイム性が保証されていない
   - 遅延による取引機会の損失を防げない

## 影響
- 不正確なシグナル生成による損失
- 取引機会の損失
- システムの信頼性低下
- リスク管理の不備

## 推奨される解決策

### 1. データ品質チェックエンジンの実装

```typescript
// src/data/quality/DataQualityChecker.ts
import { MarketData } from '@/types/market';
import { QualityReport, QualityMetric } from '@/types/data-quality';

export interface DataQualityRule {
  name: string;
  severity: 'error' | 'warning' | 'info';
  validate: (data: MarketData) => boolean;
  message: string;
}

export class DataQualityChecker {
  private rules: DataQualityRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // OHLCVデータの整合性チェック
    this.addRule({
      name: 'ohlc-consistency',
      severity: 'error',
      validate: (data) => {
        if (!data.ohlcv) return true;
        const { open, high, low, close } = data.ohlcv;
        return high >= Math.max(open, close) && low <= Math.min(open, close);
      },
      message: 'OHLCデータが整合していません（high >= max(open,close), low <= min(open,close)）'
    });

    // 価格の異常値チェック
    this.addRule({
      name: 'price-outlier',
      severity: 'warning',
      validate: (data) => {
        if (!data.ohlcv) return true;
        const { close } = data.ohlcv;
        const prevClose = data.previousClose;
        if (!prevClose) return true;
        const change = Math.abs((close - prevClose) / prevClose);
        return change < 0.2; // 20%以上の変動を警告
      },
      message: '価格が異常な変動を示しています'
    });

    // ボリュームの整合性チェック
    this.addRule({
      name: 'volume-consistency',
      severity: 'error',
      validate: (data) => {
        if (!data.ohlcv) return true;
        const { volume } = data.ohlcv;
        return volume >= 0 && Number.isFinite(volume);
      },
      message: 'ボリュームが無効な値です'
    });

    // タイムスタンプの整合性チェック
    this.addRule({
      name: 'timestamp-consistency',
      severity: 'error',
      validate: (data) => {
        const now = Date.now();
        const dataTime = data.timestamp;
        const maxDelay = 60000; // 1分
        return Math.abs(now - dataTime) < maxDelay;
      },
      message: 'データのタイムスタンプが古すぎます'
    });
  }

  addRule(rule: DataQualityRule): void {
    this.rules.push(rule);
  }

  check(data: MarketData): QualityReport {
    const report: QualityReport = {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      metrics: this.calculateMetrics(data)
    };

    for (const rule of this.rules) {
      const isValid = rule.validate(data);
      if (!isValid) {
        if (rule.severity === 'error') {
          report.isValid = false;
          report.errors.push(rule.message);
        } else if (rule.severity === 'warning') {
          report.warnings.push(rule.message);
        } else {
          report.info.push(rule.message);
        }
      }
    }

    return report;
  }

  private calculateMetrics(data: MarketData): QualityMetric[] {
    const metrics: QualityMetric[] = [];

    if (data.ohlcv) {
      const { open, high, low, close, volume } = data.ohlcv;

      // 価格変動率
      metrics.push({
        name: 'price-change',
        value: data.previousClose ? ((close - data.previousClose) / data.previousClose) * 100 : 0,
        unit: '%'
      });

      // 高低幅
      metrics.push({
        name: 'high-low-range',
        value: ((high - low) / low) * 100,
        unit: '%'
      });

      // 実体の大きさ
      metrics.push({
        name: 'body-size',
        value: Math.abs(close - open) / open * 100,
        unit: '%'
      });

      // ボリュームの変動
      metrics.push({
        name: 'volume-change',
        value: data.previousVolume ? ((volume - data.previousVolume) / data.previousVolume) * 100 : 0,
        unit: '%'
      });
    }

    return metrics;
  }
}
```

### 2. データ補完パイプラインの構築

```typescript
// src/data/completion/DataCompletionPipeline.ts
import { MarketData, TimeSeriesData } from '@/types/market';
import { CompletionStrategy, CompletionResult } from '@/types/data-completion';

export class DataCompletionPipeline {
  private strategies: Map<string, CompletionStrategy> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // 線形補間
    this.strategies.set('linear', {
      name: 'Linear Interpolation',
      apply: (data: TimeSeriesData[], gap: number) => {
        const result = [...data];
        const startIdx = data.findIndex(d => d.timestamp === gap);
        const endIdx = startIdx + gap;

        const startValue = data[startIdx - 1]?.value;
        const endValue = data[endIdx]?.value;

        if (startValue !== undefined && endValue !== undefined) {
          for (let i = 1; i < gap; i++) {
            const ratio = i / gap;
            result[startIdx + i - 1] = {
              timestamp: data[startIdx - 1].timestamp + i * 60000, // 1分刻み
              value: startValue + (endValue - startValue) * ratio,
              isImputed: true
            };
          }
        }

        return result;
      }
    });

    // 前方埋め
    this.strategies.set('forward-fill', {
      name: 'Forward Fill',
      apply: (data: TimeSeriesData[], gap: number) => {
        const result = [...data];
        const startIdx = data.findIndex(d => d.timestamp === gap);
        const lastValue = data[startIdx - 1]?.value;

        if (lastValue !== undefined) {
          for (let i = 1; i < gap; i++) {
            result[startIdx + i - 1] = {
              timestamp: data[startIdx - 1].timestamp + i * 60000,
              value: lastValue,
              isImputed: true
            };
          }
        }

        return result;
      }
    });

    // 移動平均
    this.strategies.set('moving-average', {
      name: 'Moving Average',
      apply: (data: TimeSeriesData[], gap: number) => {
        const result = [...data];
        const startIdx = data.findIndex(d => d.timestamp === gap);
        const window = 5;

        const avgValue = this.calculateMovingAverage(data, startIdx - 1, window);

        if (avgValue !== null) {
          for (let i = 1; i < gap; i++) {
            result[startIdx + i - 1] = {
              timestamp: data[startIdx - 1].timestamp + i * 60000,
              value: avgValue,
              isImputed: true
            };
          }
        }

        return result;
      }
    });
  }

  private calculateMovingAverage(data: TimeSeriesData[], index: number, window: number): number | null {
    const start = Math.max(0, index - window + 1);
    const values = data.slice(start, index + 1).map(d => d.value);

    if (values.length === 0) return null;

    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  complete(data: TimeSeriesData[], strategy: string = 'linear'): CompletionResult {
    const gaps = this.detectGaps(data);
    let completedData = [...data];
    const appliedStrategies: string[] = [];

    for (const gap of gaps) {
      const completionStrategy = this.strategies.get(strategy);
      if (completionStrategy) {
        completedData = completionStrategy.apply(completedData, gap);
        appliedStrategies.push(strategy);
      }
    }

    return {
      originalData: data,
      completedData,
      gapsDetected: gaps.length,
      strategiesUsed: appliedStrategies,
      completionRate: this.calculateCompletionRate(data, completedData)
    };
  }

  private detectGaps(data: TimeSeriesData[]): number[] {
    const gaps: number[] = [];
    const expectedInterval = 60000; // 1分

    for (let i = 1; i < data.length; i++) {
      const diff = data[i].timestamp - data[i - 1].timestamp;
      if (diff > expectedInterval * 1.5) {
        gaps.push(Math.floor(diff / expectedInterval));
      }
    }

    return gaps;
  }

  private calculateCompletionRate(original: TimeSeriesData[], completed: TimeSeriesData[]): number {
    const originalLength = original.length;
    const completedLength = completed.length;
    return ((completedLength - originalLength) / originalLength) * 100;
  }
}
```

### 3. マイクロストラクチャーデータの統合

```typescript
// src/data/microstructure/MicrostructureDataProcessor.ts
import { OrderBook, Trade, OrderFlow } from '@/types/microstructure';

export interface MicrostructureMetrics {
  bidAskSpread: number;
  orderImbalance: number;
  volumeWeightedAveragePrice: number;
  priceImpact: number;
  liquidityDepth: number;
}

export class MicrostructureDataProcessor {
  private orderBook: OrderBook | null = null;
  private recentTrades: Trade[] = [];
  private orderFlow: OrderFlow[] = [];

  updateOrderBook(orderBook: OrderBook): void {
    this.orderBook = orderBook;
    this.processOrderFlow(orderBook);
  }

  addTrade(trade: Trade): void {
    this.recentTrades.push(trade);
    // 最新の100件のみ保持
    if (this.recentTrades.length > 100) {
      this.recentTrades.shift();
    }
  }

  private processOrderFlow(orderBook: OrderBook): void {
    if (!this.orderBook) return;

    // 注文フローの変化を計算
    const flow: OrderFlow = {
      timestamp: Date.now(),
      bidVolumeChange: this.calculateVolumeChange(this.orderBook.bids, orderBook.bids),
      askVolumeChange: this.calculateVolumeChange(this.orderBook.asks, orderBook.asks),
      priceChange: orderBook.midPrice - this.orderBook.midPrice
    };

    this.orderFlow.push(flow);
    if (this.orderFlow.length > 50) {
      this.orderFlow.shift();
    }

    this.orderBook = orderBook;
  }

  private calculateVolumeChange(old: [number, number][], current: [number, number][]): number {
    const oldVolume = old.reduce((sum, [_, volume]) => sum + volume, 0);
    const currentVolume = current.reduce((sum, [_, volume]) => sum + volume, 0);
    return currentVolume - oldVolume;
  }

  calculateMetrics(): MicrostructureMetrics | null {
    if (!this.orderBook) return null;

    const { bids, asks, midPrice } = this.orderBook;

    return {
      bidAskSpread: (asks[0]?.[0] || 0) - (bids[0]?.[0] || 0),
      orderImbalance: this.calculateOrderImbalance(),
      volumeWeightedAveragePrice: this.calculateVWAP(),
      priceImpact: this.calculatePriceImpact(),
      liquidityDepth: this.calculateLiquidityDepth()
    };
  }

  private calculateOrderImbalance(): number {
    if (!this.orderBook) return 0;

    const bidVolume = this.orderBook.bids.slice(0, 5).reduce((sum, [_, volume]) => sum + volume, 0);
    const askVolume = this.orderBook.asks.slice(0, 5).reduce((sum, [_, volume]) => sum + volume, 0);

    return (bidVolume - askVolume) / (bidVolume + askVolume);
  }

  private calculateVWAP(): number {
    if (this.recentTrades.length === 0) return 0;

    const totalVolume = this.recentTrades.reduce((sum, trade) => sum + trade.volume, 0);
    const totalValue = this.recentTrades.reduce((sum, trade) => sum + trade.price * trade.volume, 0);

    return totalValue / totalVolume;
  }

  private calculatePriceImpact(): number {
    if (this.orderFlow.length < 2) return 0;

    const recent = this.orderFlow[this.orderFlow.length - 1];
    const previous = this.orderFlow[this.orderFlow.length - 2];

    return Math.abs(recent.priceChange);
  }

  private calculateLiquidityDepth(): number {
    if (!this.orderBook) return 0;

    const bidDepth = this.orderBook.bids.reduce((sum, [_, volume]) => sum + volume, 0);
    const askDepth = this.orderBook.asks.reduce((sum, [_, volume]) => sum + volume, 0);

    return bidDepth + askDepth;
  }

  detectLiquidityCrisis(): boolean {
    const metrics = this.calculateMetrics();
    if (!metrics) return false;

    // 流動性危機の検出条件
    return (
      metrics.bidAskSpread > 0.01 || // スプレッドが1%以上
      metrics.liquidityDepth < 1000 || // 深さが不足
      metrics.orderImbalance > 0.8 // 注文の不均衡が大きい
    );
  }
}
```

### 4. データ遅延監視システム

```typescript
// src/data/latency/DataLatencyMonitor.ts
import { EventEmitter } from 'events';

export interface LatencyMetrics {
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  p95Latency: number;
  p99Latency: number;
  lastUpdate: number;
}

export interface LatencyAlert {
  level: 'warning' | 'critical';
  latency: number;
  threshold: number;
  timestamp: number;
}

export class DataLatencyMonitor extends EventEmitter {
  private latencies: number[] = [];
  private maxSamples = 1000;
  private warningThreshold = 1000; // 1秒
  private criticalThreshold = 5000; // 5秒

  recordLatency(latency: number, source: string): void {
    this.latencies.push(latency);
    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift();
    }

    // アラートのチェック
    if (latency > this.criticalThreshold) {
      this.emit('alert', {
        level: 'critical',
        latency,
        threshold: this.criticalThreshold,
        timestamp: Date.now(),
        source
      } as LatencyAlert);
    } else if (latency > this.warningThreshold) {
      this.emit('alert', {
        level: 'warning',
        latency,
        threshold: this.warningThreshold,
        timestamp: Date.now(),
        source
      } as LatencyAlert);
    }
  }

  getMetrics(): LatencyMetrics {
    if (this.latencies.length === 0) {
      return {
        averageLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        lastUpdate: Date.now()
      };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const sum = this.latencies.reduce((a, b) => a + b, 0);

    return {
      averageLatency: sum / this.latencies.length,
      maxLatency: sorted[sorted.length - 1],
      minLatency: sorted[0],
      p95Latency: sorted[Math.floor(sorted.length * 0.95)],
      p99Latency: sorted[Math.floor(sorted.length * 0.99)],
      lastUpdate: Date.now()
    };
  }

  setThresholds(warning: number, critical: number): void {
    this.warningThreshold = warning;
    this.criticalThreshold = critical;
  }

  reset(): void {
    this.latencies = [];
  }

  getLatencyHistory(): number[] {
    return [...this.latencies];
  }
}
```

## 実装計画

### フェーズ1: データ品質チェックエンジン（2週間）
- [ ] データ品質チェックルールの定義
- [ ] 基本的な整合性チェックの実装
- [ ] 異常値検出の実装
- [ ] 品質レポートの生成機能
- [ ] ユニットテストの作成

### フェーズ2: データ補完パイプライン（2週間）
- [ ] データギャップ検出の実装
- [ ] 複数の補完戦略の実装
- [ ] 補完結果の検証機能
- [ ] パイプラインの最適化
- [ ] 統合テストの作成

### フェーズ3: マイクロストラクチャーデータ統合（2週間）
- [ ] オーダーブック処理の実装
- [ ] 注文フロー分析の実装
- [ ] マイクロストラクチャーメトリクスの計算
- [ ] 流動性危機検出の実装
- [ ] パフォーマンステストの作成

### フェーズ4: データ遅延監視システム（2週間）
- [ ] 遅延測定の実装
- [ ] アラートシステムの構築
- [ ] メトリクス収集と可視化
- [ ] しきい値の動的調整
- [ ] E2Eテストの作成

## 成功基準
- データ品質チェックのカバレッジ95%以上
- データ補完の精度90%以上
- マイクロストラクチャーデータのリアルタイム処理（遅延<100ms）
- データ遅延の検出精度99%以上

## 関連Issue
- TRADING-002: 取引戦略とシグナル生成の精度向上
- TRADING-005: パフォーマンス監視とメトリクスの強化

## ラベル
enhancement, data-quality, priority:high
