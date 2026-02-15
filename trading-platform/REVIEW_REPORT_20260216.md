# ソースコードレビューレポート (2026-02-16)

**日付**: 2026-02-16
**レビュアー**: Jules (AI Agent)
**対象**: `trading-platform/` (Frontend, Core Logic, Tests)

---

## 1. 概要 (Executive Summary)

### 総合評価: **6.5/10** (機能不全を引き起こすバグとテスト失敗あり)

**状態**: ❌ **テスト失敗** (6 suites failing) / ⚠️ **重要バグ検出** / ⚠️ **アーキテクチャ不整合**

前回のレビュー (2026-02-13) で指摘された重要バグが依然として修正されておらず、さらにテスト環境における定数定義の欠落やモジュールの参照エラーが確認されました。
アプリケーションは起動可能と思われますが、主要機能（チャート表示、注文リスク管理、バックテスト精度）に重大な欠陥があります。

### 主な発見事項

| カテゴリ | 状態 | 詳細 |
|----------|------|------|
| **テスト** | ❌ **Failing** | 6つのテストスイートが失敗。定数 (`MULTIPLIERS`) の未定義、ファイル欠落 (`domains/backtest`) が原因。 |
| **重要バグ** | ❌ **Critical** | 1. `StockChart` 出来高データ欠落<br>2. `OrderPanel` リスク設定無視<br>3. `SlippageModel` タイムゾーン依存 |
| **アーキテクチャ** | ⚠️ **Degraded** | `BacktestEngine` の重複と、削除されたはずの `domains/backtest` への参照が残存。 |
| **セキュリティ** | ✅ **Good** | 認証・認可周りは堅牢。 |

---

## 2. 詳細な発見事項

### 2.1 ❌ テスト失敗 (Test Failures)

`pnpm test` の実行結果、以下の6つのスイートが失敗しています。

1.  **`app/lib/__tests__/constants.test.ts`**
    *   **エラー**: `MULTIPLIERS.VOLUME_MULTIPLIER_DEFAULT` が `undefined`。
    *   **原因**: `app/lib/constants/trading.ts` 等に該当する定数が定義されておらず、エクスポート漏れが発生しています。これにより、この定数を使用するロジックが実行時にクラッシュする可能性があります。

2.  **`app/__tests__/domain-architecture.test.ts`**
    *   **エラー**: `Cannot find module '../domains/backtest'`.
    *   **原因**: `app/domains/backtest` ディレクトリが存在しません（おそらく `app/lib/backtest` に移動済み）。テストコードが古い構成を参照しています。

3.  **`app/lib/__tests__/MarketRegimeDetector.test.ts`**
    *   **エラー**: 期待値 `RANGING` に対し `TRENDING` が返却。
    *   **原因**: ADX判定ロジックの閾値または計算に誤りがある可能性があります。

4.  **その他**
    *   `ml-model-service-di.test.ts`: モックファイル欠落。
    *   `OptimizedBacktest.perf.test.ts`: パフォーマンス要件未達。
    *   `DataAggregator.test.ts`: エラーメッセージの不一致。

### 2.2 ❌ 重要バグ (Critical Bugs)

#### 1. StockChartの出来高表示不具合 (未修正)
- **ファイル**: `app/components/StockChart/StockChart.tsx`
- **問題**: `chartData` オブジェクトに出来高（Volume）用のデータセットが含まれていません。UI上には `showVolume` フラグがありますが、データが渡されないため棒グラフが表示されません。
- **影響**: ユーザーは出来高を確認できず、トレーディング判断に支障が出ます。

#### 2. 注文時のリスク設定の消失
- **ファイル**: `app/hooks/useOrderEntry.ts`, `app/store/portfolioStore.ts`
- **問題**: `riskConfig`（トレイリングストップ設定など）は `executeOrder` に渡されますが、ポートフォリオストア内での注文保存時に、これらの動的設定（`trailingStopATRMultiple` 等）が永続化されません。
- **影響**: ユーザーがトレイリングストップを有効にしても、注文後のポジション管理ロジック（価格更新時のストップ更新）が動作しません。

#### 3. SlippageModelのタイムゾーン依存性
- **ファイル**: `app/lib/backtest/SlippageModel.ts`
- **問題**: `date.getHours()` を使用しており、サーバーのローカルタイム（UTC環境など）に依存しています。
- **影響**: 日本市場（JST）の9:00（UTC 0:00）を正しく「市場開始直後」と判定できず、スリッページ計算が狂います。

### 2.3 ⚠️ アーキテクチャ上の課題

#### バックテストエンジンの重複
- `AdvancedBacktestEngine.ts` と `RealisticBacktestEngine.ts` (共に `app/lib/backtest/`) でロジックの大半が重複しています。
- 特に `openPosition` メソッドはほぼコピー＆ペーストであり、片方の修正がもう片方に反映されないリスクがあります。

#### 参照エラーとデッドコード
- `app/domains/backtest` は削除されましたが、テストコード (`domain-architecture.test.ts`) が残っています。

---

## 3. 推奨アクションプラン

### Priority 1: コンパイル・テスト環境の修復
1.  **定数の修正**: `app/lib/constants/trading.ts` (または適切なファイル) に `MULTIPLIERS` 定数を定義・エクスポートする。
2.  **テストの修正**: `domain-architecture.test.ts` を削除するか、パスを `app/lib/backtest` に修正する。

### Priority 2: 機能バグの修正
1.  **StockChart**: `chartData` に出来高データセットを追加する。
2.  **OrderEntry**: `Order` 型および `Position` 型に `riskConfig` プロパティを追加し、ストアで永続化する。また、価格更新時にこれを参照してストップロスを更新するロジック（HookまたはWorker）を実装する。
3.  **SlippageModel**: `getHours()` の代わりに `getUTCHours()` を使用し、タイムゾーンオフセット（JSTなら+9）を考慮した計算に修正する。

### Priority 3: リファクタリング
1.  **BacktestEngine**: 共通ロジックを `BaseBacktestEngine` に集約し、継承関係を整理する。

---

**結論**:
コードベースは機能豊富ですが、保守性と信頼性を損なうバグとテストの不整合が散見されます。まずは `pnpm test` が全パスする状態まで修復し、その後で UI 上のバグ（チャート、注文）を修正することを強く推奨します。
