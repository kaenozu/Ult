# 🚨 TOP 3 Critical Issues - Detailed Action Plan

**作成日**: 2026-01-29  
**プロジェクト**: Trader Pro - 株式取引予測プラットフォーム  
**優先度**: Critical (即座対応必須)

---

## 📊 イシューサマリー

| ランク | イシュー | カテゴリ | 重要度 | 緊急度 | 推定工数 |
|--------|----------|----------|--------|--------|----------|
| 1 | バックテスト計算の計算量爆発 | パフォーマンス | 🔴 Critical | 🔴 High | 3-4日 |
| 2 | 注文処理の競合状態 (Race Condition) | セキュリティ/整合性 | 🔴 Critical | 🔴 High | 2-3日 |
| 3 | Yahoo Finance APIデータ欠損処理 | データ品質 | 🔴 Critical | 🟡 Medium | 1-2日 |

---

## 🔴 Issue #1: バックテスト計算の計算量爆発

### 問題の詳細

**場所**: 
- [`AccuracyService.ts`](trading-platform/app/lib/AccuracyService.ts:272) - `runBacktest` メソッド
- [`SignalPanel/index.tsx`](trading-platform/app/components/SignalPanel/index.tsx:104) - バックテスト呼び出し

**現在の問題コード**:
```typescript
// AccuracyService.ts lines 299-302
for (let i = minPeriod; i < data.length - 1; i++) {
    const historicalWindow = data.slice(Math.max(0, i - OPTIMIZATION.MIN_DATA_PERIOD + 10), i + 1);
    const signal = analysisService.analyzeStock(symbol, historicalWindow, market);
    // analyzeStock はさらに optimizeParameters を呼び出し...
}
```

**計算量分析**:
```
ループ回数: N (データ期間)
├─ analyzeStock: O(1)
│  └─ optimizeParameters: O(P × Q) 
│     ├─ P: RSI期間オプション数 (3)
│     ├─ Q: SMA期間オプション数 (4)
│     └─ 各組み合わせで内部CalculatePerformance: O(N)
│
総計算量: O(N × P × Q × N) = O(N² × 12)

例: 1年データ (252日)
- 理論上: 252 × 12 × 252 = 760,000+ 回の計算
- 実際: メインスレッドブロック、UIフリーズ
```

### リスク評価

| リスク項目 | レベル | 説明 |
|------------|--------|------|
| ユーザー体験 | 🔴 Critical | ブラウザフリーズ、強制終了の必要 |
| データ整合性 | 🟡 Medium | 計算中断による不完全な結果 |
| システム負荷 | 🔴 Critical | メモリ使用量急増、クラッシュの可能性 |
| ビジネス影響 | 🔴 Critical | ユーザー離脱、信頼性低下 |

### 推奨修正アプローチ

#### Phase 1: 即座の軽減策 (1日)

```typescript
// SignalPanel/index.tsx - Web Worker 導入
// app/workers/backtest.worker.ts

import { runBacktest } from '@/app/lib/backtest';

self.onmessage = (e: MessageEvent) => {
  const { symbol, data, market } = e.data;
  
  try {
    const result = runBacktest(symbol, data, market);
    self.postMessage({ type: 'SUCCESS', result });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: String(error) });
  }
};

export {};
```

```typescript
// SignalPanel/index.tsx - 修正版
import { useEffect, useRef, useCallback } from 'react';

export function SignalPanel({ stock, signal, ohlcv = [], loading = false }: SignalPanelProps) {
  const workerRef = useRef<Worker | null>(null);

  // Web Worker の初期化
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('@/app/workers/backtest.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (e) => {
      const { type, result, error } = e.data;
      if (type === 'SUCCESS') {
        setBacktestResult(result);
      } else {
        console.error('Backtest failed:', error);
      }
      setIsBacktesting(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // バックテスト実行
  useEffect(() => {
    if (activeTab === 'backtest' && !backtestResult && !isBacktesting && ohlcv?.length > 0) {
      setIsBacktesting(true);
      // メインスレッドをブロックしない
      workerRef.current?.postMessage({
        symbol: stock.symbol,
        data: ohlcv,
        market: stock.market
      });
    }
  }, [activeTab, backtestResult, isBacktesting, ohlcv, stock]);
}
```

#### Phase 2: アルゴリズム最適化 (2-3日)

```typescript
// AccuracyService.ts - メモ化パターン導入

class AccuracyService {
  // パラメータ最適化結果のキャッシュ
  private paramCache = new Map<string, OptimizedParams>();
  
  // キャッシュキー生成
  private getCacheKey(symbol: string, data: OHLCV[]): string {
    const dataHash = data.slice(-30).map(d => d.close).join(',');
    return `${symbol}:${dataHash}`;
  }

  /**
   * 最適化パラメータの取得（キャッシュ対応）
   */
  getOptimizedParams(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): OptimizedParams {
    const cacheKey = this.getCacheKey(symbol, data);
    
    if (this.paramCache.has(cacheKey)) {
      return this.paramCache.get(cacheKey)!;
    }
    
    const params = analysisService.optimizeParameters(data, market);
    this.paramCache.set(cacheKey, params);
    
    // キャッシュサイズ制限（LRU）
    if (this.paramCache.size > 100) {
      const firstKey = this.paramCache.keys().next().value;
      this.paramCache.delete(firstKey);
    }
    
    return params;
  }

  /**
   * 最適化済みバックテスト
   * バックテスト前に一度だけパラメータ最適化を実行
   */
  runOptimizedBacktest(symbol: string, data: OHLCV[], market: 'japan' | 'usa'): BacktestResult {
    // 1回だけパラメータ最適化
    const optimizedParams = this.getOptimizedParams(symbol, data, market);
    
    // 固定パラメータでバックテスト実行
    return this.runBacktestWithFixedParams(symbol, data, market, optimizedParams);
  }

  /**
   * 固定パラメータでのバックテスト
   * 計算量: O(N) - 線形時間
   */
  private runBacktestWithFixedParams(
    symbol: string, 
    data: OHLCV[], 
    market: 'japan' | 'usa',
    params: OptimizedParams
  ): BacktestResult {
    const trades: BacktestTrade[] = [];
    let currentPosition: { type: 'BUY' | 'SELL', price: number, date: string } | null = null;

    // 事前計算: RSIとSMAを一度だけ計算
    const closes = data.map(d => d.close);
    const rsiValues = technicalIndicatorService.calculateRSI(closes, params.rsiPeriod);
    const smaValues = technicalIndicatorService.calculateSMA(closes, params.smaPeriod);

    for (let i = minPeriod; i < data.length - 1; i++) {
      const nextDay = data[i + 1];
      
      // 事前計算済みの値を使用（O(1)）
      const currentRSI = rsiValues[i];
      const currentSMA = smaValues[i];
      
      // シグナル判定（最適化済みパラメータ使用）
      const signal = this.determineSignalFromParams(
        closes[i], 
        currentSMA, 
        currentRSI, 
        params
      );
      
      // ... 残りのロジック
    }
    
    return this.calculateStats(trades, symbol, startDate, endDate);
  }
}
```

#### Phase 3: インクリメンタル計算 (1日)

```typescript
// チャンク処理による非ブロッキング計算
async function runIncrementalBacktest(
  symbol: string, 
  data: OHLCV[], 
  market: 'japan' | 'usa',
  onProgress: (progress: number) => void
): Promise<BacktestResult> {
  const chunkSize = 50;
  const trades: BacktestTrade[] = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
    
    // チャンク処理
    const chunkTrades = await processChunk(chunk);
    trades.push(...chunkTrades);
    
    // 進捗報告
    onProgress(Math.min(100, (i / data.length) * 100));
    
    // イベントループに制御を戻す
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return calculateStats(trades, symbol, startDate, endDate);
}
```

### 実装ステップ

1. **Day 1**: Web Worker 導入、即座の軽減
2. **Day 2-3**: メモ化パターン実装、パラメータキャッシュ
3. **Day 4**: インクリメンタル計算、進捗表示

### テスト計画

```typescript
// __tests__/backtest-performance.test.ts

describe('Backtest Performance', () => {
  it('should complete backtest for 1 year data within 2 seconds', async () => {
    const data = generateMockData(252); // 1年分
    const startTime = performance.now();
    
    const result = await runOptimizedBacktest('7203', data, 'japan');
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(2000);
  });

  it('should not block UI during backtest', async () => {
    let uiResponsive = false;
    
    // UI応答性チェック
    setTimeout(() => { uiResponsive = true; }, 100);
    
    await runOptimizedBacktest('7203', largeDataset, 'japan');
    
    expect(uiResponsive).toBe(true);
  });
});
```

---

## 🔴 Issue #2: 注文処理の競合状態 (Race Condition)

### 問題の詳細

**場所**: 
- [`OrderPanel.tsx`](trading-platform/app/components/OrderPanel.tsx:31) - `handleOrder` メソッド
- [`tradingStore.ts`](trading-platform/app/store/tradingStore.ts:1) - 状態管理

**現在の問題コード**:
```typescript
// OrderPanel.tsx lines 31-56
const handleOrder = () => {
  if (quantity <= 0) return;
  if (side === 'BUY' && !canAfford) return;

  // 問題: 非アトミックな複数の状態更新
  const result = executeOrder({
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    side: side === 'BUY' ? 'LONG' : 'SHORT',
    quantity: quantity,
    avgPrice: price,
    currentPrice: price,
    change: stock.change,
    entryDate: new Date().toISOString().split('T')[0],
  });

  if (result.success) {
    setIsConfirming(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }
};
```

```typescript
// tradingStore.ts - 問題のある実装
addPosition: (position) => set((state) => ({
  portfolio: {
    ...state.portfolio,
    positions: [...state.portfolio.positions, position],
  }
})),

setCash: (amount) => set((state) => ({
  portfolio: {
    ...state.portfolio,
    cash: amount,  // 古い値に基づく計算の可能性
  }
})),
```

**競合シナリオ**:
```
タイムライン:
T1: ユーザーAが注文実行 (cash: 1,000,000)
T2: ポジション追加 (positions更新)
T3: WebSocketで価格更新 (cash変動)
T4: ユーザーAのsetCash実行 (古いcash: 1,000,000 - cost)
    → T3の更新が上書きされる！
T5: 整合性エラー: cashとpositionsの合計が合わない
```

### リスク評価

| リスク項目 | レベル | 説明 |
|------------|--------|------|
| 資金整合性 | 🔴 Critical | 二重支出、マイナス残高の可能性 |
| ポジション管理 | 🔴 Critical | 実際の資金とポジションが一致しない |
| コンプライアンス | 🔴 Critical | 取引記録の不正確さ |
| ユーザー信頼 | 🔴 Critical | 資産表示の不正確さ |

### 推奨修正アプローチ

#### Phase 1: アトミックな注文実行 (1日)

```typescript
// types/order.ts
export interface OrderRequest {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  side: 'LONG' | 'SHORT';
  quantity: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT';
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  remainingCash?: number;
  newPosition?: Position;
}
```

```typescript
// store/tradingStore.ts - アトミック実装

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // ... 既存の状態

      /**
       * アトミックな注文実行
       * 残高確認、ポジション追加、現金減算を単一のトランザクションで実行
       */
      executeOrder: (order: OrderRequest): OrderResult => {
        const { portfolio } = get();
        const totalCost = order.quantity * order.price;
        
        // 1. バリデーション（読み取り）
        if (order.side === 'LONG' && portfolio.cash < totalCost) {
          return { 
            success: false, 
            error: `Insufficient funds. Required: ${totalCost}, Available: ${portfolio.cash}` 
          };
        }

        // 2. 既存ポジションチェック
        const existingPosition = portfolio.positions.find(p => p.symbol === order.symbol);
        
        // 3. 新しいポジション作成
        const newPosition: Position = existingPosition
          ? {
              ...existingPosition,
              quantity: existingPosition.quantity + order.quantity,
              avgPrice: (existingPosition.avgPrice * existingPosition.quantity + order.price * order.quantity) 
                       / (existingPosition.quantity + order.quantity),
            }
          : {
              symbol: order.symbol,
              name: order.name,
              market: order.market,
              quantity: order.quantity,
              avgPrice: order.price,
              currentPrice: order.price,
              change: 0,
              entryDate: new Date().toISOString().split('T')[0],
            };

        // 4. アトミックな状態更新（単一のset）
        set((state) => ({
          portfolio: {
            ...state.portfolio,
            cash: order.side === 'LONG' 
              ? state.portfolio.cash - totalCost 
              : state.portfolio.cash + totalCost,
            positions: existingPosition
              ? state.portfolio.positions.map(p => 
                  p.symbol === order.symbol ? newPosition : p
                )
              : [...state.portfolio.positions, newPosition],
            orders: [
              ...state.portfolio.orders,
              {
                id: generateOrderId(),
                ...order,
                timestamp: new Date().toISOString(),
                status: 'FILLED',
              }
            ],
          }
        }));

        return {
          success: true,
          orderId: generateOrderId(),
          remainingCash: portfolio.cash - totalCost,
          newPosition,
        };
      },

      /**
       * ポジション決済（アトミック）
       */
      closePosition: (symbol: string, exitPrice: number): OrderResult => {
        const { portfolio } = get();
        const position = portfolio.positions.find(p => p.symbol === symbol);
        
        if (!position) {
          return { success: false, error: 'Position not found' };
        }

        const proceeds = position.quantity * exitPrice;
        const profit = position.side === 'LONG'
          ? proceeds - (position.quantity * position.avgPrice)
          : (position.quantity * position.avgPrice) - proceeds;

        // アトミックな更新
        set((state) => ({
          portfolio: {
            ...state.portfolio,
            cash: state.portfolio.cash + proceeds,
            positions: state.portfolio.positions.filter(p => p.symbol !== symbol),
            closedPositions: [
              ...state.portfolio.closedPositions,
              { ...position, exitPrice, profit, exitDate: new Date().toISOString() }
            ],
          }
        }));

        return {
          success: true,
          remainingCash: portfolio.cash + proceeds,
        };
      },
    }),
    {
      name: 'trading-storage',
      // 永続化設定
    }
  )
);
```

#### Phase 2: 楽観的ロックと再試行 (1日)

```typescript
// hooks/useOrderExecution.ts

import { useState, useCallback } from 'react';
import { useTradingStore } from '@/app/store/tradingStore';

interface UseOrderExecutionOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export function useOrderExecution(options: UseOrderExecutionOptions = {}) {
  const { maxRetries = 3, retryDelay = 100 } = options;
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const executeOrder = useTradingStore(state => state.executeOrder);

  const submitOrder = useCallback(async (order: OrderRequest): Promise<OrderResult> => {
    setIsExecuting(true);
    setError(null);

    let lastError: string | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = executeOrder(order);
        
        if (result.success) {
          setIsExecuting(false);
          return result;
        }
        
        // 再試行可能なエラー（競合など）
        if (result.error?.includes('conflict') || result.error?.includes('stale')) {
          lastError = result.error;
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        
        // 致命的エラー
        setError(result.error);
        setIsExecuting(false);
        return result;
        
      } catch (e) {
        lastError = String(e);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    setError(lastError || 'Order execution failed after retries');
    setIsExecuting(false);
    return { success: false, error: lastError };
  }, [executeOrder, maxRetries, retryDelay]);

  return {
    submitOrder,
    isExecuting,
    error,
  };
}
```

#### Phase 3: 注文キューと順序保証 (1日)

```typescript
// lib/orderQueue.ts

interface QueuedOrder {
  id: string;
  order: OrderRequest;
  resolve: (result: OrderResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class OrderQueue {
  private queue: QueuedOrder[] = [];
  private isProcessing = false;

  enqueue(order: OrderRequest): Promise<OrderResult> {
    return new Promise((resolve, reject) => {
      const queuedOrder: QueuedOrder = {
        id: generateOrderId(),
        order,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(queuedOrder);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const queued = this.queue.shift()!;
      
      try {
        const result = await this.executeOrder(queued.order);
        queued.resolve(result);
      } catch (error) {
        queued.reject(error instanceof Error ? error : new Error(String(error)));
      }

      // 小さな遅延でイベントループに制御を戻す
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  private async executeOrder(order: OrderRequest): Promise<OrderResult> {
    const store = useTradingStore.getState();
    return store.executeOrder(order);
  }
}

export const orderQueue = new OrderQueue();
```

### 実装ステップ

1. **Day 1**: アトミックな `executeOrder` 実装
2. **Day 2**: 楽観的ロックと再試行ロジック
3. **Day 3**: 注文キューと順序保証

### テスト計画

```typescript
// __tests__/order-execution.test.ts

describe('Order Execution Atomicity', () => {
  it('should maintain consistency with concurrent orders', async () => {
    const store = useTradingStore.getState();
    const initialCash = store.portfolio.cash;
    
    // 同時に複数の注文を実行
    const orders = await Promise.all([
      store.executeOrder({ symbol: 'AAPL', quantity: 10, price: 100, side: 'LONG' }),
      store.executeOrder({ symbol: 'MSFT', quantity: 5, price: 200, side: 'LONG' }),
      store.executeOrder({ symbol: 'GOOGL', quantity: 2, price: 500, side: 'LONG' }),
    ]);
    
    const finalCash = store.portfolio.cash;
    const totalCost = orders
      .filter(o => o.success)
      .reduce((sum, o) => sum + (o.newPosition?.quantity || 0) * (o.newPosition?.avgPrice || 0), 0);
    
    // 整合性チェック
    expect(finalCash).toBe(initialCash - totalCost);
  });

  it('should prevent double spending', async () => {
    const store = useTradingStore.getState();
    const cash = store.portfolio.cash;
    
    // 残高を超える注文を同時に実行
    const orders = await Promise.all([
      store.executeOrder({ symbol: 'AAPL', quantity: 1000, price: cash, side: 'LONG' }),
      store.executeOrder({ symbol: 'MSFT', quantity: 1000, price: cash, side: 'LONG' }),
    ]);
    
    // 最大1つだけ成功するはず
    const successCount = orders.filter(o => o.success).length;
    expect(successCount).toBeLessThanOrEqual(1);
  });
});
```

---

## 🔴 Issue #3: Yahoo Finance APIデータ欠損処理

### 問題の詳細

**場所**: [`app/api/market/route.ts`](trading-platform/app/api/market/route.ts:182)

**現在の問題コード**:
```typescript
// lines 182-189
return {
  date: dateStr,
  open: q.open || 0,  // null → 0 (価格急落のように見える！)
  high: q.high || 0,
  low: q.low || 0,
  close: q.close || 0,
  volume: q.volume || 0,
};
```

**問題の影響**:
```
実際のデータ: [100, 101, null, 103, 104]
現在の処理: [100, 101, 0, 103, 104]  ← 0が価格急落として表示される
                    ↑
              ボリンジャーバンドが大きく狂う
              移動平均線が不正確になる
              シグナル生成に悪影響
```

### リスク評価

| リスク項目 | レベル | 説明 |
|------------|--------|------|
| チャート表示 | 🔴 Critical | 誤った価格スパイク表示 |
| テクニカル指標 | 🔴 Critical | MA、BB、RSIの計算が不正確 |
| シグナル精度 | 🔴 Critical | 誤った取引シグナル生成 |
| ユーザー判断 | 🔴 Critical | 誤った投資判断の原因 |

### 推奨修正アプローチ

#### Phase 1: 前日終値による補間 (1日)

```typescript
// app/api/market/route.ts - 修正版

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isInterpolated?: boolean;  // 補間データフラグ
}

function processQuotesWithInterpolation(
  quotes: YahooQuoteResult[]
): OHLCVData[] {
  const result: OHLCVData[] = [];
  let lastValidClose: number | null = null;

  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i];
    
    // 有効なデータかチェック
    const hasValidData = q.close !== null && q.close !== undefined && q.close > 0;
    
    if (hasValidData) {
      // 有効なデータ
      result.push({
        date: formatDate(q.date),
        open: q.open ?? lastValidClose ?? q.close,
        high: q.high ?? Math.max(q.open ?? q.close, q.close),
        low: q.low ?? Math.min(q.open ?? q.close, q.close),
        close: q.close,
        volume: q.volume ?? 0,
        isInterpolated: false,
      });
      lastValidClose = q.close;
    } else if (lastValidClose !== null) {
      // 欠損データを前日終値で補間
      result.push({
        date: formatDate(q.date),
        open: lastValidClose,
        high: lastValidClose,
        low: lastValidClose,
        close: lastValidClose,
        volume: 0,  // 欠損日は出来高0
        isInterpolated: true,
      });
    }
    // 最初から欠損している場合はスキップ
  }

  return result;
}
```

#### Phase 2: 線形補間によるスムージング (オプション)

```typescript
// lib/dataInterpolation.ts

export function linearInterpolate(
  data: OHLCVData[],
  maxGapDays: number = 5
): OHLCVData[] {
  const result: OHLCVData[] = [];
  let gapStart: number | null = null;
  let gapStartValue: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (data[i].isInterpolated) {
      if (gapStart === null) {
        gapStart = i - 1;
        gapStartValue = data[gapStart]?.close ?? null;
      }
    } else {
      if (gapStart !== null && gapStartValue !== null) {
        // ギャップ終了、補間を適用
        const gapEnd = i;
        const gapEndValue = data[i].close;
        const gapSize = gapEnd - gapStart;

        if (gapSize <= maxGapDays) {
          // 許容範囲内なら線形補間
          for (let j = gapStart + 1; j < gapEnd; j++) {
            const ratio = (j - gapStart) / gapSize;
            const interpolatedValue = gapStartValue + (gapEndValue - gapStartValue) * ratio;
            
            result[j] = {
              ...result[j],
              open: interpolatedValue,
              high: interpolatedValue,
              low: interpolatedValue,
              close: interpolatedValue,
            };
          }
        }
        // ギャップが大きすぎる場合はそのまま（大きな欠損は除外すべき）
      }
      gapStart = null;
      gapStartValue = null;
    }
    result.push(data[i]);
  }

  return result;
}
```

#### Phase 3: UIでの補間データ表示 (1日)

```typescript
// components/StockChart/InterpolatedDataIndicator.tsx

import React from 'react';
import { OHLCVData } from '@/app/types';

interface InterpolatedDataIndicatorProps {
  data: OHLCVData[];
}

export function InterpolatedDataIndicator({ data }: InterpolatedDataIndicatorProps) {
  const interpolatedCount = data.filter(d => d.isInterpolated).length;
  
  if (interpolatedCount === 0) return null;

  return (
    <div className="absolute top-2 right-2 z-10 bg-yellow-500/20 border border-yellow-500/50 rounded px-2 py-1 text-xs text-yellow-400">
      <span className="font-bold">⚠️ 補間データ:</span> {interpolatedCount}件の欠損データを補間しています
    </div>
  );
}

// StockChart.tsx で使用
export const StockChart = memo(function StockChart({
  data, indexData = [], height = 400, showVolume = true, showSMA = true, showBollinger = false, loading = false, error = null, market = 'usa', signal = null,
}: StockChartProps) {
  // ...
  
  return (
    <div className="relative w-full group" style={{ height }}>
      <InterpolatedDataIndicator data={data} />
      {/* ... */}
    </div>
  );
});
```

### 実装ステップ

1. **Day 1**: 前日終値による補間ロジック実装
2. **Day 2**: UIでの補間データインジケーター追加

### テスト計画

```typescript
// __tests__/data-interpolation.test.ts

describe('Data Interpolation', () => {
  it('should interpolate missing data with previous close', () => {
    const input = [
      { date: '2024-01-01', open: 100, high: 105, low: 99, close: 102, volume: 1000 },
      { date: '2024-01-02', open: null, high: null, low: null, close: null, volume: null },
      { date: '2024-01-03', open: 103, high: 108, low: 102, close: 107, volume: 1500 },
    ];

    const result = processQuotesWithInterpolation(input);

    expect(result[1].close).toBe(102);  // 前日終値で補間
    expect(result[1].isInterpolated).toBe(true);
    expect(result[1].volume).toBe(0);   // 欠損日は出来高0
  });

  it('should not create false price spikes', () => {
    const input = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: null },  // 欠損
      { date: '2024-01-03', close: 101 },
    ];

    const result = processQuotesWithInterpolation(input);
    const closes = result.map(r => r.close);

    // 0が含まれていないことを確認
    expect(closes).not.toContain(0);
    // 急激な変動がないことを確認
    const maxChange = Math.max(...closes.map((c, i) => 
      i > 0 ? Math.abs(c - closes[i-1]) : 0
    ));
    expect(maxChange).toBeLessThanOrEqual(1);
  });
});
```

---

## 📅 総合実装スケジュール

### Week 1: Critical Fixes

| Day | タスク | 担当 | 成果物 |
|-----|--------|------|--------|
| 1 | Issue #1 Phase 1: Web Worker導入 | フロントエンド | 非ブロッキングバックテスト |
| 2 | Issue #2 Phase 1: アトミック注文実行 | フロントエンド | 整合性保証された注文処理 |
| 3 | Issue #3 Phase 1: データ補間ロジック | バックエンド | 欠損データ処理 |
| 4 | Issue #1 Phase 2: メモ化パターン | フロントエンド | パラメータキャッシュ |
| 5 | 統合テスト | QA | 全Issueの検証 |

### Week 2: Stabilization

| Day | タスク | 担当 | 成果物 |
|-----|--------|------|--------|
| 1 | Issue #1 Phase 3: インクリメンタル計算 | フロントエンド | 進捗表示付きバックテスト |
| 2 | Issue #2 Phase 2-3: ロックとキュー | フロントエンド | 堅牢な注文システム |
| 3 | Issue #3 Phase 2: UIインジケーター | フロントエンド | 補間データ表示 |
| 4-5 | パフォーマンス最適化・負荷テスト | QA | ベンチマーク結果 |

---

## ✅ 成功指標 (KPIs)

| 指標 | 現在 | 目標 | 測定方法 |
|------|------|------|----------|
| バックテスト実行時間 (1年データ) | 10s+ | <2s | Chrome DevTools Performance |
| UIブロック時間 | 10s+ | <100ms | Web Vitals TTI |
| 注文処理競合発生率 | 不明 | 0% | ログ分析 |
| データ欠損による誤シグナル | 頻発 | 0件 | シグナル検証テスト |
| メモリ使用量増加 | 急増 | 安定 | Chrome Memory Profiler |

---

## 🎯 結論

これらの3つのCritical Issueは、Trader Proプラットフォームの**中核的な機能**（バックテスト、注文実行、データ品質）に直接影響します。優先的に対応することで：

1. **ユーザー体験の劇的な改善** (UIフリーズ解消)
2. **取引の信頼性向上** (データ整合性保証)
3. **シグナル精度の向上** (正確なデータ処理)

が期待できます。

**推奨される対応順序**:
1. **即座に**: Issue #2 (注文整合性) - 資産保護のため
2. **1週間以内**: Issue #1 (バックテスト性能) - ユーザー体験のため
3. **2週間以内**: Issue #3 (データ品質) - シグナル精度のため

---

**作成者**: Kilo Code  
**最終更新**: 2026-01-29  
**次回レビュー**: 各Issue実装完了後
