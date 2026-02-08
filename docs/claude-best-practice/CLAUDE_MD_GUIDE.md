# CLAUDE.md の設計ガイドライン

このドキュメントは `https://github.com/shanraisshan/claude-code-best-practice` の報告書から引用・要約。

## 長さの重要性

- **理想**: CLAUDE.md は **150行以内** に保つ
- それ以上の場合、Claude は遵守率が低下
-  `/compact` を定期的に実行（コンテキスト使用量 50% 程度で）

## 大規模モノレポでの挙動

### CLAUDE.md のロード
- **子孫ロード**: Claudeは作業ディレクトリからルートへ向けて祖先ディレクトリを探索
- **最上位のみ**: 通常はルートの単一の CLAUDE.md のみロード
- 複数の CLAUDE.md は 特定の条件下でのみ サポート

### スキルの発見
- **静的発見**: `.claude/skills/` ディレクトリを再帰的に探索
- 各スキルは `SKILL.md` が必要
- モノレポでは、各パッケージに独立した `.claude/skills/` を持つことが可能

## ワークフロー設計

### 推奨アーキテクチャ
```
Command → Agent → Skills
```

**例:**
- **Command**: `/weather-orchestration` - エントリーポイント
- **Agent**: `weather` - ワークフロー制御
- **Skills**: `weather-fetcher`, `weather-transformer` - ドメイン知識

### なぜこのパターンか
- **プログレッシブディスクロージャ**: 必要な知識だけを段階的に注入
- **単一実行コンテキスト**: エージェントが一貫して作業
- **クリーンな分離**: 各層の責務が明確
- **再利用性**: スキルは複数エージェントで共有可能

## ベストプラクティス

### DO:
- ✅ コマンドを使用（スタンドアロンエージェントより）
- ✅ 特定機能向けサブエージェント作成
- ✅ スキルによるプログレッシブディスクロージャ
- ✅ タスクを小さく分割（コンテキスト50%以内）
- ✅ 手動 `/compact` を定期的に実行
- ✅ 計画モード（plan mode）から開始

### DON'T:
- ❌ 汎用QA/バックエンドエージェント（肥大化）
- ❌ 過度なワークフロー（シンプルさを優先）
- ❌ 1つの巨大なCLAUDE.md（分割して参照）
- ❌ 自動化に依存しすぎ（人的確認も必要）

## 単体テストアーキテクチャ

### スキル単体テスト
```bash
/claude test-skill --skill dev-master --scenario "TypeScriptエラー修正"
```

### エージェント統合テスト
```bash
/claude test-agent --agent code-review-agent --input sample.ts
```

## 設定例

### auto-applyスキル
```json
{
  "autoApplySkills": {
    "dev-master": {
      "enabled": true,
      "agent": "dev-agent"
    }
  }
}
```

### モデル設定
```yaml
---
name: critical-task
model: opus
---
```

## リファレンス

- 完全な設定: [GitHub Reports](https://github.com/shanraisshan/claude-code-best-practice/tree/main/reports)
- スキル定義形式: YAML Frontmatter + Markdown
- エージェント定義: YAML Frontmatter + Markdown