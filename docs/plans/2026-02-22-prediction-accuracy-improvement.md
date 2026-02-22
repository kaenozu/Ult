# 予測精度向上・パフォーマンス改善 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 株価予測の方向精度を55%から65-70%に向上させ、計算時間を200msから100ms未満に短縮する。

**Architecture:** 既存のEnsembleModelにRSI閾値最適化、市場レジーム別重み、ローソク足パターン認識を統合。Web Workerで計算を非同期化。

**Tech Stack:** TypeScript, Jest, Web Workers

---

## Phase 1: パラメータ最適化

### Task 1: 設定ファイルの作成

**Files:**
- Create: `trading-platform/app/lib/config/prediction-config.ts`

**Step 1: 設定ファイルを作成**

```typescript
/**
 * prediction-config.ts
 *
 * 予測モデルの設定パラメータ
 */

export const RSI_THRESHOLDS = {
  EXTREME_OVERSOLD: 15,
  MODERATE_OVERSOLD: 30,
  MODERATE_OVERBOUGHT: 70,
  EXTREME_OVERBOUGHT: 85,
} as const;

export const OPTIMIZED_ENSEMBLE_WEIGHTS = {
  TRENDING: { RF: 0.25, XGB: 0.35, LSTM: 0.35, TECHNICAL: 0.05 },
  RANGING: { RF: 0.40, XGB: 0.30, LSTM: 0.20, TECHNICAL: 0.10 },
  VOLATILE: { RF: 0.30, XGB: 0.30, LSTM: 0.25, TECHNICAL: 0.15 },
  QUIET: { RF: 0.25, XGB: 0.25, LSTM: 0.25, TECHNICAL: 0.25 },
} as const;

export type MarketRegimeType = keyof typeof OPTIMIZED_ENSEMBLE_WEIGHTS;

export const PREDICTION_CONFIG = {
  LEARNING_RATE: 0.1,
  MIN_WEIGHT: 0.05,
  MAX_WEIGHT: 0.6,
  PERFORMANCE_WINDOW: 50,
  BASELINE_ACCURACY: 55,
} as const;
```

**Step 2: ファイル作成を確認**

Run: `ls trading-platform/app/lib/config/prediction-config.ts`
Expected: ファイルが存在

**Step 3: コミット**

```bash
git add trading-platform/app/lib/config/prediction-config.ts
git commit -m "feat: add prediction config with optimized parameters"
```

---

### Task 2: EnsembleModelの重み調整ロジック更新

**Files:**
- Modify: `trading-platform/app/lib/ml/EnsembleModel.ts:86-97`
- Modify: `trading-platform/app/lib/ml/EnsembleModel.ts:275-314`

**Step 1: テストを追加**

```typescript
// trading-platform/app/lib/ml/__tests__/EnsembleModel.test.ts

import { describe, it, expect } from '@jest/globals';
import { EnsembleModel } from '../EnsembleModel';
import { OPTIMIZED_ENSEMBLE_WEIGHTS } from '../../config/prediction-config';

describe('EnsembleModel - Optimized Weights', () => {
  const model = new EnsembleModel();

  it('should use optimized weights for TRENDING regime', () => {
    const weights = model.getCurrentWeights();
    expect(weights.RF).toBeCloseTo(0.25, 1);
  });

  it('should adjust weights based on market regime', () => {
    const trendingData = createTrendingData();
    const prediction = model.predict(trendingData, createMockFeatures());
    expect(prediction.weights.LSTM).toBeGreaterThan(0.25);
  });
});

function createTrendingData() {
  const data = [];
  let price = 1000;
  for (let i = 0; i < 100; i++) {
    price += 2 + Math.random() * 3;
    data.push({
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 1000000,
    });
  }
  return data;
}

function createMockFeatures() {
  return {
    technical: {
      rsi: 50,
      momentum10: 0,
      momentum20: 0,
      sma5: 0,
      sma10: 0,
      sma20: 0,
      sma50: 0,
      macd: 0,
      macdSignal: 0,
      macdHistogram: 0,
      bbUpper: 100,
      bbMiddle: 100,
      bbLower: 100,
      bbPosition: 50,
      atr: 10,
      atrPercent: 1,
      atrRatio: 1,
      volumeRatio: 1,
      volumeTrend: 'NEUTRAL' as const,
    },
    timeSeries: {
      trendStrength: 0.5,
      cyclicality: 0.5,
      ma20: 100,
    },
    sentiment: { sentimentScore: 0 },
    macro: { macroScore: 0 },
  };
}
```

**Step 2: テストを実行して失敗を確認**

Run: `cd trading-platform && npm test -- app/lib/ml/__tests__/EnsembleModel.test.ts`
Expected: FAIL (テストファイルがまだ存在しない)

**Step 3: 設定をインポートして重みを更新**

`trading-platform/app/lib/ml/EnsembleModel.ts`の先頭に追加:

```typescript
import { RSI_THRESHOLDS, OPTIMIZED_ENSEMBLE_WEIGHTS, PREDICTION_CONFIG } from '../config/prediction-config';
```

`adjustWeightsForRegime`メソッドを更新:

```typescript
private adjustWeightsForRegime(regime: MarketRegime): EnsembleWeights {
  const regimeKey = regime.regime as MarketRegimeType;
  const baseWeights = OPTIMIZED_ENSEMBLE_WEIGHTS[regimeKey] || OPTIMIZED_ENSEMBLE_WEIGHTS.QUIET;
  
  const adjustedWeights: EnsembleWeights = {
    RF: baseWeights.RF,
    XGB: baseWeights.XGB,
    LSTM: baseWeights.LSTM,
    TECHNICAL: baseWeights.TECHNICAL,
    ENSEMBLE: 0,
  };

  // パフォーマンス履歴に基づく微調整
  for (const modelType of ['RF', 'XGB', 'LSTM', 'TECHNICAL'] as const) {
    const history = this.performanceHistory.get(modelType);
    if (history && history.length >= 10) {
      const recentAccuracy = history.slice(-10).reduce((sum, p) => sum + p.accuracy, 0) / 10;
      const adjustment = (recentAccuracy - PREDICTION_CONFIG.BASELINE_ACCURACY) / 100 * PREDICTION_CONFIG.LEARNING_RATE;
      adjustedWeights[modelType] *= (1 + adjustment);
    }
  }

  return this.normalizeWeights(adjustedWeights);
}
```

**Step 4: テストを実行**

Run: `cd trading-platform && npm test -- app/lib/ml/__tests__/EnsembleModel.test.ts`
Expected: PASS

**Step 5: コミット**

```bash
git add trading-platform/app/lib/ml/EnsembleModel.ts trading-platform/app/lib/ml/__tests__/EnsembleModel.test.ts
git commit -m "feat: integrate optimized ensemble weights with regime detection"
```

---

### Task 3: RSI閾値の適用

**Files:**
- Modify: `trading-platform/app/lib/ml/EnsembleModel.ts:367-398`

**Step 1: テストを追加**

```typescript
// trading-platform/app/lib/ml/__tests__/EnsembleModel.test.ts に追加

describe('EnsembleModel - RSI Thresholds', () => {
  it('should give bullish signal when RSI is extremely oversold (< 15)', () => {
    const model = new EnsembleModel();
    const features = createMockFeatures();
    features.technical.rsi = 12;
    
    const prediction = model.predictWithFeatures(features);
    expect(prediction.modelPredictions.find(p => p.modelType === 'RF')!.prediction).toBeGreaterThan(0);
  });

  it('should give bearish signal when RSI is extremely overbought (> 85)', () => {
    const model = new EnsembleModel();
    const features = createMockFeatures();
    features.technical.rsi = 88;
    
    const prediction = model.predictWithFeatures(features);
    expect(prediction.modelPredictions.find(p => p.modelType === 'RF')!.prediction).toBeLessThan(0);
  });
});
```

**Step 2: RSI閾値を使用するようにpredictRandomForestを更新**

```typescript
private predictRandomForest(features: AllFeatures): ModelPrediction {
  const t = features.technical;
  let score = 0;

  // RSI with optimized thresholds
  if (t.rsi < RSI_THRESHOLDS.EXTREME_OVERSOLD) score += 4;
  else if (t.rsi < RSI_THRESHOLDS.MODERATE_OVERSOLD) score += 2;
  else if (t.rsi > RSI_THRESHOLDS.EXTREME_OVERBOUGHT) score -= 4;
  else if (t.rsi > RSI_THRESHOLDS.MODERATE_OVERBOUGHT) score -= 2;

  // ... 残りのロジックは同じ
}
```

**Step 3: テストを実行**

Run: `cd trading-platform && npm test -- app/lib/ml/__tests__/EnsembleModel.test.ts`
Expected: PASS

**Step 4: コミット**

```bash
git add trading-platform/app/lib/ml/EnsembleModel.ts trading-platform/app/lib/ml/__tests__/EnsembleModel.test.ts
git commit -m "feat: apply optimized RSI thresholds in RF prediction"
```

---

## Phase 2: ローソク足パターン認識統合

### Task 4: PATTERNモデルタイプの追加

**Files:**
- Modify: `trading-platform/app/lib/ml/EnsembleModel.ts:15`

**Step 1: テストを追加**

```typescript
describe('EnsembleModel - Pattern Integration', () => {
  it('should include PATTERN model in predictions', () => {
    const model = new EnsembleModel();
    const data = createMockOHLCV();
    const features = createMockFeatures();
    
    const prediction = model.predict(data, features);
    expect(prediction.modelPredictions.find(p => p.modelType === 'PATTERN')).toBeDefined();
  });
});
```

**Step 2: ModelTypeにPATTERNを追加**

```typescript
export type ModelType = 'RF' | 'XGB' | 'LSTM' | 'TECHNICAL' | 'PATTERN' | 'ENSEMBLE';
```

**Step 3: EnsembleWeightsにPATTERNを追加**

```typescript
interface EnsembleWeights {
  RF: number;
  XGB: number;
  LSTM: number;
  TECHNICAL: number;
  PATTERN: number;
  ENSEMBLE: number;
}
```

**Step 4: コミット**

```bash
git add trading-platform/app/lib/ml/EnsembleModel.ts
git commit -m "feat: add PATTERN model type to ensemble"
```

---

### Task 5: パターン予測メソッドの実装

**Files:**
- Modify: `trading-platform/app/lib/ml/EnsembleModel.ts`

**Step 1: テストを追加**

```typescript
it('should predict using candlestick patterns', () => {
  const model = new EnsembleModel();
  const hammerData = createHammerPatternData();
  const features = createMockFeatures();
  
  const prediction = model.predict(hammerData, features);
  const patternPred = prediction.modelPredictions.find(p => p.modelType === 'PATTERN');
  expect(patternPred!.prediction).toBeGreaterThan(0); // Hammer is bullish
});

function createHammerPatternData(): OHLCV[] {
  const data = [];
  for (let i = 0; i < 50; i++) {
    data.push({
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      open: 100,
      high: 102,
      low: 95,
      close: 101,
      volume: 1000000,
    });
  }
  // Hammer candle
  data.push({
    date: new Date(2024, 0, 51).toISOString().split('T')[0],
    open: 100,
    high: 101,
    low: 90,
    close: 99.5,
    volume: 1500000,
  });
  return data;
}
```

**Step 2: predictPatternメソッドを追加**

```typescript
import { candlestickPatternService } from '../services/candlestick-pattern-service';

private predictPattern(data: OHLCV[]): ModelPrediction {
  const features = candlestickPatternService.calculatePatternFeatures(data);
  const signal = candlestickPatternService.getPatternSignal(features);
  
  const prediction = signal * 3; // Scale to match other models
  const confidence = Math.min(95, 50 + Math.abs(signal) * 30);

  return {
    modelType: 'PATTERN',
    prediction,
    confidence,
    timestamp: new Date().toISOString(),
  };
}
```

**Step 3: predictメソッドにPATTERNを追加**

```typescript
const modelPredictions: ModelPrediction[] = [
  this.predictRandomForest(features),
  this.predictXGBoost(features),
  this.predictLSTM(data, features),
  this.predictTechnical(features),
  this.predictPattern(data),
];
```

**Step 4: テストを実行**

Run: `cd trading-platform && npm test -- app/lib/ml/__tests__/EnsembleModel.test.ts`
Expected: PASS

**Step 5: コミット**

```bash
git add trading-platform/app/lib/ml/EnsembleModel.ts
git commit -m "feat: integrate candlestick pattern prediction into ensemble"
```

---

## Phase 3: Web Worker化

### Task 6: Web Workerの拡張

**Files:**
- Modify: `trading-platform/app/lib/services/prediction-worker.ts`

**Step 1: テストを追加**

```typescript
// trading-platform/app/lib/services/__tests__/prediction-worker.test.ts

import { describe, it, expect } from '@jest/globals';

describe('PredictionWorker', () => {
  it('should complete prediction within 100ms', async () => {
    const start = performance.now();
    // ... prediction worker test
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

**Step 2: キャッシュ機能を追加**

```typescript
// trading-platform/app/lib/services/prediction-worker.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class PredictionCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly TTL = 5000;
  private readonly MAX_SIZE = 50;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    if (this.cache.size >= this.MAX_SIZE) {
      this.cleanup();
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const predictionCache = new PredictionCache();
```

**Step 3: コミット**

```bash
git add trading-platform/app/lib/services/prediction-worker.ts
git commit -m "feat: add prediction cache with TTL and size limits"
```

---

### Task 7: Enhanced Prediction Serviceの作成

**Files:**
- Create: `trading-platform/app/lib/services/enhanced-prediction-service.ts`

**Step 1: サービスを作成**

```typescript
/**
 * enhanced-prediction-service.ts
 *
 * 統合予測サービス: キャッシュ、重複防止、Worker管理
 */

import { OHLCV } from '@/app/types';
import { ensembleModel, EnsemblePrediction } from '../ml/EnsembleModel';
import { predictionCache } from './prediction-worker';
import { AllFeatures } from './feature-engineering-service';

export interface EnhancedPredictionInput {
  symbol: string;
  data: OHLCV[];
  features?: AllFeatures;
  macroData?: { macroScore: number };
  sentimentData?: { sentimentScore: number };
}

export interface EnhancedPredictionResult extends EnsemblePrediction {
  cacheHit: boolean;
  calculationTime: number;
}

class EnhancedPredictionService {
  private pendingRequests = new Map<string, Promise<EnhancedPredictionResult>>();

  async calculatePrediction(input: EnhancedPredictionInput): Promise<EnhancedPredictionResult> {
    const cacheKey = this.generateCacheKey(input);
    
    // Check cache
    const cached = predictionCache.get<EnhancedPredictionResult>(cacheKey);
    if (cached) {
      return { ...cached, cacheHit: true };
    }

    // Prevent duplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const promise = this.executePrediction(input, cacheKey);
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      return await promise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executePrediction(
    input: EnhancedPredictionInput,
    cacheKey: string
  ): Promise<EnhancedPredictionResult> {
    const start = performance.now();
    
    const prediction = ensembleModel.predict(
      input.data,
      input.features || this.calculateDefaultFeatures(input.data),
      input.macroData,
      input.sentimentData
    );

    const result: EnhancedPredictionResult = {
      ...prediction,
      cacheHit: false,
      calculationTime: performance.now() - start,
    };

    predictionCache.set(cacheKey, result);
    return result;
  }

  private generateCacheKey(input: EnhancedPredictionInput): string {
    const lastCandle = input.data[input.data.length - 1];
    return `${input.symbol}:${lastCandle.date}:${lastCandle.close}`;
  }

  private calculateDefaultFeatures(data: OHLCV[]): AllFeatures {
    // Simplified default features
    return {
      technical: {
        rsi: 50,
        momentum10: 0,
        momentum20: 0,
        sma5: 0,
        sma10: 0,
        sma20: 0,
        sma50: 0,
        macd: 0,
        macdSignal: 0,
        macdHistogram: 0,
        bbUpper: 100,
        bbMiddle: 100,
        bbLower: 100,
        bbPosition: 50,
        atr: 10,
        atrPercent: 1,
        atrRatio: 1,
        volumeRatio: 1,
        volumeTrend: 'NEUTRAL',
      },
      timeSeries: { trendStrength: 0.5, cyclicality: 0.5, ma20: 100 },
      sentiment: { sentimentScore: 0 },
      macro: { macroScore: 0 },
    };
  }

  getPerformanceMetrics() {
    return {
      pendingRequests: this.pendingRequests.size,
    };
  }
}

export const enhancedPredictionService = new EnhancedPredictionService();
```

**Step 2: テストを追加**

```typescript
// trading-platform/app/lib/services/__tests__/enhanced-prediction-service.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { enhancedPredictionService } from '../enhanced-prediction-service';

describe('EnhancedPredictionService', () => {
  it('should cache repeated requests', async () => {
    const input = createMockInput();
    
    const result1 = await enhancedPredictionService.calculatePrediction(input);
    const result2 = await enhancedPredictionService.calculatePrediction(input);
    
    expect(result1.cacheHit).toBe(false);
    expect(result2.cacheHit).toBe(true);
  });

  it('should complete within 100ms', async () => {
    const input = createMockInput();
    const start = performance.now();
    
    await enhancedPredictionService.calculatePrediction(input);
    
    expect(performance.now() - start).toBeLessThan(100);
  });
});

function createMockInput() {
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      open: 100 + Math.random(),
      high: 101 + Math.random(),
      low: 99 - Math.random(),
      close: 100 + Math.random(),
      volume: 1000000,
    });
  }
  return { symbol: 'TEST', data };
}
```

**Step 3: テストを実行**

Run: `cd trading-platform && npm test -- app/lib/services/__tests__/enhanced-prediction-service.test.ts`
Expected: PASS

**Step 4: コミット**

```bash
git add trading-platform/app/lib/services/enhanced-prediction-service.ts trading-platform/app/lib/services/__tests__/enhanced-prediction-service.test.ts
git commit -m "feat: add enhanced prediction service with cache and deduplication"
```

---

### Task 8: 統合と最終テスト

**Files:**
- Modify: `trading-platform/app/lib/services/data-aggregator.ts`

**Step 1: 新サービスを統合**

```typescript
import { enhancedPredictionService } from './enhanced-prediction-service';

async fetchSignal(stock: Stock) {
  // ... 既存のコード
  
  // 新しい予測サービスを使用
  const prediction = await enhancedPredictionService.calculatePrediction({
    symbol: stock.symbol,
    data: ohlcvData,
  });

  // フォールバック処理
  // ...
}
```

**Step 2: 統合テストを実行**

Run: `cd trading-platform && npm test`
Expected: すべてのテストがPASS

**Step 3: 最終コミット**

```bash
git add trading-platform/app/lib/services/data-aggregator.ts
git commit -m "feat: integrate enhanced prediction service into data aggregator"
```

---

## 完了確認

各フェーズ完了後、以下を確認:

1. `npm test` - すべてのテストがPASS
2. `npx tsc --noEmit` - TypeScriptエラーなし
3. `npm run build` - ビルド成功
