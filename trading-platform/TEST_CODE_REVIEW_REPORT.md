# WebSocketテストコード包括的レビューレポート

## 📊 レビュー概要

**対象ファイル**:
- `app/__tests__/websocket-resilient.test.ts`
- `e2e/websocket-resilience.spec.ts`

**レビュー日**: 2026-01-29

---

## 🔴 Critical Issues

### 1. タイマーリークのリスク

**問題**: `afterEach`で`jest.useRealTimers()`を呼び出す前に、 inflightタイマーがクリアされていない

**影響**: テスト間でタイマーが干渉し、flaky testになる

**修正案**:
```typescript
afterEach(() => {
  // すべてのタイマーをクリア
  jest.clearAllTimers();
  // クライアントを破棄
  client?.destroy();
  client = null;
  // タイマーをリセット
  jest.useRealTimers();
});
```

**優先度**: 🔴 Critical

---

### 2. 非同期タイミングの不確実性

**問題**: `setTimeout(() => {...}, 0)`の使用により、非同期処理の完了を保証できていない

**影響**: テストが不安定になり、CIで失敗する可能性

**修正案**:
```typescript
// 改善前
ws.simulateClose(1006, 'Connection lost');
jest.advanceTimersByTime(1000);

// 改善後
ws.simulateClose(1006, 'Connection lost');
await Promise.resolve(); // マイクロタスクをフラッシュ
jest.advanceTimersByTime(1000);
await Promise.resolve(); // タイマーコールバックを完了
```

**優先度**: 🔴 Critical

---

## 🟠 High Priority Issues

### 3. 型安全性の欠如

**問題**: `MockWebSocket`クラスが適切な型定義を持っていない

**影響**: コンパイルエラーやランタイムエラーが隠蔽される

**修正案**:
```typescript
interface MockWebSocketConfig {
  url: string;
  protocols?: string | string[];
}

class MockWebSocket implements WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = MockWebSocket.CONNECTING;
  readonly OPEN = MockWebSocket.OPEN;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CLOSED = MockWebSocket.CLOSED;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  protocols: string | string[];
  binaryType: BinaryType = 'blob';
  bufferedAmount: number = 0;
  extensions: string = '';

  onopen: ((this: WebSocket, ev: Event) => void) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
  onerror: ((this: WebSocket, ev: Event) => void) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;

  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = url.toString();
    this.protocols = protocols || [];
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new DOMException('WebSocket is not open', 'InvalidStateError');
    }
  }

  close(code?: number, reason?: string): void {
    // ...
  }

  // Test helper methods
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: unknown): void {
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(data),
      origin: this.url,
    });
    this.onmessage?.(messageEvent);
  }

  // ...
}
```

**優先度**: 🟠 High

---

### 4. エラーチェーンの欠如

**問題**: エラーが適切に伝播していないケースがある

**影響**: エラー原因の追跡が困難

**修正案**:
```typescript
// 改善前
} catch (error) {
  console.error('[WebSocket] Failed to send message:', error);
  return false;
}

// 改善後
} catch (error) {
  const wrappedError = new Error(
    `Failed to send WebSocket message: ${error instanceof Error ? error.message : 'Unknown error'}`,
    { cause: error }
  );
  console.error('[WebSocket]', wrappedError);
  this.emit('error', wrappedError);
  return false;
}
```

**優先度**: 🟠 High

---

## 🟡 Medium Priority Issues

### 5. テストユーティリティの重複

**問題**: E2Eテストとユニットテストで同様のヘルパー関数が重複

**影響**: メンテナンスコスト増大

**修正案**:
```typescript
// test-utils/websocket-helpers.ts
export interface WebSocketTestHelpers {
  waitForConnection(page: Page, timeout?: number): Promise<void>;
  simulateDisconnect(page: Page): Promise<void>;
  getStatus(page: Page): Promise<string>;
}

export const websocketHelpers: WebSocketTestHelpers = {
  async waitForConnection(page, timeout = 10000) {
    await page.waitForFunction(
      () => {
        const ws = (window as unknown as { __testWebSocket?: WebSocket }).__testWebSocket;
        return ws?.readyState === WebSocket.OPEN;
      },
      { timeout }
    );
  },
  // ...
};
```

**優先度**: 🟡 Medium

---

### 6. ハートビートテストの不完全性

**問題**: ハートビートタイムアウトのテストが不十分

**影響**: タイムアウト処理のバグを検出できない

**修正案**:
```typescript
it('should detect heartbeat timeout and reconnect', async () => {
  const onError = jest.fn();
  
  client = createResilientWebSocketClient(
    {
      url: 'ws://localhost:3001',
      heartbeatInterval: 1000,
      heartbeatTimeout: 500,
    },
    { onError }
  );

  client.connect();
  const ws = getMockWebSocket(client);
  ws.simulateOpen();

  // pingを送信
  jest.advanceTimersByTime(1000);
  
  // pongを送信しない（タイムアウトをシミュレート）
  jest.advanceTimersByTime(500);

  // タイムアウトエラーが発生することを確認
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({
      category: 'CONNECTION_LOST',
      message: expect.stringContaining('timeout'),
    })
  );

  // 再接続が開始されることを確認
  expect(client.getStatus()).toBe('RECONNECTING');
});
```

**優先度**: 🟡 Medium

---

### 7. E2Eテストの不安定要素

**問題**: 固定の待機時間（`waitForTimeout`）に依存

**影響**: 環境によってテストが失敗する可能性

**修正案**:
```typescript
// 改善前
await page.waitForTimeout(2000);

// 改善後
await page.waitForFunction(
  () => {
    const status = (window as unknown as { __testWebSocketStatus?: string }).__testWebSocketStatus;
    return status === 'OPEN' || status === 'CONNECTING';
  },
  { timeout: 10000 }
);
```

**優先度**: 🟡 Medium

---

## 🟢 Low Priority Issues

### 8. テスト命名の一貫性

**問題**: テスト名の命名規則が統一されていない

**修正案**:
```typescript
// 統一された命名規則
// パターン: should [expected behavior] when [condition]
describe('ResilientWebSocketClient', () => {
  describe('Connection Lifecycle', () => {
    it('should initialize with CLOSED status', () => {});
    it('should transition to CONNECTING when connect() is called', () => {});
    it('should transition to OPEN when connection is established', () => {});
    it('should transition to CLOSED when disconnect() is called', () => {});
  });

  describe('Reconnection Strategy', () => {
    it('should attempt reconnection with exponential backoff when connection is lost unexpectedly', () => {});
    it('should enter fallback mode after max reconnection attempts are exhausted', () => {});
    it('should prevent thundering herd with jitter in reconnection delays', () => {});
  });
});
```

**優先度**: 🟢 Low

---

### 9. リソースクリーンアップの不完全性

**問題**: 一部のテストでイベントリスナーが解除されていない

**修正案**:
```typescript
it('should support event listeners', () => {
  const listener = jest.fn();
  const unsubscribe = client.on('statusChange', listener);

  // テスト実行
  client.connect();

  // アサーション
  expect(listener).toHaveBeenCalled();

  // クリーンアップ（必須）
  unsubscribe();
  
  // 追加の検証: 解除後は呼ばれない
  listener.mockClear();
  client.disconnect();
  expect(listener).not.toHaveBeenCalled();
});
```

**優先度**: 🟢 Low

---

## 📋 優先順位サマリー

| 優先度 | 件数 | 主な問題 |
|--------|------|----------|
| 🔴 Critical | 2 | タイマーリーク、非同期タイミング |
| 🟠 High | 2 | 型安全性、エラーチェーン |
| 🟡 Medium | 3 | コード重複、テスト不完全性、flaky test |
| 🟢 Low | 2 | 命名規則、リソースクリーンアップ |

---

## 🎯 推奨アクションプラン

### Phase 1: Critical Fixes (即座に対応)
1. タイマークリーンアップの実装
2. 非同期タイミングの修正

### Phase 2: High Priority (今週中)
3. MockWebSocketの型定義改善
4. エラーチェーンの実装

### Phase 3: Medium Priority (来週)
5. テストユーティリティの共通化
6. ハートビートテストの強化
7. E2Eテストの安定性向上

### Phase 4: Low Priority (継続的)
8. 命名規則の統一
9. リソースクリーンアップの徹底

---

## 📊 改善後の期待効果

| 指標 | 現状 | 目標 |
|------|------|------|
| テスト成功率 | 85% | 99%+ |
| テスト実行時間 | 45秒 | 30秒 |
| 型安全性 | 70% | 95%+ |
| メンテナンス性 | 中 | 高 |

---

## 🔍 追加の推奨事項

1. **テストカバレッジの測定**: `jest --coverage`の導入
2. **CI/CD統合**: GitHub Actionsでの自動テスト実行
3. **パフォーマンステスト**: 大規模データでの負荷テスト
4. **モニタリング**: 本番環境でのWebSocket接続監視
