# Enhanced Risk Management System - Integration Guide

## TRADING-003: リスク管理システムの高度化

このドキュメントは、TRADING-003で実装された高度なリスク管理システムの統合ガイドです。

## 概要

新しいリスク管理システムは4つの主要コンポーネントで構成されています：

1. **DynamicPositionSizing** - 動的ポジションサイジング
2. **CorrelationManager** - ポートフォリオ相関管理
3. **StressTestEngine** - ストレステストエンジン
4. **PsychologyMonitor** - 心理管理モニター

## インストール

すべてのコンポーネントは既にインストールされており、以下のようにインポートできます：

```typescript
import {
  DynamicPositionSizing,
  CorrelationManager,
  StressTestEngine,
  PsychologyMonitor,
  createDynamicPositionSizing,
  createCorrelationManager,
  createStressTestEngine,
  createPsychologyMonitor,
} from '@/app/lib/risk';

// 型定義
import type {
  PositionSizingConfig,
  SizingResult,
  CorrelationAnalysis,
  ConcentrationRisk,
  HedgeRecommendation,
  StressScenario,
  StressTestResult,
  MonteCarloConfig,
  MonteCarloResult,
  TradingBehaviorMetrics,
  PsychologyAlert,
} from '@/app/types/risk';
```

## 1. DynamicPositionSizing（動的ポジションサイジング）

### 目的
市場ボラティリティ、相関、信頼度に基づいて最適なポジションサイズを動的に計算します。

### 基本的な使用方法

```typescript
import { DynamicPositionSizing } from '@/app/lib/risk';
import type { PositionSizingConfig } from '@/app/types/risk';

// 設定
const config: PositionSizingConfig = {
  maxPositionSize: 100000,      // 最大ポジションサイズ（ドル）
  maxPositionPercent: 10,       // ポートフォリオの最大10%
  riskPerTrade: 2,              // 1取引あたり2%のリスク
  maxRisk: 5000,                // 最大リスク $5000
  volatilityAdjustment: true,   // ボラティリティ調整を有効化
  correlationAdjustment: true,  // 相関調整を有効化
};

// インスタンス作成
const positionSizing = new DynamicPositionSizing(config, portfolio);

// ポジションサイズ計算
const result = positionSizing.calculatePositionSize(
  'AAPL',           // シンボル
  150,              // エントリー価格
  145,              // ストップロス価格
  marketData,       // マーケットデータ
  75                // 信頼度 (0-100)
);

console.log(`推奨サイズ: ${result.recommendedSize} 株`);
console.log(`リスク額: $${result.riskAmount}`);
console.log(`理由: ${result.reasons.join(', ')}`);
```

### Kelly基準の使用

```typescript
const kellyResult = positionSizing.calculateKellyCriterion(
  0.6,    // 勝率 60%
  0.02,   // 平均勝ち 2%
  0.01,   // 平均負け 1%
  150     // エントリー価格
);
```

### リスクパリティ

```typescript
const riskParityResult = positionSizing.calculateRiskParitySizing(
  'AAPL',
  150,    // エントリー価格
  0.02    // ボラティリティ
);
```

### 動的更新

```typescript
// ボラティリティを更新
positionSizing.updateVolatility('AAPL', 0.03);

// 相関を更新
positionSizing.updateCorrelation('AAPL', 'MSFT', 0.7);
```

## 2. CorrelationManager（相関管理）

### 目的
銘柄間の相関を分析し、集中リスクを検出し、ヘッジ戦略を推奨します。

### 基本的な使用方法

```typescript
import { CorrelationManager } from '@/app/lib/risk';

const correlationMgr = new CorrelationManager();

// 価格履歴を更新
correlationMgr.updatePriceHistory('AAPL', [100, 102, 101, 103, 105]);
correlationMgr.updatePriceHistory('MSFT', [200, 201, 202, 203, 204]);

// 相関行列を計算
const matrix = correlationMgr.calculateCorrelationMatrix(['AAPL', 'MSFT', 'GOOGL']);
console.log('相関行列:', matrix.matrix);

// ペアワイズ相関
const correlation = correlationMgr.calculatePairwiseCorrelation('AAPL', 'MSFT');
console.log(`AAPL-MSFT 相関: ${correlation.toFixed(2)}`);
```

### 集中リスク検出

```typescript
// 25%以上のポジションを検出
const risks = correlationMgr.detectConcentrationRisk(portfolio, 0.25);

risks.forEach(risk => {
  console.log(`⚠️ ${risk.symbol}: ${(risk.weight * 100).toFixed(1)}% 集中`);
  console.log(`   リスクスコア: ${risk.riskScore.toFixed(1)}`);
});
```

### ヘッジ推奨

```typescript
const availableSymbols = ['GLD', 'TLT', 'VXX', 'SHY'];
const hedges = correlationMgr.generateHedgeRecommendations(
  portfolio,
  availableSymbols
);

hedges.forEach(hedge => {
  console.log(`💡 ${hedge.primarySymbol} をヘッジ: ${hedge.hedgeSymbol}`);
  console.log(`   相関: ${hedge.correlation.toFixed(2)}`);
  console.log(`   ヘッジ比率: ${(hedge.hedgeRatio * 100).toFixed(1)}%`);
  console.log(`   理由: ${hedge.reasoning}`);
});
```

### OHLCVデータから更新

```typescript
const ohlcvData = [
  { date: '2024-01-01', open: 100, high: 105, low: 99, close: 102, volume: 1000000 },
  { date: '2024-01-02', open: 102, high: 107, low: 101, close: 105, volume: 1100000 },
  // ...
];

correlationMgr.updateFromOHLCV('AAPL', ohlcvData);
```

## 3. StressTestEngine（ストレステスト）

### 目的
極端な市場シナリオをシミュレートし、ポートフォリオの耐性を評価します。

### 基本的な使用方法

```typescript
import { StressTestEngine } from '@/app/lib/risk';
import type { StressScenario } from '@/app/types/risk';

const stressTest = new StressTestEngine(portfolio);

// 履歴データを追加
stressTest.updateHistoricalData('AAPL', [0.01, -0.02, 0.03, -0.01, 0.02]);
stressTest.updateHistoricalData('MSFT', [0.02, -0.01, 0.01, 0.02, -0.01]);

// デフォルトシナリオを実行
const results = stressTest.runMultipleScenarios();

results.forEach(result => {
  console.log(`\n📊 シナリオ: ${result.scenario.name}`);
  console.log(`   影響: $${result.portfolioImpact.toFixed(2)} (${result.portfolioImpactPercent.toFixed(2)}%)`);
  console.log(`   最大ドローダウン: ${(result.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`   VaR (95%): $${result.var95.toFixed(2)}`);
  console.log(`   CVaR (95%): $${result.cvar95.toFixed(2)}`);
});
```

### カスタムシナリオ

```typescript
const customScenario: StressScenario = {
  name: 'カスタム危機',
  description: '想定される市場ショック',
  marketShock: -15,           // -15%の下落
  volatilityMultiplier: 2.5,  // ボラティリティ2.5倍
  correlationChange: 0.2      // 相関変化
};

const result = stressTest.runStressTest(customScenario);
```

### Monte Carloシミュレーション

```typescript
import type { MonteCarloConfig } from '@/app/types/risk';

const config: MonteCarloConfig = {
  numSimulations: 1000,    // 1000回シミュレーション
  timeHorizon: 30,         // 30日間
  confidenceLevel: 0.95    // 95%信頼水準
};

const mcResult = stressTest.runMonteCarloSimulation(config);

console.log(`\n🎲 Monte Carlo シミュレーション結果:`);
console.log(`   期待リターン: $${mcResult.expectedReturn.toFixed(2)}`);
console.log(`   標準偏差: $${mcResult.standardDeviation.toFixed(2)}`);
console.log(`   VaR (95%): $${mcResult.var95.toFixed(2)}`);
console.log(`   利益確率: ${(mcResult.probabilityOfProfit * 100).toFixed(1)}%`);
console.log(`   最悪ケース: $${mcResult.worstCase.toFixed(2)}`);
console.log(`   最良ケース: $${mcResult.bestCase.toFixed(2)}`);
console.log(`\nパーセンタイル:`);
console.log(`   5%: $${mcResult.percentiles.p5.toFixed(2)}`);
console.log(`   50%: $${mcResult.percentiles.p50.toFixed(2)}`);
console.log(`   95%: $${mcResult.percentiles.p95.toFixed(2)}`);
```

### 最悪ケース分析

```typescript
const worstCase = stressTest.analyzeWorstCase();

console.log(`\n💥 最悪ケース分析:`);
console.log(`   最悪の1日損失: $${worstCase.worstDayLoss.toFixed(2)}`);
console.log(`   最悪の週間損失: $${worstCase.worstWeekLoss.toFixed(2)}`);
console.log(`   最悪の月間損失: $${worstCase.worstMonthLoss.toFixed(2)}`);
console.log(`   破産確率: ${(worstCase.probabilityOfRuin * 100).toFixed(2)}%`);
```

## 4. PsychologyMonitor（心理監視）

### 目的
トレーダーの行動を監視し、感情的な取引や過度なリスクテイクを防ぎます。

### 基本的な使用方法

```typescript
import { PsychologyMonitor } from '@/app/lib/risk';

const psychMonitor = new PsychologyMonitor();

// セッション開始
psychMonitor.startSession();

// 取引を記録
orders.forEach(order => {
  psychMonitor.recordTrade(order);
});

// 行動分析
const metrics = psychMonitor.analyzeTradingBehavior();

console.log(`\n🧠 トレーディング行動分析:`);
console.log(`   勝率: ${(metrics.winRate * 100).toFixed(1)}%`);
console.log(`   連続勝ち: ${metrics.consecutiveWins}`);
console.log(`   連続負け: ${metrics.consecutiveLosses}`);
console.log(`   オーバートレーディングスコア: ${metrics.overTradingScore.toFixed(0)}`);
console.log(`   感情的トレーディングスコア: ${metrics.emotionalTradingScore.toFixed(0)}`);
console.log(`   平均保有時間: ${metrics.averageHoldTime.toFixed(1)}時間`);
```

### アラート生成

```typescript
const alerts = psychMonitor.generatePsychologyAlerts();

alerts.forEach(alert => {
  const emoji = alert.severity === 'high' ? '🚨' :
                alert.severity === 'medium' ? '⚠️' : 'ℹ️';
  
  console.log(`\n${emoji} ${alert.type.toUpperCase()}`);
  console.log(`   重要度: ${alert.severity}`);
  console.log(`   メッセージ: ${alert.message}`);
  console.log(`   推奨: ${alert.recommendation}`);
});
```

### リスクテイクチェック

```typescript
const proposedPosition = {
  size: 1000,
  riskAmount: 5000
};

const normalRiskAmount = 2000;

const riskCheck = psychMonitor.checkExcessiveRiskTaking(
  proposedPosition,
  normalRiskAmount
);

if (riskCheck.isExcessive) {
  console.log(`⚠️ 過度なリスク検出!`);
  console.log(`   リスク倍率: ${riskCheck.riskMultiplier.toFixed(2)}x`);
  console.log(`   推奨: ${riskCheck.recommendation}`);
}
```

### ルール違反チェック

```typescript
const rules = {
  maxTradesPerDay: 10,
  maxLossPerDay: 5000,
  requiredStopLoss: true
};

const violation = psychMonitor.checkRuleViolation(order, rules);

if (violation.hasViolation) {
  console.log(`🚫 ルール違反検出:`);
  violation.violations.forEach(v => {
    console.log(`   - ${v}`);
  });
}
```

### セッション終了

```typescript
psychMonitor.endSession();
```

## 統合例

### 完全な取引フロー

```typescript
import {
  DynamicPositionSizing,
  CorrelationManager,
  StressTestEngine,
  PsychologyMonitor
} from '@/app/lib/risk';

// 1. 初期化
const config = { /* ... */ };
const positionSizing = new DynamicPositionSizing(config, portfolio);
const correlationMgr = new CorrelationManager();
const stressTest = new StressTestEngine(portfolio);
const psychMonitor = new PsychologyMonitor();

// 2. データ更新
correlationMgr.updatePriceHistory('AAPL', priceHistory);
positionSizing.updateVolatility('AAPL', 0.03);
stressTest.updateHistoricalData('AAPL', returns);

// 3. リスク分析
const concentrationRisks = correlationMgr.detectConcentrationRisk(portfolio);
const stressResults = stressTest.runMultipleScenarios();
const behaviorMetrics = psychMonitor.analyzeTradingBehavior();

// 4. ポジションサイズ決定
const sizing = positionSizing.calculatePositionSize(
  'AAPL',
  150,
  145,
  marketData,
  75
);

// 5. 心理チェック
const riskCheck = psychMonitor.checkExcessiveRiskTaking(
  { size: sizing.recommendedSize, riskAmount: sizing.riskAmount },
  config.maxRisk
);

// 6. 取引実行（リスクが許容範囲内の場合）
if (!riskCheck.isExcessive && concentrationRisks.length === 0) {
  // 取引を実行
  const order = executeOrder(sizing);
  psychMonitor.recordTrade(order);
} else {
  console.log('⚠️ リスク警告: 取引を見送り');
}

// 7. アラート確認
const alerts = psychMonitor.generatePsychologyAlerts();
alerts.forEach(alert => handleAlert(alert));
```

## ベストプラクティス

### 1. 定期的なデータ更新
```typescript
// 価格データが更新されたら
setInterval(() => {
  correlationMgr.updatePriceHistory(symbol, latestPrices);
  positionSizing.updateVolatility(symbol, calculateVolatility(latestPrices));
}, 60000); // 1分ごと
```

### 2. ストレステストの定期実行
```typescript
// 毎日ストレステストを実行
setInterval(() => {
  const results = stressTest.runMultipleScenarios();
  notifyIfHighRisk(results);
}, 86400000); // 24時間ごと
```

### 3. 心理アラートの監視
```typescript
// 取引のたびにチェック
function onTrade(order: Order) {
  psychMonitor.recordTrade(order);
  const alerts = psychMonitor.generatePsychologyAlerts();
  
  // 高重要度アラートは即座に通知
  const highAlerts = alerts.filter(a => a.severity === 'high');
  if (highAlerts.length > 0) {
    notifyTrader(highAlerts);
  }
}
```

### 4. 相関の継続的監視
```typescript
// 相関が大きく変化したら通知
function monitorCorrelations() {
  const currentCorrelations = correlationMgr.calculateCorrelationMatrix(symbols);
  
  // 前回と比較
  if (hasSignificantChange(currentCorrelations, previousCorrelations)) {
    notifyCorrelationChange(currentCorrelations);
  }
  
  previousCorrelations = currentCorrelations;
}
```

## トラブルシューティング

### 問題: 相関計算が0を返す
**原因**: 価格履歴が不足している
**解決策**: 最低30日分の価格データを提供してください

```typescript
// 悪い例
correlationMgr.updatePriceHistory('AAPL', [100, 101]); // データ不足

// 良い例
correlationMgr.updatePriceHistory('AAPL', thirtyDaysOfPrices);
```

### 問題: Monte Carloシミュレーションが遅い
**原因**: シミュレーション回数が多すぎる
**解決策**: 回数を調整するか、Web Workerを使用

```typescript
// 高速版
const config: MonteCarloConfig = {
  numSimulations: 100,  // 1000ではなく100
  timeHorizon: 30,
  confidenceLevel: 0.95
};
```

### 問題: 心理アラートが多すぎる
**原因**: 閾値が低すぎる
**解決策**: アラート生成の閾値を調整

```typescript
// カスタム閾値の実装
const alerts = psychMonitor.generatePsychologyAlerts();
const filteredAlerts = alerts.filter(a => 
  a.severity === 'high' || a.severity === 'medium'
);
```

## パフォーマンス最適化

### 1. キャッシングの活用
```typescript
// 相関はキャッシュされるため、頻繁に呼び出しても問題なし
const correlation = correlationMgr.calculatePairwiseCorrelation('AAPL', 'MSFT');
```

### 2. バッチ更新
```typescript
// 個別更新（遅い）
symbols.forEach(symbol => {
  positionSizing.updateVolatility(symbol, vol[symbol]);
});

// バッチ更新（速い）
const updates = symbols.map(symbol => ({
  symbol,
  volatility: vol[symbol]
}));
// 一度に更新
```

### 3. 非同期処理
```typescript
// 重い計算は非同期で
async function performRiskAnalysis() {
  const [correlation, stress, behavior] = await Promise.all([
    Promise.resolve(correlationMgr.detectConcentrationRisk(portfolio)),
    Promise.resolve(stressTest.runMultipleScenarios()),
    Promise.resolve(psychMonitor.analyzeTradingBehavior())
  ]);
  
  return { correlation, stress, behavior };
}
```

## まとめ

このリスク管理システムは、トレーディングプラットフォームの安全性と収益性を大幅に向上させます。4つのコンポーネントを組み合わせることで、包括的なリスク管理が可能になります。

- **DynamicPositionSizing**: 最適なポジションサイズを自動計算
- **CorrelationManager**: ポートフォリオの多様化とヘッジ戦略
- **StressTestEngine**: 極端なシナリオへの備え
- **PsychologyMonitor**: 感情的な取引の防止

詳細については、各コンポーネントのテストファイル（`__tests__/`）を参照してください。
