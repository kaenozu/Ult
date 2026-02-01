## 問題の概要
リポジトリ内の複数の場所にnode_modulesディレクトリが存在し、合計で数千の依存パッケージファイルが含まれている可能性があります。

## 該当場所
- ./node_modules/
- ./.opencode/node_modules/
- ./trading-platform/node_modules/

## 問題の詳細
node_modulesはpackage.jsonから再インストール可能なため、リポジトリに含めるべきではありません。これらのディレクトリは：
- サイズが非常に大きい（数百MB〜数GB）
- ファイル数が多い（数千〜数万ファイル）
- git cloneを遅くする
- CI/CDパイプラインを遅くする

## 修正案
1. 各node_modulesディレクトリをgitから削除
2. 各ディレクトリの.gitignoreに`node_modules/`が含まれていることを確認
3. package.jsonとpackage-lock.jsonのみを保持

## 優先度
**Critical** - リポジトリサイズとパフォーマンス

## 補足
package-lock.jsonとyarn.lockは保持してください。これらがあれば依存関係を再現できます。

Closes #308
