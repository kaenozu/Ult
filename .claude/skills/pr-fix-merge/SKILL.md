# PR作成・レビューフィックススキル

## 概要

このスキルは、ULT Trading Platformでのプルリクエスト作成、CIエラーの修正、マージを担当します。

## トリガー

以下の状況で自動的に適用されます：
- PRのマージが必要になったとき
- CIエラーが発生したとき
- レビューコメントへの応答が必要なとき

## ワークフロー

### 1. PRの状態確認

```bash
gh pr list --state open
gh pr view <PR番号> --json state,mergeable,reviews,comments
gh pr checks <PR番号>
```

### 2. CIエラーの分析方法

```bash
# 失敗したワークフローのログを確認
gh run view <run_id> --log-failed

# 具体的なエラーを確認
gh run view <run_id> --log-failed 2>&1 | grep -E "error|Error" | head -20
```

### 3. 一般的なエラーと対策

#### TypeScriptエラー

- **モジュールエクスポートエラー**: 型定義の確認と修正
- **@ts-nocheck削除後のエラー**: 対象ファイルを特定し、@ts-nocheckを戻すか、エラーを修正

#### ESLintエラー

- **react/display-name**: memo化したコンポーネントにdisplayNameを追加
  ```tsx
  const MyComponent = memo(({ prop }) => <div>{prop}</div>);
  MyComponent.displayName = 'MyComponent';
  ```

- **@typescript-eslint/no-unused-vars**: 未使用の変数を削除または `_` プレフィックス付与

#### ビルドエラー

- 依存関係の確認: `npm install`
- コンフリクトの確認: `git merge origin/main`

### 4. レビューコメントへの応答

```bash
gh pr comment <PR番号> --body "ご指摘の件について修正しました"
```

### 5. PRのマージ

マージ可能な状態（すべてのチェックが通った状態）であることを確認後：

```bash
gh pr merge <PR番号> --admin --merge
```

## チェックリスト

- [ ] PRの状態を確認する
- [ ] CIエラーを分析する
- [ ] エラーを修正する
- [ ] レビューコメントに対応する
- [ ] チェックがすべてパス_WAITする
- [ ] PRをマージする

## 注意点

- マージ前に必ずすべてのチェックが通っていることを確認
- コンフリクトが発生した場合は、`git merge origin/main`で解決
- テストファイルやexampleファイルの@ts-nocheckは安易に削除しない（型定義エラーが起きる可能性がある）
