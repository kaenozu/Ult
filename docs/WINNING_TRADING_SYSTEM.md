# Winning Trading System Documentation

## 概要

Winning Trading Systemは、株取引で勝つための包括的なトレーディングプラットフォームです。複数の取引戦略、高度なリスク管理、バックテスト機能、リアルタイムアラート、詳細なパフォーマンス分析を統合しています。

## 主な機能

### 1. 取引戦略エンジン

#### 実装済み戦略

1. **トレンドフォロー戦略 (Trend Following)**
   - 強いトレンドに乗る戦略
   - ADX、SMA、MACDを使用
   - ボリューム確認

2. **ブレイクアウト戦略 (Breakout)**
   - 重要な価格レベルの突破を捉える
   - ボリンジャーバンド、期間高値/安値を使用
   - 出来高スパイク確認

3. **逆張り戦略 (Mean Reversion)**
   - 極端な価格変動からの反転を狙う
   - RSI、ボリンジャーバンドを使用
   - ローソク足パターン認識

4. **複合戦略 (Composite)**
   - 複数の戦略を組み合わせたコンセンサス方式
   - 多数決によるシグナル生成

5. **アダプティブ戦略 (Adaptive)**
   - 市場レジームに応じて最適な戦略を自動選択
   - トレンド市場→トレンドフォロー
   - もみ合い市場→逆張り

#### 使用方法

```typescript
import { winningStrategyEngine, StrategyType } from '@/app/lib/strategies';
import { OHLCV } from '@/app/types';

// データを準備
const data: OHLCV[] = [...]; // 株価データ

// 特定の戦略を実行
const result = winningStrategyEngine.executeStrategy('TREND_FOLLOWING', data, 1000000);

// アダプティブ戦略を実行
const adaptiveResult = winningStrategyEngine.executeAdaptiveStrategy(data, '7203', 1000000);

console.log(result);
// {
//   signal: 'BUY' | 'SELL' | 'HOLD',
//   confidence: 85,
//   entryPrice: 3500,
//   stopLoss: 3400,
//   takeProfit: 3700,
//   positionSize: 10,
//   riskRewardRatio: 2.0,
//   strategy: 'TREND_FOLLOWING',
//   reasoning: '強い上昇トレンドを検出',
//   indicators: { rsi: 65, macd: 1.5, sma20: 3450, ... },
//   metadata: { trendStrength: 35, volatility: 2.5, ... }
// }
```

### 2. 高度なリスク管理

#### ポジションサイジング方法

1. **固定比率法 (Fixed Ratio)**
   - 口座残高の固定%をリスクとして使用
   - デフォルト: 2%

2. **ケリー基準 (Kelly Criterion)**
   - 数学的に最適なベットサイズを計算
   - フルケリーはリスクが高いためハーフケリーを推奨

3. **ボラティリティ調整型**
   - ボラティリティが高いほどポジションを小さく
   - 市場状況に応じた動的調整

#### ストップロス戦略

1. **ATRベース**
   - Average True Rangeの倍数で設定
   - デフォルト: 2x ATR

2. **トレーリングストップ**
   - 高値/安値から一定%のトレール
   - 利益を伸ばしながらリスクを管理

3. **シャンデリアエグジット**
   - ATRベースの高度なトレーリングストップ
   - 期間高値/安値からの距離で計算

4. **時間ベース**
   - 一定時間経過後に強制決済

#### 使用方法

```typescript
import { advancedRiskManager } from '@/app/lib/risk';

// ポジションサイズを計算
const sizing = advancedRiskManager.calculateOptimalPositionSize({
  accountBalance: 1000000,
  entryPrice: 3500,
  stopLossPrice: 3400,
  volatility: 0.02,
  marketRegime: 'BULL',
  winRate: 0.55,
  avgWinLossRatio: 1.8,
}, 'adaptive');

// ストップロスを計算
const stopLoss = advancedRiskManager.calculateATRStopLoss(
  3500, // entryPrice
  3450, // currentPrice
  50,   // atr
  'LONG',
  2     // multiplier
);

// ポートフォリオリスクを評価
const portfolioRisk = advancedRiskManager.calculatePortfolioRisk(
  positions,
  accountBalance,
  priceHistory
);

// 新規ポジションが許可されるかチェック
const canOpen = advancedRiskManager.canOpenPosition(
  newPosition,
  existingPositions,
  accountBalance,
  priceHistory
);
```

### 3. バックテストフレームワーク

#### 機能

1. **単一戦略バックテスト**
   - 過去データでの戦略検証
   - 取引コスト・スリッページ考慮

2. **ウォークフォワード分析**
   - In-Sample / Out-of-Sample検証
   - パラメータのロバストネス評価

3. **モンテカルロシミュレーション**
   - トレード順序のランダム化
   - 確率分布と信頼区間の計算

#### パフォーマンス指標

- **リターンメトリクス**: 総リターン、年率リターン、CAGR
- **リスクメトリクス**: ボラティリティ、最大ドローダウン、VaR
- **リスク調整リターンメトリクス**: シャープレシオ、ソルティノレシオ、カルマーレシオ
- **取引メトリクス**: 勝率、プロフィットファクター、期待値

#### 使用方法

```typescript
import { winningBacktestEngine } from '@/app/lib/backtest';

// バックテストを実行
const result = winningBacktestEngine.runBacktest(
  strategyResults, // 戦略シグナル配列
  data,            // OHLCVデータ
  '7203'           // 銘柄コード
);

console.log(result.metrics);
// {
//   totalReturn: 45.2,
//   sharpeRatio: 1.35,
//   maxDrawdown: 12.5,
//   winRate: 58.3,
//   profitFactor: 1.8,
//   ...
// }

// ウォークフォワード分析
const walkForwardResults = winningBacktestEngine.runWalkForwardAnalysis(
  strategyResults,
  data,
  '7203',
  252, // トレーニング期間（1年）
  63   // テスト期間（3ヶ月）
);

// モンテカルロシミュレーション
const monteCarlo = winningBacktestEngine.runMonteCarloSimulation(
  result,
  1000 // シミュレーション回数
);
```

### 4. リアルタイムアラートシステム

#### アラートタイプ

1. **エントリーシグナル**: 買い/売りシグナル検出
2. **イグジットシグナル**: ストップロス、テイクプロフィット、トレーリングストップ
3. **リスクアラート**: ドローダウン、ボラティリティ警告
4. **市場アラート**: ブレイクアウト、トレンド反転、出来高スパイク

#### 通知方法

- プッシュ通知（Service Worker）
- デスクトップ通知
- サウンドアラート
- WebSocket経由のリアルタイム配信

#### 使用方法

```typescript
import { winningAlertEngine } from '@/app/lib/alerts';

// アラートをサブスクライブ
const unsubscribe = winningAlertEngine.subscribe((alert) => {
  console.log(`[${alert.priority}] ${alert.title}: ${alert.message}`);
  
  if (alert.actionable && alert.action) {
    // アクションを実行
    executeTrade(alert.action);
  }
});

// エントリーシグナルを検出
const entryAlert = winningAlertEngine.detectEntrySignal(
  '7203',
  strategyResult,
  currentPrice
);

if (entryAlert) {
  winningAlertEngine.emitAlert(entryAlert);
}

// ポジションを登録
winningAlertEngine.registerPosition(
  '7203',
  entryPrice,
  stopLoss,
  takeProfit
);

// トレーリングストップを更新
const trailingAlert = winningAlertEngine.updateTrailingStop(
  '7203',
  positionAlert,
  highestPrice,
  lowestPrice,
  currentPrice,
  5 // trailPercent
);
```

### 5. パフォーマンス分析

#### 分析機能

1. **勝率分析**
   - 全体的勝率
   - 戦略別・時間帯別・曜日別勝率
   - 勝率トレンド

2. **損益分析**
   - 月次/年次損益
   - エクイティカーブ
   - ドローダウン分析

3. **取引パターン分析**
   - 最適なパターンの特定
   - パターン安定性評価

4. **市場レジーム検出**
   - トレンド市場の検出
   - もみ合い市場の検出
   - 各レジームでの最適戦略

#### 使用方法

```typescript
import { winningAnalytics } from '@/app/lib/analytics';

// パフォーマンスレポートを生成
const report = winningAnalytics.generatePerformanceReport(trades, equityCurve);

console.log(report.summary);
// {
//   totalTrades: 150,
//   winRate: 58.3,
//   profitFactor: 1.8,
//   sharpeRatio: 1.35,
//   maxDrawdown: 12.5,
//   totalReturn: 45.2
// }

// 勝率分析
const winRateAnalysis = winningAnalytics.analyzeWinRate(trades);

// 損益分析
const plAnalysis = winningAnalytics.analyzeProfitLoss(trades, equityCurve);

// 取引パターン分析
const patternAnalysis = winningAnalytics.analyzeTradePatterns(trades);

// 市場レジーム検出
const regimes = winningAnalytics.detectMarketRegimes(equityCurve);

// 戦略比較
const comparison = winningAnalytics.compareStrategies(results);
```

## 統合使用方法

### WinningTradingSystem

すべての機能を統合した高レベルAPI:

```typescript
import { winningTradingSystem, DEFAULT_SYSTEM_CONFIG } from '@/app/lib/WinningTradingSystem';

// システムを初期化
const system = winningTradingSystem;

// またはカスタム設定で初期化
const customSystem = new WinningTradingSystem({
  initialCapital: 2000000,
  maxPositions: 10,
  defaultStrategy: 'ADAPTIVE',
  riskLimits: {
    maxRiskPerTrade: 1.5,
    maxDailyLoss: 3,
    maxDrawdown: 15,
  },
});

// セッションを開始
const session = system.startSession('7203', 'ADAPTIVE', 1000000);

// イベントをサブスクライブ
system.subscribe((event) => {
  switch (event.type) {
    case 'POSITION_OPENED':
      console.log('Position opened:', event.data);
      break;
    case 'POSITION_CLOSED':
      console.log('Position closed:', event.data);
      break;
    case 'ALERT':
      console.log('Alert:', event.data);
      break;
  }
});

// 市場データを処理
system.processMarketData('7203', ohlcvData);

// バックテストを実行
const backtestResult = system.runBacktest('7203', historicalData, 'ADAPTIVE');

// 複数戦略を比較
const comparison = system.compareStrategies('7203', historicalData, [
  'TREND_FOLLOWING',
  'BREAKOUT',
  'MEAN_REVERSION',
  'COMPOSITE',
]);

// パフォーマンスレポートを生成
const report = system.generatePerformanceReport(session.id);

// セッションを停止
system.stopSession(session.id);
```

## ベストプラクティス

### 1. リスク管理

- 1取引あたりのリスクは口座残高の2%以内に制限
- 最大ドローダウンが20%を超えたら取引を停止
- 常にストップロスを設定
- リスクリワード比は最低2:1を維持

### 2. バックテスト

- 最低5年分のデータでバックテスト
- ウォークフォワード分析でロバストネスを確認
- モンテカルロシミュレーションで確率分布を把握
- 取引コストとスリッページを考慮

### 3. 実運用

- ペーパートレードで十分検証してから実運用
- 小額から開始して徐々にスケールアップ
- パフォーマンスを定期的に見直し
- 市場環境の変化に応じて戦略を調整

## 注意事項

⚠️ **重要**: 過去のパフォーマンスは将来の結果を保証しません。

- 実際の取引に使用する前に徹底的なバックテストが必要
- ペーパートレードでの検証を推奨
- リスク管理を最優先
- 過去のパフォーマンスは将来の結果を保証しない

## ライセンス

MIT License
