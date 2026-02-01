# TRADING-002: 取引戦略とシグナル生成の精度向上

## 概要
マルチ時間枠モデルの実装、コンフィームシグナルシステムの構築、高度なバックテストエンジンの開発、ウォークフォワード分析の導入を通じて、取引戦略とシグナル生成の精度を向上させます。

## 問題の説明
現在のシステムには以下の課題があります：

1. **単一時間枠の制限**
   - 短期的なノイズに影響されやすい
   - 長期的なトレンドを無視している
   - 時間枠間の矛盾が発生する可能性がある

2. **シグナル確認の不備**
   - フェイクシグナルをフィルタリングできない
   - シグナルの信頼性が低い
   - 誤シグナルによる損失が発生する

3. **バックテストの制限**
   - 過去のパフォーマンスを正確に評価できない
   - パラメータの過剰最適化（オーバーフィッティング）のリスク
   - 将来のパフォーマンスを予測できない

4. **ウォークフォワード分析の欠如**
   - 戦略の堅牢性を検証できない
   - 市場環境の変化に適応できない
   - 真のパフォーマンスを把握できない

## 影響
- 取引精度の低下
- 不必要な損失の発生
- 戦略の信頼性不足
- 投資パフォーマンスの悪化

## 推奨される解決策

### 1. マルチ時間枠モデルの実装

```typescript
// src/trading/strategy/MultiTimeFrameStrategy.ts
import { MarketData, TimeFrame, Signal } from '@/types/trading';
import { TechnicalIndicator } from '@/indicators/TechnicalIndicator';

export interface TimeFrameSignal {
  timeFrame: TimeFrame;
  signal: Signal;
  strength: number;
  confidence: number;
}

export interface MultiTimeFrameAnalysis {
  primarySignal: Signal;
  alignment: number; // 0-1, 1 = 完全に整合
  weightedSignal: Signal;
  timeFrameSignals: TimeFrameSignal[];
  trendDirection: 'bullish' | 'bearish' | 'neutral';
}

export class MultiTimeFrameStrategy {
  private indicators: Map<TimeFrame, TechnicalIndicator[]> = new Map();
  private weights: Map<TimeFrame, number> = new Map();

  constructor() {
    this.initializeDefaultWeights();
    this.initializeIndicators();
  }

  private initializeDefaultWeights(): void {
    // 長期トレンドの重みを高く設定
    this.weights.set('1D', 0.4);
    this.weights.set('4H', 0.3);
    this.weights.set('1H', 0.2);
    this.weights.set('15M', 0.1);
  }

  private initializeIndicators(): void {
    // 各時間枠のインジケーターを初期化
    const timeFrames: TimeFrame[] = ['1D', '4H', '1H', '15M'];

    for (const tf of timeFrames) {
      this.indicators.set(tf, [
        new TechnicalIndicator('RSI', { period: 14 }),
        new TechnicalIndicator('MACD', { fast: 12, slow: 26, signal: 9 }),
        new TechnicalIndicator('SMA', { period: 20 }),
        new TechnicalIndicator('EMA', { period: 50 }),
        new TechnicalIndicator('BollingerBands', { period: 20, stdDev: 2 })
      ]);
    }
  }

  async analyze(multiTfData: Map<TimeFrame, MarketData[]>): Promise<MultiTimeFrameAnalysis> {
    const timeFrameSignals: TimeFrameSignal[] = [];

    // 各時間枠でシグナルを生成
    for (const [timeFrame, data] of multiTfData.entries()) {
      const indicators = this.indicators.get(timeFrame);
      if (!indicators) continue;

      const signal = await this.generateTimeFrameSignal(data, indicators, timeFrame);
      timeFrameSignals.push(signal);
    }

    // トレンド方向の判定
    const trendDirection = this.determineTrendDirection(timeFrameSignals);

    // 信号の整合性を計算
    const alignment = this.calculateAlignment(timeFrameSignals);

    // 重み付けされたシグナルを生成
    const weightedSignal = this.generateWeightedSignal(timeFrameSignals);

    // プライマリシグナルを決定
    const primarySignal = this.determinePrimarySignal(weightedSignal, alignment);

    return {
      primarySignal,
      alignment,
      weightedSignal,
      timeFrameSignals,
      trendDirection
    };
  }

  private async generateTimeFrameSignal(
    data: MarketData[],
    indicators: TechnicalIndicator[],
    timeFrame: TimeFrame
  ): Promise<TimeFrameSignal> {
    const signals: Signal[] = [];

    // 各インジケーターからシグナルを生成
    for (const indicator of indicators) {
      const result = await indicator.calculate(data);
      const signal = this.indicatorToSignal(result, indicator.name);
      if (signal) signals.push(signal);
    }

    // シグナルを集約
    const aggregatedSignal = this.aggregateSignals(signals);
    const strength = this.calculateSignalStrength(signals);
    const confidence = this.calculateConfidence(signals, data);

    return {
      timeFrame,
      signal: aggregatedSignal,
      strength,
      confidence
    };
  }

  private indicatorToSignal(result: any, indicatorName: string): Signal | null {
    switch (indicatorName) {
      case 'RSI':
        if (result.value < 30) return { type: 'BUY', confidence: 0.8 };
        if (result.value > 70) return { type: 'SELL', confidence: 0.8 };
        return null;

      case 'MACD':
        if (result.macd > result.signal && result.histogram > 0) {
          return { type: 'BUY', confidence: 0.7 };
        }
        if (result.macd < result.signal && result.histogram < 0) {
          return { type: 'SELL', confidence: 0.7 };
        }
        return null;

      default:
        return null;
    }
  }

  private aggregateSignals(signals: Signal[]): Signal {
    if (signals.length === 0) return { type: 'HOLD', confidence: 0 };

    const buySignals = signals.filter(s => s.type === 'BUY');
    const sellSignals = signals.filter(s => s.type === 'SELL');

    if (buySignals.length > sellSignals.length) {
      const avgConfidence = buySignals.reduce((sum, s) => sum + s.confidence, 0) / buySignals.length;
      return { type: 'BUY', confidence: avgConfidence };
    } else if (sellSignals.length > buySignals.length) {
      const avgConfidence = sellSignals.reduce((sum, s) => sum + s.confidence, 0) / sellSignals.length;
      return { type: 'SELL', confidence: avgConfidence };
    }

    return { type: 'HOLD', confidence: 0 };
  }

  private calculateSignalStrength(signals: Signal[]): number {
    if (signals.length === 0) return 0;

    const buyStrength = signals
      .filter(s => s.type === 'BUY')
      .reduce((sum, s) => sum + s.confidence, 0);

    const sellStrength = signals
      .filter(s => s.type === 'SELL')
      .reduce((sum, s) => sum + s.confidence, 0);

    return Math.abs(buyStrength - sellStrength) / signals.length;
  }

  private calculateConfidence(signals: Signal[], data: MarketData[]): number {
    if (signals.length === 0) return 0;

    // データ量に基づく信頼度
    const dataConfidence = Math.min(data.length / 100, 1);

    // シグナルの一致度に基づく信頼度
    const uniqueTypes = new Set(signals.map(s => s.type));
    const signalConfidence = 1 - (uniqueTypes.size - 1) / signals.length;

    return (dataConfidence + signalConfidence) / 2;
  }

  private determineTrendDirection(signals: TimeFrameSignal[]): 'bullish' | 'bearish' | 'neutral' {
    const bullishSignals = signals.filter(s => s.signal.type === 'BUY').length;
    const bearishSignals = signals.filter(s => s.signal.type === 'SELL').length;

    if (bullishSignals > bearishSignals) return 'bullish';
    if (bearishSignals > bullishSignals) return 'bearish';
    return 'neutral';
  }

  private calculateAlignment(signals: TimeFrameSignal[]): number {
    if (signals.length < 2) return 1;

    const buyCount = signals.filter(s => s.signal.type === 'BUY').length;
    const sellCount = signals.filter(s => s.signal.type === 'SELL').length;
    const holdCount = signals.filter(s => s.signal.type === 'HOLD').length;

    const maxCount = Math.max(buyCount, sellCount, holdCount);
    return maxCount / signals.length;
  }

  private generateWeightedSignal(signals: TimeFrameSignal[]): Signal {
    let buyScore = 0;
    let sellScore = 0;

    for (const signal of signals) {
      const weight = this.weights.get(signal.timeFrame) || 0;
      const weightedConfidence = signal.confidence * weight;

      if (signal.signal.type === 'BUY') {
        buyScore += weightedConfidence;
      } else if (signal.signal.type === 'SELL') {
        sellScore += weightedConfidence;
      }
    }

    if (buyScore > sellScore) {
      return { type: 'BUY', confidence: buyScore / (buyScore + sellScore) };
    } else if (sellScore > buyScore) {
      return { type: 'SELL', confidence: sellScore / (buyScore + sellScore) };
    }

    return { type: 'HOLD', confidence: 0 };
  }

  private determinePrimarySignal(weightedSignal: Signal, alignment: number): Signal {
    // 信号の整合性が低い場合はHOLD
    if (alignment < 0.5) {
      return { type: 'HOLD', confidence: weightedSignal.confidence * alignment };
    }

    return weightedSignal;
  }

  setWeight(timeFrame: TimeFrame, weight: number): void {
    this.weights.set(timeFrame, Math.max(0, Math.min(1, weight)));
  }
}
```

### 2. コンフィームシグナルシステムの構築

```typescript
// src/trading/signal/ConfirmSignalSystem.ts
import { Signal, MarketData } from '@/types/trading';

export interface ConfirmRule {
  name: string;
  check: (signal: Signal, data: MarketData) => boolean;
  weight: number;
}

export interface ConfirmResult {
  originalSignal: Signal;
  confirmedSignal: Signal;
  confirmed: boolean;
  confirmationScore: number;
  rulesApplied: string[];
  reasons: string[];
}

export class ConfirmSignalSystem {
  private rules: ConfirmRule[] = [];
  private confirmationThreshold = 0.7;

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // ボリューム確認
    this.addRule({
      name: 'volume-confirmation',
      weight: 0.3,
      check: (signal, data) => {
        if (!data.ohlcv) return false;
        const volume = data.ohlcv.volume;
        const avgVolume = data.averageVolume || volume;
        return volume > avgVolume * 0.8; // 平均ボリュームの80%以上
      }
    });

    // 価格アクション確認
    this.addRule({
      name: 'price-action-confirmation',
      weight: 0.3,
      check: (signal, data) => {
        if (!data.ohlcv) return false;
        const { open, high, low, close } = data.ohlcv;

        if (signal.type === 'BUY') {
          // 強気の価格アクション
          return close > open && close > ((high + low) / 2);
        } else if (signal.type === 'SELL') {
          // 弱気の価格アクション
          return close < open && close < ((high + low) / 2);
        }

        return true;
      }
    });

    // トレンド確認
    this.addRule({
      name: 'trend-confirmation',
      weight: 0.2,
      check: (signal, data) => {
        const trend = data.trendDirection;

        if (signal.type === 'BUY') {
          return trend === 'bullish' || trend === 'neutral';
        } else if (signal.type === 'SELL') {
          return trend === 'bearish' || trend === 'neutral';
        }

        return true;
      }
    });

    // サポート/レジスタンス確認
    this.addRule({
      name: 'support-resistance-confirmation',
      weight: 0.2,
      check: (signal, data) => {
        if (!data.ohlcv) return false;
        const { close } = data.ohlcv;

        if (signal.type === 'BUY') {
          // サポート付近での買い
          return data.supportLevel && close <= data.supportLevel * 1.02;
        } else if (signal.type === 'SELL') {
          // レジスタンス付近での売り
          return data.resistanceLevel && close >= data.resistanceLevel * 0.98;
        }

        return true;
      }
    });
  }

  addRule(rule: ConfirmRule): void {
    this.rules.push(rule);
  }

  confirm(signal: Signal, data: MarketData): ConfirmResult {
    const results: { rule: ConfirmRule; passed: boolean }[] = [];
    const reasons: string[] = [];
    let totalWeight = 0;
    let passedWeight = 0;

    // 各確認ルールを適用
    for (const rule of this.rules) {
      const passed = rule.check(signal, data);
      results.push({ rule, passed });
      totalWeight += rule.weight;

      if (passed) {
        passedWeight += rule.weight;
      } else {
        reasons.push(`${rule.name} が満たされていません`);
      }
    }

    // 確認スコアを計算
    const confirmationScore = totalWeight > 0 ? passedWeight / totalWeight : 0;

    // 確認されたシグナルを生成
    const confirmed = confirmationScore >= this.confirmationThreshold;
    const confirmedSignal: Signal = {
      type: confirmed ? signal.type : 'HOLD',
      confidence: signal.confidence * confirmationScore
    };

    return {
      originalSignal: signal,
      confirmedSignal,
      confirmed,
      confirmationScore,
      rulesApplied: results.map(r => r.rule.name),
      reasons
    };
  }

  setConfirmationThreshold(threshold: number): void {
    this.confirmationThreshold = Math.max(0, Math.min(1, threshold));
  }

  getRules(): ConfirmRule[] {
    return [...this.rules];
  }
}
```

### 3. 高度なバックテストエンジンの開発

```typescript
// src/backtesting/AdvancedBacktestEngine.ts
import { MarketData, Trade, BacktestConfig, BacktestResult } from '@/types/backtesting';
import { TradingStrategy } from '@/trading/strategy/TradingStrategy';

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export class AdvancedBacktestEngine {
  private strategy: TradingStrategy;
  private initialCapital: number = 100000;
  private commission: number = 0.001; // 0.1%

  constructor(strategy: TradingStrategy) {
    this.strategy = strategy;
  }

  async run(config: BacktestConfig): Promise<BacktestResult> {
    const { data, symbol, startDate, endDate, parameters } = config;

    // データのフィルタリング
    const filteredData = this.filterDataByDate(data, startDate, endDate);

    // 戦略の初期化
    this.strategy.initialize(parameters);

    // バックテストの実行
    const trades: Trade[] = [];
    let capital = this.initialCapital;
    let position = 0;
    let entryPrice = 0;

    for (let i = 0; i < filteredData.length; i++) {
      const currentData = filteredData[i];
      const historicalData = filteredData.slice(0, i + 1);

      // シグナルの生成
      const signal = await this.strategy.generateSignal(historicalData);

      // 取引の実行
      if (signal.type === 'BUY' && position === 0) {
        const quantity = Math.floor(capital / currentData.ohlcv.close);
        const cost = quantity * currentData.ohlcv.close * (1 + this.commission);

        if (cost <= capital) {
          position = quantity;
          entryPrice = currentData.ohlcv.close;
          capital -= cost;

          trades.push({
            type: 'BUY',
            symbol,
            quantity,
            price: currentData.ohlcv.close,
            timestamp: currentData.timestamp,
            commission: quantity * currentData.ohlcv.close * this.commission
          });
        }
      } else if (signal.type === 'SELL' && position > 0) {
        const revenue = position * currentData.ohlcv.close * (1 - this.commission);
        capital += revenue;

        trades.push({
          type: 'SELL',
          symbol,
          quantity: position,
          price: currentData.ohlcv.close,
          timestamp: currentData.timestamp,
          commission: position * currentData.ohlcv.close * this.commission
        });

        position = 0;
        entryPrice = 0;
      }
    }

    // 最終ポジションの決済
    if (position > 0) {
      const lastPrice = filteredData[filteredData.length - 1].ohlcv.close;
      const revenue = position * lastPrice * (1 - this.commission);
      capital += revenue;

      trades.push({
        type: 'SELL',
        symbol,
        quantity: position,
        price: lastPrice,
        timestamp: filteredData[filteredData.length - 1].timestamp,
        commission: position * lastPrice * this.commission
      });
    }

    // メトリクスの計算
    const metrics = this.calculateMetrics(trades, capital);

    return {
      config,
      trades,
      metrics,
      equityCurve: this.calculateEquityCurve(trades),
      drawdownCurve: this.calculateDrawdownCurve(trades)
    };
  }

  private filterDataByDate(data: MarketData[], startDate: Date, endDate: Date): MarketData[] {
    const start = startDate.getTime();
    const end = endDate.getTime();

    return data.filter(d => d.timestamp >= start && d.timestamp <= end);
  }

  private calculateMetrics(trades: Trade[], finalCapital: number): BacktestMetrics {
    const totalReturn = (finalCapital - this.initialCapital) / this.initialCapital;

    // 取引をペアにする
    const tradePairs = this.pairTrades(trades);

    // 勝ち・負けトレードの計算
    const winningTrades = tradePairs.filter(t => t.profit > 0);
    const losingTrades = tradePairs.filter(t => t.profit < 0);

    const winRate = tradePairs.length > 0 ? winningTrades.length / tradePairs.length : 0;

    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length
      : 0;

    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + Math.abs(t.profit), 0) / losingTrades.length
      : 0;

    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;

    // シャープレシオの計算
    const returns = this.calculateReturns(tradePairs);
    const sharpeRatio = this.calculateSharpeRatio(returns);

    // ソルティノレシオの計算
    const sortinoRatio = this.calculateSortinoRatio(returns);

    // 最大ドローダウンの計算
    const maxDrawdown = this.calculateMaxDrawdown(trades);

    return {
      totalReturn,
      annualizedReturn: totalReturn * (365 / this.getTradingDays(trades)),
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      totalTrades: tradePairs.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length
    };
  }

  private pairTrades(trades: Trade[]): Array<{ profit: number; entryTime: number; exitTime: number }> {
    const pairs: Array<{ profit: number; entryTime: number; exitTime: number }> = [];
    let entry: Trade | null = null;

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        entry = trade;
      } else if (trade.type === 'SELL' && entry) {
        const profit = (trade.price - entry.price) * entry.quantity - entry.commission - trade.commission;
        pairs.push({ profit, entryTime: entry.timestamp, exitTime: trade.timestamp });
        entry = null;
      }
    }

    return pairs;
  }

  private calculateReturns(tradePairs: Array<{ profit: number }>): number[] {
    return tradePairs.map(t => t.profit / this.initialCapital);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);

    if (negativeReturns.length === 0) return avgReturn > 0 ? Infinity : 0;

    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);

    return downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;
  }

  private calculateMaxDrawdown(trades: Trade[]): number {
    let peak = this.initialCapital;
    let maxDrawdown = 0;
    let capital = this.initialCapital;
    let position = 0;
    let entryPrice = 0;

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        capital -= trade.price * trade.quantity + trade.commission;
        position = trade.quantity;
        entryPrice = trade.price;
      } else if (trade.type === 'SELL') {
        capital += trade.price * trade.quantity - trade.commission;
        position = 0;
      }

      const currentEquity = capital + (position * entryPrice);
      peak = Math.max(peak, currentEquity);
      const drawdown = (peak - currentEquity) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateEquityCurve(trades: Trade[]): Array<{ timestamp: number; equity: number }> {
    const curve: Array<{ timestamp: number; equity: number }> = [];
    let capital = this.initialCapital;
    let position = 0;
    let entryPrice = 0;

    for (const trade of trades) {
      if (trade.type === 'BUY') {
        capital -= trade.price * trade.quantity + trade.commission;
        position = trade.quantity;
        entryPrice = trade.price;
      } else if (trade.type === 'SELL') {
        capital += trade.price * trade.quantity - trade.commission;
        position = 0;
      }

      const equity = capital + (position * entryPrice);
      curve.push({ timestamp: trade.timestamp, equity });
    }

    return curve;
  }

  private calculateDrawdownCurve(trades: Trade[]): Array<{ timestamp: number; drawdown: number }> {
    const equityCurve = this.calculateEquityCurve(trades);
    let peak = this.initialCapital;

    return equityCurve.map(({ timestamp, equity }) => {
      peak = Math.max(peak, equity);
      const drawdown = peak > 0 ? (peak - equity) / peak : 0;
      return { timestamp, drawdown };
    });
  }

  private getTradingDays(trades: Trade[]): number {
    if (trades.length === 0) return 1;

    const firstTrade = trades[0].timestamp;
    const lastTrade = trades[trades.length - 1].timestamp;
    const days = (lastTrade - firstTrade) / (1000 * 60 * 60 * 24);

    return Math.max(1, days);
  }

  setInitialCapital(capital: number): void {
    this.initialCapital = capital;
  }

  setCommission(commission: number): void {
    this.commission = commission;
  }
}
```

### 4. ウォークフォワード分析の導入

```typescript
// src/backtesting/WalkForwardAnalysis.ts
import { MarketData, BacktestConfig, BacktestResult } from '@/types/backtesting';
import { AdvancedBacktestEngine } from './AdvancedBacktestEngine';
import { TradingStrategy } from '@/trading/strategy/TradingStrategy';

export interface WalkForwardConfig {
  inSamplePeriod: number; // 日数
  outOfSamplePeriod: number; // 日数
  stepSize: number; // 日数
  optimizationMetric: 'sharpe' | 'sortino' | 'return' | 'profit-factor';
}

export interface WalkForwardResult {
  inSampleResults: BacktestResult[];
  outOfSampleResults: BacktestResult[];
  aggregatedMetrics: {
    totalReturn: number;
    averageSharpeRatio: number;
    averageWinRate: number;
    consistency: number;
  };
  optimalParameters: any[];
}

export class WalkForwardAnalysis {
  private engine: AdvancedBacktestEngine;

  constructor(strategy: TradingStrategy) {
    this.engine = new AdvancedBacktestEngine(strategy);
  }

  async analyze(
    data: MarketData[],
    config: WalkForwardConfig,
    baseConfig: BacktestConfig
  ): Promise<WalkForwardResult> {
    const { inSamplePeriod, outOfSamplePeriod, stepSize, optimizationMetric } = config;

    const inSampleResults: BacktestResult[] = [];
    const outOfSampleResults: BacktestResult[] = [];
    const optimalParameters: any[] = [];

    // ウォークフォワード分析の実行
    let startIndex = 0;
    let iteration = 0;

    while (startIndex + inSamplePeriod + outOfSamplePeriod <= data.length) {
      // インサンプル期間
      const inSampleStart = startIndex;
      const inSampleEnd = startIndex + inSamplePeriod;

      // アウトオブサンプル期間
      const outOfSampleStart = inSampleEnd;
      const outOfSampleEnd = outOfSampleStart + outOfSamplePeriod;

      // パラメータの最適化
      const optimalParams = await this.optimizeParameters(
        data.slice(inSampleStart, inSampleEnd),
        baseConfig,
        optimizationMetric
      );

      optimalParameters.push(optimalParams);

      // インサンプルでのバックテスト
      const inSampleResult = await this.engine.run({
        ...baseConfig,
        data: data.slice(inSampleStart, inSampleEnd),
        parameters: optimalParams
      });

      inSampleResults.push(inSampleResult);

      // アウトオブサンプルでのバックテスト
      const outOfSampleResult = await this.engine.run({
        ...baseConfig,
        data: data.slice(outOfSampleStart, outOfSampleEnd),
        parameters: optimalParams
      });

      outOfSampleResults.push(outOfSampleResult);

      // 次のイテレーションへ
      startIndex += stepSize;
      iteration++;
    }

    // 集計メトリクスの計算
    const aggregatedMetrics = this.calculateAggregatedMetrics(
      inSampleResults,
      outOfSampleResults
    );

    return {
      inSampleResults,
      outOfSampleResults,
      aggregatedMetrics,
      optimalParameters
    };
  }

  private async optimizeParameters(
    data: MarketData[],
    baseConfig: BacktestConfig,
    metric: string
  ): Promise<any> {
    // パラメータ空間の定義
    const parameterSpace = this.defineParameterSpace(baseConfig.parameters);

    let bestParams = baseConfig.parameters;
    let bestScore = -Infinity;

    // グリッドサーチ
    for (const params of this.generateParameterCombinations(parameterSpace)) {
      const result = await this.engine.run({
        ...baseConfig,
        data,
        parameters: params
      });

      const score = this.getMetricScore(result.metrics, metric);

      if (score > bestScore) {
        bestScore = score;
        bestParams = params;
      }
    }

    return bestParams;
  }

  private defineParameterSpace(baseParams: any): any {
    // パラメータ空間を定義（例）
    return {
      rsiPeriod: [10, 12, 14, 16, 18],
      rsiOverbought: [65, 70, 75],
      rsiOversold: [25, 30, 35],
      macdFast: [8, 10, 12],
      macdSlow: [20, 24, 26],
      macdSignal: [7, 9, 11]
    };
  }

  private generateParameterCombinations(space: any): any[] {
    const keys = Object.keys(space);
    const combinations: any[] = [];

    const generate = (index: number, current: any) => {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = space[key];

      for (const value of values) {
        current[key] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  }

  private getMetricScore(metrics: any, metric: string): number {
    switch (metric) {
      case 'sharpe':
        return metrics.sharpeRatio;
      case 'sortino':
        return metrics.sortinoRatio;
      case 'return':
        return metrics.totalReturn;
      case 'profit-factor':
        return metrics.profitFactor;
      default:
        return 0;
    }
  }

  private calculateAggregatedMetrics(
    inSampleResults: BacktestResult[],
    outOfSampleResults: BacktestResult[]
  ): WalkForwardResult['aggregatedMetrics'] {
    // アウトオブサンプルの結果を集計
    const totalReturn = outOfSampleResults.reduce(
      (sum, r) => sum + r.metrics.totalReturn,
      0
    );

    const averageSharpeRatio = outOfSampleResults.reduce(
      (sum, r) => sum + r.metrics.sharpeRatio,
      0
    ) / outOfSampleResults.length;

    const averageWinRate = outOfSampleResults.reduce(
      (sum, r) => sum + r.metrics.winRate,
      0
    ) / outOfSampleResults.length;

    // 一貫性の計算（インサンプルとアウトオブサンプルの相関）
    const consistency = this.calculateConsistency(inSampleResults, outOfSampleResults);

    return {
      totalReturn,
      averageSharpeRatio,
      averageWinRate,
      consistency
    };
  }

  private calculateConsistency(
    inSampleResults: BacktestResult[],
    outOfSampleResults: BacktestResult[]
  ): number {
    if (inSampleResults.length !== outOfSampleResults.length) return 0;

    const inSampleReturns = inSampleResults.map(r => r.metrics.totalReturn);
    const outSampleReturns = outOfSampleResults.map(r => r.metrics.totalReturn);

    // ピアソン相関係数の計算
    const n = inSampleReturns.length;
    const sumX = inSampleReturns.reduce((sum, x) => sum + x, 0);
    const sumY = outSampleReturns.reduce((sum, y) => sum + y, 0);
    const sumXY = inSampleReturns.reduce((sum, x, i) => sum + x * outSampleReturns[i], 0);
    const sumX2 = inSampleReturns.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = outSampleReturns.reduce((sum, y) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator > 0 ? numerator / denominator : 0;
  }
}
```

## 実装計画

### フェーズ1: マルチ時間枠モデル（2週間）
- [ ] マルチ時間枠データの収集・管理
- [ ] 各時間枠のインジケーター実装
- [ ] 信号の統合アルゴリズム
- [ ] 重み付けシステムの実装
- [ ] ユニットテストの作成

### フェーズ2: コンフィームシグナルシステム（2週間）
- [ ] 確認ルールの定義と実装
- [ ] 信号確認スコアの計算
- [ ] カスタムルールの追加機能
- [ ] 確認結果の可視化
- [ ] 統合テストの作成

### フェーズ3: 高度なバックテストエンジン（2週間）
- [ ] バックテストエンジンの実装
- [ ] 詳細なメトリクス計算
- [ ] 複数戦略の比較機能
- [ ] パラメータ最適化機能
- [ ] パフォーマンステストの作成

### フェーズ4: ウォークフォワード分析（2週間）
- [ ] ウォークフォワード分析の実装
- [ ] パラメータ最適化の自動化
- [ ] 一貫性評価の実装
- [ ] 結果の可視化とレポート
- [ ] E2Eテストの作成

## 成功基準
- マルチ時間枠シグナルの精度85%以上
- 確認シグナルシステムの偽陽性率30%以下
- バックテストの再現性95%以上
- ウォークフォワード分析の一貫性スコア0.7以上

## 関連Issue
- TRADING-001: データ品質と信頼性の向上
- TRADING-003: リスク管理システムの高度化

## ラベル
enhancement, trading-strategy, priority:high
