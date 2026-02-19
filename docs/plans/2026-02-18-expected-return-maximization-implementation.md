# 期待リターン最大化システム 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** AIの推奨銘柄を買うと最善の期待リターンが得られるシステムを構築

**Architecture:** Signal Quality Engine（市場レジーム検出 + 適応的アンサンブル + 確信度スコア）+ Feedback Loop System（結果追跡 + 分析 + 改善）+ UI導線（AI推奨パネル）

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, lightweight-charts

---

## Phase 1: 不要ページ削除

### Task 1: 削除不要ページ

**Files:**
- Delete: `trading-platform/app/behavioral-demo/`
- Delete: `trading-platform/app/api-docs/`
- Delete: `trading-platform/app/prediction-clouds/`
- Modify: `trading-platform/app/components/BottomNav.tsx` (ナビゲーションから削除)

**Step 1: 削除ディレクトリ**

```bash
rm -rf trading-platform/app/behavioral-demo
rm -rf trading-platform/app/api-docs
rm -rf trading-platform/app/prediction-clouds
```

**Step 2: ナビゲーション更新**

`trading-platform/app/components/BottomNav.tsx` から削除ページへのリンクを削除。

**Step 3: 型チェック**

```bash
cd trading-platform && npx tsc --noEmit
```

**Step 4: コミット**

```bash
git add -A && git commit -m "chore: remove unused pages (behavioral-demo, api-docs, prediction-clouds)"
```

---

## Phase 2: Signal Quality Engine

### Task 2: Market Regime Detector

**Files:**
- Create: `trading-platform/app/lib/services/market-regime-detector.ts`
- Create: `trading-platform/app/lib/services/__tests__/market-regime-detector.test.ts`

**Step 1: テスト作成**

```typescript
// trading-platform/app/lib/services/__tests__/market-regime-detector.test.ts
import { MarketRegimeDetector, MarketRegime } from '../market-regime-detector';
import { OHLCV } from '@/app/types';

describe('MarketRegimeDetector', () => {
  const generateTrendingData = (direction: 'up' | 'down'): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    for (let i = 0; i < 50; i++) {
      price += direction === 'up' ? 2 : -2;
      data.push({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: price,
        high: price + 3,
        low: price - 3,
        close: price + (direction === 'up' ? 1.5 : -1.5),
        volume: 10000
      });
    }
    return data;
  };

  it('should detect TRENDING_UP regime', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('up'));
    expect(result.type).toBe('TRENDING_UP');
  });

  it('should detect TRENDING_DOWN regime', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('down'));
    expect(result.type).toBe('TRENDING_DOWN');
  });

  it('should return volatilityLevel', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('up'));
    expect(['LOW', 'NORMAL', 'HIGH', 'EXTREME']).toContain(result.volatilityLevel);
  });
});
```

**Step 2: テスト実行**

```bash
cd trading-platform && npm test -- --testPathPattern="market-regime-detector" --passWithNoTests
```

**Step 3: 実装**

```typescript
// trading-platform/app/lib/services/market-regime-detector.ts
import { OHLCV } from '@/app/types';

export interface MarketRegime {
  type: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE';
  volatilityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  trendStrength: number;
  momentumQuality: number;
}

export class MarketRegimeDetector {
  private calculateADX(data: OHLCV[], period: number = 14): number {
    if (data.length < period + 1) return 0;
    
    let plusDM = 0;
    let minusDM = 0;
    let tr = 0;
    
    for (let i = 1; i <= period; i++) {
      const high = data[data.length - i].high;
      const low = data[data.length - i].low;
      const prevHigh = data[data.length - i - 1].high;
      const prevLow = data[data.length - i - 1].low;
      const prevClose = data[data.length - i - 1].close;
      
      plusDM += Math.max(high - prevHigh, 0);
      minusDM += Math.max(prevLow - low, 0);
      tr += Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    }
    
    const plusDI = (plusDM / tr) * 100;
    const minusDI = (minusDM / tr) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    return dx;
  }

  private calculateATRRatio(data: OHLCV[], period: number = 14): number {
    if (data.length < period + 1) return 0;
    
    let atrSum = 0;
    for (let i = 0; i < period; i++) {
      const d = data[data.length - 1 - i];
      atrSum += d.high - d.low;
    }
    const atr = atrSum / period;
    const currentPrice = data[data.length - 1].close;
    
    return atr / currentPrice;
  }

  detect(data: OHLCV[]): MarketRegime {
    const adx = this.calculateADX(data);
    const atrRatio = this.calculateATRRatio(data);
    
    let volatilityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    if (atrRatio < 0.01) volatilityLevel = 'LOW';
    else if (atrRatio < 0.025) volatilityLevel = 'NORMAL';
    else if (atrRatio < 0.05) volatilityLevel = 'HIGH';
    else volatilityLevel = 'EXTREME';

    let type: MarketRegime['type'];
    const recentPrices = data.slice(-20);
    const priceChange = (recentPrices[recentPrices.length - 1].close - recentPrices[0].open) / recentPrices[0].open;
    
    if (volatilityLevel === 'HIGH' || volatilityLevel === 'EXTREME') {
      type = 'VOLATILE';
    } else if (adx > 25) {
      type = priceChange > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
    } else {
      type = 'RANGING';
    }

    return {
      type,
      volatilityLevel,
      trendStrength: Math.min(100, adx * 2),
      momentumQuality: Math.min(100, Math.abs(priceChange) * 1000)
    };
  }
}
```

**Step 4: テスト実行**

```bash
cd trading-platform && npm test -- --testPathPattern="market-regime-detector"
```

**Step 5: コミット**

```bash
git add trading-platform/app/lib/services/market-regime-detector.ts trading-platform/app/lib/services/__tests__/market-regime-detector.test.ts && git commit -m "feat: add MarketRegimeDetector for signal quality engine"
```

---

### Task 3: Adaptive Weight Calculator

**Files:**
- Create: `trading-platform/app/lib/services/adaptive-weight-calculator.ts`
- Create: `trading-platform/app/lib/services/__tests__/adaptive-weight-calculator.test.ts`

**Step 1: テスト作成**

```typescript
// trading-platform/app/lib/services/__tests__/adaptive-weight-calculator.test.ts
import { AdaptiveWeightCalculator } from '../adaptive-weight-calculator';
import { MarketRegime } from '../market-regime-detector';

describe('AdaptiveWeightCalculator', () => {
  it('should return weights that sum to 1', () => {
    const calculator = new AdaptiveWeightCalculator();
    const regime: MarketRegime = {
      type: 'TRENDING_UP',
      volatilityLevel: 'NORMAL',
      trendStrength: 50,
      momentumQuality: 50
    };
    const weights = calculator.calculate(regime);
    expect(weights.RF + weights.XGB + weights.LSTM).toBeCloseTo(1, 2);
  });

  it('should favor XGB in TRENDING_UP', () => {
    const calculator = new AdaptiveWeightCalculator();
    const regime: MarketRegime = {
      type: 'TRENDING_UP',
      volatilityLevel: 'NORMAL',
      trendStrength: 50,
      momentumQuality: 50
    };
    const weights = calculator.calculate(regime);
    expect(weights.XGB).toBeGreaterThan(weights.LSTM);
  });

  it('should favor LSTM in VOLATILE', () => {
    const calculator = new AdaptiveWeightCalculator();
    const regime: MarketRegime = {
      type: 'VOLATILE',
      volatilityLevel: 'HIGH',
      trendStrength: 50,
      momentumQuality: 50
    };
    const weights = calculator.calculate(regime);
    expect(weights.LSTM).toBeGreaterThan(0.35);
  });
});
```

**Step 2: テスト実行**

```bash
cd trading-platform && npm test -- --testPathPattern="adaptive-weight-calculator" --passWithNoTests
```

**Step 3: 実装**

```typescript
// trading-platform/app/lib/services/adaptive-weight-calculator.ts
import { MarketRegime } from './market-regime-detector';

export interface EnsembleWeights {
  RF: number;
  XGB: number;
  LSTM: number;
}

const WEIGHT_MAP: Record<MarketRegime['type'], EnsembleWeights> = {
  TRENDING_UP: { RF: 0.30, XGB: 0.40, LSTM: 0.30 },
  TRENDING_DOWN: { RF: 0.35, XGB: 0.35, LSTM: 0.30 },
  RANGING: { RF: 0.45, XGB: 0.35, LSTM: 0.20 },
  VOLATILE: { RF: 0.25, XGB: 0.30, LSTM: 0.45 }
};

export class AdaptiveWeightCalculator {
  calculate(regime: MarketRegime): EnsembleWeights {
    const baseWeights = WEIGHT_MAP[regime.type];
    return { ...baseWeights };
  }
}
```

**Step 4: テスト実行**

```bash
cd trading-platform && npm test -- --testPathPattern="adaptive-weight-calculator"
```

**Step 5: コミット**

```bash
git add trading-platform/app/lib/services/adaptive-weight-calculator.ts trading-platform/app/lib/services/__tests__/adaptive-weight-calculator.test.ts && git commit -m "feat: add AdaptiveWeightCalculator for dynamic ensemble weights"
```

---

### Task 4: Confidence Scorer

**Files:**
- Create: `trading-platform/app/lib/services/confidence-scorer.ts`
- Create: `trading-platform/app/lib/services/__tests__/confidence-scorer.test.ts`

**Step 1: テスト作成**

```typescript
// trading-platform/app/lib/services/__tests__/confidence-scorer.test.ts
import { ConfidenceScorer } from '../confidence-scorer';
import { Signal } from '@/app/types/signal';

describe('ConfidenceScorer', () => {
  it('should return confidence between 0 and 100', () => {
    const scorer = new ConfidenceScorer();
    const signal: Partial<Signal> = {
      confidence: 0.7,
      accuracy: 55
    };
    const result = scorer.score(signal as Signal, { trendStrength: 50 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should boost confidence with high accuracy', () => {
    const scorer = new ConfidenceScorer();
    const signalLow: Partial<Signal> = { confidence: 0.5, accuracy: 40 };
    const signalHigh: Partial<Signal> = { confidence: 0.5, accuracy: 70 };
    
    const low = scorer.score(signalLow as Signal, { trendStrength: 50 });
    const high = scorer.score(signalHigh as Signal, { trendStrength: 50 });
    
    expect(high).toBeGreaterThan(low);
  });
});
```

**Step 2: テスト実行**

```bash
cd trading-platform && npm test -- --testPathPattern="confidence-scorer" --passWithNoTests
```

**Step 3: 実装**

```typescript
// trading-platform/app/lib/services/confidence-scorer.ts
import { Signal } from '@/app/types/signal';

interface RegimeInfo {
  trendStrength: number;
}

export class ConfidenceScorer {
  score(signal: Signal, regimeInfo: RegimeInfo): number {
    let confidence = signal.confidence * 100;
    
    if (signal.accuracy && signal.accuracy > 50) {
      confidence += (signal.accuracy - 50) * 0.2;
    }
    
    if (regimeInfo.trendStrength > 50) {
      confidence += 5;
    }
    
    return Math.min(100, Math.max(0, confidence));
  }

  getConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score > 70) return 'HIGH';
    if (score > 50) return 'MEDIUM';
    return 'LOW';
  }
}
```

**Step 4: テスト実行**

```bash
cd trading-platform && npm test -- --testPathPattern="confidence-scorer"
```

**Step 5: コミット**

```bash
git add trading-platform/app/lib/services/confidence-scorer.ts trading-platform/app/lib/services/__tests__/confidence-scorer.test.ts && git commit -m "feat: add ConfidenceScorer for signal quality assessment"
```

---

### Task 5: Prediction Calculator統合

**Files:**
- Modify: `trading-platform/app/lib/services/implementations/prediction-calculator.ts`

**Step 1: 現状確認**

```bash
cd trading-platform && head -100 app/lib/services/implementations/prediction-calculator.ts
```

**Step 2: 動的重み対応**

`prediction-calculator.ts` に `AdaptiveWeightCalculator` を統合し、固定重みから動的重みに変更。

**Step 3: 型チェック**

```bash
cd trading-platform && npx tsc --noEmit
```

**Step 4: テスト実行**

```bash
cd trading-platform && npm test -- --testPathPattern="prediction-calculator"
```

**Step 5: コミット**

```bash
git add trading-platform/app/lib/services/implementations/prediction-calculator.ts && git commit -m "feat: integrate adaptive weights into prediction calculator"
```

---

## Phase 3: Feedback Loop System

### Task 6: Signal Tracker拡張

**Files:**
- Modify: `trading-platform/app/store/signalHistoryStore.ts`
- Modify: `trading-platform/app/types/signal.ts`

**Step 1: 型拡張**

`Signal` 型に `expectedReturn`, `actualReturn`, `evaluatedAt` を追加（既に追加済みなら確認）

**Step 2: Store拡張**

```typescript
// 追加する機能
- evaluateSignal(symbol, generatedAt, actualReturn): 結果を評価
- getStatsBySymbol(symbol): 銘柄別統計
- getStatsByConfidence(): 確信度別統計
```

**Step 3: テスト**

```bash
cd trading-platform && npm test -- --testPathPattern="signalHistoryStore"
```

**Step 4: コミット**

```bash
git add trading-platform/app/store/signalHistoryStore.ts && git commit -m "feat: extend signal tracker with evaluation and stats"
```

---

### Task 7: Result Analyzer

**Files:**
- Create: `trading-platform/app/lib/services/result-analyzer.ts`
- Create: `trading-platform/app/lib/services/__tests__/result-analyzer.test.ts`

**Step 1: テスト作成**

**Step 2: 実装**

分析機能:
- 全体勝率
- 期待リターン
- 銘柄別精度
- 確信度別精度

**Step 3: テスト実行**

**Step 4: コミット**

---

## Phase 4: UI導線

### Task 8: AI推奨パネル

**Files:**
- Create: `trading-platform/app/components/AIRecommendationPanel.tsx`
- Create: `trading-platform/app/components/__tests__/AIRecommendationPanel.test.tsx`

**Step 1: テスト作成**

**Step 2: 実装**

```typescript
// 表示内容
- 銘柄コード・名前
- シグナル（BUY/SELL/HOLD）
- 確信度（高・中・低で色分け）
- 期待リターン
```

**Step 3: テスト実行**

**Step 4: コミット**

---

### Task 9: メインページ統合

**Files:**
- Modify: `trading-platform/app/page.tsx`

**Step 1: AI推奨パネル追加**

チャート上部に配置

**Step 2: 型チェック**

**Step 3: 動作確認**

```bash
cd trading-platform && npm run dev
```

**Step 4: コミット**

---

### Task 10: 推奨ページ作成

**Files:**
- Create: `trading-platform/app/recommendations/page.tsx`
- Create: `trading-platform/app/recommendations/layout.tsx`

**Step 1: ページ作成**

**Step 2: ナビゲーション追加**

**Step 3: コミット**

---

## Phase 5: 統合テスト

### Task 11: E2Eテスト

**Files:**
- Create: `trading-platform/e2e/recommendations.spec.ts`

**Step 1: テストシナリオ**

- 推奨パネル表示
- クリックでチャート遷移
- シグナル履歴確認

**Step 2: テスト実行**

```bash
cd trading-platform && npm run test:e2e
```

**Step 3: コミット**

---

## 最終確認

- [ ] 全テスト通過
- [ ] 型チェック通過
- [ ] Lint通過
- [ ] ビルド成功
