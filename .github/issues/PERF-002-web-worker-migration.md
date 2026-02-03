# [PERF-002] Web Worker移行計画

## 概要

バックテスト計算がメインスレッドをブロックしています。Web Workerに計算処理を移行し、UIの応答性を向上させます。

## 対応内容

1. **`backtest.worker.ts`作成**
   - Web Worker実装
   - メッセージパッシング設計
   - エラーハンドリング

2. **計算処理のWorker移行**
   - バックテスト計算の移行
   - 複雑な指標計算の移行
   - データ処理の移行

3. **メインスレッド解放確認**
   - パフォーマンス計測
   - UI応答性テスト
   - 負荷テスト

## 受け入れ条件（Acceptance Criteria）

- [ ] `backtest.worker.ts`が作成され、バックテスト計算がWorkerで実行される
- [ ] メインスレッドが計算処理から解放され、UIがフリーズしない
- [ ] Workerとの通信が型安全に実装されている
- [ ] Workerエラーが適切にハンドリングされる
- [ ] バックテスト実行時間が現状と同等か短縮されている
- [ ] ブラウザの開発者ツールでメインスレッドのブロックが検出されない

## 関連するレビュー発見事項

- バックテスト計算がメインスレッドをブロック
- UIがフリーズする問題が発生
- 大量データ処理時に応答性が低下

## 想定工数

40時間

## 優先度

High

## 担当ロール

Frontend Engineer

## ラベル

`performance`, `priority:high`, `web-worker`, `optimization`

---

## 補足情報

### Web Workerアーキテクチャ

```
┌─────────────────┐         ┌─────────────────┐
│  Main Thread    │         │  Worker Thread  │
│                 │         │                 │
│ UI Components   │◄───────▶│ Backtest Calc   │
│ - Chart         │  post   │ - Indicators    │
│ - Table         │  message│ - Statistics    │
│ - Controls      │         │ - Optimization  │
└─────────────────┘         └─────────────────┘
```

### Worker実装例

```typescript
// workers/backtest.worker.ts
import { BacktestParams, BacktestResult } from '../types/backtest';

self.onmessage = (event: MessageEvent<BacktestParams>) => {
  const { strategy, data, parameters } = event.data;
  
  try {
    const result = runBacktest(strategy, data, parameters);
    self.postMessage({ type: 'success', result });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
};

function runBacktest(
  strategy: Strategy,
  data: MarketData[],
  parameters: BacktestParams
): BacktestResult {
  // 重い計算処理
  // ...
}
```

### 移行優先順位

| 処理 | 優先度 | 理由 |
|------|--------|------|
| バックテスト計算 | 最高 | UIブロックの主因 |
| テクニカル指標計算 | 高 | 大量データ処理 |
| ポートフォリオ最適化 | 高 | 複雑な計算 |
| データ変換 | 中 | 軽微な処理 |
