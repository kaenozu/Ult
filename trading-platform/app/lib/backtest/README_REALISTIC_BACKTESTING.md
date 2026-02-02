# Realistic Backtesting Environment

## 概要 (Overview)

このモジュールは、リアルなバックテスト環境と戦略最適化のための包括的なツールセットを提供します。過去最適化を検出し、より現実的な取引シミュレーションを実現します。

This module provides a comprehensive toolkit for realistic backtesting and strategy optimization. It detects overfitting and enables more realistic trading simulation.

## 主な機能 (Key Features)

### 1. RealisticBacktestEngine

現実的な取引コストと市場インパクトを考慮したバックテストエンジン。

**Features:**
- **Market Impact Modeling**: Kyle's lambda model for volume-based market impact
- **Dynamic Slippage**: 
  - Order size-based slippage
  - Time-of-day variations (market open/close)
  - Volatility-based adjustments
- **Tiered Commission Structure**: Volume-based commission tiers
- **Transaction Cost Analysis**: Comprehensive cost breakdown
- **Execution Quality Metrics**: Slippage statistics and analysis

**使用例 (Usage Example):**
```typescript
import { RealisticBacktestEngine } from './backtest/RealisticBacktestEngine';

const config = {
  initialCapital: 100000,
  useRealisticSlippage: true,
  averageDailyVolume: 1000000,
  useTimeOfDaySlippage: true,
  useVolatilitySlippage: true,
  useTieredCommissions: true,
};

const engine = new RealisticBacktestEngine(config);
engine.loadData('AAPL', historicalData);
const result = await engine.runBacktest(strategy, 'AAPL');

console.log('Transaction Costs:', result.transactionCosts);
console.log('Execution Quality:', result.executionQuality);
```

### 2. MonteCarloSimulator

信頼区間とロバストネス分析のためのモンテカルロシミュレーター。

**Features:**
- **Multiple Resampling Methods**:
  - Bootstrap (random sampling with replacement)
  - Block Bootstrap (preserves temporal structure)
  - Parametric (generates new paths from distribution)
- **Confidence Intervals**: 95% CI for returns, Sharpe ratio, etc.
- **Robustness Score**: 0-1 scale indicating strategy consistency
- **Probability Metrics**: Success/failure probability calculation
- **Reproducible Results**: Random seed support

**使用例 (Usage Example):**
```typescript
import { MonteCarloSimulator } from './backtest/MonteCarloSimulator';

const simulator = new MonteCarloSimulator({
  numSimulations: 1000,
  confidenceLevel: 0.95,
  resampleMethod: 'bootstrap',
  randomSeed: 12345,
});

const result = await simulator.runSimulation(
  strategy,
  historicalData,
  backtestConfig,
  'AAPL'
);

console.log('Probability of Success:', result.probabilityOfSuccess);
console.log('Robustness Score:', result.robustnessScore);
console.log('95% CI:', result.statistics.confidenceIntervals.totalReturn);
```

### 3. OverfittingDetector

過度最適化を検出し、戦略の堅牢性を評価するツール。

**Features:**
- **Performance Degradation Detection**: In-sample vs out-of-sample comparison
- **Sharpe Ratio Analysis**: Risk-adjusted return degradation
- **Parameter Stability Assessment**: Parameter count and sensitivity
- **Complexity Penalty**: Trading frequency and parameter complexity
- **Walk-Forward Consistency**: Multi-period performance evaluation
- **Early Stopping Criteria**: Optimization termination recommendations

**使用例 (Usage Example):**
```typescript
import { OverfittingDetector } from './backtest/OverfittingDetector';

const detector = new OverfittingDetector();
const analysis = detector.analyze(
  inSampleResult,
  outOfSampleResult,
  walkForwardResults,
  parameters,
  complexity
);

if (analysis.overfit) {
  console.log('Warnings:', analysis.warnings);
  console.log('Recommendations:', analysis.recommendations);
}

console.log('Overfitting Score:', analysis.overfittingScore);
console.log('Confidence:', analysis.confidence);
```

## 成功指標 (Success Metrics)

このシステムは以下の目標を達成することを目指しています：

| Metric | Target | Description |
|--------|--------|-------------|
| Walk-Forward Pass Rate | >70% | 戦略が将来期間で一貫して機能する確率 |
| Backtest-Reality Correlation | >0.7 | バックテストと実パフォーマンスの相関 |
| Monte Carlo CI Accuracy | 95% | 信頼区間が実際のパフォーマンスを含む確率 |
| Overfitting Detection | >90% | 過度最適化を正確に検出する精度 |

## 完全なワークフロー例 (Complete Workflow)

```typescript
import { runAllExamples } from './backtest/RealisticBacktestingExample';

// 履歴データを用意
const historicalData = await fetchMarketData('AAPL', '2020-01-01', '2024-12-31');

// 全ての例を実行
await runAllExamples(historicalData, 'AAPL');
```

このコマンドは以下を実行します：

1. **Basic Realistic Backtest**: 市場インパクトとスリッページを含む基本的なバックテスト
2. **Monte Carlo Simulation**: 100回のシミュレーションで信頼区間を計算
3. **Overfitting Detection**: インサンプルとアウトオブサンプルの比較
4. **Complete Workflow**: ウォークフォワード分析、過度最適化チェック、モンテカルロ分析を組み合わせた完全なワークフロー

## アーキテクチャ (Architecture)

```
RealisticBacktestEngine
├── Market Impact Model (Kyle's Lambda)
├── Dynamic Slippage Calculator
│   ├── Order Size Component
│   ├── Time-of-Day Component
│   └── Volatility Component
├── Tiered Commission Structure
└── Transaction Cost Analyzer

MonteCarloSimulator
├── Resampling Engine
│   ├── Bootstrap
│   ├── Block Bootstrap
│   └── Parametric
├── Statistics Calculator
│   ├── Confidence Intervals
│   ├── Percentiles
│   └── Robustness Score
└── Result Exporter

OverfittingDetector
├── Performance Degradation Analyzer
├── Parameter Stability Checker
├── Complexity Calculator
├── Walk-Forward Validator
└── Recommendation Engine
```

## 技術詳細 (Technical Details)

### Market Impact Model

Kyle's Lambda モデルを使用して市場インパクトを計算：

```
Market Impact = λ × √(Order Size / Daily Volume)
```

where:
- λ = Market impact coefficient (default: 0.1)
- Order Size = Value of the order
- Daily Volume = Average daily trading volume

### Slippage Calculation

総スリッページは以下の要素の組み合わせ：

```
Total Slippage = Base Slippage 
                 × Time-of-Day Factor 
                 × Volatility Factor 
                 + Market Impact
```

### Robustness Score

ロバストネススコアは以下で計算：

```
Robustness = 0.3 × (1 - CV) 
           + 0.4 × P(success) 
           + 0.3 × Normalized_Sharpe
```

where:
- CV = Coefficient of Variation
- P(success) = Probability of positive return
- Normalized_Sharpe = Sharpe ratio normalized to [0, 1]

## テスト (Testing)

包括的なテストスイートが含まれています：

```bash
# 全テストを実行
npm test -- --testPathPattern="backtest"

# 特定のテストを実行
npm test -- RealisticBacktestEngine
npm test -- MonteCarloSimulator
npm test -- OverfittingDetector
```

## パフォーマンス考慮事項 (Performance Considerations)

- **Monte Carlo Simulations**: 1000シミュレーションは約1-2分かかります
- **Walk-Forward Analysis**: データサイズに応じて数分かかる場合があります
- **Memory Usage**: 大規模なシミュレーション（>5000回）はメモリを多く消費します

## ベストプラクティス (Best Practices)

1. **Always use realistic models** for production strategies
2. **Run Monte Carlo** with at least 1000 simulations for reliable CI
3. **Check overfitting** before deploying any strategy
4. **Use walk-forward analysis** for time-series sensitive strategies
5. **Set appropriate** average daily volume for accurate market impact
6. **Monitor transaction costs** - they can significantly impact returns
7. **Use random seeds** for reproducible research

## 既知の制限 (Known Limitations)

1. 市場の流動性は一定と仮定（実際には時間変動）
2. オーダーブックの深さは簡略化
3. エクストリームな市場イベントは考慮されない
4. スリッページモデルは正規分布を仮定

## 今後の改善 (Future Enhancements)

- [ ] リアルタイムオーダーブックのシミュレーション
- [ ] 適応的市場インパクトモデル
- [ ] マルチアセットポートフォリオのバックテスト
- [ ] GPUアクセラレーションによるモンテカルロ高速化
- [ ] 機械学習ベースの過度最適化検出

## 参考文献 (References)

1. Kyle, A. S. (1985). "Continuous Auctions and Insider Trading". Econometrica.
2. Prado, M. L. (2018). "Advances in Financial Machine Learning". Wiley.
3. Aronson, D. (2006). "Evidence-Based Technical Analysis". Wiley.

## ライセンス (License)

MIT License - See LICENSE file for details

## 貢献 (Contributing)

Contributions are welcome! Please read CONTRIBUTING.md for guidelines.

## サポート (Support)

Issues and questions: https://github.com/kaenozu/Ult/issues
