# Source Code Review Report (2026-02-28)

## 概要
本レポートは、`trading-platform` (Frontend/Node.js) および `backend` (Python) の主要ソースコードに対する包括的なレビュー結果です。
重大なバグ、セキュリティリスク、パフォーマンス問題、および仕様との乖離が確認されました。

## 1. 重大 (Critical)

### 1.1. [Frontend] StockTable の無限ポーリングループ
- **ファイル:** `trading-platform/app/components/StockTable.tsx`
- **問題:** `useEffect` 内でポーリングを行っていますが、依存配列に `getAdaptiveInterval` が含まれています。この関数は `stocks` (価格変動で更新される) に依存しているため、データフェッチが完了して `stocks` が更新されるたびに Effect が再実行され、設定された間隔を無視して即座に次のフェッチが走る「無限ループ（Tight Loop）」状態になる可能性があります。
- **影響:** クライアントのCPU負荷増大、APIサーバーへの過剰なリクエスト、バッテリー消費の悪化。
- **推奨修正:** `getAdaptiveInterval` の結果を `useRef` に保持するか、`fetchQuotes` 内部で動的に計算し、`useEffect` の依存配列から外す。

### 1.2. [Core] Prediction Worker の実装不備とロジック乖離
- **ファイル:** `trading-platform/app/lib/services/prediction-worker.ts`, `enhanced-prediction-service.ts`
- **問題:** `prediction-worker.ts` 内の `workerCode` (文字列テンプレート) が簡易的なスタブ実装にとどまっています。特に `candlestickPatternService` のロジックが欠落しており、`EnhancedPredictionService` 側でパターン特徴量を `0` にハードコードして補填しています。
- **影響:** Web Worker を有効にした場合（デフォルト）、メインスレッドでの実行結果と予測結果が乖離します。特にローソク足パターンによるシグナルが一切検出されなくなります。
- **推奨修正:** `candlestick-pattern-service.ts` のロジックを Worker 内にも適切にバンドルするか、共有ロジックとしてインポート可能な形にリファクタリングする。

### 1.3. [Backend] 連続取引日数カウントのバグ
- **ファイル:** `backend/src/trade_journal_analyzer/psychology_analyzer.py`
- **問題:** `_calculate_days_since_break` メソッドにおいて、同日に複数のセッションが存在する場合、日付差分 (`days`) が `0` となり、`else: break` に到達してループが終了します。
- **影響:** 1日に複数回取引を行うトレーダーの場合、過去の連続取引日数が正しくカウントされず、常に `1日` と判定される可能性があります。精神分析ロジック（Burnout判定など）が機能しません。
- **推奨修正:** 日付差分が `0` の場合（同日）は `continue` するロジックを追加する。

## 2. 警告 (Warning)

### 2.1. [Security] デフォルト管理者パスワードのチェック漏れ
- **ファイル:** `trading-platform/app/lib/env.ts`, `auth-store.ts`
- **問題:** メモリ情報では「本番環境で `ENABLE_DEFAULT_ADMIN` が有効かつデフォルトパスワードの場合にエラーにする」とされていましたが、コード上には `JWT_SECRET` のチェックしか存在しません。
- **影響:** 本番環境で誤ってデフォルト設定のままデプロイした場合、既知のパスワード (`admin123`) で管理者権限が奪取されるリスクがあります。
- **推奨修正:** `env.ts` に該当のバリデーションロジックを追加する。

### 2.2. [Core] 特徴量計算の型定義と実装の不整合
- **ファイル:** `trading-platform/app/lib/services/feature-engineering-service.ts`
- **問題:** `calculateTechnicalFeatures` が返す `sma5`, `sma20` 等の値が、コメントにある通り「乖離率 (%)」である一方、`calculateBasicFeatures` は `lastValue(calculateSMA(...))` を用いて「価格そのもの」を返しているように見受けられます。
- **影響:** MLモデルが「価格」を期待しているか「乖離率」を期待しているかによって、予測精度が崩壊する可能性があります。
- **推奨修正:** インターフェースを `TechnicalFeaturesRaw` (価格) と `TechnicalFeaturesNormalized` (乖離率) に分離し、明示的に区別する。

### 2.3. [Frontend] テストの不安定性 (Flaky Test)
- **ファイル:** `trading-platform/app/components/OrderPanel.tsx`
- **問題:** 非同期処理 (`handleOrder`) の `finally` ブロックで `setIsProcessing(false)` を呼び出していますが、コンポーネントがアンマウントされている場合の考慮がありません。
- **影響:** テスト実行時に "State updates on unmounted component" 警告が発生し、CIが不安定になる要因となります。
- **推奨修正:** `useRef` を用いてマウント状態を追跡し、アンマウント済みであれば状態更新を行わないようにする。

## 3. 情報 (Info)

### 3.1. [Backend] パフォーマンス最適化の未適用
- **ファイル:** `backend/src/trade_journal_analyzer/psychology_analyzer.py`
- **内容:** 日次PnLの計算が各メソッド (`_count_consecutive_losing_days`, `_count_consecutive_winning_days`) で重複して行われています。メモリ情報にあった「共通化による最適化」が適用されていません。
- **推奨:** `_get_daily_pnl` メソッドを作成し、計算結果を再利用する。

### 3.2. [Core] MLWorkerService の放置
- **ファイル:** `trading-platform/app/lib/services/ml-worker-service.ts`
- **内容:** 書きかけのスタブ実装（Workerコードが空に近い）が存在しますが、現在は `prediction-worker.ts` が使われているため、デッドコードとなっています。
- **推奨:** 混乱を避けるため削除するか、`prediction-worker.ts` と統合する。

## 4. 総括
全体として、最新の技術スタック (Next.js 16, React 19) を採用しているものの、コアとなる取引ロジックやポーリング処理において、信頼性を損なう重大な不具合が散見されます。特に Worker 周りの実装乖離と無限ループ問題は、リリース前に修正必須です。
