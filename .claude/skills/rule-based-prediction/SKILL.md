---
name: rule-based-prediction
description: 個人利用向けの強化ルールベース予測システム構築ガイド。MLモデル不要で高精度な予測を実現するパターン集。
model: auto
---

# 強化ルールベース予測システム スキル

個人開発者向けに、機械学習モデルを使わずに高精度な予測を実現する方法を提供します。

## 適用シナリオ

- 個人での株式/暗号資産取引システム構築
- MLモデルの学習データが不足している場合
- 予測の透明性（説明可能性）が重要な場合
- オフラインで動作させたい場合
- 外部APIへの依存を排除したい場合

## 基本原則

### 1. 決定論的予測

```typescript
// ❌ 避けるべき: ランダム性や不確定要素
const prediction = Math.random() > 0.5 ? 1 : -1;

// ✅ 推奨: 同じ入力は常に同じ出力
const prediction = calculateTechnicalScore(features);
```

### 2. 多層的スコアリング

単一指標に依存せず、複数の指標を統合:

```typescript
interface PredictionFeatures {
  // トレンド指標
  sma5: number;      // 短期移動平均乖離
  sma20: number;     // 中期移動平均乖離
  
  // モメンタム指標
  rsi: number;       // RSI値
  rsiChange: number; // RSI変化率
  priceMomentum: number; // 価格モメンタム
  
  // ボラティリティ指標
  volatility: number; // ボラティリティ
  bollingerPosition: number; // ボリンジャーバンド内位置
  
  // 出来高指標
  volumeRatio: number; // 出来高比率
  
  // シグナル指標
  macdSignal: number; // MACDシグナル
}
```

## 予測エンジン実装パターン

### パターン1: 加重スコアリング（Random Forest風）

```typescript
private predictWeighted(features: PredictionFeatures): number {
  let score = 0;
  const reasons: string[] = [];

  // RSI分析（極端値を重視）
  if (features.rsi < 30) {
    score += 4;
    reasons.push(`RSI極度売られすぎ(${features.rsi.toFixed(1)})`);
  } else if (features.rsi > 70) {
    score -= 4;
    reasons.push(`RSI極度買われすぎ(${features.rsi.toFixed(1)})`);
  }

  // 移動平均トレンド
  if (features.sma5 > 2 && features.sma20 > 1) {
    score += 3;
    reasons.push('強い上昇トレンド');
  } else if (features.sma5 < -2 && features.sma20 < -1) {
    score -= 3;
    reasons.push('強い下降トレンド');
  }

  // MACDシグナル
  if (features.macdSignal > 0.5) {
    score += 1.5;
    reasons.push('MACD買いシグナル');
  }

  // ボリンジャーバンド
  if (features.bollingerPosition < 10) {
    score += 2;
    reasons.push('ボリンジャー下限付近');
  }

  return score;
}
```

**ポイント:**
- 各指標に明確な重みを設定
- 極端な値（RSI<30, >70）に高い重み
- 理由を追跡して説明可能性を確保

### パターン2: ブースティング（XGBoost風）

```typescript
private predictBoosting(features: PredictionFeatures): number {
  const weakLearners = [
    {
      weight: 0.3,
      prediction: (50 - features.rsi) / 10,
      name: 'RSI'
    },
    {
      weight: 0.25,
      prediction: Math.max(-3, Math.min(3, features.priceMomentum / 3)),
      name: 'Momentum'
    },
    {
      weight: 0.25,
      prediction: (features.sma5 * 0.6 + features.sma20 * 0.4) / 5,
      name: 'MA'
    },
    {
      weight: 0.2,
      prediction: features.macdSignal * 2,
      name: 'MACD'
    }
  ];

  // 加重平均
  const totalWeight = weakLearners.reduce((sum, wl) => sum + wl.weight, 0);
  return weakLearners.reduce(
    (sum, wl) => sum + wl.weight * wl.prediction, 
    0
  ) / totalWeight;
}
```

**ポイント:**
- 複数の「弱い学習器」を組み合わせる
- 各学習器は単純なルール
- 重みはバックテストで最適化

### パターン3: 時系列パターン（LSTM風）

```typescript
private predictTimeSeries(data: OHLCV[]): number {
  const prices = data.map(d => d.close).slice(-30);
  let score = 0;

  // 1. 線形トレンド（最小二乗法）
  const n = prices.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const slope = calculateLinearRegressionSlope(xValues, prices);
  
  if (slope > threshold) score += 3;
  else if (slope < -threshold) score -= 3;

  // 2. ボラティリティ収縮/拡張
  const recentVol = calculateVolatility(prices.slice(-10));
  const olderVol = calculateVolatility(prices.slice(-20, -10));
  
  if (olderVol > 0 && recentVol < olderVol * 0.7) {
    // 収縮後のブレイクアウト期待
    const lastPrice = prices[prices.length - 1];
    const avgPrice = average(prices.slice(-5));
    if (lastPrice > avgPrice * 1.01) score += 1.5;
  }

  // 3. サポート/レジスタンス
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = prices[prices.length - 1];
  const position = (currentPrice - minPrice) / (maxPrice - minPrice);
  
  if (position < 0.1) score += 1; // サポート付近
  else if (position > 0.9) score -= 1; // レジスタンス付近

  return score;
}
```

**ポイント:**
- 単純な線形回帰でトレンド検出
- ボラティリティパターンで反転予測
- 価格帯での位置で反発期待

## 信頼度（Confidence）計算

### シグナル整合性アプローチ

```typescript
private calculateConfidence(features: PredictionFeatures, prediction: number): number {
  let confidence = 50; // ベースライン
  let agreementCount = 0;
  let totalSignals = 0;

  // RSI極端値
  if (features.rsi < 30 || features.rsi > 70) {
    confidence += 12;
    agreementCount++;
  }
  totalSignals++;

  // モメンタム
  if (Math.abs(features.priceMomentum) > 5) {
    confidence += 8;
    agreementCount++;
  }
  totalSignals++;

  // 移動平均整合性
  if ((features.sma5 > 0 && features.sma20 > 0 && prediction > 0) ||
      (features.sma5 < 0 && features.sma20 < 0 && prediction < 0)) {
    confidence += 8;
    agreementCount += 2;
  }
  totalSignals += 2;

  // シグナル整合性ボーナス
  const agreementRatio = agreementCount / totalSignals;
  if (agreementRatio > 0.7) {
    confidence += 10; // 高整合性
  } else if (agreementRatio < 0.3) {
    confidence -= 10; // 矛盾
  }

  return Math.min(Math.max(confidence, 50), 95);
}
```

## アンサンブル戦略

### 複数モデルの統合

```typescript
interface ModelPrediction {
  rfPrediction: number;      // 加重スコアリング
  xgbPrediction: number;     // ブースティング
  lstmPrediction: number;    // 時系列パターン
  ensemblePrediction: number;
  confidence: number;
}

private calculateEnsemble(
  rf: number,
  xgb: number,
  lstm: number
): number {
  const weights = {
    RF: 0.4,    // テクニカル分析重視
    XGB: 0.35,  // ブースティング
    LSTM: 0.25  // 時系列パターン
  };

  return rf * weights.RF + xgb * weights.XGB + lstm * weights.LSTM;
}
```

## チューニングガイド

### 1. パラメータ最適化（バックテスト）

```typescript
// グリッドサーチで最適パラメータを探索
const paramGrid = {
  rsiOversold: [20, 25, 30, 35],
  rsiOverbought: [65, 70, 75, 80],
  momentumThreshold: [3, 5, 7, 10],
  volatilityAdjustment: [0.7, 0.8, 0.9, 1.0]
};

// 最適な組み合わせを選択
const bestParams = gridSearch(paramGrid, historicalData);
```

### 2. 閾値調整

```typescript
// シグナル閾値
const BUY_THRESHOLD = 2.0;   // スコアが2以上で買い
const SELL_THRESHOLD = -2.0; // スコアが-2以下で売り
const MIN_CONFIDENCE = 70;   // 最小信頼度70%

// 閾値を厳しくすると勝率上昇、取引回数減少
// 閾値を緩やかにすると取引回数増加、勝率低下
```

### 3. 性能モニタリング

```typescript
interface PerformanceMetrics {
  winRate: number;           // 勝率
  profitFactor: number;      // プロフィットファクター
  averageWin: number;        // 平均利益
  averageLoss: number;       // 平均損失
  sharpeRatio: number;       // リスク調整後リターン
  maxDrawdown: number;       // 最大ドローダウン
}

// 月次でチューニング
if (metrics.winRate < 0.55) {
  // 閾値を調整
  adjustThresholds();
}
```

## 実装チェックリスト

- [ ] フィーチャー抽出メソッド実装
- [ ] 少なくとも3つの予測エンジン実装
- [ ] 理由追跡機能実装
- [ ] 信頼度計算実装
- [ ] アンサンブル統合実装
- [ ] バックテスト用の閾値最適化スクリプト
- [ ] パフォーマンスモニタリング機能
- [ ] 単体テスト（決定論的結果の確認）

## 制限事項と注意点

**このアプローチは以下の場合に適さない:**

1. **高頻度取引（HFT）**: ルールベースでは高速なパターン認識が困難
2. **複雑な非線形関係**: 深いニューラルネットワークが必要な場合
3. **大規模データ**: 数万銘柄をリアルタイム分析する場合

**推奨される使用法:**

- 日中〜数週間のスイングトレード
- 個人ポートフォリオ（10-50銘柄程度）
- 教育・学習目的の予測システム
- MLモデルのベースライン比較用

## サンプル実装

完全な実装例は以下を参照:
- `/trading-platform/app/lib/mlPrediction.ts`
- `randomForestPredict()` メソッド
- `xgboostPredict()` メソッド
- `lstmPredict()` メソッド

## 参考実装

```typescript
// 実際の使用例
const service = new EnhancedRuleBasedPredictionService();

const features = {
  rsi: 25,              // 売られすぎ
  rsiChange: 3,         // RSI上昇中
  sma5: 2.5,            // 短期上昇
  sma20: 1.5,           // 中期上昇
  priceMomentum: 6,     // 強いモメンタム
  macdSignal: 0.8,      // MACD買いシグナル
  bollingerPosition: 15, // 下限付近
  volatility: 25,       // 適度なボラティリティ
  volumeRatio: 2.5      // 出来高増加
};

const prediction = service.predict(features);
// 結果: { score: 8.5, confidence: 85, reasons: [...] }
```

## まとめ

強化ルールベース予測の利点:
- ✅ 完全無料・無制限
- ✅ オフライン動作
- ✅ 予測理由が明確
- ✅ 再現性100%
- ✅ チューニング容易

欠点:
- ❌ 複雑なパターン認識に限界
- ❌ 高頻度取引には不向き
- ❌ 勝率の上限（通常55-65%）

**個人利用での株式取引には十分実用的です。**
