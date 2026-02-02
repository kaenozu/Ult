# [CI-002] ワークフロー重複の解消

## 概要

複数ワークフローで同じセットアップ処理が重複しています。複合アクション化と`workflow_call`活用により、コード重複を解消し、保守性を向上させます。

## 対応内容

1. **複合アクション化**
   - 共通セットアップ処理の抽出
   - `.github/actions/setup-env/action.yml`作成
   - 依存関係インストール処理の共通化

2. **`workflow_call`活用による共通化**
   - 再利用可能なワークフローの作成
   - パラメータ化による柔軟性確保
   - 既存ワークフローのリファクタリング

## 受け入れ条件（Acceptance Criteria）

- [ ] 共通セットアップ処理が複合アクションとして抽出されている
- [ ] 重複コードが50%以上削減されている
- [ ] 全ワークフローが正常に実行される
- [ ] 新規ワークフロー作成時のテンプレートが整備されている
- [ ] ワークフローの変更が1箇所で全てに反映される

## 関連するレビュー発見事項

- 複数ワークフローで同じセットアップ処理が重複
- Node.jsセットアップ、依存関係インストール等が各ワークフローに記述
- 変更時に複数ファイルの修正が必要

## 想定工数

16時間

## 優先度

High

## 担当ロール

DevOps Engineer

## ラベル

`ci-cd`, `priority:high`, `refactoring`, `maintenance`

---

## 補足情報

### 複合アクション構成案

```yaml
# .github/actions/setup-env/action.yml
name: 'Setup Environment'
description: 'Setup Node.js and install dependencies'
inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '20'
runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
      shell: bash
```

### 再利用可能ワークフロー例

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      test-command:
        required: false
        type: string
        default: 'npm test'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-env
      - run: ${{ inputs.test-command }}
```

### 重複解消対象

| 処理 | 重複箇所数 | 共通化方法 |
|------|------------|------------|
| Node.jsセットアップ | 5+ | 複合アクション |
| 依存関係インストール | 5+ | 複合アクション |
| キャッシュ設定 | 4+ | 複合アクション |
| テスト実行 | 3+ | workflow_call |
| Lint実行 | 3+ | workflow_call |
