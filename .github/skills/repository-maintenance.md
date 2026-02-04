# Repository Maintenance Agent

## Purpose
リポジトリの健全性維持と最適化を専門とするメンテナンスエージェント。

## Capabilities
- リポジトリサイズ管理と最適化
- 依存関係の定期的な更新とセキュリティパッチ
- ブランチ戦略の管理と整理
- コミット履歴のクリーンアップ
- ドキュメントの同期と整合性維持

## Core Responsibilities

### Repository Health
```bash
# リポジトリサイズ監視
du -sh .git/
gh api repos/:owner/:repo

# 不要ファイルのクリーンアップ
git fsck --full
git gc --aggressive --prune=now

# ブランチ整理
git remote prune origin
git branch -d $(git branch --merged)
git branch -r --merged | grep -v '\*/main$' | cut -d'/' -f2 | xargs -I {} git push origin --delete {}
```

### Dependency Management
```bash
# 脆弱性チェック
npm audit --audit-level=moderate
npm audit fix

# 依存関係更新
npx npm-check-updates -u
npm install

# 不要依存の検出
npx depcheck
npm prune
```

### Code Quality
```bash
# Lintとフォーマット
npm run lint:fix
npm run format
npm run type-check

# コード品質分析
npx sonar-scanner
npx eslint --ext .js,.jsx,.ts,.tsx .
```

## Maintenance Workflows

### Weekly Maintenance
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly Repository Maintenance ==="

# 1. 依存関係更新
echo "Updating dependencies..."
npx npm-check-updates -u
npm install

# 2. セキュリティスキャン
echo "Security audit..."
npm audit --audit-level=moderate

# 3. ビルドテスト
echo "Build test..."
npm run build

# 4. テスト実行
echo "Running tests..."
npm test

# 5. ドキュメント更新
echo "Updating documentation..."
npm run docs:build

# 6. Git最適化
echo "Git optimization..."
git gc --aggressive
```

### Monthly Deep Clean
```bash
#!/bin/bash
# monthly-cleanup.sh

echo "=== Monthly Deep Cleanup ==="

# 1. 古いブランチ削除
echo "Cleaning old branches..."
git branch --merged | grep -v '\*\|main\|develop' | xargs -n 1 git branch -d

# 2. 不要タグ削除
echo "Cleaning old tags..."
git tag -l | grep -v 'v[0-9]' | xargs git tag -d

# 3. LFS最適化
echo "LFS optimization..."
git lfs prune

# 4. プロジェクト監査
echo "Project audit..."
npx npm audit --audit-level=low
npx license-checker
```

## Repository Size Optimization

### Large File Handling
```bash
# 大ファイル検出
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | sort --numeric-sort --key=2 | tail -10

# BFGリポジトリクリーナー
java -jar bfg.jar --strip-blobs-bigger-than 100M .git

# Git LFS設定
git lfs migrate import --include="*.zip,*.jar,*.tar.gz,*.png,*.jpg,*.gif"
```

### Branch Management
```bash
# ブランチ戦略テンプレート
git flow init

# 機能ブランチの作成
git checkout -b feature/new-feature develop

# リリースブランチの作成
git checkout -b release/v1.0.0 develop

# ホットフィックスブランチの作成
git checkout -b hotfix/quick-fix main
```

## Automation Scripts

### Pre-commit Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit

npm run lint
npm run type-check
npm test -- --passWithNoTests
```

### Automated PR Labeling
```yaml
# .github/workflows/pr-labeler.yml
name: Pull Request Labeler

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v4
        with:
          configuration-path: .github/labeler.yml
```

### Dependabot Configuration
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "monthly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
```

## Monitoring & Alerts

### Repository Metrics
```bash
# 活動性チェック
git log --since="1 month ago" --pretty=format:"%h %s" | wc -l

# 貢献者チェック
git shortlog --since="1 month ago" --numbered --summary

# PR統計
gh pr list --state closed --limit 50 --json title,author,mergedAt
```

### Health Checks
```yaml
# .github/workflows/repo-health.yml
name: Repository Health Check

on:
  schedule:
    - cron: '0 0 * * 1'  # 毎週月曜日

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check repository size
        run: |
          SIZE=$(du -sh .git | cut -f1)
          if [[ $SIZE > "500M" ]]; then
            echo "Repository too large: $SIZE"
            exit 1
          fi
```

## Best Practices

### Commit Hygiene
```bash
# コミットメッセージルール
git commit -m "feat: add new feature"

# インタラクティブrebase
git rebase -i HEAD~5

# コミットの圧縮
git merge --squash feature-branch
```

### Documentation Maintenance
```bash
# README自動更新
npm run docs:generate

# APIドキュメント生成
npx swagger-jsdoc -d swaggerDef.js -o docs/api.json

# 変更ログ生成
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

## Troubleshooting

### Common Issues
1. **ビルド失敗**
   ```bash
   # キャッシュクリア
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Gitの問題**
   ```bash
   # コンフリクト解決
   git mergetool
   
   # リセット
   git reset --hard HEAD
   ```

3. **依存関係の競合**
   ```bash
   # 解決
   npm ls
   npm dedupe
   ```

## Integration Points

- **CI/CD**: 品質ゲートとの連携
- **Security**: 脆弱性スキャンとの統合
- **Code Review**: 自動レビュー実行
- **Documentation**: 自動ドキュメント更新

このエージェントはリポジトリの健全性を維持し、開発体験を向上させます。