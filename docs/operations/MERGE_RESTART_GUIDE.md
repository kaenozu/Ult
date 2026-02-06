# Gitマージ再開ガイド

**日時**: 2026-01-30
**ステータス**: マージ再開準備完了

## 現在のリポジトリ状態

### ブランチ情報
- **現在のブランチ**: main
- **リモートとの差分**: 9コミット先行
- **作業ディレクトリ**: クリーン（未コミットの変更なし）

### マージ済みブランチ
1. ✅ `origin/main` - コンフリクト解決済み
2. ✅ `origin/fix/ci-lint-errors` - コンフリクト解決済み

### 未マージブランチ
合計: **80+ ブランチ**

#### 高優先度（修正ブランチ）- 9ブランチ
- `fix/build-and-lint-errors` ⏸️ コンフリクト発生（中止済み）
- `fix/build-and-ts`
- `fix/typescript-errors`
- `fix/mvp-stabilization`
- `fix/system-stabilization-final`
- `fix/tests-final-2`
- `fix/test-env`
- `fix/quality-and-cleanup`
- `fix/dedup-requests`
- `fix/orderpanel-test`
- `fix/playwright-tests`
- `fix/scan-alias`
- `fix/signal-panel-error-handling`

#### 中優先度（リファクタリング）- 12ブランチ
- `refactor/code-quality-improvements`
- `refactor/code-quality-enhancement`
- `refactor/type-safety`
- `refactor/magic-numbers-extraction`
- `refactor/magic-numbers-extraction-pr`
- `refactor/backend-api`
- `refactor-signal-panel-6907079868566096462`
- `refactor/core-services-store-13647055190934339026`
- `refactor/singleton-and-error-handling`
- `refactor/update-skills-and-platform`
- `refactor-store-analysis-rsi-13465076157879563333`
- `refactor/stock-chart-split-14404719748961092551`
- `refactor/stock-chart-types`

#### 機能ブランチ - 35+ ブランチ
- `feature/trading-platform-mvp`
- `feature/ai-prediction-error-display`
- `feature/ai-self-correction`
- `feature/api-performance-monitor`
- `feature/chart-ui-improvements`
- `feature/code-quality-and-readme`
- `feature/config-management-refactor`
- `feature/enhanced-testing`
- `feature/ml-ensemble-prediction`
- `feature/persistent-stock-db`
- `feature/trade-journal-analyzer`
- `feature/trading-intelligence-suite`
- 他多数...

#### パフォーマンスブランチ - 9ブランチ
- `bolt/optimize-store-selectors-4775789442959145478`
- `bolt/optimize-page-renders-5177960276316492258`
- `bolt/optimize-stock-chart-11764159027938189162`
- `bolt/optimize-stock-table-renders-6811503498995386686`
- `bolt-optimize-stocktable-14367542531936839213`
- `bolt-optimize-usechartdata-map-lookup-17640028551597559804`
- `perf/backtest-optimization-14983486655620126981`
- `perf/memory-leaks-and-test-coverage`
- `perf/optimize-render-selectors-5715367787258029266`

#### セキュリティブランチ - 5ブランチ
- `sentinel/rate-limit-market-api-9978099823618813567`
- `sentinel-fix-alpha-vantage-security-14024923650376383263`
- `sentinel-fix-market-api-exposure-15270884287123636248`
- `sentinel/fix-market-api-validation-3499725779458618768`
- `security/api-key-protection`

#### アクセシビリティブランチ - 6ブランチ
- `palette-bottom-panel-aria-152332587082508800`
- `palette-mobile-sidebar-a11y-3472329217493109631`
- `palette-orderpanel-a11y-7042432316388344292`
- `palette-signal-panel-a11y-13321066371711121796`
- `palette-ux-empty-state-6904396643108971133`
- `palette-ux-improvements-14868249237974140758`

## コンフリクトの原因分析

### `fix/build-and-lint-errors` ブランチのコンフリクト

**発生したコンフリクト:**
1. **ファイル削除と変更の競合**: `SignalPanel.tsx` がHEADで削除され、リモートで変更
2. **内容コンフリクト**: 以下のファイルで変更が競合
   - `trading-platform/app/lib/analysis.ts`
   - `trading-platform/app/lib/api/APIClient.ts`
   - `trading-platform/app/lib/api/market-api.ts`
   - `trading-platform/app/lib/api/marketDataClient.ts`
   - `trading-platform/app/lib/backtest.ts`
   - `trading-platform/app/screener/page.tsx`
   - `trading-platform/app/store/alertStore.ts`

**原因:**
- `SignalPanel.tsx` のリファクタリング（`SignalPanel/index.tsx` に移動）と、古いブランチの変更が競合
- 複数のファイルで同時に変更が行われ、統合が複雑になっている

**影響:**
- このブランチのマージをスキップするか、手動で慎重に解決する必要がある

## 調整後のマージ戦略

### 戦略1: 自動スクリプトを使用（推奨）

作成した自動スクリプトを使用して、残りのブランチを安全にマージします。

**利点:**
- 自動でブランチを検出し、優先順位通りにマージ
- コンフリクトが発生した場合に対話的に処理
- 各マージ後に自動でビルドとテストを実行
- 詳細な結果レポートを表示

**手順:**
1. スクリプトを実行
2. コンフリクトが発生した場合、スクリプトの指示に従って解決
3. マージが完了したら、リモートにプッシュ

### 戦略2: 重要なブランチから順に手動マージ

コンフリクトが頻繁に発生するため、重要なブランチから順に手動でマージします。

**優先順位:**
1. 高優先度の修正ブランチ（`fix/build-and-lint-errors`を除く）
2. 中優先度のリファクタリング
3. 機能ブランチ
4. パフォーマンスブランチ
5. セキュリティブランチ
6. アクセシビリティブランチ

### 戦略3: スキップして後で対応

`fix/build-and-lint-errors` のような複雑なコンフリクトが発生するブランチは、一旦スキップして、他のブランチを先にマージします。

## ユーザーが次に取るべき行動

### オプションA: 自動スクリプトを使用（推奨）

#### Windows (PowerShell)
```powershell
# スクリプトを実行
.\scripts\merge-all-branches.ps1

# テストをスキップして実行（時間短縮）
$SkipTests = $true; .\scripts\merge-all-branches.ps1
```

#### Linux/Mac/WSL (Bash)
```bash
# スクリプトに実行権限を付与
chmod +x scripts/merge-all-branches.sh

# スクリプトを実行
./scripts/merge-all-branches.sh

# テストをスキップして実行（時間短縮）
SKIP_TESTS=true ./scripts/merge-all-branches.sh
```

**スクリプト実行時の対話的処理:**

コンフリクトが発生した場合、以下のオプションが表示されます：

```
コンフリクトが発生しました: origin/fix/build-and-lint-errors

以下のオプションから選択してください:
1) コンフリクトを手動で解決して続行
2) マージを中止して元の状態に戻す
3) 現在のブランチをスキップして次へ進む

選択 (1/2/3):
```

**推奨される選択:**
- **選択3**: 複雑なコンフリクトが発生するブランチはスキップ
- **選択1**: 重要なブランチでコンフリクトが発生した場合は手動で解決

### オプションB: 手動で重要なブランチをマージ

#### ステップ1: 次のブランチをマージ

```bash
# fix/build-and-lint-errorsをスキップして、次のブランチをマージ
git merge --no-ff origin/fix/build-and-ts
```

#### ステップ2: コンフリクトを解決（必要な場合）

```bash
# コンフリクトファイルを確認
git status

# コンフリクトファイルを編集
code trading-platform/app/lib/analysis.ts

# 解決したファイルをステージング
git add trading-platform/app/lib/analysis.ts
```

#### ステップ3: マージを完了

```bash
git commit -m "マージ: origin/fix/build-and-ts をmainにマージ"
```

#### ステップ4: ビルドとテスト

```bash
# ビルド
npm run build

# テスト
npm test
```

#### ステップ5: 次のブランチに進む

上記の手順を繰り返して、次のブランチをマージします。

### オプションC: 進捗をリモートにプッシュしてから再開

現在の進捗をリモートにプッシュしてから、マージを再開することもできます。

```bash
# 現在の進捗をプッシュ
git push origin main

# 最新の状態に更新
git pull origin main

# マージを再開
.\scripts\merge-all-branches.ps1
```

## 具体的なコマンドライン指示

### 最初のステップ: 現在の状態を確認

```bash
# 現在のブランチを確認
git branch --show-current

# リモートとの差分を確認
git log origin/main..HEAD --oneline

# 作業ディレクトリの状態を確認
git status
```

### 次のステップ: スクリプトを実行

```powershell
# PowerShellでスクリプトを実行
cd c:/gemini-desktop/Ult
.\scripts\merge-all-branches.ps1
```

### コンフリクトが発生した場合

```bash
# コンフリクトファイルを一覧表示
git diff --name-only --diff-filter=U

# 特定のファイルのコンフリクトを確認
git diff trading-platform/app/lib/analysis.ts

# ローカルの変更を採用
git checkout --ours trading-platform/app/lib/analysis.ts

# リモートの変更を採用
git checkout --theirs trading-platform/app/lib/analysis.ts

# 解決したファイルをステージング
git add trading-platform/app/lib/analysis.ts
```

### マージを中止する場合

```bash
# マージを中止
git merge --abort

# 作業ディレクトリをクリーンにする
git status
```

### 進捗を保存する場合

```bash
# 現在の進捗をプッシュ
git push origin main

# 後で再開する場合
git pull origin main
.\scripts\merge-all-branches.ps1
```

## 注意事項

### 時間の確保
- すべてのブランチをマージするには、数時間かかる可能性があります
- テストをスキップすると時間を短縮できますが、品質が低下する可能性があります

### コンフリクトの頻度
- 多数のブランチが存在するため、コンフリクトが頻繁に発生する可能性があります
- 重要なブランチ以外はスキップすることを検討してください

### ビルドとテスト
- 各マージ後にビルドとテストを実行することを推奨します
- ビルドやテストが失敗した場合、マージを中止して問題を解決してください

### バックアップ
- 重要な進捗を定期的にリモートにプッシュしてください
- 問題が発生した場合、元の状態に戻すことができます

## 参考資料

- **[`docs/MERGE_GUIDE.md`](docs/MERGE_GUIDE.md)**: 詳細なマージガイド
- **[`docs/MERGE_TROUBLESHOOTING.md`](docs/MERGE_TROUBLESHOOTING.md)**: トラブルシューティングガイド
- **[`docs/MERGE_QUICK_REFERENCE.md`](docs/MERGE_QUICK_REFERENCE.md)**: クイックリファレンス
- **[`docs/MERGE_PROGRESS_REPORT.md`](docs/MERGE_PROGRESS_REPORT.md)**: 進捗レポート
- **[`scripts/merge-all-branches.sh`](scripts/merge-all-branches.sh)**: Bash用自動マージスクリプト
- **[`scripts/merge-all-branches.ps1`](scripts/merge-all-branches.ps1)**: PowerShell用自動マージスクリプト

## サポート

問題が発生した場合は：
1. トラブルシューティングガイドを参照
2. チームメンバーに相談
3. GitHub Issueを作成

---

**作成者**: Kilo Code
**日付**: 2026-01-30
**バージョン**: 1.0
