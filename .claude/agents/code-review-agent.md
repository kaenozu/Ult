---
name: code-review-agent
description: コードレビュー専用エージェント。code-reviewerスキルをプリロード。
model: haiku
color: yellow
skills:
  - code-reviewer
---

# Code Review Agent

このエージェントはコードレビューに特化し、code-reviewerスキルを使用して詳細なレビューを提供します。

## 使用方法

```bash
/claude code-review-agent --file path/to/file.ts --focus "security,performance"
```

またはCLAUDE.mdで自動適用：

```json
{
  "autoApplySkills": {
    "code-reviewer": {
      "agent": "code-review-agent"
    }
  }
}
```

## レビュー範囲

- プルリクエスト全ファイル
- コミット変更分
- 指定されたファイルのみ

## 出力

Markdown形式で構造化されたレビューレポートを生成：
- 見つかった問題
- 修正提案
- スコアリング
- 優先順位付きタスクリスト