# ソースコードレビューレポート (2026-02-13)

**日付**: 2026-02-13
**レビュアー**: Jules
**対象**: `trading-platform/` (Frontend, Backend, & Core Logic)

---

## 1. 概要 (Executive Summary)

### 総合評価: **7.5/10** (高品質だが重要バグと技術的負債あり)

**状態**: ✅ **ビルド成功** / ✅ **テスト通過** (18/18, 潜在的不具合あり) / ⚠️ **重要バグ検出**

環境構築（`pnpm install`）後、テストは全て通過しましたが、コードの詳細レビューにより**機能不全を引き起こす3つの重要なバグ**と、**メンテナンス性を損なう大規模なコード重複**が特定されました。セキュリティ実装は非常に堅牢です。

### 主な発見事項

| カテゴリ | 状態 | 詳細 |
|----------|------|------|
| **環境・ビルド** | ✅ **Fixed** | 依存関係 (`pnpm install`) を解消し、正常なテスト環境を復元しました。 |
| **テスト** | ⚠️ **Fragile** | `SlippageModel` のテストは通過しますが、タイムゾーン依存の論理欠陥が含まれています。 |
| **重要バグ** | ❌ **Critical** | 1. `StockChart` の出来高チャートが表示されない（データ欠落）。<br>2. `OrderPanel` のリスク設定が注文時に無視される。<br>3. `SlippageModel` がUTC環境で正しく機能しない。 |
| **コアロジック** | ⚠️ **Duplication** | `AdvancedBacktestEngine` と `RealisticBacktestEngine` に深刻なコード重複があります。 |
| **セキュリティ** | ✅ **Excellent** | API認証、CSRF保護、入力検証は非常に適切に実装されています。 |

---

## 2. 詳細な発見事項

### 2.1 ❌ 重要バグ (Critical Bugs)

#### 1. StockChartの出来高表示不具合
- **ファイル**: `app/components/StockChart/StockChart.tsx`
- **問題**: 内部の `<Bar />` コンポーネントに対し、出来高データを含まない `chartData` オブジェクトを渡しています。
- **影響**: 出来高チャートが表示されない、または価格データが誤って棒グラフとして表示される可能性があります。
- **解決策**: 未使用の `ChartVolume.tsx` コンポーネントを利用するか、`chartData` に適切なデータセットを追加する必要があります。

#### 2. 注文時のリスク設定無視
- **ファイル**: `app/hooks/useOrderEntry.ts`
- **問題**: ユーザーがUI上で設定した `riskConfig`（トレイリングストップ、ボラティリティ調整など）が、`handleOrder` 関数内で `executeOrder` を呼び出す際に引数として渡されていません。
- **影響**: ユーザーが意図したリスク管理機能が実際の注文で機能しません。これはトレーディングシステムとして重大な欠陥です。
- **解決策**: `OrderRequest` 型には既に `riskConfig` フィールドが存在するため、これを正しくマッピングして渡す修正が必要です。

#### 3. SlippageModelのタイムゾーン依存性
- **ファイル**: `app/lib/backtest/SlippageModel.ts`
- **問題**: `calculateTimeOfDayImpact` メソッドが `date.getHours()` を使用しており、システムのローカルタイムゾーン（CI環境ではUTC）に依存しています。
- **影響**: JST（UTC+9）の日時データを処理する際、UTC環境では時間が9時間ずれて判定され、市場開始・終了時のスリッページ加算ロジックが機能しません（常に0として判定される）。テストが偶然通過しているだけです。
- **解決策**: `getUTCHours()` を使用して明示的にタイムゾーンオフセットを扱うか、タイムゾーン対応のライブラリを使用すべきです。

### 2.2 ⚠️ 技術的負債 (Code Quality)

#### バックテストエンジンの重複
- **ファイル**: `AdvancedBacktestEngine.ts`, `RealisticBacktestEngine.ts`
- **問題**: `runBacktest`, `checkExitConditions`, `calculateMetrics` などの主要ロジックがほぼコピー＆ペースト状態で重複しています。
- **リスク**: 片方のエンジンに行った修正（バグ修正や機能追加）がもう片方に反映されず、ロジックの乖離（デグレード）を引き起こすリスクが高い状態です。
- **推奨**: 共通ロジックを `BaseBacktestEngine` クラスに抽出するか、コンポジションパターン（Strategyパターン等）を適用して共通化すべきです。

### 2.3 ✅ セキュリティ (Security)

- **認証 (`auth.ts`)**: JWT署名に `HS256` を強制し、秘密鍵の長さチェック（32文字以上）を行っている点は非常に優秀です。
- **API (`api/trading/route.ts`)**:
  - `requireAuth`（認証）→ `checkRateLimit`（レート制限）→ `requireCSRF`（CSRF保護）→ `Zod`（入力検証）という順序でガードが実装されており、理想的な防御層を形成しています。
  - エラー時に内部詳細を漏らさない設計も徹底されています。

---

## 3. 推奨アクションプラン

### Priority 1: バグ修正 (Immediate Fixes)
1. **OrderPanel**: `useOrderEntry.ts` を修正し、`riskConfig` を `executeOrder` に渡すように変更する。
2. **StockChart**: `ChartVolume` コンポーネントを統合し、出来高を正しく表示させる。
3. **SlippageModel**: 時間判定ロジックをUTCベースに修正し、タイムゾーンに依存しないテストケースを追加する。

### Priority 2: リファクタリング (Refactoring)
1. **BacktestEngine**: 重複コードを解消するため、共通基底クラスを作成する。
2. **Warning解消**: React 19 関連のPeer Dependency警告や、非推奨APIの使用箇所を整理する。

---

**結論**:
セキュリティ基盤は強固ですが、アプリケーションのコア機能（チャート表示、注文実行、バックテスト）に関わる部分に修正必須のバグが存在します。これらを優先的に修正することで、プロダクトの信頼性は大幅に向上します。
