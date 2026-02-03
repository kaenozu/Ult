---
title: バックテストのエグジット取引でポジション参照エラー
title_en: Backtest Exit Trade Position Reference Error
labels: bug, backtest, critical, trading-engine
severity: Critical
priority: P0
---

## 説明 (Description)

バックテストサービス ([`backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:309-320)) において、エグジット取引（ポジション解消）の処理で致命的なバグが存在します。`executeTrade` メソッド内で、エグジット取引を判定する際に `newPosition` ではなく `currentPosition` を参照すべき箇所で誤った変数を使用しています。

### 問題のあるコード (Lines 309-320)

```typescript
} else {
  // エグジット取引
  if (!newPosition) {  // ❌ BUG: newPosition は常に null
    // エグジットするポジションがない場合は何もしない
    return {
      success: false,
      newCapital: currentCapital,
      newEquity: currentCapital,
      trade: {} as BacktestTrade,
      newPosition: null
    };
  }
  // ... エグジット処理（到達不可能）
}
```

### 根本原因

- エグジット取引の分岐に入る時点で、`newPosition` は `executeTrade` メソッドのローカル変数として `null` で初期化されています
- 実際に存在すべきポジションは `currentPosition` パラメータに格納されています
- そのため、エグジット条件 `if (!newPosition)` は常に真となり、エグジット処理が実行されません

## 影響 (Impact)

- **重大度: Critical**
- エグジット取引が**一切実行されない**
- ポジションが**永久に保有状態**となり、クローズされない
- バックテスト結果が完全に無効化される
- 勝率、リターン、ドローダウンなどすべてのメトリクスが誤った値を示す
- ユーザーが誤った戦略判断を下すリスク

## 推奨される解決策 (Recommended Solution)

### 即時修正 (Hotfix)

```typescript
} else {
  // エグジット取引
  if (!currentPosition) {  // ✅ FIX: currentPosition を参照
    // エグジットするポジションがない場合は何もしない
    return {
      success: false,
      newCapital: currentCapital,
      newEquity: currentCapital,
      trade: {} as BacktestTrade,
      newPosition: null
    };
  }
  
  // 以下、currentPosition を使用したエグジット処理
  const direction = trade.type === 'EXIT_LONG' ? 'SELL' : 'BUY';
  const price = this.applySlippage(currentCandle.close, direction, config.slippage);
  
  // 利益計算
  let profitPercent: number;
  if (currentPosition.type === 'LONG') {
    profitPercent = ((price - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;
  } else {
    profitPercent = ((currentPosition.entryPrice - price) / currentPosition.entryPrice) * 100;
  }
  
  // 手数料を考慮
  const proceeds = currentPosition.quantity * price - config.commission;
  newCapital = currentCapital + proceeds;
  
  // 取引を記録
  tradeRecord = {
    symbol: currentPosition.symbol,
    type: direction,
    entryPrice: currentPosition.entryPrice,
    exitPrice: price,
    entryDate: currentPosition.entryDate,
    exitDate: currentCandle.date,
    profitPercent,
    reason: 'Position exited based on signal'
  };
  
  newPosition = null;
}
```

### テスト要件

1. **単体テスト**: エグジット取引が正しく実行されることを検証
2. **統合テスト**: エントリー→エグジットの一連の流れを検証
3. **回帰テスト**: 既存のバックテスト結果との整合性確認

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:309-320) - メインのバグ箇所
- [`trading-platform/app/lib/backtest/__tests__/*.test.ts`](trading-platform/app/lib/backtest/__tests__) - テストファイル

## 受け入れ基準 (Acceptance Criteria)

- [ ] エグジット取引がシグナルに応じて正しく実行される
- [ ] ポジションがクローズされ、資本が更新される
- [ ] すべてのバックテストメトリクスが正しく計算される
- [ ] 既存のテストがすべてパスする
- [ ] 新規テストケースが追加され、エグジットシナリオをカバーする

## タイムライン

- **即時対応**: 本日以内に Hotfix ブランチを作成
- **レビュー**: 24時間以内にコードレビュー完了
- **リリース**: レビュー完了後即座に本番適用

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Backend Trading Team
