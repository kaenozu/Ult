---
title: デイリーマークトゥマーケット機能の未実装
title_en: Daily Mark-to-Market Not Implemented
labels: enhancement, risk-management, high-priority, accounting
severity: High
priority: P1
---

## 説明 (Description)

バックテストエンジンに、日次のマークトゥマーケット（時価評価）機能が実装されていません。現在の実装では、ポジションの評価損益はリアルタイムで更新されますが、日次の確定した評価値として記録されないため、日次のリターン計算やリスク分析が不正確になっています。

### 現在の実装の問題

```typescript
// backtest-service.ts:129-143
// ポジションの評価損益を更新
if (currentPosition) {
  const currentValue = currentPosition.quantity * currentCandle.close;
  const pnl = currentPosition.type === 'LONG' 
    ? currentValue - currentPosition.value
    : currentPosition.value - currentValue;
    
  equity = config.initialCapital + ... + (currentPosition.value !== currentValue ? pnl : 0);
}
```

**問題点**:
- 毎ローソク足ごとに評価損益が変動する
- 日次の確定した資産価値が記録されない
- 日次リターンの計算が不正確
- デイリードローダウン、ボラティリティの計算が困難

## 影響 (Impact)

- **重大度: High**
- **日次リターンの不正確さ**: 実際の日次パフォーマンスが測定できない
- **リスクメトリクスの低下**: デイリーボラティリティ、VaRの計算が不正確
- **会計的な不正確さ**: 期間末の資産評価が不明確
- **規制対応の困難さ**: 金融規制で求められる時価評価レポート作成が困難
- **戦略評価の信頼性低下**: 日次のパフォーマンス分析が不可能

## 推奨される解決策 (Recommended Solution)

### 1. 日次マークトゥマーケットの実装

```typescript
interface DailyMarkToMarket {
  date: string;
  equity: number;
  cash: number;
  positionsValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  positions: PositionMTM[];
}

interface PositionMTM {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

class MarkToMarketTracker {
  private dailyMTM: DailyMarkToMarket[] = [];
  private currentDay: string | null = null;
  private currentDayMTM: Partial<DailyMarkToMarket> = {};

  recordEndOfDay(
    date: string,
    cash: number,
    positions: Map<string, BacktestPosition>,
    priceData: Map<string, number>
  ): DailyMarkToMarket {
    const positionsMTM: PositionMTM[] = [];
    let positionsValue = 0;
    let unrealizedPnL = 0;

    for (const [symbol, position] of positions) {
      const currentPrice = priceData.get(symbol);
      if (!currentPrice) continue;

      const marketValue = position.quantity * currentPrice;
      const costBasis = position.quantity * position.entryPrice;
      const positionPnL = position.type === 'LONG'
        ? marketValue - costBasis
        : costBasis - marketValue;

      positionsMTM.push({
        symbol,
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnL: positionPnL,
        unrealizedPnLPercent: (positionPnL / costBasis) * 100
      });

      positionsValue += marketValue;
      unrealizedPnL += positionPnL;
    }

    const equity = cash + positionsValue;
    const lastMTM = this.dailyMTM[this.dailyMTM.length - 1];
    const realizedPnL = lastMTM 
      ? (equity - lastMTM.equity) - unrealizedPnL + (lastMTM.unrealizedPnL || 0)
      : 0;

    const mtm: DailyMarkToMarket = {
      date,
      equity,
      cash,
      positionsValue,
      unrealizedPnL,
      realizedPnL,
      totalPnL: unrealizedPnL + realizedPnL,
      positions: positionsMTM
    };

    this.dailyMTM.push(mtm);
    return mtm;
  }

  getDailyReturns(): { date: string; return: number; returnPercent: number }[] {
    const returns: { date: string; return: number; returnPercent: number }[] = [];
    
    for (let i = 1; i < this.dailyMTM.length; i++) {
      const current = this.dailyMTM[i];
      const previous = this.dailyMTM[i - 1];
      const dailyReturn = current.equity - previous.equity;
      const dailyReturnPercent = (dailyReturn / previous.equity) * 100;
      
      returns.push({
        date: current.date,
        return: dailyReturn,
        returnPercent: dailyReturnPercent
      });
    }
    
    return returns;
  }

  getDailyVolatility(): number {
    const returns = this.getDailyReturns().map(r => r.returnPercent);
    if (returns.length < 2) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  getMaxDailyDrawdown(): { date: string; drawdown: number; drawdownPercent: number } {
    let maxEquity = 0;
    let maxDrawdown = 0;
    let maxDrawdownDate = '';

    for (const mtm of this.dailyMTM) {
      if (mtm.equity > maxEquity) {
        maxEquity = mtm.equity;
      }
      
      const drawdown = maxEquity - mtm.equity;
      const drawdownPercent = (drawdown / maxEquity) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDate = mtm.date;
      }
    }

    return {
      date: maxDrawdownDate,
      drawdown: maxDrawdown,
      drawdownPercent: (maxDrawdown / maxEquity) * 100
    };
  }

  getAllMTM(): DailyMarkToMarket[] {
    return [...this.dailyMTM];
  }
}
```

### 2. BacktestService への統合

```typescript
class BacktestService {
  private mtmTracker = new MarkToMarketTracker();

  async runBacktest(...): Promise<BacktestResult> {
    // ... existing code ...

    for (let i = 50; i < filteredData.length; i++) {
      // ... existing trading logic ...

      // 日付が変わったらマークトゥマーケットを記録
      const currentDate = currentCandle.date;
      const isEndOfDay = this.isEndOfDay(filteredData, i);
      
      if (isEndOfDay) {
        const priceData = new Map<string, number>();
        
        // 現在のポジションの価格を収集
        if (currentPosition) {
          priceData.set(currentPosition.symbol, currentCandle.close);
        }
        
        this.mtmTracker.recordEndOfDay(
          currentDate,
          capital,
          currentPosition ? new Map([[currentPosition.symbol, currentPosition]]) : new Map(),
          priceData
        );
      }
    }

    // バックテスト結果にMTMデータを追加
    const result = this.calculateBacktestMetrics(...);
    result.dailyMTM = this.mtmTracker.getAllMTM();
    result.dailyReturns = this.mtmTracker.getDailyReturns();
    result.dailyVolatility = this.mtmTracker.getDailyVolatility();
    result.maxDailyDrawdown = this.mtmTracker.getMaxDailyDrawdown();
    
    return result;
  }

  private isEndOfDay(data: OHLCV[], index: number): boolean {
    if (index === data.length - 1) return true;
    
    const currentDate = data[index].date.split('T')[0];
    const nextDate = data[index + 1].date.split('T')[0];
    
    return currentDate !== nextDate;
  }
}
```

### 3. 拡張された BacktestResult 型

```typescript
interface ExtendedBacktestResult extends BacktestResult {
  dailyMTM: DailyMarkToMarket[];
  dailyReturns: { date: string; return: number; returnPercent: number }[];
  dailyVolatility: number;
  maxDailyDrawdown: {
    date: string;
    drawdown: number;
    drawdownPercent: number;
  };
  
  // リスク調整後リターン（日次ベース）
  dailySharpeRatio: number;
  dailySortinoRatio: number;
  calmarRatio: number;
}
```

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts)
- [`trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts`](trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts)
- [`trading-platform/app/types/backtest.ts`](trading-platform/app/types/backtest.ts)

## 受け入れ基準 (Acceptance Criteria)

- [ ] 日次のマークトゥマーケット値が記録される
- [ ] 日次リターンが正確に計算される
- [ ] デイリーボラティリティが計算可能
- [ ] デイリードローダウンが追跡される
- [ ] ポジションごとの時価評価が記録される
- [ ] データがエクスポート可能（CSV/JSON）
- [ ] UIで日次の資産推移が可視化できる

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Risk Management Team
