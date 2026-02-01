# Advanced Portfolio Optimization System

高度なポートフォリオ最適化手法を実装したモジュール。

## 概要

このモジュールは以下の最適化手法を提供します：

1. **Modern Portfolio Theory (MPT)** - モダンポートフォリオ理論
2. **Black-Litterman Model** - ブラック・リッターマンモデル
3. **Risk Parity** - リスクパリティ
4. **Factor Modeling** - ファクターモデリング

## インストール

モジュールは既にプロジェクトに含まれています。

```typescript
import {
  ModernPortfolioTheory,
  BlackLitterman,
  RiskParity,
  FactorModeling,
  createDefaultMPTConfig,
} from '@/app/lib/portfolioOptimization';
```

## 使用例

### 1. Modern Portfolio Theory (MPT)

効率的フロンティアの計算とポートフォリオ最適化。

```typescript
import { ModernPortfolioTheory, createDefaultMPTConfig } from '@/app/lib/portfolioOptimization';

// 設定の作成
const config = createDefaultMPTConfig();

// MPTインスタンスの作成
const mpt = new ModernPortfolioTheory(config);

// 資産データの準備
const assets = [
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    returns: [0.01, -0.005, 0.02, ...], // 日次リターン
  },
  // ... 他の資産
];

// 効率的フロンティアの計算
const frontier = mpt.calculateEfficientFrontier(assets, 50);

console.log('最小分散ポートフォリオ:', frontier.minimumVariance);
console.log('最大シャープレシオポートフォリオ:', frontier.maximumSharpe);

// 特定のターゲットリターンで最適化
const portfolio = mpt.optimizePortfolio(assets, 0.12); // 12%のターゲットリターン
console.log('最適ウェイト:', portfolio.weights);
console.log('期待リターン:', portfolio.expectedReturn);
console.log('リスク:', portfolio.standardDeviation);
console.log('シャープレシオ:', portfolio.sharpeRatio);
```

### 2. Black-Litterman Model

市場均衡に投資家の見解を統合したポートフォリオ最適化。

```typescript
import { BlackLitterman, createDefaultBlackLittermanConfig } from '@/app/lib/portfolioOptimization';
import type { View } from '@/app/lib/portfolioOptimization';

// 設定の作成
const config = createDefaultBlackLittermanConfig();

// Black-Littermanインスタンスの作成
const bl = new BlackLitterman(config);

// 投資家の見解を定義
const views: View[] = [
  {
    type: 'absolute',
    assets: ['AAPL'],
    expectedReturn: 0.15, // AAPLは15%のリターンを期待
    confidence: 0.8, // 80%の確信度
    description: 'Apple will outperform due to new product launches',
  },
  {
    type: 'relative',
    assets: ['GOOGL', 'MSFT'],
    expectedReturn: 0.05, // GOOGLはMSFTより5%高いリターンを期待
    confidence: 0.6,
    description: 'Google will outperform Microsoft',
  },
];

// 最適化の実行
const result = bl.optimizeWithBlackLitterman(assets, views);

console.log('市場均衡リターン:', result.marketReturns);
console.log('調整後リターン:', result.adjustedReturns);
console.log('最適ポートフォリオ:', result.portfolio);

// 感度分析
const sensitivity = bl.performSensitivityAnalysis(assets, views, 0.1);
console.log('感度分析結果:', sensitivity.sensitivities);
```

### 3. Risk Parity

リスク貢献度を均等化するポートフォリオ最適化。

```typescript
import { RiskParity, createDefaultRiskParityConfig } from '@/app/lib/portfolioOptimization';

// 設定の作成
const config = createDefaultRiskParityConfig();

// Risk Parityインスタンスの作成
const rp = new RiskParity(config);

// リスクパリティポートフォリオの計算
const portfolio = rp.calculateRiskParityPortfolio(assets);

console.log('ウェイト:', portfolio.weights);
console.log('リスク貢献度:', portfolio.riskContributions);
console.log('リスクバジェット:', portfolio.riskBudget);

// 各資産のリスク貢献度を確認
portfolio.riskContributions.forEach((rc, i) => {
  console.log(`${assets[i].symbol}: ${(rc.riskPercentage * 100).toFixed(2)}%`);
});

// 階層型リスクパリティ (HRP)
const hrp = rp.calculateHierarchicalRiskParity(assets);
console.log('HRPウェイト:', hrp.weights);
console.log('クラスター:', hrp.clusters);

// 動的リスクパリティ（リバランス付き）
const dynamic = rp.calculateDynamicRiskParity(assets, 252, 20);
console.log('パフォーマンス:', dynamic.performance);
```

### 4. Factor Modeling

ファクターベースのリスク分析とポートフォリオ最適化。

```typescript
import { FactorModeling, createDefaultFactorModelingConfig } from '@/app/lib/portfolioOptimization';

// 設定の作成
const config = createDefaultFactorModelingConfig();

// Factor Modelingインスタンスの作成
const fm = new FactorModeling(config);

// ファクターの抽出
const factors = fm.extractFactors(assets);

console.log('抽出されたファクター:', factors.factors);
console.log('ファクター相関:', factors.factorCorrelations);

// 各ファクターの情報
factors.factors.forEach(factor => {
  console.log(`${factor.name} (${factor.type})`);
});

// 特定の資産のファクターモデルを推定
const assetModel = fm.estimateFactorModel(assets[0], factors.factors);

console.log('ファクター感度:', assetModel.factorSensitivities);
console.log('アルファ:', assetModel.alpha);
console.log('R二乗:', assetModel.rSquared);

// ポートフォリオのリスク帰属分析
const factorModels = new Map();
assets.forEach(asset => {
  const model = fm.estimateFactorModel(asset, factors.factors);
  factorModels.set(asset.id, model);
});

const portfolio = {
  weights: [0.2, 0.2, 0.2, 0.2, 0.2], // 均等ウェイト
};

const attribution = fm.performRiskAttribution(portfolio, factorModels, factors.factors);

console.log('総リスク:', attribution.totalRisk);
console.log('ファクターリスク:', attribution.factorRisk);
console.log('固有リスク:', attribution.specificRisk);
console.log('分散効果:', attribution.diversificationEffect);
```

## API リファレンス

### Asset Type

```typescript
interface Asset {
  id: string;           // 資産ID
  symbol: string;       // ティッカーシンボル
  name: string;         // 資産名
  sector?: string;      // セクター
  returns: number[];    // 日次リターンの配列
  prices?: number[];    // 価格の配列（オプション）
  marketCap?: number;   // 時価総額（オプション）
}
```

### Portfolio Type

```typescript
interface Portfolio {
  weights: number[];           // 資産ウェイト
  expectedReturn: number;      // 期待リターン（年率）
  variance: number;            // 分散
  standardDeviation: number;   // 標準偏差（リスク）
  sharpeRatio: number;         // シャープレシオ
}
```

## 設定オプション

### MPT Config

```typescript
interface MPTConfig {
  riskFreeRate: number;        // リスクフリーレート（デフォルト: 0.02）
  optimizer: {
    maxIterations?: number;    // 最大反復回数（デフォルト: 1000）
    convergenceTolerance?: number; // 収束閾値（デフォルト: 1e-8）
  };
  covariance: {
    method?: 'sample' | 'shrinkage' | 'ledoit-wolf'; // 共分散推定法
    lookbackPeriod?: number;   // ルックバック期間（デフォルト: 252）
  };
  returns: {
    method?: 'historical' | 'exponential' | 'capm'; // リターン推定法
    lookbackPeriod?: number;   // ルックバック期間（デフォルト: 252）
  };
}
```

### Black-Litterman Config

```typescript
interface BlackLittermanConfig {
  mptConfig: MPTConfig;        // MPT設定
  viewsConfig: {
    confidenceLevel?: number;  // デフォルトの確信度
    uncertaintyScaling?: number;
  };
  tau?: number;               // τパラメータ（デフォルト: 0.05）
  riskAversion?: number;      // リスク回避係数（デフォルト: 2.5）
}
```

## パフォーマンスに関する注意

- 大規模なポートフォリオ（100資産以上）では計算時間が長くなる可能性があります
- 共分散行列の計算が主なボトルネックです
- 本番環境では、計算をWeb Workerで実行することを推奨します

## 今後の拡張

- [ ] GPUアクセラレーション
- [ ] より高速な最適化アルゴリズム（CVXPY等）
- [ ] リアルタイム最適化
- [ ] ポートフォリオ制約の強化（セクター制約、取引コストなど）

## 参考文献

1. Markowitz, H. (1952). "Portfolio Selection". Journal of Finance.
2. Black, F. & Litterman, R. (1992). "Global Portfolio Optimization". Financial Analysts Journal.
3. Maillard, S., Roncalli, T., & Teïletche, J. (2010). "The Properties of Equally Weighted Risk Contribution Portfolios". Journal of Portfolio Management.
4. Fama, E. F. & French, K. R. (1993). "Common Risk Factors in the Returns on Stocks and Bonds". Journal of Financial Economics.

## ライセンス

プロジェクトのライセンスに従います。
