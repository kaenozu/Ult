# [CI-006] 環境別デプロイ自動化

## 概要

開発/ステージング/本番の切り替えが手動で行われています。環境別デプロイを自動化し、効率性と信頼性を向上させます。

## 対応内容

1. **環境別ワークフロー整理**
   - 開発環境（developブランチ）自動デプロイ
   - ステージング環境（stagingブランチ）自動デプロイ
   - 本番環境（mainブランチ）承認付きデプロイ

2. **自動プロモーション設定**
   - develop → staging の自動プロモーション
   - staging → main の手動承認フロー
   - リリースノート自動生成

3. **承認フロー導入**
   - 本番デプロイ承認者の設定
   - 承認通知の設定
   - 承認履歴の記録

## 受け入れ条件（Acceptance Criteria）

- [ ] 開発環境への自動デプロイが設定されている
- [ ] ステージング環境への自動デプロイが設定されている
- [ ] 本番環境へのデプロイに承認フローが設定されている
- [ ] 環境間の自動プロモーションが設定されている
- [ ] デプロイ履歴が記録・閲覧可能である
- [ ] 環境別の設定管理が適切に行われている

## 関連するレビュー発見事項

- 環境切り替えが手動で行われている
- デプロイ手順が属人化している
- 環境間の差異管理が不十分

## 想定工数

20時間

## 優先度

Medium

## 担当ロール

DevOps Engineer

## ラベル

`ci-cd`, `priority:medium`, `deployment`, `automation`

---

## 補足情報

### 環境構成

| 環境 | ブランチ | デプロイ方式 | 承認 |
|------|----------|--------------|------|
| 開発 | develop | 自動 | 不要 |
| ステージング | staging | 自動 | 不要 |
| 本番 | main | 手動トリガー | 必要 |

### デプロイフロー

```
[develop] ──自動デプロイ──> [開発環境]
    │
    └── PRマージ ──自動──> [staging]
                            │
                            └── 承認 ──手動トリガー──> [本番]
```

### 承認フロー設定例

```yaml
# .github/workflows/production-deploy.yml
name: Production Deploy

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://ult-trading-platform.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: deploy --environment=production
```

```yaml
# GitHub Environment設定
environment: production
protection_rules:
  - type: required_reviewers
    reviewers:
      - tech-lead
      - devops-lead
  - type: wait_timer
    wait_timer: 60  # 60分待機
```
