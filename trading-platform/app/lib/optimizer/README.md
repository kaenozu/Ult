# 勝率最大化エンジン (Win Rate Maximizer)

## 概要

**WinRateMaximizer** は、株取引で勝つための包括的な最適化エンジンです。過去の取引履歴から学習し、現在の市場状況に基づいて最適な取引戦略を提案します。

## 主要機能

### 1. 過去データからの学習
- 過去の取引シナリオを分析
- 勝ちパターンと負けパターンを識別
- 市場条件と取引結果の関連性を学習

### 2. リアルタイム最適化
- 現在の市場状況を分析
- 類似する過去のシナリオを検索
- 最適な取引アクションを推奨（BUY/SELL/HOLD/WAIT）

### 3. エントリー/エグジット最適化
- **最適なエントリー価格**: 過去の成功トレードから最適な参入タイミングを算出
- **最適なエグジット価格**: ストップロスとテイクプロフィットの自動設定
- **タイミング推奨**: 即時実行 / プルバック待ち / ブレイクアウト待ち

### 4. ポジションサイズ最適化
- ケリー基準（ハーフケリー）を使用
- 勝率に基づいた動的なポジションサイズ調整
- リスク管理パラメータの遵守

### 5. リスク評価
- 損失確率の計算
- 期待損失額の算出
- 最大ドローダウンの予測
- リスクレベルの判定（LOW/MEDIUM/HIGH）

### 6. 市場条件マッチング
- 類似シナリオの自動検出
- 市場条件の評価（EXCELLENT/GOOD/AVERAGE/POOR）
- 過去の勝率とリターンの表示

## 使用方法

### 基本的な使い方

```typescript
import { winRateMaximizer, TradeScenario } from '@/app/lib/optimizer';
import { OHLCV } from '@/app/types';

// 1. 過去の取引シナリオを学習
const historicalScenarios: TradeScenario[] = [
  {
    id: 'trade-1',
    timestamp: '2024-01-01T10:00:00Z',
    marketConditions: {
      trend: 'UP',
      volatility: 'MEDIUM',
      volume: 'HIGH',
      momentum: 2.5,
    },
    indicators: {
      rsi: 45,
      macd: 1.2,
      adx: 30,
      bbPosition: -0.2,
      smaAlignment: true,
    },
    outcome: {
      action: 'BUY',
      entryPrice: 100,
      exitPrice: 106,
      profit: 6,
      profitPercent: 6,
      holdingPeriod: 120,
      won: true,
    },
  },
  // ... more scenarios
];

winRateMaximizer.learnFromHistory(historicalScenarios);

// 2. 現在の市場データで最適化を実行
const currentMarketData: OHLCV[] = [
  // ... OHLCV data
];

const optimization = winRateMaximizer.optimize(
  currentMarketData,
  'AAPL',
  100000 // ポートフォリオ価値
);

// 3. 結果を確認
console.log('推奨アクション:', optimization.action);
console.log('信頼度:', optimization.confidence, '%');
console.log('期待勝率:', optimization.expectedWinRate, '%');
console.log('推奨ポジションサイズ:', optimization.positionSizing.recommended, '%');
console.log('エントリー価格:', optimization.optimalEntry.price);
console.log('ストップロス:', optimization.optimalExit.stopLoss);
console.log('テイクプロフィット:', optimization.optimalExit.takeProfit);
```

### カスタム設定

```typescript
import { WinRateMaximizer } from '@/app/lib/optimizer';

const customOptimizer = new WinRateMaximizer({
  minWinRateForTrade: 60,        // 取引実行の最低勝率
  maxRiskPerTrade: 1.5,           // 1トレードあたりの最大リスク（%）
  basePositionSize: 15,           // ベースポジションサイズ（%）
  maxPositionSize: 30,            // 最大ポジションサイズ（%）
  minConfidenceForTrade: 70,     // 取引実行の最低信頼度
  scenarioSimilarityThreshold: 0.75, // シナリオ類似度しきい値
});
```

## 出力データ構造

### WinRateOptimization

```typescript
interface WinRateOptimization {
  // 推奨アクション
  action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  confidence: number;           // 0-100
  expectedWinRate: number;      // 0-100
  
  // 最適なエントリー
  optimalEntry: {
    price: number;
    timing: 'IMMEDIATE' | 'WAIT_FOR_PULLBACK' | 'WAIT_FOR_BREAKOUT';
    waitCondition?: string;
    expectedDelay?: number;     // minutes
  };
  
  // 最適なエグジット
  optimalExit: {
    takeProfit: number;
    stopLoss: number;
    trailingStop: boolean;
    targetReached: boolean;
  };
  
  // ポジションサイズ
  positionSizing: {
    recommended: number;        // %
    min: number;
    max: number;
    rationale: string;
  };
  
  // 市場条件
  marketConditions: {
    match: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
    similarPastScenarios: number;
    avgWinRateInSimilarScenarios: number;
    avgReturnInSimilarScenarios: number;
  };
  
  // リスク評価
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    probabilityOfLoss: number;
    expectedLoss: number;
    maxDrawdown: number;
  };
  
  // 推奨理由と警告
  reasoning: string[];
  warnings: string[];
}
```

## アルゴリズムの詳細

### 1. シナリオ類似度計算

類似度は以下の要素の重み付け平均で計算されます：

- **トレンド一致**: 30%
- **RSI類似度**: 20%
- **MACD類似度**: 15%
- **ADX類似度**: 15%
- **ボラティリティ一致**: 10%
- **ボリューム一致**: 10%

### 2. ポジションサイズ計算

ケリー基準を使用：

```
Kelly% = W - (1-W)/R
```

- W = 勝率
- R = 平均勝ち/平均負け比率

安全のため、ハーフケリー（Kelly% / 2）を使用します。

### 3. リスクレベル判定

- **LOW**: 損失確率 < 30% かつ 平均損失 < 2%
- **MEDIUM**: 損失確率 < 50% かつ 平均損失 < 4%
- **HIGH**: 上記以外

## 推奨される使い方

### 取引前のチェックリスト

1. **十分なデータがあるか確認**
   ```typescript
   const stats = winRateMaximizer.getOptimizationStats();
   if (stats.totalScenarios < 20) {
     console.warn('学習データが不足しています');
   }
   ```

2. **市場マッチングを確認**
   ```typescript
   if (optimization.marketConditions.match === 'POOR') {
     console.warn('市場条件が過去のデータと一致しません');
   }
   ```

3. **リスクレベルを確認**
   ```typescript
   if (optimization.risk.level === 'HIGH') {
     console.warn('高リスクトレードです');
   }
   ```

4. **警告をチェック**
   ```typescript
   if (optimization.warnings.length > 0) {
     console.log('警告:', optimization.warnings);
   }
   ```

### 継続的な学習

トレード実行後、結果を記録して学習データに追加：

```typescript
const newScenario: TradeScenario = {
  id: 'trade-' + Date.now(),
  timestamp: new Date().toISOString(),
  marketConditions: { /* ... */ },
  indicators: { /* ... */ },
  outcome: {
    action: 'BUY',
    entryPrice: 100,
    exitPrice: 105,
    profit: 5,
    profitPercent: 5,
    holdingPeriod: 60,
    won: true,
  },
};

// 新しいシナリオを追加して再学習
const allScenarios = [...existingScenarios, newScenario];
winRateMaximizer.learnFromHistory(allScenarios);
```

## ベストプラクティス

1. **最小20件以上のシナリオで学習**
   - より多くのデータがあれば、より精度が高くなります

2. **定期的なデータ更新**
   - 市場は変化するため、定期的に学習データを更新

3. **リスク管理の遵守**
   - 推奨ポジションサイズを超えないようにする
   - ストップロスを必ず設定する

4. **複数の指標を組み合わせる**
   - WinRateMaximizerの推奨だけでなく、他の分析も併用

5. **バックテストの実施**
   - 本番環境で使用する前に、過去データでバックテスト

## 注意事項

⚠️ **重要な注意事項**

- このツールは投資助言ではありません
- 過去の実績は将来の結果を保証しません
- 最終的な投資判断は自己責任で行ってください
- デモ取引で十分にテストしてから実際の取引に使用してください

## テスト

```bash
# ユニットテストの実行
npm test -- WinRateMaximizer.test.ts

# カバレッジ付きテスト
npm run test:coverage
```

## ライセンス

MIT License
