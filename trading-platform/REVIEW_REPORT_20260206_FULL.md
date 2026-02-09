# ソースコード詳細レビュー報告書 (2026年2月6日版)

## 1. エグゼクティブサマリー

本レビューでは、`trading-platform` (Next.js) および `backend` (Python) の全ソースコードを対象に、静的解析、手動レビュー、およびテスト実行による検証を行いました。

**総合評価:** 🔴 **要修正 (Critical Issues Found)**

前回のレビュー以降、Lint設定の改善など一部の進展は見られますが、**取引機能の中核に関わる重大なバグ**が新たに特定されました。特に注文パネル (`OrderPanel`) からの注文処理において、メソッドの不整合により実行時エラーが発生する状態であり、かつリスク管理設定が無視される実装になっています。また、テストスイートの大部分が環境設定やモックの不備により機能していません。

---

## 2. 重大な発見事項 (Critical Findings)

### 🚨 1. 注文機能のクラッシュ (`useOrderEntry.ts`)
注文パネルのロジックを担う `app/hooks/useOrderEntry.ts` において、存在しないメソッドを呼び出しています。

*   **詳細:** `useTradingStore` から `placeOrder` を取得して実行しようとしていますが、`app/store/tradingStore.ts` (および `portfolioStore.ts`) は `placeOrder` をエクスポートしていません（`executeOrder` しか存在しません）。
*   **影響:** ユーザーが「注文を確定」ボタンを押すと、`TypeError: placeOrder is not a function` によりアプリがクラッシュします。
*   **原因:** フロントエンドの実装が、APIクライアント (`useUnifiedTrading` や `UnifiedTradingPlatform`) のインターフェースと、Zustandストア (`useTradingStore`) のインターフェースを混同しています。

### 🚨 2. リスク管理設定の無視 (`OrderPanel.tsx`)
UI上でユーザーが設定したリスク管理パラメータ（ボラティリティ調整、トレイリングストップ等）が、実際の注文処理に渡されていません。

*   **詳細:** `OrderPanel.tsx` および `useOrderEntry.ts` は `riskConfig` ステートを管理していますが、注文実行関数（前述の `placeOrder`）を呼び出す際、この `riskConfig` を引数として渡していません。
*   **影響:** ユーザーがリスク設定を行っても、システムはデフォルト設定（または設定なし）で注文を行おうとします。

### 🚨 3. テストスイートの崩壊
`npm test` を実行した結果、多数のテストファイルが実行すらできない状態です。

*   **`OrderPanel.test.tsx`**: 実装とテストの乖離により失敗（モックが現状のコードと一致していない）。
*   **`api/trading/route.test.ts`**: エラーハンドリングのテストで、期待されるエラーメッセージと実際のエラー（"Internal server error"）が不一致。
*   **`DataAggregator.improved.test.ts`**: 依存モジュール `../../__tests__/test-utils` が見つからず実行不可。
*   **`AITradeService.test.ts`**: JSDOM環境に `crypto.randomUUID` が不足しており実行不可。
*   **`Screener.test.tsx`**: Zustandのモック設定 (`setState` の欠如) により失敗。

---

## 3. 分野別詳細レビュー

### 3.1 アーキテクチャと設定
*   ✅ **Lint設定**: `eslint.config.mjs` は適切に設定されており、以前指摘されていた `app/lib` の除外は解消されているように見えます（ただし、`npm run lint` コマンド自体がエラーになるケースが散見されました）。
*   ✅ **セキュリティ**: `next.config.ts` には強力なセキュリティヘッダー（CSP, HSTS）が設定されています。APIルートでも CSRF 対策と認証チェックが行われています。
*   ⚠️ **TypeScript**: `tsconfig.json` がテストファイルをコンパイル対象外 (`exclude`) にしているため、テストコード内の型エラーやインポートエラーがエディタ上やビルド時に検出されず、放置される原因となっています。

### 3.2 フロントエンド (`trading-platform`)
*   **パフォーマンス**: `UnifiedTradingDashboard.tsx` などでは `React.memo` や `useCallback` が適切に使用され、再レンダリング対策が行われています。
*   **データ取得**: `useStockData.ts` は `AbortController` を使用したクリーンアップや並列フェッチが実装されており、設計は良好です。
*   **コード品質**: プロダクションコード内に `console.log` が **649箇所** 残っており、デバッグログが垂れ流しになっています。適切なロガー (`app/core/logger.ts`) への置き換えが必要です。

### 3.3 バックエンド (`backend` Python)
*   **役割**: `backend/` ディレクトリは独立した Python ライブラリ群（需給分析、相関分析）であり、Webサーバー（Flask/FastAPI等）のエントリーポイントは見当たりません。
*   **現状**: 現在の Next.js アプリは `app/lib/tradingCore/UnifiedTradingPlatform.ts` (TypeScript) を中心に動作しており、Python バックエンドはまだ統合されていないか、オフライン分析用として独立しているようです。

---

## 4. 推奨アクションプラン

### フェーズ1: バグ修正 (最優先)
1.  **`useOrderEntry.ts` の修正**:
    *   `useTradingStore` の代わりに `useUnifiedTrading` フックを使用するか、`useTradingStore.executeOrder` を正しく呼び出すように変更する。
2.  **リスク設定の連携**:
    *   `placeOrder` (または `executeOrder`) の引数に `riskConfig` を追加し、バックエンド/ストア側でもそれを受け取れるように型定義 (`OrderRequest`) を更新する。

### フェーズ2: テスト環境の修復
1.  **環境設定**: `jest.setup.js` に `crypto` ポリフィルを追加する。
2.  **モック修正**: `OrderPanel.test.tsx` や `Screener.test.tsx` の Zustand モックを最新の実装に合わせて更新する。
3.  **パス解決**: `DataAggregator` テストで不足している `test-utils` のインポートパスを修正する。

### フェーズ3: コード品質向上
1.  **ロギング**: `console.log` を `logger.info/debug` に一括置換する。
2.  **不要コード削除**: `app/domains/backtest` と `app/lib/backtest` など、重複している可能性のある機能の実装状況を確認し、整理する。

---

**レビュー実施者:** Jules (AI Software Engineer)
**日付:** 2026/02/06
