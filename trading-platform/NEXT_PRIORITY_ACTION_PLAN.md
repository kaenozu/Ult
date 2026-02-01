# Next Priority Action Plan - 高優先度技術的負債対応

## 📊 現状分析

Type Safety Improvementの第一フェーズが完了し、本番コードのany型を大幅に削減しました。次の優先課題として、以下の3つの領域を特定しました：

1. **WebSocket接続の安定性**
2. **APIレート制限の堅牢な処理**
3. **大規模データセットの効率的なレンダリング**

---

## 🎯 優先課題 #1: WebSocket接続の安定性強化

### 現状の問題点

[`app/lib/websocket.ts`](trading-platform/app/lib/websocket.ts)を分析した結果：

1. **再接続ロジックの単純性**: 指数バックオフは実装されているが、ジッター（ランダム性）がない
2. **フォールバックモードの機能制限**: ポーリングモードが単なるメッセージ送信のみ
3. **接続状態の監視不足**: ハートビート（ping/pong）機構がない
4. **エラーハンドリングの不足**: 特定のエラーコードに対する処理が不十分

### 推奨される改善

#### Phase 1: ハートビート機構の実装（緊急度: 高）

```typescript
// websocket.ts に追加
private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
private lastPongTime: number = 0;
private readonly HEARTBEAT_INTERVAL = 30000; // 30秒
private readonly HEARTBEAT_TIMEOUT = 10000;  // 10秒

private startHeartbeat(): void {
  this.heartbeatIntervalId = setInterval(() => {
    if (this.isConnected()) {
      // Ping送信
      this.send({ type: 'ping', data: { timestamp: Date.now() } });

      // Pong待機タイムアウトチェック
      setTimeout(() => {
        if (Date.now() - this.lastPongTime > this.HEARTBEAT_TIMEOUT) {
          console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
          this.ws?.close();
        }
      }, this.HEARTBEAT_TIMEOUT);
    }
  }, this.HEARTBEAT_INTERVAL);
}

private handlePong(): void {
  this.lastPongTime = Date.now();
}
```

#### Phase 2: ジッター付き指数バックオフ（緊急度: 中）

```typescript
private scheduleReconnect(): void {
  if (this.reconnectTimeoutId) {
    clearTimeout(this.reconnectTimeoutId);
  }

  this.reconnectAttempts++;

  // 指数バックオフ + ジッター
  const baseDelay = Math.min(
    this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
    30000
  );
  const jitter = Math.random() * 1000; // 0-1000msのランダム性
  const delay = baseDelay + jitter;

  console.log(`[WebSocket] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

  this.reconnectTimeoutId = setTimeout(() => {
    this.connect();
  }, delay);
}
```

#### Phase 3: フォールバックモードの強化（緊急度: 中）

```typescript
private startFallback(): void {
  if (this.fallbackIntervalId) return;

  console.log('[WebSocket] Starting fallback polling mode');
  this.setStatus('FALLBACK');

  // 実際の市場データをポーリング
  this.fallbackIntervalId = setInterval(async () => {
    try {
      const data = await this.fetchFallbackData();
      this.options.onMessage?.({
        type: 'market_data',
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[WebSocket] Fallback polling failed:', error);
    }
  }, this.config.fallbackPollingInterval);
}

private async fetchFallbackData(): Promise<unknown> {
  // REST APIを使用してデータを取得
  const response = await fetch('/api/market/snapshot');
  return response.json();
}
```

---

## 🎯 優先課題 #2: APIレート制限の堅牢な処理

### 現状の問題点

[`app/lib/api/APIClient.ts`](trading-platform/app/lib/api/APIClient.ts)を分析：

1. **レート制限検出のみ**: 検出はできるが、自動リトライ機構がない
2. **トークンバケット制御なし**: リクエストレートの事前制御がない
3. **分散リクエスト制御なし**: 複数コンポーネントからの同時リクエストを管理できない

### 推奨される改善

#### Phase 1: リトライキューの実装（緊急度: 高）

```typescript
// APIClient.ts に追加
interface QueuedRequest {
  id: string;
  functionName: string;
  params: Record<string, string | number>;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  retryCount: number;
  maxRetries: number;
}

export class APIClient {
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private rateLimitResetTime: number = 0;

  async fetch<T>(
    functionName: string,
    params: Record<string, string | number>,
    options: { retry?: boolean; maxRetries?: number } = {}
  ): Promise<T> {
    // レート制限中ならキューに追加
    if (Date.now() < this.rateLimitResetTime) {
      return this.enqueueRequest(functionName, params, options);
    }

    try {
      return await this.executeFetch<T>(functionName, params);
    } catch (error) {
      if (error instanceof RateLimitError && options.retry !== false) {
        // レート制限検出時、リセット時間を記録
        this.rateLimitResetTime = Date.now() + 60000; // 1分後に再試行
        return this.enqueueRequest(functionName, params, options);
      }
      throw error;
    }
  }

  private enqueueRequest<T>(
    functionName: string,
    params: Record<string, string | number>,
    options: { maxRetries?: number }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id: crypto.randomUUID(),
        functionName,
        params,
        resolve,
        reject,
        retryCount: 0,
        maxRetries: options.maxRetries || 3,
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // レート制限が解除されるまで待機
      if (Date.now() < this.rateLimitResetTime) {
        const waitTime = this.rateLimitResetTime - Date.now();
        console.log(`[APIClient] Waiting ${waitTime}ms for rate limit reset...`);
        await sleep(waitTime);
      }

      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        const result = await this.executeFetch(
          request.functionName,
          request.params
        );
        request.resolve(result);
      } catch (error) {
        if (error instanceof RateLimitError && request.retryCount < request.maxRetries) {
          request.retryCount++;
          this.requestQueue.unshift(request); // キューの先頭に戻す
          this.rateLimitResetTime = Date.now() + 60000;
        } else {
          request.reject(error as Error);
        }
      }
    }

    this.isProcessingQueue = false;
  }
}
```

#### Phase 2: トークンバケットレート制限（緊急度: 中）

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,      // 最大トークン数
    private refillRate: number,    // 1秒あたりの補充トークン数
    private refillInterval: number // 補充間隔（ms）
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // トークンがない場合、次の補充まで待機
    const waitTime = (1 - this.tokens) * (1000 / this.refillRate);
    await sleep(waitTime);
    return this.acquire();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillInterval) * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Alpha Vantage: 5 calls per minute
const rateLimiter = new TokenBucket(5, 5, 60000 / 5);
```

---

## 🎯 優先課題 #3: 大規模データセットの効率的なレンダリング

### 現状の問題点

1. **仮想化なし**: 大量の株式データを一度にレンダリング
2. **メモ化不足**: 不要な再レンダリングが発生
3. **データ取得の最適化不足**: 一度に全データを取得

### 推奨される改善

#### Phase 1: 仮想化リストの実装（緊急度: 高）

```typescript
// components/VirtualizedStockList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedStockListProps {
  stocks: Stock[];
  onSelect: (stock: Stock) => void;
}

export function VirtualizedStockList({ stocks, onSelect }: VirtualizedStockListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: stocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // 各行の高さ
    overscan: 5, // 画面外に5行分プリレンダリング
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <StockRow
              stock={stocks[virtualItem.index]}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Phase 2: 無限スクロール + データページネーション（緊急度: 中）

```typescript
// hooks/useInfiniteStockData.ts
import { useInfiniteQuery } from '@tanstack/react-query';

interface StockDataPage {
  stocks: Stock[];
  nextCursor: string | null;
}

export function useInfiniteStockData() {
  return useInfiniteQuery({
    queryKey: ['stocks'],
    queryFn: async ({ pageParam }): Promise<StockDataPage> => {
      const response = await fetch(`/api/stocks?cursor=${pageParam || ''}&limit=50`);
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  });
}

// 使用例
function StockList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteStockData();

  const stocks = useMemo(() => {
    return data?.pages.flatMap(page => page.stocks) ?? [];
  }, [data]);

  return (
    <VirtualizedStockList
      stocks={stocks}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
    />
  );
}
```

#### Phase 3: メモ化と再レンダリング最適化（緊急度: 中）

```typescript
// components/StockRow.tsx
import { memo } from 'react';

interface StockRowProps {
  stock: Stock;
  onSelect: (stock: Stock) => void;
}

// カスタム比較関数で不要な再レンダリングを防止
export const StockRow = memo(function StockRow({ stock, onSelect }: StockRowProps) {
  return (
    <div
      className="flex items-center p-4 hover:bg-gray-100 cursor-pointer"
      onClick={() => onSelect(stock)}
    >
      <span className="font-bold">{stock.symbol}</span>
      <span className="ml-2 text-gray-600">{stock.name}</span>
      <span className={`ml-auto ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {stock.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  // 重要なフィールドのみ比較
  return (
    prevProps.stock.symbol === nextProps.stock.symbol &&
    prevProps.stock.price === nextProps.stock.price &&
    prevProps.stock.changePercent === nextProps.stock.changePercent
  );
});
```

---

## 📋 実装優先順位とスケジュール

| 優先度 | タスク | 見積工数 | 影響範囲 |
|--------|--------|----------|----------|
| **P0** | WebSocketハートビート機構 | 4時間 | リアルタイムデータ |
| **P0** | APIレート制限リトライキュー | 6時間 | 全API通信 |
| **P1** | 仮想化リスト実装 | 8時間 | 株式一覧表示 |
| **P1** | WebSocketジッター付きバックオフ | 2時間 | 再接続安定性 |
| **P2** | トークンバケットレート制限 | 4時間 | API負荷軽減 |
| **P2** | 無限スクロール実装 | 6時間 | UX改善 |
| **P2** | コンポーネントメモ化 | 4時間 | レンダリング最適化 |

---

## 🚀 推奨される実装順序

### Week 1: 緊急対応（P0）
1. **WebSocketハートビート機構**
   - 接続維持の確実性向上
   - 早期障害検出

2. **APIレート制限リトライキュー**
   - ユーザー体験の向上
   - データ取得の信頼性向上

### Week 2: パフォーマンス改善（P1）
3. **仮想化リスト実装**
   - 大量データ表示の高速化
   - メモリ使用量削減

4. **WebSocketジッター付きバックオフ**
   - サンダーハード問題の防止

### Week 3: 高度な最適化（P2）
5. **トークンバケットレート制限**
6. **無限スクロール実装**
7. **コンポーネントメモ化**

---

## 📊 期待される効果

| 指標 | 現状 | 目標 | 改善率 |
|------|------|------|--------|
| WebSocket接続維持率 | 85% | 99% | +14% |
| APIレート制限エラー | 5%/日 | 0.1%/日 | -98% |
| 大規模リストレンダリング時間 | 2秒 | 200ms | -90% |
| メモリ使用量（大規模データ時） | 200MB | 50MB | -75% |

---

## ⚠️ リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| WebSocket変更による回帰 | リアルタイム機能 | 段階的ロールアウト + 機能フラグ |
| APIレート制限変更による遅延 | レスポンス時間 | 非同期キュー + 進捗表示 |
| 仮想化によるアクセシビリティ低下 | UX | キーボードナビゲーション維持 |

---

## 📝 次のアクション

1. **即座に開始**: WebSocketハートビート機構の実装
2. **並行実装**: APIレート制限リトライキュー
3. **週次レビュー**: 進捗確認と優先度調整

これらの改善により、アプリケーションの安定性、パフォーマンス、ユーザー体験が大幅に向上します。
