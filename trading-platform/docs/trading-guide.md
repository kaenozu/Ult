# 株取引で勝つための体系的ガイド

## 目次
1. [市場分析の基礎](#1-市場分析の基礎)
2. [チャート読み解きの技術](#2-チャート読み解きの技術)
3. [ファンダメンタル分析](#3-ファンダメンタル分析)
4. [メンタルのコントロール](#4-メンタルのコントロール)
5. [資金管理とリスク管理](#5-資金管理とリスク管理)
6. [トレード戦略の選定](#6-トレード戦略の選定)
7. [ツールとインジケーターの活用](#7-ツールとインジケーターの活用)
8. [継続的学習のアプローチ](#8-継続的学習のアプローチ)

---

## 1. 市場分析の基礎

### 1.1 トレンドの理解

市場は3つの状態があります：

| トレンド | 特徴 | 戦略 |
|---------|------|------|
| **上昇トレンド** | 高値・安値ともに切り上げ | 押し目で買う |
| **下降トレンド** | 高値・安値ともに切り下げ | 戻り目で売る |
| **保ち合い（横ばい）** | 一定の範囲内で推移 | レンジトレード |

### 1.2 トレンドの識別方法

```
上昇トレンドの条件：
1. 価格がSMA200を上回っている
2. 高値更新が続いている
3. 移動平均線がパーフェクトオーダー（短期>中期>長期）
4. 出来高が価格上昇時に増加
```

[`mlPrediction.ts`](trading-platform/app/lib/mlPrediction.ts:71) の価格モメンタム計算：
```typescript
priceMomentum: ((currentPrice - this.at(prices, prices.length - 10, currentPrice)) / 
                this.at(prices, prices.length - 10, currentPrice)) * 100,
```

### 1.3 市場環境の4つのフェーズ

| フェーズ | 特徴 | 行動 |
|---------|------|------|
| **蓄積期** | 大口投資家が買い集め | 観察・ подготовка |
| **推進期** | 価格が明確に上昇 | 積極的に買う |
| **分配期** | 高値圏で売り抜け | 利確・観察 |
| **衰退期** | 下降トレンド開始 | 売る・様子見 |

---

## 2. チャート読み解きの技術

### 2.1 ローソク足の基礎

**陽線（買い優勢）**
- 始値より終値が高い
- 買い圧力が強いことを示す

**陰線（売り優勢）**
- 始値より終値が低い
- 売り圧力が強いことを示す

**主要なローソク足パターン**

| パターン | 意味 | 信頼度 |
|---------|------|--------|
| **ローソク足十字線（DOJI）** | 転換のサイン | 中 |
| **はらみ足** | 反転の可能性 | 中 |
| **つつみ線** | 反転の可能性 | 中〜高 |
| **明けの明星** | 買い転換 | 高 |
| **夕暮れ星** | 売り転換 | 高 |

### 2.2 サポート・レジスタンス

[`TechnicalIndicatorService.ts`](trading-platform/app/lib/TechnicalIndicatorService.ts) を使った分析：

```typescript
// サポートライン（過去の底値）
const supportLevels = findHistoricalLows(prices);

// レジスタンスライン（過去の高値）
const resistanceLevels = findHistoricalHighs(prices);
```

**重要な水準の判定基準：**
1. 過去3回以上反発した価格
2. 出来高が多い価格帯
3. round number（切りの良い価格）

### 2.3 チャートパターン

**継続パターン**
- 三角持ち合い
- フラッグ
- ペナント
- 矩形

**反転パターン**
- ヘッド＆ショルダー
- ダブルトップ/ボトム
- トリプルトップ/ボトム

### 2.4 ボリューム分析

[`VolumeAnalysis.ts`](trading-platform/app/lib/VolumeAnalysis.ts) の活用：

```typescript
// 価格帯別出来高（ボリュームプロファイル）
const volumeProfile = calculateVolumeProfile(data);

// 異常な出来高を検出
const unusualVolume = detectVolumeSpike(data);
```

**ボリュームの読み方：**
- 価格上昇 + 出来高増加 = 強い上昇
- 価格上昇 + 出来高減少 = 上昇継続性に疑問
- 価格下落 + 出来高増加 = 強い下落
- 価格下落 + 出来高減少 = 底値示唆

---

## 3. ファンダメンタル分析

### 3.1 企業分析の重要指標

| 指標 | 計算式 | 目安 |
|-----|--------|------|
| **PER** | 株価÷1株利益 | 15倍以下が割安 |
| **PBR** | 株価÷1株純資産 | 1倍以下が割安 |
| **ROE** | 当期純利益÷純資産 | 10%以上が良好 |
| **配当利回り** | 配当÷株価 | 3%以上が良好 |
| **営業利益率** | 営業利益÷売上 | 10%以上が良好 |

### 3.2 四季報の活用

**注目すべきポイント：**
1. 業績進捗率
2. 通期計画に対する進捗
3. コンセンサス予想との乖離
4. 材料記事の有無

### 3.3 グローバルな影響要因

[`mlPrediction.ts`](trading-platform/app/lib/mlPrediction.ts:162) の市場相関分析：

```typescript
private analyzeMarketCorrelation(
  stock: Stock, 
  data: OHLCV[], 
  indexData: OHLCV[] | undefined, 
  prediction: number
) {
  // 日経平均またはNASDAQとの相関を計算
  const correlation = this.calculateCorrelation(
    this.calculateReturns(data.slice(-20)),
    this.calculateReturns(indexData.slice(-20))
  );
}
```

**監視すべき指標：**
- 米国の金利政策（FOMC）
- 為替レート（USD/JPY）
- 原油価格
- VIX指数（恐怖指数）

---

## 4. メンタルのコントロール

### 4.1 トレーダーの心理バイアス

| バイアス | 説明 | 対策 |
|---------|------|------|
| **確証バイアス** | 自分の意見に沿う情報だけを見る | 逆の意見を積極的に探す |
| **損失回避** | 利益確定が早く、損切りが遅い | 損切りルールを事前に決定 |
| **平均化バイアス** | 下がったので買い増す | ナンピンは厳禁 |
| **FX錯覚** | 小さい利益が積み重なる | 大きな損失で台無し |
| ** Halo効果** | 良いイメージで判断が歪む | 数字で判断する |

### 4.2 トレード前のメンタル準備

```typescript
// トレード前のチェックリスト
const preTradeChecklist = {
  sleepQuality: "十分な睡眠をとったか",
  emotionalState: "感情が冷静か",
  tradingPlan: "明確な計画があるか",
  riskLimit: "リスク許容範囲内か",
  marketCondition: "市場はトレードに適しているか"
};
```

### 4.3 トレード中のメンタル管理

**禁止事項：**
- ❌ 損切り後、すぐに再エントリー
- ❌ 利益確定後の追加投資
- ❌ 連勝後の自信過剰
- ❌ 連敗後の取り返そうとする姿勢

**推奨事項：**
- ✅ 1トレードごとに休息を取る
- ✅ 決めたルールを守る
- ✅ 結果よりもプロセスを評価

### 4.4 トレード日記の重要性

[`tradingStore.ts`](trading-platform/app/store/tradingStore.ts:239) のジャーナル機能を活用：

```typescript
interface JournalEntry {
  id: string;
  symbol: string;
  date: string;
  signalType: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  profit: number;
  profitPercent: number;
  notes: string;  // トレードの振り返り
  status: 'CLOSED';
}
```

**日記に記録すべき内容：**
1. トレードの理由
2. エントリー根拠
3. 決済理由
4. 感情の状態
5. 改善点

---

## 5. 資金管理とリスク管理

### 5.1 資金管理の原則

[`riskManagement.ts`](trading-platform/app/lib/riskManagement.ts) の実装：

```typescript
// ケリー基準によるポジションサイズ計算
function calculateKellyPosition(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  kellyFraction: number = 0.25
): number {
  const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgLoss;
  return Math.max(0, Math.min(kelly, 1)) * kellyFraction;
}
```

### 5.2 リスク管理の黄金ルール

| ルール | 内容 | 根拠 |
|-------|------|------|
| **1%ルール** | 1トレードあたりのリスクを資金1%以内に | 20連敗해도資金は67%残る |
| **2%ルール** | 1日のリスクを資金2%以内に | 熱狂リスクの回避 |
| **5%ルール** | 1週間のリスクを資金5%以内に | 長期的な資金保全 |

### 5.3 損切り戦略

[`constants.ts`](trading-platform/app/lib/constants.ts:52) の設定：

```typescript
export const RISK_MANAGEMENT = {
  DEFAULT_STOP_LOSS_PERCENT: 2.0,  // 損切り2%
  DEFAULT_TAKE_PROFIT_PERCENT: 4.0,  // 利確4%（リスクリワード2:1）
  MAX_RISK_PERCENT: 1.0,  // 1トレード最大1%
  DEFAULT_DAILY_LOSS_LIMIT: 2.0,  // 1日2%で強制終了
};
```

**損切りラインの設定方法：**

1. **ATRベース**
   ```typescript
   const atr = calculateATR(data, 14);
   const stopLoss = entryPrice - (atr * 2);  // ATR2倍
   ```

2. **サポート/レジスタンスベース**
   ```typescript
   const stopLoss = recentSupportLevel;  // 直近のサポート
   ```

3. **percentageベース**
   ```typescript
   const stopLoss = entryPrice * 0.97;  // 3%下
   ```

### 5.4 ポジションサイジング

[`calculatePositionSize()`](trading-platform/app/lib/riskManagement.ts:61) の活用：

```typescript
const result = calculatePositionSize(
  capital: 1000000,      // 資金100万円
  entryPrice: 5000,      // エントリー価格
  stopLossPrice: 4850,   // 損切り価格
  takeProfitPrice: 5200, // 利確価格
  settings: DEFAULT_RISK_SETTINGS
);
```

### 5.5 ポートフォリオ分散

| 資産クラス | 推奨比率 |
|-----------|---------|
| 株式 | 60-80% |
| 債券 | 10-20% |
| 現金 | 10-20% |

**個別株の分散：**
- 同一セクター：最大30%
- 単一銘柄：最大10%

---

## 6. トレード戦略の選定

### 6.1 主なトレードスタイル

| スタイル | 時間軸 | 特徴 | 必要なスキル |
|---------|--------|------|-------------|
| **スキャルピング** | 秒〜分 |  صغير利益×大量トレード | 高速判断、手数料対策 |
| **デイトレード** | 日内 | 当日完結 | チャートリーディング |
| **Swingトレード** | 数日〜数週間 |  중소형トレンド狙い | トレンド識別 |
| **長期投資** | 数ヶ月〜数年 | ファンダメンタル重視 | 企業分析 |

### 6.2 戦略選定の基準

[`OptimizedAccuracyService.ts`](trading-platform/app/lib/OptimizedAccuracyService.ts) のバックテストを活用：

```typescript
const backtestResult = runOptimizedBacktest(
  symbol: '7203',
  data: historicalData,
  market: 'japan'
);

// バックテスト結果の評価基準
const evaluationCriteria = {
  winRate: backtestResult.winRate >= 55,  // 勝率55%以上
  profitFactor: backtestResult.profitFactor >= 1.5,  // プロフィットファクター1.5以上
  maxDrawdown: backtestResult.maxDrawdown <= 10,  // 最大DD10%以内
  sharpeRatio: backtestResult.sharpeRatio >= 1.0,  // シャープレシオ1.0以上
  sampleSize: backtestResult.totalTrades >= 30,  // トレード数30回以上
};
```

### 6.3 戦略の検証プロセス

1. **バックテスト**
   - 最低2年分のデータ
   - アウトオブサンプル検証

2. **ペーパートレード**
   - [`PaperTradingEnvironment.ts`](trading-platform/app/lib/paperTrading/PaperTradingEnvironment.ts) で実践
   - 最低3ヶ月間

3. **少額トレード**
   -  реаль証拠金で検証
   - ロット数を最小に

### 6.4 エッジ（優位性）の確保

**持続可能なエッジの条件：**
1. 市場平均を上回る成績
2. 統計的に有意な優位性
3. 市場環境の変化に強い
4. 資金規模に依存しない

---

## 7. ツールとインジケーターの活用

### 7.1 主要インジケーター

[`TechnicalIndicatorService.ts`](trading-platform/app/lib/TechnicalIndicatorService.ts) で実装：

#### RSI（相対力指数）
```typescript
const rsi = technicalIndicatorService.calculateRSI(prices, 14);

// 使い方
if (rsi < 30) {
  // 買われ過ぎ → 買いシグナル
} else if (rsi > 70) {
  // 売られ過ぎ → 売りシグナル
}
```

#### MACD（移動平均収束拡散）
```typescript
const macd = technicalIndicatorService.calculateMACD(prices);

// シグナル
// MACDがシグナル線を上抜 → 買い
// MACDがシグナル線を下抜 → 売り
```

#### ボリジャーバンド
```typescript
const bollinger = technicalIndicatorService.calculateBollingerBands(prices);

// 使い方
// 価格が下バンド接近 → 買い
// 価格が上バンド接近 → 売り
```

#### ATR（平均真の範囲）
```typescript
const atr = technicalIndicatorService.calculateATR(data, 14);

// 損切り距離の決定
const stopLossDistance = atr * 2;
```

### 7.2 複合シグナルの活用

[`mlPrediction.ts`](trading-platform/app/lib/mlPrediction.ts:60) のアンサンブルアプローチ：

```typescript
// 複数のインジケーターを組み合わせる
const signalStrength = 
  (rsiSignal * 0.3) +      // RSI: 30%
  (macdSignal * 0.3) +     // MACD: 30%
  (bollingerSignal * 0.2) + // ボリンジャー: 20%
  (momentumSignal * 0.2);   // モメンタム: 20%
```

### 7.3 AIシグナルの活用

[`SignalPanel`](trading-platform/app/components/SignalPanel) で提供される情報：

| 項目 | 説明 | 活用方法 |
|-----|------|---------|
| **confidence** | 信頼度（30-98%） | 80%以上を重視 |
| **predictedChange** | 予測変動率 | 利確目標の参考 |
| **targetPrice** | ターゲット価格 | 利確ライン |
| **stopLoss** | 損切り価格 | 損切りライン |
| **volumeResistance** | 価格帯別出来高 | 重要水準の参考 |

### 7.4 ツール設定の最適化

[`constants.ts`](trading-platform/app/lib/constants.ts) のパラメータ調整：

```typescript
export const RSI_CONFIG = {
  DEFAULT_PERIOD: 14,       // 期間
  OVERSOLD: 30,            // 買われ過ぎライン
  OVERBOUGHT: 70,          // 売られ過ぎライン
  PERIOD_OPTIONS: [9, 14, 21],  // 最適化候補
};

export const SMA_CONFIG = {
  SHORT_PERIOD: 10,        // 短期SMA
  MEDIUM_PERIOD: 50,       // 中期SMA
  LONG_PERIOD: 200,        // 長期SMA
};
```

---

## 8. 継続的学習のアプローチ

### 8.1 学習のフレームワーク

```typescript
interface LearningPlan {
  knowledgeBuilding: {
    books: string[],           // 必読書
    courses: string[],         // 学習コース
    marketAnalysis: string[],  // 市場分析スキル
  };
  practicalSkills: {
    chartReading: string[],    // チャート読解
    strategyDevelopment: string[],  // 戦略開発
    backtesting: string[],     // バックテスト
  };
  psychologicalDevelopment: {
    mindfulness: string[],     // マインドフルネス
    journaling: string[],      // トレード日記
    reviewProcess: string[],   // 振り返りプロセス
  };
}
```

### 8.2 必読書籍

| カテゴリ | 書籍 | 著者 |
|---------|------|------|
| **技術分析** | ゾーン | マーク・ダグラス |
| **資金管理** | 投資苑 | ヴァン・K・サープ |
| **心理面** | トレーディング心理大全 | ブレント・ペンファゾールド |
| **システムトレード** | アルゴリズム取引 | エーリッヒ・プリンス |

### 8.3 継続的改善プロセス

[`OptimizedAccuracyService.ts`](trading-platform/app/lib/OptimizedAccuracyService.ts:66) のキャッシュ機能：

```typescript
// 月次レビューチェックリスト
const monthlyReviewChecklist = {
  performanceMetrics: {
    winRate: "今月の勝率は？",
    profitFactor: "プロフィットファクターは？",
    maxDrawdown: "最大DDは？",
    sharpeRatio: "シャープレシオは？",
  },
  strategyHealth: {
    signalAccuracy: "シグナル精度は？",
    falseSignals: "偽シグナルは？",
    marketFit: "市場環境は適合したか？",
  },
  improvementAreas: {
    losses: "損失トレードの改善点は？",
    entryTiming: "エントリータイミングは？",
    exitTiming: "決済タイミングは？",
  },
};
```

### 8.4 コミュニティとメンター

- トレードコミュニティへの参加
- 実績のあるトレーダーから学ぶ
- 自分のトレードを公開してフィードバックを受ける

### 8.5 最後に

**成功の公式：**

```
成功 = 適切な戦略 × 厳格な資金管理 × 完璧な執行 × 安定したメンタル
```

このすべての要素が揃って、初めて継続的な利益が得られます。

---

## 附录：アプリ活用チェックリスト

✅ **毎日確認すること：**
- [ ] 市場全体のトレンド確認
- [ ] ウォッチリストのポジション評価
- [ ] トレード日記の更新
- [ ] リスク制限の確認

✅ **トレード前に確認すること：**
- [ ] トレンドの方向性
- [ ] 損切り価格の決定
- [ ] ポジションサイズの計算
- [ ] リスクリワード比率の確認
- [ ] 感情的でない状態の確認

✅ **トレード後に確認すること：**
- [ ] トレード日記の記入
- [ ] ルールの遵守確認
- [ ] 改善点の特定
- [ ] 次回への学びの整理

---

*このガイドは [`trading-platform`](trading-platform/) ディレクトリにあるコードと連動して使用できます。*
