# [PERF-001] パフォーマンス計測基盤構築

## 概要

レビューで計算量爆発問題が発覚（O(Days × Params × History)）しました。パフォーマンス計測基盤を構築し、問題を早期に検出します。

## 対応内容

1. **`lib/performance.ts`作成**
   - パフォーマンス計測ユーティリティ
   - メトリクス収集機能
   - レポート生成機能

2. **React Component用`usePerformanceMonitor`フック**
   - コンポーネントレンダリング時間計測
   - メモリ使用量監視
   - パフォーマンスアラート

3. **バックエンド計測ミドルウェア**
   - APIレスポンス時間計測
   - データベースクエリ時間計測
   - ボトルネック検出

## 受け入れ条件（Acceptance Criteria）

- [ ] `lib/performance.ts`が作成され、主要メトリクスを計測できる
- [ ] `usePerformanceMonitor`フックが作成され、コンポーネント計測が可能
- [ ] バックエンド計測ミドルウェアが実装され、API計測が可能
- [ ] パフォーマンスデータが収集・可視化されている
- [ ] パフォーマンス劣化時にアラートが送信される
- [ ] 計算量O(n²)以上の処理が検出される

## 関連するレビュー発見事項

- 計算量爆発問題が発覚（O(Days × Params × History)）
- パフォーマンス計測が不十分
- ボトルネックの特定が困難

## 想定工数

24時間

## 優先度

High

## 担当ロール

Frontend Engineer + Backend Engineer

## ラベル

`performance`, `priority:high`, `monitoring`, `infrastructure`

---

## 補足情報

### パフォーマンス計測アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   Monitoring    │
│                 │     │                 │     │                 │
│ usePerformance  │────▶│ Middleware      │────▶│ Dashboard       │
│ Monitor         │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Web Vitals      │     │ APM (Datadog)   │
│ (LCP, FID, CLS) │     │                 │
└─────────────────┘     └─────────────────┘
```

### 計測対象メトリクス

| カテゴリ | メトリクス | 目標値 |
|----------|------------|--------|
| Web Vitals | LCP | < 2.5s |
| Web Vitals | FID | < 100ms |
| Web Vitals | CLS | < 0.1 |
| API | レスポンス時間 | < 200ms |
| API | P99レイテンシ | < 500ms |
| 計算 | 複雑度 | O(n log n)以下 |

### usePerformanceMonitorフック例

```typescript
// hooks/usePerformanceMonitor.ts
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > 100) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime}ms`);
    }

    // メトリクス送信
    sendMetrics({
      component: componentName,
      renderTime,
      renderCount: renderCount.current
    });
  });
}
```
