---
name: performance-architect
description: Comprehensive framework for data pipeline optimization, parallel processing with Web Workers, and standardized performance monitoring. Use when handling high-frequency market data or complex technical analysis.
---

# Performance Architect

このスキルは、ULT Trading Platformにおける「ミリ秒単位のUX改善」と「データ整合性の維持」を目的とした建築ガイドラインです。

## 🔄 Optimized Data Pipeline (MarketDataHub)

データ取得の重複排除と一貫性を保証するため、`MarketDataHub` パターンを遵守します。

1.  **Deduplication**: 複数のコンポーネントが同時に同じ銘柄を要求しても、API呼び出しは1回に集約する（`pendingRequests` マップによる Promise 管理）。
2.  **Unification**: チャート、シグナル、リスク管理のすべてのデータソースを `MarketDataHub` に集約し、コンポーネント間でのデータ不整合を排除する。
3.  **Real-time Synchronization**: リアルタイム価格（スクレイパー等）を取得した際は、`updateLatestPrice` を通じてキャッシュ内の最新足を動的に更新し、即座にUIへ反映させる。

## 🧵 Parallel Processing (Web Workers)

メインスレッド（UI）のフリーズを防ぐため、以下の処理は必ず Web Worker で実行します。

1.  **Technical Indicators**: RSI, MACD, BB などの過去データに基づく大量計算。
2.  **Worker Pattern**: 
    *   ロジックは `indicator-logic.ts` 等の純粋関数として定義し、単体テスト可能にする。
    *   `IndicatorWorkerService` を介して非同期 Promise インターフェースで呼び出す。
3.  **Fallback**: `window` が存在しない環境（SSR等）や Worker が失敗した場合は、自動的に同期処理へフォールバックするロジックを保持する。

## 📊 Performance Monitoring Framework

「推測するな、計測せよ」を原則とし、すべての重要ロジックに計測を導入します。

1.  **Execution Tracking**: `measurePerformance('task-name', fn)` を使用し、同期/非同期を問わず実効時間を記録する。
2.  **Anomaly Detection**: 開発環境において 100ms を超える処理が発生した場合は、自動的に警告ログを出力し、ボトルネックを可視化する。
3.  **Metric Aggregation**: `getPerformanceStats` を使用して、システム全体のヘルスチェック（API遅延や計算負荷の統計）を実施する。

## 🧩 Architectural Integrity (DI)

1.  **Interface First**: すべてのサービスは `app/lib/interfaces/` に定義されたインターフェース（`IMarketDataService` 等）に従う。
2.  **Loose Coupling**: `ServiceContainer` を使用して依存関係を注入し、具象クラス間の直接参照を避けることで、テスト時の Mock 化を容易にする。
3.  **Initial Registration**: `app/lib/di/initialize.ts` で一括してサービス登録を行い、ライフサイクルを管理する。
