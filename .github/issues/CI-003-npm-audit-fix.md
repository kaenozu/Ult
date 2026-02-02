# [CI-003] npm audit失許容の解消

## 概要

`npm audit || true`で脆弱性を無視しています。セキュリティチェックを厳格化し、脆弱性を適切に管理します。

## 対応内容

1. **`--audit-level=high`で厳格化**
   - npm auditの閾値設定
   - 重大度に応じた対応フローの確立
   - CIでの失敗条件の設定

2. **既存脆弱性の修正対応**
   - 現在の脆弱性一覧の作成
   - 優先度に基づく修正計画
   - 段階的な修正実施

3. **失敗時の通知設定**
   - Slack通知の設定
   - 脆弱性レポートの自動生成
   - 対応期限の設定と追跡

## 受け入れ条件（Acceptance Criteria）

- [ ] `npm audit`が`--audit-level=high`で実行され、High以上の脆弱性で失敗する
- [ ] 既存のHigh/Critical脆弱性が修正または除外リストに登録されている
- [ ] 脆弱性検出時にSlack通知が送信される
- [ ] 脆弱性対応のSLAが定義され、追跡されている
- [ ] 除外リストに登録された脆弱性に対する正当な理由が記録されている
- [ ] 週次の脆弱性レポートが自動生成される

## 関連するレビュー発見事項

- `npm audit || true`で脆弱性を無視している
- High/Critical脆弱性が検出されてもCIが成功する
- 脆弱性対応の優先順位付けが不明確

## 想定工数

12時間

## 優先度

High

## 担当ロール

DevOps Engineer

## ラベル

`ci-cd`, `priority:high`, `security`, `dependencies`

---

## 補足情報

### npm audit設定案

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 1'  # 週1回

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: false
      
      - name: Notify on failure
        if: failure()
        uses: slack/notify@v1
        with:
          message: 'High severity vulnerability detected!'
```

### 脆弱性対応フロー

```
1. npm audit検出
2. 重大度評価
3. 修正可能か判断
   ├── Yes → 即座に修正
   └── No → 除外リストに登録（理由記録）
4. 対応完了報告
```

### 除外リストテンプレート

```json
{
  "advisories": {
    "GHSA-xxxx-xxxx-xxxx": {
      "reason": "開発環境のみで使用、本番には影響なし",
      "expires": "2026-03-01",
      "approved_by": "security-lead"
    }
  }
}
```
