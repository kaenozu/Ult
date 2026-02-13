---
name: performance-optimization-expert
description: Expert guidance on performance optimization, UI modularization, and architectural improvements (DI). Use when refactoring large components, optimizing React rendering, or introducing Dependency Injection.
---

# Performance Optimization & Architecture Expert

このスキルは、ULT Trading Platformにおけるパフォーマンス最適化、UIリファクタリング、およびアーキテクチャ改善のためのベストプラクティスを提供します。

## 🏗️ UI Modularization (コンポーネント分割)

巨大なコンポーネント（500行以上）は、以下の戦略で分割します。

1.  **タブ/セクションごとの分割**: `OverviewTab`, `PerformanceTab` のように機能単位でサブコンポーネント化する。
2.  **共通パーツの抽出**: `MetricCard`, `MetricBadge` などの小さなUIパーツは `Shared.tsx` にまとめる。
3.  **ロジックの分離**: 複雑な計算ロジックはカスタムフック (`useBacktestMetrics` 等) やユーティリティ関数に移動する。
4.  **ディレクトリ構造**: `Component/index.tsx` をエントリーポイントとし、サブコンポーネントは `Component/components/` に配置する。

## ⚡ React Performance

1.  **レンダリング最適化**:
    *   計算コストの高い処理には必ず `useMemo` を使用する。
    *   コールバック関数には `useCallback` を使用する。
    *   `useEffect` 内での同期的 `setState` は避け、計算ロジックは `useMemo` に移行する。
2.  **Web Worker によるオフロード**:
    *   メインスレッドをブロックする重い計算（テクニカル指標等）は `IndicatorWorkerService` 経由で Worker に実行させる。
    *   Worker ロジックは `indicator-logic.ts` などの純粋関数として抽出し、テスト可能にする。
3.  **データ取得 (Data Fetching)**:
    *   リアルタイムデータは `useRealTimeData` フックを使用し、適切なポーリング間隔とエラーハンドリング（連続エラー時の停止）を実装する。
    *   **Cleanup**: `useEffect` のクリーンアップ関数で `AbortController` を使用し、アンマウント時に保留中のリクエストをキャンセルする。

## 📊 Performance Monitoring

1.  **実行時間の計測**: `measurePerformance(name, fn)` を使用して、重要ロジックのボトルネックを可視化する。
2.  **アラート**: 開発環境では 100ms を超える処理を警告としてログ出力する。

## 🔄 Data Pipeline Optimization

1.  **重複排除 (Deduplication)**:
    *   `MarketDataHub` を使用して、同一データへの同時リクエストを1つにまとめる。
    *   コンポーネント内で直接 `fetch` するのではなく、必ず `ServiceContainer` 経由で `DataHub` を呼び出す。
2.  **キャッシュ戦略**:
    *   短期間（1分以内）の再取得はメモリ内キャッシュを返す。
    *   不変データ（過去の足）と可変データ（最新の足）を区別して更新する。

## 🧩 Dependency Injection (DI)

疎結合なアーキテクチャを実現するために、`ServiceContainer` を使用します。

1.  **インターフェース定義**: `app/lib/interfaces/I{Service}.ts` にインターフェースを定義する。
2.  **実装**: サービスクラスでインターフェースを `implements` する。
3.  **登録**: `app/lib/di/initialize.ts` で `ServiceContainer.register` を使用して登録する。
4.  **解決**: `ServiceContainer.resolve<IService>(TOKENS.Service)` でインスタンスを取得する。
5.  **テスト**: テスト時は `ServiceContainer.reset()` 後にモックを登録して使用する。

## 🛡️ Security Best Practices (Scraping)

1.  **SSRF対策**: ユーザー入力（シンボル等）は厳格に検証する（例: 日本株コードは `^[0-9]{4}$`）。
2.  **レート制限**: APIルートには必ず `checkRateLimit` ミドルウェアを適用する。
3.  **認証**: 公開APIには `requireAuth` を適用する。
