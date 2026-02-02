---
title: スリッページ計算ロジックのコンポーネント間不整合
title_en: Slippage Calculation Inconsistency Across Files
labels: bug, slippage, critical, consistency
severity: Critical
priority: P0
---

## 説明 (Description)

スリッページの適用ロジックが複数のファイル間で一貫していません。同じ `slippage` パラメータ設定でも、ファイルによって異なる計算式が使用され、同じ値が異なる結果を生み出しています。

### 不整合のある実装一覧

#### 1. BacktestService (backtest-service.ts:364-369)
```typescript
private applySlippage(price: number, direction: 'BUY' | 'SELL', slippage: number): number {
  if (direction === 'BUY') {
    return price * (1 + slippage / 100);  // 固定率で加算
  } else {
    return price * (1 - slippage / 100);  // 固定率で減算
  }
}
```

#### 2. StrategyCatalog (StrategyCatalog.ts:66, 70, 82, 89)
```typescript
// BUY時
entryPrice = currentData.close * (1 + config.slippage);  // パーセンテージとして直接使用

// SELL時
const exitPrice = currentData.close * (1 - config.slippage);  // パーセンテージとして直接使用
```

#### 3. AdvancedBacktestEngine / WinningBacktestEngine (AdvancedBacktestEngine.ts:419-421)
```typescript
private applySlippage(price: number, side: 'BUY' | 'SELL'): number {
  // ランダム要素を含む
  const slippageFactor = 1 + (Math.random() * this.config.slippage / 100);
  return side === 'BUY' ? price * slippageFactor : price / slippageFactor;
}
```

#### 4. SlippageModel (SlippageModel.ts:107-149)
```typescript
// 複雑な多変量モデル
let slippageRate = this.config.baseSlippage / 100;

// スプレッド影響
const spreadImpact = (this.config.spread / 100) / 2;
slippageRate += spreadImpact;

// 時間帯影響
const timeOfDayImpact = data ? this.calculateTimeOfDaySlippage(data) : 0;
slippageRate += timeOfDayImpact;

// ボラティリティ影響
const volatilityImpact = data ? this.calculateVolatilitySlippage(data) : 0;
slippageRate += volatilityImpact;

// オーダーサイズ影響
const orderSizeImpact = this.calculateOrderSizeImpact(orderSize);
slippageRate += orderSizeImpact;
```

#### 5. AITradeService (AITradeService.ts:58, 104)
```typescript
// BUYシグナル
const entryPrice = signal.type === 'BUY' 
  ? currentPrice * (1 + slippage)   // 定数 SLIPPAGE_PERCENTAGE 使用
  : currentPrice * (1 - slippage);

// SELL (Exit)
const exitPrice = openTrade.type === 'BUY' 
  ? currentPrice * (1 - slippage) 
  : currentPrice * (1 + slippage);
```

#### 6. TransactionCostModel (TransactionCostModel.ts:226-283)
```typescript
// 市場状況に基づく動的スリッページ
if (marketCondition === 'liquid') {
  slippageRate = -0.001;  // 価格改善（負のスリッページ）
} else if (marketCondition === 'volatile') {
  slippageRate = 0.005 + Math.random() * 0.005;  // 0.5% - 1.0%
} else if (marketCondition === 'normal') {
  slippageRate = 0.001 + Math.random() * 0.002;  // 0.1% - 0.3%
}
```

### パラメータ解釈の違い

| ファイル | slippage: 0.1 の解釈 |
|---------|---------------------|
| BacktestService | 0.1% = 0.001 (÷100) |
| StrategyCatalog | 10% = 0.1 (直接使用) |
| AdvancedBacktestEngine | 0.1% = 0.001 (÷100) |
| AITradeService | 定数使用 (POSITION_SIZING.SLIPPAGE_PERCENTAGE) |

## 影響 (Impact)

- **重大度: Critical**
- **予測不可能な実行価格**: 同じ設定で異なる実行結果
- **戦略の過大評価/過小評価**: スリッページが実際より悪い/良い想定
- **テストの困難さ**: 再現性のない結果
- **意思決定の誤り**: 誤ったスリッページ想定に基づく戦略選択

## 推奨される解決策 (Recommended Solution)

### 1. 統一されたスリッページモデルの定義

```typescript
// shared/types/slippage.ts
export type SlippageModelType = 
  | 'fixed'        // 固定スリッページ率
  | 'random'       // ランダム変動
  | 'market_impact' // 市場影響モデル
  | 'advanced';    // 多変量モデル

export interface SlippageConfig {
  model: SlippageModelType;
  baseRate: number;           // 基本スリッページ率 (0.001 = 0.1%)
  // ランダムモデル用
  randomVariance?: number;    // ランダム変動幅
  // 市場影響モデル用
  volumeImpact?: number;      // 出来高影響係数
  volatilityImpact?: number;  // ボラティリティ影響係数
  // アドバンスモデル用
  timeOfDayFactors?: TimeOfDayFactors;
  spreadAdjustment?: boolean;
}

export interface SlippageResult {
  adjustedPrice: number;
  slippageRate: number;       // 実際に適用された率
  slippageAmount: number;     // 価格への影響額
  components?: {              // アドバンスモデルの内訳
    base: number;
    timeOfDay: number;
    volatility: number;
    orderSize: number;
    spread: number;
  };
}
```

### 2. 統一された計算インターフェース

```typescript
// shared/utils/SlippageCalculator.ts
export interface SlippageCalculator {
  calculate(
    price: number,
    side: 'BUY' | 'SELL',
    config: SlippageConfig,
    context?: MarketContext
  ): SlippageResult;
}

export class StandardSlippageCalculator implements SlippageCalculator {
  calculate(
    price: number,
    side: 'BUY' | 'SELL',
    config: SlippageConfig,
    context?: MarketContext
  ): SlippageResult {
    switch (config.model) {
      case 'fixed':
        return this.calculateFixed(price, side, config);
      case 'random':
        return this.calculateRandom(price, side, config);
      case 'market_impact':
        return this.calculateMarketImpact(price, side, config, context);
      case 'advanced':
        return this.calculateAdvanced(price, side, config, context);
      default:
        return { adjustedPrice: price, slippageRate: 0, slippageAmount: 0 };
    }
  }

  private calculateFixed(
    price: number, 
    side: 'BUY' | 'SELL', 
    config: SlippageConfig
  ): SlippageResult {
    const multiplier = side === 'BUY' ? 1 : -1;
    const adjustedPrice = price * (1 + multiplier * config.baseRate);
    
    return {
      adjustedPrice,
      slippageRate: config.baseRate,
      slippageAmount: Math.abs(adjustedPrice - price)
    };
  }

  private calculateRandom(
    price: number,
    side: 'BUY' | 'SELL',
    config: SlippageConfig
  ): SlippageResult {
    const variance = config.randomVariance ?? 0;
    const randomFactor = 1 + (Math.random() * variance);
    const effectiveRate = config.baseRate * randomFactor;
    
    const multiplier = side === 'BUY' ? 1 : -1;
    const adjustedPrice = price * (1 + multiplier * effectiveRate);
    
    return {
      adjustedPrice,
      slippageRate: effectiveRate,
      slippageAmount: Math.abs(adjustedPrice - price)
    };
  }

  private calculateMarketImpact(
    price: number,
    side: 'BUY' | 'SELL',
    config: SlippageConfig,
    context?: MarketContext
  ): SlippageResult {
    let rate = config.baseRate;
    
    // 出来高影響
    if (context?.orderSize && context?.dailyVolume) {
      const volumeRatio = context.orderSize / context.dailyVolume;
      rate += (config.volumeImpact ?? 0) * volumeRatio;
    }
    
    // ボラティリティ影響
    if (context?.volatility) {
      rate += (config.volatilityImpact ?? 0) * context.volatility;
    }
    
    const multiplier = side === 'BUY' ? 1 : -1;
    const adjustedPrice = price * (1 + multiplier * rate);
    
    return {
      adjustedPrice,
      slippageRate: rate,
      slippageAmount: Math.abs(adjustedPrice - price)
    };
  }

  private calculateAdvanced(
    price: number,
    side: 'BUY' | 'SELL',
    config: SlippageConfig,
    context?: MarketContext
  ): SlippageResult {
    // SlippageModel.ts の既存ロジックを統合
    // ...
  }
}
```

## 移行計画

### Phase 1: 統一インターフェースの作成
- [ ] SlippageConfig 型の定義
- [ ] StandardSlippageCalculator の実装
- [ ] 各モデルの単体テスト

### Phase 2: 既存コードの移行
- [ ] BacktestService の移行
- [ ] StrategyCatalog の移行
- [ ] AdvancedBacktestEngine の移行
- [ ] AITradeService の移行

### Phase 3: バックワードコンパティビリティ
- [ ] 旧パラメータの自動変換
- [ ] 設定移行ツール
- [ ] 移行ドキュメント

### Phase 4: 検証
- [ ] 統合テスト
- [ ] パフォーマンステスト
- [ ] 結果の一貫性検証

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:364-369)
- [`trading-platform/app/lib/strategy/StrategyCatalog.ts`](trading-platform/app/lib/strategy/StrategyCatalog.ts:66-90)
- [`trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts`](trading-platform/app/lib/backtest/AdvancedBacktestEngine.ts:419-421)
- [`trading-platform/app/lib/backtest/SlippageModel.ts`](trading-platform/app/lib/backtest/SlippageModel.ts)
- [`trading-platform/app/lib/AITradeService.ts`](trading-platform/app/lib/AITradeService.ts:58,104)
- [`trading-platform/app/lib/TransactionCostModel.ts`](trading-platform/app/lib/TransactionCostModel.ts:226-283)

## 受け入れ基準 (Acceptance Criteria)

- [ ] すべてのコンポーネントが同じモデルで同じ結果を出す
- [ ] モデルタイプが明示的に設定可能
- [ ] 後方互換性が維持される
- [ ] スリッページの内訳が可視化できる
- [ ] 設定値の単位が統一される（Basis Points または Percent）
- [ ] 包括的なテストカバレッジ

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Trading Engine Team
