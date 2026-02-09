# CLAUDE.md 設計ガイド

出典: https://github.com/shanraisshan/claude-code-best-practice

## 📏 長さの重要性

- **理想**: **150行以内**
- 150行以上の場合、Claudeの遵守率が低下
- 定期的に `/compact` 実行（50%コンテキスト使用時）

## 🏗️ アーキテクチャパターン

### Command → Agent → Skills

**目的**: プログレッシブディスクロージャとクリーンな分離

```
/claude weather-orchestration  (Command)
    ↓ invokes
weather Agent                 (Agent)
    ↓ uses preloaded
weather-fetcher Skill        (Skill)
weather-transformer Skill    (Skill)
```

**利点**:
- スキルは複数エージェントで再利用可能
- ドメイン知識を段階的に注入
- 単一実行コンテキストで一貫性を保持

## 🎯 ワークフロー設計

### DO ✅
- コマンドでワークフローを定義
- 機能固有のサブエージェント作成
- タスクを小さく分割（<50%コンテキスト）
- 計画モードから開始
- 手動 `/compact` 定期的実行

### DON'T ❌
- 汎用エージェント（肥大化）
- 過度な自動化（人的確認）
- モノリシックなCLAUDE.md（分割参照）

## 📦 モノレポ対応

### CLAUDE.md の検索
- 作業ディレクトリからルートへ探索
- 通常はルートの単一ファイルのみ

### スキル発見
- `.claude/skills/` を再帰探索
- 各パッケージに独立したスキル定義可能

## 🔧 YAML Frontmatter

### スキル定義
```yaml
---
name: skill-name
description: 適用条件
model: haiku  # または auto
context: fork  # 分離コンテキスト
allowed-tools: Bash,Read,Edit  # 制限可能
---
```

### エージェント定義
```yaml
---
name: agent-name
description: 適用条件（"PROACTIVELY"で自動）
tools: Bash,Read,Edit,Grep
model: haiku
color: yellow
skills:
  - skill1
  - skill2
---
```

## 🎨 自動適用設定

```json
{
  "autoApplySkills": {
    "dev-master": {
      "enabled": true,
      "agent": "dev-agent"
    },
    "code-reviewer": {
      "enabled": true,
      "agent": "code-review-agent"
    }
  }
}
```

## 🧪 テスト

### スキル単体テスト
```
/claude test-skill --skill dev-master --scenario "TypeScriptエラー修正"
```

### エージェント統合テスト
```
/claude test-agent --agent code-review-agent --input sample.ts
```

## ⚡ 実務のヒント

- `btw` = バックグラウンドタスクとして実行
- `"defaultMode": "bypassPermissions"` で権限バイパス
- `/doctor` で診断
- 状態行でコンテキスト意識
- ワークツリーで並行開発

参考: [Claude Code 公式ドキュメント](https://code.claude.com/docs/)