# TensorFlow.js ML Models - Usage Guide

このドキュメントでは、新しいTensorFlow.jsベースのMLモデルの使用方法を説明します。

## 概要

従来のスコアリングベースの予測システムから、実際のTensorFlow.jsニューラルネットワークに置き換えました。

### 利用可能なモデル

1. **FeedForward Neural Network** - Random Forestの代替
2. **GRU (Gated Recurrent Unit)** - XGBoostの代替、LSTMより軽量
3. **LSTM (Long Short-Term Memory)** - 時系列予測用

## 基本的な使用方法

### 1. ルールベース予測（デフォルト）

```typescript
import { mlModelService } from '@/app/lib/services/ml-model-service';
import { PredictionFeatures } from '@/app/lib/services/feature-calculation-service';

// 特徴量を準備
const features: PredictionFeatures = {
  rsi: 45,
  rsiChange: -2,
  sma5: 1.5,
  sma20: 0.8,
  sma50: 0.3,
  priceMomentum: 2.5,
  volumeRatio: 1.2,
  volatility: 0.025,
  macdSignal: 1.0,
  bollingerPosition: 55,
  atrPercent: 2.2
};

// 同期的に予測（ルールベース）
const prediction = mlModelService.predict(features);
console.log('Prediction:', prediction);
// {
//   rfPrediction: 2.4,
//   xgbPrediction: 2.1,
//   lstmPrediction: 1.5,
//   ensemblePrediction: 2.05,
//   confidence: 65
// }
```

### 2. TensorFlow.jsモデルの訓練

```typescript
import { mlModelService } from '@/app/lib/services/ml-model-service';
import { ModelTrainingData } from '@/app/lib/services/tensorflow-model-service';

// 訓練データを準備
const trainingData: ModelTrainingData = {
  features: [
    [0.45, 0.02, 0.015, 0.008, 0.003, 0.25, 1.2, 0.025, 0.1, 0.55, 0.22],
    [0.48, 0.03, 0.018, 0.010, 0.005, 0.30, 1.3, 0.028, 0.15, 0.58, 0.24],
    // ... 100以上のサンプルを推奨
  ],
  labels: [
    1.5,  // 次の価格変動率（例: +1.5%）
    2.1,
    // ...
  ]
};

// モデルを訓練（5-50エポック推奨）
const metrics = await mlModelService.trainModels(trainingData, 20);

console.log('Training completed:');
console.log('FeedForward - MAE:', metrics.ff.mae, 'Accuracy:', metrics.ff.accuracy);
console.log('GRU - MAE:', metrics.gru.mae, 'Accuracy:', metrics.gru.accuracy);
console.log('LSTM - MAE:', metrics.lstm.mae, 'Accuracy:', metrics.lstm.accuracy);

// モデルを保存（ブラウザのlocalStorageに保存）
await mlModelService.saveModels();
```

### 3. TensorFlow.jsモデルで予測

```typescript
// モデルを読み込み（以前に保存済みの場合）
await mlModelService.loadModels();

// TensorFlow.jsモデルが有効か確認
if (mlModelService.isTensorFlowEnabled()) {
  console.log('TensorFlow.js models are active');
  
  // 非同期予測を実行
  const prediction = await mlModelService.predictAsync(features);
  console.log('TensorFlow Prediction:', prediction);
  
  // モデルのメトリクスを取得
  const metrics = mlModelService.getModelMetrics();
  console.log('Current model performance:', metrics);
} else {
  console.log('Using rule-based predictions');
}
```

## 実践例：履歴データからの学習

```typescript
import { OHLCV } from '@/app/lib/types';
import { featuresToArray } from '@/app/lib/services/tensorflow-model-service';
import { featureCalculationService } from '@/app/lib/services/feature-calculation-service';

/**
 * 履歴データから訓練データセットを作成
 */
async function prepareTrainingDataFromHistory(
  historicalData: OHLCV[],
  indicators: TechnicalIndicator[]
): Promise<ModelTrainingData> {
  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = 0; i < historicalData.length - 1; i++) {
    // 特徴量を計算
    const predFeatures = featureCalculationService.calculateFeatures(
      historicalData.slice(0, i + 1),
      indicators[i]
    );
    
    // 特徴量を配列に変換
    const featureArray = featuresToArray(predFeatures);
    features.push(featureArray);
    
    // ラベル: 次の日の価格変動率
    const currentPrice = historicalData[i].close;
    const nextPrice = historicalData[i + 1].close;
    const priceChange = ((nextPrice - currentPrice) / currentPrice) * 100;
    labels.push(priceChange);
  }

  return { features, labels };
}

// 使用例
const historicalData = await fetchHistoricalData('^N225', 200); // 200日分のデータ
const indicators = await calculateIndicators(historicalData);
const trainingData = await prepareTrainingDataFromHistory(historicalData, indicators);

// モデルを訓練
const metrics = await mlModelService.trainModels(trainingData, 30);
await mlModelService.saveModels();

console.log('Models trained and saved!');
console.log('Average accuracy:', 
  (metrics.ff.accuracy + metrics.gru.accuracy + metrics.lstm.accuracy) / 3
);
```

## モデルの再訓練

市場状況の変化に対応するため、定期的にモデルを再訓練することを推奨します。

```typescript
/**
 * 毎週末にモデルを再訓練
 */
async function weeklyRetraining() {
  // 最新の履歴データを取得
  const data = await fetchRecentData(100); // 直近100日
  const trainingData = await prepareTrainingDataFromHistory(data);
  
  // 再訓練（エポック数を減らして高速化）
  const metrics = await mlModelService.trainModels(trainingData, 10);
  
  // 精度が一定以上なら保存
  const avgAccuracy = (metrics.ff.accuracy + metrics.gru.accuracy + metrics.lstm.accuracy) / 3;
  if (avgAccuracy > 60) {
    await mlModelService.saveModels();
    console.log('Models retrained successfully. Accuracy:', avgAccuracy);
  } else {
    console.warn('Retraining accuracy too low:', avgAccuracy);
  }
}
```

## パフォーマンス最適化

### バッチ予測

```typescript
/**
 * 複数の予測を効率的に実行
 */
async function batchPredict(featuresArray: PredictionFeatures[]) {
  const predictions = await Promise.all(
    featuresArray.map(features => mlModelService.predictAsync(features))
  );
  return predictions;
}
```

### メモリ管理

TensorFlow.jsはメモリリークを避けるため、不要なテンソルを適切に破棄する必要があります。
サービスは自動的にメモリ管理を行いますが、大量の予測を行う場合は注意が必要です。

```typescript
// 定期的にメモリをクリーンアップ
import * as tf from '@tensorflow/tfjs';

setInterval(() => {
  const memoryInfo = tf.memory();
  console.log('TensorFlow.js memory:', memoryInfo);
  
  // メモリ使用量が多い場合は警告
  if (memoryInfo.numTensors > 1000) {
    console.warn('High tensor count detected. Consider model reload.');
  }
}, 60000); // 1分ごと
```

## トラブルシューティング

### モデルが訓練できない

```typescript
// エラーハンドリング
try {
  await mlModelService.trainModels(trainingData, 20);
} catch (error) {
  console.error('Training failed:', error);
  // フォールバックとしてルールベース予測を使用
  const prediction = mlModelService.predict(features);
}
```

### 予測精度が低い

1. **訓練データ量を増やす**: 最低100サンプル、推奨は500以上
2. **エポック数を調整**: 20-50エポックを試す
3. **特徴量を見直す**: より予測力のある指標を追加
4. **データの正規化を確認**: 極端な値がないか確認

### モデルの保存/読み込みエラー

```typescript
// モデルの存在確認
try {
  await mlModelService.loadModels();
  console.log('Models loaded successfully');
} catch (error) {
  console.log('No saved models found, training new models...');
  const trainingData = await prepareTrainingData();
  await mlModelService.trainModels(trainingData, 20);
  await mlModelService.saveModels();
}
```

## ベストプラクティス

1. **十分な訓練データ**: 最低100サンプル、推奨500以上
2. **定期的な再訓練**: 週次または月次で再訓練
3. **モデル評価**: 精度が60%以下の場合は再訓練を検討
4. **フォールバック**: TensorFlowモデルが使えない場合のルールベース予測
5. **メモリ管理**: 大量予測時はバッチ処理とメモリ監視

## API リファレンス

### MLModelService

#### `predict(features: PredictionFeatures): ModelPrediction`
同期的にルールベース予測を実行

#### `predictAsync(features: PredictionFeatures): Promise<ModelPrediction>`
非同期でTensorFlow.js予測を実行（訓練済みの場合）

#### `trainModels(data: ModelTrainingData, epochs: number): Promise<ModelMetrics>`
全てのモデルを訓練

#### `saveModels(): Promise<void>`
訓練済みモデルをlocalStorageに保存

#### `loadModels(): Promise<void>`
保存済みモデルを読み込み

#### `isTensorFlowEnabled(): boolean`
TensorFlow.jsモデルが有効かチェック

#### `getModelMetrics(): { ff?: ModelMetrics; gru?: ModelMetrics; lstm?: ModelMetrics }`
現在のモデルメトリクスを取得

### ModelMetrics

```typescript
interface ModelMetrics {
  mae: number;      // Mean Absolute Error
  rmse: number;     // Root Mean Squared Error
  accuracy: number; // Directional accuracy (0-100%)
}
```

## まとめ

新しいTensorFlow.jsモデルは、従来のルールベース予測より高い精度と適応性を提供します。
適切に訓練・評価することで、予測精度を65-70%から80%以上に改善できることが期待されます。
