# GitHub Issues 作成推奨リスト

**作成日**: 2026-02-01  
**目的**: コードレビューとロードマップから特定された、GitHub Issueとして追跡すべき項目のリスト

---

## 📋 概要

このドキュメントは、以下のソースから特定された追跡すべき課題をまとめたものです:
- `ROADMAP.md` - プロジェクトロードマップ
- `REMAINING_TECH_DEBT_ROADMAP.md` - 技術的負債
- `COMPREHENSIVE_CODE_REVIEW_REPORT.md` - 包括的コードレビュー
- `trading-platform/CODE_REVIEW_20260201.md` - 最新コードレビュー

---

## 🔥 P0 - Critical (即座対応必須)

### Issue 1: バックテスト計算の計算量爆発問題

**タイトル**: バックテスト計算がブラウザをフリーズさせる（計算量O(Days × Params × History)）

**ラベル**: `bug`, `performance`, `critical`, `P0`

**説明**:
```
## 問題
`AccuracyService.ts`と`AnalysisService.ts`のバックテスト処理で、ループ内でパラメータ最適化を繰り返し実行しており、計算量がO(Days × Params × History)となっている。

## 影響
- ブラウザのフリーズ
- アプリケーションのクラッシュ
- ユーザー体験の著しい低下

## 該当箇所
- `trading-platform/app/lib/AccuracyService.ts`
- `trading-platform/app/lib/AnalysisService.ts`

## 提案する修正
1. メモ化パターンの導入
2. バックテスト前に一度だけパラメータ最適化を実行
3. Web Workerへの移行（メインスレッドブロック防止）

## 参考
- COMPREHENSIVE_CODE_REVIEW_REPORT.md (Issue #1)
```

---

### Issue 2: 注文処理における競合状態（Race Condition）

**タイトル**: 注文処理で資金二重減算の可能性（非アトミックな状態更新）

**ラベル**: `bug`, `critical`, `data-integrity`, `P0`

**説明**:
```
## 問題
`OrderPanel.tsx`と`tradingStore.ts`の注文処理において、非アトミックな状態更新により資金の二重減算が発生する可能性がある。

## 影響
- 資金の二重減算
- 取引整合性エラー
- ポートフォリオの不正確な状態
- 実際の取引損失につながる可能性

## 該当箇所
- `trading-platform/app/components/OrderPanel.tsx` (line 31)
- `trading-platform/app/store/tradingStore.ts`

## 現在の問題コード
```typescript
const handleOrder = () => {
  setCash(portfolio.cash - totalCost);  // 読み取り→更新の間に状態が変化する可能性
  addPosition(...);  // 別の独立した更新
};
```

## 提案する修正
アトミックな注文実行関数を実装し、トランザクション的な状態更新を保証する。

## 参考
- COMPREHENSIVE_CODE_REVIEW_REPORT.md (Issue #2)
```

---

## 🟡 P1 - High Priority (短期対応推奨)

### Issue 3: WebSocket接続の修復と安定化

**タイトル**: WebSocket接続が不安定（リトライロジックとフォールバック処理の改善）

**ラベル**: `enhancement`, `websocket`, `P1`, `reliability`

**説明**:
```
## 問題
WebSocket接続が不安定で、接続失敗時の適切なフォールバック処理が不足している。

## 影響
- リアルタイム機能が利用できない
- ユーザー体験の低下
- データ更新の遅延

## 該当箇所
- `trading-platform/app/lib/websocket.ts`
- `trading-platform/app/hooks/useWebSocket.ts`

## 必要な対応
1. バックエンドサーバー起動スクリプトの作成
2. WebSocket接続のリトライロジック実装
3. 接続失敗時のフォールバック処理
4. 接続状態の適切な表示

## 完了基準
WebSocket接続が安定して確立される（成功率99%+）

## 工数見積
約1日

## 参考
- ROADMAP.md (Phase 1.2)
```

---

### Issue 4: エラーハンドリングの統一

**タイトル**: エラーハンドリングとメッセージ処理の統一

**ラベル**: `refactoring`, `code-quality`, `P1`, `DRY`

**説明**:
```
## 問題
エラーハンドリングのパターンが統一されておらず、コードが重複している:
- `app/lib/errors.ts` - `getUserErrorMessage`を定義
- `app/lib/errorHandler.ts` - `getUserFriendlyMessage`を定義

## 影響
- コードの重複
- 保守性の低下
- エラーメッセージの不一致の可能性

## 該当箇所
- `trading-platform/app/lib/errors.ts`
- `trading-platform/app/lib/error-handler.ts`
- 全体のエラーハンドリング

## 提案する修正
1. 統一エラークラス（`AppError`）の作成
2. 共通エラーハンドラーの実装
3. ユーザー向けエラーメッセージの標準化
4. エラー監視（Sentry等）の導入検討

## 完了基準
全API呼び出しが統一されたエラーハンドリングを使用

## 工数見積
約1日

## 参考
- ROADMAP.md (Phase 1.6)
- CODE_REVIEW_20260201.md (Section 2.3)
```

---

### Issue 5: 型定義の改善（any型撲滅）

**タイトル**: TypeScript型安全性の向上（any/unknown型の削除）

**ラベル**: `refactoring`, `typescript`, `P1`, `type-safety`

**説明**:
```
## 問題
コードベースに`any`型や不適切な`unknown`型の使用が残っており、型安全性が損なわれている。

## 影響
- コンパイル時のエラー検出不足
- リファクタリング時のリスク増加
- IDEサポートの低下

## 該当箇所
- `trading-platform/app/lib/api/*.ts`
- `trading-platform/app/types/index.ts`
- その他、`any`型を使用している箇所

## 提案する修正
1. `any`型の使用箇所を検索・特定
2. 重要な箇所から順に厳格な型定義を追加
3. 型ガード関数の作成
4. `ApiResponse<T>`などのジェネリック型の活用

## 完了基準
- `any`/不適切な`unknown`型が0になる
- ESLintの`no-explicit-any`ルールが通過

## 工数見積
2-3時間

## 参考
- ROADMAP.md (Phase 1.5)
- REMAINING_TECH_DEBT_ROADMAP.md (Section 2)
```

---

## 🟢 P2 - Medium Priority (中期対応望ましい)

### Issue 6: WebSocketクライアントの統合

**タイトル**: 重複するWebSocketクライアントの統合（websocket.tsとwebsocket-resilient.ts）

**ラベル**: `refactoring`, `websocket`, `P2`, `cleanup`

**説明**:
```
## 問題
2つのWebSocketクライアント実装が存在し、混乱の原因となっている:
- `app/lib/websocket.ts`
- `app/lib/websocket-resilient.ts`

## 影響
- コードの重複
- 保守性の低下
- どちらを使用すべきか不明確

## 提案する修正
1. `websocket-resilient.ts`を単一の情報源とする
2. `websocket.ts`を非推奨化
3. 既存の使用箇所を`websocket-resilient.ts`に移行
4. 旧ファイルを削除

## 完了基準
WebSocketクライアントが1つに統一される

## 工数見積
2-3時間

## 参考
- CODE_REVIEW_20260201.md (Section 3, Long-term Improvements)
```

---

### Issue 7: StockChartの未使用ロジック削除

**タイトル**: StockChart.tsxの未使用ロジックの削除または完全実装

**ラベル**: `cleanup`, `P2`, `code-quality`

**説明**:
```
## 問題
`StockChart.tsx`の`calculateOptimalHeight`関数が入力を無視してハードコード値を返している。

## 影響
- コードの混乱
- 保守性の低下
- デッドコードの存在

## 該当箇所
- `trading-platform/app/components/StockChart.tsx`

## 提案する修正
以下のいずれか:
1. 未使用ロジックの削除
2. 動的な高さ計算の完全実装

## 完了基準
`calculateOptimalHeight`が適切に実装されるか削除される

## 工数見積
1時間

## 参考
- CODE_REVIEW_20260201.md (Section 2.3)
```

---

### Issue 8: フォーム要素のアクセシビリティ改善

**タイトル**: フォーム要素へのid/name属性追加とaria-label導入

**ラベル**: `a11y`, `enhancement`, `P2`, `accessibility`

**説明**:
```
## 問題
フォーム要素に適切なid/name属性が不足しており、アクセシビリティ警告が発生している。

## 影響
- アクセシビリティの低下
- スクリーンリーダー対応不足
- ユーザビリティの問題

## 該当箇所
全フォームコンポーネント

## 必要な対応
1. 全フォーム要素にidまたはname属性を追加
2. aria-labelの導入検討
3. フォームバリデーションメッセージの改善

## 完了基準
アクセシビリティ警告が0になる

## 工数見積
約0.5日

## 参考
- ROADMAP.md (Phase 1.4)
```

---

### Issue 9: パフォーマンス計測機能の導入

**タイトル**: パフォーマンス計測ユーティリティの実装

**ラベル**: `enhancement`, `performance`, `P2`, `monitoring`

**説明**:
```
## 問題
パフォーマンスのボトルネックを特定する仕組みがない。

## 目的
- ボトルネック可視化
- パフォーマンス回帰防止
- 最適化優先順位の判断

## 提案する実装
1. `lib/performance.ts` - 計測ユーティリティ作成
2. `usePerformanceMonitor` - React Component用フック
3. 主要コンポーネントへの適用
4. バックテスト計測の強化

## 完了基準
主要な処理のパフォーマンスが計測可能になる

## 工数見積
約2時間

## 参考
- REMAINING_TECH_DEBT_ROADMAP.md (Section 3)
```

---

### Issue 10: ドキュメント整備

**タイトル**: README.md改善と開発ドキュメントの整備

**ラベル**: `documentation`, `P2`, `good-first-issue`

**説明**:
```
## 問題
プロジェクトのドキュメントが不十分で、新規開発者のオンボーディングが困難。

## 必要な対応
1. README.mdの改善
   - クイックスタートガイド
   - 主要機能の説明
   - アーキテクチャ概要
2. 環境変数テンプレート（.env.example）の作成
3. 主要コンポーネントのJSDoc追加

## 期待効果
- 開発効率向上
- 障害対応時間短縮
- 将来的な拡張容易性

## 完了基準
新規開発者がドキュメントだけで開発環境を構築できる

## 工数見積
2-3時間

## 参考
- REMAINING_TECH_DEBT_ROADMAP.md (Section 4)
```

---

### Issue 11: 魔法の数値の定数化

**タイトル**: ハードコード値の定数化（Magic Numbers撲滅）

**ラベル**: `refactoring`, `code-quality`, `P2`, `maintainability`

**説明**:
```
## 問題
コード内にハードコード値が散在しており、意味が不明確で変更が困難:
- `confidence >= 80` - 80は何？
- `data.length < 60` - 60は何？
- `const step = 3` - 3は何？

## 影響
- 可読性の低下
- 変更困難性
- バグのリスク

## 提案する修正
1. `constants.ts`ファイルを作成
2. 意味のある定数名で定義
3. 既存コードを置き換え

```typescript
// constants.ts
export const SIGNAL_THRESHOLDS = {
  HIGH_CONFIDENCE: 80,
  MEDIUM_CONFIDENCE: 60,
  MIN_DATA_POINTS: 60,
} as const;

export const BACKTEST_CONFIG = {
  WARMUP_PERIOD: 100,
  STEP_SIZE: 3,
} as const;
```

## 完了基準
主要なハードコード値が定数化される

## 工数見積
2-3時間

## 参考
- REMAINING_TECH_DEBT_ROADMAP.md (Section 5)
```

---

## 📝 既存Issue（追跡中）

### Issue #205: スクリーナーでAI分析が長い
- **ステータス**: Open
- **関連**: 上記Issue 1（バックテスト計算）と同根の可能性
- **優先度**: P1

---

## 🎯 実装優先順位まとめ

### 即座対応 (P0)
1. Issue 1: バックテスト計算の計算量爆発問題
2. Issue 2: 注文処理における競合状態

### 短期対応 (P1) - Week 1-2
3. Issue 3: WebSocket接続の修復と安定化
4. Issue 4: エラーハンドリングの統一
5. Issue 5: 型定義の改善

### 中期対応 (P2) - Week 3-4
6. Issue 6: WebSocketクライアントの統合
7. Issue 7: StockChartの未使用ロジック削除
8. Issue 8: フォーム要素のアクセシビリティ改善
9. Issue 9: パフォーマンス計測機能の導入
10. Issue 10: ドキュメント整備
11. Issue 11: 魔法の数値の定数化

---

## 📊 統計

- **合計**: 11個の新規Issue
- **P0 (Critical)**: 2個
- **P1 (High)**: 3個
- **P2 (Medium)**: 6個
- **推定総工数**: 約8-10日

---

## 📅 次のステップ

1. このドキュメントをレビュー
2. 優先度を確認・調整
3. GitHub Issuesとして作成
4. プロジェクトボードまたはマイルストーンに追加
5. 実装開始

---

**作成者**: GitHub Copilot  
**レビュー日**: 2026-02-01
