# Agent Skill: Documentation & Knowledge Management

## 概要
このスキルは、Trading Platformプロジェクトのドキュメント作成と知識管理の自動化ガイドラインです。

## 適用シナリオ
- プロジェクトドキュメント作成
- 変更履歴の記録
- ナレッジベース構築
- スキルドキュメント作成

## ドキュメント種類と構成

### 1. プロジェクトコンテキスト（FOR_OPENCODE.md）

```markdown
# Project Name - Session Context

## 最終更新日
YYYY-MM-DD

## プロジェクト概要
- リポジトリ: [owner/repo]
- タイプ: [project type]
- 場所: [path]

## このセッションで実施した作業
### 1. [作業カテゴリ]
- 詳細
- 成果
- 関連ファイル

## 現在のリポジトリ状態
### ブランチ
- main: [status]
- feature branches: [list]

### Open Issues/PRs
- Issue: [count]
- PR: [count]

## コマンドリファレンス
```bash
# 主要コマンド
```

## 関連ドキュメント
- [links to other docs]
```

### 2. スキルドキュメント（.github/skills/*.md）

```markdown
# Agent Skill: [Skill Name]

## 概要
[スキルの簡潔な説明]

## 適用シナリオ
- [トリガー1]
- [トリガー2]

## ワークフロー
### Phase 1: [ステップ名]
```bash
[コマンド]
```

## 重要な判断基準
### [基準名]
[詳細]

## トラブルシューティング
### [問題名]
[解決策]

## 関連ドキュメント
[リンク]
```

### 3. Issueテンプレート（.github/issue-*.md）

```markdown
## 問題の概要
[簡潔な説明]

## 該当箇所
- File: [パス]
- Lines: [行数]

## 問題の詳細
[コードスニペット]

## 修正案
[推奨される修正]

## 優先度
**[PRIORITY]** - [カテゴリ]

Closes #[Issue番号]
```

## 自動ドキュメント生成

### 1. コミットログからのCHANGELOG生成

```bash
# CHANGELOG.md自動生成
gh api repos/:owner/:repo/pulls?state=merged | jq -r '
  .[] | select(.merged_at > "2026-01-01") |
  "- \(.title) (\(.number))"
' > CHANGELOG.md
```

### 2. APIドキュメント生成

```bash
# OpenAPI仕様生成
npx next-swagger-doc-cli

# ドキュメントビルド
npm run docs:build
```

### 3. コードコメントからのドキュメント

```bash
# TypeDoc使用
npx typedoc --out docs src/

# JSDocからの生成
npx jsdoc -c jsdoc.conf.json
```

## ナレッジベース構築

### ディレクトリ構造

```
.github/
├── skills/              # エージェントスキル
│   ├── README.md       # スキルインデックス
│   ├── [skill-name].md # 個別スキル
├── issue-templates/     # Issueテンプレート
│   ├── bug.md
│   ├── feature.md
├── workflows/          # GitHub Actions
│   ├── test.yml
│   ├── deploy.yml
FOR_OPENCODE.md         # プロジェクトコンテキスト
CLAUDE.md              # 自動アクション設定
CHANGELOG.md           # 変更履歴
```

### ナレッジベース検索

```bash
# ドキュメント内検索
grep -r "search term" .github/skills/

# 全ドキュメント一覧
find .github -name "*.md" -type f
```

## ドキュメント作成ワークフロー

### 新規スキル作成手順

1. **要件分析**
   ```bash
   # これまでの作業を分析
   git log --oneline --since="1 week ago"
   
   # よく使うコマンドを特定
   history | grep "gh " | sort | uniq -c | sort -rn | head -20
   ```

2. **テンプレート選択**
   - 技術スキル → skills/[name].md
   - プロジェクト情報 → FOR_OPENCODE.md
   - 手順書 → ワークフロー形式

3. **内容作成**
   ```markdown
   # Agent Skill: [Name]
   
   ## 概要
   [1-2文で説明]
   
   ## 適用シナリオ
   - [具体的なトリガー]
   
   ## ワークフロー
   [ステップバイステップ]
   
   ## 実践例
   [実際の使用例]
   ```

4. **検証と改善**
   - 実際に使用してテスト
   - 不足箇所の特定
   - フィードバック反映

### ドキュメント更新パターン

```bash
# 変更検出
gh pr list --state merged --limit 10

# 関連ドキュメント特定
# → FOR_OPENCODE.md更新
# → スキルドキュメント更新

# 自動更新スクリプト
#!/bin/bash
# update-docs.sh

PR_COUNT=$(gh pr list --state merged --since "1 week ago" | wc -l)
if [ $PR_COUNT -gt 0 ]; then
  echo "Updating FOR_OPENCODE.md with $PR_COUNT new PRs..."
  # 自動更新ロジック
fi
```

## ドキュメント品質基準

### 必須項目チェックリスト

- [ ] 明確なタイトル
- [ ] 簡潔な概要
- [ ] 具体的な適用シナリオ
- [ ] 実行可能なワークフロー
- [ ] 実践例またはテストケース
- [ ] 関連ドキュメントへのリンク

### 品質メトリクス

```bash
# ドキュメントカバレッジ
# スキル数 / 必要スキル数

# 更新頻度
# 最終更新日の確認
stat -c %y .github/skills/*.md

# 完全性チェック
for file in .github/skills/*.md; do
  grep -q "## 概要" "$file" && echo "✅ $file" || echo "❌ $file"
done
```

## ナレッジ共有

### チーム内展開

```bash
# ドキュメント同期
rsync -av .github/skills/ shared/skills/

# Wiki連携
gh repo wiki --clone
# ドキュメントをWikiにコピー
```

### 自動通知

```yaml
# .github/workflows/docs-update.yml
name: Documentation Update
on:
  push:
    paths:
      - '.github/skills/**'
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Notify team
        run: |
          echo "Documentation updated: ${{ github.sha }}"
          # Slack/Teams通知
```

## トラブルシューティング

### ドキュメントの重複

```bash
# 重複検出
dupfiles=$(find .github/skills -name "*.md" -exec md5sum {} + | 
  sort | uniq -w32 -dD)

if [ -n "$dupfiles" ]; then
  echo "Duplicate files found:"
  echo "$dupfiles"
fi
```

### 古いドキュメント

```bash
# 90日以上更新されていないファイルを検出
find .github/skills -name "*.md" -mtime +90 -ls

# 更新が必要なファイルリスト作成
find .github/skills -name "*.md" -mtime +90 > stale-docs.txt
```

## ベストプラクティス

### 1. 継続的更新
- 作業完了後すぐにドキュメント更新
- 小さな変更でも記録を残す
- 定期的な見直し（月1回）

### 2. 構造化
- 一貫したテンプレート使用
- 階層的な構成
- クロスリファレンスの活用

### 3. アクセシビリティ
- 検索可能なキーワード
- 目次とインデックス
- 関連ドキュメントへのリンク

## 関連ドキュメント
- FOR_OPENCODE.md - プロジェクトコンテキスト例
- .github/skills/README.md - スキルインデックス例
- CLAUDE.md - 自動アクション設定例
