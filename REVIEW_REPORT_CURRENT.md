# ソースコードレビューレポート

**担当:** Jules
**日付:** 2024-05-24 (検証実施)
**対象:** `trading-platform` (Next.js App) および `backend`

プロジェクト全体のソースコードレビュー（再検証および新規調査）を実施しました。
以前の指摘事項の多くが依然として存在しており、特にパフォーマンスとデータの整合性に関わる重要な課題が残っています。

## 📊 概要
Next.js App Router と Zustand を用いたモダンなアーキテクチャで構築されています。
TypeScript の型定義やディレクトリ構成は整理されていますが、**計算量の多い処理がメインスレッド（または同期的なループ）に含まれている**点と、**状態更新の整合性**にリスクがあります。

---

## 🛑 Critical (優先対応事項)

### 1. バックテスト処理の計算量爆発 (`app/lib/AccuracyService.ts`)
- **現状:** `runBacktest` メソッド内で、全期間（`data.length`）にわたるループを実行し、その内部で毎回 `analysisService.analyzeStock` を呼び出しています。
- **問題:**
  - `analyzeStock` 内でさらに `optimizeParameters`（パラメータ全探索）が実行される設計の場合、全体の計算量は $O(Days \times Parameters \times History)$ となります。
  - `calculateRealTimeAccuracy` メソッドでも、ループ内で `slice` を多用しており（$O(N^2)$）、メモリ確保とGCの負荷が高い実装になっています。
- **リスク:** データ期間が数年分になると、ブラウザのフリーズやクラッシュを引き起こす可能性が高いです。
- **推奨:**
  - 最適化計算の結果をメモ化（キャッシュ）する。
  - `slice` の代わりにインデックス参照を使用するようロジックを変更する。
  - Web Worker へのオフロードを検討する。

### 2. 注文処理の競合状態（Race Condition） (`app/components/OrderPanel.tsx`)
- **現状:** `handleOrder` 関数内で以下のように処理されています。
  ```typescript
  setCash(portfolio.cash - totalCost);
  addPosition({ ... });
  ```
- **問題:**
  - `portfolio.cash` を読み取ってから `setCash` するまでの間に、非同期処理（WebSocket更新など）で `portfolio` が更新された場合、その更新内容がこの `setCash` で上書きされ消失します（Stale State）。
  - 現金の減算とポジション追加がアトミック（不可分）ではありません。
- **推奨:**
  - `tradingStore` に `executeOrder(order: OrderParams)` アクションを作成し、ストア内部で「残高確認」「現金減算」「ポジション追加」を同期的に一括処理してください。

### 3. ダミーのRSIチャート表示 (`app/page.tsx`)
- **現状:** `Workstation` コンポーネント内のRSIサブチャートが、ハードコードされた SVG パスで描画されています。
  ```jsx
  <path d="M0,50 C50,40 100,60..." ... />
  ```
- **問題:** ユーザーに対し、実際の市場データとは無関係なグラフを表示しており、誤った投資判断を招く恐れがあります。UIモックアップがそのまま残っている状態です。
- **推奨:** `StockChart` コンポーネントと同様に、計算されたRSIデータに基づいてパスを動的に生成する実装に置き換えてください。

---

## ⚠️ Major (重要な改善点)

### 1. チャートデータ正規化の効率 (`app/components/StockChart/hooks/useChartData.ts`)
- **現状:** `normalizedIndexData` の計算で、`extendedData.labels.map` の内部で `indexData.find` を実行しています。
- **問題:** 計算量が $O(N \times M)$ です。データ点が2000件ずつある場合、400万回の比較が発生し、レンダリングをブロックします。
- **推奨:** `indexData` を `Map<DateString, number>` に変換し、$O(1)$ で参照できるように修正してください。

### 2. APIのデータ欠損処理によるチャートスパイク (`app/api/market/route.ts`)
- **現状:** Yahoo Finance からのデータ取得時に `open: q.open || 0` としています。
- **問題:** 取引所が休場などでデータが欠損している（`null`）場合、価格が `0` として扱われます。これによりチャート上に急激な下落（スパイク）が表示され、移動平均線などのテクニカル指標計算が大きく狂います。
- **推奨:** `null` の場合はそのデータポイントをスキップするか、直前の有効な値（`close`）で埋める処理を追加してください。

### 3. バックエンドのトレンド判定が単純すぎる (`backend/src/market_correlation/analyzer.py`)
- **現状:** `detect_trend` 関数が `(last_price - first_price) / first_price` のみで判定しています。
- **問題:** 期間中の価格変動（ボラティリティ）が無視されており、例えば「急騰して全戻し」したようなケースでも「横ばい」と判定されてしまいます。
- **推奨:** 線形回帰の傾き（Slope）や、移動平均線との位置関係を用いた判定ロジックへの変更を推奨します。

---

## ℹ️ Minor / Info (軽微な修正・提案)

- **ストアの責務分離 (`app/store/tradingStore.ts`):** AIロジックはサービスに切り出されていますが、`closePosition` などに依然として PnL 計算ロジックが含まれています。これらもドメインモデルやサービス層に移動することで、ストアは純粋な状態保持に徹することができます。
- **UX (`OrderPanel.tsx`):** 数量入力欄などで `Math.max(1, ...)` を使用しているため、ユーザーが入力を空にして修正しようとした際の挙動が直感的でない場合があります。

## ✅ Good Practices (評価点)

- **セキュリティ:** APIルートでの入力値バリデーション（正規表現、長さ制限）や、レート制限（`ipRateLimiter`）が実装されており、DoS攻撃等のリスクが低減されています。
- **型安全性:** TypeScript の型定義が徹底されており、`any` の使用も抑制されています。
- **コンポーネント設計:** `Workstation` を中心に、Sidebar や Chart への責務分割が明確に行われています。

以上
