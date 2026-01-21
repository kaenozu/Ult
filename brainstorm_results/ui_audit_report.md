# UI/UX Deep Audit Report (2026-01-21)

徹底的な画面調査の結果、複数のクリティカルな問題が特定されました。

## 🚨 Critical Failures (即時修正が必要)

### 1. Market Analyst 死のループ (Backend 500)
- **症状**: `StockDetailPage` の "Market Analyst" 欄が永遠にスケルトン表示のまま。
- **原因**: `/api/v1/signals/{ticker}` が **Internal Server Error (500)** を返しています。
- **詳細**: `curl` テストで確認済み。単なるCORSエラーではなく、サーバー内部でクラッシュしています。
- **推定原因**: `ConsensusEngine` または `fetch_external_data` のインポート/実行エラー。

### 2. Dashboard 初期化不能 (WebSocket Error)
- **症状**: ダッシュボードが "Initializing Synapse..." で停止し、ウィジェットが表示されない。
- **原因**: `ws://localhost:8000/ws/synapse` への接続失敗。
- **詳細**: WebSocket接続が確立前に切断されています。

### 3. Missing Assets
- **症状**: 全ページの背景が少し寂しい。コンソールに404エラー。
- **原因**: `grid-pattern.svg` が `public/` フォルダに存在しません。

### 4. Broken Navigation
- **症状**: サイドバーの "AI Lab" をクリックすると 404 ページになる。
- **原因**: `src/app/ai-lab/page.tsx` が未実装。

---

## 📸 Visual Polish (改善の余地)

### 1. Portfolio Empty State
- **現状**: "Total Value ¥0" とだけ表示され、寂しい。
- **提案**: 「ポートフォリオを構築しましょう」というCTAボタンや、推奨銘柄へのリンクを表示すべき。

### 2. Market Page Freeze
- **現状**: "SYNCHRONIZING..." で止まっている。
- **提案**: バックエンド接続失敗時に「オフラインモード」または「再試行ボタン」を表示するフォールバックUIが必要。

---

## 🛠 Remediation Plan (修正計画)

1.  **Step 1 (Backend Rescue)**: `/signals` エンドポイントの500エラーをデバッグ・修正する。（最優先）
2.  **Step 2 (Visual Assets)**: `grid-pattern.svg` を作成・配置する。
3.  **Step 3 (Navigation)**: `/ai-lab` ページを実装するか、サイドバーから隠す。
4.  **Step 4 (Resilience)**: WebSocket接続失敗時の自動再接続またはポーリングへのフォールバックを実装する。
