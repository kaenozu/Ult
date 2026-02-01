# Agent Skill: Trading Platform PR & Issue Management

## 概要
このスキルは、Trading PlatformプロジェクトでのPull Request管理とIssue作成を自動化・最適化するためのガイドラインです。

## 適用シナリオ
- 複数のPRを一括マージする必要がある場合
- コードレビュー結果からIssueを作成する場合
- セキュリティ脆弱性を優先的に対処する場合

## ワークフロー

### 1. PR一括マージフロー

```bash
# ステップ1: オープンPRの確認
gh pr list --state open --json number,title,isDraft,mergeStateStatus

# ステップ2: 優先度に基づく分類
# Critical (セキュリティ): XSS、認証、レート制限
# High (安定性): メモリリーク、競合状態
# Medium (品質): アクセシビリティ、パフォーマンス
# Low (整備): ドキュメント、クリーンアップ

# ステップ3: ドラフトPRをReadyに変更
gh pr ready <pr-number>

# ステップ4: マージ（コンフリクト時は手動解決）
gh pr merge <pr-number> --squash --delete-branch
```

### 2. マージ順序のベストプラクティス

1. **基盤PRを先に**: 認証、レート制限など他の機能に影響を与えるもの
2. **独立したPRを次に**: メモリリーク修正など自己完結しているもの
3. **UI改善を最後に**: アクセシビリティ、スタイル調整など

### 3. コンフリクト解決パターン

```bash
# ブランチをチェックアウト
git fetch origin
git checkout origin/copilot/fix-branch-name

# メインブランチとの差分を確認
git diff main...HEAD

# コンフリクトを解決（修正内容を優先）
git merge origin/main --strategy-option theirs

# コミットとプッシュ
git commit -m "Resolve merge conflicts"
git push origin HEAD:refs/heads/copilot/fix-branch-name
```

## 重要な判断基準

### Critical優先度の定義
- XSS脆弱性
- 認証不足
- レート制限なし
- メモリリーク（大規模）

### High優先度の定義
- データ競合状態
- IPスプーフィングリスク
- WebSocket接続漏れ
- ErrorBoundary未適用

### マージ時の注意事項
- 必ず `--squash` を使用
- `--delete-branch` でブランチを削除
- マージ後は必ず `git fetch origin` を実行
- CIが通過していることを確認

## トラブルシューティング

### UNSTABLE状態のPR
1. `gh pr checks <number>` で詳細を確認
2. コンフリクトがある場合は手動解決
3. テスト失敗時はエラーログを分析

### ドラフトPRの大量発生
- Copilot/Botによる自動生成が原因
- 優先度順にReadyに変更してマージ
- 重複するPRは統合を検討

## 関連ファイル
- FOR_OPENCODE.md - プロジェクトコンテキスト
- CLAUDE.md - 品質基準と自動アクション
