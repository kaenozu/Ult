# Agent Skill: GitHub Repository Management

## 概要
このスキルは、GitHubリポジトリの効率的な管理とメンテナンスのためのガイドラインです。

## 適用シナリオ
- リポジトリの健全性チェック
- Issue/PRの一括管理
- ブランチの整理

## 基本コマンド

### 1. リポジトリ状態の確認

```bash
# 現在のブランチ状態
git status

# リモートブランチの同期
git fetch origin

# コミット履歴の確認
git log --oneline -10

# 未マージブランチの確認
git branch -a --no-merged
```

### 2. Issue管理

```bash
# 全Issue一覧
gh issue list --state all --limit 100

# ラベルでフィルタ
gh issue list --label "security,critical"

# クローズ済みIssue
gh issue list --state closed

# 特定ユーザーへの割り当て
gh issue edit <number> --add-assignee "@me"
```

### 3. Pull Request管理

```bash
# オープンPR一覧
gh pr list --state open

# 詳細情報付き
gh pr list --json number,title,headRefName,isDraft,mergeStateStatus

# PRの詳細確認
gh pr view <number>

# CIチェック状態
gh pr checks <number>

# レビュー状態
gh pr view <number> --json reviewDecision
```

## 高度な操作

### ブランチ一括削除

```bash
# マージ済みブランチの削除（ローカル）
git branch --merged | grep -v "\\*\\|main" | xargs -n 1 git branch -d

# リモートマージ済みブランチの削除
gh api repos/:owner/:repo/branches | jq -r '.[].name' | while read branch; do
  if gh api repos/:owner/:repo/branches/$branch | jq -e '.protected == false' > /dev/null 2>&1; then
    echo "Can delete: $branch"
  fi
done
```

### Issue一括作成パターン

```bash
# 複数Issueを連続作成
for i in {1..5}; do
  gh issue create \
    --title "[Medium] Fix issue $i" \
    --body "Description for issue $i" \
    --label "technical-debt"
done
```

### ステータスチェック自動化

```bash
# 全PRのCI状態確認
gh pr list --state open --json number | jq -r '.[].number' | while read pr; do
  echo "PR #$pr:"
  gh pr checks $pr 2>&1 | grep -E "(pass|fail|pending)"
done
```

## 緊急時の対応

### コンフリクト解決フロー

```bash
# 1. 対象ブランチをフェッチ
git fetch origin pull/<number>/head:pr-<number>

# 2. チェックアウト
git checkout pr-<number>

# 3. メインをマージ（コンフリクト解決）
git merge origin/main

# 4. コンフリクトファイルを編集
# [編集作業]

# 5. 解決をコミット
git add .
git commit -m "Resolve merge conflicts"

# 6. プッシュ
git push origin pr-<number>:refs/heads/original-branch-name
```

### 緊急ロールバック

```bash
# 直前のマージを取り消
git revert -m 1 HEAD

# 特定コミットまでリセット
git reset --hard <commit-hash>

# 強制プッシュ（注意！）
git push origin main --force-with-lease
```

## 自動化スクリプト

### PR自動マージスクリプト

```bash
#!/bin/bash
# merge-ready-prs.sh

gh pr list --state open --json number,isDraft,mergeStateStatus | jq -r '
  .[] | select(.isDraft == false and .mergeStateStatus == "CLEAN") | .number
' | while read pr; do
  echo "Merging PR #$pr..."
  gh pr merge $pr --squash --delete-branch --auto
done
```

### 古いIssue自動クローズ

```bash
#!/bin/bash
# close-stale-issues.sh

gh issue list --state open --label "stale" --json number,updatedAt | jq -r '
  .[] | select(.updatedAt < "2025-01-01") | .number
' | while read issue; do
  echo "Closing stale issue #$issue..."
  gh issue close $issue --comment "Automatically closed due to inactivity"
done
```

## ベストプラクティス

### コミットメッセージ規約
- `feat:` - 新機能
- `fix:` - バグ修正
- `perf:` - パフォーマンス改善
- `refactor:` - リファクタリング
- `docs:` - ドキュメント
- `test:` - テスト追加

### ブランチ命名規約
- `feature/description` - 新機能
- `fix/description` - バグ修正
- `hotfix/description` - 緊急修正
- `refactor/description` - リファクタリング

### マージ戦略
- 常に `--squash` を使用（履歴をクリーンに保つ）
- 削除済みブランチは定期的に掃除
- マージ前に必ずCIパスを確認

## トラブルシューティング

### APIレート制限
```bash
# 残りレート制限確認
gh api /rate_limit | jq '.rate.remaining'
```

### 認証エラー
```bash
# 認証状態確認
gh auth status

# 再認証
gh auth refresh
```

### リポジトリ移動/リネーム
```bash
# リモートURL更新
git remote set-url origin https://github.com/newowner/newrepo.git
```

## 関連ドキュメント
- FOR_OPENCODE.md - プロジェクト固有のコンテキスト
- .github/skills/pr-management.md - PR管理スキル
- .github/skills/code-review.md - コードレビュースキル
