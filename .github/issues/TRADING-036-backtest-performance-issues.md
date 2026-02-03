---
title: バックテストエンジンのパフォーマンス問題（O(n²)複雑性）
title_en: Backtest Engine Performance Issues (O(n²) Complexity)
labels: performance, optimization, medium-priority, technical-debt
severity: Medium
priority: P2
---

## 説明 (Description)

バックテストエンジンに複数のパフォーマンス上の問題があり、特にデータセットが大きくなると処理時間が指数関数的に増加します。主な問題は O(n²) の時間複雑性を持つループ処理です。

### 問題のあるコードパターン

#### 1. BacktestService - データスライス処理 (Line 74)

```typescript
for (let i = 50; i < filteredData.length; i++) {
  const currentData = filteredData.slice(0, i + 1);  // ❌ O(n) コピー
  const currentCandle = filteredData[i];
  
  // 各イテレーションで配列をコピー
  // 総コスト: O(n²)
}
```

**問題**: 各イテレーションで `slice(0, i+1)` が新しい配列を作成し、データをコピーします。データが10,000ポイントある場合、総コピー要素数は約 5,000万個になります。

#### 2. メトリクス計算での重複ループ (calculateBacktestMetrics)

```typescript
// Lines 393-407
const closedTrades = trades.filter(trade => trade.exitPrice !== 0 && trade.exitDate !== '');
const totalTrades = closedTrades.length;
const winningTrades = closedTrades.filter(trade => (trade.profitPercent || 0) > 0).length;
const losingTrades = totalTrades - winningTrades;

const profits = closedTrades.filter(trade => (trade.profitPercent || 0) > 0).map(t => t.profitPercent || 0);
const losses = closedTrades.filter(trade => (trade.profitPercent || 0) < 0).map(t => t.profitPercent || 0);

const avgProfit = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
```

**問題**: 同じ配列に対して複数回 `filter` と `reduce` を実行。単一パスで処理可能。

#### 3. ドローダウン計算の非効率 (Lines 411-428)

```typescript
let peak = initialCapital;
let maxDrawdown = 0;
let currentEquity = initialCapital;

for (const trade of closedTrades) {
  const tradeReturn = (trade.profitPercent || 0) / 100 * initialCapital;
  currentEquity += tradeReturn;  // ❌ 正確な資産計算ではない
  
  if (currentEquity > peak) {
    peak = currentEquity;
  }
  
  const drawdown = ((peak - currentEquity) / peak) * 100;
  if (drawdown > maxDrawdown) {
    maxDrawdown = drawdown;
  }
}
```

**問題**: 
- 日次の資産推移を使用していないため、正確なドローダウンが計算できない
- トレードベースではなく、日次ベースの計算が必要

## 影響 (Impact)

- **重大度: Medium**
- **処理時間の増大**: 大きなデータセットで数分〜数時間の処理時間
- **メモリ使用量の増大**: 配列コピーによるメモリ圧迫
- **ユーザーエクスペリエンスの低下**: リアルタイムバックテストが不可能
- **スケーラビリティの制限**: 高頻度データや長期間のバックテストが困難

## 推奨される解決策 (Recommended Solution)

### 1. データスライスの最適化

```typescript
// 修正版: インデックスベースのアクセス
class BacktestService {
  private historicalData: OHLCV[] = [];
  
  async runBacktest(...): Promise<BacktestResult> {
    this.historicalData = filteredData;
    
    for (let i = 50; i < filteredData.length; i++) {
      // slice を使用せず、インデックスでアクセス
      const currentCandle = filteredData[i];
      
      // インジケーター計算が必要な場合は、ウィンドウのみを渡す
      const indicators = this.calculateIndicatorsForWindow(i);
      
      // ... rest of logic
    }
  }
  
  private calculateIndicatorsForWindow(endIndex: number): Indicators {
    // 必要なデータのみを効率的に計算
    const windowStart = Math.max(0, endIndex - 200); // 最大200期間
    const window = this.historicalData.slice(windowStart, endIndex + 1);
    
    return mlPredictionService.calculateIndicators(window);
  }
}
```

### 2. インクリメンタル計算の実装

```typescript
class IncrementalBacktestProcessor {
  private runningStats = {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    sumReturns: 0,
    sumSquaredReturns: 0
  };

  onTradeClosed(trade: BacktestTrade): void {
    this.runningStats.totalTrades++;
    
    const profit = trade.profitPercent || 0;
    this.runningStats.sumReturns += profit;
    this.runningStats.sumSquaredReturns += profit * profit;
    
    if (profit > 0) {
      this.runningStats.winningTrades++;
      this.runningStats.totalProfit += profit;
    } else if (profit < 0) {
      this.runningStats.losingTrades++;
      this.runningStats.totalLoss += profit;
    }
  }

  getMetrics(): BacktestMetrics {
    const n = this.runningStats.totalTrades;
    
    return {
      totalTrades: n,
      winningTrades: this.runningStats.winningTrades,
      losingTrades: this.runningStats.losingTrades,
      winRate: n > 0 ? (this.runningStats.winningTrades / n) * 100 : 0,
      avgProfit: this.runningStats.winningTrades > 0 
        ? this.runningStats.totalProfit / this.runningStats.winningTrades 
        : 0,
      avgLoss: this.runningStats.losingTrades > 0 
        ? this.runningStats.totalLoss / this.runningStats.losingTrades 
        : 0,
      volatility: this.calculateVolatility()
    };
  }

  private calculateVolatility(): number {
    const n = this.runningStats.totalTrades;
    if (n < 2) return 0;
    
    const mean = this.runningStats.sumReturns / n;
    const variance = (this.runningStats.sumSquaredReturns / n) - (mean * mean);
    
    return Math.sqrt(variance);
  }
}
```

### 3. Web Worker による並列処理

```typescript
// backtest.worker.ts
self.onmessage = async (event) => {
  const { stock, historicalData, config } = event.data;
  
  const backtestService = new BacktestService();
  const result = await backtestService.runBacktest(stock, historicalData, config);
  
  self.postMessage({ type: 'complete', result });
};

// メインスレッド
class ParallelBacktestRunner {
  private workers: Worker[] = [];
  private maxWorkers = navigator.hardwareConcurrency || 4;

  async runParallelBacktests(
    strategies: Strategy[],
    stock: Stock,
    historicalData: OHLCV[],
    config: BacktestConfig
  ): Promise<BacktestResult[]> {
    const chunks = this.chunkStrategies(strategies, this.maxWorkers);
    const promises: Promise<BacktestResult[]>[] = [];

    for (const chunk of chunks) {
      promises.push(this.runWorkerChunk(chunk, stock, historicalData, config));
    }

    const results = await Promise.all(promises);
    return results.flat();
  }

  private runWorkerChunk(
    strategies: Strategy[],
    stock: Stock,
    historicalData: OHLCV[],
    config: BacktestConfig
  ): Promise<BacktestResult[]> {
    return new Promise((resolve) => {
      const worker = new Worker('./backtest.worker.ts');
      
      worker.postMessage({
        strategies,
        stock,
        historicalData,
        config
      });
      
      worker.onmessage = (event) => {
        if (event.data.type === 'complete') {
          resolve(event.data.results);
          worker.terminate();
        }
      };
    });
  }
}
```

### 4. メモ化（Memoization）の活用

```typescript
class IndicatorCache {
  private cache = new Map<string, Indicators>();
  private maxCacheSize = 1000;

  getKey(data: OHLCV[]): string {
    // データのハッシュを生成
    const lastCandle = data[data.length - 1];
    return `${lastCandle.date}_${data.length}`;
  }

  get(data: OHLCV[]): Indicators | undefined {
    const key = this.getKey(data);
    return this.cache.get(key);
  }

  set(data: OHLCV[], indicators: Indicators): void {
    if (this.cache.size >= this.maxCacheSize) {
      // LRU eviction
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const key = this.getKey(data);
    this.cache.set(key, indicators);
  }
}
```

## パフォーマンスベンチマーク目標

| データサイズ | 現在の処理時間 | 目標処理時間 | 改善率 |
|------------|--------------|-------------|--------|
| 1,000件 | 2秒 | 0.5秒 | 75% |
| 10,000件 | 30秒 | 3秒 | 90% |
| 100,000件 | 10分 | 30秒 | 95% |

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:74)
- [`trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts`](trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts)
- [`trading-platform/app/lib/mlPrediction.ts`](trading-platform/app/lib/mlPrediction.ts)

## 受け入れ基準 (Acceptance Criteria)

- [ ] O(n²) のループが O(n) または O(n log n) に改善される
- [ ] 10,000件のデータで3秒以内に処理が完了
- [ ] メモリ使用量が50%削減される
- [ ] Web Worker による並列処理が実装される
- [ ] インジケーター計算にメモ化が適用される
- [ ] パフォーマンスベンチマークテストが追加される

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Performance Team
