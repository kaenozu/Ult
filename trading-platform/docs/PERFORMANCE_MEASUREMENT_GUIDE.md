# パフォーマンス計測ユーティリティ使用ガイド

## 概要

パフォーマンス計測ユーティリティは、アプリケーションのボトルネックを特定し、パフォーマンス回帰を防止するためのツールです。

## 機能

### 1. 同期処理の計測 (`measurePerformance`)

```typescript
import { measurePerformance } from '@/app/lib/performance';

const result = measurePerformance('calculateData', () => {
  // 処理内容
  return data.map(item => transform(item));
});
```

### 2. 非同期処理の計測 (`measurePerformanceAsync`)

```typescript
import { measurePerformanceAsync } from '@/app/lib/performance';

const result = await measurePerformanceAsync('fetchData', async () => {
  const response = await fetch('/api/data');
  return response.json();
});
```

### 3. React コンポーネントでの使用 (`usePerformanceMonitor`)

```typescript
import { usePerformanceMonitor } from '@/app/lib/performance';

function MyComponent() {
  const { measure, measureAsync } = usePerformanceMonitor('MyComponent');

  useEffect(() => {
    // 同期処理の計測
    const data = measure('processData', () => {
      return heavyComputation();
    });

    // 非同期処理の計測
    measureAsync('loadData', async () => {
      const result = await fetchDataFromAPI();
      setData(result);
    });
  }, [measure, measureAsync]);

  return <div>...</div>;
}
```

### 4. ベンチマーク比較 (`usePerformanceBenchmark`)

```typescript
import { usePerformanceBenchmark } from '@/app/lib/performance';

function OptimizationTest() {
  const { benchmark, getResults, reset } = usePerformanceBenchmark('algorithm-comparison');

  const testAlgorithms = () => {
    // アルゴリズムAの計測
    benchmark('algorithmA', () => {
      algorithmA(data);
    });

    // アルゴリズムBの計測
    benchmark('algorithmB', () => {
      algorithmB(data);
    });

    // 結果を表示
    console.log(getResults());
  };

  return <button onClick={testAlgorithms}>ベンチマーク実行</button>;
}
```

## コンソールからの使用

ブラウザのコンソールから以下のコマンドでパフォーマンスレポートを確認できます：

```javascript
// パフォーマンスレポートを表示
window.performanceUtils.printReport()

// メトリクスをJSON形式でエクスポート
window.performanceUtils.exportMetrics()

// グローバルモニターにアクセス
const monitor = window.performanceUtils.getMonitor()
console.log(monitor.getMetrics())
```

## 計測結果の例

```
=== Performance Report ===
Generated: 2026-02-01T07:00:00.000Z

--- backtest ---
backtest.AAPL: avg=1234.56ms, p50=1200.00ms, p95=1500.00ms, min=1000.00ms, max=2000.00ms, count=10

--- render ---
render.SignalPanel: avg=45.23ms, p50=42.00ms, p95=60.00ms, min=35.00ms, max=80.00ms, count=25

--- api ---
api.fetchQuotes: avg=234.56ms, p50=220.00ms, p95=300.00ms, min=180.00ms, max=350.00ms, count=15
```

## 実装済みの計測箇所

### AccuracyService
- `runBacktest` - バックテスト全体の実行時間
- `preCalculateIndicators` - テクニカル指標の事前計算

### SignalPanel
- コンポーネントのレンダリング時間
- バックテスト実行時間

### BacktestPanel
- バックテストシミュレーション時間

### StockTable
- 株価データのフェッチ時間
- コンポーネントのレンダリング時間

## メトリクスの解釈

- **avg**: 平均実行時間
- **p50**: 中央値（50パーセンタイル）
- **p95**: 95パーセンタイル（遅い5%のケースを除外）
- **p99**: 99パーセンタイル（遅い1%のケースを除外）
- **min**: 最小実行時間
- **max**: 最大実行時間
- **count**: 計測回数

## ベストプラクティス

### 1. 重要な処理を計測する
```typescript
// ✅ 良い例：時間がかかる可能性がある処理
measurePerformance('complexCalculation', () => {
  return data.reduce((acc, item) => {
    // 複雑な計算
  }, []);
});

// ❌ 悪い例：簡単な処理を計測する必要はない
measurePerformance('simpleAdd', () => 1 + 1);
```

### 2. 意味のある名前を付ける
```typescript
// ✅ 良い例：何を計測しているか分かる
measurePerformance('backtest.calculateIndicators', fn);

// ❌ 悪い例：何を計測しているか不明
measurePerformance('test', fn);
```

### 3. 本番環境での使用
開発環境でのみ詳細なログを出力し、本番環境では必要最小限にする：

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  measurePerformance('operation', fn);
} else {
  fn(); // 本番では計測をスキップ
}
```

## トラブルシューティング

### メトリクスが記録されない
- ブラウザ環境で実行されているか確認
- `window.__performanceMonitor` が初期化されているか確認

### コンソールにログが出力されすぎる
- 計測対象を絞り込む
- 開発環境でのみ有効化する

## パフォーマンス最適化のワークフロー

1. **計測**: `usePerformanceMonitor` を使用してボトルネックを特定
2. **分析**: `window.performanceUtils.printReport()` でレポートを確認
3. **最適化**: 遅い処理を改善
4. **検証**: 再度計測して改善を確認
5. **回帰防止**: 定期的に計測してパフォーマンス悪化を早期発見

## 参考資料

- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
