# Agent Skill: Performance Monitoring & Optimization

## 概要
このスキルは、Trading Platformのパフォーマンスモニタリングと最適化のためのガイドラインです。

## 適用シナリオ
- パフォーマンス問題の特定
- メモリリークの検出
- レンダリング最適化
- バンドルサイズ削減

## パフォーマンス計測ツール

### 1. Chrome DevTools Performance Panel

```typescript
// 自動パフォーマンストレース
chrome-devtools_performance_start_trace({
  reload: true,
  autoStop: true
});

// 分析結果取得
chrome-devtools_performance_stop_trace();
```

### 2. React DevTools Profiler

```bash
# React Developer Toolsインストール後
# Componentsタブでプロファイリング開始
# 操作後、レンダリング回数を確認
```

### 3. Lighthouse CI

```bash
# Lighthouseスコア計測
npx lighthouse http://localhost:3000 --output=json

# CI統合
npx lighthouse-ci
```

## パフォーマンス指標

### Core Web Vitals (CWV)

| 指標 | 目標値 | 測定方法 |
|-----|--------|---------|
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |
| TTFB | < 600ms | Time to First Byte |
| FCP | < 1.8s | First Contentful Paint |

### カスタム指標

```typescript
// カスタムパフォーマンス計測
const measurePerformance = (label: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
};

// Web Vitals API
import { getLCP, getFID, getCLS } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

## メモリ最適化

### メモリリーク検出

```bash
# Node.jsメモリプロファイリング
node --inspect-brk node_modules/.bin/jest

# Chrome DevToolsで"Memory"タブを開く
# Heap snapshot取得
# Compare機能で差分確認
```

### よくあるメモリリークパターン

```typescript
// ❌ 悪い例: イベントリスナー未削除
useEffect(() => {
  window.addEventListener('resize', handler);
  // return () => window.removeEventListener('resize', handler); ← 欠如
}, []);

// ✅ 良い例: クリーンアップ関数
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// ❌ 悪い例: setInterval未クリア
useEffect(() => {
  const id = setInterval(() => {}, 1000);
  // return () => clearInterval(id); ← 欠如
}, []);

// ✅ 良い例: インターバルクリア
useEffect(() => {
  const id = setInterval(() => {}, 1000);
  return () => clearInterval(id);
}, []);
```

## レンダリング最適化

### React.memo活用

```typescript
// コンポーネントのメモ化
const MemoizedComponent = React.memo(Component, (prev, next) => {
  return prev.value === next.value;
});

// カスタム比較関数
const areEqual = (prevProps, nextProps) => {
  return prevProps.id === nextProps.id;
};
```

### useMemo / useCallback

```typescript
// 高価な計算のキャッシュ
const processedData = useMemo(() => {
  return expensiveOperation(rawData);
}, [rawData]);

// イベントハンドラのメモ化
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);
```

### Virtualization（長リスト）

```typescript
// react-window使用例
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={500}
  itemCount={10000}
  itemSize={50}
>
  {RowComponent}
</FixedSizeList>
```

## バンドルサイズ最適化

### 分析ツール

```bash
# バンドル分析
npm run build
npx webpack-bundle-analyzer .next/static/**/*.js

# サイズチェック
npx bundlesize
```

### コード分割

```typescript
// 動的インポート
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
  ssr: false
});

// ライブラリの遅延ロード
const heavyLibrary = await import('heavy-library');
```

### Tree Shaking

```typescript
// ❌ 悪い例: 全インポート
import _ from 'lodash';

// ✅ 良い例: 個別インポート
import debounce from 'lodash/debounce';

// ✅ 良い例: ESモジュール
import { debounce } from 'lodash-es';
```

## キャッシュ戦略

### APIリクエストキャッシュ

```typescript
// SWR使用例
import useSWR from 'swr';

const { data, error } = useSWR(
  '/api/market-data',
  fetcher,
  {
    revalidateOnFocus: false,
    refreshInterval: 5000
  }
);
```

### React Query

```typescript
// TanStack Query使用例
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['market', symbol],
  queryFn: fetchMarketData,
  staleTime: 30000,
  cacheTime: 60000
});
```

## 監視とアラート

### パフォーマンス監視

```typescript
// パフォーマンスエントリー監視
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 100) {
      console.warn('Slow operation:', entry.name, entry.duration);
    }
  }
});

observer.observe({ entryTypes: ['measure', 'longtask'] });
```

### エラートラッキング

```typescript
// Sentry統合例
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  integrations: [new Sentry.BrowserTracing()]
});
```

## 最適化チェックリスト

### 実装前チェック
- [ ] コンポーネントの分割戦略
- [ ] データフェッチング戦略
- [ ] キャッシュポリシー
- [ ] エラーバウンダリ設置

### 実装後チェック
- [ ] Lighthouseスコア確認
- [ ] メモリプロファイリング
- [ ] バンドルサイズ確認
- [ ] Core Web Vitals計測

## 関連ドキュメント
- FOR_OPENCODE.md - パフォーマンス改善履歴
- .github/skills/debugging.md - パフォーマンス問題のデバッグ
- .github/skills/trading-platform-dev.md - 最適化パターン
