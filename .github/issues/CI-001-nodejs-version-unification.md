# [CI-001] Node.jsバージョン統一

## 概要

`ci.yml`: Node.js 18、`test.yml`/`lint.yml`/`security.yml`: Node.js 20で不一致があります。全ワークフローでNode.jsバージョンを統一し、一貫性のあるビルド環境を構築します。

## 対応内容

1. **全ワークフローのNode.jsバージョンを20に統一**
   - `.github/workflows/ci.yml`の更新
   - `.github/workflows/test.yml`の更新
   - `.github/workflows/lint.yml`の更新
   - `.github/workflows/security.yml`の更新

2. **`.github/workflows/common.env`で一元管理**
   - 環境変数ファイルの作成
   - ワークフローからの参照設定
   - バージョン変更時の一元管理実現

## 受け入れ条件（Acceptance Criteria）

- [ ] 全ワークフローでNode.js 20が使用されている
- [ ] `.github/workflows/common.env`が作成され、Node.jsバージョンが一元管理されている
- [ ] 全ワークフローが正常に実行される
- [ ] バージョン統一後、CI成功率が95%以上を維持している
- [ ] ドキュメントにNode.jsバージョン要件が記載されている

## 関連するレビュー発見事項

- `ci.yml`: Node.js 18を使用
- `test.yml`/`lint.yml`/`security.yml`: Node.js 20を使用
- バージョン不一致による予期しない動作のリスク

## 想定工数

8時間

## 優先度

High

## 担当ロール

DevOps Engineer

## ラベル

`ci-cd`, `priority:high`, `nodejs`, `maintenance`

---

## 補足情報

### 変更対象ワークフロー

- [ ] `.github/workflows/ci.yml`
- [ ] `.github/workflows/test.yml`
- [ ] `.github/workflows/lint.yml`
- [ ] `.github/workflows/security.yml`
- [ ] `.github/workflows/deploy.yml`（存在する場合）

### common.env構成案

```bash
# .github/workflows/common.env
NODE_VERSION=20
PYTHON_VERSION=3.11
JAVA_VERSION=17
```

### ワークフロー参照例

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Load environment variables
        run: cat .github/workflows/common.env >> $GITHUB_ENV
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
```
