# Market Correlation Integration

## 概要

WinningTradingSystem に MarketCorrelationService を統合し、市場全体のトレンド（日経225/S&P500）を考慮したエントリー判断を行います。これにより、地合いの悪い市場での不要な損失を抑制できます。

## 機能

### 1. 市場指数データの追跡

取引セッションに市場指数データ（日経225、S&P 500）を設定できます。

```typescript
const system = new WinningTradingSystem();
const session = system.startSession('7203', 'ADAPTIVE', 1000000);

// 市場指数データを設定
const nikkei225Data = [...]; // OHLCV[]
const sp500Data = [...];     // OHLCV[]
system.updateMarketIndexData(nikkei225Data, sp500Data);
```

### 2. 弱気市場でのフィルタリング

市場が弱気（BEARISH）の時、高い相関を持つ銘柄の買いシグナルは自動的にフィルタリングされます。

**動作:**
- **高相関（>0.6）+ 弱気市場 + 買いシグナル** → エントリーを見送り
- **低相関（<0.4）+ 弱気市場 + 買いシグナル** → ポジションサイズを50%に削減

```typescript
// 市場が弱気で高相関の場合、買いシグナルはスキップされます
system.processMarketData('7203', stockData);
// Console: "[WinningTradingSystem] Entry filtered: BEARISH market with HIGH correlation (0.72)"
```

### 3. ベータ値に基づくポジションサイズ調整

ベータ値（市場に対する銘柄の感応度）に基づいて、ポジションサイズを動的に調整します。

**調整ルール:**
- **高ベータ（>1.5）**: ポジションサイズを20%削減（リスク管理）
- **低ベータ（<0.5）**: ポジションサイズを20%増加（安定性）

```typescript
// 高ベータ銘柄の場合
// Console: "[WinningTradingSystem] Position size reduced by 20% due to high beta (1.82)"

// 低ベータ銘柄の場合
// Console: "[WinningTradingSystem] Position size increased by 20% due to low beta (0.38)"
```

### 4. ベータ調整された目標価格

ストップロスとテイクプロフィットの価格をベータ値と市場トレンドに基づいて調整します。

```typescript
// ベータ値が高い場合、より保守的な目標価格を設定
// Console: "[WinningTradingSystem] Beta-adjusted targets: SL 950.23, TP 1089.45"
```

## 使用例

### 基本的な使用方法

```typescript
import WinningTradingSystem from './lib/WinningTradingSystem';

// システムを初期化
const system = new WinningTradingSystem({
  initialCapital: 1000000,
  maxPositions: 5,
  defaultStrategy: 'ADAPTIVE'
});

// セッションを開始
const session = system.startSession('7203', 'ADAPTIVE', 1000000);

// 市場指数データを取得して設定
const nikkei225Data = await fetchNikkei225Data();
const sp500Data = await fetchSP500Data();
system.updateMarketIndexData(nikkei225Data, sp500Data);

// 取引を実行
const stockData = await fetchStockData('7203');
system.processMarketData('7203', stockData);

// イベントを監視
system.subscribe((event) => {
  if (event.type === 'POSITION_OPENED') {
    console.log('Position opened:', event.data);
  }
});
```

### 市場相関分析の結果確認

市場相関分析は内部で自動的に実行されますが、MarketCorrelationService を直接使用して分析することもできます。

```typescript
import { marketCorrelationService } from './lib/marketCorrelation';

// 相関分析を実行
const marketSync = marketCorrelationService.analyzeMarketSync(
  stockData,
  nikkei225Data,
  sp500Data,
  signal
);

console.log('Market Trend:', marketSync.compositeSignal?.marketTrend);
console.log('Correlation:', marketSync.compositeSignal?.correlation);
console.log('Beta:', marketSync.compositeSignal?.beta);
console.log('Recommendation:', marketSync.compositeSignal?.recommendation);
```

## 利点

1. **ドローダウン削減**: 弱気市場での不要なエントリーを避けることで、損失を抑制
2. **リスク調整**: ベータ値に基づいてポジションサイズを動的に調整
3. **市場適応**: 市場トレンドに応じた柔軟な取引戦略
4. **透明性**: すべての判断理由がコンソールログに出力される

## 注意事項

- 市場指数データが設定されていない場合、従来の方法でエントリー判断が行われます
- 相関分析には最低20個のデータポイントが必要です
- ベータ値の計算にはリターンの計算が含まれるため、最低2個のデータポイントが必要です

## テスト

統合のテストは `/app/lib/__tests__/WinningTradingSystem.test.ts` に含まれています。

```bash
npm test -- --testNamePattern="Market Correlation Integration"
```

## 参考

- [MarketCorrelationService ドキュメント](./market-correlation-service.md)
- [WinningTradingSystem ドキュメント](./winning-trading-system.md)
