# 予測精度向上・パフォーマンス改善 設計書

## 概要

トレーディングプラットフォームの株価予測精度向上とパフォーマンス改善を行う。
段階的改善アプローチで実装し、各フェーズで検証可能な形で進める。

## 現状の課題

1. **精度不足**: 方向予測の的中率が55%前後
2. **計算遅延**: 予測計算に200ms以上かかる場合がある
3. **ドリフト対応**: 市場レジームの変化に適応できていない

## 目標

| 項目 | 改善前 | 改善後 |
|------|--------|--------|
| 方向精度 | 55% | 65-70% |
| 計算時間 | 200ms | <100ms |
| 早期検出 | 基準 | 15-30%改善 |

---

## Phase 1: パラメータ最適化

### RSI閾値の精緻化

```typescript
const RSI_THRESHOLDS = {
  EXTREME_OVERSOLD: 15,    // 従来: 20
  MODERATE_OVERSOLD: 30,   // 従来: 30
  MODERATE_OVERBOUGHT: 70, // 従来: 70
  EXTREME_OVERBOUGHT: 85   // 従来: 80
};
```

### 市場レジーム別アンサンブル重み

```typescript
const OPTIMIZED_WEIGHTS = {
  TRENDING: { RF: 0.25, XGB: 0.35, LSTM: 0.35, TECHNICAL: 0.05 },
  RANGING:  { RF: 0.40, XGB: 0.30, LSTM: 0.20, TECHNICAL: 0.10 },
  VOLATILE: { RF: 0.30, XGB: 0.30, LSTM: 0.25, TECHNICAL: 0.15 },
  QUIET:    { RF: 0.25, XGB: 0.25, LSTM: 0.25, TECHNICAL: 0.25 }
};
```

### 変更ファイル

- `app/lib/config/prediction-config.ts` - 新規作成
- `app/lib/ml/EnsembleModel.ts` - 重み調整ロジック更新

### 期待効果

方向精度 55% → 60-65%

---

## Phase 2: ローソク足パターン認識統合

### パターン検出サービスの統合

既存の`candlestick-pattern-service.ts`を活用し、アンサンブルに新モデルを追加。

### 対応パターン

| パターン | 説明 | シグナル |
|----------|------|----------|
| Doji | 小さな実体 | 転換 |
| Hammer | 下ヒゲ長い | 上昇 |
| Engulfing | 包み込み | 強い方向 |
| Morning/Evening Star | 星（3日） | 転換 |

### アンサンブル構成変更

```typescript
type ModelType = 'RF' | 'XGB' | 'LSTM' | 'TECHNICAL' | 'PATTERN' | 'ENSEMBLE';

const WEIGHTS_WITH_PATTERN = {
  TRENDING: { RF: 0.23, XGB: 0.32, LSTM: 0.32, TECHNICAL: 0.05, PATTERN: 0.08 },
  RANGING:  { RF: 0.37, XGB: 0.28, LSTM: 0.18, TECHNICAL: 0.09, PATTERN: 0.08 },
  VOLATILE: { RF: 0.28, XGB: 0.28, LSTM: 0.23, TECHNICAL: 0.13, PATTERN: 0.08 },
  QUIET:    { RF: 0.23, XGB: 0.23, LSTM: 0.23, TECHNICAL: 0.23, PATTERN: 0.08 }
};
```

### 変更ファイル

- `app/lib/ml/EnsembleModel.ts` - パターンモデル追加
- `app/lib/types/prediction-types.ts` - 型定義更新

### 期待効果

早期転換点検出 15-30%改善

---

## Phase 3: Web Worker化による計算高速化

### 予測計算のWorker化

既存の`prediction-worker.ts`を活用・拡張。

```typescript
// メインスレッドをブロックしない予測計算
const result = await predictionWorker.predict({
  id: `pred_${symbol}_${Date.now()}`,
  symbol,
  data: ohlcvData,
  indicators
});
```

### メモ化キャッシュ

```typescript
interface CacheConfig {
  TTL: 5000;           // 5秒
  MAX_SIZE: 50;        // 最大50エントリ
  CLEANUP_INTERVAL: 30000;  // 30秒ごとクリーンアップ
}
```

### 重複リクエスト防止

```typescript
// 同じシンボルへの同時リクエストを防止
private pendingRequests = new Map<string, Promise<EnhancedPredictionResult>>();
```

### 変更ファイル

- `app/lib/services/prediction-worker.ts` - Worker拡張
- `app/lib/services/enhanced-prediction-service.ts` - 統合サービス

### 期待効果

計算時間 200ms → <100ms

---

## テスト戦略

### 各フェーズのテスト

```typescript
describe('Phase 1: Parameter Optimization', () => {
  it('should use optimized RSI thresholds', () => {});
  it('should apply regime-specific weights', () => {});
});

describe('Phase 2: Pattern Recognition', () => {
  it('should detect candlestick patterns', () => {});
  it('should integrate pattern signal into ensemble', () => {});
});

describe('Phase 3: Web Worker', () => {
  it('should complete prediction within 100ms', () => {});
  it('should cache repeated requests', () => {});
});
```

### バックテスト

過去データでの検証を行い、精度向上を確認。

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| 回帰バグ | 各フェーズでユニットテスト実施 |
| 精度低下 | バックテストで検証、問題あればロールバック |
| Worker エラー | フォールバック処理実装 |

---

## 実装順序

1. Phase 1 → テスト → 検証
2. Phase 2 → テスト → 検証
3. Phase 3 → テスト → 検証
4. 統合テスト
5. 本番デプロイ
