# ソースコードレビュー報告書

## 概要
プロジェクト「trading-platform」の全ソースコードレビューを実施しました。
全体として、Next.js App RouterとTypeScriptを使用したモダンな構成になっていますが、いくつかの重大な設計上の問題、コードの重複、およびテストの不整合が見つかりました。

## 1. 重大な問題 (Critical Issues)

### 1.1 コードの重複と構造ミス
- **`StockTable.tsx` の肥大化と重複**: `trading-platform/app/components/StockTable.tsx` 内部に `PositionTable` コンポーネントが定義されていますが、別途 `PositionTable.tsx` も存在します。これは二重管理となり、バグの温床です。
- **Lint設定の緩さ**: `eslint.config.mjs` で `@typescript-eslint/no-explicit-any": "off"` が設定されています。これは `GEMINI.md` の「厳格なTypeScript型定義」という方針に違反しています。

### 1.2 テストの失敗
`npm test` が失敗しています。
- **`SignalPanel.test.tsx`**: UIが日本語 ("買い") であるのに対し、テストコードが英語 ("BUY") を期待しているため失敗します。
- **`route.test.ts`**: APIのエラーハンドリングにおいて、テストが期待するステータスコード (500) と実装が返すコード (502) が一致していません。

### 1.3 アクセシビリティ
- `StockTable` 内の削除ボタン (ゴミ箱アイコン) に `aria-label` が設定されておらず、スクリーンリーダーユーザーにとって不親切です。

## 2. アーキテクチャと設定 (Architecture & Config)

### 2.1 ディレクトリ構造の不整合
`GEMINI.md` では `components/` や `lib/` はルート直下 (`trading-platform/components`) にあると記述されていますが、実際には `trading-platform/app/components` に配置されています。ドキュメントの更新が必要です。

### 2.2 APIとセキュリティ
- **`app/api/market/route.ts`**:
  - エラーハンドリングで `any` 型が使用されています。
  - `symbol` パラメータのバリデーションが簡易的です。
  - 外部API (`yahoo-finance2`) のエラー詳細をそのままクライアントに返す箇所があり、内部情報の漏洩リスクがあります。

### 2.3 状態管理 (`tradingStore.ts`)
- 初期データ (`initialPortfolio`) に `NVDA`, `AAPL` などのデータがハードコードされています。開発用であれば問題ありませんが、本番環境では空にするかAPIから取得すべきです。

## 3. コード品質 (Code Quality)

### 3.1 未使用の変数 (Lint Warnings)
32件のLint警告が出ています。主に `no-unused-vars` です。
- `StockChart.tsx`: `useEffect`, `useState`, `showIndicators` などが未使用。
- `analysis.ts`: 計算された変数が使われていない箇所があります。

### 3.2 スクリプト (`skills/`)
- **`frontend-tester.js`**: `checkConsoleErrors` という機能がありますが、実際にはブラウザのコンソールログをチェックしておらず、SSR時のHTMLレスポンス内のエラー文字列を検索しているだけです。機能名と実態が乖離しています。

## 4. 推奨される修正プラン

1.  **重複の解消**: `StockTable.tsx` から `PositionTable` と `HistoryTable` の定義を削除し、独立したファイル (`PositionTable.tsx`, `HistoryTable.tsx`) を使用するように修正する。
2.  **Lint設定の修正**: `no-explicit-any` を `warn` または `error` に戻し、`any` 使用箇所を適切な型に置き換える。
3.  **テストの修正**:
    - `SignalPanel.test.tsx` の期待値を日本語 ("買い") に修正する。
    - `route.test.ts` の期待するステータスコードを修正するか、実装側のステータスコードを統一する。
4.  **ドキュメント更新**: `GEMINI.md` のディレクトリ構造図を実態に合わせる。
5.  **不要コードの削除**: Lint警告に出ている未使用変数やインポートを削除する。

以上
