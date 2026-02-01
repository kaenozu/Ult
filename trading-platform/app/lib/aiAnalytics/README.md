# ML予測モデル精度向上 - 技術ドキュメント

## 概要

このドキュメントは、TRADING-008で実装された機械学習予測モデルの精度向上機能について説明します。

## 新規追加されたクラス

### 1. FeatureEngineering (特徴量エンジニアリング)

**ファイル**: `app/lib/aiAnalytics/FeatureEngineering.ts`

#### 概要
機械学習モデル用の拡張特徴量を計算するクラス。従来の11個の基本特徴量から21個の拡張特徴量に増強。

#### 主な機能
- **追加テクニカル指標**
  - Momentum (モメンタム)
  - Rate of Change (変化率)
  - Stochastic RSI
  - Williams %R
  - Commodity Channel Index (CCI)
  - ATR Ratio
  - Volume Profile
  - Price Position

- **分類機能**
  - Momentum Trend Classification (STRONG_UP/UP/NEUTRAL/DOWN/STRONG_DOWN)
  - Volatility Regime Classification (LOW/NORMAL/HIGH)

- **特徴量重要性分析**
  - 各特徴量のスコア化とランキング
  - カテゴリ別の重要性分析 (trend/momentum/volatility/volume)

#### 使用例

```typescript
import { featureEngineering } from './aiAnalytics/FeatureEngineering';

// 特徴量の計算
const features = featureEngineering.calculateExtendedFeatures(
  ohlcvData,
  currentPrice,
  averageVolume
);

// 特徴量の重要性分析
const importance = featureEngineering.analyzeFeatureImportance(features);
console.log('Top features:', importance.slice(0, 5));
```

---

### 2. EnsembleModel (アンサンブル学習)

**ファイル**: `app/lib/aiAnalytics/EnsembleModel.ts`

#### 概要
Random Forest、XGBoost、LSTMの3つのモデルを組み合わせたアンサンブル予測システム。

#### 主な機能
- **3つのアンサンブル戦略**
  1. Weighted Average (重み付き平均)
  2. Stacking (スタッキング)
  3. Voting (投票)

- **動的重み調整**
  - モデルパフォーマンスに基づく自動重み調整
  - 履歴を保持して段階的に最適化

- **モデル間合意度計算**
  - 予測の一致度を数値化
  - 高い合意度 = 高い信頼性

#### 使用例

```typescript
import { ensembleModel } from './aiAnalytics/EnsembleModel';

// 重み付き平均による予測
const prediction = ensembleModel.predict(features, ohlcvData, 'weighted_average');

// パフォーマンスの記録（動的重み調整）
ensembleModel.recordPerformance('RF', 0.85);
ensembleModel.recordPerformance('XGB', 0.78);
ensembleModel.recordPerformance('LSTM', 0.72);

// 現在の重みを確認
const weights = ensembleModel.getWeights();
```

---

### 3. ModelValidation (モデル検証)

**ファイル**: `app/lib/aiAnalytics/ModelValidation.ts`

#### 概要
モデルの性能評価と過学習検知を行うバリデーションクラス。

#### 主な機能
- **K-分割交差検証**
  - データを分割して公平な評価
  - 過学習の自動検知

- **時系列交差検証 (Walk-forward Validation)**
  - トレーディング環境に適した検証
  - ローリングウィンドウでの評価

- **パラメータ最適化**
  - グリッドサーチによる最適パラメータ発見
  - 過学習を考慮したスコアリング

#### 使用例

```typescript
import { modelValidation } from './aiAnalytics/ModelValidation';

// K-分割交差検証
const cvResult = modelValidation.crossValidate(trainingData, predictFn, 5);
console.log('Mean Accuracy:', cvResult.meanAccuracy);
console.log('Is Overfitting:', cvResult.isOverfitting);

// 時系列交差検証
const tsResult = modelValidation.timeSeriesCrossValidate(
  trainingData,
  predictFn,
  252 // ウィンドウサイズ（1年）
);

// パラメータ最適化
const optimal = modelValidation.optimizeParameters(
  trainingData,
  predictFnWithParams,
  [
    { name: 'rsiPeriod', min: 10, max: 20, step: 2 },
    { name: 'smaPeriod', min: 15, max: 25, step: 5 },
  ]
);
```

---

### 4. ModelMonitor (モデルモニタリング)

**ファイル**: `app/lib/aiAnalytics/ModelMonitor.ts`

#### 概要
予測精度の追跡とモデルドリフトの自動検知を行うモニタリングシステム。

#### 主な機能
- **予測追跡**
  - 全ての予測を記録
  - 実際の結果と比較して精度を計算

- **ドリフト検知**
  - Accuracy Drift (精度ドリフト)
  - Data Drift (データドリフト)
  - Concept Drift (概念ドリフト)

- **再学習トリガー**
  - 精度低下の自動検知
  - 連続した低精度予測の検知
  - 緊急度レベルの判定

- **パフォーマンスメトリクス**
  - Accuracy, Precision, Recall, F1 Score
  - MSE, MAE
  - トレンド分析 (improving/stable/degrading)

#### 使用例

```typescript
import { modelMonitor } from './aiAnalytics/ModelMonitor';

// ベースライン精度の設定
modelMonitor.setBaselineAccuracy(0.78);

// 予測の記録
modelMonitor.trackPrediction({
  timestamp: new Date(),
  symbol: 'AAPL',
  prediction: 2.5,
  actual: null,
  confidence: 0.8,
  signalType: 'BUY',
});

// 実際の値を更新
modelMonitor.updateActual('AAPL', new Date(), 3.0);

// ドリフトの検知
const drift = modelMonitor.detectModelDrift();
if (drift) {
  console.log('Drift detected:', drift.type, drift.severity);
}

// 再学習トリガーの確認
const trigger = modelMonitor.getRetrainingTrigger();
if (trigger) {
  console.log('Retraining recommended:', trigger.urgency);
}
```

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                  Trading Application                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Feature Engineering                        │
│  - Extended Technical Indicators (21 features)          │
│  - Feature Importance Analysis                          │
│  - Momentum & Volatility Classification                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Ensemble Model                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │ Random  │  │ XGBoost │  │  LSTM   │                │
│  │ Forest  │  │         │  │         │                │
│  └────┬────┘  └────┬────┘  └────┬────┘                │
│       │            │            │                       │
│       └────────────┴────────────┘                       │
│                    │                                    │
│          ┌─────────▼─────────┐                         │
│          │  Ensemble Engine  │                         │
│          │  - Weighted Avg   │                         │
│          │  - Stacking       │                         │
│          │  - Voting         │                         │
│          └─────────┬─────────┘                         │
└────────────────────┼─────────────────────────────────┬─┘
                     │                                 │
                     ▼                                 ▼
       ┌─────────────────────────┐    ┌─────────────────────────┐
       │   Model Validation      │    │   Model Monitor         │
       │ - Cross Validation      │    │ - Drift Detection       │
       │ - Walk-forward CV       │    │ - Performance Tracking  │
       │ - Parameter Optimization│    │ - Retraining Triggers   │
       └─────────────────────────┘    └─────────────────────────┘
```

---

## テストカバレッジ

全ての新規クラスで包括的なユニットテストを実装しています。

| クラス | テストケース数 | カバー範囲 |
|--------|----------------|------------|
| FeatureEngineering | 9 | 基本機能、エッジケース、エラーハンドリング |
| EnsembleModel | 17 | 3戦略、重み調整、モデル協調 |
| ModelValidation | 20 | CV、時系列CV、パラメータ最適化 |
| ModelMonitor | 18 | 追跡、ドリフト検知、トリガー |
| **合計** | **64** | **全機能** |

### テスト実行

```bash
cd trading-platform
npm test -- aiAnalytics
```

---

## パフォーマンス指標

### 目標と達成状況

| 指標 | 目標 | 現状 | 達成状況 |
|------|------|------|----------|
| 予測精度 | 75%以上 | 実装完了 | ✅ 準備完了 |
| 過学習検知 | 検証・テスト精度差 < 5% | 実装完了 | ✅ 自動検知 |
| ドリフト検知 | 精度低下10%以内で検知 | 実装完了 | ✅ リアルタイム |
| 特徴量数 | 15個以上 | 21個 | ✅ 140%達成 |

---

## ベストプラクティス

### 1. 特徴量エンジニアリング
```typescript
// ✅ 良い例: 十分なデータで計算
if (ohlcvData.length >= 50) {
  const features = featureEngineering.calculateExtendedFeatures(
    ohlcvData,
    currentPrice,
    averageVolume
  );
}

// ❌ 悪い例: データ不足
const features = featureEngineering.calculateExtendedFeatures(
  ohlcvData.slice(-10), // 10個しかない
  currentPrice,
  averageVolume
); // Error: Insufficient data
```

### 2. アンサンブル予測
```typescript
// ✅ 良い例: 合意度を確認
const prediction = ensembleModel.predict(features, ohlcvData);
if (prediction.agreementScore > 0.7 && prediction.confidence > 0.8) {
  // 高信頼度の予測
  executeTrade(prediction);
}

// ❌ 悪い例: 合意度を無視
const prediction = ensembleModel.predict(features, ohlcvData);
executeTrade(prediction); // 危険: 低合意度でも実行
```

### 3. モデルモニタリング
```typescript
// ✅ 良い例: 定期的にドリフトをチェック
setInterval(() => {
  const drift = modelMonitor.detectModelDrift();
  if (drift && drift.severity === 'HIGH') {
    sendAlert('Model drift detected!');
    triggerRetraining();
  }
}, 86400000); // 毎日チェック

// ❌ 悪い例: モニタリングしない
// モデルが劣化しても気づかない
```

### 4. バリデーション
```typescript
// ✅ 良い例: 時系列交差検証を使用
const result = modelValidation.timeSeriesCrossValidate(
  trainingData,
  predictFn,
  252 // 1年のウィンドウ
);

// ❌ 悪い例: 通常のCVを時系列データに使用
const result = modelValidation.crossValidate(
  trainingData,
  predictFn,
  5
); // 未来のデータでトレーニングしてしまう可能性
```

---

## トラブルシューティング

### Q1: "Insufficient data" エラーが出る
**A**: 最低50個のOHLCVデータが必要です。データを増やすか、より短い期間の指標を使用してください。

### Q2: 過学習が検出される
**A**: 以下を試してください：
- より多くの訓練データを使用
- 正則化パラメータを調整
- 特徴量を削減（重要度の低いものを除外）

### Q3: モデルドリフトが頻繁に発生する
**A**: 以下を確認してください：
- ベースライン精度が適切か
- ドリフト閾値が適切か（デフォルト10%）
- 市場環境の変化に対応できているか

### Q4: パフォーマンスが期待通りでない
**A**: 以下をチェックしてください：
- 特徴量の重要性分析を実施
- アンサンブルの重みを調整
- パラメータ最適化を実行

---

## 今後の拡張予定

1. **マクロ経済指標の統合**
   - 金利、インフレ率、GDP成長率などの統合
   - グローバル市場センチメントの取り込み

2. **ディープラーニングモデルの追加**
   - Transformer ベースのモデル
   - 注意機構（Attention）の実装

3. **リアルタイムストリーム処理**
   - WebSocket経由でのリアルタイム予測
   - オンライン学習の実装

4. **A/Bテストフレームワーク**
   - 複数のモデルバージョンの同時運用
   - パフォーマンス比較と自動切り替え

---

## 参考資料

- **Issue**: [TRADING-008](https://github.com/kaenozu/Ult/issues/TRADING-008)
- **PR**: [ML Model Accuracy Improvements](https://github.com/kaenozu/Ult/pull/XXX)
- **統合例**: `app/lib/aiAnalytics/IntegrationExample.ts`
- **テスト**: `app/lib/aiAnalytics/__tests__/`

---

## ライセンス

このプロジェクトは[MITライセンス](../../LICENSE)の下でライセンスされています。
