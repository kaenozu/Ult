---
title: 損益計算における二重計上の問題
title_en: Profit/Loss Double Counting in Equity Calculation
labels: bug, pnl-calculation, high-priority, equity-curve
severity: High
priority: P1
---

## 説明 (Description)

バックテストサービス ([`backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:129-143)) において、ポジションの評価損益（Unrealized PnL）と確定損益（Realized PnL）の両方が資産（Equity）に加算されており、二重計上の問題が発生しています。

### 問題のあるコード (Lines 129-143)

```typescript
// ポジションの評価損益を更新
if (currentPosition) {
  const currentValue = currentPosition.quantity * currentCandle.close;
  const pnl = currentPosition.type === 'LONG' 
    ? currentValue - currentPosition.value
    : currentPosition.value - currentValue;
    
  equity = config.initialCapital + trades.reduce((sum, trade) => {
    // Check if trade is effectively closed (has exit price)
    if (trade.exitPrice !== undefined) {
      return sum + (trade.profitPercent! / 100 * config.initialCapital);
    }
    return sum;
  }, 0) + (currentPosition.value !== currentValue ? pnl : 0);
}
```

### 問題の詳細

1. **確定損益の計上**: `trades.reduce(...)` でクローズ済みトレードの損益を集計
2. **評価損益の計上**: `pnl` として現在のポジションの未確定損益を追加
3. **二重計上の発生**: トレードがクローズされた時点で、既に `trades` に含まれる損益と、`currentPosition` の評価損益が重複して計上される可能性がある

### 具体的なシナリオ

```
1. エントリー: 100株 @ 100円 (合計10,000円)
2. 価格上昇: 現在価格 110円
3. 評価損益: +1,000円 (未確定)
   → Equity に +1,000円 加算
   
4. エグジット: 100株 @ 110円
5. 確定損益: +1,000円
   → Trades に +1,000円 記録
   
6. 次のイテレーションで:
   - Trades から +1,000円 (確定損益)
   - 評価損益は 0 だが、計算ロジックによって重複の可能性
```

## 影響 (Impact)

- **重大度: High**
- **Equity Curve の歪み**: 実際より高い（または低い）資産曲線が表示される
- **パフォーマンスメトリクスの誤り**: シャープレシオ、ソルティノレシオなどが不正確
- **ドローダウンの誤評価**: 実際のリスクを過小評価する可能性
- **戦略評価の信頼性低下**: 誤ったパフォーマンスに基づく戦略選択

## 推奨される解決策 (Recommended Solution)

### 修正アプローチ

```typescript
// 修正版: 明確な区分けと一貫した計算
private calculateEquity(
  initialCapital: number,
  closedTrades: BacktestTrade[],
  currentPosition: BacktestPosition | null,
  currentPrice: number
): number {
  // 1. 確定損益の計算（クローズ済みトレードのみ）
  const realizedPnL = closedTrades.reduce((sum, trade) => {
    // profitPercent はエントリー価格ベースなので、実際の金額に変換
    const tradeValue = trade.entryPrice * trade.quantity;
    return sum + (tradeValue * (trade.profitPercent || 0) / 100);
  }, 0);

  // 2. 未確定損益の計算（オープンポジションのみ）
  const unrealizedPnL = currentPosition 
    ? this.calculateUnrealizedPnL(currentPosition, currentPrice)
    : 0;

  // 3. 総資産 = 初期資本 + 確定損益 + 未確定損益
  return initialCapital + realizedPnL + unrealizedPnL;
}

private calculateUnrealizedPnL(
  position: BacktestPosition,
  currentPrice: number
): number {
  const currentValue = position.quantity * currentPrice;
  const entryValue = position.quantity * position.entryPrice;
  
  if (position.type === 'LONG') {
    return currentValue - entryValue;
  } else {
    return entryValue - currentValue;
  }
}

// 使用例
const closedTrades = trades.filter(t => t.exitPrice !== undefined && t.exitPrice !== 0);
equity = this.calculateEquity(
  config.initialCapital,
  closedTrades,
  currentPosition,
  currentCandle.close
);
```

### 包括的な修正

```typescript
interface EquityState {
  initialCapital: number;
  cash: number;              // 現金残高
  realizedPnL: number;       // 確定損益累計
  unrealizedPnL: number;     // 未確定損益（現在のポジション）
  totalEquity: number;       // 総資産
  positions: Map<string, Position>; // 現在のポジション
}

class EquityTracker {
  private state: EquityState;

  constructor(initialCapital: number) {
    this.state = {
      initialCapital,
      cash: initialCapital,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalEquity: initialCapital,
      positions: new Map()
    };
  }

  onEntry(trade: BacktestTrade): void {
    const cost = trade.entryPrice * trade.quantity;
    this.state.cash -= cost;
    this.state.positions.set(trade.symbol, {
      symbol: trade.symbol,
      quantity: trade.quantity,
      entryPrice: trade.entryPrice,
      entryDate: trade.entryDate,
      type: trade.type === 'BUY' ? 'LONG' : 'SHORT'
    });
    this.updateUnrealizedPnL();
  }

  onExit(trade: BacktestTrade): void {
    const position = this.state.positions.get(trade.symbol);
    if (!position) return;

    const proceeds = trade.exitPrice! * trade.quantity;
    const cost = position.entryPrice * trade.quantity;
    const pnl = trade.type === 'BUY' 
      ? cost - proceeds  // SHORT cover
      : proceeds - cost; // LONG sell

    this.state.cash += proceeds;
    this.state.realizedPnL += pnl;
    this.state.positions.delete(trade.symbol);
    this.updateUnrealizedPnL();
  }

  updatePrices(currentPrices: Map<string, number>): void {
    this.state.unrealizedPnL = 0;
    
    for (const [symbol, position] of this.state.positions) {
      const currentPrice = currentPrices.get(symbol);
      if (!currentPrice) continue;

      const currentValue = position.quantity * currentPrice;
      const entryValue = position.quantity * position.entryPrice;
      
      const pnl = position.type === 'LONG'
        ? currentValue - entryValue
        : entryValue - currentValue;
      
      this.state.unrealizedPnL += pnl;
    }

    this.recalculateTotal();
  }

  private recalculateTotal(): void {
    const positionValue = Array.from(this.state.positions.values())
      .reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
    
    this.state.totalEquity = this.state.cash + positionValue + this.state.unrealizedPnL;
  }

  getState(): EquityState {
    return { ...this.state };
  }
}
```

## テスト要件

```typescript
describe('Equity Calculation', () => {
  it('should not double count PnL', () => {
    const tracker = new EquityTracker(100000);
    
    // Entry
    tracker.onEntry({ symbol: 'AAPL', type: 'BUY', quantity: 100, entryPrice: 100, exitPrice: 0 });
    expect(tracker.getState().totalEquity).toBe(100000); // No change on entry
    
    // Price update
    tracker.updatePrices(new Map([['AAPL', 110]]));
    expect(tracker.getState().unrealizedPnL).toBe(1000);
    expect(tracker.getState().totalEquity).toBe(101000);
    
    // Exit
    tracker.onExit({ symbol: 'AAPL', type: 'SELL', quantity: 100, entryPrice: 100, exitPrice: 110 });
    expect(tracker.getState().realizedPnL).toBe(1000);
    expect(tracker.getState().unrealizedPnL).toBe(0);
    expect(tracker.getState().totalEquity).toBe(101000); // Should be same as before exit
  });

  it('should handle multiple positions correctly', () => {
    const tracker = new EquityTracker(100000);
    
    tracker.onEntry({ symbol: 'AAPL', type: 'BUY', quantity: 50, entryPrice: 100 });
    tracker.onEntry({ symbol: 'GOOGL', type: 'BUY', quantity: 50, entryPrice: 200 });
    
    tracker.updatePrices(new Map([['AAPL', 110], ['GOOGL', 190]]));
    
    expect(tracker.getState().unrealizedPnL).toBe(500 - 500); // AAPL +500, GOOGL -500
    expect(tracker.getState().totalEquity).toBe(100000);
  });
});
```

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:129-143)
- [`trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts`](trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts)
- [`trading-platform/app/lib/paperTrading/PaperTradingEnvironment.ts`](trading-platform/app/lib/paperTrading/PaperTradingEnvironment.ts)

## 受け入れ基準 (Acceptance Criteria)

- [ ] 確定損益と未確定損益が明確に区分けされる
- [ ] 同一の損益が複数回計上されない
- [ ] Equity Curve が正確に計算される
- [ ] パフォーマンスメトリクス（シャープレシオ、ドローダウンなど）が正確
- [ ] マルチポジションシナリオで正しく動作する
- [ ] 包括的な単体テストが追加される

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Trading Engine Team