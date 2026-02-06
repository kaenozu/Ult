# Gitマージクイックリファレンス

このドキュメントは、Gitブランチのマージに関するよく使うコマンドと手順を迅速に参照するためのクイックリファレンスです。

## 基本コマンド

### 準備

```bash
# mainブランチに切り替え
git checkout main

# 最新の状態に更新
git pull origin main

# リモート情報を取得
git fetch origin

# 作業ディレクトリの状態を確認
git status
```

### マージ

```bash
# ブランチをマージ（マージコミットを作成）
git merge --no-ff origin/branch-name

# マージを中止
git merge --abort

# マージをコミット（コンフリクト解決後）
git commit
```

### コンフリクト解決

```bash
# コンフリクトファイルを一覧表示
git status | grep "both modified"

# コンフリクトファイルを確認
git diff --name-only --diff-filter=U

# ローカルの変更を採用
git checkout --ours file-path

# リモートの変更を採用
git checkout --theirs file-path

# 解決したファイルをステージング
git add file-path

# マージツールを使用
git mergetool file-path
```

### 履歴確認

```bash
# マージ履歴をグラフ表示
git log --graph --oneline --all

# 特定のブランチの履歴
git log origin/branch-name --oneline

# 変更の統計
git diff --stat main origin/branch-name

# マージベースを確認
git merge-base main origin/branch-name
```

## 自動スクリプトの使用

### Bashスクリプト (Linux/Mac/WSL)

```bash
# スクリプトに実行権限を付与
chmod +x scripts/merge-all-branches.sh

# スクリプトを実行
./scripts/merge-all-branches.sh

# テストをスキップして実行
SKIP_TESTS=true ./scripts/merge-all-branches.sh
```

### PowerShellスクリプト (Windows)

```powershell
# PowerShellスクリプトを実行
.\scripts\merge-all-branches.ps1

# テストをスキップして実行
$SkipTests = $true; .\scripts\merge-all-branches.ps1
```

## ビルドとテスト

### ビルド

```bash
# ビルドを実行
npm run build

# 型チェック
npm run type-check

# リント
npm run lint

# リントの自動修正
npm run lint -- --fix
```

### テスト

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test -- path/to/test.test.ts

# 特定のテストを実行
npm test -- --testNamePattern="テスト名"

# カバレッジレポート
npm test -- --coverage

# デバッグモード
npm test -- --debug
```

## トラブルシューティング

### 一般的な問題

```bash
# 作業ディレクトリをクリーンにする
git stash

# スタッシュを適用
git stash pop

# 直前のコミットを取り消す
git reset --hard HEAD~1

# 特定のコミットに戻す
git reset --hard <commit-hash>

# クリーンな状態に戻す
git clean -fd
git reset --hard HEAD
```

### 依存関係の問題

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# パッケージを更新
npm update

# 特定のパッケージを更新
npm update package-name
```

### TypeScriptエラー

```bash
# 型チェック
npm run type-check

# 型定義を確認
cat trading-platform/app/types/index.ts

# エラーの詳細を確認
npm run build 2>&1 | grep -A 5 "error"
```

## コミットメッセージ

### マージコミット

```
マージ: origin/branch-name をmainにマージ

- 主要な変更点
- 影響範囲
- 関連するIssue/PR番号
```

### 例

```
マージ: origin/fix/ci-lint-errors をmainにマージ

- ESLintエラーを修正
- TypeScript型エラーを解決
- 関連: #123
```

## ブランチの優先順位

### 高優先度 (最初にマージ)

```bash
git merge --no-ff origin/fix/ci-lint-errors
git merge --no-ff origin/fix/build-and-lint-errors
git merge --no-ff origin/fix/build-and-ts
git merge --no-ff origin/fix/typescript-errors
git merge --no-ff origin/fix/mvp-stabilization
```

### 中優先度

```bash
git merge --no-ff origin/refactor/code-quality-improvements
git merge --no-ff origin/refactor/type-safety
git merge --no-ff origin/refactor/magic-numbers-extraction
```

### 機能ブランチ

```bash
git merge --no-ff origin/feature/trading-platform-mvp
git merge --no-ff origin/feature/ai-prediction-error-display
git merge --no-ff origin/feature/ml-ensemble-prediction
```

### パフォーマンスブランチ

```bash
git merge --no-ff origin/bolt/optimize-store-selectors-4775789442959145478
git merge --no-ff origin/bolt/optimize-page-renders-5177960276316492258
git merge --no-ff origin/perf/backtest-optimization-14983486655620126981
```

### セキュリティブランチ

```bash
git merge --no-ff origin/sentinel/rate-limit-market-api-9978099823618813567
git merge --no-ff origin/sentinel-fix-alpha-vantage-security-14024923650376383263
git merge --no-ff origin/security/api-key-protection
```

### アクセシビリティブランチ

```bash
git merge --no-ff origin/palette-bottom-panel-aria-152332587082508800
git merge --no-ff origin/palette-mobile-sidebar-a11y-3472329217493109631
git merge --no-ff origin/palette-orderpanel-a11y-7042432316388344292
```

## チェックリスト

### マージ前

- [ ] mainブランチに切り替え
- [ ] mainブランチを最新に更新
- [ ] 作業ディレクトリがクリーン
- [ ] リモート情報を取得
- [ ] マージするブランチを確認

### マージ中

- [ ] ブランチをマージ
- [ ] コンフリクトを解決（必要な場合）
- [ ] ビルドを実行
- [ ] テストを実行
- [ ] マージをコミット

### マージ後

- [ ] 変更を確認
- [ ] リモートにプッシュ
- [ ] CI/CDパイプラインを確認
- [ ] チームに通知

## 緊急対応

### ホットフィックス

```bash
# ホットフィックスブランチを作成
git checkout -b hotfix/urgent-fix

# 修正をコミット
git commit -am "緊急修正: [問題の説明]"

# mainにマージ
git checkout main
git merge hotfix/urgent-fix

# プッシュ
git push origin main
```

### マージの取り消し

```bash
# 直前のマージを取り消す
git reset --hard HEAD~1

# リモートの変更を取り消す
git reset --hard origin/main

# 強制プッシュ（注意が必要）
git push origin main --force
```

## 有用なエイリアス

### .gitconfig に追加

```ini
[alias]
    # マージ関連
    mg = merge --no-ff
    mga = merge --abort
    mt = mergetool

    # 履歴関連
    lg = log --graph --oneline --all
    ls = log --stat
    ld = log --date=short --pretty=format:\"%ad %h %s\"

    # ステータス関連
    st = status
    co = checkout
    br = branch

    # コンフリクト関連
    cf = diff --name-only --diff-filter=U
    ours = checkout --ours
    theirs = checkout --theirs
```

### 使用例

```bash
# エイリアスを使用したマージ
git mg origin/fix/ci-lint-errors

# コンフリクトファイルを一覧表示
git cf

# ローカルの変更を採用
git ours file-path

# 履歴をグラフ表示
git lg
```

## 参考ドキュメント

- [マージガイド](./MERGE_GUIDE.md) - 詳細なマージ手順
- [トラブルシューティング](./MERGE_TROUBLESHOOTING.md) - 問題解決ガイド
- [Git公式ドキュメント](https://git-scm.com/doc) - Git公式ドキュメント

## サポート

問題が発生した場合は：

1. トラブルシューティングガイドを確認
2. チームメンバーに相談
3. GitHub Issueを作成

---

このクイックリファレンスは、Gitマージ作業を迅速に行うためのものです。詳細な情報はマージガイドとトラブルシューティングガイドを参照してください。
