# Advanced Risk Management - User Guide

## はじめに

このガイドでは、ULT取引プラットフォームの高度なリスク管理システムの使用方法について説明します。

## 目次

1. [セットアップ](#セットアップ)
2. [テールリスクヘッジ](#テールリスクヘッジ)
3. [ポートフォリオリスク監視](#ポートフォリオリスク監視)
4. [心理状態モニタリング](#心理状態モニタリング)
5. [実践的な使用例](#実践的な使用例)
6. [トラブルシューティング](#トラブルシューティング)

---

## セットアップ

### 必要なインポート

```typescript
import {
  TailRiskHedging,
  EnhancedPortfolioRiskMonitor,
  EnhancedPsychologyMonitor,
  CoolingOffManager
} from '@/app/lib/risk';
```

### 基本設定

```typescript
// ポートフォリオの準備
const portfolio = {
  cash: 100000,
  positions: [
    {
      symbol: 'AAPL',
      quantity: 100,
      entryPrice: 150,
      currentPrice: 160,
      side: 'LONG',
      market: 'US',
      timestamp: Date.now()
    }
  ],
  totalValue: 116000,
  dailyPnL: 1000,
  totalProfit: 6000,
  orders: []
};

// リスク管理コンポーネントの初期化
const hedging = new TailRiskHedging(portfolio);
const riskMonitor = new EnhancedPortfolioRiskMonitor(portfolio);
const psychMonitor = new EnhancedPsychologyMonitor();
```

---

## テールリスクヘッジ

### 1. テールリスクの評価

```typescript
// テールリスクメトリクスを計算
const tailMetrics = hedging.calculateTailRiskMetrics();

console.log('=== テールリスク分析 ===');
console.log(`テールリスク (99%): ${(tailMetrics.tailRisk * 100).toFixed(2)}%`);
console.log(`歪度: ${tailMetrics.skewness.toFixed(2)}`);
console.log(`尖度: ${tailMetrics.kurtosis.toFixed(2)}`);
console.log(`最大期待損失: ${(tailMetrics.maxExpectedLoss * 100).toFixed(2)}%`);
console.log(`テールイベント確率: ${(tailMetrics.probabilityOfTailEvent * 100).toFixed(2)}%`);
```

**解釈ガイド：**
- **テールリスク > 5%**: 高リスク、ヘッジを検討
- **歪度 < -0.5**: 負の歪度、下方リスクが高い
- **尖度 > 3**: ファットテール、極端なイベントの可能性
- **テールイベント確率 > 5%**: 警戒が必要

### 2. ヘッジ戦略の選択

```typescript
// ヘッジ推奨を生成
const recommendations = hedging.generateHedgeRecommendations();

// 上位3つの推奨を表示
console.log('\n=== ヘッジ推奨（コストベネフィット順） ===');
recommendations.slice(0, 3).forEach((rec, index) => {
  console.log(`\n${index + 1}. ${rec.strategy.type.toUpperCase()}`);
  console.log(`   優先度: ${rec.implementationPriority}`);
  console.log(`   コスト: $${rec.strategy.cost.toFixed(2)}`);
  console.log(`   期待保護: ${rec.strategy.expectedProtection.toFixed(2)}%`);
  console.log(`   コストベネフィット比: ${rec.costBenefitRatio.toFixed(2)}`);
  console.log(`   理由: ${rec.rationale}`);
});
```

### 3. 最適ヘッジポートフォリオの構築

```typescript
// 予算を設定してヘッジポートフォリオを構築
const maxHedgeBudget = 5000;
const hedgePortfolio = hedging.buildOptimalHedgePortfolio(maxHedgeBudget);

console.log('\n=== 最適ヘッジポートフォリオ ===');
let totalCost = 0;
let totalProtection = 0;

hedgePortfolio.forEach(hedge => {
  console.log(`${hedge.type}: ${hedge.quantity}単位`);
  console.log(`  コスト: $${hedge.cost.toFixed(2)}`);
  console.log(`  保護: ${hedge.expectedProtection.toFixed(2)}%`);
  
  totalCost += hedge.cost;
  totalProtection += hedge.expectedProtection;
});

console.log(`\n合計コスト: $${totalCost.toFixed(2)}`);
console.log(`合計保護: ${totalProtection.toFixed(2)}%`);
```

### 4. ヘッジのパフォーマンス評価

```typescript
// 市場が10%下落した場合のヘッジ効果を評価
const marketMove = -10;

hedgePortfolio.forEach(hedge => {
  const performance = hedging.evaluateHedgePerformance(hedge, marketMove);
  
  console.log(`\n${hedge.type}のパフォーマンス:`);
  console.log(`  保護提供: $${performance.protectionProvided.toFixed(2)}`);
  console.log(`  リターン影響: ${performance.returnImpact.toFixed(2)}%`);
  console.log(`  効率: ${performance.efficiency.toFixed(2)}x`);
});
```

---

## ポートフォリオリスク監視

### 1. リスクメトリクスの確認

```typescript
// 拡張リスクメトリクスを計算
const riskMetrics = riskMonitor.calculateEnhancedRiskMetrics();

console.log('=== ポートフォリオリスクメトリクス ===');
console.log(`VaR (95%): $${riskMetrics.realTimeVaR.var95.toFixed(2)}`);
console.log(`VaR (99%): $${riskMetrics.realTimeVaR.var99.toFixed(2)}`);
console.log(`ボラティリティ: ${(riskMetrics.volatility * 100).toFixed(2)}%`);
console.log(`最大ドローダウン: ${riskMetrics.maxDrawdown.toFixed(2)}%`);
console.log(`シャープレシオ: ${riskMetrics.sharpeRatio.toFixed(2)}`);
console.log(`市場ベータ: ${riskMetrics.enhancedBeta.market.toFixed(2)}`);
```

### 2. セクター集中度の確認

```typescript
console.log('\n=== セクター暴露 ===');
riskMetrics.sectorExposures.forEach(sector => {
  const riskLevel = {
    low: '低',
    medium: '中',
    high: '高'
  }[sector.risk];
  
  console.log(`${sector.sector}:`);
  console.log(`  暴露: ${sector.exposure.toFixed(1)}%`);
  console.log(`  銘柄数: ${sector.positions.length}`);
  console.log(`  集中度: ${sector.concentration.toFixed(3)}`);
  console.log(`  リスクレベル: ${riskLevel}`);
});
```

### 3. ポートフォリオ集中度の分析

```typescript
console.log('\n=== ポートフォリオ集中度 ===');
console.log(`HHI: ${riskMetrics.concentration.herfindahlIndex.toFixed(4)}`);
console.log(`実効ポジション数: ${riskMetrics.concentration.effectivePositions.toFixed(1)}`);
console.log(`トップ3集中度: ${riskMetrics.concentration.top3Concentration.toFixed(1)}%`);

// 集中度の評価
if (riskMetrics.concentration.herfindahlIndex > 0.25) {
  console.warn('警告: ポートフォリオの集中度が高い');
} else if (riskMetrics.concentration.effectivePositions < 5) {
  console.warn('警告: 分散が不十分');
}
```

### 4. リスクアラートの確認

```typescript
// リスク制限を設定
const riskLimits = {
  maxSectorExposure: 40,    // セクター暴露40%以下
  maxVaR95: 10000,          // VaR $10,000以下
  maxBeta: 1.5,             // ベータ1.5以下
  minLiquidity: 60          // 流動性スコア60以上
};

const alerts = riskMonitor.generateRiskAlerts(riskLimits);

if (alerts.length > 0) {
  console.log('\n=== リスクアラート ===');
  
  alerts.forEach(alert => {
    const severityIcon = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    }[alert.severity];
    
    console.log(`\n${severityIcon} ${alert.type.toUpperCase()}`);
    console.log(`  ${alert.message}`);
    console.log(`  現在値: ${alert.currentValue.toFixed(2)}`);
    console.log(`  制限値: ${alert.threshold.toFixed(2)}`);
    console.log(`  推奨: ${alert.recommendation}`);
  });
} else {
  console.log('\n✅ リスクは制限内です');
}
```

---

## 心理状態モニタリング

### 1. 取引セッションの開始

```typescript
// 取引セッションを開始
psychMonitor.startSession();
console.log('取引セッション開始');
```

### 2. 行動メトリクスの確認

```typescript
// 拡張行動メトリクスを分析
const behaviorMetrics = psychMonitor.analyzeEnhancedBehavior();

console.log('=== 取引行動分析 ===');
console.log(`ティルトスコア: ${behaviorMetrics.tiltScore.toFixed(0)}/100`);
console.log(`規律スコア: ${behaviorMetrics.disciplineScore.toFixed(0)}/100`);
console.log(`衝動性: ${behaviorMetrics.impulsivityScore.toFixed(0)}/100`);
console.log(`感情的ボラティリティ: ${behaviorMetrics.emotionalVolatility.toFixed(1)}`);
console.log(`連続損失: ${behaviorMetrics.consecutiveLosses}回`);
console.log(`過度取引スコア: ${behaviorMetrics.overTradingScore.toFixed(0)}/100`);
console.log(`取引品質トレンド: ${behaviorMetrics.tradeQualityTrend}`);

// ティルトスコアの評価
if (behaviorMetrics.tiltScore > 70) {
  console.error('🚨 危険: 重度のティルト状態');
} else if (behaviorMetrics.tiltScore > 50) {
  console.warn('⚠️ 警告: ティルトの兆候');
} else {
  console.log('✅ 心理状態は良好');
}
```

### 3. ティルト指標の検出

```typescript
// ティルト指標を検出
const tiltIndicators = psychMonitor.detectTiltIndicators();

console.log('\n=== ティルト指標 ===');
const indicators = {
  rapidFireTrading: '連射取引',
  positionSizeEscalation: 'ポジションサイズ急増',
  stopLossIgnorance: 'ストップロス無視',
  revengeTrading: 'リベンジトレード',
  overconfidence: '過信',
  panicSelling: 'パニック売り'
};

let indicatorCount = 0;
Object.entries(tiltIndicators).forEach(([key, detected]) => {
  if (detected) {
    console.warn(`⚠️ ${indicators[key as keyof typeof indicators]}: 検出`);
    indicatorCount++;
  }
});

if (indicatorCount === 0) {
  console.log('✅ ティルト指標は検出されていません');
} else {
  console.warn(`警告: ${indicatorCount}個のティルト指標が検出されました`);
}
```

### 4. 心理状態の評価

```typescript
// 心理状態を評価
const psychState = psychMonitor.evaluatePsychologicalState();

console.log('\n=== 心理状態評価 ===');
console.log(`総合状態: ${psychState.overall}`);
console.log(`感情: ${psychState.emotional}`);
console.log(`信頼度: ${psychState.confidence.toFixed(0)}%`);
console.log(`集中力: ${psychState.focus.toFixed(0)}%`);
console.log(`ストレス: ${psychState.stress.toFixed(0)}%`);
console.log(`\n推奨: ${psychState.recommendation}`);

// 状態別の警告
const stateMessages = {
  healthy: '✅ 健全な状態です',
  stressed: '⚠️ ストレスを感じています',
  tilted: '🚨 ティルト状態です - 取引を停止してください',
  burnout: '🚨 バーンアウトの兆候 - 長期休暇が必要です'
};

console.log(stateMessages[psychState.overall]);
```

### 5. 取引許可のチェック

```typescript
// 取引を記録
const order = {
  symbol: 'AAPL',
  side: 'BUY' as const,
  quantity: 100,
  price: 150,
  timestamp: Date.now()
};

// 取引前のチェック
const canTrade = psychMonitor.canTrade();

if (canTrade.allowed) {
  console.log('✅ 取引が許可されています');
  psychMonitor.recordTrade(order);
  console.log('取引を記録しました');
} else {
  console.error('❌ 取引は許可されていません');
  console.error(`理由: ${canTrade.reason}`);
  
  if (canTrade.cooldownRemaining) {
    console.error(`冷却期間残り: ${canTrade.cooldownRemaining}分`);
  }
}
```

### 6. 冷却期間の管理

```typescript
// 冷却期間マネージャーを取得
const coolingOff = psychMonitor.getCoolingOffManager();

// 現在の冷却期間を確認
const currentCooldown = coolingOff.getCurrentCooldown();

if (currentCooldown) {
  console.log('\n=== 冷却期間中 ===');
  console.log(`開始時刻: ${currentCooldown.startTime.toLocaleString()}`);
  console.log(`終了時刻: ${currentCooldown.endTime.toLocaleString()}`);
  console.log(`理由: ${currentCooldown.reason.description}`);
  console.log(`重症度: ${currentCooldown.reason.severity}/10`);
  
  const remaining = coolingOff.getRemainingCooldownTime();
  if (remaining) {
    console.log(`残り時間: ${remaining.hours.toFixed(1)}時間`);
  }
}

// 冷却期間の統計
const stats = coolingOff.getCooldownStats();
console.log('\n=== 冷却期間統計 ===');
console.log(`総冷却回数: ${stats.totalCooldowns}回`);
console.log(`総違反回数: ${stats.totalViolations}回`);
console.log(`平均期間: ${stats.averageDuration}分`);
console.log(`遵守率: ${stats.complianceRate.toFixed(1)}%`);
```

### 7. セッションの終了

```typescript
// 取引セッションを終了
psychMonitor.endSession();
console.log('\n取引セッション終了');
```

---

## 実践的な使用例

### 日次リスクレビュー

```typescript
function dailyRiskReview() {
  console.log('========================================');
  console.log('       日次リスクレビュー');
  console.log('========================================\n');
  
  // 1. ポートフォリオリスク
  const riskMetrics = riskMonitor.calculateEnhancedRiskMetrics();
  console.log('【ポートフォリオリスク】');
  console.log(`VaR (95%): $${riskMetrics.realTimeVaR.var95.toFixed(2)}`);
  console.log(`最大ドローダウン: ${riskMetrics.maxDrawdown.toFixed(2)}%`);
  console.log(`シャープレシオ: ${riskMetrics.sharpeRatio.toFixed(2)}`);
  
  // 2. テールリスク
  hedging.updateReturns(getPortfolioReturns());
  const tailMetrics = hedging.calculateTailRiskMetrics();
  console.log('\n【テールリスク】');
  console.log(`テールリスク: ${(tailMetrics.tailRisk * 100).toFixed(2)}%`);
  
  if (tailMetrics.tailRisk > 0.05) {
    console.log('\nヘッジを検討してください:');
    const hedgeRecs = hedging.generateHedgeRecommendations();
    hedgeRecs.slice(0, 2).forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.strategy.type}: $${rec.strategy.cost.toFixed(2)}`);
    });
  }
  
  // 3. 心理状態
  const psychMetrics = psychMonitor.analyzeEnhancedBehavior();
  console.log('\n【心理状態】');
  console.log(`ティルトスコア: ${psychMetrics.tiltScore.toFixed(0)}/100`);
  console.log(`規律スコア: ${psychMetrics.disciplineScore.toFixed(0)}/100`);
  
  console.log('\n========================================\n');
}
```

### 取引前チェックリスト

```typescript
function preTradeChecklist(): boolean {
  console.log('取引前チェックリスト実行中...\n');
  
  let passed = true;
  
  // 1. 心理状態チェック
  const canTrade = psychMonitor.canTrade();
  console.log(`✓ 心理状態: ${canTrade.allowed ? '合格' : '不合格'}`);
  if (!canTrade.allowed) {
    console.log(`  理由: ${canTrade.reason}`);
    passed = false;
  }
  
  // 2. リスク制限チェック
  const alerts = riskMonitor.generateRiskAlerts({
    maxSectorExposure: 40,
    maxVaR95: 10000
  });
  console.log(`✓ リスク制限: ${alerts.length === 0 ? '合格' : '不合格'}`);
  if (alerts.length > 0) {
    console.log(`  アラート: ${alerts.length}件`);
    passed = false;
  }
  
  // 3. 資金チェック
  const hasEnoughCash = portfolio.cash > 1000;
  console.log(`✓ 資金: ${hasEnoughCash ? '合格' : '不合格'}`);
  if (!hasEnoughCash) {
    passed = false;
  }
  
  console.log(`\n結果: ${passed ? '✅ 取引可能' : '❌ 取引不可'}\n`);
  return passed;
}
```

---

## トラブルシューティング

### Q: ティルトスコアが異常に高い

**A:** 以下を確認してください：
1. 最近の連続損失回数
2. 取引頻度（過度な取引）
3. ポジションサイズの変化
4. ストップロスの遵守状況

**対処法：**
- 強制的に休憩を取る
- ポジションサイズを半分に減らす
- 確実性の高いセットアップのみを取る

### Q: VaRが制限を超えている

**A:** 以下の対策を検討：
1. ポジションサイズを削減
2. 相関の高いポジションを整理
3. ヘッジを追加
4. レバレッジを下げる

### Q: セクター集中度が高い

**A:** 分散を改善：
1. 他のセクターの銘柄を追加
2. 集中しているセクターのポジションを削減
3. ETFで分散を図る

### Q: 冷却期間が頻繁に発動される

**A:** 取引戦略を見直す：
1. 取引頻度を減らす
2. リスク管理ルールを厳格化
3. エントリー基準を厳しくする
4. ポジションサイズを小さくする

---

## まとめ

このガイドでは、ULT取引プラットフォームの高度なリスク管理システムの使用方法を説明しました。

**重要なポイント：**
1. 定期的にリスクメトリクスを確認する
2. アラートには速やかに対応する
3. 心理状態を常に監視する
4. 冷却期間を厳守する
5. ヘッジ戦略を適切に活用する

継続的なリスク管理により、長期的な成功を目指しましょう。
