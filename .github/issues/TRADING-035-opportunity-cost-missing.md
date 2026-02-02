---
title: 機会コスト計算の未実装（TRADING-021要件）
title_en: Opportunity Cost Calculation Missing (TRADING-021 Requirement)
labels: enhancement, transaction-costs, high-priority, trding-021
severity: High
priority: P1
---

## 説明 (Description)

TRADING-021（取引コスト分析と最適化システム）で定義された機会コスト（Opportunity Cost）の計算が、バックテストエンジンに実装されていません。機会コストは、注文から実行までの遅延や部分的約定によって生じるコストであり、実際の取引コストを正確に評価するために不可欠です。

### TRADING-021 で定義された機会コスト

```typescript
// TRADING-021-transaction-costs.md より
@dataclass
class TransactionCost:
    commission: float
    slippage: float
    market_impact: float
    opportunity_cost: float  // ← 未実装
    total_cost: float
    cost_bps: float
```

### 現在の実装の欠落

```typescript
// backtest-service.ts
// 現在の取引コスト計算
const cost = quantity * price + config.commission;  // 手数料のみ

// 機会コストは考慮されていない
```

## 機会コストの定義

機会コストは以下の要因によって生じます：

1. **実行遅延コスト**: 注文決定から実際の執行までの価格変動
2. **部分的約定コスト**: 注文数量の一部のみが約定した場合の再注文コスト
3. **キャンセル・リプレイスコスト**: 未約定注文の変更・再提出コスト
4. **タイミングコスト**: 理想的な執行タイミングを逃したコスト

## 影響 (Impact)

- **重大度: High**
- **取引コストの過小評価**: 実際のコストが20-30%過小評価される可能性
- **高頻度戦略の誤評価**: HFT戦略では機会コストが支配的
- **最適化の方向性誤り**: 機会コストを無視した注文戦略の選択
- **実際のパフォーマンス乖離**: バックテストと実際の取引で大きな乖離
- **TRADING-021要件未達**: 定義された機能が未実装

## 推奨される解決策 (Recommended Solution)

### 1. 機会コストモデルの実装

```typescript
interface OpportunityCostConfig {
  // 実行遅延の想定（ミリ秒）
  expectedLatency: number;
  
  // 遅延あたりの価格変動率（ボラティリティベース）
  priceDriftPerMs: number;
  
  // 部分的約定の確率
  partialFillProbability: number;
  
  // 再注文の追加コスト
  reorderCost: number;
  
  // 市場インパクトの時間減衰
  marketImpactDecay: number;
}

interface OpportunityCostComponents {
  executionDelayCost: number;    // 実行遅延コスト
  partialFillCost: number;       // 部分的約定コスト
  timingCost: number;            // タイミングコスト
  totalOpportunityCost: number;
}

class OpportunityCostCalculator {
  constructor(private config: OpportunityCostConfig) {}

  calculate(
    order: OrderIntent,
    execution: ExecutionResult,
    marketData: MarketData,
    decisionTime: number,
    executionTime: number
  ): OpportunityCostComponents {
    const latency = executionTime - decisionTime;
    
    const executionDelayCost = this.calculateExecutionDelayCost(
      order, execution, marketData, latency
    );
    
    const partialFillCost = this.calculatePartialFillCost(
      order, execution, marketData
    );
    
    const timingCost = this.calculateTimingCost(
      order, execution, marketData
    );

    return {
      executionDelayCost,
      partialFillCost,
      timingCost,
      totalOpportunityCost: executionDelayCost + partialFillCost + timingCost
    };
  }

  private calculateExecutionDelayCost(
    order: OrderIntent,
    execution: ExecutionResult,
    marketData: MarketData,
    latency: number
  ): number {
    // ボラティリティに基づく価格変動の推定
    const volatility = marketData.volatility || 0.2; // デフォルト20%
    const annualVol = volatility;
    const dailyVol = annualVol / Math.sqrt(252);
    const msVol = dailyVol / (6.5 * 60 * 60 * 1000); // 1日6.5時間の取引時間想定
    
    // 遅延時間あたりの期待価格変動
    const expectedPriceMove = msVol * Math.sqrt(latency);
    const orderValue = order.quantity * order.targetPrice;
    
    // 方向に応じたコスト計算
    const direction = order.side === 'BUY' ? 1 : -1;
    const priceChange = execution.averagePrice - order.targetPrice;
    const adverseMove = direction * priceChange > 0 ? priceChange : 0;
    
    return Math.abs(adverseMove * order.quantity);
  }

  private calculatePartialFillCost(
    order: OrderIntent,
    execution: ExecutionResult,
    marketData: MarketData
  ): number {
    const fillRatio = execution.filledQuantity / order.quantity;
    
    if (fillRatio >= 1) return 0;
    
    // 未約定部分の再注文コスト
    const unfilledQuantity = order.quantity - execution.filledQuantity;
    const unfilledValue = unfilledQuantity * order.targetPrice;
    
    // 再注文時の予想スリッページ増加
    const additionalSlippage = this.config.reorderCost * (1 - fillRatio);
    
    // 時間経過による不利な価格変動
    const priceDrift = marketData.trend || 0;
    const driftCost = unfilledValue * Math.abs(priceDrift);
    
    return unfilledValue * additionalSlippage + driftCost;
  }

  private calculateTimingCost(
    order: OrderIntent,
    execution: ExecutionResult,
    marketData: MarketData
  ): number {
    // VWAPやTWAPベンチマークとの比較
    const vwap = marketData.vwap;
    if (!vwap) return 0;
    
    const executionValue = execution.filledQuantity * execution.averagePrice;
    const vwapValue = execution.filledQuantity * vwap;
    
    // ベンチマークに対する不利な執行
    const timingSlippage = order.side === 'BUY'
      ? execution.averagePrice - vwap
      : vwap - execution.averagePrice;
    
    return Math.max(0, timingSlippage * execution.filledQuantity);
  }
}
```

### 2. バックテストエンジンへの統合

```typescript
interface BacktestConfig {
  // ... existing config ...
  
  // 機会コスト設定
  calculateOpportunityCost: boolean;
  opportunityCostConfig?: OpportunityCostConfig;
}

class BacktestService {
  private opportunityCostCalculator?: OpportunityCostCalculator;

  async runBacktest(
    stock: Stock,
    historicalData: OHLCV[],
    config: BacktestConfig,
    onProgress?: BacktestProgressCallback
  ): Promise<BacktestResult> {
    
    if (config.calculateOpportunityCost) {
      this.opportunityCostCalculator = new OpportunityCostCalculator(
        config.opportunityCostConfig || DEFAULT_OPPORTUNITY_COST_CONFIG
      );
    }

    // ... existing backtest logic ...
  }

  private executeTrade(
    trade: TradeIntent,
    currentCandle: OHLCV,
    config: BacktestConfig,
    currentCapital: number
  ): ExecutionResult {
    // ... existing execution logic ...

    // 機会コストの計算
    let opportunityCost = 0;
    if (this.opportunityCostCalculator && config.calculateOpportunityCost) {
      const marketData: MarketData = {
        volatility: this.calculateVolatility(...),
        vwap: this.calculateVWAP(...),
        trend: this.calculateTrend(...)
      };

      const opportunityCostComponents = this.opportunityCostCalculator.calculate(
        trade,
        execution,
        marketData,
        trade.decisionTime,
        execution.executionTime
      );

      opportunityCost = opportunityCostComponents.totalOpportunityCost;
      
      // 取引記録に機会コストを追加
      tradeRecord.opportunityCost = opportunityCost;
      tradeRecord.opportunityCostBreakdown = opportunityCostComponents;
    }

    // 総コストに機会コストを含める
    const totalCost = commission + slippage + opportunityCost;
    
    return {
      ...execution,
      totalCost,
      opportunityCost
    };
  }
}
```

### 3. 拡張された取引記録

```typescript
interface BacktestTrade {
  // ... existing fields ...
  
  // 機会コスト情報
  opportunityCost?: number;
  opportunityCostBreakdown?: {
    executionDelayCost: number;
    partialFillCost: number;
    timingCost: number;
  };
  
  // 総取引コスト
  totalTransactionCost?: number;
  
  // ベンチマーク比較
  vwapBenchmark?: number;
  arrivalPrice?: number;
}
```

## 関連ファイル

- [`.github/issues/TRADING-021-transaction-costs.md`](.github/issues/TRADING-021-transaction-costs.md)
- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts)
- [`trading-platform/app/lib/TransactionCostModel.ts`](trading-platform/app/lib/TransactionCostModel.ts)
- [`trading-platform/app/lib/backtest/RealisticBacktestEngine.ts`](trading-platform/app/lib/backtest/RealisticBacktestEngine.ts)

## 受け入れ基準 (Acceptance Criteria)

- [ ] 機会コストが取引コスト計算に含まれる
- [ ] 実行遅延コストが計算される
- [ ] 部分的約定コストが計算される
- [ ] タイミングコスト（VWAPベンチマーク）が計算される
- [ ] 機会コストの内訳が記録される
- [ ] TRADING-021 の要件を満たす
- [ ] パフォーマンスへの影響が測定可能

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Transaction Cost Team
