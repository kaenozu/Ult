---
title: バックテストサービスの単一責任原則違反
title_en: Backtest Service Single Responsibility Principle Violations
labels: refactoring, architecture, technical-debt, medium-priority
severity: Medium
priority: P2
---

## 説明 (Description)

バックテストサービス ([`backtest-service.ts`](trading-platform/app/lib/backtest-service.ts)) が単一責任原則（SRP）に違反しており、1つのクラスが複数の責任を持ちすぎています。これにより、コードの保守性、テスト容易性、拡張性が著しく低下しています。

### 現在の責任の混在

```typescript
class BacktestService {
  // 1. バックテストオーケストレーション
  async runBacktest(...): Promise<BacktestResult> { ... }
  
  // 2. データフィルタリング
  private filterByDateRange(...): OHLCV[] { ... }
  
  // 3. 取引評価ロジック
  private evaluateTrade(...): TradeDecision { ... }
  
  // 4. 取引実行
  private executeTrade(...): ExecutionResult { ... }
  
  // 5. スリッページ計算
  private applySlippage(...): number { ... }
  
  // 6. 損益計算
  private calculateProfitPercent(...): number { ... }
  
  // 7. メトリクス計算
  private calculateBacktestMetrics(...): BacktestResult { ... }
}
```

### コード統計

| メトリクス | 値 |
|-----------|-----|
| 総行数 | ~458行 |
| メソッド数 | 7個 |
| 責任領域 | 7つ |
| 循環的複雑度 | 高 |

## 識別された問題

### 1. 神クラス（God Class）
- バックテストの全ライフサイクルを1クラスで管理
- 変更の理由が複数あり、修正の影響範囲が予測困難

### 2. 密結合（Tight Coupling）
- `mlPredictionService` への直接依存
- データソース、取引ロジック、メトリクス計算が密結合

### 3. テスト困難性
- 単体テストが複雑（多くのモックが必要）
- 統合テストと単体テストの境界が不明確

### 4. 拡張性の制限
- 新しい取引戦略の追加が困難
- 異なるスリッページモデルの切り替えが困難
- 新しいメトリクスの追加が困難

## 推奨される解決策 (Recommended Solution)

### リファクタリング後のアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    BacktestOrchestrator                     │
│  - バックテストフローの調整                                   │
│  - 各コンポーネントの連携                                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
│ DataProvider │    │ TradingEngine  │    │ MetricsCalculator│
│              │    │                │    │                  │
│ - データ取得  │    │ - シグナル評価  │    │ - パフォーマンス  │
│ - フィルタリング│   │ - 取引実行     │    │ - リスク指標     │
│ - キャッシュ  │    │ - ポジション管理│    │ - レポート生成   │
└──────────────┘    └────────────────┘    └──────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌────────────┐   ┌──────────────┐   ┌──────────────┐
    │SignalEval  │   │ExecutionSvc  │   │RiskManager   │
    │            │   │              │   │              │
    │- エントリー │   │ - 手数料計算  │   │ - ポジション  │
    │- エグジット │   │ - スリッページ │   │   サイジング  │
    │- ホールド  │   │ - 機会コスト  │   │ - 損切り管理  │
    └────────────┘   └──────────────┘   └──────────────┘
```

### 実装例

#### 1. DataProvider

```typescript
interface DataProvider {
  getData(symbol: string, startDate?: string, endDate?: string): Promise<OHLCV[]>;
  getLatestPrice(symbol: string): Promise<number>;
}

class HistoricalDataProvider implements DataProvider {
  constructor(
    private dataStore: DataStore,
    private cache: CacheManager
  ) {}

  async getData(symbol: string, startDate?: string, endDate?: string): Promise<OHLCV[]> {
    const cacheKey = `${symbol}_${startDate}_${endDate}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.dataStore.query({ symbol, startDate, endDate });
    await this.cache.set(cacheKey, data, { ttl: 3600 });
    
    return data;
  }
  
  // ...
}
```

#### 2. TradingEngine

```typescript
interface TradingEngine {
  evaluate(signal: Signal, context: MarketContext): TradeDecision;
  execute(decision: TradeDecision, context: ExecutionContext): ExecutionResult;
}

class StandardTradingEngine implements TradingEngine {
  constructor(
    private signalEvaluator: SignalEvaluator,
    private executionService: ExecutionService,
    private positionManager: PositionManager,
    private riskManager: RiskManager
  ) {}

  evaluate(signal: Signal, context: MarketContext): TradeDecision {
    return this.signalEvaluator.evaluate(signal, context);
  }

  execute(decision: TradeDecision, context: ExecutionContext): ExecutionResult {
    // リスクチェック
    const riskCheck = this.riskManager.validate(decision, context);
    if (!riskCheck.passed) {
      return { success: false, reason: riskCheck.reason };
    }

    // 執行
    const execution = this.executionService.execute(decision, context);
    
    // ポジション更新
    this.positionManager.update(execution);
    
    return execution;
  }
}
```

#### 3. ExecutionService

```typescript
interface ExecutionService {
  execute(decision: TradeDecision, context: ExecutionContext): ExecutionResult;
}

class RealisticExecutionService implements ExecutionService {
  constructor(
    private commissionCalculator: CommissionCalculator,
    private slippageCalculator: SlippageCalculator,
    private opportunityCostCalculator?: OpportunityCostCalculator
  ) {}

  execute(decision: TradeDecision, context: ExecutionContext): ExecutionResult {
    const basePrice = context.currentPrice;
    
    // スリッページ適用
    const slippage = this.slippageCalculator.calculate(
      basePrice,
      decision.side,
      context.marketCondition
    );
    
    const executionPrice = this.applySlippage(basePrice, decision.side, slippage);
    
    // 手数料計算
    const commission = this.commissionCalculator.calculate(
      executionPrice * decision.quantity
    );
    
    // 機会コスト計算
    const opportunityCost = this.opportunityCostCalculator?.calculate(
      decision, 
      { price: executionPrice, timestamp: Date.now() },
      context
    ) ?? 0;

    return {
      success: true,
      price: executionPrice,
      quantity: decision.quantity,
      commission,
      slippage,
      opportunityCost,
      totalCost: commission + slippage.amount + opportunityCost
    };
  }
}
```

#### 4. MetricsCalculator

```typescript
interface MetricsCalculator {
  calculate(trades: Trade[], equity: EquityCurve): BacktestMetrics;
}

class ComprehensiveMetricsCalculator implements MetricsCalculator {
  constructor(
    private returnCalculator: ReturnCalculator,
    private riskCalculator: RiskCalculator,
    private drawdownCalculator: DrawdownCalculator
  ) {}

  calculate(trades: Trade[], equity: EquityCurve): BacktestMetrics {
    const returns = this.returnCalculator.calculate(equity);
    const risk = this.riskCalculator.calculate(returns);
    const drawdown = this.drawdownCalculator.calculate(equity);

    return {
      totalReturn: returns.total,
      annualizedReturn: returns.annualized,
      volatility: risk.volatility,
      sharpeRatio: risk.sharpeRatio,
      sortinoRatio: risk.sortinoRatio,
      maxDrawdown: drawdown.max,
      calmarRatio: returns.annualized / drawdown.max,
      // ...
    };
  }
}
```

#### 5. BacktestOrchestrator

```typescript
class BacktestOrchestrator {
  constructor(
    private dataProvider: DataProvider,
    private tradingEngine: TradingEngine,
    private metricsCalculator: MetricsCalculator,
    private progressReporter?: ProgressReporter
  ) {}

  async run(config: BacktestConfig): Promise<BacktestResult> {
    // 1. データ取得
    const data = await this.dataProvider.getData(
      config.symbol,
      config.startDate,
      config.endDate
    );

    // 2. バックテスト実行
    const trades: Trade[] = [];
    const equity: EquityCurve = new EquityCurve(config.initialCapital);

    for (let i = config.warmupPeriod; i < data.length; i++) {
      const context = this.createContext(data, i);
      
      // シグナル生成（外部サービス）
      const signal = await this.generateSignal(context);
      
      // 取引評価・実行
      const decision = this.tradingEngine.evaluate(signal, context);
      if (decision.action !== 'HOLD') {
        const execution = this.tradingEngine.execute(decision, context);
        if (execution.success) {
          trades.push(this.createTrade(decision, execution));
          equity.update(execution);
        }
      }

      // 進捗報告
      this.progressReporter?.report(i / data.length);
    }

    // 3. メトリクス計算
    const metrics = this.metricsCalculator.calculate(trades, equity);

    return {
      trades,
      equity: equity.getHistory(),
      metrics
    };
  }
}
```

## 移行計画

### Phase 1: インターフェース定義
- [ ] 各コンポーネントのインターフェース定義
- [ ] 依存関係の整理
- [ ] テスト戦略の策定

### Phase 2: 段階的リファクタリング
- [ ] DataProvider の抽出
- [ ] ExecutionService の抽出
- [ ] MetricsCalculator の抽出
- [ ] TradingEngine の抽出

### Phase 3: 統合と検証
- [ ] BacktestOrchestrator の実装
- [ ] 既存テストの移行
- [ ] パフォーマンス比較

### Phase 4: 古いコードの削除
- [ ] 旧 BacktestService の非推奨化
- [ ] ドキュメント更新
- [ ] 移行ガイドの作成

## 期待される効果

| メトリクス | 現在 | 目標 |
|-----------|------|------|
| クラスあたりの行数 | 458 | <100 |
| 単体テストカバレッジ | 低 | >80% |
| 循環的複雑度 | 高 | 低 |
| 新機能追加工数 | 大 | 小 |

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts)
- [`trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts`](trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts)
- [`trading-platform/app/lib/backtest/RealisticBacktestEngine.ts`](trading-platform/app/lib/backtest/RealisticBacktestEngine.ts)

## 受け入れ基準 (Acceptance Criteria)

- [ ] 各クラスが単一の責任のみを持つ
- [ ] コンポーネント間の依存関係が明確
- [ ] インターフェースによる疎結合化
- [ ] 単体テストが容易に書ける
- [ ] 既存機能がすべて維持される
- [ ] パフォーマンスが劣化しない

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Architecture Team
