---
title: ポジションサイズ計算におけるゼロ除算バグ
title_en: Division by Zero in Position Sizing Calculation
labels: bug, position-sizing, critical, risk-management
severity: Critical
priority: P0
---

## 説明 (Description)

バックテストサービス ([`backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:251-253)) のポジションサイズ計算において、ゼロ除算が発生する可能性のある致命的なバグが存在します。ストップロス価格がエントリー価格と同じ、または非常に近い場合、`stopLossDistance` がゼロまたは極めて小さな値となり、ポジションサイズが異常な値を取ります。

### 問題のあるコード (Lines 251-253)

```typescript
// ポジションサイズを計算（リスク管理）
const riskAmount = currentCapital * (config.riskPerTrade || 0.02); // デフォルトで2%
const stopLossDistance = Math.abs(price - trade.signal.stopLoss);
const positionSize = riskAmount / stopLossDistance;  // ❌ BUG: ゼロ除算の可能性
```

### 問題のシナリオ

1. **ストップロス未設定**: `trade.signal.stopLoss` が `undefined` または `null` の場合
2. **ストップロス = エントリー価格**: シグナル生成時のバグで同一価格が設定された場合
3. **極めて近い価格**: 高頻度取引や小規模ティックサイズで差分がゼロに近づく場合
4. **極端なポジションサイズ**: ゼロ除算を回避できたとしても、極めて小さな `stopLossDistance` は巨大なポジションサイズを生み出す

## 影響 (Impact)

- **重大度: Critical**
- **アプリケーションクラッシュ**: ランタイムエラーでバックテスト処理が停止
- **異常なポジションサイズ**: 理論上無限大に近いポジションを取得し、資本を超える注文を発行
- **誤ったリスク評価**: 実際のリスクが設定値を大幅に超える
- **データ整合性の喪失**: バックテスト結果が完全に信頼できないものになる

## 推奨される解決策 (Recommended Solution)

### 即時修正 (Hotfix)

```typescript
// ポジションサイズを計算（リスク管理）
const riskAmount = currentCapital * (config.riskPerTrade || 0.02);
const stopLossDistance = Math.abs(price - (trade.signal.stopLoss || price * 0.02)); // デフォルト2%ストップロス

// ✅ FIX: ゼロ除算防止と最小距離の保証
const MIN_STOP_LOSS_DISTANCE_PERCENT = 0.005; // 最小0.5%
const minStopLossDistance = price * MIN_STOP_LOSS_DISTANCE_PERCENT;
const effectiveStopLossDistance = Math.max(stopLossDistance, minStopLossDistance);

const positionSize = riskAmount / effectiveStopLossDistance;

// 追加: ポジションサイズの上限チェック
const MAX_POSITION_SIZE_RATIO = 0.5; // 資本の50%を上限
const maxPositionSize = (currentCapital * MAX_POSITION_SIZE_RATIO) / price;
const finalPositionSize = Math.min(positionSize, maxPositionSize);
```

### 包括的な修正

```typescript
interface PositionSizingConfig {
  riskPerTrade: number;        // デフォルト: 0.02 (2%)
  minStopLossPercent: number;  // デフォルト: 0.005 (0.5%)
  maxPositionPercent: number;  // デフォルト: 0.5 (50%)
  defaultStopLossPercent: number; // デフォルト: 0.02 (2%)
}

private calculatePositionSize(
  currentCapital: number,
  entryPrice: number,
  stopLoss: number | undefined,
  config: PositionSizingConfig
): { quantity: number; stopLossDistance: number; riskAmount: number } | null {
  
  // リスク金額の計算
  const riskAmount = currentCapital * config.riskPerTrade;
  
  // ストップロスの決定
  const effectiveStopLoss = stopLoss ?? entryPrice * (1 - config.defaultStopLossPercent);
  
  // ストップロス距離の計算
  let stopLossDistance = Math.abs(entryPrice - effectiveStopLoss);
  
  // 最小ストップロス距離の保証
  const minDistance = entryPrice * config.minStopLossPercent;
  if (stopLossDistance < minDistance) {
    console.warn(`Stop loss distance too small (${stopLossDistance}), adjusting to minimum (${minDistance})`);
    stopLossDistance = minDistance;
  }
  
  // ポジションサイズの計算
  const positionSize = riskAmount / stopLossDistance;
  
  // 最大ポジションサイズの制限
  const maxPositionSize = (currentCapital * config.maxPositionPercent) / entryPrice;
  const finalPositionSize = Math.min(positionSize, maxPositionSize);
  
  // 有効なポジションサイズかチェック
  if (finalPositionSize <= 0 || !isFinite(finalPositionSize)) {
    console.error('Invalid position size calculated:', finalPositionSize);
    return null;
  }
  
  return {
    quantity: Math.floor(finalPositionSize),
    stopLossDistance,
    riskAmount
  };
}
```

## 関連ファイル

- [`trading-platform/app/lib/backtest-service.ts`](trading-platform/app/lib/backtest-service.ts:251-253) - メインのバグ箇所
- [`trading-platform/app/lib/strategy/StrategyCatalog.ts`](trading-platform/app/lib/strategy/StrategyCatalog.ts:65) - 類似の計算ロジック
- [`trading-platform/app/lib/paperTrading/PaperTradingEnvironment.ts`](trading-platform/app/lib/paperTrading/PaperTradingEnvironment.ts) - ペーパートレーディングでのポジションサイズ

## 受け入れ基準 (Acceptance Criteria)

- [ ] ゼロ除算が発生しない（すべてのケースでガードされている）
- [ ] ストップロス未設定時にデフォルト値が適用される
- [ ] 極めて小さなストップロス距離が自動調整される
- [ ] ポジションサイズに上限が設けられている
- [ ] 無効な計算結果時に適切なエラーハンドリングが行われる
- [ ] 単体テストで境界値ケースがカバーされている

## テストケース

```typescript
describe('Position Sizing Safety', () => {
  it('should handle undefined stop loss', () => {
    const result = calculatePositionSize(100000, 100, undefined, config);
    expect(result).not.toBeNull();
    expect(result!.quantity).toBeGreaterThan(0);
  });

  it('should handle zero stop loss distance', () => {
    const result = calculatePositionSize(100000, 100, 100, config);
    expect(result).not.toBeNull();
    expect(result!.quantity).toBeGreaterThan(0);
    expect(result!.stopLossDistance).toBeGreaterThan(0);
  });

  it('should cap position size at maximum', () => {
    const result = calculatePositionSize(100000, 1, 0.999, config);
    expect(result!.quantity).toBeLessThanOrEqual(50000); // 50% of capital
  });

  it('should return null for invalid inputs', () => {
    expect(calculatePositionSize(0, 100, 90, config)).toBeNull();
    expect(calculatePositionSize(100000, 0, 90, config)).toBeNull();
    expect(calculatePositionSize(NaN, 100, 90, config)).toBeNull();
  });
});
```

---

**報告日**: 2026-02-02  
**報告者**: Code Review Team  
**担当**: Risk Management Team
