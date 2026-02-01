# Enhanced Risk Management System

> **TRADING-003**: リスク管理システムの高度化

高度な機械学習ベースのトレーディングプラットフォームのための包括的なリスク管理システム。

## 🎯 概要

このシステムは、トレーダーとアルゴリズムが安全かつ効果的に取引できるよう、4つの主要コンポーネントを提供します：

```
┌─────────────────────────────────────────────────────────┐
│          Enhanced Risk Management System                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │ Dynamic Position │  │  Correlation     │             │
│  │     Sizing       │  │   Manager        │             │
│  │                  │  │                  │             │
│  │ • Volatility     │  │ • Correlation    │             │
│  │ • Correlation    │  │ • Concentration  │             │
│  │ • Kelly          │  │ • Hedge Recs     │             │
│  │ • Risk Parity    │  │                  │             │
│  └─────────────────┘  └──────────────────┘             │
│                                                           │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │  Stress Test    │  │   Psychology     │             │
│  │    Engine       │  │    Monitor       │             │
│  │                  │  │                  │             │
│  │ • Scenarios     │  │ • Behavior       │             │
│  │ • Monte Carlo   │  │ • Alerts         │             │
│  │ • Worst Case    │  │ • Rules          │             │
│  │                  │  │                  │             │
│  └─────────────────┘  └──────────────────┘             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 📦 インストール

システムは既にプロジェクトに統合されています：

```typescript
import {
  DynamicPositionSizing,
  CorrelationManager,
  StressTestEngine,
  PsychologyMonitor,
} from '@/app/lib/risk';
```

## 🚀 クイックスタート

### 1分で始める

```typescript
import { createDynamicPositionSizing } from '@/app/lib/risk';

// 1. 設定
const config = {
  maxPositionSize: 100000,
  maxPositionPercent: 10,
  riskPerTrade: 2,
  maxRisk: 5000,
  volatilityAdjustment: true,
  correlationAdjustment: true,
};

// 2. 作成
const sizing = createDynamicPositionSizing(config, portfolio);

// 3. 計算
const result = sizing.calculatePositionSize(
  'AAPL',        // シンボル
  150,           // エントリー価格
  145,           // ストップロス
  marketData,    // マーケットデータ
  75             // 信頼度
);

// 4. 使用
console.log(`推奨: ${result.recommendedSize} 株`);
console.log(`リスク: $${result.riskAmount}`);
```

## 🔑 主要機能

### 1. DynamicPositionSizing

**動的ポジションサイジング** - 市場状況に応じた最適なポジションサイズを自動計算

```typescript
// ボラティリティ調整
positionSizing.updateVolatility('AAPL', 0.03);

// Kelly基準
const kelly = positionSizing.calculateKellyCriterion(
  0.6,    // 勝率 60%
  0.02,   // 平均勝ち 2%
  0.01,   // 平均負け 1%
  150
);

// リスクパリティ
const riskParity = positionSizing.calculateRiskParitySizing(
  'AAPL',
  150,
  0.02
);
```

**特徴:**
- ✅ ボラティリティベースの自動調整
- ✅ ポートフォリオ相関を考慮
- ✅ Kelly基準による最適化
- ✅ リスクパリティアロケーション
- ✅ 信頼度ベースのサイズ調整

### 2. CorrelationManager

**相関管理** - ポートフォリオの多様化とヘッジ戦略

```typescript
const correlationMgr = createCorrelationManager();

// 相関分析
correlationMgr.updatePriceHistory('AAPL', priceHistory);
const correlation = correlationMgr.calculatePairwiseCorrelation('AAPL', 'MSFT');

// 集中リスク検出
const risks = correlationMgr.detectConcentrationRisk(portfolio, 0.25);

// ヘッジ推奨
const hedges = correlationMgr.generateHedgeRecommendations(
  portfolio,
  ['GLD', 'TLT', 'VXX']
);
```

**特徴:**
- ✅ Pearson相関係数の計算
- ✅ 相関行列の自動生成
- ✅ 集中リスクの自動検出
- ✅ 負相関資産の発見
- ✅ 最適ヘッジ比率の計算

### 3. StressTestEngine

**ストレステスト** - 極端な市場シナリオへの備え

```typescript
const stressTest = createStressTestEngine(portfolio);

// シナリオテスト
const results = stressTest.runMultipleScenarios();

// Monte Carlo
const mcResult = stressTest.runMonteCarloSimulation({
  numSimulations: 1000,
  timeHorizon: 30,
  confidenceLevel: 0.95
});

// 最悪ケース
const worstCase = stressTest.analyzeWorstCase();
```

**デフォルトシナリオ:**
| シナリオ | 下落幅 | ボラティリティ |
|---------|--------|---------------|
| Market Crash | -20% | 3.0x |
| Flash Crash | -10% | 5.0x |
| Moderate Correction | -10% | 1.5x |
| Volatility Spike | -5% | 4.0x |
| Black Swan | -30% | 10.0x |

**特徴:**
- ✅ 5つの事前定義シナリオ
- ✅ カスタムシナリオのサポート
- ✅ Monte Carloシミュレーション
- ✅ VaR/CVaR計算
- ✅ 最悪ケース分析

### 4. PsychologyMonitor

**心理監視** - 感情的な取引を防ぎ、規律を維持

```typescript
const psychMonitor = createPsychologyMonitor();

// セッション管理
psychMonitor.startSession();
psychMonitor.recordTrade(order);

// 行動分析
const metrics = psychMonitor.analyzeTradingBehavior();
console.log(`勝率: ${metrics.winRate * 100}%`);
console.log(`オーバートレード: ${metrics.overTradingScore}`);

// アラート
const alerts = psychMonitor.generatePsychologyAlerts();
alerts.forEach(alert => {
  console.log(`${alert.type}: ${alert.message}`);
});

// リスクチェック
const riskCheck = psychMonitor.checkExcessiveRiskTaking(
  proposedPosition,
  normalRisk
);
```

**アラートタイプ:**
- 🚨 **Overtrading** - 過度な取引（スコア70+）
- 😡 **Revenge Trading** - 報復取引（連続損失3+）
- 😰 **Fear** - 恐怖による取引
- 🤑 **Greed** - 欲による取引
- 😴 **Fatigue** - 疲労（4時間以上）

**特徴:**
- ✅ リアルタイム行動分析
- ✅ 4種類の心理アラート
- ✅ オーバートレーディング検出
- ✅ ルール違反チェック
- ✅ セッション管理

## 📊 統計

| メトリクス | 値 |
|----------|-----|
| **コンポーネント数** | 4 |
| **総コード行数** | 1,529 |
| **テストケース数** | 232 |
| **型定義数** | 18 |
| **ドキュメントページ** | 550+ 行 |

## 🧪 テスト

```bash
# すべてのリスク管理テストを実行
npm test -- app/lib/risk/__tests__/

# 個別コンポーネント
npm test -- DynamicPositionSizing.test.ts
npm test -- CorrelationManager.test.ts
npm test -- StressTestEngine.test.ts
npm test -- PsychologyMonitor.test.ts
```

### テストカバレッジ

```
✅ DynamicPositionSizing    49 tests
✅ CorrelationManager       56 tests
✅ StressTestEngine         67 tests
✅ PsychologyMonitor        60 tests
─────────────────────────────────────
✅ Total                   232 tests
```

## 📖 ドキュメント

- 📘 **[統合ガイド](./docs/RISK_MANAGEMENT_INTEGRATION.md)** - 完全な使用例とベストプラクティス
- 📗 **型定義** - `app/types/risk.ts`
- 📙 **テスト** - `app/lib/risk/__tests__/`

## 🎓 使用例

### 例1: 完全な取引フロー

```typescript
// 1. 初期化
const sizing = createDynamicPositionSizing(config, portfolio);
const correlation = createCorrelationManager();
const stress = createStressTestEngine(portfolio);
const psych = createPsychologyMonitor();

// 2. データ更新
correlation.updatePriceHistory('AAPL', prices);
sizing.updateVolatility('AAPL', 0.03);
stress.updateHistoricalData('AAPL', returns);

// 3. リスク分析
const concentrationRisks = correlation.detectConcentrationRisk(portfolio);
const stressResults = stress.runMultipleScenarios();
const behavior = psych.analyzeTradingBehavior();

// 4. 取引決定
if (concentrationRisks.length === 0 && behavior.emotionalTradingScore < 70) {
  const sizing = sizing.calculatePositionSize('AAPL', 150, 145, data, 75);
  
  // リスクチェック
  const check = psych.checkExcessiveRiskTaking(
    { size: sizing.recommendedSize, riskAmount: sizing.riskAmount },
    normalRisk
  );
  
  if (!check.isExcessive) {
    // ✅ 取引実行
    executeOrder(sizing);
    psych.recordTrade(order);
  }
}
```

### 例2: ポートフォリオ監視

```typescript
// 定期的なリスク監視
setInterval(async () => {
  // 相関チェック
  const correlations = correlation.calculateCorrelationMatrix(symbols);
  
  // ストレステスト
  const stressResults = stress.runMultipleScenarios();
  
  // 心理チェック
  const alerts = psych.generatePsychologyAlerts();
  
  // 高リスクの場合は通知
  if (alerts.some(a => a.severity === 'high')) {
    notifyRiskManager(alerts);
  }
  
  if (stressResults.some(r => r.portfolioImpactPercent < -15)) {
    notifyRiskManager(stressResults);
  }
}, 3600000); // 1時間ごと
```

### 例3: ヘッジ戦略

```typescript
// 集中リスクを検出してヘッジ
const risks = correlation.detectConcentrationRisk(portfolio, 0.20);

if (risks.length > 0) {
  console.log('⚠️ 集中リスク検出:');
  risks.forEach(risk => {
    console.log(`  ${risk.symbol}: ${(risk.weight * 100).toFixed(1)}%`);
  });
  
  // ヘッジ推奨を取得
  const hedges = correlation.generateHedgeRecommendations(
    portfolio,
    ['GLD', 'TLT', 'VXX', 'SHY']
  );
  
  console.log('\n💡 ヘッジ推奨:');
  hedges.forEach(hedge => {
    console.log(`  ${hedge.primarySymbol} → ${hedge.hedgeSymbol}`);
    console.log(`  比率: ${(hedge.hedgeRatio * 100).toFixed(1)}%`);
    console.log(`  理由: ${hedge.reasoning}`);
  });
}
```

## ⚡ パフォーマンス

| 操作 | 時間複雑度 | 備考 |
|-----|-----------|------|
| ポジションサイズ計算 | O(1) | 即座 |
| 相関計算 | O(n²) | キャッシング済み |
| ストレステスト | O(n) | ポジション数に比例 |
| Monte Carlo | O(m×n) | m=シミュレーション数 |
| 心理分析 | O(n) | 取引数に比例 |

### 最適化のヒント

```typescript
// ✅ 良い - バッチ更新
const symbols = ['AAPL', 'MSFT', 'GOOGL'];
symbols.forEach(s => correlation.updatePriceHistory(s, prices[s]));

// ❌ 悪い - 毎回相関を再計算
symbols.forEach(s1 => {
  symbols.forEach(s2 => {
    correlation.calculatePairwiseCorrelation(s1, s2); // キャッシュされるが無駄
  });
});

// ✅ 良い - 一度だけ計算
const matrix = correlation.calculateCorrelationMatrix(symbols);
```

## 🔒 セキュリティ

### 入力検証

すべての入力は検証されます：

```typescript
// 自動的にチェック
- 価格 > 0
- ボラティリティ >= 0
- 信頼度 0-100
- リスク額 > 0
```

### エラーハンドリング

```typescript
try {
  const result = sizing.calculatePositionSize(...);
} catch (error) {
  if (error.message.includes('Invalid')) {
    // 入力エラー
  } else {
    // その他のエラー
  }
}
```

## 🐛 トラブルシューティング

### Q: 相関が常に0を返す
**A:** 価格データが不足しています。最低30日分のデータが必要です。

```typescript
// ❌ 悪い
correlation.updatePriceHistory('AAPL', [100, 101]);

// ✅ 良い
correlation.updatePriceHistory('AAPL', thirtyDaysOfPrices);
```

### Q: Monte Carloが遅い
**A:** シミュレーション回数を減らすか、Web Workerを使用してください。

```typescript
// 高速
const config = {
  numSimulations: 100,  // 1000ではなく
  timeHorizon: 30,
  confidenceLevel: 0.95
};
```

### Q: アラートが多すぎる
**A:** 重要度でフィルタリングしてください。

```typescript
const alerts = psych.generatePsychologyAlerts();
const important = alerts.filter(a => 
  a.severity === 'high' || a.severity === 'medium'
);
```

## 🤝 貢献

このシステムは継続的に改善されています。以下のような貢献を歓迎します：

- 🐛 バグ報告
- ✨ 新機能の提案
- 📝 ドキュメントの改善
- 🧪 テストの追加

## 📝 ライセンス

このプロジェクトはプライベートです。

## 🙏 謝辞

- Kelly基準の実装は Ed Thorp の研究に基づいています
- Monte Carloシミュレーションは Black-Scholes モデルを参考にしています
- 心理監視システムは行動ファイナンスの研究に基づいています

## 📞 サポート

質問やサポートが必要な場合：

1. [統合ガイド](./docs/RISK_MANAGEMENT_INTEGRATION.md)を確認
2. テストコードを参照（`__tests__/`）
3. 型定義を確認（`app/types/risk.ts`）

---

**Built with ❤️ for safe and profitable trading**
