## 問題の概要
trading-platform/coverageディレクトリにコードカバレッジレポートがコミットされており、リポジトリサイズを増やしています。

## 問題の詳細
coverageディレクトリには以下が含まれます：
- HTMLレポート（複数ファイル）
- JSONレポート
- LCOVレポート
- 各種統計ファイル

これらのファイルは：
- テスト実行のたびに再生成される
- サイズが大きい（数MB〜数十MB）
- バージョン管理の対象外

## 修正案
1. coverageディレクトリをgitから削除
2. .gitignoreに`coverage/`を追加
3. CIでカバレッジレポートをアーティファクトとして保存（gitには含めない）

## 優先度
**Medium** - リポジトリ管理

## 設定例
```gitignore
# coverage
coverage/
.nyc_output/
```

## 補足
カバレッジレポートは以下の方法で共有してください：
- CIの成果物として保存
- CodecovやCoverallsなどのサービスにアップロード
- ローカルでのみ生成

Closes #316
