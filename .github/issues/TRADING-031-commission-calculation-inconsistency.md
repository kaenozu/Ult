---
title: 手数料計算ロジックのコンポーネント間不整合
title_en: Commission Calculation Inconsistency Across Components
labels: bug, transaction-costs, critical, consistency
severity: Critical
priority: P0
---

## 説明 (Description)

取引手数料の計算ロジックが複数のコンポーネント間で一貫していません。同じパラメータ設定でも、使用するエンジンやサービスによって異なる手数料が適用され、バックテスト結果に重大な差異が生じています。

### 不整合のある実装一覧

#### 1. BacktestService (backtest-service.ts:265, 334)
```typescript
// エントリー時
const cost = quantity * price + config.commission;  // 固定額加算

// エグジット時
const proceeds = newPosition.quantity * price - config.commission;  // 固定額減算
```

#### 2. StrategyCatalog (StrategyCatalog.ts:67, 71, 83, 90)
```typescript
// パーセンテージベース
entryPrice = currentData.close * (1 + config.slippage);
capital -= position * entryPrice * (1 + config.commission);

const proceeds = position * exitPrice * (1 - config.commission);  // パーセンテージ減算
```

#### 3. AdvancedBacktestEngine (AdvancedBacktestEngine.ts:386)
```typescript
const fees = (entryValue + exitValue) * (this.config.commission / 100);  // 両サイドにパーセンテージ
pnl -= fees;
```

#### 4. TransactionCostModel (TransactionCostModel.ts)
```typescript
// 複雑な階層構造
const feeResult = this.calculateTradingFee(tradeAmount, broker, settlementType);
// SBI証券、楽天証券などの実際の手数料テーブルを使用
```

#### 5. PaperTradingEnvironment (PaperTradingEnvironment.ts:234, 353)
```typescript
const fees = totalValue * (this.config.commissionRate / 100);  // パーセンテージ
const totalCost = totalValue + fees;
```

### 問題の分析

| コンポーネント | 計算方式 | エントリー手数料 | エグジット手数料 |
|--------------|---------|-----------------|-----------------|
| BacktestService | 固定額 | `+ commission` | `- commission` |
| StrategyCatalog | パーセンテージ | `* (1 + commission)` | `* (1 - commission)` |
| AdvancedBacktestEngine | パーセンテージ | `(entry + exit) * commission%` | 同上 |
| TransactionCostModel | 階層型 | ブローカー別テーブル | ブローカー別テーブル |
| PaperTradingEnvironment | パーセンテージ | `value * commissionRate%` | 同上 |

## 影響 (Impact)

- **重大度: Critical**
- **結果の信頼性喪失**: 同じ戦略でもエンジンによって異なる結果
- **収益性の誤評価**: 手数料の違いで収益/損失が逆転する可能性
- **戦略選択の誤り**: 誤った手数料計算に基づく最適化
- **コンプライアンスリスク**: 実際の取引コストとの乖離

## 推奨される解決策 (Recommended Solution)

### 1. 統一された手数料計算インターフェースの作成

```typescript
// shared/types/commission.ts
export interface CommissionConfig {
  type: 'fixed' | 'percentage' | 'tiered';
  // 固定額の場合
  fixedAmount?: number;
  // パーセンテージの場合
  percentageRate?: number;
  // 階層型の場合
  tiers?: Array<{
    minVolume: number;
    maxVolume: number;
    rate: number;
  }>;
  // 最小/最大手数料
  minCommission?: number;
  maxCommission?: number;
}

export interface CommissionCalculator {
  calculateEntryCommission(orderValue: number, config: CommissionConfig): number;
  calculateExitCommission(orderValue: number, config: CommissionConfig): number;
  calculateTotalCommission(entryValue: number, exitValue: number, config: CommissionConfig): number;
}
```

### 2. 統一実装

```typescript
// shared/utils/CommissionCalculator.ts
export class StandardCommissionCalculator implements CommissionCalculator {
  calculateEntryCommission(orderValue: number, config: CommissionConfig): number {
    return this.calculateCommission(orderValue, config);
  }

  calculateExitCommission(orderValue: number, config: CommissionConfig): number {
    return this.calculateCommission(orderValue, config);
  }

  calculateTotalCommission(
    entryValue: number, 
    exitValue: number, 
    config: CommissionConfig
  ): number {
    return this.calculateEntryCommission(entryValue, config) +
           this.calculateExitCommission(exitValue, config);
  }

  private calculateCommission(orderValue: number, config: CommissionConfig): number {
    let commission: number;

    switch (config.type) {
      case 'fixed':
        commission = config.fixedAmount ?? 0;
        break;
      case 'percentage':
        commission = orderValue * (config.percentageRate ?? 0) / 100;
        break;
      case 'tiered':
        commission = this.calculateTieredCommission(orderValue, config.tiers ?? []);
        break;
      default:
        commission = 0;
    }

    // 最小/最大制限の適用
    if (config.minCommission !== undefined) {
      commission = Math.max(commission, config.minCommission);
    }
    if (config.maxCommission !== undefined) {
      commission = Math.min(commission, config.maxCommission);
    }

    return commission;
  }

  private calculateTieredCommission(
    orderValue: number, 
    tiers: CommissionTier[]
  ): number {
    // 階層計算ロジック
    let commission = 0;
    let remainingValue = orderValue;

    for (const tier of tiers.sort((a, b) => a.minVolume - b.minVolume)) {
      if (remainingValue <= 0) break;
      
      const tierVolume = tier.maxVolume 
        ? Math.min(remainingValue, tier.maxVolume - tier.minVolume)
        : remainingValue;
      
      commission += tierVolume * tier.rate;
      remainingValue -= tierVolume;
    }

    return commission;
  }
}
```

### 3. すべてのコンポーネントでの統一適用

```typescript
// 各コンポーネントでの使用例
class BacktestService {
  private commissionCalculator = new StandardCommissionCalculator();

  private executeTrade(...) {
    const entryCommission = this.commissionCalculator.calculateEntryCommission(
      quantity * price, 
      config.commission
    );
    // ...
  }
}
```

## 移行計画

### Phase 1: 統一インターフェースの作成
- [ ] CommissionConfig インターフェースの定義
- [ ] StandardCommissionCalculator の実装
- [ ] 単体テストの作成

### Phase 2: 既存コンポーネントの移行
- [ ] BacktestService の移行
- [ ] StrategyCatalog の移行
- [ ] AdvancedBacktestEngine の移行
- [ ] PaperTradingEnvironment の移行

### Phase 3: TransactionCostModel の統合
- [ ] ブローカー別手数料テーブルの統合
- [ ] 日本市場向け特化設定のサポート

### Phase 4: 検証とドキュメント
- [ ] 統合テストの作成
- [ ] 移行ガイドの作成
- [ ] パフォーマンスベンチマーク

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:265,334)
- [`trading-platform/app/lib/strategy/StrategyCatalog.ts`](trading-platform/app/lib/strategy/StrategyCatalog.ts:67,71)
- [`trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts`](trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts:386)
- [`trading-platform/app/lib/TransactionCostModel.ts`](trading-platform/app/lib/TransactionCostModel.ts)
- [`trading-platform/app/lib/paperTrading/PaperTradingEnvironment.ts`](trading-platform/app/lib/paperTrading/PaperTradingEnvironment.ts:234)

## 受け入れ基準 (Acceptance Criteria)

- [ ] すべてのコンポーネントが同じ CommissionCalculator を使用する
- [ ] 同じ設定で同じ結果が得られる
- [ ] 固定額、パーセンテージ、階層型のすべてがサポートされる
- [ ] 既存の設定が自動的に移行される
- [ ] パフォーマンスが劣化しない
- [ ] 包括的なテストカバレッジ

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Transaction Cost Team
