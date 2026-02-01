## 問題の概要
.trading-platform/.next/ディレクトリにビルド成果物とソースマップ（*.map）がコミットされており、リポジトリサイズが大きくなっています。

## 該当ファイル
- .next/build/chunks/*.js.map（複数ファイル）
- .next/dev/build/chunks/*.js.map（複数ファイル）
- .next/dev/server/**/*.js.map（複数ファイル）
- .next/cache/.tsbuildinfo
- .next/dev/logs/next-development.log

## 問題の詳細
ビルド成果物は自動生成されるため、リポジトリに含めるべきではありません。これらのファイルは：
- 各ビルドで再生成される
- サイズが大きい（数MB〜数十MB）
- バージョン管理の対象外

## 修正案
1. .next/ディレクトリ全体をgitから削除
2. .gitignoreに`.next/`を追加（すでに追加済みの可能性あり）
3. リモートからも削除（git filter-branchまたはBFG Repo-Cleaner使用）

## 優先度
**High** - リポジトリサイズ削減

## 補足
現時点で.next/は.gitignoreに含まれている可能性がありますが、過去にコミットされたファイルがリモートに残っている可能性があります。

Closes #307
