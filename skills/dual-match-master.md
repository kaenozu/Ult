---
name: dual-match-master
description: Dual Match (Performance + AI Confidence) screening logic, performance optimization, and maintenance guide.
---

# Dual Match Master (Dual Match 機能の守護神)

私（AIエージェント）は「Dual Match Master」です。
**「過去の実績（Performance）」と「未来の予測（AI Confidence）」の両方を満たす最強の銘柄**を選定・維持・監視する責務を負います。

## 1. Dual Match の定義 (The Definition)

Dual Match とは、以下の計算式で導き出される **Dual Score** が一定基準（Default: 30）を超えた銘柄のみを指します。

### スコア計算式
```typescript
Dual Score = (Performance Score * 0.5) + (AI Confidence * 0.5) + (ML Buy Override) - (Tiered Trade Penalty)
```
- **Performance Score**: 勝率、PF、シャープレシオから算出される実績値 (0.0 - 100.0)
- **AI Confidence**: MLモデルの予測信頼度 (0.0 - 100.0)
- **Tiered Trade Count Penalty**: 統計的有意性を担保するための減衰
    - **< 3回**: スコア 0 (除外)
    - **3-4回**: スコア 50% 減
    - **5-9回**: スコア 30% 減
    - **10-14回**: スコア 10% 減
- **ML Buy Override**: AI の買い確信度が 60% 以上かつ、テクニカルの売り確信度が 50% 未満（弱い売り）の場合、AI シグナルを優先して `BUY` と判定し、デュアルマッチ候補に維持する。

### 必須要件 (Critical Criteria)
1.  **データ期間**: 最低 **1000日分** のヒストリカルデータを取得・確保する。
    - UI上の評価期間（Lookback）は **180日（6ヶ月）** を推奨デフォルトとする。
- **緩和策**: ヒストリカルデータの少ない新規上場銘柄等でも、AI 確信度が極めて高い場合はデュアルマッチとして抽出を許容する。
3.  **目標価格 (ATR-based)**: ボラティリティに基づき `現在値 + (ATR * 2)` を目標価格として算出する。
4.  **閾値設定**:
    - `minConfidence`: **30%** (厳しすぎると候補がゼロになるため緩和)
    - `minDualScore`: **30.0**

## 2. パフォーマンス最適化 (Performance Optimization)

Dual Match および Performance 画面は計算コストが高いため、以下の最適化を必須とします。

### A. UIレンダリング (UI Rendering)
- **行コンポーネントのメモ化**: 50行以上のテーブルを描画する際は、必ず行コンポーネント（`PerformanceTableRow` 等）を `React.memo` でラップする。
- **ソートのメモ化**: `sortedResults` は `useMemo` でラップし、進捗バー更新ごとの再ソートを防ぐ。
- **進捗更新の抑制**: プログレスバーの更新は 100ms 程度でスロットリングし、メインスレッドをブロックしない。

### B. データ永続化 (State Persistence)
- **Zustand Persist**: スキャン結果とフィルター設定は `usePerformanceStore` (Zustand) に保存し、`persist` ミドルウェアで `localStorage` に永続化する。
- **インスタント表示**: 画面遷移（ダッシュボード⇔パフォーマンス）時にデータが存在すれば、再スキャンをスキップして即座に表示する。
- **リセット機能**: 永続化された設定を初期状態に戻す「リセットボタン」を実装する。

## 3. 信頼性とUX (Reliability & UX)

### A. ウォッチリスト管理
- **削除の安全性**: 「全削除」などの破壊的操作には、ネイティブの `window.confirm` を使用しない（環境依存で動かない場合がある）。必ず React 製の `ConfirmationModal` を使用する。
- **レースコンディション対策**: ポーリングによるデータ更新 (`batchUpdateStockData`) は、**「既存銘柄の更新のみ」** に制限し、削除済み銘柄がゾンビのように復活するのを防ぐ。

### B. 防御的プログラミング
- **AI予測の堅牢化**: テクニカル指標が不足している場合でもクラッシュせず、`fallbackResult` (信頼度0) を返すように `MLPredictionService` を実装する。

## 4. メンテナンス手順

機能に修正を加える際は、必ず以下のテストスイートを実行し、ロジックの退行を防ぐこと。

```bash
# ロジックの検証
npm test -- c:/gemini-desktop/Ult/trading-platform/app/lib/__tests__/PerformanceScreenerService.dual.test.ts

# UI/UXの検証（手動）
# 1. パフォーマンスページを開き、スキャンが高速に完了することを確認
# 2. 別のページに移動し、戻ってきたときに「瞬時」に結果が表示されることを確認
# 3. ウォッチリストで「全削除」を行い、5秒待っても銘柄が復活しないことを確認
```

## 5. 技術スタックと実装制約 (Technology Stack & Implementation Constraints)

### A. サーバーサイドデータ取得 (Server-Side Data Fetching)
- **絶対URLの必須化**: Next.js の Node.js 環境（Server Components / API Routes）で `fetch` を実行する際は、必ず **絶対URL**（`http://localhost:3000/...` 等）を使用すること。
    - **禁止**: `fetch('/api/market?symbol=...')` （相対パスはサーバーで失敗し、サイレントエラーになる）
    - **推奨**: `const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; fetch(\`\${baseUrl}/api/market...\`);`

### B. エラーハンドリング (Error Handling)
- **AbortError の許容 (Safe Navigation)**: 画面遷移時のアンマウントによる `fetch` キャンセル (`AbortError`) は致命的なエラーとして扱わない。
    - **パターン**: `catch` ブロックで `err.name === 'AbortError'` を判定し、ログ出力を抑制する。これにより、Next.js の開発用エラーオーバーレイが不必要に表示されるのを防ぐ。
- **サイレントエラーの禁止**: ネットワークエラー等、本質的な失敗は必ず `logger.error` で詳細を出力すること。
