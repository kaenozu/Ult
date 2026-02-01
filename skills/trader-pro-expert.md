# Trader Pro Expert Skill

## 1. 安全なプロセス管理 (Safe Process Management)
Windows環境においてエージェント（自分自身）を殺さずに開発サーバーを管理する。
- **原則**: `taskkill` や `Stop-Process -Name node` は厳禁。エージェントが巻き込まれる。
- **特定**: `Get-NetTCPConnection -LocalPort 3000` を使用して、開発サーバーのPIDのみを狙い撃つ。
- **再起動**: サーバー停止後、`.next` キャッシュを削除し、`Start-Process` で新しいウィンドウで `npm run dev` を立ち上げる。

## 2. 市場ルールとシンボル処理 (Market Awareness)
Yahoo Finance API等の外部連携において、日本市場とインデックスを正確に区別する。
- **日本株**: 4桁数字には自動で `.T` を付与。
- **インデックス**: `^` で始まるシンボル（`^N225`, `^IXIC`等）には**決して接尾辞を付けない**。
- **バリデーション**: シンボルに `^`, `.`, `,` を許可し、一括取得（Batch）にも対応する。

## 3. 高度な診断手法 (Headless Diagnosis)
ブラウザ画面が見えない環境での不具合特定パターン。
- **UIインジェクション**: 画面上に一時的な「Clear Cache」ボタンや「Error Display」を埋め込み、プログラム的に操作してIndexedDBやステートをリセットする。
- **ファイルロギング**: サーバーサイド (`route.ts`等) でエラーオブジェクトを `JSON.stringify` して `server.log` 等に直接書き出し、詳細なスタックトレースを捕捉する。
- **API直叩き**: `curl` を使用してAPIレスポンスの `debug` フィールドを直接確認する。

## 4. データ整合性 (Persistence Strategy)
- **IndexedDB**: 過去5年分のデータを保持するが、取得失敗時の「空データ」が保存されないようガードを設ける。
- **デルタ取得**: 最後に保存された日付を確認し、差分のみをAPIから取得して爆速化を実現する。
