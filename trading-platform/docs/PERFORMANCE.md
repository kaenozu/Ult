# パフォーマンス最適化ガイド

## 概要

このドキュメントでは、ULT Trading Platformのパフォーマンス最適化について説明します。

## 最近の改善 (2026-02-15)

### Next.js設定の最適化

#### 1. ビルド最適化
- **Image Optimization**: AVIFとWebPフォーマット対応を追加
- **Experimental Features**: 
  - `optimizePackageImports`による高速tree-shaking
  - 対象パッケージ: lucide-react, @tanstack/react-query, date-fns, recharts
- **圧縮**: gzip圧縮を有効化
- **セキュリティ**: `X-Powered-By`ヘッダーを削除

#### 2. コード分割
Webpack設定をカスタマイズして、以下のチャンクに分割:
- **vendor**: 一般的なnode_modules
- **tensorflow**: TensorFlow.js（大きなライブラリ）
- **charts**: chart.jsとrecharts（チャートライブラリ）

#### 3. バンドル分析
- `@next/bundle-analyzer`を追加
- `npm run build:analyze`コマンドでバンドルサイズを確認可能

### パフォーマンス予算

| リソース | 目標サイズ | 最大サイズ |
|---------|-----------|-----------|
| JavaScript (初期) | 150KB | 200KB |
| JavaScript (総計) | 1MB | 2MB |
| CSS | 30KB | 50KB |
| 画像（ページあたり） | 500KB | 1MB |
| LCP (Largest Contentful Paint) | < 2.5s | < 4s |
| FID (First Input Delay) | < 100ms | < 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 |

## 実装済みの最適化

### 1. React Query (TanStack Query)

データフェッチングの最適化のため、React Queryを導入しました。

**特徴:**
- 自動的なキャッシングと再検証
- 楽観的更新
- バックグラウンドでのデータ更新
- 重複リクエストの防止

**使用例:**

```typescript
import { useMarketQuote, usePortfolio } from '@/app/hooks/queries';

// 株価データを取得
const { data, isLoading, error } = useMarketQuote('AAPL');

// ポートフォリオを取得
const { data: portfolio } = usePortfolio({ refetchInterval: 60000 });
```

### 2. メモ化最適化

不要な再レンダリングを防止するためのユーティリティを提供しています。

**使用例:**

```typescript
import { useDeepMemo, useDebouncedCallback } from '@/app/hooks/usePerformance';

// 深い比較によるメモ化
const memoizedData = useDeepMemo(() => processData(data), [data]);

// デバウンスされたコールバック
const debouncedSearch = useDebouncedCallback((query) => {
  performSearch(query);
}, 300);
```

### 3. コード分割・遅延ロード

重いコンポーネントは自動的にコード分割されます。

**使用例:**

```typescript
import { LazyComponents } from '@/app/lib/lazyLoad';

// 遅延ロードされたコンポーネントを使用
function Dashboard() {
  return (
    <div>
      <LazyComponents.StockChart symbol="AAPL" />
      <LazyComponents.TradingPsychologyDashboard />
    </div>
  );
}
```

**利用可能な遅延ロードコンポーネント:**
- `StockChart` - 株価チャート
- `SimpleRSIChart` - RSIチャート
- `TradingPsychologyDashboard` - 取引心理ダッシュボード
- `MLPerformanceDashboard` - MLパフォーマンスダッシュボード
- `BacktestResultsDashboard` - バックテスト結果
- `SignalPanel` - シグナルパネル
- `RiskMonitoringDashboard` - リスク監視ダッシュボード

### 4. パフォーマンス予算

以下のパフォーマンス予算を設定しています:

| リソース | 初期読み込み | 最大サイズ |
|---------|------------|-----------|
| JavaScript | 200KB | 2MB |
| CSS | 50KB | 200KB |
| 画像（ページあたり） | - | 1MB |
| フォント | - | 300KB |

### 5. キャッシング戦略

**APIキャッシュ:**
- 市場データ: 30秒
- ポートフォリオ: 1分
- ユーザー設定: 5分
- 静的データ: 24時間

**ブラウザキャッシュ:**
- JavaScript/CSS: 1年間
- 画像: 30日間

## パフォーマンス監視

### Core Web Vitals

以下の閾値を監視しています:

- **LCP** (Largest Contentful Paint): < 2.5秒
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1.8秒

### レンダリングパフォーマンス

```typescript
import { useRenderPerformance } from '@/app/hooks/usePerformance';

function MyComponent() {
  const metrics = useRenderPerformance('MyComponent');
  
  // 60fpsを超えるレンダリング時間は自動的にログ出力されます
  
  return <div>...</div>;
}
```

## 最適化のベストプラクティス

### 1. データフェッチング

✅ **良い例:**
```typescript
// React Queryを使用
const { data } = useMarketQuote('AAPL');
```

❌ **悪い例:**
```typescript
// 直接fetchを使用（キャッシングなし）
const [data, setData] = useState();
useEffect(() => {
  fetch('/api/market?symbol=AAPL').then(r => r.json()).then(setData);
}, []);
```

### 2. コンポーネントのメモ化

✅ **良い例:**
```typescript
const MemoizedComponent = memo(Component, (prev, next) => {
  return prev.id === next.id;
});
```

### 3. リストのレンダリング

✅ **良い例:**
```typescript
// 仮想リストを使用
const { virtualItems, totalHeight } = useVirtualList(items, {
  itemHeight: 50,
  containerHeight: 500,
});
```

### 4. イベントハンドラ

✅ **良い例:**
```typescript
// useCallbackを使用
const handleClick = useCallback(() => {
  doSomething();
}, [deps]);
```

## パフォーマンステスト

```bash
# パフォーマンステストの実行
npm run test:e2e -- performance.spec.ts

# Lighthouse CI
npm run lighthouse
```

## チューニングチェックリスト

- [ ] 不要な再レンダリングがないか確認（React DevTools Profiler）
- [ ] 画像が適切に圧縮・フォーマットされているか確認
- [ ] バンドルサイズが予算内か確認
- [ ] Core Web Vitalsが閾値を満たしているか確認
- [ ] APIレスポンスタイムが適切か確認
- [ ] メモリリークがないか確認

## 関連ファイル

- `app/providers/QueryProvider.tsx` - React Query設定
- `app/hooks/queries/` - データフェッチングフック
- `app/hooks/usePerformance.ts` - パフォーマンスフック
- `app/lib/lazyLoad.ts` - 遅延ロードユーティリティ
- `app/config/performance.ts` - パフォーマンス設定

## トラブルシューティング

### 問題: チャートが重い

**解決策:**
1. `useVirtualList`を使用して仮想リスト化
2. データポイントを減らす（デカimation）
3. Web Workerで計算を分離

### 問題: 初期読み込みが遅い

**解決策:**
1. コード分割の確認
2. クリティカルCSSの抽出
3. Service Workerの有効化

### 問題: メモリ使用量が増加

**解決策:**
1. コンポーネントのアンマウント時のクリーンアップを確認
2. イベントリスナーの削除を確認
3. 大きな配列の参照を解除

## 参考リンク

- [React Query Documentation](https://tanstack.com/query/latest)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web Vitals](https://web.dev/vitals/)
