# [DX-005] スキルスキーマバリデーション自動化

## 概要

スキルJSONの手動レビューが負担です。PR時の自動スキーマ検証を導入し、レビュー負担を軽減します。

## 対応内容

1. **PR時の自動スキーマ検証**
   - GitHub Actionsワークフロー作成
   - JSON Schema検証の実装
   - エラーの詳細出力

2. **エラー箇所の自動コメント**
   - PRに対する自動コメント
   - エラー箇所の行番号指定
   - 修正案の提示

3. **修正提案機能**
   - 自動修正スクリプトの提供
   - よくあるエラーの修正例
   - スキーマドキュメントのリンク

## 受け入れ条件（Acceptance Criteria）

- [ ] PR作成時に自動でスキーマ検証が実行される
- [ ] 検証エラーがPRに自動コメントされる
- [ ] エラー箇所が行番号付きで表示される
- [ ] よくあるエラーに対する修正提案が表示される
- [ ] スキーマ検証の実行時間が30秒以内である
- [ ] スキルJSONのレビュー時間が50%短縮されている

## 関連するレビュー発見事項

- スキルJSONの手動レビューが負担
- スキーマ違反がコミット後に発覚する
- レビュー指摘が属人化している

## 想定工数

12時間

## 優先度

Medium

## 担当ロール

Frontend Engineer

## ラベル

`dx`, `priority:medium`, `automation`, `skills`

---

## 補足情報

### ワークフロー設定

```yaml
# .github/workflows/skill-schema-validation.yml
name: Skill Schema Validation

on:
  pull_request:
    paths:
      - 'skills/**/*.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install ajv-cli
      
      - name: Validate skill JSONs
        run: |
          for file in $(git diff --name-only origin/main | grep 'skills/.*\.json'); do
            echo "Validating $file..."
            ajv validate -s skills/schema/skill-schema.json -d "$file" || exit 1
          done
      
      - name: Comment PR on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Skill schema validation failed. Please check the errors above.'
            })
```

### 検証項目

| 項目 | 検証内容 |
|------|----------|
| 必須フィールド | name, description, version |
| 型チェック | 各フィールドの型が正しい |
| 形式チェック | versionがsemver形式 |
| 参照整合性 | 関連スキルが存在する |

### エラーメッセージ例

```
❌ Schema validation failed for skills/new-skill.json

Line 15: "version" must match pattern "^\d+\.\d+\.\d+$"
   Current: "1.0"
   Expected: "1.0.0"

Line 23: Missing required property "description"
```
