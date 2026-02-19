# AI予測エンジン精度向上設計

## 概要

ULT Trading PlatformのAI予測エンジンの精度を向上させるための設計書。
適応的アンサンブル重みと特徴量エンジニアリング強化を組み合わせたアプローチ。

## 目標

- **優先順位**: 予測精度最優先
- **対象**: 方向性予測、勝率、総合パフォーマンス
- **期待効果**: 方向性精度5-15%向上、勝率3-8%向上

## 現状分析

### 既存の課題

1. **固定アンサンブル重み**: RF: 0.35, XGB: 0.35, LSTM: 0.30で固定
2. **EnhancedPredictionFeatures**: スタブ実装（多くのフィールドが0固定）
3. **特徴量**: 基本的なもののみ（RSI、SMA、モメンタム等）

### 選択したアプローチ

**アプローチA + B**: 適応的アンサンブル重み + 特徴量エンジニアリング強化

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    FeatureCalculationService                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Basic Features  │  │ Enhanced Feat.  │  │ Market Reg. │ │
│  │ (RSI, SMA...)   │  │ (Patterns, etc) │  │ Detection   │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           └────────────────────┼──────────────────┘        │
│                                ▼                            │
│                    PredictionFeatures                        │
└────────────────────────────────┼────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    AdaptiveEnsembleService                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Market Context  │──▶│ Weight Calculator│──▶│ Ensemble    │ │
│  │ Analysis        │  │ (Adaptive)       │  │ Prediction  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. MarketRegimeDetector（新規）

市場レジームを検出し、アンサンブル重みの決定に使用。

```typescript
interface MarketRegime {
  type: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE';
  volatilityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  trendStrength: number;    // 0-100
  momentumQuality: number;  // 0-100
}

class MarketRegimeDetector {
  detect(data: OHLCV[], indicators: TechnicalIndicators): MarketRegime;
}
```

**実装のポイント**:
- ADX（Average Directional Index）でトレンド強度判定
- ATR比率でボラティリティ分類
- 移動平均の配列でトレンド方向判定

### 2. AdaptiveWeightCalculator（新規）

市場レジームに基づいて動的に重みを計算。

```typescript
interface EnsembleWeights {
  RF: number;    // Random Forest
  XGB: number;   // XGBoost
  LSTM: number;  // LSTM
}

class AdaptiveWeightCalculator {
  calculate(regime: MarketRegime): EnsembleWeights;
}
```

**重み戦略**:

| レジーム | RF | XGB | LSTM |
|---------|-----|-----|------|
| トレンド上昇 | 0.30 | 0.40 | 0.30 |
| トレンド下降 | 0.35 | 0.35 | 0.30 |
| レンジ | 0.45 | 0.35 | 0.20 |
| 高ボラティリティ | 0.25 | 0.30 | 0.45 |

### 3. EnhancedFeatureCalculator（拡張）

既存のスタブ実装を実際の計算に置き換え。

```typescript
class EnhancedFeatureCalculator {
  // キャンドルスティックパターン
  detectCandlestickPatterns(data: OHLCV[]): CandlestickPatterns;
  
  // サポート/レジスタンス
  calculateSupportResistance(data: OHLCV[]): PriceLevels;
  
  // ボリューム分析
  analyzeVolumeProfile(data: OHLCV[]): VolumeMetrics;
}
```

**実装パターン**:
- キャンドルパターン: Doji、Hammer、Engulfing等の検出
- S/R: 直近N期間の高値/安値のピーク検出
- ボリューム: OBV、MFI、Volume Trend

## データフロー

```
OHLCV Data
    │
    ▼
┌─────────────────────────────────┐
│ TechnicalIndicatorService       │
│ (RSI, SMA, MACD, ATR, ADX...)   │
└───────────────┬─────────────────┘
                │
    ▼           ▼
┌───────────────┴─────────────────┐
│ FeatureCalculationService       │
│ ├─ Basic: RSI, SMA偏差, etc     │
│ ├─ Enhanced: パターン, S/R, etc │
│ └─ MarketRegime: トレンド検出   │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ AdaptiveWeightCalculator        │
│ MarketRegime → 重みマッピング   │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ PredictionCalculator            │
│ RF + XGB + LSTM → Ensemble      │
│ (動的重みで加重平均)            │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│ ModelPrediction                 │
│ ├─ rfPrediction                 │
│ ├─ xgbPrediction                │
│ ├─ lstmPrediction               │
│ ├─ ensemblePrediction           │
│ ├─ confidence                   │
│ └─ regime (NEW)                 │
└─────────────────────────────────┘
```

## エラー処理・フォールバック

```typescript
class PredictionService {
  predict(features: PredictionFeatures): ModelPrediction {
    try {
      // 1. 市場レジーム検出
      const regime = this.regimeDetector.detect(features);
      
      // 2. 適応的重み計算
      const weights = this.weightCalculator.calculate(regime);
      
      // 3. アンサンブル予測
      return this.calculator.predict(features, weights);
      
    } catch (error) {
      // フォールバック: デフォルト重みで予測
      logger.warn('Prediction fallback', error);
      return this.calculator.predict(features, DEFAULT_WEIGHTS);
    }
  }
}
```

**エラーケース**:

| ケース | 対応 |
|-------|------|
| データ不足 | 基本特徴量のみで計算 |
| レジーム検出失敗 | デフォルト重み（0.35/0.35/0.30）使用 |
| 計算エラー | 直近の有効な予測値を返す |

## テスト戦略

### 単体テスト

- `MarketRegimeDetector`: 各レジームの検出精度
- `AdaptiveWeightCalculator`: 重みの合計=1.0確認、境界値
- `EnhancedFeatureCalculator`: パターン検出の正確性

### 統合テスト

- エンドツーエンドの予測フロー
- フォールバック動作確認

### バックテスト検証

- 改善前後の勝率比較
- 方向性精度の比較
- A/Bテスト用のフラグ制御

```typescript
// A/Bテスト対応
const USE_ADAPTIVE_ENSEMBLE = true; // 設定で切り替え
```

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `services/market-regime-detector.ts` | **新規**: 市場レジーム検出 |
| `services/adaptive-weight-calculator.ts` | **新規**: 動的重み計算 |
| `services/enhanced-feature-calculator.ts` | **新規**: 拡張特徴量計算 |
| `services/implementations/prediction-calculator.ts` | **修正**: 動的重み対応 |
| `services/ml-model-service.ts` | **修正**: 新サービス統合 |
| `types/prediction-types.ts` | **修正**: 型定義追加 |

## 期待効果

- **方向性予測精度**: 5-15%向上
- **勝率**: 3-8%向上
- **高ボラティリティ時の精度改善**: 特に向上

## リスクと軽減策

| リスク | 軽減策 |
|-------|-------|
| 計算コスト増加 | キャッシュ機能で軽減 |
| 過学習リスク | クロスバリデーションで検証 |
| 既存機能への影響 | A/Bテストフラグで段階導入 |

---

作成日: 2026-02-18
ステータス: 承認済み
