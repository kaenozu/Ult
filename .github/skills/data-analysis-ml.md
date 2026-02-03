# Data Analysis & ML Agent

## Purpose
データ分析、機械学習モデルの開発、予測システムの最適化を専門とするエージェント。

## Capabilities
- 金融データの分析と特徴量エンジニアリング
- 機械学習モデルの開発・訓練・評価
- 予測精度の監視と改善
- バックテストとストレステスト
- ポートフォリオ最適化

## Data Analysis Pipeline

### Data Collection & Cleaning
```typescript
// lib/data-collector.ts
class DataCollector {
  async collectHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<OHLCV[]> {
    const data = await this.fetchFromAPI(symbol, startDate, endDate);
    
    // データクレンジング
    const cleaned = this.cleanData(data);
    
    // 外れ値検出と処理
    const outliers = this.detectOutliers(cleaned);
    const processed = this.handleOutliers(cleaned, outliers);
    
    return processed;
  }

  private cleanData(data: OHLCV[]): OHLCV[] {
    return data
      .filter(d => d.volume > 0) // 出来高ゼロを除外
      .filter(d => d.open > 0 && d.close > 0) // 無効価格を除外
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // 日付順
  }

  private detectOutliers(data: OHLCV[]): number[] {
    const prices = data.map(d => d.close);
    const q1 = this.percentile(prices, 0.25);
    const q3 = this.percentile(prices, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data
      .map((d, i) => (d.close < lowerBound || d.close > upperBound) ? i : -1)
      .filter(i => i !== -1);
  }
}
```

### Feature Engineering
```typescript
// lib/feature-engineering.ts
class FeatureEngineer {
  generateFeatures(data: OHLCV[]): FeatureSet[] {
    const features: FeatureSet[] = [];
    
    for (let i = 50; i < data.length; i++) {
      const window = data.slice(0, i + 1);
      
      const technical = this.calculateTechnicalIndicators(window);
      const market = this.calculateMarketFeatures(window);
      const temporal = this.calculateTemporalFeatures(window);
      
      features.push({
        date: data[i].date,
        ...technical,
        ...market,
        ...temporal
      });
    }
    
    return features;
  }

  private calculateTechnicalIndicators(data: OHLCV[]): TechnicalFeatures {
    return {
      rsi: this.calculateRSI(data, 14),
      sma5: this.calculateSMA(data, 5),
      sma20: this.calculateSMA(data, 20),
      sma50: this.calculateSMA(data, 50),
      ema12: this.calculateEMA(data, 12),
      ema26: this.calculateEMA(data, 26),
      macd: this.calculateMACD(data),
      bollinger: this.calculateBollingerBands(data, 20),
      atr: this.calculateATR(data, 14),
      adx: this.calculateADX(data, 14),
      stochastic: this.calculateStochastic(data, 14)
    };
  }

  private calculateMarketFeatures(data: OHLCV[]): MarketFeatures {
    const recent = data.slice(-20);
    const volume = recent.map(d => d.volume);
    
    return {
      volumeRatio: volume[volume.length - 1] / (volume.reduce((a, b) => a + b, 0) / volume.length),
      priceMomentum: this.calculateMomentum(data, 5),
      volatility: this.calculateVolatility(data, 20),
      marketSentiment: this.calculateSentiment(recent)
    };
  }
}
```

## Machine Learning Models

### Model Architecture
```typescript
// models/prediction-model.ts
import * as tf from '@tensorflow/tfjs';

class PredictionModel {
  private model: tf.Sequential;
  private scaler: FeatureScaler;
  
  constructor() {
    this.model = this.buildModel();
    this.scaler = new FeatureScaler();
  }

  private buildModel(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 128, activation: 'relu', inputShape: [20] }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });

    return model;
  }

  async train(features: number[][], labels: number[]): Promise<TrainingHistory> {
    // 特徴量の正規化
    const normalizedFeatures = this.scaler.fitTransform(features);
    
    // データ分割
    const { trainX, trainY, testX, testY } = this.splitData(normalizedFeatures, labels);
    
    // モデル訓練
    const history = await this.model.fit(
      tf.tensor2d(trainX),
      tf.tensor1d(trainY),
      {
        epochs: 100,
        batchSize: 32,
        validationData: [tf.tensor2d(testX), tf.tensor1d(testY)],
        callbacks: [
          tf.callbacks.earlyStopping({ monitor: 'val_loss', patience: 10 }),
          tf.callbacks.modelCheckpoint({ 
            filepath: './model-checkpoints/model-{epoch}.h5',
            monitor: 'val_accuracy',
            saveBestOnly: true 
          })
        ]
      }
    );

    return history;
  }

  predict(features: number[]): Prediction {
    const normalized = this.scaler.transform([features]);
    const prediction = this.model.predict(tf.tensor2d(normalized)) as tf.Tensor;
    const probability = prediction.dataSync()[0];
    
    return {
      probability,
      prediction: probability > 0.5 ? 1 : 0,
      confidence: Math.abs(probability - 0.5) * 2
    };
  }
}
```

### Ensemble Models
```typescript
// models/ensemble-predictor.ts
class EnsemblePredictor {
  private models: PredictionModel[];
  private weights: number[];

  constructor(models: PredictionModel[], weights: number[]) {
    this.models = models;
    this.weights = weights;
  }

  predict(features: number[]): EnsemblePrediction {
    const predictions = this.models.map(model => model.predict(features));
    
    // 重み付け平均
    const weightedProbability = predictions.reduce((sum, pred, i) => 
      sum + pred.probability * this.weights[i], 0) / this.weights.reduce((a, b) => a + b, 0);
    
    // バギングアンサンブル
    const majorityVote = this.majorityVote(predictions.map(p => p.prediction));
    
    // 不確実性評価
    const uncertainty = this.calculateUncertainty(predictions);
    
    return {
      ensemblePrediction: weightedProbability > 0.5 ? 1 : 0,
      probability: weightedProbability,
      confidence: this.calculateConfidence(predictions),
      individualPredictions: predictions,
      majorityVote,
      uncertainty,
      recommendation: this.generateRecommendation(weightedProbability, uncertainty)
    };
  }

  private calculateUncertainty(predictions: Prediction[]): number {
    const probabilities = predictions.map(p => p.probability);
    const mean = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
    const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probabilities.length;
    return Math.sqrt(variance);
  }
}
```

## Backtesting & Validation

### Walk-Forward Analysis
```typescript
// lib/walk-forward-analysis.ts
class WalkForwardAnalysis {
  async runAnalysis(
    data: OHLCV[],
    model: PredictionModel,
    config: WalkForwardConfig
  ): Promise<WalkForwardResult> {
    const results: WindowResult[] = [];
    
    for (let i = 0; i + config.trainWindow + config.testWindow < data.length; i += config.stepSize) {
      const trainData = data.slice(i, i + config.trainWindow);
      const testData = data.slice(i + config.trainWindow, i + config.trainWindow + config.testWindow);
      
      // 訓練
      const features = this.extractFeatures(trainData);
      await model.train(features);
      
      // テスト
      const testFeatures = this.extractFeatures(testData);
      const predictions = testFeatures.map(f => model.predict(f));
      const actuals = this.getActualReturns(testData);
      
      // 評価
      const metrics = this.evaluatePredictions(predictions, actuals);
      
      results.push({
        trainWindow: [i, i + config.trainWindow],
        testWindow: [i + config.trainWindow, i + config.trainWindow + config.testWindow],
        metrics,
        predictions,
        actuals
      });
    }
    
    return this.aggregateResults(results);
  }

  private evaluatePredictions(predictions: Prediction[], actuals: number[]): Metrics {
    const truePositives = predictions.filter((p, i) => p.prediction === 1 && actuals[i] > 0).length;
    const falsePositives = predictions.filter((p, i) => p.prediction === 1 && actuals[i] <= 0).length;
    const trueNegatives = predictions.filter((p, i) => p.prediction === 0 && actuals[i] <= 0).length;
    const falseNegatives = predictions.filter((p, i) => p.prediction === 0 && actuals[i] > 0).length;
    
    return {
      accuracy: (truePositives + trueNegatives) / predictions.length,
      precision: truePositives / (truePositives + falsePositives),
      recall: truePositives / (truePositives + falseNegatives),
      f1Score: 2 * truePositives / (2 * truePositives + falsePositives + falseNegatives),
      profitLoss: this.calculateProfitLoss(predictions, actuals),
      maxDrawdown: this.calculateMaxDrawdown(predictions, actuals),
      sharpeRatio: this.calculateSharpeRatio(predictions, actuals)
    };
  }
}
```

### Risk Management
```typescript
// lib/risk-manager.ts
class RiskManager {
  calculatePositionSize(
    prediction: Prediction,
    accountValue: number,
    riskPerTrade: number,
    atr: number
  ): PositionSize {
    const confidence = prediction.confidence;
    const adjustedRisk = riskPerTrade * confidence;
    
    // ケリー基準
    const kellyFraction = this.calculateKellyCriterion(prediction);
    const riskAdjustedKelly = Math.min(kellyFraction, adjustedRisk);
    
    // ATRベースのポジションサイジング
    const atrRisk = (2 * atr) / prediction.currentPrice;
    const atrBasedSize = (accountValue * riskAdjustedKelly) / (atrRisk * prediction.currentPrice);
    
    return {
      shares: Math.floor(atrBasedSize),
      value: atrBasedSize * prediction.currentPrice,
      riskAmount: accountValue * riskAdjustedKelly,
      stopLoss: prediction.currentPrice - (2 * atr),
      takeProfit: prediction.currentPrice + (3 * atr)
    };
  }

  private calculateKellyCriterion(prediction: Prediction): number {
    const winRate = 0.55; // 過去の実績から
    const avgWin = 0.05; // 5%
    const avgLoss = 0.03; // 3%
    
    const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    return Math.max(0, Math.min(kelly, 0.25)); // 最大25%
  }

  assessPortfolioRisk(positions: Position[]): RiskAssessment {
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    const correlations = this.calculateCorrelationMatrix(positions);
    
    return {
      totalExposure: totalValue,
      concentrationRisk: this.calculateConcentrationRisk(positions, totalValue),
      correlationRisk: this.calculateCorrelationRisk(correlations),
      var95: this.calculateVaR(positions, 0.05),
      expectedShortfall: this.calculateExpectedShortfall(positions, 0.05),
      stressTestResults: this.runStressTests(positions)
    };
  }
}
```

## Model Monitoring

### Performance Tracking
```typescript
// lib/model-monitor.ts
class ModelMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  trackPrediction(symbol: string, prediction: Prediction, actual: number): void {
    const accuracy = Math.abs(prediction.probability - actual) < 0.5 ? 1 : 0;
    
    if (!this.metrics.has(symbol)) {
      this.metrics.set(symbol, []);
    }
    
    this.metrics.get(symbol)!.push(accuracy);
  }

  getModelHealth(symbol: string): ModelHealth {
    const accuracies = this.metrics.get(symbol) || [];
    
    return {
      accuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
      predictionCount: accuracies.length,
      recentAccuracy: accuracies.slice(-100).reduce((a, b) => a + b, 0) / Math.min(100, accuracies.length),
      trend: this.calculateAccuracyTrend(accuracies),
      needsRetraining: this.shouldRetrain(symbol, accuracies)
    };
  }

  private shouldRetrain(symbol: string, accuracies: number[]): boolean {
    if (accuracies.length < 100) return false;
    
    const recent = accuracies.slice(-20);
    const historical = accuracies.slice(-100, -20);
    
    const recentAccuracy = recent.reduce((a, b) => a + b, 0) / recent.length;
    const historicalAccuracy = historical.reduce((a, b) => a + b, 0) / historical.length;
    
    return recentAccuracy < historicalAccuracy * 0.95; // 5%以上低下
  }
}
```

## Automated Model Training

### Training Pipeline
```typescript
// lib/training-pipeline.ts
class TrainingPipeline {
  async runAutomatedTraining(): Promise<void> {
    const symbols = await this.getActiveSymbols();
    
    for (const symbol of symbols) {
      try {
        await this.trainSymbolModel(symbol);
      } catch (error) {
        console.error(`Failed to train model for ${symbol}:`, error);
        await this.notifyTrainingFailure(symbol, error);
      }
    }
  }

  private async trainSymbolModel(symbol: string): Promise<void> {
    // データ収集
    const data = await this.collectTrainingData(symbol);
    
    // 特徴量生成
    const features = this.generateFeatures(data);
    
    // 複数モデル訓練
    const models = await this.trainMultipleModels(features);
    
    // アンサンブル作成
    const ensemble = this.createEnsemble(models);
    
    // 評価
    const evaluation = await this.evaluateModel(ensemble, data);
    
    // デプロイ
    if (evaluation.accuracy > this.getDeploymentThreshold()) {
      await this.deployModel(symbol, ensemble);
      await this.logTrainingSuccess(symbol, evaluation);
    } else {
      await this.notifyLowPerformance(symbol, evaluation);
    }
  }
}
```

## Usage Examples

### Basic Prediction
```typescript
// 使用例: 株価予測
const predictor = new PredictionModel();
const data = await collectStockData('AAPL', '2023-01-01', '2024-01-01');
const features = extractFeatures(data);
const prediction = await predictor.predict(features[features.length - 1]);

console.log(`AAPL予測: ${prediction.prediction > 0.5 ? '上昇' : '下落'}`);
console.log(`確信度: ${(prediction.confidence * 100).toFixed(1)}%`);
```

### Portfolio Optimization
```typescript
// 使用例: ポートフォリオ最適化
const optimizer = new PortfolioOptimizer();
const portfolio = [
  { symbol: 'AAPL', weight: 0.3 },
  { symbol: 'GOOGL', weight: 0.3 },
  { symbol: 'MSFT', weight: 0.2 },
  { symbol: 'TSLA', weight: 0.2 }
];

const optimized = await optimizer.optimize(portfolio, {
  riskTolerance: 0.15,
  expectedReturn: 0.12,
  constraints: { maxWeight: 0.4, minDiversification: 3 }
});

console.log('最適化ポートフォリオ:', optimized);
```

このエージェントはデータ分析から機械学習モデル開発、運用・監視までの一連のプロセスを支援します。