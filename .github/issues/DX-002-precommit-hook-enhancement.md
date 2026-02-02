# [DX-002] プレコミットフック強化

## 概要

品質ゲートの事前チェックが不十分です。プレコミットフックを強化し、問題を早期に検出します。

## 対応内容

1. **`scripts/quality-gates-check.sh`改善**
   - チェック項目の追加
   - エラーメッセージの改善
   - 実行時間の最適化

2. **lint-staged導入**
   - ステージングされたファイルのみを対象に
   - 並列実行による高速化
   - 自動修正の適用

3. **コミットメッセージ検証**
   - Conventional Commits準拠の検証
   - チケット番号の必須化（オプション）
   - コミットメッセージテンプレート

## 受け入れ条件（Acceptance Criteria）

- [ ] `quality-gates-check.sh`が改善され、全品質チェックを実行する
- [ ] lint-stagedが導入され、ステージングファイルのみを対象にする
- [ ] コミットメッセージがConventional Commits形式で検証される
- [ ] プレコミット実行時間が30秒以内に収まる
- [ ] プレコミット成功率が90%以上に向上する
- [ ] CI失敗率が50%減少する

## 関連するレビュー発見事項

- 品質ゲートの事前チェックが不十分
- lintエラーがコミット後に発覚する
- コミットメッセージに一貫性がない

## 想定工数

8時間

## 優先度

High

## 担当ロール

DevOps Engineer

## ラベル

`dx`, `priority:high`, `git`, `quality-gates`

---

## 補足情報

### lint-staged設定

```json
// .lintstagedrc.json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ],
  "*.py": [
    "black",
    "flake8"
  ]
}
```

### コミットメッセージ検証

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'chore', 'ci', 'build'
    ]],
    'subject-case': [0],
    'header-max-length': [2, 'always', 72]
  }
};
```

### プレコミットフロー

```
1. git commit実行
2. lint-staged実行
   ├── ESLint --fix
   ├── Prettier --write
   └── 自動修正適用
3. commitlint実行
4. quality-gates-check.sh実行
   ├── TypeScript型チェック
   ├── テスト実行（変更関連）
   └── セキュリティスキャン
5. 全チェック通過 → コミット完了
```
