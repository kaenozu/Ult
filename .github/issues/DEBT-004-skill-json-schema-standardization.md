# [DEBT-004] スキルシステムJSONスキーマ標準化

## 概要

スキルJSONに3パターンの構造が混在（parameters型/capabilitiesのみ型/最小限型）しています。統一されたスキーマを定義し、保守性と検証可能性を向上させます。

## 対応内容

1. **`skills/schema/skill-schema.json`作成**
   - JSON Schema Draft 7準拠のスキーマ定義
   - 必須フィールドとオプションフィールドの明確化
   - 型定義とバリデーションルールの設定

2. **既存スキルのバリデーション**
   - 全スキルJSONのスキーマ適合チェック
   - 非適合スキルの一覧作成
   - 段階的な修正計画の策定

3. **重複スキルの統合**
   - 類似スキルの特定と分析
   - 統合方針の決定
   - 段階的な削除・統合実施

## 受け入れ条件（Acceptance Criteria）

- [ ] `skills/schema/skill-schema.json`が作成され、全スキル構造を網羅している
- [ ] 全スキルJSONがスキーマに適合している（または適合への移行計画が策定されている）
- [ ] CIでPR時に自動スキーマバリデーションが実行される
- [ ] スキーマ違反時に明確なエラーメッセージが表示される
- [ ] スキーマ定義に関するドキュメントが作成されている
- [ ] 重複スキルが統合または削除され、スキル数が最適化されている

## 関連するレビュー発見事項

- スキルJSONに3パターンの構造が混在
  - parameters型（従来型）
  - capabilitiesのみ型
  - 最小限型
- スキルの重複が複数存在
- スキーマ検証が手動で行われており負担が大きい

## 想定工数

32時間

## 優先度

Medium

## 担当ロール

Frontend Engineer + Architect

## ラベル

`tech-debt`, `priority:medium`, `frontend`, `schema`

---

## 補足情報

### スキーマ構造案

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://ult-trading-platform/skill-schema.json",
  "title": "ULT Trading Platform Skill",
  "type": "object",
  "required": ["name", "description", "version"],
  "properties": {
    "name": {
      "type": "string",
      "description": "スキル名"
    },
    "description": {
      "type": "string",
      "description": "スキルの説明"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "parameters": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "type": { "type": "string" },
          "description": { "type": "string" },
          "required": { "type": "boolean" },
          "default": {}
        }
      }
    },
    "capabilities": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### 移行計画

| フェーズ | 期間 | 内容 |
|----------|------|------|
| Phase 1 | 1週間 | スキーマ定義作成、既存スキル分析 |
| Phase 2 | 2週間 | 既存スキルのスキーマ適合化 |
| Phase 3 | 1週間 | CI統合、バリデーション自動化 |
| Phase 4 | 2週間 | 重複スキル統合 |
