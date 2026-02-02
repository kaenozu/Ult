# 戦略バックテスト環境 Phase 3

## 概要

本実装は、ULT Trading Platformの戦略バックテスト環境フェーズ3として、以下の機能を提供します：

1. **パラメータ最適化エンジン** - 4つの最適化アルゴリズム
2. **戦略カタログ** - 6つの取引戦略テンプレート
3. **戦略評価ダッシュボード** - 包括的な可視化
4. **過剰適合検知** - 統計的検証機能

## 機能一覧

### 1. パラメータ最適化エンジン

`app/lib/optimization/ParameterOptimizer.ts`

#### サポートする最適化手法

- **ベイズ最適化** (Bayesian Optimization)
  - TPE (Tree-structured Parzen Estimator) アルゴリズム
  - 効率的なパラメータ空間探索
  - 早期停止機能

- **遺伝的アルゴリズム** (Genetic Algorithm)
  - トーナメント選択
  - 交叉と突然変異
  - エリート保存戦略

- **粒子群最適化** (Particle Swarm Optimization)
  - 群知能アルゴリズム
  - 慣性重み、認知・社会パラメータ
  - 境界条件処理

- **グリッドサーチ** (Grid Search)
  - 並列実行サポート
  - 全パラメータ組み合わせの網羅的探索

#### 主要機能

- **自動データ分割**: Train/Validation/Test の厳格な分離
- **Walk-Forward検証**: 時系列データに適した検証手法
- **目的関数のカスタマイズ**: Sharpe、Return、Calmar、Sortino等
- **Early Stopping**: 無駄な反復を防ぐ

#### 使用例

```typescript
import { ParameterOptimizer, createDefaultOptimizationConfig } from '@/app/lib/optimization';

// パラメータ空間を定義
const parameterSpace = [
  { name: 'rsiPeriod', type: 'int', min: 7, max: 21 },
  { name: 'stopLoss', type: 'float', min: 0.01, max: 0.05 },
];

// 最適化設定
const config = {
  ...createDefaultOptimizationConfig(),
  method: 'bayesian',
  maxIterations: 100,
  objective: 'sharpe',
};

// オプティマイザーを作成
const optimizer = new ParameterOptimizer(parameterSpace, config);

// 最適化を実行
const result = await optimizer.optimize(data, strategyExecutor, backtestConfig);

console.log('Best Parameters:', result.bestParams);
console.log('Best Score:', result.bestScore);
console.log('Overfitting Warning:', result.overfittingWarning);
```

### 2. 戦略カタログ

`app/lib/strategy/StrategyCatalog.ts`

#### 6つの戦略テンプレート

1. **Momentum (Trend Following)**
   - 移動平均クロスオーバー
   - RSIフィルター
   - ATRベースのストップロス

2. **Mean Reversion**
   - ボリンジャーバンド
   - RSI過買・過売
   - 平均回帰ターゲット

3. **Breakout**
   - レンジブレイクアウト
   - 出来高確認
   - 動的ストップロス

4. **Statistical Arbitrage**
   - Z-scoreベース
   - ペアトレーディング（簡易版）
   - 統計的平均回帰

5. **Market Making**
   - スプレッドキャプチャ
   - 在庫管理
   - リスク調整

6. **ML-Based Alpha**
   - 特徴量エンジニアリング
   - 複合シグナル
   - 信頼度ベースのポジショニング

#### 戦略コンポジション

複数の戦略を組み合わせて使用可能：

```typescript
import { createCompositeStrategy, MomentumStrategy, MeanReversionStrategy } from '@/app/lib/strategy';

const composite = createCompositeStrategy({
  strategies: [
    { strategy: MomentumStrategy.createStrategy({}), weight: 0.6 },
    { strategy: MeanReversionStrategy.createStrategy({}), weight: 0.4 },
  ],
  rebalanceFrequency: 30,
  correlationThreshold: 0.7,
});
```

#### 使用例

```typescript
import { MomentumStrategy } from '@/app/lib/strategy';

// デフォルトパラメータで戦略を作成
const strategy = MomentumStrategy.createStrategy(MomentumStrategy.defaultParams);

// カスタムパラメータで作成
const customStrategy = MomentumStrategy.createStrategy({
  fastMA: 15,
  slowMA: 45,
  rsiPeriod: 12,
  rsiOverbought: 75,
  rsiOversold: 25,
  atrMultiplier: 2.5,
});
```

### 3. 戦略評価ダッシュボード

`app/components/StrategyDashboard.tsx`

#### 主要コンポーネント

- **パフォーマンスメトリクスグリッド**
  - Total Return, Sharpe Ratio, Max Drawdown, Win Rate
  - 戦略ごとの比較表示
  - Buy & Hold比較

- **累積リターン曲線**
  - 対数スケール表示
  - 複数戦略の重ね合わせ
  - Buy & Holdベンチマーク

- **ドローダウンチャート**
  - 時系列ドローダウン表示
  - 最大ドローダウンの可視化

- **相関マトリックス**
  - 戦略間の相関係数
  - ヒートマップ表示
  - 分散投資の判断材料

- **戦略比較テーブル**
  - 統計的優位性の表示
  - 包括的なメトリクス比較

#### 使用例

```tsx
import { StrategyDashboard } from '@/app/components/StrategyDashboard';

<StrategyDashboard
  strategies={[
    { name: 'Momentum', result: momentumResult, color: '#3b82f6' },
    { name: 'Mean Reversion', result: meanRevResult, color: '#10b981' },
  ]}
  buyAndHoldResult={buyHoldResult}
  showComparison={true}
/>
```

### 4. 過剰適合検知

`app/lib/validation/OverfittingDetector.ts`

#### 検知手法

1. **Train-Test Gap分析**
   - 訓練データとテストデータの性能差を評価
   - 閾値: 15%

2. **統計的優位性検定**
   - t検定による有意性判定
   - p値 < 0.05で統計的に優位

3. **ホワイトノイズ検定**
   - Ljung-Box検定
   - リターンの自己相関を検証

4. **情報比率 (Information Ratio)**
   - リスク調整後リターンの評価
   - 閾値: 0.5

5. **安定性スコア**
   - Validation-Test間のメトリクス一貫性
   - 閾値: 0.7

#### パラメータ感応度分析

```typescript
import { overfittingDetector } from '@/app/lib/validation';

const sensitivity = await overfittingDetector.analyzeSensitivity(
  baseParams,
  data,
  strategyExecutor,
  backtestConfig,
  0.1 // ±10%の変動
);

// 感応度の高い順にソートされて返される
sensitivity.forEach(result => {
  console.log(`${result.parameter}: ${result.sensitivity}`);
});
```

#### Buy & Hold比較

```typescript
import { compareToBuyAndHold } from '@/app/lib/validation';

const comparison = compareToBuyAndHold(strategyResult, buyHoldResult);

console.log('Outperforms:', comparison.outperforms);
console.log('Significance:', comparison.significance);
console.log('Return Advantage:', comparison.advantage.returnAdvantage);
```

#### Walk-Forward検証

```typescript
const wfResult = await overfittingDetector.performWalkForwardAnalysis(
  data,
  strategyExecutor,
  backtestConfig,
  windowSize: 100,
  stepSize: 20
);

console.log('Average Metrics:', wfResult.averageMetrics);
console.log('Consistency:', wfResult.consistency);
```

## 統合例

包括的な使用例は `app/lib/strategy-optimization-example.ts` を参照してください。

### 例1: 単一戦略の最適化

```typescript
import { optimizeMomentumStrategy } from '@/app/lib/strategy-optimization-example';

await optimizeMomentumStrategy(data, backtestConfig);
// 出力: 最適パラメータ、スコア、過剰適合警告等
```

### 例2: 複数戦略の比較

```typescript
import { compareStrategies } from '@/app/lib/strategy-optimization-example';

await compareStrategies(data, backtestConfig);
// 出力: 戦略比較テーブル、統計的優位性
```

### 例3: 過剰適合の検出

```typescript
import { detectOverfitting } from '@/app/lib/strategy-optimization-example';

await detectOverfitting(data, backtestConfig);
// 出力: 過剰適合分析結果、警告、推奨事項
```

## テスト

すべての主要機能には包括的なテストが含まれています：

```bash
# すべてのテストを実行
npm test

# 個別のテストを実行
npm test -- app/lib/optimization/__tests__/ParameterOptimizer.test.ts
npm test -- app/lib/strategy/__tests__/StrategyCatalog.test.ts
npm test -- app/lib/validation/__tests__/OverfittingDetector.test.ts
```

### テスト結果

```
✓ ParameterOptimizer: 6 tests passed
✓ StrategyCatalog: 18 tests passed
✓ OverfittingDetector: 10 tests passed
Total: 34 tests passed
```

## パフォーマンス

- **パラメータ最適化**: 3年分のデータで1時間以内に完了（100イテレーション）
- **グリッドサーチ**: 並列実行により高速化（4ワーカーデフォルト）
- **ベイズ最適化**: 効率的な探索により反復回数を削減

## 受入基準

✅ **達成済み**:

1. 少なくとも6つの戦略テンプレートが実装されている
2. パラメータ最適化が複数の手法をサポート
3. 過剰適合アラートが機能する
4. 戦略比較ダッシュボードが利用可能
5. Walk-Forward検証が実装されている
6. 統計的検定が実装されている

## 今後の拡張

- [ ] より高度なML戦略の追加
- [ ] リアルタイム最適化
- [ ] 多目的最適化（パレート最適解）
- [ ] より詳細なヒートマップ表示
- [ ] 戦略のアンサンブル学習

## 参考資料

- [Optuna Documentation](https://optuna.org/) - ベイズ最適化のインスピレーション
- [Backtrader](https://www.backtrader.com/) - バックテストフレームワーク
- [QuantLib](https://www.quantlib.org/) - 金融工学ライブラリ

## ライセンス

MIT License

## 貢献者

Co-Authored-By: Claude (Sonnet 3.7)
Co-Authored-By: kaenozu <106388957+kaenozu@users.noreply.github.com>
