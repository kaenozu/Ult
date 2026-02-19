# PR #1000 フォローアップアクションアイテム

このドキュメントは、PR #1000（Signal Quality Engine Phase 2）のレビュー後に対応が必要な項目をリストアップしています。

---

## 🔴 CRITICAL: 優先度最高（即時対応必要）

### 1. AdaptiveWeightCalculatorの統合

**問題**:
現在、`AdaptiveWeightCalculator`は実装されているが、実際のML予測パイプラインで使用されていません。

**対応箇所**:
- `app/lib/services/ml-model-service.ts`
- `app/lib/services/model-registry.ts`
- `app/lib/services/prediction-service.ts`

**実装例**:

```typescript
// app/lib/services/ml-model-service.ts
import { AdaptiveWeightCalculator } from './adaptive-weight-calculator';
import { MarketRegimeDetector } from './market-regime-detector';

export class MLModelService {
  private weightCalculator = new AdaptiveWeightCalculator();
  private regimeDetector = new MarketRegimeDetector();
  private currentWeights: EnsembleWeights;

  async predict(data: OHLCV[], symbol: string): Promise<ModelPrediction> {
    // ステップ1: 市場レジームを検出
    const regime = this.regimeDetector.detect(data);
    
    // ステップ2: レジームに基づいて動的に重みを更新
    this.currentWeights = this.weightCalculator.calculate(regime);
    
    // ステップ3: 各モデルで予測
    const rfPrediction = await this.rfModel.predict(features);
    const xgbPrediction = await this.xgbModel.predict(features);
    const lstmPrediction = await this.lstmModel.predict(features);
    
    // ステップ4: 動的重みでアンサンブル
    const ensemblePrediction = 
      this.currentWeights.RF * rfPrediction +
      this.currentWeights.XGB * xgbPrediction +
      this.currentWeights.LSTM * lstmPrediction;
    
    return {
      rfPrediction,
      xgbPrediction,
      lstmPrediction,
      ensemblePrediction,
      confidence: this.calculateConfidence(predictions, regime),
    };
  }
  
  // 市場レジームが変化したときに重みを更新
  onRegimeChange(newRegime: MarketRegime): void {
    this.currentWeights = this.weightCalculator.calculate(newRegime);
    console.log(`[ML] Regime changed to ${newRegime.type}, updated weights:`, this.currentWeights);
  }
}
```

**検証方法**:
```typescript
// テストコード追加
it('should use adaptive weights based on market regime', () => {
  const service = new MLModelService();
  const trendingRegime = { type: 'TRENDING_UP', /* ... */ };
  const rangingRegime = { type: 'RANGING', /* ... */ };
  
  service.onRegimeChange(trendingRegime);
  // XGBが高い重みを持つことを検証
  
  service.onRegimeChange(rangingRegime);
  // RFが高い重みを持つことを検証
});
```

**期待される効果**:
- 市場状況に応じた最適なモデル選択
- トレンド相場でXGB優位、レンジ相場でRF優位
- 予測精度の向上（バックテストで検証可能）

---

## 🟡 MEDIUM: 優先度中（1週間以内に対応）

### 2. ConfidenceScorerの数式改善

**問題**:
現在の線形スケーリングは confidence の違いを適切に反映していません。

**対応箇所**:
- `app/lib/services/confidence-scorer.ts`

**改善実装**:

```typescript
export class ConfidenceScorer {
  score(signal: Signal, regimeInfo: RegimeInfo): number {
    // 対数スケーリングで収穫逓減を実現
    // confidence 0.5 → 約50, 0.7 → 約70, 0.9 → 約90
    const baseScore = Math.log1p(signal.confidence * 10) / Math.log(11) * 100;
    
    // 精度ブースト: accuracy 50%以上で最大15ポイント
    const accuracyBoost = signal.accuracy && signal.accuracy > 50
      ? Math.min(15, (signal.accuracy - 50) / 50 * 15)
      : 0;
    
    // トレンドブースト: trendStrength 0-100で最大10ポイント
    const trendBoost = (regimeInfo.trendStrength / 100) * 10;
    
    // 合計スコア（0-100にクリップ）
    return Math.min(100, Math.max(0, baseScore + accuracyBoost + trendBoost));
  }
  
  getConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    // 閾値も見直し
    if (score >= 65) return 'HIGH';  // 70 → 65に緩和
    if (score >= 45) return 'MEDIUM'; // 50 → 45に緩和
    return 'LOW';
  }
}
```

**テスト追加**:
```typescript
describe('ConfidenceScorer - improved formula', () => {
  it('should have diminishing returns for high confidence', () => {
    const scorer = new ConfidenceScorer();
    const signal50 = createMockSignal({ confidence: 0.5 });
    const signal90 = createMockSignal({ confidence: 0.9 });
    
    const score50 = scorer.score(signal50, { trendStrength: 50 });
    const score90 = scorer.score(signal90, { trendStrength: 50 });
    
    // 0.9は0.5の2倍にはならない（対数スケーリング）
    expect(score90).toBeLessThan(score50 * 2);
    expect(score90).toBeGreaterThan(score50 * 1.5);
  });
  
  it('should apply proportional accuracy boost', () => {
    const scorer = new ConfidenceScorer();
    const signal60 = createMockSignal({ confidence: 0.6, accuracy: 60 });
    const signal80 = createMockSignal({ confidence: 0.6, accuracy: 80 });
    
    const score60 = scorer.score(signal60, { trendStrength: 50 });
    const score80 = scorer.score(signal80, { trendStrength: 50 });
    
    // accuracy 80は60より高いブーストを得る
    expect(score80 - score60).toBeCloseTo(6, 1); // (80-60)/50*15 ≈ 6
  });
});
```

**期待される効果**:
- より現実的な確信度スコア分布
- HIGH判定が適度に増加（ユーザー体験向上）
- 精度とトレンド強度の影響が適切に反映

---

### 3. エラーハンドリングの追加

**問題**:
無効な入力に対するエラーハンドリングが不足しています。

**対応箇所**:
- `app/lib/services/adaptive-weight-calculator.ts`
- `app/lib/services/confidence-scorer.ts`

**実装例**:

```typescript
// adaptive-weight-calculator.ts
export class AdaptiveWeightCalculator {
  calculate(regime: MarketRegime): EnsembleWeights {
    // 入力検証
    if (!regime || !regime.type) {
      throw new Error('Invalid regime: regime and regime.type are required');
    }
    
    const baseWeights = WEIGHT_MAP[regime.type];
    if (!baseWeights) {
      throw new Error(
        `Invalid market regime type: ${regime.type}. ` +
        `Valid types are: ${Object.keys(WEIGHT_MAP).join(', ')}`
      );
    }
    
    return { ...baseWeights };
  }
}

// confidence-scorer.ts
export class ConfidenceScorer {
  score(signal: Signal, regimeInfo: RegimeInfo): number {
    // 入力検証
    if (!signal) {
      throw new Error('Signal is required');
    }
    if (signal.confidence < 0 || signal.confidence > 1) {
      throw new Error(`Invalid confidence: ${signal.confidence}. Must be between 0 and 1`);
    }
    if (!regimeInfo) {
      throw new Error('RegimeInfo is required');
    }
    
    // 既存のロジック...
  }
}
```

**テスト追加**:
```typescript
describe('Error handling', () => {
  it('should throw error for null regime', () => {
    const calculator = new AdaptiveWeightCalculator();
    expect(() => calculator.calculate(null as any)).toThrow('Invalid regime');
  });
  
  it('should throw error for invalid regime type', () => {
    const calculator = new AdaptiveWeightCalculator();
    const invalidRegime = { type: 'INVALID' as any, /* ... */ };
    expect(() => calculator.calculate(invalidRegime)).toThrow('Invalid market regime type');
  });
  
  it('should throw error for invalid confidence', () => {
    const scorer = new ConfidenceScorer();
    const signal = createMockSignal({ confidence: 1.5 }); // 無効
    expect(() => scorer.score(signal, { trendStrength: 50 })).toThrow('Invalid confidence');
  });
});
```

---

## 🟠 LOW: 優先度低（時間があれば対応）

### 4. AIRecommendationPanelのパフォーマンス最適化

**問題**:
`scorer.score()`が同じシグナルに対して2回呼ばれています。

**対応箇所**:
- `app/components/AIRecommendationPanel.tsx`

**改善実装**:

```typescript
const rankedSignals = useMemo(() => {
  return signals
    .map(s => {
      const score = scorer.score(s, { trendStrength: s.regimeInfo?.adx || 50 });
      return {
        ...s,
        score,
        level: scorer.getConfidenceLevel(score), // キャッシュされたscoreを再利用
      };
    })
    .filter(s => s.level === 'HIGH')
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
}, [signals, scorer, maxItems]);
```

**期待される効果**:
- レンダリングパフォーマンスの向上
- シグナル数が多い場合に顕著

---

### 5. MarketRegimeDetectorの重複解消

**問題**:
2つの`MarketRegimeDetector`実装が存在します：
- `app/lib/MarketRegimeDetector.ts` (396行) - オリジナル
- `app/lib/services/market-regime-detector.ts` (223行) - 新規簡易版

**対応方針**:

**オプションA: 統合**
- 新規版をオリジナルに統合
- インターフェースを共通化

**オプションB: 明確な使い分け**
- `MarketRegimeDetector` (オリジナル): 戦略推奨、詳細な分析
- `market-regime-detector` (新版): シグナル品質評価専用

**推奨**: オプションB（使い分けを文書化）

ドキュメント追加例:
```markdown
## MarketRegimeDetector の使い分け

### app/lib/MarketRegimeDetector.ts
- **用途**: 取引戦略の選択、詳細な市場分析
- **機能**: 戦略推奨、シグナル制限、詳細なレジーム情報
- **使用箇所**: WinningStrategyEngine, AnalysisService

### app/lib/services/market-regime-detector.ts
- **用途**: シグナル品質評価、アンサンブル重み計算
- **機能**: シンプルなレジーム検出（4タイプ）
- **使用箇所**: AdaptiveWeightCalculator, Signal Quality Engine
```

---

## 📋 チェックリスト

実装時は以下をチェックしてください：

### AdaptiveWeightCalculator統合
- [ ] ml-model-service.tsに統合
- [ ] 市場レジーム変化時に重みを更新
- [ ] 統合テストを追加
- [ ] バックテストで効果を検証

### ConfidenceScorer改善
- [ ] 対数スケーリングを実装
- [ ] 比例的なブースト計算を実装
- [ ] 閾値を調整
- [ ] 既存テストが全てパス
- [ ] 新規テストを追加

### エラーハンドリング
- [ ] 入力検証を追加
- [ ] エラーメッセージを明確化
- [ ] エラーケースのテストを追加

### パフォーマンス最適化
- [ ] 重複計算を削除
- [ ] パフォーマンステストで改善を確認

### ドキュメント
- [ ] README.mdを更新
- [ ] 使い分けガイドを追加
- [ ] 使用例を追加

---

## 🎯 成功基準

以下の条件を満たした時点で完了とみなします：

1. **機能統合**: 
   - AdaptiveWeightCalculatorが実際のML予測で使用されている
   - 市場レジームに応じて重みが動的に変化している

2. **テスト**:
   - 全てのテストがパス（カバレッジ80%以上維持）
   - 統合テストで動作確認

3. **ドキュメント**:
   - 使用方法が明確に記載されている
   - アーキテクチャ図が更新されている

4. **検証**:
   - バックテストで予測精度が向上していることを確認
   - 市場レジーム別の勝率が改善している

---

## 📅 推奨スケジュール

| 優先度 | タスク | 期限 | 担当 |
|-------|------|------|------|
| 🔴 CRITICAL | AdaptiveWeightCalculator統合 | 即時 | TBD |
| 🟡 MEDIUM | ConfidenceScorer改善 | 1週間以内 | TBD |
| 🟡 MEDIUM | エラーハンドリング追加 | 1週間以内 | TBD |
| 🟠 LOW | パフォーマンス最適化 | 2週間以内 | TBD |
| 🟠 LOW | ドキュメント整備 | 2週間以内 | TBD |

---

**作成日**: 2026-02-18  
**関連PR**: #1000  
**次回レビュー**: フォローアップPR提出時
