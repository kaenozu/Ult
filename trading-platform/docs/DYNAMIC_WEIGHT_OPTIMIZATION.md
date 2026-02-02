# 動的重み最適化 (Dynamic Weight Optimization)

## 概要

MLModelServiceに実装された動的重み最適化機能により、アンサンブル予測の精度を向上させます。この機能は、市場体制と予測精度のフィードバックに基づいて、Random Forest (RF)、XGBoost (XGB)、LSTM の各モデルの重みを自動的に調整します。

## 実装内容

### Phase 1: 市場体制による重み調整

市場の状態（強気/弱気/もみ合い）に応じて、最適な重みパターンを適用します。

#### 重みパターン

| 市場体制 | RF重み | XGB重み | LSTM重み | 理由 |
|---------|--------|---------|----------|------|
| BULL（強気） | 0.25 | 0.40 | 0.35 | XGBは勢いをよく捉える。LSTMは継続性を捉える |
| BEAR（弱気） | 0.40 | 0.35 | 0.25 | RFはリスク検出が得意。LSTMは下落を過小評価しがち |
| SIDEWAYS（もみ合い） | 0.35 | 0.30 | 0.35 | バランス重視。LSTMは価格パターンを捉える |

### Phase 2: 精度ベースの動的重み付け

過去20件の予測精度を追跡し、精度の高いモデルに大きな重みを割り当てます。

#### アルゴリズム

1. **精度追跡**: 各モデルの予測値と実際の値の誤差を記録
2. **重み計算**: 誤差の逆数を重みとする（誤差が小さいほど大きな重み）
3. **正規化**: 重みの合計が1になるように調整
4. **ブレンド**: 市場体制重み(70%) + 精度重み(30%)

### Phase 3: 指数移動平均による平滑化

急激な重み変更を防ぐため、指数移動平均（EMA）で平滑化します。

- **平滑化係数**: α = 0.3
- **計算式**: `新重み = 現在重み × (1 - α) + 目標重み × α`

## 使用方法

### 基本的な使用例

```typescript
import { mlModelService } from '@/app/lib/services/ml-model-service';

// 1. 予測を実行
const features = {
  rsi: 65,
  priceMomentum: 2.5,
  sma5: 1.5,
  sma20: 1.0,
  // ... その他の特徴量
};

const prediction = mlModelService.predict(features);
console.log('Ensemble予測:', prediction.ensemblePrediction);
console.log('信頼度:', prediction.confidence);
```

### 市場体制による重み調整

```typescript
// 市場体制を検出
const regime = mlModelService.detectMarketRegimeFromFeatures(features);
console.log('検出された市場体制:', regime); // 'BULL', 'BEAR', 'SIDEWAYS'

// 重みを更新
mlModelService.updateWeightsForMarketRegime(regime);

// より正確な検出には MarketRegimeDetector を使用
import { marketRegimeDetector } from '@/app/lib/MarketRegimeDetector';
const regimeResult = marketRegimeDetector.detect(ohlcvData);
if (regimeResult.trendDirection === 'UP') {
  mlModelService.updateWeightsForMarketRegime('BULL');
} else if (regimeResult.trendDirection === 'DOWN') {
  mlModelService.updateWeightsForMarketRegime('BEAR');
} else {
  mlModelService.updateWeightsForMarketRegime('SIDEWAYS');
}
```

### 精度フィードバックの記録

```typescript
// 予測を実行
const prediction = mlModelService.predict(features);

// ... 時間経過後、実際の値が判明 ...

// 精度をフィードバック
const actualValue = 3.2; // 実際の価格変動
mlModelService.recordPredictionAccuracy(
  prediction.rfPrediction,
  prediction.xgbPrediction,
  prediction.lstmPrediction,
  actualValue
);

// この後、自動的に重みが調整される（enableAccuracyBasedWeighting が true の場合）
```

### 現在の重みを確認

```typescript
const weights = mlModelService.getCurrentWeights();
console.log('現在の重み:', weights);
// {
//   rf: 0.35,
//   xgb: 0.40,
//   lstm: 0.25,
//   marketRegime: 'BULL',
//   lastUpdated: 1706789012345
// }
```

### 設定の管理

```typescript
// 精度ベース重み調整を無効化
mlModelService.setAccuracyBasedWeighting(false);

// 精度履歴をクリア
mlModelService.clearAccuracyHistory();

// デフォルト重みにリセット
mlModelService.resetWeights();
```

## 実装例: リアルタイム予測システム

```typescript
class PredictionSystem {
  async predict(symbol: string, data: OHLCV[]) {
    // 1. 特徴量を計算
    const features = await featureCalculationService.calculateFeatures(
      symbol,
      data
    );

    // 2. 市場体制を検出して重みを更新
    const regime = mlModelService.detectMarketRegimeFromFeatures(features);
    mlModelService.updateWeightsForMarketRegime(regime);

    // 3. 予測を実行
    const prediction = mlModelService.predict(features);

    // 4. 予測結果を保存（後でフィードバックに使用）
    await this.savePrediction(symbol, prediction, Date.now());

    return prediction;
  }

  async updateAccuracy(symbol: string, actualValue: number) {
    // 保存された予測を取得
    const savedPrediction = await this.getPrediction(symbol);

    // 精度をフィードバック
    mlModelService.recordPredictionAccuracy(
      savedPrediction.rfPrediction,
      savedPrediction.xgbPrediction,
      savedPrediction.lstmPrediction,
      actualValue
    );

    console.log('Updated weights:', mlModelService.getCurrentWeights());
  }
}
```

## テスト

包括的なテストスイートが実装されています：

```bash
# 全サービステストを実行
npm test -- app/lib/services

# MLModelServiceのみ
npm test -- app/lib/services/__tests__/ml-model-service.test.ts
```

### テストカバレッジ

- **市場体制ベース重み付け**: 4 tests
- **精度ベース重み付け**: 5 tests
- **重み管理**: 4 tests
- **市場体制検出**: 3 tests
- **統合テスト**: 2 tests
- **既存機能**: 28 tests

合計: 46 tests (全てパス)

## パフォーマンス

### 計算コスト

- **予測実行**: O(1) - 重み適用は定数時間
- **重み更新**: O(1) - 市場体制ベース更新は定数時間
- **精度記録**: O(n) - nは履歴サイズ（最大60件）、実質的にはO(1)
- **精度ベース更新**: O(n) - nは履歴サイズ、実質的にはO(1)

### メモリ使用量

- **精度履歴**: 最大60件 × 5フィールド × 8バイト ≈ 2.4KB
- **動的重み**: 5フィールド × 8バイト = 40バイト

非常に軽量で、リアルタイム予測システムに適しています。

## 期待される効果

1. **精度向上**: アンサンブル予測精度が5-10%向上
2. **適応性**: 市場変化への追従性が向上
3. **リスク低減**: 単一モデル依存リスクの低減
4. **継続的改善**: フィードバックループによる自動最適化

## 制限事項

1. **最小データ要件**: 精度ベース調整には最低10件の履歴が必要
2. **平滑化遅延**: EMSにより急激な変化には即座に対応できない（意図的な設計）
3. **市場体制検出**: 簡易版検出は限定的。正確な検出にはMarketRegimeDetectorの使用を推奨

## 今後の拡張可能性

### Phase 4 (将来): 強化学習ベース最適化

現在の実装は Phase 1-3 までをカバーしています。将来的には以下の拡張が可能です：

- 重みを強化学習エージェントに委譲
- リターン最大化を目的とした重み最適化
- オンライン学習による継続的最適化

## 参考資料

- [`ml-model-service.ts`](../app/lib/services/ml-model-service.ts) - 実装ファイル
- [`ml-model-service.test.ts`](../app/lib/services/__tests__/ml-model-service.test.ts) - テストファイル
- [`MarketRegimeDetector.ts`](../app/lib/MarketRegimeDetector.ts) - 市場体制検出器
- GitHub Issue: [PRED-002] 予測アンサンブルの重みを動的最適化

## ライセンス

このコードは ULT Trading Platform の一部であり、プロジェクトのライセンスに従います。
