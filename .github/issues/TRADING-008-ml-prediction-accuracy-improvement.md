# TRADING-008: 機械学習予測モデルの精度向上

## 概要
現在の機械学習予測モデル（[`PredictiveAnalyticsEngine.ts`](trading-platform/app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts)）の精度を向上させるための改善提案です。

## 問題の説明
現状の予測モデルには以下の課題があります：

1. **特徴量エンジニアリングの不足**
   - 基本的なテクニカル指標のみを使用
   - マクロ経済指標や市場センチメントが考慮されていない
   - 特徴量の重要性分析が不十分

2. **モデルの複雑性不足**
   - 単純な線形モデルに依存
   - アンサンブル学習が実装されていない
   - モデルの選択・最適化が不十分

3. **過学習対策の不足**
   - 交差検証が実装されていない
   - データ分割が不適切
   - 正則化パラメータの調整が不十分

4. **モデルのモニタリング不足**
   - 予測精度の追跡機能がない
   - モデルの劣化検知がない
   - 再学習のトリガーが明確でない

## 影響
- 取引の勝率が低下
- 不必要な損失の発生
- 機会損失の増大
- 信頼性の低下

## 推奨される解決策

### 1. 特徴量エンジニアリングの強化

```typescript
// app/lib/aiAnalytics/FeatureEngineering.ts
export class FeatureEngineering {
  // テクニカル指標の拡張
  calculateTechnicalFeatures(ohlcv: OHLCV[]): TechnicalFeatures {
    return {
      // 既存の指標
      rsi: this.calculateRSI(ohlcv, 14),
      macd: this.calculateMACD(ohlcv),
      
      // 新しい指標
      momentum: this.calculateMomentum(ohlcv, 10),
      roc: this.calculateRateOfChange(ohlcv, 12),
      stochRSI: this.calculateStochasticRSI(ohlcv, 14),
      williamsR: this.calculateWilliamsR(ohlcv, 14),
      cci: this.calculateCommodityChannelIndex(ohlcv, 20),
      atrRatio: this.calculateATRRatio(ohlcv),
      volumeProfile: this.calculateVolumeProfile(ohlcv),
      pricePosition: this.calculatePricePosition(ohlcv),
      volatility: this.calculateVolatility(ohlcv, 20),
    };
  }

  // マクロ経済指標の統合
  calculateMacroFeatures(macroData: MacroData): MacroFeatures {
    return {
      interestRate: macroData.interestRate,
      inflationRate: macroData.inflationRate,
      gdpGrowth: macroData.gdpGrowth,
      unemploymentRate: macroData.unemploymentRate,
      vix: macroData.vix,
      dollarIndex: macroData.dollarIndex,
      bondYield: macroData.bondYield10y,
    };
  }

  // 市場センチメントの統合
  calculateSentimentFeatures(sentimentData: SentimentData): SentimentFeatures {
    return {
      newsSentiment: sentimentData.newsScore,
      socialSentiment: sentimentData.socialScore,
      analystRating: sentimentData.analystRating,
      institutionalFlow: sentimentData.institutionalFlow,
      retailFlow: sentimentData.retailFlow,
    };
  }

  // 特徴量の重要性分析
  analyzeFeatureImportance(
    features: FeatureMatrix,
    target: number[]
  ): FeatureImportance[] {
    // SHAP値やPermutation Importanceを使用
    return [];
  }
}
```

### 2. アンサンブル学習の実装

```typescript
// app/lib/aiAnalytics/EnsembleModel.ts
export class EnsembleModel {
  private models: BaseModel[] = [];

  async train(data: TrainingData): Promise<void> {
    // 複数のモデルを学習
    const [rfModel, xgbModel, lstmModel] = await Promise.all([
      this.trainRandomForest(data),
      this.trainXGBoost(data),
      this.trainLSTM(data),
    ]);

    this.models = [rfModel, xgbModel, lstmModel];
  }

  predict(features: Features): Prediction {
    const predictions = this.models.map(model => model.predict(features));
    
    // 重み付き平均またはスタッキング
    return this.aggregatePredictions(predictions);
  }

  private aggregatePredictions(predictions: Prediction[]): Prediction {
    // スタッキングまたは投票
    const weights = [0.4, 0.4, 0.2]; // 各モデルの重み
    const weightedSum = predictions.reduce((sum, pred, i) => 
      sum + pred.score * weights[i], 0
    );
    
    return {
      direction: weightedSum > 0.5 ? 'BUY' : 'SELL',
      confidence: Math.abs(weightedSum - 0.5) * 2,
      score: weightedSum,
    };
  }
}
```

### 3. 過学習対策の実装

```typescript
// app/lib/aiAnalytics/ModelValidation.ts
export class ModelValidation {
  // クロスバリデーション
  crossValidate(
    model: BaseModel,
    data: TrainingData,
    folds: number = 5
  ): CrossValidationResult {
    const results: ValidationResult[] = [];
    const foldSize = Math.floor(data.length / folds);

    for (let i = 0; i < folds; i++) {
      const trainStart = 0;
      const trainEnd = i * foldSize;
      const valStart = i * foldSize;
      const valEnd = (i + 1) * foldSize;
      const testStart = (i + 1) * foldSize;

      const trainData = data.slice(trainStart, trainEnd);
      const valData = data.slice(valStart, valEnd);
      const testData = data.slice(testStart);

      model.train(trainData);
      const prediction = model.predict(testData.features);
      const accuracy = this.calculateAccuracy(prediction, testData.target);

      results.push({ fold: i, accuracy, prediction });
    }

    return {
      meanAccuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / folds,
      stdAccuracy: this.calculateStd(results.map(r => r.accuracy)),
      results,
    };
  }

  // 時系列交差検証
  timeSeriesCrossValidate(
    model: BaseModel,
    data: TrainingData,
    windowSize: number = 252
  ): TimeSeriesCVResult {
    const results: ValidationResult[] = [];

    for (let i = windowSize; i < data.length; i++) {
      const trainData = data.slice(0, i);
      const testData = data.slice(i, i + 1);

      model.train(trainData);
      const prediction = model.predict(testData.features);
      const accuracy = this.calculateAccuracy(prediction, testData.target);

      results.push({ timestamp: data[i].timestamp, accuracy, prediction });
    }

    return { results, windowSize };
  }

  // 正則化パラメータの最適化
  optimizeRegularization(
    model: BaseModel,
    data: TrainingData,
    paramRanges: ParameterRange[]
  ): OptimalParameters {
    const bestParams = this.gridSearch(model, data, paramRanges);
    return bestParams;
  }
}
```

### 4. モデルモニタリングの実装

```typescript
// app/lib/aiAnalytics/ModelMonitor.ts
export class ModelMonitor {
  private predictions: PredictionRecord[] = [];
  private accuracyHistory: AccuracyRecord[] = [];

  trackPrediction(prediction: Prediction, actual: number): void {
    const accuracy = this.calculateAccuracy(prediction, actual);
    
    this.predictions.push({
      timestamp: new Date(),
      prediction,
      actual,
      accuracy,
    });

    this.updateAccuracyHistory();
  }

  detectModelDrift(threshold: number = 0.1): DriftAlert | null {
    const recentAccuracy = this.getRecentAccuracy(30); // 直近30日
    const baselineAccuracy = this.getBaselineAccuracy();

    if (baselineAccuracy - recentAccuracy > threshold) {
      return {
        type: 'ACCURACY_DRIFT',
        severity: 'HIGH',
        baselineAccuracy,
        currentAccuracy: recentAccuracy,
        drift: baselineAccuracy - recentAccuracy,
        recommendedAction: 'RETRAIN_MODEL',
        detectedAt: new Date(),
      };
    }

    return null;
  }

  getRetrainingTrigger(): RetrainingTrigger | null {
    const drift = this.detectModelDrift();
    const dataDrift = this.detectDataDrift();
    const performance = this.getPerformanceMetrics();

    if (drift || dataDrift || performance.belowThreshold) {
      return {
        reason: drift?.type || dataDrift?.type || 'LOW_PERFORMANCE',
        urgency: drift?.severity || 'MEDIUM',
        recommendedAt: new Date(),
      };
    }

    return null;
  }
}
```

## 実装計画

1. **フェーズ1: 特徴量エンジニアリング** (2週間)
   - 新しい特徴量の実装
   - 特徴量の重要性分析
   - 特徴量選択の最適化

2. **フェーズ2: アンサンブル学習** (2週間)
   - 複数モデルの実装
   - アンサンブル戦略の実装
   - モデルの評価

3. **フェーズ3: 過学習対策** (1週間)
   - クロスバリデーションの実装
   - 正則化パラメータの最適化
   - データ分割の改善

4. **フェーズ4: モデルモニタリング** (1週間)
   - 予測追跡の実装
   - ドリフト検知の実装
   - 再学習トリガーの実装

## 成功指標
- 予測精度が現在の65%から75%以上に向上
- 過学習の減少（検証データとテストデータの精度差が5%以下）
- モデルドリフトの早期検知（精度低下の10%以内で検知）

## 関連ファイル
- [`trading-platform/app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts`](trading-platform/app/lib/aiAnalytics/PredictiveAnalyticsEngine.ts)
- [`trading-platform/app/lib/mlPrediction.ts`](trading-platform/app/lib/mlPrediction.ts)
- [`trading-platform/app/lib/TechnicalIndicatorService.ts`](trading-platform/app/lib/TechnicalIndicatorService.ts)

## ラベル
- enhancement
- ml
- priority:high
- area:prediction-accuracy
