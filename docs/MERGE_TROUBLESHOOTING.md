# Gitマージトラブルシューティングガイド

このガイドは、Gitブランチのマージ中に発生する可能性のある問題の解決方法を提供します。

## 目次

1. [一般的な問題](#一般的な問題)
2. [コンフリクトの解決](#コンフリクトの解決)
3. [ビルドエラー](#ビルドエラー)
4. [テストエラー](#テストエラー)
5. [Git操作の問題](#git操作の問題)
6. [緊急対応](#緊急対応)

## 一般的な問題

### 問題: マージが失敗する

**症状:**
```bash
$ git merge origin/fix/ci-lint-errors
error: Merge failed.
```

**原因:**
- コンフリクトが発生
- リモートブランチが存在しない
- 作業ディレクトリがクリーンでない

**解決方法:**

1. コンフリクトを確認
```bash
git status
git diff --name-only --diff-filter=U
```

2. 作業ディレクトリをクリーンにする
```bash
git stash
# または
git commit -am "一時的なコミット"
```

3. リモートブランチの存在を確認
```bash
git branch -r | grep fix/ci-lint-errors
```

### 問題: リモートブランチが見つからない

**症状:**
```bash
$ git merge origin/fix/ci-lint-errors
fatal: 'origin/fix/ci-lint-errors' does not point to a commit
```

**原因:**
- リモート情報が古い
- ブランチが削除された
- ブランチ名が間違っている

**解決方法:**

1. リモート情報を更新
```bash
git fetch origin
```

2. ブランチの存在を確認
```bash
git branch -r | grep fix/ci-lint-errors
```

3. 正しいブランチ名を確認
```bash
git branch -r | grep fix
```

## コンフリクトの解決

### 問題: コンフリクトマーカーが多数ある

**症状:**
```typescript
<<<<<<< HEAD
const value = 10;
=======
const value = 20;
>>>>>>> origin/fix/ci-lint-errors
```

**解決方法:**

1. コンフリクトファイルを一覧表示
```bash
git status | grep "both modified"
```

2. 各ファイルを編集して解決
```bash
# VS Codeで開く
code trading-platform/app/lib/constants.ts

# またはコマンドラインで編集
vim trading-platform/app/lib/constants.ts
```

3. 解決したファイルをステージング
```bash
git add trading-platform/app/lib/constants.ts
```

4. マージを完了
```bash
git commit
```

### 問題: 複雑なコンフリクト

**症状:**
- 同じファイルで複数のコンフリクト
- リネームされたファイルのコンフリクト
- バイナリファイルのコンフリクト

**解決方法:**

1. コンフリクトの詳細を確認
```bash
git diff --ours --theirs trading-platform/app/lib/constants.ts
```

2. マージツールを使用
```bash
git mergetool trading-platform/app/lib/constants.ts
```

3. 手動で統合
```bash
# 両方の変更を統合する場合
const value = 15; // 両方の値の平均
```

4. 特定の変更を採用
```bash
# HEAD（ローカル）を採用
git checkout --ours trading-platform/app/lib/constants.ts

# リモートを採用
git checkout --theirs trading-platform/app/lib/constants.ts
```

### 問題: バイナリファイルのコンフリクト

**症状:**
```bash
$ git merge origin/fix/ci-lint-errors
Auto-merging image.png
CONFLICT (content): Merge conflict in image.png
```

**解決方法:**

1. どちらのバージョンを使用するか決定
```bash
# ローカルバージョンを使用
git checkout --ours image.png

# リモートバージョンを使用
git checkout --theirs image.png
```

2. 手動でファイルを編集（可能な場合）
```bash
# 外部ツールで開いて編集
```

3. 解決したファイルをステージング
```bash
git add image.png
```

## ビルドエラー

### 問題: TypeScript型エラー

**症状:**
```bash
$ npm run build
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

**解決方法:**

1. 型エラーの詳細を確認
```bash
npm run type-check
```

2. 問題のファイルを修正
```typescript
// エラー
const value: string = "10";
const result = add(value, 5);

// 修正
const value: number = 10;
const result = add(value, 5);
```

3. 型定義を確認
```typescript
// 型定義ファイルを確認
// trading-platform/app/types/index.ts
```

### 問題: 依存関係の問題

**症状:**
```bash
$ npm run build
error: Cannot find module 'some-package'
```

**解決方法:**

1. 依存関係を再インストール
```bash
rm -rf node_modules package-lock.json
npm install
```

2. パッケージのバージョンを確認
```bash
npm list some-package
```

3. パッケージを更新
```bash
npm update some-package
```

### 問題: 構文エラー

**症状:**
```bash
$ npm run build
error: Unexpected token
```

**解決方法:**

1. エラーの詳細を確認
```bash
npm run build 2>&1 | grep -A 5 "error"
```

2. 問題の行を確認
```bash
# エラーメッセージから行番号を特定
# trading-platform/app/lib/constants.ts:42
```

3. 構文を修正
```javascript
// エラー
const value = {
  key: "value"
}

// 修正
const value = {
  key: "value"
};
```

## テストエラー

### 問題: アサーションエラー

**症状:**
```bash
$ npm test
FAIL  app/__tests__/example.test.ts
  ✕ should return correct value (5 ms)

  ● should return correct value
    expect(received).toBe(expected)
    Expected: 10
    Received: 20
```

**解決方法:**

1. テストコードを確認
```typescript
test('should return correct value', () => {
  const result = calculate(5);
  expect(result).toBe(10); // 期待値を確認
});
```

2. 実装コードを確認
```typescript
function calculate(value: number): number {
  return value * 2; // 実装を確認
}
```

3. 期待値または実装を修正
```typescript
// 期待値を修正
expect(result).toBe(20);

// または実装を修正
return value; // 期待値に合わせて実装を修正
```

### 問題: タイムアウトエラー

**症状:**
```bash
$ npm test
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**解決方法:**

1. タイムアウト時間を延長
```typescript
test('async test', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
}, 10000); // タイムアウトを10秒に延長
```

2. 非同期処理を最適化
```typescript
// 非同期処理を並列化
const [result1, result2] = await Promise.all([
  asyncOperation1(),
  asyncOperation2()
]);
```

3. モックを使用
```typescript
jest.mock('./api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'test' })
}));
```

### 問題: 環境設定エラー

**症状:**
```bash
$ npm test
Error: ENOENT: no such file or directory, open '.env.test'
```

**解決方法:**

1. 環境ファイルを作成
```bash
cp .env.example .env.test
```

2. 環境変数を設定
```bash
export NODE_ENV=test
```

3. テスト設定を確認
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js']
};
```

## Git操作の問題

### 問題: マージを中止できない

**症状:**
```bash
$ git merge --abort
fatal: There is no merge to abort
```

**解決方法:**

1. 現在の状態を確認
```bash
git status
```

2. リセットする
```bash
# 直前のコミットを取り消す
git reset --hard HEAD~1

# 特定のコミットに戻す
git reset --hard <commit-hash>
```

3. クリーンな状態に戻す
```bash
git clean -fd
git reset --hard HEAD
```

### 問題: コミットメッセージの修正

**症状:**
- コミットメッセージに誤字がある
- マージコミットメッセージを変更したい

**解決方法:**

1. 直前のコミットメッセージを修正
```bash
git commit --amend
```

2. 特定のコミットメッセージを修正
```bash
git rebase -i HEAD~3
# 修正したいコミットの「pick」を「edit」に変更
# エディタでコミットメッセージを修正
git commit --amend
git rebase --continue
```

### 問題: 誤ってマージした

**症状:**
- 誤ったブランチをマージしてしまった
- マージを取り消したい

**解決方法:**

1. マージを取り消す
```bash
git reset --hard HEAD~1
```

2. リモートの変更を取り消す
```bash
git reset --hard origin/main
```

3. 強制プッシュ（注意が必要）
```bash
git push origin main --force
```

## 緊急対応

### シナリオ1: 本番環境で問題が発生

**手順:**

1. 問題を特定
```bash
git log --oneline -10
git diff HEAD~1 HEAD
```

2. ホットフィックスブランチを作成
```bash
git checkout -b hotfix/urgent-fix
```

3. 修正をコミット
```bash
git commit -am "緊急修正: [問題の説明]"
```

4. マージしてデプロイ
```bash
git checkout main
git merge hotfix/urgent-fix
git push origin main
```

### シナリオ2: マージでビルドが壊れた

**手順:**

1. マージを取り消す
```bash
git reset --hard HEAD~1
```

2. 問題のブランチを調査
```bash
git diff main origin/problematic-branch
```

3. 小さくマージ
```bash
git merge --no-ff origin/problematic-branch --no-commit
# コンフリクトを解決
git commit
```

### シナリオ3: コンフリクトが多すぎる

**手順:**

1. マージを中止
```bash
git merge --abort
```

2. リベースを試す
```bash
git checkout origin/problematic-branch
git rebase main
```

3. スカッシュマージを試す
```bash
git merge --squash origin/problematic-branch
git commit -m "マージ: problematic-branch"
```

## 予防策

### 定期的なマージ

```bash
# 毎週金曜日にマージを実施
# 週次マージのスクリプトを作成
```

### ブランチの小さな維持

```bash
# ブランチを小さく保つ
# 頻繁にmainにマージ
```

### コードレビュー

```bash
# マージ前にコードレビューを実施
# プルリクエストを使用
```

### 自動テスト

```bash
# CI/CDパイプラインを設定
# 自動テストを実行
```

## 参考リソース

- [Git公式ドキュメント](https://git-scm.com/doc)
- [GitHubトラブルシューティング](https://docs.github.com/en/github/troubleshooting-github-errors)
- [Stack Overflow - Git](https://stackoverflow.com/questions/tagged/git)

---

このガイドは、Gitマージのトラブルシューティングを支援するために作成されました。問題が発生した場合は、このガイドを参照して解決してください。
