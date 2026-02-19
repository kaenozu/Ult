# Signal Quality Engine - 開発者向けクイックガイド

**対象読者**: ULTプロジェクトの開発者  
**最終更新**: 2026-02-19  
**関連PR**: #1000, #1017

---

## 📚 概要

Signal Quality Engine (Phase 2)は、市場レジームに基づいてML予測の重みを動的に調整し、シグナルの品質を評価するシステムです。

### 主要コンポーネント

1. **MarketRegimeDetector** - 市場レジームを検出（TRENDING/RANGING/VOLATILE）
2. **AdaptiveWeightCalculator** - レジームに応じてアンサンブル重みを計算
3. **ConfidenceScorer** - シグナルの信頼度をスコアリング
4. **ResultAnalyzer** - シグナルの実績を分析

---

## 🚀 クイックスタート

### 1. 市場レジームの検出

```typescript
import { MarketRegimeDetector } from '@/app/lib/services/market-regime-detector';
import { OHLCV } from '@/app/types';

const detector = new MarketRegimeDetector();
const marketData: OHLCV[] = [/* 最低14データポイント必要 */];

try {
  const regime = detector.detect(marketData);
  
  console.log('Market Regime:', regime.type);
  // Output: "TRENDING_UP" | "TRENDING_DOWN" | "RANGING" | "VOLATILE"
  
  console.log('Trend Strength:', regime.trendStrength); // 0-100
  console.log('Volatility:', regime.volatilityLevel);   // LOW|NORMAL|HIGH|EXTREME
  console.log('Momentum Quality:', regime.momentumQuality); // 0-100
} catch (error) {
  console.error('Insufficient data:', error);
}
```

### 2. 適応型重みの計算

```typescript
import { AdaptiveWeightCalculator } from '@/app/lib/services/adaptive-weight-calculator';

const calculator = new AdaptiveWeightCalculator();
const weights = calculator.calculate(regime);

console.log('Ensemble Weights:', weights);
// TRENDING_UP例: { RF: 0.30, XGB: 0.40, LSTM: 0.30 }
// RANGING例:     { RF: 0.45, XGB: 0.35, LSTM: 0.20 }
// VOLATILE例:    { RF: 0.25, XGB: 0.30, LSTM: 0.45 }

// アンサンブル予測に使用
const ensemblePrediction = 
  rfPrediction * weights.RF +
  xgbPrediction * weights.XGB +
  lstmPrediction * weights.LSTM;
```

### 3. シグナルの信頼度スコアリング

```typescript
import { ConfidenceScorer } from '@/app/lib/services/confidence-scorer';
import { Signal } from '@/app/types/signal';

const scorer = new ConfidenceScorer();
const signal: Signal = {
  symbol: 'AAPL',
  type: 'BUY',
  confidence: 0.75,
  accuracy: 65, // オプショナル: 過去の精度%
  targetPrice: 150,
  stopLoss: 140,
  reason: 'Strong uptrend',
  predictedChange: 5,
  predictionDate: new Date().toISOString(),
  timestamp: Date.now()
};

const regimeInfo = {
  trendStrength: regime.trendStrength
};

const score = scorer.score(signal, regimeInfo);
const level = scorer.getConfidenceLevel(score);

console.log('Confidence Score:', score); // 0-100
console.log('Confidence Level:', level); // "HIGH" | "MEDIUM" | "LOW"

// HIGH: score > 70
// MEDIUM: 50 < score <= 70
// LOW: score <= 50
```

---

## 📊 レジーム別の戦略

### TRENDING_UP / TRENDING_DOWN（トレンド相場）

**特徴**:
- ADX > 30
- 明確な方向性（plusDI vs minusDI）

**推奨モデル**: XGBoost（勾配ブースティング）
- トレンドフォロー戦略に最適
- 線形関係の捕捉が得意

**重み設定**:
```typescript
TRENDING_UP:   { RF: 0.30, XGB: 0.40, LSTM: 0.30 }
TRENDING_DOWN: { RF: 0.35, XGB: 0.35, LSTM: 0.30 }
```

### RANGING（レンジ相場）

**特徴**:
- ADX <= 30
- 価格が一定範囲内で推移

**推奨モデル**: Random Forest
- 複雑な非線形パターンの捕捉が得意
- サポート・レジスタンスレベルの識別

**重み設定**:
```typescript
RANGING: { RF: 0.45, XGB: 0.35, LSTM: 0.20 }
```

### VOLATILE（ボラティリティ相場）

**特徴**:
- ATR比率 > 1.5
- 急激な価格変動

**推奨モデル**: LSTM（長短期記憶ネットワーク）
- 時系列パターンの学習が得意
- 急激な変化への対応力

**重み設定**:
```typescript
VOLATILE: { RF: 0.25, XGB: 0.30, LSTM: 0.45 }
```

---

## 🔧 統合パターン

### パターン1: ML予測サービスへの統合（推奨）

```typescript
import { MarketRegimeDetector } from '@/app/lib/services/market-regime-detector';
import { AdaptiveWeightCalculator } from '@/app/lib/services/adaptive-weight-calculator';

export class MLPredictionService {
  private regimeDetector = new MarketRegimeDetector();
  private weightCalculator = new AdaptiveWeightCalculator();

  async predict(symbol: string, data: OHLCV[]): Promise<Prediction> {
    // 1. レジーム検出
    const regime = this.regimeDetector.detect(data);
    
    // 2. 適応型重み計算
    const weights = this.weightCalculator.calculate(regime);
    
    // 3. 各モデルで予測
    const predictions = await this.runModels(symbol, data);
    
    // 4. 動的重みでアンサンブル
    const ensemblePrediction = 
      predictions.rf * weights.RF +
      predictions.xgb * weights.XGB +
      predictions.lstm * weights.LSTM;
    
    return {
      symbol,
      prediction: ensemblePrediction,
      regime: regime.type,
      weights: weights,
      confidence: this.calculateConfidence(predictions, regime)
    };
  }
}
```

### パターン2: シグナル生成時の品質評価

```typescript
import { ConfidenceScorer } from '@/app/lib/services/confidence-scorer';

export class SignalGenerationService {
  private scorer = new ConfidenceScorer();

  generateSignal(prediction: Prediction, marketData: OHLCV[]): Signal {
    const signal: Signal = {
      symbol: prediction.symbol,
      type: prediction.prediction > 0 ? 'BUY' : 'SELL',
      confidence: prediction.confidence,
      accuracy: this.getHistoricalAccuracy(prediction.symbol),
      targetPrice: this.calculateTargetPrice(prediction),
      stopLoss: this.calculateStopLoss(prediction),
      reason: this.generateReason(prediction),
      predictedChange: prediction.prediction,
      predictionDate: new Date().toISOString(),
      timestamp: Date.now()
    };

    // 信頼度スコアリング
    const regimeInfo = {
      trendStrength: prediction.regime?.trendStrength || 50
    };
    const score = this.scorer.score(signal, regimeInfo);
    const level = this.scorer.getConfidenceLevel(score);

    return {
      ...signal,
      confidenceScore: score,
      confidenceLevel: level
    };
  }

  // HIGH信頼度のシグナルのみをフィルタ
  getHighQualitySignals(signals: Signal[]): Signal[] {
    return signals.filter(s => 
      this.scorer.getConfidenceLevel(s.confidenceScore || 0) === 'HIGH'
    );
  }
}
```

### パターン3: リアルタイムレジーム監視

```typescript
export class MarketRegimeMonitor {
  private detector = new MarketRegimeDetector();
  private currentRegime?: MarketRegime;
  private listeners: Array<(regime: MarketRegime) => void> = [];

  monitor(symbol: string, data: OHLCV[]): void {
    const newRegime = this.detector.detect(data);
    
    // レジームが変化した場合のみ通知
    if (!this.currentRegime || newRegime.type !== this.currentRegime.type) {
      console.log(`[${symbol}] Regime changed: ${this.currentRegime?.type} → ${newRegime.type}`);
      this.currentRegime = newRegime;
      this.notifyListeners(newRegime);
    }
  }

  onRegimeChange(callback: (regime: MarketRegime) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(regime: MarketRegime): void {
    this.listeners.forEach(listener => listener(regime));
  }
}

// 使用例
const monitor = new MarketRegimeMonitor();
monitor.onRegimeChange((regime) => {
  console.log('Update ML weights for new regime:', regime.type);
  // ML予測サービスの重みを更新
});
```

---

## ⚠️ よくある問題と解決策

### 問題1: "Insufficient data" エラー

**原因**: MarketRegimeDetectorは最低14データポイントが必要

**解決策**:
```typescript
const MIN_DATA_POINTS = 14;

if (data.length < MIN_DATA_POINTS) {
  // フォールバック: 静的な重みを使用
  const fallbackWeights = { RF: 0.33, XGB: 0.33, LSTM: 0.34 };
  return fallbackWeights;
}

const regime = detector.detect(data);
```

### 問題2: レジーム判定が不安定

**原因**: ADX/ATRの閾値が厳しすぎる、またはデータの品質が低い

**解決策**:
```typescript
// より多くのデータポイントを使用（50-100推奨）
const extendedData = await fetchHistoricalData(symbol, 100);
const regime = detector.detect(extendedData);

// レジーム安定性のチェック
const recentRegimes = this.getRecentRegimes(5); // 過去5回
const isStable = recentRegimes.every(r => r.type === regime.type);

if (!isStable) {
  console.warn('Regime detection unstable, using conservative weights');
}
```

### 問題3: 信頼度スコアが低すぎる

**原因**: ConfidenceScorerの閾値が厳しすぎる、またはシグナルの基礎品質が低い

**解決策**:
```typescript
// オプション1: 閾値を調整
class CustomConfidenceScorer extends ConfidenceScorer {
  getConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score >= 65) return 'HIGH';  // 70 → 65に緩和
    if (score >= 45) return 'MEDIUM'; // 50 → 45に緩和
    return 'LOW';
  }
}

// オプション2: 精度データを充実させる
const signal = {
  ...baseSignal,
  accuracy: await this.calculateHistoricalAccuracy(symbol), // 過去の実績を反映
};
```

---

## 🧪 テストガイド

### ユニットテスト例

```typescript
import { MarketRegimeDetector } from '@/app/lib/services/market-regime-detector';

describe('MarketRegimeDetector', () => {
  it('should detect trending market', () => {
    const detector = new MarketRegimeDetector();
    const trendingData = generateTrendingData(); // ヘルパー関数
    
    const regime = detector.detect(trendingData);
    
    expect(regime.type).toMatch(/TRENDING_(UP|DOWN)/);
    expect(regime.trendStrength).toBeGreaterThan(50);
  });

  it('should handle insufficient data gracefully', () => {
    const detector = new MarketRegimeDetector();
    const insufficientData = generateTrendingData().slice(0, 10);
    
    expect(() => detector.detect(insufficientData)).toThrow('Insufficient data');
  });
});
```

### 統合テスト例

```typescript
describe('Signal Quality Engine Integration', () => {
  it('should use adaptive weights based on market regime', async () => {
    const mlService = new MLPredictionService();
    const trendingData = generateTrendingData('up');
    
    const prediction = await mlService.predict('AAPL', trendingData);
    
    // トレンド相場ではXGBが優位
    expect(prediction.regime).toBe('TRENDING_UP');
    expect(prediction.weights.XGB).toBeGreaterThan(prediction.weights.RF);
    expect(prediction.weights.XGB).toBeGreaterThan(prediction.weights.LSTM);
  });
});
```

---

## 📖 参考資料

### 内部ドキュメント
- [PR_1000_REVIEW_SUMMARY.md](./PR_1000_REVIEW_SUMMARY.md) - レビューサマリー
- [PR_1000_ACTION_ITEMS.md](./PR_1000_ACTION_ITEMS.md) - アクションアイテム
- [PR_1000_IMPLEMENTATION_ANALYSIS.md](./PR_1000_IMPLEMENTATION_ANALYSIS.md) - 実装分析

### 外部リファレンス
- [ADX - Average Directional Index](https://www.investopedia.com/terms/a/adx.asp)
- [ATR - Average True Range](https://www.investopedia.com/terms/a/atr.asp)
- [Ensemble Learning in Trading](https://www.quantstart.com/articles/ensemble-learning-techniques/)

### コードリファレンス
```
trading-platform/app/lib/services/
├── market-regime-detector.ts          # 市場レジーム検出
├── adaptive-weight-calculator.ts      # 適応型重み計算
├── confidence-scorer.ts               # 信頼度スコアリング
└── __tests__/
    ├── market-regime-detector.test.ts
    ├── adaptive-weight-calculator.test.ts
    └── confidence-scorer.test.ts
```

---

## 💡 ベストプラクティス

### 1. レジーム検出の頻度

```typescript
// ✅ 推奨: 1時間ごと、または新しいデータが利用可能になったとき
setInterval(() => {
  const latestData = await fetchLatestData(symbol);
  const regime = detector.detect(latestData);
  updateMLWeights(regime);
}, 60 * 60 * 1000); // 1時間

// ❌ 非推奨: 予測ごとに検出（計算コストが高い）
```

### 2. 重みのキャッシング

```typescript
// ✅ 推奨: レジームが変わるまで重みをキャッシュ
class MLService {
  private cachedWeights?: EnsembleWeights;
  private lastRegimeType?: string;

  getWeights(regime: MarketRegime): EnsembleWeights {
    if (this.lastRegimeType !== regime.type) {
      this.cachedWeights = this.calculator.calculate(regime);
      this.lastRegimeType = regime.type;
    }
    return this.cachedWeights!;
  }
}
```

### 3. エラーハンドリング

```typescript
// ✅ 推奨: フォールバック戦略を用意
try {
  const regime = detector.detect(data);
  const weights = calculator.calculate(regime);
} catch (error) {
  console.error('Regime detection failed, using default weights', error);
  const weights = { RF: 0.33, XGB: 0.33, LSTM: 0.34 };
}
```

---

## 🎯 次のステップ

1. **統合を完了**: AdaptiveWeightCalculatorをMLModelServiceに統合
2. **バックテストを実施**: 効果を定量的に測定
3. **ドキュメントを更新**: 統合後のアーキテクチャを反映
4. **モニタリングを追加**: レジーム変化をダッシュボードで可視化

---

**質問・フィードバック**: GitHub Issues または PRコメントでお願いします  
**最終更新**: 2026-02-19  
**バージョン**: 1.0
