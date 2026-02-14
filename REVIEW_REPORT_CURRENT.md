# ULT Trading Platform コードレビュー報告書 (最新版)

**日時**: 2026-02-14
**レビュアー**: Gemini CLI Agent
**対象**: 全ソースコード (`trading-platform/`, `backend/`)

## 📊 エグゼクティブサマリー

プロジェクトはNext.js App RouterとPythonバックエンドを組み合わせたモダンな構成で運用されています。`GEMINI.md` の規約には概ね従っていますが、アーキテクチャ移行期特有の「新旧コードの混在」と「技術的負債（Lint警告）」が課題です。
特に注文機能において、設定変更が反映されない重大なバグが発見されました。

---

## 🚨 クリティカルな不具合 (要修正)

### 1. 注文リスク設定の反映漏れ (Stale Closure Bug)
**ファイル**: `trading-platform/app/hooks/useOrderEntry.ts` (L130付近)
**重要度**: 🔥 Critical

**問題の詳細**:
注文処理を行う `handleOrder` 関数内で `riskConfig` を参照していますが、`useCallback` の依存配列に `riskConfig` が含まれていません。
これにより、**ユーザーがリスク設定を変更しても、関数が更新されず、初期値（または古い設定）のまま注文が送信される**という不具合が発生します。React Compilerもこれを検知し、最適化をスキップしています。

**修正案**:
```typescript
// 修正前
}, [executeOrder, stock, orderType, side, quantity, price, currentPrice]);

// 修正後
}, [executeOrder, stock, orderType, side, quantity, price, currentPrice, riskConfig]);
```

---

## ⚠️ アーキテクチャとコード品質

### 2. 状態管理の重複と混乱
**ファイル**: `app/store/journalStore.ts` と `app/store/journalStoreExtended.ts`
**重要度**: High

**問題の詳細**:
トレード日誌機能に関して、単純なCRUD版とAI機能付きの拡張版が別々のストアとして定義され、両方が `index.ts` からエクスポートされています。これにより以下のリスクがあります：
- データの分断（片方だけ更新される）。
- 開発者の混乱（どちらを使うべきか不明）。

**推奨アクション**:
`journalStore.ts` を削除し、`journalStoreExtended.ts`（またはその機能を統合した単一ストア）に一本化してください。

### 3. Lint警告とコードの汚れ
**現状**: 685件の警告（主に `no-unused-vars`, `no-explicit-any`）
**評価**:
機能には影響しませんが、可読性を下げ、重要な警告（上記のHooks依存など）を埋もれさせています。特にテストファイルや移行途中のファイルに多く見られます。

### 4. E2E検証スクリプト
**ファイル**: `verification/verify_order_panel.py`
**評価**:
Playwrightを使用した検証スクリプトの導入は良い傾向です。ただし、現在は「画面遷移とスクリーンショット」のみで、具体的な値の検証（アサーション）が含まれていません。CI/CDでの信頼性を高めるために、`expect(page.locator(...)).to_contain_text(...)` 等による検証を追加すべきです。

---

## ✅ 以前の指摘事項の確認状況

- **バックテストドメインの重複**: 以前のレポートにあった `app/domains/backtest` の重複ファイルは、現在のコードベースでは確認されませんでした（解消済みと推測されます）。
- **バックエンド構造**: `backend/src` は機能ごとにモジュール化されており (`market_correlation`, `supply_demand` 等)、Pythonの標準的な構成に従っており良好です。

---

## 📋 推奨アクションプラン

1.  **[緊急]** `useOrderEntry.ts` の依存配列バグを修正する。
2.  **[整理]** `journalStore` の統合方針を決定し、重複を解消する。
3.  **[品質]** 自動修正 (`eslint --fix`) を適用し、単純な警告を一掃する。
