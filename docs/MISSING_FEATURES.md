# 株取引で勝てるアプリにするために不足している機能

**作成日**: 2026-01-30
**バージョン**: 1.0.0
**ステータス**: アクティブ

---

## 📊 現状評価

| カテゴリ | スコア | 優先度 |
|----------|--------|--------|
| アーキテクチャ | 7/10 | - |
| コード品質 | 6/10 | P1 |
| 戦略品質 | 4/10 | **P0** |
| リスク管理 | 3/10 | **P0** |
| UI/UX | 7/10 | P2 |
| テストカバレッジ | 4/10 | P2 |

**総合評価**: 5.4/10

---

## 🔴 致命的に足りないもの（P0）

### 1. リスクリワード比率の悪さ

**現状**:
- 買いポジション: 損切り3% / 利確5% = **1:1.67** ❌
- 売りポジション: 損切り5% / 利確3% = **0.6:1** 🔴 **致命的**

**問題**:
- 売りポジションは勝ち続けてもマイナスになる構造
- 理想的なリスクリワードは**最低1:2以上**が必要

**必要な修正**:
```typescript
// constants.ts の修正
BULL_TAKE_PROFIT: 0.06,   // 6% 利確
BULL_STOP_LOSS: 0.03,    // 3% 損切り → 1:2
BEAR_TAKE_PROFIT: 0.06,   // 6% 利確
BEAR_STOP_LOSS: 0.03,    // 3% 損切り → 1:2
```

**完了基準**: 全ポジションでリスクリワード1:2以上

---

### 2. 市場状況別戦略の不在

**現状**:
- RSI + SMAのみで判断
- トレンド考慮なし

**問題**:
- 上昇トレンドで売りシグナル発生 → 負け続ける
- 下降トレンドで買いシグナル発生 → 負け続ける

**必要な実装**:
```typescript
// トレンド判断ロジック
determineMarketCondition(data: OHLCV[]): 'TREND_UP' | 'TREND_DOWN' | 'RANGE' {
  // SMA200でトレンド判断
  // 上昇: Price > SMA50 > SMA200
  // 下降: Price < SMA50 < SMA200
  // レンジ: それ以外
}

// 市場状況別シグナル生成
switch (marketCondition) {
  case 'TREND_UP':
    // 上昇トレンドでは買いシグナルのみ
    if (rsi < 40 && price > sma) return 'BUY';
    return 'HOLD'; // 売り見送り
  case 'TREND_DOWN':
    // 下降トレンドでは売りシグナルのみ
    if (rsi > 60 && price < sma) return 'SELL';
    return 'HOLD'; // 買い見送り
  case 'RANGE':
    // レンジ相場では両方向OK
    if (rsi < 30) return 'BUY';
    if (rsi > 70) return 'SELL';
}
```

**完了基準**: 市場状況別勝率が上昇トレンド60%以上

---

### 3. バックテスト結果の不明確

**現状**:
- 過去の勝率不明
- 市場別成績不明
- 高コンフィデンスシグナルのみの成績不明

**問題**:
- 戦略が本当に勝てるか検証できていない
- 期待値計算が不可能

**必要な表示**:
```
🎯 過去5年バックテスト結果
┌─────────────────┬──────────┬──────────┐
│ 項目          │ 現在値  │ 目標値  │
├─────────────────┼──────────┼──────────┤
│ 全期間勝率     │ 不明     │ 55%+    │
│ 高コンフィデンス │ 不明     │ 70%+    │
│ リスクリワード  │ 0.6-1.67│ 1:2+    │
│ 最大ドローダウン │ 不明     │ 20%以下  │
│ プロフィットF  │ 不明     │ 1.5+    │
└─────────────────┴──────────┴──────────┘

📊 市場状況別勝率
┌─────────────┬──────────┬──────────┬──────────┐
│ 市場状況   │ 取引数  │ 勝率    │ P&L      │
├─────────────┼──────────┼──────────┼──────────┤
│ 上昇トレンド │ ?       │ ?       │ ?       │
│ 下降トレンド │ ?       │ ?       │ ?       │
│ レンジ相場   │ ?       │ ?       │ ?       │
└─────────────┴──────────┴──────────┴──────────┘
```

**完了基準**: Workstationページにバックテスト結果パネル表示

---

### 4. ポジションサイジング機能の不在

**現状**:
- 固定数量（100株）でトレード
- 銘柄価格・損切り幅に応じたリスク管理不可

**問題**:
- 高値銘柄（例: 10,000円）では1トレード1,000,000円リスク
- 低位銘柄（例: 100円）では1トレード10,000円リスク
- 統一されたリスク管理が不可能

**必要な実装**:
```typescript
// PositionSizingService.ts
class PositionSizingService {
  private readonly RISK_PER_TRADE = 0.015; // 1.5%
  private readonly MAX_POSITION_SIZE = 0.25; // 最大25%

  calculatePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLoss: number,
    existingPositions: Position[]
  ): number {
    // 基本ポジションサイズ
    const riskAmount = accountBalance * this.RISK_PER_TRADE;
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const basicSize = Math.floor(riskAmount / priceRisk);

    // 既存ポジションを考慮
    const totalExposure = existingPositions.reduce((sum, pos) =>
      sum + (pos.currentPrice * pos.quantity), 0);
    const availableExposure = (accountBalance * this.MAX_POSITION_SIZE) - totalExposure;
    const maxAllowedSize = Math.floor(availableExposure / entryPrice);

    return Math.max(100, Math.min(basicSize, maxAllowedSize));
  }
}
```

**完了基準**: 1トレードのリスクが資産の1.5%に制限される

---

## 🟡 重要な不足機能（P1）

### 5. 連敗時の保護ルール

**問題**:
- 連敗でも無制限にトレード
- 心理的バイアスで大きな損失のリスク

**必要な実装**:
```typescript
calculateConsecutiveLossLimit(journal: JournalEntry[]): number {
  let consecutiveLosses = 0;
  for (let i = journal.length - 1; i >= 0; i--) {
    if ((journal[i].profit || 0) < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  // 連敗に応じてリスクを段階的に減少
  if (consecutiveLosses >= 5) return 0.005; // 0.5% - 取引停止検討
  if (consecutiveLosses >= 3) return 0.010; // 1.0%
  return 0.015; // 1.5% - 通常
}
```

**完了基準**: 3連敗でリスク半減、5連敗で警告表示

---

### 6. 高コンフィデンスシグナルのみの成績

**問題**:
- 80%以上のシグナルのみの勝率不明
- 高品質シグナルのみで取引すべきか不明

**必要な実装**:
```typescript
// AccuracyService.ts に追加
calculateHighConfidenceHitRate(
  symbol: string,
  data: OHLCV[],
  market: 'japan' | 'usa'
): number {
  // 80%以上のコンフィデンスシグナルのみで勝率計算
  // 目標: 70%以上
}
```

**完了基準**: 80%以上シグナルの勝率が70%以上

---

### 7. リアルタイムパフォーマンス表示

**問題**:
- 現在の勝率、ドローダウンが見えない
- リアルタイムで戦略の効果が不明

**必要な実装**:
```typescript
// チャート上部にオーバーレイ表示
<PerformanceOverlay
  currentWinRate={currentMetrics.winRate}
  targetWinRate={55}
  riskRewardRatio={currentMetrics.avgProfit / Math.abs(currentMetrics.avgLoss)}
  targetRiskReward={2.0}
  maxDrawdown={currentMetrics.maxDrawdown}
/>
```

**完了基準**: 常に現在のパフォーマンスが可視化されている

---

### 8. リスク警告システム

**問題**:
- 過大ポジション、低コンフィデンスでも警告なし
- リスクが高い状態に気づけない

**必要な実装**:
```typescript
// RiskWarningService.ts
checkRiskWarnings(
  journal: JournalEntry[],
  portfolio: Portfolio,
  signal: Signal
): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  // 連敗警告
  if (consecutiveLosses >= 3) {
    warnings.push({
      type: 'CONSECUTIVE_LOSSES',
      level: 'HIGH',
      message: `直近${consecutiveLosses}連敗中。取引を一時停止すべきか検討してください。`
    });
  }

  // 過大ポジション警告
  if (positionRisk > 0.3) {
    warnings.push({
      type: 'OVERSIZED_POSITION',
      level: 'MEDIUM',
      message: `現在のポジションリスク${(positionRisk*100).toFixed(1)}%は高すぎます。`
    });
  }

  // 低コンフィデンスシグナル警告
  if (signal.confidence < 55 && signal.type !== 'HOLD') {
    warnings.push({
      type: 'LOW_CONFIDENCE_SIGNAL',
      level: 'LOW',
      message: `シグナルコンフィデンス${signal.confidence}%は推奨値(55%)を下回ります。`
    });
  }

  return warnings;
}
```

**完了基準**: 高リスク状態で自動警告表示

---

## 🟢 改善すべき点（P2）

### 9. データ期間の短さ

**現状**: 1年（252日）
**必要**: 5年（1260日）以上

**理由**:
- 1年では季節性・サイクルを捉えきれない
- 5年以上で戦略の安定性を検証

---

### 10. バックテスト期間拡張

**現状**:
```typescript
// AccuracyService.ts
calculateRealTimeAccuracy() {
  if (data.length < 252) return null; // 1年
}
```

**修正**:
```typescript
calculateRealTimeAccuracy() {
  if (data.length < 1260) return null; // 5年
}
```

---

### 11. 市場別勝率分析

**必要な実装**:
```typescript
calculateMarketConditionBasedBacktest(): {
  trendUp: BacktestResult;
  trendDown: BacktestResult;
  range: BacktestResult;
}
```

**目標**:
- 上昇トレンド: 勝率60%以上
- 下降トレンド: 勝率50%以上
- レンジ相場: 勝率55%以上

---

### 12. プロフィットファクターの追跡

**定義**: 総利益 / 総損失

**目標**: 1.5以上

**表示**: リアルタイムで更新

---

## 🐛 技術的欠陥

### 13. ビルドエラー

**ファイル**: `app/components/OrderPanel.tsx:42`

**問題**:
```typescript
// エラー: avgPrice プロパティが存在しない
executeOrder({
  // ...
  avgPrice: price,  // ❌ 型エラー
  // ...
});
```

**修正**:
```typescript
executeOrder({
  // ...
  price: price,  // ✅ 正しいプロパティ名
  // ...
});
```

**影響**: デプロイ不可能

---

### 14. IndexedDB活用不足

**現状**: 過去データ保存のみ
**問題**: デルタ更新で効率化できていない

**改善**:
```typescript
// デルタ更新実装
async updateWithDelta(symbol: string, newData: OHLCV[]): Promise<void> {
  const existing = await this.getData(symbol);
  const existingDates = new Set(existing.map(d => d.date));

  // 新しい日付のみ追加
  const deltaData = newData.filter(d => !existingDates.has(d.date));

  if (deltaData.length > 0) {
    await this.mergeAndSave(symbol, deltaData);
  }
}
```

---

## 📋 不足機能の影響度

| 機能 | 欠如時の影響 | 優先度 | 工数 |
|------|-------------|--------|------|
| リスクリワード修正 | 長期的に必ず負ける | 🔴 P0 | 1日 |
| 市場状況別戦略 | トレンド相場で負け続ける | 🔴 P0 | 2日 |
| バックテスト可視化 | 戦略の信頼性不明 | 🔴 P0 | 2日 |
| ポジションサイジング | リスク管理不可能 | 🟡 P1 | 2日 |
| 連敗保護ルール | 大きな損失のリスク | 🟡 P1 | 1日 |
| 高コンフィデンス成績 | 戦略最適化不可 | 🟡 P1 | 1日 |
| リアルタイム表示 | パフォーマンス見えず | 🟡 P1 | 1日 |
| リスク警告システム | 高リスク気づけず | 🟡 P1 | 1日 |
| 5年データ | 過去の精度不明 | 🟡 P1 | 2日 |
| 市場別勝率分析 | 戦略改善不可 | 🟢 P2 | 1日 |
| ビルドエラー修正 | デプロイ不可能 | 🔴 P0 | 0.5日 |

---

## ✅ 実装すべき機能の優先順位

### フェーズ1（即時実行 - 合計2.5日）

1. **ビルドエラー修正** (0.5日)
   - `OrderPanel.tsx`の型エラー修正

2. **リスクリワード修正** (1日)
   - `constants.ts`のパラメータ修正
   - 全テストの再実行

3. **バックテスト表示UI** (1日)
   - Workstationページにバックテスト結果パネル追加
   - 基本メトリクス表示

### フェーズ2（次週 - 合計4日）

4. **市場状況別戦略** (2日)
   - トレンド判断ロジック実装
   - 市場状況別シグナル生成

5. **5年データ収集** (2日)
   - データ取得期間拡張
   - IndexedDBへの保存

### フェーズ3（2週目 - 合計6日）

6. **ポジションサイジング** (2日)
   - `PositionSizingService`実装
   - UI連携

7. **連敗保護ルール** (1日)
   - 連敗検出ロジック
   - リスク調整

8. **リスク警告システム** (2日)
   - `RiskWarningService`実装
   - 警告UI

9. **高コンフィデンス成績** (1日)
   - 高品質シグナルのみのバックテスト

### フェーズ4（3週目 - 合計3日）

10. **市場別勝率分析** (2日)
    - 状況別バックテスト実装
    - 結果表示

11. **リアルタイム表示** (1日)
    - パフォーマンスオーバーレイ
    - リアルタイム更新

---

## 🎯 成功指標（KPI）

| 指標 | 現在 | 目標 | 達成基準 |
|------|------|------|----------|
| **リスクリワード** | 0.6-1.67 | **1:2+** | 🔴 全ポジション |
| **全期間勝率** | 不明 | **55%+** | 🟡 5年データ |
| **高コンフィデンス勝率** | 不明 | **70%+** | 🟡 80%以上シグナル |
| **上昇トレンド勝率** | 不明 | **60%+** | 🟡 市場状況別 |
| **下降トレンド勝率** | 不明 | **50%+** | 🟡 市場状況別 |
| **レンジ相場勝率** | 不明 | **55%+** | 🟡 市場状況別 |
| **最大ドローダウン** | 不明 | **20%以下** | 🟡 ポートフォリオ全体 |
| **プロフィットファクター** | 不明 | **1.5+** | 🟡 総利益/総損失 |
| **1トレードリスク** | 不明 | **1.5%** | 🟡 資産の1.5%に制限 |

---

## 📅 タイムラインまとめ

| 週 | フェーズ | 主な作業 | 目標 |
|----|----------|----------|------|
| 1週目 | フェーズ1 | 基盤修正 | ビルド成功、リスクリワード1:2 |
| 2週目 | フェーズ2 | 戦略強化 | 市場状況別戦略実装 |
| 3週目 | フェーズ3 | リスク管理 | ポジションサイジング、警告システム |
| 4週目 | フェーズ4 | 検証と改善 | 全KPI達成 |

**総工数**: 15.5日（約3週間）

---

## 🔄 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2026-01-30 | 1.0.0 | 初版作成 |

---

## 📝 次のステップ

1. フェーズ1の実行開始
2. ビルドエラー修正
3. リスクリワード修正
4. バックテスト表示UI実装
